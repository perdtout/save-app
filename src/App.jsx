import { useState, useEffect, useCallback } from "react";
import logoRepairMobile from "./RepairMobile.png";

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API_URL = "https://save-backend-cn9b.onrender.com";

// ─── RÉVEIL DU SERVEUR ────────────────────────────────────────────────────────
// L'API tourne sur une offre gratuite qui met le service en veille après une
// période d'inactivité. La première requête de la journée peut donc prendre 30 à
// 60 secondes. On sonde /api/health au démarrage pour prévenir l'utilisateur au
// lieu de le laisser devant un écran vide en croyant que l'app est plantée.
const WAKE_HINT_MS = 2500;    // au-delà de ce délai, on annonce le réveil
const WAKE_TIMEOUT_MS = 90000;

async function pingHealth() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WAKE_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`statut ${res.status}`);
    return true;
  } finally {
    clearTimeout(timer);
  }
}

// ─── SESSION PERSISTANTE ──────────────────────────────────────────────────────
// Le jeton était perdu à chaque rafraîchissement de page, ce qui renvoyait
// l'utilisateur à l'écran de connexion. On le conserve jusqu'à son expiration
// réelle (12 h côté backend).
const AUTH_KEY = "save-pilotage-auth";

function jwtExpiry(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part))?.exp || null;
  } catch {
    return null;
  }
}

function readStoredAuth() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (!parsed?.token || !parsed?.user) return null;
    if (!parsed.exp || parsed.exp * 1000 <= Date.now()) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Horodatage lisible : "aujourd'hui à 14 h 32" / "12/08 à 19 h 04"
function stampLabel(date) {
  if (!date) return "—";
  const d = new Date(date);
  const heure = `${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`;
  const auj = new Date();
  const memeJour = d.toDateString() === auj.toDateString();
  return memeJour ? `aujourd'hui à ${heure}` : `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${heure}`;
}

// ─── DESIGN TOKENS — Charte Repair Mobile ────────────────────────────────────
const C = {
  navy: "#2B2B2B", navyMid: "#363636", navyL: "#4A4A4A",
  accent: "#E8612C", accentB: "#FF8A50", white: "#FFFFFF",
  bg: "#F7F5F3", gray50: "#F0EDEA", gray200: "#D6CFC8",
  gray400: "#8A847E", gray600: "#5A544E",
  ok: "#22C55E", warn: "#F59E0B", bad: "#EF4444", text: "#2B2B2B",
};

const STORES_ORDER = ["Pontarlier", "Lons-le-Saunier", "Dijon", "Besançon", "Chalon-sur-Saône"];
const NOTION_PAGE1_URL = "https://www.notion.so/379b706fb59681b68663eb4920323d27";
// Équipes par magasin — sert aux en-têtes et à l'écran magasin
const STORE_TEAM = {
  "Pontarlier": "Mathis · Narcisse",
  "Lons-le-Saunier": "Jérôme · Nassim",
  "Dijon": "Jules · Bilhal",
  "Chalon-sur-Saône": "Jean-Baptiste · seul en magasin",
  "Besançon": "Samy · seul en magasin",
};

const STORE_STAFF = {
  "Pontarlier": ["Mathis (responsable)", "Narcisse (technicien)"],
  "Lons-le-Saunier": ["Jérôme (responsable)", "Nassim (technicien)"],
  "Dijon": ["Jules (responsable)", "Bilhal (technicien)"],
  "Chalon-sur-Saône": ["Jean-Baptiste (seul en magasin)"],
  "Besançon": ["Samy (seul en magasin)"],
};

const NOTION_PAGE2_URL = "https://www.notion.so/379b706fb596813ebfe1d33c85a87531";

// ─── GOAT — constantes & données de secours ──────────────────────────────────
const GOAT_GOLD   = "#F4B400";
const GOAT_SILVER = "#C9CDD3";
const GOAT_BRONZE = "#CD7F32";

const GOAT_VENDORS = {
  "Mathis":        { store: "Pontarlier",       role: "responsable" },
  "Narcisse":      { store: "Pontarlier",       role: "technicien" },
  "Jérôme":        { store: "Lons-le-Saunier",  role: "responsable" },
  "Nassim":        { store: "Lons-le-Saunier",  role: "technicien" },
  "Jules":         { store: "Dijon",            role: "responsable" },
  "Bilhal":        { store: "Dijon",            role: "technicien" },
  "Jean-Baptiste": { store: "Chalon-sur-Saône", role: "solo" },
  "Samy":          { store: "Besançon",         role: "solo" },
};

// Aucune donnée de secours n'est stockée ici volontairement : afficher des
// chiffres figés quand l'API ne répond pas revient à faire croire qu'ils sont à
// jour. En cas d'échec de lecture, l'écran GOAT affiche un état d'erreur daté.

function computeGoatSeasonPoints(titlesHistory) {
  const pts = {};
  (titlesHistory || []).forEach(t => {
    if (!pts[t.winner]) pts[t.winner] = { weeks: 0, months: 0, points: 0 };
    if (t.type === "week")  { pts[t.winner].weeks  += 1; pts[t.winner].points += 1; }
    if (t.type === "month") { pts[t.winner].months += 1; pts[t.winner].points += 3; }
  });
  return Object.entries(pts)
    .map(([name, p]) => ({ name, store: GOAT_VENDORS[name]?.store, ...p }))
    .sort((a, b) => b.points - a.points);
}

function computeCurrentStreak(titlesHistory) {
  const monthly = (titlesHistory || []).filter(t => t.type === "month");
  if (monthly.length === 0) return null;
  let bestName = monthly[0].winner, bestCount = 1, curName = monthly[0].winner, curCount = 1;
  for (let i = 1; i < monthly.length; i++) {
    if (monthly[i].winner === curName) { curCount++; } else { curName = monthly[i].winner; curCount = 1; }
    if (curCount > bestCount) { bestCount = curCount; bestName = curName; }
  }
  return { name: bestName, count: bestCount };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const statusC = (s) => s === "ok" ? C.ok : s === "warn" ? C.warn : s === "bad" ? C.bad : C.gray400;
const trendLabel = (t) => t > 0 ? `📈 +${t}` : t < 0 ? `📉 ${t}` : "➡️ =";
const eur = (v) => v == null ? "—" : `${Math.round(v).toLocaleString("fr-FR")} €`;
// Pourcentages en français : virgule décimale, jamais de point
const pct = (v, dec = 1) => v == null ? "—" : `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: dec })} %`;
const nb = (v) => v == null ? "—" : Number(v).toLocaleString("fr-FR");

// ─── API CLIENT ───────────────────────────────────────────────────────────────
const api = {
  token: null,
  async login(username, password) {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Identifiants incorrects");
    const data = await res.json();
    this.token = data.token;
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        token: data.token, user: data.user, exp: jwtExpiry(data.token),
      }));
    } catch { /* navigation privée : on continue sans persistance */ }
    return data.user;
  },
  restore() {
    const stored = readStoredAuth();
    if (!stored) return null;
    this.token = stored.token;
    return stored.user;
  },
  logout() {
    this.token = null;
    try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
  },
  async get(path) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.status === 401) {
      this.logout();
      const e = new Error("Session expirée, reconnecte-toi.");
      e.code = "auth";
      throw e;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur ${res.status}`);
    }
    return res.json();
  },
};

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function Card({ children, style = {}, accent, className = "" }) {
  const cls = ["card", accent === C.bad ? "accent-bad" : accent ? "accent-brand" : "", className].filter(Boolean).join(" ");
  return <div className={cls} style={style}>{children}</div>;
}

// Jauge : remplissage = statut, repère = objectif
function Gauge({ value, max = 100, target, color, flat }) {
  const pct = Math.max(0, Math.min(100, ((value || 0) / (max || 1)) * 100));
  const tpct = target != null ? Math.min(98, (target / (max || 1)) * 100) : null;
  const cls = color === C.ok ? "fill-ok" : color === C.warn ? "fill-warn" : color === C.bad ? "fill-bad" : "fill-neutral";
  return (
    <div className={`meter${flat ? " flat" : ""}`}>
      <i className={cls} style={{ width: `${pct}%` }} />
      {tpct != null && <u style={{ left: `${tpct}%` }} />}
    </div>
  );
}

function SectionHead({ children }) {
  return <h3 className="h-section">{children}</h3>;
}

function Btn({ children, onClick, variant = "primary", size = "md", style = {}, disabled }) {
  const cls = ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : ""].filter(Boolean).join(" ");
  return <button className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

// Pastille de statut : couleur + texte, jamais la couleur seule
function Chip({ status = "neutral", children }) {
  return <span className={`chip c-${status}`}>{children}</span>;
}

function Trend({ value, suffix = "", unit = "pts" }) {
  if (value == null || value === 0) return <span className="trend t-flat">▬ stable</span>;
  const up = value > 0;
  return (
    <span className={`trend ${up ? "t-up" : "t-down"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{suffix} {unit}
    </span>
  );
}

function Spinner({ label = "Chargement…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 13, padding: 44 }}>
      <div className="spin" />
      <span style={{ fontSize: 13, color: C.gray400 }}>{label}</span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <Card accent={C.bad}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <span style={{ fontSize: 20, lineHeight: 1.2 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Connexion au serveur impossible</div>
          <div className="note" style={{ marginTop: 3 }}>{message}. Aucune donnée n'est affichée tant que la lecture n'a pas abouti.</div>
        </div>
        {onRetry && <Btn size="sm" variant="secondary" onClick={onRetry}>Réessayer</Btn>}
      </div>
    </Card>
  );
}

// ─── BANDEAU DE RÉVEIL DU SERVEUR ─────────────────────────────────────────────
function WakeBanner({ state, onRetry, dark }) {
  if (state === "ok" || state === "idle") return null;
  const cfg = {
    checking: { color: C.gray400, txt: "Connexion au serveur…" },
    waking:   { color: C.warn,    txt: "Réveil du serveur en cours — cela peut prendre jusqu'à une minute la première fois de la journée. Reste sur cette page." },
    down:     { color: C.bad,     txt: "Le serveur ne répond pas." },
  }[state];
  if (!cfg) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: dark ? "rgba(255,255,255,0.07)" : cfg.color + "14",
      border: `1px solid ${cfg.color}${dark ? "55" : "33"}`,
      color: dark ? C.white : C.text,
      borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.55,
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0,
        animation: state === "down" ? "none" : "pulse 1.4s ease-in-out infinite",
      }} />
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }`}</style>
      <span style={{ flex: 1 }}>{cfg.txt}</span>
      {state === "down" && onRetry && (
        <button onClick={onRetry} style={{
          border: `1px solid ${cfg.color}66`, background: "transparent", color: cfg.color,
          borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>Réessayer</button>
      )}
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, serverState, onRetryPing }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setErr("");
    try {
      const user = await api.login(u, p);
      onLogin(user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 20px" }}>
          <img src={logoRepairMobile} alt="Repair Mobile" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ color: C.white, fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>Repair<span style={{ color: C.accentB }}>Mobile</span></div>
            <div style={{ color: C.accentB, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Pilotage Réseau</div>
          </div>
        </div>
      </div>
      <div style={{ background: C.white, borderRadius: 16, padding: "28px 26px", width: "100%", maxWidth: 350, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.navy }}>Connexion</h2>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: C.gray400 }}>Accès réservé aux équipes SAVE</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["Identifiant", u, setU, "text", "thomas.desternes"], ["Mot de passe", p, setP, "password", "••••••"]].map(([label, val, set, type, ph]) => (
            <div key={label}>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder={ph}
                style={{ width: "100%", border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          ))}
          {err && <div style={{ fontSize: 12, color: C.bad, background: "#FEE2E2", padding: "8px 12px", borderRadius: 8 }}>{err}</div>}
          <Btn onClick={go} size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Connexion…" : "Se connecter"}
          </Btn>
        </div>
        {serverState && serverState !== "ok" && (
          <div style={{ marginTop: 14 }}>
            <WakeBanner state={serverState} onRetry={onRetryPing} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
// ─── Helpers de calcul partagés ───────────────────────────────────────────────
const OCC_OBJ = { "Pontarlier": 50, "Lons-le-Saunier": 50, "Dijon": 25, "Besançon": 20, "Chalon-sur-Saône": 15 };
const MOBILEO_OBJ = 10;   // bas de la fourchette 10-15
const ATM_OBJ = 10;       // % des mobiles d'occasion
const ACC_OBJ = 25;
const GP_OBJ = 20;

// Jours ouvrés du mois en cours : mardi→samedi, hors fériés français
function moisEnCours() {
  const now = new Date();
  const annee = now.getFullYear(), mois = now.getMonth() + 1;
  const ecoules = joursOuvres(annee, mois, now.getDate());
  const total = joursOuvres(annee, mois);
  return { annee, mois, ecoules, total, ratio: total ? ecoules / total : 0 };
}

function projeter(valeur, { ecoules, total }) {
  if (valeur == null || !ecoules) return null;
  return Math.round((valeur / ecoules) * total);
}

const statusFor = (valeur, objectif) =>
  valeur == null ? "neutral" : valeur >= objectif ? "ok" : valeur >= objectif * 0.85 ? "warn" : "bad";

function totauxZone(d, d2, stores) {
  const t = { margeTotal: 0, margeAcc: 0, margeGP: 0, occasion: 0, occObjectif: 0, mobileo: 0, atm: 0 };
  for (const s of stores) {
    t.margeTotal += d?.accessoires?.[s]?.margeTotal || 0;
    t.margeAcc   += d?.accessoires?.[s]?.margeAcc   || 0;
    t.margeGP    += d?.gp?.[s]?.margeGP             || 0;
    t.occasion   += d?.occasion?.[s]?.volume        || 0;
    t.occObjectif += d?.occasion?.[s]?.objectif ?? OCC_OBJ[s] ?? 0;
    t.mobileo    += d2?.mobileo?.[s]?.total         || 0;
    t.atm        += d2?.atm?.[s]?.total             || 0;
  }
  t.ratioAcc = t.margeTotal ? +(t.margeAcc / t.margeTotal * 100).toFixed(1) : null;
  t.ratioGP  = t.margeTotal ? +(t.margeGP  / t.margeTotal * 100).toFixed(1) : null;
  t.ratioATM = t.occasion ? +(t.atm / t.occasion * 100).toFixed(1) : null;
  return t;
}

// Les écarts les plus importants de la zone, formulés en phrases actionnables
function calculerPriorites(d, d2, stores, mois) {
  const items = [];
  const t = totauxZone(d, d2, stores);

  if (t.occasion > 0 && t.ratioATM != null && t.ratioATM < ATM_OBJ) {
    const zeros = stores.filter(s => (d2?.atm?.[s]?.total || 0) === 0);
    items.push({
      poids: (ATM_OBJ - t.ratioATM) / ATM_OBJ * 1.3,
      titre: `ATM : ${t.atm} contrat${t.atm > 1 ? "s" : ""} pour ${t.occasion} mobiles d'occasion vendus`,
      detail: zeros.length
        ? `${zeros.length} magasin${zeros.length > 1 ? "s" : ""} sur ${stores.length} ${zeros.length > 1 ? "sont" : "est"} à zéro : ${zeros.join(", ")}. C'est la vente la plus simple à associer — le réflexe se prend au comptoir, pas après.`
        : `Le taux de transformation reste sous l'objectif sur l'ensemble de la zone.`,
      valeur: pct(t.ratioATM), objectif: `objectif ${ATM_OBJ} %`, ton: "bad",
    });
  }

  const objMobileoZone = MOBILEO_OBJ * stores.length;
  const projMobileo = projeter(t.mobileo, mois);
  if (projMobileo != null && projMobileo < objMobileoZone) {
    const zeros = stores.filter(s => (d2?.mobileo?.[s]?.total || 0) === 0);
    items.push({
      poids: (objMobileoZone - projMobileo) / objMobileoZone,
      titre: `Mobileo : ${t.mobileo} contrat${t.mobileo > 1 ? "s" : ""} signé${t.mobileo > 1 ? "s" : ""} sur la zone`,
      detail: `Projection à ${projMobileo} pour un objectif de ${objMobileoZone} à ${15 * stores.length}.` +
        (zeros.length ? ` Toujours à zéro : ${zeros.join(", ")}.` : ""),
      valeur: `${t.mobileo}`, objectif: `≈ ${projMobileo} projetés`, ton: projMobileo < objMobileoZone * 0.5 ? "bad" : "warn",
    });
  }

  for (const s of stores) {
    const occ = d?.occasion?.[s];
    if (occ?.volume != null && occ?.objectif) {
      const proj = projeter(occ.volume, mois);
      if (proj != null && proj < occ.objectif * 0.7) {
        items.push({
          poids: (occ.objectif - proj) / occ.objectif,
          titre: `${s} : ${occ.volume} mobile${occ.volume > 1 ? "s" : ""} d'occasion en ${mois.ecoules} jour${mois.ecoules > 1 ? "s" : ""} ouvré${mois.ecoules > 1 ? "s" : ""}`,
          detail: `Projection à ${proj} pour un objectif de ${occ.objectif}. À regarder ensemble : stock disponible, mise en avant, temps passé en réparation.`,
          valeur: `${occ.volume}`, objectif: `objectif ${occ.objectif}`, ton: "bad",
        });
      }
    }
    const acc = d?.accessoires?.[s];
    if (acc?.ratio != null && acc.ratio < ACC_OBJ * 0.9) {
      items.push({
        poids: (ACC_OBJ - acc.ratio) / ACC_OBJ * 1.1,
        titre: `${s} : ratio accessoires à ${pct(acc.ratio)}`,
        detail: `Sous l'objectif de ${ACC_OBJ} %. C'est le levier le plus rapide sur la marge — proposition systématique en caisse.`,
        valeur: pct(acc.ratio), objectif: `objectif ${ACC_OBJ} %`, ton: "bad",
      });
    }
    const gp = d?.gp?.[s];
    if (gp?.ratio != null && gp.ratio < GP_OBJ * 0.9) {
      items.push({
        poids: (GP_OBJ - gp.ratio) / GP_OBJ,
        titre: `${s} : ratio GP à ${pct(gp.ratio)}`,
        detail: `Sous l'objectif de ${GP_OBJ} %. La garantie doit être présentée dans chaque devis, pas seulement sur les réparations chères.`,
        valeur: pct(gp.ratio), objectif: `objectif ${GP_OBJ} %`, ton: "bad",
      });
    }
  }

  return items.sort((a, b) => b.poids - a.poids).slice(0, 3);
}

// ─── VUE D'ENSEMBLE ───────────────────────────────────────────────────────────
function Dashboard({ user, data, onOpenStore }) {
  const isRZ = user.role === "rz";
  const stores = isRZ ? STORES_ORDER : [user.store];
  const d = data?.page1, d2 = data?.page2;
  const mois = moisEnCours();
  const t = totauxZone(d, d2, stores);
  const priorites = calculerPriorites(d, d2, stores, mois);
  const faits = (data?.faitsMarquants?.length ? data.faitsMarquants : data?.syntheseRZ ? [data.syntheseRZ] : []);

  const classement = [...stores].sort((a, b) =>
    (d?.accessoires?.[b]?.margeTotal || 0) - (d?.accessoires?.[a]?.margeTotal || 0));

  const tuiles = [
    {
      lbl: isRZ ? "Marge zone · mois en cours" : "Marge du mois", hero: true,
      val: eur(t.margeTotal),
      foot: <>Projection fin de mois <b>≈ {eur(projeter(t.margeTotal, mois) || 0)}</b></>,
    },
    {
      lbl: "Ratio accessoires", val: pct(t.ratioAcc),
      meter: { value: t.ratioAcc, max: 40, target: ACC_OBJ, status: statusFor(t.ratioAcc, ACC_OBJ) },
      foot: <Chip status={statusFor(t.ratioAcc, ACC_OBJ)}>{t.ratioAcc >= ACC_OBJ ? `Objectif ${ACC_OBJ} % tenu` : `Objectif ${ACC_OBJ} % non atteint`}</Chip>,
    },
    {
      lbl: "Ratio GP", val: pct(t.ratioGP),
      meter: { value: t.ratioGP, max: 35, target: GP_OBJ, status: statusFor(t.ratioGP, GP_OBJ) },
      foot: <Chip status={statusFor(t.ratioGP, GP_OBJ)}>{t.ratioGP >= GP_OBJ ? `Objectif ${GP_OBJ} % tenu` : `Objectif ${GP_OBJ} % non atteint`}</Chip>,
    },
    {
      lbl: "Mobiles d'occasion", val: `${t.occasion}`,
      meter: { value: t.occasion, max: t.occObjectif || 1, target: t.occObjectif, status: statusFor(projeter(t.occasion, mois), t.occObjectif) },
      foot: <>Projection <b>≈ {projeter(t.occasion, mois) ?? "—"}</b> · objectif {t.occObjectif}</>,
    },
    {
      lbl: "Forfaits Mobileo", val: `${t.mobileo}`,
      meter: { value: t.mobileo, max: 15 * stores.length, target: MOBILEO_OBJ * stores.length, status: statusFor(projeter(t.mobileo, mois), MOBILEO_OBJ * stores.length) },
      foot: <>Projection <b>≈ {projeter(t.mobileo, mois) ?? "—"}</b> · objectif {MOBILEO_OBJ * stores.length} à {15 * stores.length}</>,
    },
    {
      lbl: "Contrats ATM", val: `${t.atm}`,
      meter: { value: t.ratioATM, max: 25, target: ATM_OBJ, status: statusFor(t.ratioATM, ATM_OBJ) },
      foot: <Chip status={statusFor(t.ratioATM, ATM_OBJ)}>{t.ratioATM != null ? `${pct(t.ratioATM)} des occasions · objectif ${ATM_OBJ} %` : "Aucune occasion vendue"}</Chip>,
    },
  ];

  return (
    <div className="stack">
      <div className="ctx">
        <h1 className="h-screen">Vue d'ensemble</h1>
        <p>
          {data?.period} · <b>{mois.ecoules} jours ouvrés écoulés sur {mois.total}</b>
          {data?.updated ? ` · données du ${data.updated}` : ""}
        </p>
      </div>

      <div className="grid grid-3">
        {tuiles.map(({ lbl, val, foot, meter, hero }) => (
          <div className={`tile${hero ? " hero" : ""}`} key={lbl}>
            <div className="lbl">{lbl}</div>
            <div className="val">{val}</div>
            {meter && <Gauge value={meter.value} max={meter.max} target={meter.target}
              color={meter.status === "ok" ? C.ok : meter.status === "warn" ? C.warn : meter.status === "bad" ? C.bad : C.gray400} />}
            <div className="foot">{foot}</div>
          </div>
        ))}
      </div>

      {priorites.length > 0 && (
        <Card className="pad-0">
          <div style={{ padding: "16px 22px 4px" }}>
            <div className="lbl">Ce qui doit m'occuper cette semaine</div>
          </div>
          {priorites.map((p, i) => (
            <div className="prio-item" key={i}>
              <div className="prio-rank">{i + 1}</div>
              <div className="prio-txt"><b>{p.titre}</b><p>{p.detail}</p></div>
              <div className="prio-num">
                <div className="v" style={{ color: p.ton === "bad" ? C.bad : C.warn }}>{p.valeur}</div>
                <div className="o">{p.objectif}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {faits.length > 0 && (
        <div className="quote">
          <div className="lbl" style={{ color: C.accent }}>Ce que je retiens</div>
          {faits.map((f, i) => <p key={i}>{f}</p>)}
        </div>
      )}

      <div>
        <div className="lbl" style={{ marginBottom: 13 }}>
          {isRZ ? `Les ${stores.length} magasins — mois en cours` : "Mon magasin"}
        </div>
        <div className="grid grid-stores">
          {classement.map((store, rang) => {
            const acc = d?.accessoires?.[store], gp = d?.gp?.[store], occ = d?.occasion?.[store];
            const mob = d2?.mobileo?.[store], atm = d2?.atm?.[store];
            const objOcc = occ?.objectif ?? OCC_OBJ[store] ?? 0;
            const kpis = [
              { k: "Acc.", v: acc?.ratio, max: 40, target: ACC_OBJ, txt: pct(acc?.ratio), s: statusFor(acc?.ratio, ACC_OBJ) },
              { k: "GP", v: gp?.ratio, max: 35, target: GP_OBJ, txt: pct(gp?.ratio), s: statusFor(gp?.ratio, GP_OBJ) },
              { k: "Occ.", v: occ?.volume, max: objOcc || 1, target: objOcc, txt: occ?.volume != null ? `${occ.volume}/${objOcc}` : "—", s: statusFor(projeter(occ?.volume, mois), objOcc) },
              { k: "Mob.", v: mob?.total, max: 15, target: MOBILEO_OBJ, txt: mob?.total != null ? `${mob.total}/${MOBILEO_OBJ}` : "—", s: statusFor(projeter(mob?.total, mois), MOBILEO_OBJ) },
              { k: "ATM", v: atm?.ratio, max: 25, target: ATM_OBJ, txt: pct(atm?.ratio), s: statusFor(atm?.ratio, ATM_OBJ) },
            ];
            const atteints = kpis.filter(x => x.s === "ok").length;
            const ton = atteints >= 4 ? "ok" : atteints >= 2 ? "warn" : "bad";
            return (
              <button className={`store s-${ton}`} key={store} onClick={() => onOpenStore(store)}>
                <h3>{store}</h3>
                <div className="team">{STORE_TEAM[store] || "—"}</div>
                <div className="marge">{eur(acc?.margeTotal || 0)}</div>
                <div className="marge-lbl">de marge ce mois-ci</div>
                {kpis.map(({ k, v, max, target, txt, s }) => (
                  <div className="kpiline" key={k}>
                    <span>{k}</span>
                    <div className="bar">
                      <i className={`fill-${s}`} style={{ width: `${Math.max(0, Math.min(100, ((v || 0) / (max || 1)) * 100))}%` }} />
                      {target ? <u style={{ left: `${Math.min(98, (target / (max || 1)) * 100)}%` }} /> : null}
                    </div>
                    <b className={`txt-${s === "neutral" ? "muted" : s}`}>{txt}</b>
                  </div>
                ))}
                <div className="score">
                  <Chip status={ton}>{atteints} objectif{atteints > 1 ? "s" : ""} sur 5</Chip>
                  {isRZ && <span className="txt-muted">n<sup>o</sup>&nbsp;{rang + 1} zone</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnalysisList({ isRZ, stores, store, analysisMap }) {
  if (isRZ) {
    return (
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {stores.map(s => analysisMap?.[s] && (
          <div key={s} style={{ fontSize: 12, color: C.text, padding: "8px 12px", background: C.bg, borderRadius: 8, lineHeight: 1.6 }}>
            <strong style={{ color: C.navy }}>{s} :</strong> {analysisMap[s]}
          </div>
        ))}
      </div>
    );
  }
  if (analysisMap?.[store]) {
    return (
      <div style={{ marginTop: 12, padding: "10px 14px", background: C.bg, borderRadius: 8, fontSize: 13, color: C.text, lineHeight: 1.7, borderLeft: `3px solid ${C.accent}` }}>
        💬 {analysisMap[store]}
      </div>
    );
  }
  return null;
}

// ─── RESULTS PAGE ──────────────────────────────────────────────────────────────
// ─── Tableau des vendeurs (zone ou magasin) ──────────────────────────────────
function VendorsTable({ rows, mois, showStore = true }) {
  if (!rows?.length) {
    return <div className="empty">Aucun résultat vendeur pour la période. Les journées sont peut-être en cours de saisie.</div>;
  }
  const tri = [...rows].sort((a, b) => (b.margeTotale || 0) - (a.margeTotale || 0));
  const inactif = (v) => !v.margeTotale || v.margeTotale <= 0;

  const cellRatio = (val, obj) => val == null
    ? <span className="txt-muted">—</span>
    : <span className={`txt-${statusFor(val, obj)}`} style={{ fontWeight: 700 }}>{pct(val)}</span>;

  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Vendeur</th>
            <th className="r">Marge</th><th className="r">dont access.</th>
            <th className="r">Acc.</th><th className="r">GP</th>
            <th className="r">Occ.</th><th className="r">Mobileo</th><th className="r">ATM</th>
          </tr></thead>
          <tbody>
            {tri.map(v => (
              <tr key={`${v.store}-${v.name}`} className={inactif(v) ? "dim" : ""}>
                <td className="name">
                  {v.name}
                  <div className="cell-sub">
                    {showStore ? v.store : (v.role || "")}
                    {v.jours ? ` · ${v.jours} jour${v.jours > 1 ? "s" : ""} d'activité` : ""}
                  </div>
                </td>
                <td className="r"><span className="big">{eur(v.margeTotale)}</span></td>
                <td className="r">{eur(v.margeAccessoires)}</td>
                <td className="r">{cellRatio(v.ratioAccessoires, ACC_OBJ)}</td>
                <td className="r">{cellRatio(v.ratioGP, GP_OBJ)}</td>
                <td className="r">{v.occasion ?? 0}</td>
                <td className={`r${!v.mobileo ? " txt-bad" : ""}`} style={{ fontWeight: v.mobileo ? 400 : 700 }}>{v.mobileo ?? 0}</td>
                <td className={`r${!v.atm ? " txt-bad" : " txt-ok"}`} style={{ fontWeight: 700 }}>{v.atm ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mcards">
        {tri.map(v => (
          <div className="mcard" key={`m-${v.store}-${v.name}`}>
            <div className="top">
              <div>
                <h4>{v.name}</h4>
                <div className="meta">{showStore ? v.store : v.role}</div>
              </div>
              <span className="big">{eur(v.margeTotale)}</span>
            </div>
            <div className="mrow"><span>Accessoires</span><b className={`txt-${statusFor(v.ratioAccessoires, ACC_OBJ)}`}>{pct(v.ratioAccessoires)}</b></div>
            <div className="mrow"><span>Garantie Plus</span><b className={`txt-${statusFor(v.ratioGP, GP_OBJ)}`}>{pct(v.ratioGP)}</b></div>
            <div className="mrow"><span>Mobiles d'occasion</span><b>{v.occasion ?? 0}</b></div>
            <div className="mrow"><span>Mobileo</span><b className={!v.mobileo ? "txt-bad" : ""}>{v.mobileo ?? 0}</b></div>
            <div className="mrow"><span>ATM</span><b className={!v.atm ? "txt-bad" : "txt-ok"}>{v.atm ?? 0}</b></div>
          </div>
        ))}
      </div>

      {tri.some(inactif) && (
        <p className="note">
          <b style={{ color: C.gray600 }}>Lignes grisées :</b> aucune activité enregistrée sur la période — congés ou absence.
          Leur score n'est pas représentatif du mois.
        </p>
      )}
    </>
  );
}

// ─── RÉSULTATS — par magasin / par vendeur ───────────────────────────────────
function ResultsPage({ user, data, vendors, vendorsError, mois, onRefresh, refreshing, onOpenStore }) {
  const isRZ = user.role === "rz";
  const [vue, setVue] = useState("magasin");
  const [indicateur, setIndicateur] = useState("accessoires");
  const [filterStore, setFilterStore] = useState("all");
  const allStores = isRZ ? STORES_ORDER : [user.store];
  const stores = (isRZ && filterStore !== "all") ? [filterStore] : allStores;
  const d = data?.page1, d2 = data?.page2;

  const INDICATEURS = [
    { id: "accessoires", label: "Accessoires", objectif: `≥ ${ACC_OBJ} %` },
    { id: "gp",          label: "Garantie Plus", objectif: `≥ ${GP_OBJ} %` },
    { id: "occasion",    label: "Mobiles d'occasion", objectif: "objectif par magasin" },
    { id: "mobileo",     label: "Mobileo", objectif: `${MOBILEO_OBJ} à 15 par magasin` },
    { id: "atm",         label: "ATM", objectif: `≥ ${ATM_OBJ} % des occasions` },
  ];
  const courant = INDICATEURS.find(i => i.id === indicateur);

  // Une ligne par magasin, quel que soit l'indicateur choisi
  const ligne = (store) => {
    if (indicateur === "accessoires") {
      const a = d?.accessoires?.[store]; if (!a) return null;
      const s = statusFor(a.ratio, ACC_OBJ);
      return { cols: [eur(a.margeAcc), eur(a.margeTotal)], valeur: pct(a.ratio), statut: s,
        trend: a.trend, jauge: { v: a.ratio, max: 40, target: ACC_OBJ }, libelles: ["Marge accessoires", "Marge totale"] };
    }
    if (indicateur === "gp") {
      const a = d?.gp?.[store]; if (!a) return null;
      const s = statusFor(a.ratio, GP_OBJ);
      return { cols: [eur(a.margeGP), eur(a.margeTotal)], valeur: pct(a.ratio), statut: s,
        trend: a.trend, jauge: { v: a.ratio, max: 35, target: GP_OBJ }, libelles: ["Marge GP", "Marge totale"] };
    }
    if (indicateur === "occasion") {
      const a = d?.occasion?.[store]; if (!a) return null;
      const obj = a.objectif ?? OCC_OBJ[store];
      const proj = projeter(a.volume, mois);
      return { cols: [eur(a.marge), `${obj}`], valeur: `${a.volume}`, statut: statusFor(proj, obj),
        trend: a.trend, jauge: { v: a.volume, max: obj || 1, target: obj },
        libelles: ["Marge occasion", "Objectif"], extra: proj != null ? `projection ≈ ${proj}` : null };
    }
    if (indicateur === "mobileo") {
      const a = d2?.mobileo?.[store]; if (!a) return null;
      const proj = projeter(a.total, mois);
      const vendeurs = Object.entries(a.vendeurs || {}).map(([n, v]) => `${n} ${v}`).join(" · ");
      return { cols: [vendeurs || "—", `${MOBILEO_OBJ} à 15`], valeur: `${a.total}`, statut: statusFor(proj, MOBILEO_OBJ),
        trend: a.trend, jauge: { v: a.total, max: 15, target: MOBILEO_OBJ },
        libelles: ["Détail vendeurs", "Objectif"], extra: proj != null ? `projection ≈ ${proj}` : null };
    }
    const a = d2?.atm?.[store]; if (!a) return null;
    return { cols: [`${a.total}`, `${a.mobOcc}`], valeur: pct(a.ratio), statut: statusFor(a.ratio, ATM_OBJ),
      trend: a.trend, jauge: { v: a.ratio, max: 25, target: ATM_OBJ }, libelles: ["Contrats ATM", "Mobiles occasion"] };
  };

  const analysisMap = indicateur === "accessoires" ? d?.analysis?.accessoires
    : indicateur === "gp" ? d?.analysis?.gp
    : indicateur === "mobileo" ? d2?.analysis?.mobileo
    : indicateur === "atm" ? d2?.analysis?.atm : null;

  return (
    <div className="stack">
      <div className="ctx" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="h-screen">Résultats</h1>
          <p>{data?.period} · {mois.ecoules} jours ouvrés écoulés sur {mois.total}</p>
        </div>
        {isRZ && <Btn size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Synchronisation…" : "Actualiser depuis Notion"}
        </Btn>}
      </div>

      <div className="seg" role="tablist">
        <button className={vue === "magasin" ? "on" : ""} onClick={() => setVue("magasin")}>Par magasin</button>
        <button className={vue === "vendeur" ? "on" : ""} onClick={() => setVue("vendeur")}>Par vendeur</button>
      </div>

      {vue === "magasin" ? (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select className="select" value={indicateur} onChange={e => setIndicateur(e.target.value)}>
              {INDICATEURS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
            {isRZ && (
              <select className="select" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                <option value="all">Tous les magasins</option>
                {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <span className="meta">Objectif : {courant.objectif}</span>
          </div>

          <Card>
            <SectionHead>{courant.label}</SectionHead>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  <th>Magasin</th>
                  <th className="r">{(ligne(stores[0])?.libelles || ["", ""])[0]}</th>
                  <th className="r">{(ligne(stores[0])?.libelles || ["", ""])[1]}</th>
                  <th className="r">Valeur</th>
                  <th className="c">Tendance</th>
                  <th style={{ width: 130 }}>Progression</th>
                </tr></thead>
                <tbody>
                  {stores.map(store => {
                    const l = ligne(store); if (!l) return null;
                    return (
                      <tr key={store} className="clickable" onClick={() => onOpenStore(store)}>
                        <td className="name">{store}{l.extra && <div className="cell-sub">{l.extra}</div>}</td>
                        <td className="r">{l.cols[0]}</td>
                        <td className="r">{l.cols[1]}</td>
                        <td className="r"><span className={`big txt-${l.statut}`}>{l.valeur}</span></td>
                        <td className="c"><Trend value={l.trend} /></td>
                        <td><Gauge flat value={l.jauge.v} max={l.jauge.max} target={l.jauge.target}
                          color={l.statut === "ok" ? C.ok : l.statut === "warn" ? C.warn : C.bad} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mcards">
              {stores.map(store => {
                const l = ligne(store); if (!l) return null;
                return (
                  <div className="mcard" key={`m-${store}`} onClick={() => onOpenStore(store)}>
                    <div className="top">
                      <div><h4>{store}</h4>{l.extra && <div className="meta">{l.extra}</div>}</div>
                      <Chip status={l.statut}>{l.valeur}</Chip>
                    </div>
                    <div className="mrow"><span>{l.libelles[0]}</span><b>{l.cols[0]}</b></div>
                    <div className="mrow"><span>{l.libelles[1]}</span><b>{l.cols[1]}</b></div>
                    <div className="mrow"><span>Tendance</span><b><Trend value={l.trend} /></b></div>
                    <Gauge value={l.jauge.v} max={l.jauge.max} target={l.jauge.target}
                      color={l.statut === "ok" ? C.ok : l.statut === "warn" ? C.warn : C.bad} />
                  </div>
                );
              })}
            </div>

            <AnalysisList isRZ={isRZ} stores={stores} store={user.store} analysisMap={analysisMap} />
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <h3 className="h-section" style={{ margin: 0 }}>
                {isRZ ? "Les vendeurs de la zone" : `L'équipe de ${user.store}`} — mois en cours
              </h3>
              <p className="meta" style={{ margin: "3px 0 0" }}>
                Cumul des journées saisies · classement par marge générée
              </p>
            </div>
            <Chip status="neutral">Objectifs : accessoires {ACC_OBJ} % · GP {GP_OBJ} % · ATM {ATM_OBJ} % des occasions</Chip>
          </div>
          {vendorsError
            ? <div className="empty">Résultats par vendeur indisponibles ({vendorsError}).</div>
            : <VendorsTable rows={vendors} mois={mois} showStore={isRZ} />}
        </Card>
      )}
    </div>
  );
}

// ─── ÉCRAN MAGASIN ───────────────────────────────────────────────────────────
function StorePage({ user, store, data, vendors, actions, mois, onBack, onSelectStore }) {
  const isRZ = user.role === "rz";
  const d = data?.page1, d2 = data?.page2;
  const acc = d?.accessoires?.[store], gp = d?.gp?.[store], occ = d?.occasion?.[store];
  const mob = d2?.mobileo?.[store], atm = d2?.atm?.[store];
  const objOcc = occ?.objectif ?? OCC_OBJ[store] ?? 0;
  const equipe = (vendors || []).filter(v => v.store === store);
  const plan = (actions || []).filter(a => a.store === store && (isRZ || a.published));
  const faites = plan.filter(a => a.state === "Fait").length;

  const commentaires = [
    d?.analysis?.accessoires?.[store], d?.analysis?.gp?.[store],
    d2?.analysis?.mobileo?.[store], d2?.analysis?.atm?.[store],
  ].filter(Boolean);

  const tuiles = [
    { lbl: "Marge du mois", hero: true, val: eur(acc?.margeTotal || 0),
      foot: <>Projection <b>≈ {eur(projeter(acc?.margeTotal, mois) || 0)}</b></> },
    { lbl: "Accessoires", val: pct(acc?.ratio),
      meter: { v: acc?.ratio, max: 40, target: ACC_OBJ, s: statusFor(acc?.ratio, ACC_OBJ) },
      foot: <><Trend value={acc?.trend} /> vs M-1</> },
    { lbl: "Garantie Plus", val: pct(gp?.ratio),
      meter: { v: gp?.ratio, max: 35, target: GP_OBJ, s: statusFor(gp?.ratio, GP_OBJ) },
      foot: <><Trend value={gp?.trend} /> vs M-1</> },
    { lbl: "Mobiles d'occasion", val: occ?.volume != null ? <>{occ.volume} <small>/ {objOcc}</small></> : "—",
      meter: { v: occ?.volume, max: objOcc || 1, target: objOcc, s: statusFor(projeter(occ?.volume, mois), objOcc) },
      foot: <>Projection ≈ {projeter(occ?.volume, mois) ?? "—"}</> },
    { lbl: "Forfaits Mobileo", val: mob?.total != null ? <>{mob.total} <small>/ {MOBILEO_OBJ}</small></> : "—",
      meter: { v: mob?.total, max: 15, target: MOBILEO_OBJ, s: statusFor(projeter(mob?.total, mois), MOBILEO_OBJ) },
      foot: <>Projection ≈ {projeter(mob?.total, mois) ?? "—"}</> },
    { lbl: "Contrats ATM", val: atm?.total != null ? `${atm.total}` : "—",
      meter: { v: atm?.ratio, max: 25, target: ATM_OBJ, s: statusFor(atm?.ratio, ATM_OBJ) },
      foot: <Chip status={statusFor(atm?.ratio, ATM_OBJ)}>{atm ? `${pct(atm.ratio)} de ${atm.mobOcc} occasions` : "—"}</Chip> },
  ];

  return (
    <div className="stack">
      <div>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Vue d'ensemble</button>
        <div className="ctx">
          <h1 className="h-screen">{store}</h1>
          <p>{(STORE_STAFF[store] || []).join(" · ")} · {mois.ecoules} jours ouvrés écoulés sur {mois.total}</p>
        </div>
        {isRZ && onSelectStore && (
          <div className="seg" style={{ marginBottom: 4 }}>
            {STORES_ORDER.map(s => (
              <button key={s} className={s === store ? "on" : ""} onClick={() => onSelectStore(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-3">
        {tuiles.map(({ lbl, val, foot, meter, hero }) => (
          <div className={`tile${hero ? " hero" : ""}`} key={lbl}>
            <div className="lbl">{lbl}</div>
            <div className="val">{val}</div>
            {meter && <Gauge value={meter.v} max={meter.max} target={meter.target}
              color={meter.s === "ok" ? C.ok : meter.s === "warn" ? C.warn : meter.s === "bad" ? C.bad : C.gray400} />}
            <div className="foot">{foot}</div>
          </div>
        ))}
      </div>

      <Card>
        <SectionHead>L'équipe — résultats du mois en cours</SectionHead>
        <VendorsTable rows={equipe} mois={mois} showStore={false} />
      </Card>

      {commentaires.length > 0 && (
        <div className="quote">
          <div className="lbl" style={{ color: C.accent }}>Mon commentaire</div>
          {commentaires.map((c, i) => <p key={i}>{c}</p>)}
        </div>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 className="h-section" style={{ margin: 0 }}>Plan d'action</h3>
            <p className="meta" style={{ margin: "3px 0 0" }}>Actions décidées ensemble · l'équipe coche au fur et à mesure</p>
          </div>
          {plan.length > 0 && <Chip status={faites === plan.length ? "ok" : "neutral"}>{faites} sur {plan.length} terminée{faites > 1 ? "s" : ""}</Chip>}
        </div>
        <div style={{ marginTop: 12 }}>
          {plan.length === 0
            ? <div className="empty">Aucune action en cours pour ce magasin.</div>
            : plan.map(a => {
                const done = a.state === "Fait", doing = a.state === "En cours";
                return (
                  <div className={`action${done ? " is-done" : ""}`} key={a.id}>
                    <div className={`check${done ? " done" : doing ? " doing" : ""}`} />
                    <div className="body">
                      <b>{a.title}</b>
                      <p>{[a.who, a.indicator, a.origin].filter(Boolean).join(" · ")}{a.notes ? ` — ${a.notes}` : ""}</p>
                    </div>
                    <div className="side">
                      <Chip status={done ? "ok" : doing ? "warn" : "bad"}>{a.state || "À faire"}</Chip>
                      {a.due && <span className="meta">{new Date(a.due).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>}
                    </div>
                  </div>
                );
              })}
        </div>
      </Card>
    </div>
  );
}

function VisitsPage({ user, visits }) {
  const isRZ = user.role === "rz";
  const [filterStore, setFilterStore] = useState("all");
  const shown = (isRZ && filterStore !== "all")
    ? (visits || []).filter(v => v.store === filterStore)
    : (visits || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Comptes rendus de visites</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>
            Base Notion "Suivi Visites Magasins SAVE"{isRZ && filterStore !== "all" ? ` · ${shown.length} pour ${filterStore}` : ""}
          </p>
        </div>
        {isRZ && (
          <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "inherit", color: C.navy, background: C.white, cursor: "pointer" }}>
            <option value="all">🏢 Toutes les villes</option>
            {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      {(!shown || shown.length === 0) ? (
        <Card><div style={{ textAlign: "center", padding: "28px 0", color: C.gray400 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>{isRZ ? (filterStore !== "all" ? `Aucune visite pour ${filterStore}.` : "Aucune visite récente.") : "Aucun compte rendu publié pour votre magasin."}</div>
        </div></Card>
      ) : shown.map((v) => {
        const statutColor = v.statut === "Compte-rendu envoyé" ? C.ok : v.statut === "Réalisée" ? C.accent : C.warn;
        return (
          <Card key={v.id} accent={C.accent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Compte rendu de visite</div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.navy }}>{v.title || v.store}</h3>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
                  {v.store}{v.date ? ` · ${v.date}` : ""}{v.staff?.length ? ` · ${v.staff.join(", ")}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: statutColor + "22", color: statutColor, fontWeight: 700, whiteSpace: "nowrap" }}>{v.statut || "—"}</span>
                {isRZ && v.url && <a href={v.url} target="_blank" rel="noopener noreferrer"><Btn size="sm" variant="secondary">Ouvrir</Btn></a>}
              </div>
            </div>
            {v.objectifsAtteints && <div style={{ fontSize: 12, color: C.gray600, marginBottom: 10 }}>Objectifs : <strong>{v.objectifsAtteints}</strong></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: v.actions || v.objectifsFixes ? 10 : 0 }}>
              {v.pointsPositifs && (
                <div style={{ padding: "10px 12px", background: "#F0FDF4", borderRadius: 8, borderLeft: `3px solid ${C.ok}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.ok, marginBottom: 4, textTransform: "uppercase" }}>✓ Points positifs</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.pointsPositifs}</div>
                </div>
              )}
              {v.pointsACorriger && (
                <div style={{ padding: "10px 12px", background: "#FFF7ED", borderRadius: 8, borderLeft: `3px solid ${C.warn}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.warn, marginBottom: 4, textTransform: "uppercase" }}>⚠ Points à corriger</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.pointsACorriger}</div>
                </div>
              )}
            </div>
            {v.objectifsFixes && (
              <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4, textTransform: "uppercase" }}>🎯 Objectifs fixés</div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.objectifsFixes}</div>
              </div>
            )}
            {v.actions && (
              <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4, textTransform: "uppercase" }}>📌 Actions décidées</div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.actions}</div>
              </div>
            )}
            {v.prochainRdv && <div style={{ fontSize: 12, color: C.gray600 }}>📅 Prochain RDV : <strong>{v.prochainRdv}</strong></div>}
          </Card>
        );
      })}
    </div>
  );
}

// ─── HISTORIQUE (jours ouvrés Tue–Sat + fériés) ───────────────────────────────
function joursFeries(annee) {
  const f = new Set([
    `${annee}-01-01`, `${annee}-05-01`, `${annee}-05-08`, `${annee}-07-14`,
    `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`,
  ]);
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d2 = Math.floor(b / 4), e = b % 4, f2 = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f2 + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(annee, mois - 1, jour);
  const add = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  f.add(iso(add(paques, 1))); f.add(iso(add(paques, 39))); f.add(iso(add(paques, 50)));
  return f;
}

function joursOuvres(annee, mois, jusquau = null) {
  const feries = joursFeries(annee);
  const dernierJour = new Date(annee, mois, 0).getDate();
  const limite = jusquau != null ? Math.min(jusquau, dernierJour) : dernierJour;
  let n = 0;
  for (let j = 1; j <= limite; j++) {
    const dt = new Date(annee, mois - 1, j);
    const js = dt.getDay();
    const iso = `${annee}-${String(mois).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
    if (js >= 2 && js <= 6 && !feries.has(iso)) n++;
  }
  return n;
}

function estMoisEnCours(moisKey) {
  const now = new Date();
  return moisKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function projeterVolume(val, moisKey) {
  if (val == null) return null;
  const [annee, mois] = moisKey.split("-").map(Number);
  const now = new Date();
  const ecoules = joursOuvres(annee, mois, now.getDate());
  const total = joursOuvres(annee, mois);
  if (ecoules <= 0) return null;
  return { projete: Math.round((val / ecoules) * total), ecoules, total };
}

function analyzeSeries(points, { suffix = "", target = null, higherIsBetter = true }) {
  const pts = points.filter(p => p.value != null);
  if (pts.length < 2) return null;
  const vals = pts.map(p => p.value);
  const first = vals[0], last = vals[vals.length - 1];
  const delta = +(last - first).toFixed(1);
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const diffs = [];
  for (let i = 1; i < vals.length; i++) diffs.push(Math.abs(vals[i] - vals[i - 1]));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const amplitude = maxV - minV;
  const regulier = amplitude === 0 ? true : (avgDiff / (Math.abs(avg) || 1)) < 0.15;
  const recent = vals.slice(-3);
  const recentTrend = recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0;
  let sens, couleur;
  const seuil = Math.max(0.1, Math.abs(avg) * 0.02);
  if (Math.abs(delta) <= seuil) { sens = "stable"; couleur = C.gray600; }
  else { const positif = higherIsBetter ? delta > 0 : delta < 0; sens = delta > 0 ? "hausse" : "baisse"; couleur = positif ? C.ok : C.bad; }
  const fmt = (v) => `${v}${suffix}`;
  const nbMois = pts.length;
  let phrase = "";
  if (sens === "stable") phrase = `Stable autour de ${fmt(avg)} sur ${nbMois} mois.`;
  else { const mot = sens === "hausse" ? "Progression" : "Repli"; phrase = `${mot} de ${delta > 0 ? "+" : ""}${fmt(delta)} sur ${nbMois} mois (de ${fmt(first)} à ${fmt(last)}).`; }
  phrase += regulier ? ` Évolution régulière.` : ` Évolution irrégulière (de ${fmt(minV)} à ${fmt(maxV)}).`;
  if (pts.length >= 4 && Math.abs(recentTrend) > seuil) {
    const recOk = higherIsBetter ? recentTrend > 0 : recentTrend < 0;
    phrase += recentTrend > 0 ? ` Tendance récente à la hausse${recOk ? " 👍" : ""}.` : ` Tendance récente à la baisse${recOk ? "" : " ⚠️"}.`;
  }
  if (target != null) {
    const okCount = vals.filter(v => higherIsBetter ? v >= target : v <= target).length;
    if (okCount === nbMois) phrase += ` Objectif (${fmt(target)}) tenu sur toute la période.`;
    else if (okCount === 0) phrase += ` Jamais au niveau de l'objectif (${fmt(target)}).`;
    else phrase += ` Objectif atteint ${okCount}/${nbMois} mois.`;
  }
  return { phrase, couleur, delta, suffix, avg, last };
}

function MiniLineChart({ data, label, suffix = "", target, color = C.accent, higherIsBetter = true, isVolume = false }) {
  const points = data.filter(d => d.value != null);
  if (points.length === 0) return null;
  const lastIdx = points.length - 1;
  const lastMois = points[lastIdx]?.mois;
  const enCours = lastMois && estMoisEnCours(lastMois);
  let projection = null;
  if (enCours && isVolume) projection = projeterVolume(points[lastIdx].value, lastMois);
  const analysisPoints = enCours ? points.slice(0, -1) : points;
  const drawPoints = points.map((p, i) => ({ ...p, estEnCours: enCours && i === lastIdx }));
  const values = drawPoints.map(p => p.value);
  const projValue = projection ? projection.projete : null;
  const allVals = projValue != null ? [...values, projValue] : values;
  const rawMax = Math.max(...allVals, target != null ? target : -Infinity);
  const rawMin = Math.min(...allVals, target != null ? target : Infinity);
  const span = (rawMax - rawMin) || Math.abs(rawMax) || 1;
  const maxV = rawMax + span * 0.15, minV = Math.max(0, rawMin - span * 0.15);
  const range = (maxV - minV) || 1;
  const W = 340, H = 150, padX = 12, padTop = 22, padBot = 26;
  const plotH = H - padTop - padBot, plotW = W - padX * 2;
  const stepX = drawPoints.length > 1 ? plotW / (drawPoints.length - 1) : 0;
  const xy = drawPoints.map((p, i) => ({ x: padX + i * stepX, y: padTop + plotH - ((p.value - minV) / range) * plotH, v: p.value, mois: p.mois, estEnCours: p.estEnCours }));
  const smoothPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const linePath = smoothPath(xy);
  const areaPath = xy.length > 0 ? `${linePath} L ${xy[xy.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${padX} ${(padTop + plotH).toFixed(1)} Z` : "";
  const targetY = target != null ? padTop + plotH - ((target - minV) / range) * plotH : null;
  const analysis = analyzeSeries(analysisPoints, { suffix, target, higherIsBetter });
  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const shortLabel = (mois) => { if (!mois) return ""; const [, m] = mois.split("-"); return monthLabels[parseInt(m) - 1] || ""; };
  const projY = projValue != null ? padTop + plotH - ((projValue - minV) / range) * plotH : null;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gray600, marginBottom: 4 }}>{label}</div>
      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", minWidth: 200 }}>
          <defs>
            <linearGradient id={`area-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {targetY != null && (
            <line x1={padX} y1={targetY} x2={W - padX} y2={targetY} stroke={C.gray200} strokeWidth="1.5" strokeDasharray="4,3" />
          )}
          {areaPath && <path d={areaPath} fill={`url(#area-${label})`} />}
          {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
          {projY != null && (
            <line x1={xy[xy.length - 1].x} y1={xy[xy.length - 1].y} x2={xy[xy.length - 1].x + stepX * 0.7} y2={projY} stroke={color} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.55" />
          )}
          {xy.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={pt.estEnCours ? 5 : 3.5} fill={pt.estEnCours ? C.warn : color} stroke={C.white} strokeWidth="1.5" />
              {(i === 0 || i === xy.length - 1 || pt.estEnCours) && (
                <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="9" fill={pt.estEnCours ? C.warn : color} fontWeight="700">{pt.v}{suffix}</text>
              )}
              {(i === 0 || i === xy.length - 1 || i % Math.max(1, Math.floor(xy.length / 5)) === 0) && (
                <text x={pt.x} y={H - 4} textAnchor="middle" fontSize="8" fill={C.gray400}>{shortLabel(pt.mois)}</text>
              )}
            </g>
          ))}
          {targetY != null && (
            <text x={W - padX - 2} y={targetY - 3} textAnchor="end" fontSize="8" fill={C.gray400}>obj. {target}{suffix}</text>
          )}
          {projValue != null && projY != null && (
            <text x={xy[xy.length - 1].x + stepX * 0.7 + 2} y={projY - 5} fontSize="8" fill={C.warn} fontWeight="700">~{projValue}{suffix}</text>
          )}
        </svg>
      </div>
      {analysis && (
        <div style={{ fontSize: 11, color: analysis.couleur, lineHeight: 1.5, marginTop: 4, padding: "5px 8px", background: C.bg, borderRadius: 6 }}>
          {analysis.phrase}
          {enCours && projection && (
            <span style={{ color: C.warn, fontWeight: 700 }}> | En cours : {points[lastIdx].value}{suffix} / {projection.ecoules}j · Projection fin de mois : ~{projection.projete}{suffix}.</span>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPage({ user, history }) {
  const isRZ = user.role === "rz";
  const stores = isRZ ? STORES_ORDER : [user.store];

  // Vue courante : "graphiques" (existante) | "comparaison" | "tableau"
  const [tab, setTab] = useState("graphiques");
  const [activeStore, setActiveStore] = useState(isRZ ? "all" : user.store);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [tableStore, setTableStore] = useState(stores[0]);

  const OCCASION_OBJ = { "Pontarlier": 50, "Lons-le-Saunier": 50, "Dijon": 25, "Besançon": 20, "Chalon-sur-Saône": 15 };
  const MOIS_FR = { "01":"Janv.","02":"Févr.","03":"Mars","04":"Avr.","05":"Mai","06":"Juin","07":"Juil.","08":"Août","09":"Sept.","10":"Oct.","11":"Nov.","12":"Déc." };
  const moisLabel = (k) => { if (!k) return "—"; const [y, m] = k.split("-"); return `${MOIS_FR[m] || m} ${y}`; };

  // byStore est un objet { [magasin]: [{ mois, accessoires, gp, occasion, mobileo, margeTotale, atm }] }
  // On le convertit en byStore[magasin][mois] = row pour accès rapide
  const byStoreMois = {};
  if (history?.byStore) {
    for (const [store, rows] of Object.entries(history.byStore)) {
      byStoreMois[store] = {};
      for (const row of (Array.isArray(rows) ? rows : [])) {
        if (row.mois) byStoreMois[store][row.mois] = row;
      }
    }
  }

  const allMonths = (history?.months || []).slice().sort();
  // Initialise le mois sélectionné au plus récent dès que les données arrivent
  const effectiveMonth = selectedMonth || allMonths[allMonths.length - 1] || null;

  if (!history || !allMonths.length) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "28px 0", color: C.gray400 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 13 }}>Pas encore d'historique mensuel disponible.</div>
        </div>
      </Card>
    );
  }

  // ─── Série pour MiniLineChart (champs backend : accessoires/gp/occasion/mobileo/margeTotale/atm)
  const buildSeries = (storeKey, kpi) => allMonths.map(m => {
    const row = byStoreMois[storeKey]?.[m];
    let value = null;
    if (kpi === "acc"    && row?.accessoires != null)  value = row.accessoires;
    if (kpi === "gp"     && row?.gp != null)           value = row.gp;
    if (kpi === "occ"    && row?.occasion != null)     value = row.occasion;
    if (kpi === "mobileo"&& row?.mobileo != null)      value = row.mobileo;
    if (kpi === "atm"    && row?.atm != null)          value = row.atm;
    return { mois: m, value };
  });

  // ─── Évolution en % entre deux valeurs
  const evo = (vN, vNm1) => {
    if (vN == null || vNm1 == null || vNm1 === 0) return null;
    return ((vN - vNm1) / Math.abs(vNm1) * 100).toFixed(1);
  };

  const EvoChip = ({ pct }) => {
    if (pct == null) return <span style={{ color: C.gray200, fontSize: 11 }}>—</span>;
    const v = parseFloat(pct);
    const color = v > 0 ? C.ok : v < 0 ? C.bad : C.gray400;
    const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "=";
    return <span style={{ fontSize: 11, fontWeight: 700, color }}>{arrow} {Math.abs(v)}%</span>;
  };

  const kpiColor = (key, val) => {
    if (val == null) return C.gray200;
    if (key === "acc") return val >= 25 ? C.ok : val >= 22 ? C.warn : C.bad;
    if (key === "gp")  return val >= 20 ? C.ok : val >= 17 ? C.warn : C.bad;
    return C.text;
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding: "6px 14px", borderRadius: 8, border: "none",
      background: tab === id ? C.accent : C.gray50,
      color: tab === id ? C.white : C.gray600,
      fontWeight: tab === id ? 700 : 500, fontSize: 12,
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const TH = ({ children, align = "left" }) => (
    <th style={{ textAlign: align, padding: "7px 9px", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.gray50}`, whiteSpace: "nowrap" }}>{children}</th>
  );
  const TD = ({ children, align = "left", bold, dim }) => (
    <td style={{ padding: "8px 9px", fontSize: 12, textAlign: align, fontWeight: bold ? 700 : 400, color: dim ? C.gray400 : undefined, verticalAlign: "middle" }}>{children}</td>
  );

  const eurFmt = v => v != null ? `${Math.round(v).toLocaleString("fr-FR")} €` : "—";

  const KPI_COLS = [
    { key: "margeTotale", label: "Marge €",     fmt: eurFmt },
    { key: "acc",         label: "Acc. %",       fmt: v => v != null ? `${v}%` : "—" },
    { key: "margeAcc",    label: "dont Acc. €",  fmt: eurFmt },
    { key: "gp",          label: "GP %",         fmt: v => v != null ? `${v}%` : "—" },
    { key: "margeGP",     label: "dont GP €",    fmt: eurFmt },
    { key: "occ",         label: "Mob. Occ.",    fmt: v => v != null ? `${v}` : "—" },
    { key: "mobileo",     label: "Mobileo",      fmt: v => v != null ? `${v}` : "—" },
  ];

  // Accès simplifié à une valeur depuis byStoreMois
  const getVal = (store, mois, key) => {
    const row = byStoreMois[store]?.[mois];
    if (!row) return null;
    if (key === "margeTotale") return row.margeTotale ?? null;
    if (key === "acc")         return row.accessoires ?? null;
    if (key === "margeAcc")    return row.margeAccessoires ?? null;
    if (key === "gp")          return row.gp ?? null;
    if (key === "margeGP")     return row.margeGP ?? null;
    if (key === "occ")         return row.occasion ?? null;
    if (key === "mobileo")     return row.mobileo ?? null;
    return null;
  };

  // ─── VUE GRAPHIQUES (existante) ───────────────────────────────────────────
  const displayStores = activeStore === "all" ? stores : [activeStore];

  const renderGraphiques = () => (
    <>
      {isRZ && (
        <select value={activeStore} onChange={e => setActiveStore(e.target.value)}
          style={{ alignSelf: "flex-end", border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontFamily: "inherit", color: C.navy, background: C.white, cursor: "pointer" }}>
          <option value="all">🏢 Tous les magasins</option>
          {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {displayStores.map(store => (
        <Card key={store}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 14 }}>{store}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            <MiniLineChart data={buildSeries(store, "acc")} label="Ratio Accessoires (%)" suffix="%" target={25} color={C.accent} />
            <MiniLineChart data={buildSeries(store, "gp")} label="Ratio GP (%)" suffix="%" target={20} color={C.accentB} />
            <MiniLineChart data={buildSeries(store, "occ")} label="Mobiles Occasion (vol.)" target={OCCASION_OBJ[store]} color={C.ok} isVolume />
            <MiniLineChart data={buildSeries(store, "mobileo")} label="Forfaits Mobileo" target={10} color="#8B5CF6" isVolume />
            <MiniLineChart data={buildSeries(store, "atm")} label="Ratio ATM (%)" suffix="%" target={10} color={C.warn} />
          </div>
        </Card>
      ))}
    </>
  );

  // ─── VUE COMPARAISON N / N-1 / N-2 ──────────────────────────────────────
  const renderComparaison = () => {
    if (!effectiveMonth) return null;
    const [y, mm] = effectiveMonth.split("-");
    const keyN   = effectiveMonth;
    const keyNm1 = `${parseInt(y) - 1}-${mm}`;
    const keyNm2 = `${parseInt(y) - 2}-${mm}`;

    return (
      <>
        {/* Sélecteur de mois */}
        <Card style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📅 Mois :</span>
            <select value={effectiveMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "5px 10px", fontSize: 13, fontFamily: "inherit", color: C.navy, background: C.white, cursor: "pointer" }}>
              {allMonths.slice().reverse().map(m => <option key={m} value={m}>{moisLabel(m)}</option>)}
            </select>
            <div style={{ fontSize: 12, color: C.gray400 }}>
              <strong style={{ color: C.navy }}>{moisLabel(keyN)}</strong>
              {" vs "}<strong>{moisLabel(keyNm1)}</strong>
              {" vs "}<strong>{moisLabel(keyNm2)}</strong>
            </div>
          </div>
        </Card>

        {stores.map(store => {
          const hasN = KPI_COLS.some(c => getVal(store, keyN, c.key) != null);
          return (
            <Card key={store}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{store}</div>
                {!hasN && <span style={{ fontSize: 11, color: C.warn, background: C.warn + "22", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>Données manquantes pour {moisLabel(keyN)}</span>}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr>
                      <TH>Indicateur</TH>
                      <TH align="right">{moisLabel(keyN)}</TH>
                      <TH align="center">vs N-1</TH>
                      <TH align="right">{moisLabel(keyNm1)}</TH>
                      <TH align="center">vs N-2</TH>
                      <TH align="right">{moisLabel(keyNm2)}</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {KPI_COLS.map((col, i) => {
                      const vN   = getVal(store, keyN,   col.key);
                      const vNm1 = getVal(store, keyNm1, col.key);
                      const vNm2 = getVal(store, keyNm2, col.key);
                      const isMobPre = col.key === "mobileo" && keyNm2 < "2024-03";
                      return (
                        <tr key={col.key} style={{ background: i % 2 === 0 ? C.white : C.bg }}>
                          <TD bold>{col.label}</TD>
                          <TD align="right">
                            <span style={{ fontWeight: 700, color: kpiColor(col.key, vN) }}>{col.fmt(vN)}</span>
                          </TD>
                          <TD align="center"><EvoChip pct={evo(vN, vNm1)} /></TD>
                          <TD align="right" dim>{col.fmt(vNm1)}</TD>
                          <TD align="center">
                            {isMobPre ? <span style={{ fontSize: 11, color: C.gray200 }}>N/A</span> : <EvoChip pct={evo(vN, vNm2)} />}
                          </TD>
                          <TD align="right" dim>
                            {isMobPre ? <span style={{ fontSize: 11, color: C.gray200 }}>N/A</span> : col.fmt(vNm2)}
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </>
    );
  };

  // ─── VUE TABLEAU CHRONOLOGIQUE ───────────────────────────────────────────
  const renderTableau = () => {
    const storeMonths = byStoreMois[tableStore] ? Object.keys(byStoreMois[tableStore]).sort() : [];
    return (
      <>
        {/* Sélecteur magasin */}
        <Card style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>🏪 Magasin :</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {stores.map(s => (
                <button key={s} onClick={() => setTableStore(s)} style={{
                  padding: "4px 11px", borderRadius: 7, border: "none",
                  background: tableStore === s ? C.navy : C.gray50,
                  color: tableStore === s ? C.white : C.gray600,
                  fontWeight: tableStore === s ? 700 : 500, fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{s}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead>{tableStore} — Évolution mensuelle complète</SectionHead>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <TH>Mois</TH>
                  <TH align="right">Marge €</TH>
                  <TH align="center">Évol.</TH>
                  <TH align="right">Acc. %</TH>
                  <TH align="right">GP %</TH>
                  <TH align="right">Mob. Occ.</TH>
                  <TH align="right">Mobileo</TH>
                </tr>
              </thead>
              <tbody>
                {storeMonths.map((m, i) => {
                  const row = byStoreMois[tableStore]?.[m] || {};
                  const prevKey = i > 0 ? storeMonths[i - 1] : null;
                  const prevRow = prevKey ? byStoreMois[tableStore]?.[prevKey] : null;
                  const evoMarge = prevRow ? evo(row.margeTotale, prevRow.margeTotale) : null;
                  const isNewYear = i > 0 && m.endsWith("-01");
                  const isMobPre = m < "2024-03";
                  return (
                    <tr key={m} style={{
                      background: i % 2 === 0 ? C.white : C.bg,
                      borderTop: isNewYear ? `2px solid ${C.gray200}` : undefined,
                    }}>
                      <td style={{ padding: "8px 9px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {isNewYear && <span style={{ fontSize: 10, color: C.accent, fontWeight: 800, marginRight: 5 }}>{m.split("-")[0]}</span>}
                        {moisLabel(m)}
                      </td>
                      <TD align="right">
                        <span style={{ fontWeight: 700, color: C.navy }}>
                          {row.margeTotale != null ? `${Math.round(row.margeTotale).toLocaleString("fr-FR")} €` : "—"}
                        </span>
                      </TD>
                      <TD align="center"><EvoChip pct={evoMarge} /></TD>
                      <TD align="right">
                        <span style={{ fontWeight: 700, color: kpiColor("acc", row.accessoires) }}>
                          {row.accessoires != null ? `${row.accessoires}%` : "—"}
                        </span>
                      </TD>
                      <TD align="right">
                        <span style={{ fontWeight: 700, color: kpiColor("gp", row.gp) }}>
                          {row.gp != null ? `${row.gp}%` : "—"}
                        </span>
                      </TD>
                      <TD align="right">{row.occasion != null ? row.occasion : "—"}</TD>
                      <TD align="right">
                        {isMobPre ? <span style={{ fontSize: 11, color: C.gray200 }}>N/A</span> : (row.mobileo != null ? row.mobileo : "—")}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: C.gray400 }}>
            <span><span style={{ color: C.ok, fontWeight: 700 }}>●</span> Acc. ≥25% / GP ≥20%</span>
            <span><span style={{ color: C.warn, fontWeight: 700 }}>●</span> Acc. ≥22% / GP ≥17%</span>
            <span><span style={{ color: C.bad, fontWeight: 700 }}>●</span> Sous objectif</span>
            <span style={{ color: C.gray200 }}>N/A = Mobileo démarré Mars 2024</span>
          </div>
        </Card>
      </>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Historique mensuel</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>
          {allMonths.length} mois · {moisLabel(allMonths[0])} → {moisLabel(allMonths[allMonths.length - 1])}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabBtn id="graphiques"  label="📈 Graphiques" />
        <TabBtn id="comparaison" label="🔍 Comparaison N/N-1/N-2" />
        <TabBtn id="tableau"     label="📋 Tableau chronologique" />
      </div>

      {tab === "graphiques"  && renderGraphiques()}
      {tab === "comparaison" && renderComparaison()}
      {tab === "tableau"     && renderTableau()}
    </div>
  );
}

// ─── GOAT — composants visuels ────────────────────────────────────────────────
// ─── GOAT — composants ────────────────────────────────────────────────────────
// Le score sur 100 se décompose en Accessoires (25), GP (25), Mobileo (30) et
// ATM (20). Une seule barre empilée, une seule teinte du clair au foncé : on lit
// la composition sans transformer la ligne en graphique.
const GOAT_PARTS = [
  { key: "accessoires", label: "Accessoires", max: 25, cls: "sg1" },
  { key: "gp",          label: "GP",          max: 25, cls: "sg2" },
  { key: "mobileo",     label: "Mobileo",     max: 30, cls: "sg3" },
  { key: "atm",         label: "ATM",         max: 20, cls: "sg4" },
];

function GoatLegend() {
  return (
    <div className="goat-legend">
      <span style={{ fontWeight: 650, color: "var(--sub)" }}>Composition du score :</span>
      {GOAT_PARTS.map(p => (
        <span key={p.key}><i className={p.cls} /> {p.label} <b style={{ color: "var(--sub)" }}>/{p.max}</b></span>
      ))}
    </div>
  );
}

function GoatStack({ breakdown }) {
  if (!breakdown) return null;
  const total = GOAT_PARTS.reduce((s, p) => s + (breakdown[p.key] || 0), 0);
  if (!total) return null;
  return (
    <div className="stackbar" title={GOAT_PARTS.map(p => `${p.label} ${(breakdown[p.key] || 0).toFixed(1)}/${p.max}`).join(" · ")}>
      {GOAT_PARTS.map(p => {
        const v = breakdown[p.key] || 0;
        if (v <= 0) return null;
        return <i key={p.key} className={p.cls} style={{ width: `${(v / 100) * 100}%` }} />;
      })}
    </div>
  );
}

function GoatRow({ rank, name, store, score, isSolo, breakdown, suffix }) {
  return (
    <div className={`goat-row${rank === 1 ? " lead" : ""}`}>
      <div className={`rk${rank <= 3 ? ` m${rank}` : ""}`}>{rank}</div>
      <div className="who">
        <b>{name}{isSolo && <span className="goat-solo">SOLO</span>}</b>
        <span>{store}</span>
        {breakdown && <GoatStack breakdown={breakdown} />}
      </div>
      <div className="sc" style={{ color: rank === 1 ? "#B8860B" : "var(--ink)" }}>
        {typeof score === "number" ? score.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : score}
        {suffix && <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}> {suffix}</span>}
      </div>
    </div>
  );
}

function GoatHistory({ label, entries }) {
  if (!entries?.length) return null;
  return (
    <details className="hist">
      <summary>{label} ({entries.length})</summary>
      <div className="hist-body">
        {entries.map((t, i) => (
          <div className="hist-row" key={i}>
            <span className="per">{t.label}</span>
            <span><span className="who">{t.winner}</span>{t.score != null && <span className="per"> · {t.score}</span>}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function GoatColumn({ kicker, title, subtitle, hero, rows, history, historyLabel, emptyLabel }) {
  return (
    <div className="goat-card">
      <div className="goat-head">
        <div className="k">{kicker}</div>
        <h3>{title}</h3>
        {subtitle && <p className="p">{subtitle}</p>}
      </div>
      {hero}
      {rows?.length ? rows : <div className="empty" style={{ padding: "22px 14px" }}>{emptyLabel}</div>}
      <GoatHistory label={historyLabel} entries={history} />
    </div>
  );
}

// ─── ÉCRAN GOAT ───────────────────────────────────────────────────────────────
// Trois colonnes côte à côte : la saison, le mois, la semaine. Chaque colonne
// porte son propre historique, replié sous son tableau.
function GoatPage({ user, goatData, goatError, lastLoaded, onRefresh, refreshing }) {
  const isRZ = user.role === "rz";

  // Pas de données de secours : si Notion n'a pas répondu, on le dit clairement
  // plutôt que d'afficher un classement périmé qui passerait pour celui du jour.
  if (!goatData) {
    return (
      <div className="stack">
        <h1 className="h-screen">🐐 GOAT — Classement vendeurs</h1>
        <Card accent={C.bad}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 750, fontSize: 15 }}>Classement indisponible</div>
              <p className="note" style={{ marginTop: 4 }}>
                La lecture de la base GOAT dans Notion n'a pas abouti{goatError ? ` (${goatError})` : ""}.
                Aucun classement n'est affiché : mieux vaut pas de chiffre qu'un chiffre périmé.
                {lastLoaded ? ` Dernière tentative ${stampLabel(lastLoaded)}.` : ""}
              </p>
              {isRZ && (
                <div style={{ marginTop: 12 }}>
                  <Btn size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
                    {refreshing ? "Nouvelle tentative…" : "Réessayer"}
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const data = goatData;
  const titres = data.titlesHistory || [];
  const seasonPoints = computeGoatSeasonPoints(titres);
  const goat = seasonPoints[0];
  const streak = computeCurrentStreak(titres);
  const showStreak = streak && streak.count >= 3;

  const moisScores = [...(data.monthly?.scores || [])].sort((a, b) => b.total - a.total);
  const semScores  = [...(data.weekly?.scores  || [])].sort((a, b) => b.total - a.total);

  return (
    <div className="stack">
      <div className="ctx" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="h-screen">🐐 GOAT — Classement vendeurs</h1>
          <p>
            Score sur 100, chaque indicateur plafonné à son objectif · bonus +10 % pour les magasins solo
            {lastLoaded ? ` · lu dans Notion ${stampLabel(lastLoaded)}` : ""}
          </p>
        </div>
        {isRZ && <Btn size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Synchronisation…" : "Actualiser depuis Notion"}
        </Btn>}
      </div>

      <GoatLegend />

      <div className="goat-cols">
        {/* ── Colonne 1 : la saison écoulée ── */}
        <GoatColumn
          kicker="Saison écoulée"
          title="GOAT de la saison"
          subtitle="1 point par MVP de la semaine · 3 points par MVP du mois"
          hero={goat && (
            <div className="goat-hero">
              <div className="badge">🐐</div>
              <div className="who">
                <b>{goat.name}</b>
                <span>{goat.store}</span>
                <div style={{ marginTop: 4, display: "flex", gap: 9, flexWrap: "wrap", fontSize: 11, fontWeight: 700 }}>
                  {goat.months > 0 && <span style={{ color: "#B8860B" }}>🏆 {goat.months} mois</span>}
                  {goat.weeks > 0 && <span style={{ color: C.accent }}>⭐ {goat.weeks} sem.</span>}
                  {showStreak && <span style={{ color: "#C0392B" }}>🔥 {streak.count} d'affilée</span>}
                </div>
              </div>
              <div className="pts"><b>{goat.points}</b><span>points</span></div>
            </div>
          )}
          rows={seasonPoints.slice(1).map((p, i) => (
            <GoatRow key={p.name} rank={i + 2} name={p.name} store={p.store} score={p.points} suffix="pts" />
          ))}
          emptyLabel="Aucun titre décerné pour l'instant."
          historyLabel="Tous les titres de la saison"
          history={titres}
        />

        {/* ── Colonne 2 : le mois ── */}
        <GoatColumn
          kicker="Mois"
          title="MVP du mois"
          subtitle={data.monthly?.label || "Période non renseignée"}
          rows={moisScores.map((v, i) => (
            <GoatRow key={v.name} rank={i + 1} name={v.name} store={v.store} score={v.total}
              isSolo={v.isSolo} breakdown={v.breakdown} suffix="/100" />
          ))}
          emptyLabel="Pas encore de classement mensuel."
          historyLabel="Les mois précédents"
          history={titres.filter(t => t.type === "month")}
        />

        {/* ── Colonne 3 : la semaine ── */}
        <GoatColumn
          kicker="Semaine"
          title="MVP de la semaine"
          subtitle={data.weekly?.label || "Période non renseignée"}
          rows={semScores.map((v, i) => (
            <GoatRow key={v.name} rank={i + 1} name={v.name} store={v.store} score={v.total}
              isSolo={v.isSolo} breakdown={v.breakdown} suffix="/100" />
          ))}
          emptyLabel="Pas encore de classement hebdomadaire."
          historyLabel="Les semaines précédentes"
          history={titres.filter(t => t.type === "week")}
        />
      </div>

      <details className="card" style={{ padding: "14px 20px" }}>
        <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 650, color: "var(--sub)", listStyle: "none" }}>
          Comment le score est calculé
        </summary>
        <p className="note" style={{ marginTop: 10 }}>
          Chaque indicateur est plafonné à 100 % de son objectif individuel : Accessoires 25 points, Garantie Plus
          25 points, Mobileo 30 points, ATM 20 points. L'objectif Mobileo individuel correspond à l'objectif du
          magasin (12, milieu de la fourchette 10–15) divisé par le nombre de vendeurs actifs. Les magasins tenus
          par une seule personne — Chalon et Besançon — reçoivent un bonus de 10 % sur le score final, puisque le
          vendeur porte seul l'intégralité de l'activité.
        </p>
      </details>
    </div>
  );
}

const GUIDE_IDS = ["adn", "trame", "questions", "operateurs", "closing", "obj1", "obj2", "memo"];

// ─── GUIDE VENTES MOBILEO — accordéon ─────────────────────────────────────────
// Les 8 catégories sont repliées par défaut : on voit la trame complète d'un
// coup d'œil, on déplie seulement celle dont on a besoin au comptoir.
function GuidePage() {
  const [ouverts, setOuverts] = useState(() => new Set());
  const bascule = (id) => setOuverts(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toutOuvrir  = () => setOuverts(new Set(GUIDE_IDS));
  const toutFermer  = () => setOuverts(new Set());

  const Section = ({ id, icon, title, hint, children }) => {
    const open = ouverts.has(id);
    return (
      <div className={`acc${open ? " open" : ""}`}>
        <button className="acc-head" onClick={() => bascule(id)} aria-expanded={open}>
          <span className="acc-num">{GUIDE_IDS.indexOf(id) + 1}</span>
          <span className="acc-title">{title}</span>
          {hint && <span className="acc-hint">{hint}</span>}
          <span className="acc-chev">▶</span>
        </button>
        <div className="acc-body">
          <div className="acc-inner"><div>{children}</div></div>
        </div>
      </div>
    );
  };

  const Row = ({ k, v }) => (
    <div style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: `1px solid var(--line-2)` }}>
      <div style={{ minWidth: 165, fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{k}</div>
      <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.6 }}>{v}</div>
    </div>
  );

  return (
    <div className="stack">
      <div className="ctx" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="h-screen">Guide Ventes Mobileo</h1>
          <p>Trame de découverte client · 8 rubriques, cliquez pour déplier</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={toutOuvrir}>Tout déplier</Btn>
          <Btn size="sm" variant="ghost" onClick={toutFermer}>Tout replier</Btn>
        </div>
      </div>

      <div className="quote">
        <p style={{ margin: 0, fontStyle: "italic" }}>
          « Je ne vous propose pas de changer pour changer. Je vous propose simplement de vérifier si votre offre est encore adaptée à votre usage. »
        </p>
      </div>

      <Card className="pad-0">
      <Section id="adn" title="L'ADN commercial attendu" hint="5 principes">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["Conseiller avant de vendre", "Le client vient d'abord pour une réparation. La proposition Mobileo doit être présentée comme un service utile, pas comme une vente forcée."],
            ["Rendre la proposition systématique", "Le potentiel vient de la régularité. Si la question n'est pas posée, aucune vente ne peut se déclencher."],
            ["Faire parler le client", "Une bonne vente commence par des questions ouvertes. Le client doit parler plus que le vendeur."],
            ["Reformuler avant d'argumenter", "La reformulation montre que l'on écoute et permet de répondre précisément à l'objection."],
            ["Rester crédible", "Lorsque l'offre actuelle est réellement meilleure, on le reconnaît. Cela renforce la confiance."],
          ].map(([t, d]) => (
            <div key={t} style={{ padding: "8px 12px", background: C.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section id="trame" title="Trame complète de A à Z" hint="8 étapes">
        {[["1. Accueil","Prendre en charge le besoin principal : réparation, diagnostic, protection."],
          ["2. Accroche",'"Je me permets de vous demander chez quel opérateur vous êtes actuellement ?"'],
          ["3. Présentation courte","Chez Repair Mobile, on répare et protège les téléphones, et on peut aussi étudier votre forfait mobile."],
          ["4. Découverte","Comprendre prix, réseau, data, Suisse, engagement, box, satisfaction."],
          ["5. Vérification","Application opérateur ou facture : prix réel + consommation data."],
          ["6. Proposition","Comparer l'offre actuelle avec une solution adaptée."],
          ["7. Objection","Reformuler, rassurer, puis répondre."],
          ["8. Closing",'"On le met en place ensemble maintenant ?" ou "Je vous prépare la solution ?"'],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="questions" title="Les bonnes questions de découverte" hint="8 questions">
        {[["Opérateur","Chez quel opérateur êtes-vous actuellement ? Depuis combien de temps ?"],
          ["Prix","Savez-vous combien vous payez réellement chaque mois ?"],
          ["Usage","Vous utilisez surtout internet, appels, partage de connexion, vidéos, GPS ?"],
          ["Data","On peut regarder ensemble votre consommation réelle ?"],
          ["Réseau","Vous captez bien partout : maison, travail, trajets, vacances ?"],
          ["Suisse","Avez-vous besoin d'utiliser votre forfait en Suisse ?"],
          ["Satisfaction","Quand vous avez un problème, êtes-vous bien accompagné ?"],
          ["Frein","Qu'est-ce qui vous retiendrait aujourd'hui de changer ?"],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="operateurs" title="Approche selon l'opérateur" hint="Orange · SFR · Free · Bouygues · Suisse">
        {[["Orange","Angle : service et proximité — \"Vous aimez le réseau Orange. En revanche, êtes-vous satisfait de l'accompagnement quand vous avez besoin d'aide ?\""],
          ["SFR","Angle : incertitude / changement — \"Avec les évolutions du marché, savez-vous comment votre offre peut évoluer demain ?\""],
          ["Free","Angle : prix ou réseau — \"Qu'est-ce qui vous a poussé à aller chez Free : le prix, la data, ou autre chose ?\""],
          ["Bouygues","Angle : adéquation de l'offre — \"Regardons si votre forfait correspond toujours à votre usage actuel.\""],
          ["Client Suisse","Angle : honnêteté — \"Si votre offre Suisse est très avantageuse, je vous le dirai.\""],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="closing" title="Argumentation et closing" hint="4 cas de figure">
        {[["Client intéressé",'"On le met en place ensemble maintenant ?"'],
          ["Client hésitant",'"Qu\'est-ce qui vous manque pour être rassuré ?"'],
          ["Client pressé",'"Je note les éléments et on reprend au moment de la restitution."'],
          ["Client refuse",'"Aucun souci. Si votre besoin évolue, on reste disponible."'],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="obj1" title="Objections — prix et opérateur" hint="8 réponses">
        {[["Je vais réfléchir","Si je comprends bien, la proposition vous intéresse mais vous voulez être rassuré avant de décider ?"],
          ["Je paie déjà peu cher","Regardons ensemble si ce prix correspond vraiment à votre usage et s'il y a des options cachées."],
          ["C'est trop cher","Qu'est-ce qui est le plus important pour vous : le prix le plus bas ou le bon équilibre prix, réseau et service ?"],
          ["Je n'utilise pas internet","Justement, il existe peut-être une offre plus adaptée à votre consommation réelle."],
          ["J'ai une offre avec ma box","Votre box n'est pas impactée. Nous parlons uniquement de votre ligne mobile."],
          ["Je suis bien chez Orange","Vous appréciez le réseau Orange. Et côté service, quand vous avez besoin d'aide, vous êtes satisfait ?"],
          ["Je préfère la boutique","C'est possible. Ici, l'avantage est que nous vous accompagnons directement et restons disponibles."],
          ["Free pour le prix","Le prix est important. Vérifions aussi si le réseau et l'usage correspondent bien à vos besoins."],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="obj2" title="Objections — peur, temps et décision" hint="8 réponses">
        {[["Je n'aime pas changer","Je comprends. Ce que je vous propose, c'est de vérifier, pas de changer sans raison."],
          ["J'ai peur que ça coupe","La portabilité est prévue pour limiter ce risque et nous vous accompagnons dans les étapes."],
          ["Je ne connais pas votre offre","C'est justement notre rôle de vous l'expliquer simplement et de comparer avec votre offre actuelle."],
          ["Je suis engagé","Regardons votre situation avant de conclure quoi que ce soit."],
          ["Demander à mon conjoint","Bien sûr. On peut préparer les éléments pour que vous puissiez lui expliquer clairement."],
          ["Je n'ai pas le temps","L'étude est rapide. Sinon, je note et on reprend à la restitution du téléphone."],
          ["Mauvaise expérience","Je comprends votre prudence. Justement, on avance étape par étape, de façon claire."],
          ["Non merci","Aucun souci. Je vous le propose car cela peut être utile, mais la décision vous appartient."],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="memo" title="Fiche mémo comptoir" hint="les 7 réflexes">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[["1","Demander",'"Chez quel opérateur êtes-vous ?"'],
            ["2","Découvrir",'"Qu\'est-ce qui compte le plus pour vous ?"'],
            ["3","Vérifier","Prix réel + consommation + engagement + Suisse."],
            ["4","Comparer","Offre actuelle vs besoin réel."],
            ["5","Reformuler",'"Si je comprends bien..."'],
            ["6","Proposer","Une solution simple et adaptée."],
            ["7","Conclure",'"On le met en place ensemble ?"'],
          ].map(([n, t, d]) => (
            <div key={n} style={{ display: "flex", gap: 10, alignItems: "center", background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.accent, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{n}</span>
              <span style={{ fontWeight: 700, color: C.navy, fontSize: 13, minWidth: 90 }}>{t}</span>
              <span style={{ fontSize: 13, color: C.text }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: "12px 14px", background: C.accent + "15", borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6, textTransform: "uppercase" }}>Indicateurs à suivre chaque semaine</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>Nombre de propositions faites · études réalisées · ventes conclues · taux de transformation · objections les plus fréquentes · meilleures phrases qui fonctionnent.</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: C.navy, fontWeight: 600, fontStyle: "italic", textAlign: "center", lineHeight: 1.6 }}>
          La performance vient de la régularité. Une proposition claire, honnête et répétée crée des opportunités sans dégrader l'expérience client.
        </div>
      </Section>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => api.restore());
  const [page, setPage] = useState("dashboard");
  const [selectedStore, setSelectedStore] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [visits, setVisits] = useState(null);
  const [history, setHistory] = useState(null);
  const [goatData, setGoatData] = useState(null);
  const [goatError, setGoatError] = useState("");
  const [vendors, setVendors] = useState(null);
  const [vendorsError, setVendorsError] = useState("");
  const [actions, setActions] = useState([]);
  const [lastLoaded, setLastLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [serverState, setServerState] = useState("checking"); // checking | waking | ok | down

  const mois = moisEnCours();

  // ─── Réveil du serveur : on sonde /api/health au démarrage ─────────────────
  const checkServer = useCallback(async () => {
    setServerState("checking");
    const hint = setTimeout(() => setServerState(s => (s === "checking" ? "waking" : s)), WAKE_HINT_MS);
    try {
      await pingHealth();
      setServerState("ok");
    } catch {
      setServerState("down");
    } finally {
      clearTimeout(hint);
    }
  }, []);

  useEffect(() => { checkServer(); }, [checkServer]);

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(""); setGoatError(""); setVendorsError("");
    const q = refresh ? "?refresh=1" : "";
    try {
      const [r, v, h, g, vd, ac] = await Promise.all([
        api.get(`/api/results${q}`),
        api.get(`/api/visits${q}`),
        api.get(`/api/history${q}`).catch(() => ({ months: [], byStore: {} })),
        api.get(`/api/goat${q}`).catch(e => { setGoatError(e.message || "lecture impossible"); return null; }),
        api.get(`/api/vendors${q}`).catch(e => { setVendorsError(e.message || "endpoint indisponible"); return null; }),
        api.get(`/api/actions${q}`).catch(() => ({ actions: [] })),
      ]);
      setResults(r);
      setVisits(v.visits);
      setHistory(h);
      setGoatData(g);
      setVendors(vd?.vendors || null);
      setActions(ac?.actions || []);
      setLastLoaded(Date.now());
      setServerState("ok");
    } catch (e) {
      if (e.code === "auth") { setUser(null); setError(""); return; }
      setError(e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  const signOut = () => {
    api.logout(); setUser(null);
    setResults(null); setVisits(null); setHistory(null); setGoatData(null);
    setVendors(null); setActions([]); setLastLoaded(null);
  };

  const openStore = (store) => { setSelectedStore(store); setPage("store"); setMenuOpen(false); };
  const goTo = (id) => {
    // L'écran magasin doit être accessible directement depuis le menu :
    // sans sélection préalable, on ouvre le premier magasin de la zone.
    if (id === "store" && !selectedStore) {
      setSelectedStore(user.role === "rz" ? STORES_ORDER[0] : user.store);
    }
    setPage(id); setMenuOpen(false);
  };

  if (!user) return <LoginScreen serverState={serverState} onRetryPing={checkServer} onLogin={(u) => { setUser(u); setPage("dashboard"); }} />;

  const nav = [
    { id: "dashboard", label: "Vue d'ensemble" },
    { id: "store",     label: "Magasins" },
    { id: "results",   label: "Résultats" },
    { id: "history",   label: "Historique" },
    { id: "goat",      label: "GOAT" },
    { id: "guide",     label: "Guide Mobileo" },
    { id: "visits",    label: "Visites" },
  ];
  const navActive = page;

  return (
    <>
      <nav className="nav">
        <img className="nav-logo" src={logoRepairMobile} alt="Repair Mobile" />
        <div>
          <div className="nav-brand">Repair<i>Mobile</i></div>
          <div className="nav-sub">Pilotage réseau</div>
        </div>

        <div className="nav-links">
          {nav.map(({ id, label }) => (
            <button key={id} className={navActive === id ? "on" : ""} onClick={() => goTo(id)}>{label}</button>
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-stamp">
            <i style={{ background: serverState === "down" ? C.bad : (loading || refreshing) ? C.warn : C.ok }} />
            {(loading || refreshing) ? "Lecture Notion…" : lastLoaded ? `Données ${stampLabel(lastLoaded)}` : "—"}
          </div>
          <div className="nav-user">
            <b>{user.name}</b>
            <span>{user.role === "rz" ? "Resp. de zone" : "Magasin"}</span>
          </div>
          <button className="nav-icon" onClick={signOut} title="Se déconnecter">⏻</button>
          <button className="nav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">{menuOpen ? "✕" : "☰"}</button>
        </div>
      </nav>

      <div className={`nav-mobile${menuOpen ? " open" : ""}`}>
        <div style={{ padding: "8px 14px 12px", borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 6 }}>
          <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 700 }}>{user.name}</div>
          <div style={{ color: C.accentB, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {user.role === "rz" ? "Responsable de zone" : "Magasin"}
          </div>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11, marginTop: 4 }}>
            {lastLoaded ? `Données ${stampLabel(lastLoaded)}` : "—"}
          </div>
        </div>
        {nav.map(({ id, label }) => (
          <button key={id} className={navActive === id ? "on" : ""} onClick={() => goTo(id)}>{label}</button>
        ))}
      </div>

      <main>
        {page === "guide" ? (
          <GuidePage />
        ) : (
          <>
            {serverState !== "ok" && (
              <div style={{ marginBottom: 16 }}><WakeBanner state={serverState} onRetry={checkServer} /></div>
            )}
            {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={() => loadAll()} /></div>}
            {loading ? (
              <Spinner label={serverState === "waking" ? "Réveil du serveur, patiente une minute…" : "Lecture des données Notion…"} />
            ) : (
              <>
                {page === "dashboard" && results && <Dashboard user={user} data={results} onOpenStore={openStore} />}
                {page === "results" && results && (
                  <ResultsPage user={user} data={results} vendors={vendors} vendorsError={vendorsError} mois={mois}
                    onRefresh={() => loadAll(true)} refreshing={refreshing} onOpenStore={openStore} />
                )}
                {page === "store" && results && selectedStore && (
                  <StorePage user={user} store={selectedStore} data={results} vendors={vendors} actions={actions}
                    mois={mois} onBack={() => setPage("dashboard")} onSelectStore={setSelectedStore} />
                )}
                {page === "history" && <HistoryPage user={user} history={history} />}
                {page === "goat"    && <GoatPage user={user} goatData={goatData} goatError={goatError} lastLoaded={lastLoaded} onRefresh={() => loadAll(true)} refreshing={refreshing} />}
                {page === "visits"  && <VisitsPage user={user} visits={visits} />}
                {!results && !error && <Spinner />}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
