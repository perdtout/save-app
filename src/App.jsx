import { useState, useEffect, useCallback } from "react";
import logoRepairMobile from "./RepairMobile.png";

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API_URL = "https://save-backend-cn9b.onrender.com";

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

const GOAT_DATA_FALLBACK = {
  weekly: {
    label: "Semaine du 09 au 13 juin 2026",
    scores: [
      { name: "Mathis",        store: "Pontarlier",       total: 80.0, isSolo: false, breakdown: { accessoires: 25, gp: 25, mobileo: 10, atm: 20 } },
      { name: "Jérôme",        store: "Lons-le-Saunier",  total: 80.0, isSolo: false, breakdown: { accessoires: 25, gp: 25, mobileo: 10, atm: 20 } },
      { name: "Jean-Baptiste", store: "Chalon-sur-Saône", total: 55.0, isSolo: true,  breakdown: { accessoires: 22.8, gp: 23.9, mobileo: 0,  atm: 0  } },
      { name: "Jules",         store: "Dijon",            total: 50.6, isSolo: false, breakdown: { accessoires: 21.9, gp: 19.2, mobileo: 5,  atm: 4.5 } },
      { name: "Nassim",        store: "Lons-le-Saunier",  total: 50.1, isSolo: false, breakdown: { accessoires: 20.1, gp: 21,   mobileo: 5,  atm: 4   } },
      { name: "Narcisse",      store: "Pontarlier",       total: 46.2, isSolo: false, breakdown: { accessoires: 22.4, gp: 19,   mobileo: 0,  atm: 4.8 } },
      { name: "Samy",          store: "Besançon",         total: 43.9, isSolo: true,  breakdown: { accessoires: 14.9, gp: 25,   mobileo: 0,  atm: 0   } },
      { name: "Bilhal",        store: "Dijon",            total: 35.8, isSolo: false, breakdown: { accessoires: 18,   gp: 14.2, mobileo: 0,  atm: 3.6 } },
    ],
  },
  monthly: {
    label: "Mai 2026",
    scores: [
      { name: "Mathis",        store: "Pontarlier",       total: 63.0, isSolo: false, breakdown: { accessoires: 25,   gp: 25,   mobileo: 10, atm: 3   } },
      { name: "Samy",          store: "Besançon",         total: 60.5, isSolo: true,  breakdown: { accessoires: 27.3, gp: 25,   mobileo: 8.3,atm: 0   } },
      { name: "Jean-Baptiste", store: "Chalon-sur-Saône", total: 57.8, isSolo: true,  breakdown: { accessoires: 25,   gp: 20.5, mobileo: 5,  atm: 0   } },
      { name: "Jérôme",        store: "Lons-le-Saunier",  total: 56.0, isSolo: false, breakdown: { accessoires: 25,   gp: 25,   mobileo: 0,  atm: 6   } },
      { name: "Narcisse",      store: "Pontarlier",       total: 55.0, isSolo: false, breakdown: { accessoires: 25,   gp: 25,   mobileo: 5,  atm: 0   } },
      { name: "Nassim",        store: "Lons-le-Saunier",  total: 48.0, isSolo: false, breakdown: { accessoires: 23,   gp: 25,   mobileo: 0,  atm: 0   } },
      { name: "Jules",         store: "Dijon",            total: 46.4, isSolo: false, breakdown: { accessoires: 25,   gp: 13.1, mobileo: 0,  atm: 5   } },
      { name: "Bilhal",        store: "Dijon",            total: 45.4, isSolo: false, breakdown: { accessoires: 22.2, gp: 18.6, mobileo: 0,  atm: 0   } },
    ],
  },
  titlesHistory: [
    { type: "month", label: "Mai 2026",       winner: "Jérôme",   score: 86.0  },
    { type: "month", label: "Avril 2026",     winner: "Jérôme",   score: 100.0 },
    { type: "month", label: "Mars 2026",      winner: "Jérôme",   score: 95.0  },
    { type: "month", label: "Février 2026",   winner: "Nassim",   score: 89.1  },
    { type: "month", label: "Janvier 2026",   winner: "Jérôme",   score: 95.0  },
    { type: "month", label: "Décembre 2025",  winner: "Jérôme",   score: 84.0  },
    { type: "month", label: "Novembre 2025",  winner: "Jérôme",   score: 82.1  },
    { type: "month", label: "Octobre 2025",   winner: "Jérôme",   score: 80.0  },
    { type: "month", label: "Septembre 2025", winner: "Jérôme",   score: 100.0 },
    { type: "month", label: "Août 2025",      winner: "Nassim",   score: 65.8  },
    { type: "month", label: "Juillet 2025",   winner: "Jérôme",   score: 86.3  },
    { type: "month", label: "Juin 2025",      winner: "Jérôme",   score: 80.8  },
    { type: "week",  label: "09–13 juin 2026 (co-MVP)", winner: "Mathis",  score: 80.0 },
    { type: "week",  label: "09–13 juin 2026 (co-MVP)", winner: "Jérôme",  score: 80.0 },
  ],
};

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
const eur = (v) => v == null ? "—" : `${v.toLocaleString("fr-FR")} €`;

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
    return data.user;
  },
  async get(path) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur ${res.status}`);
    }
    return res.json();
  },
};

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(13,31,60,0.07)", border: `1px solid ${C.gray50}`,
      borderLeft: accent ? `4px solid ${accent}` : undefined, ...style,
    }}>{children}</div>
  );
}

function Gauge({ value, max = 100, target, color }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  const tpct = Math.min(98, (target / max) * 100);
  return (
    <div style={{ position: "relative", height: 8, background: C.gray50, borderRadius: 4, minWidth: 80 }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s" }} />
      <div style={{ position: "absolute", left: `${tpct}%`, top: -3, width: 2, height: 14, background: C.navy, opacity: 0.25, borderRadius: 1 }} />
    </div>
  );
}

function SectionHead({ children }) {
  return <h3 style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.gray400 }}>{children}</h3>;
}

function Btn({ children, onClick, variant = "primary", size = "md", style = {} }) {
  const s = { sm: { padding: "5px 12px", fontSize: 12 }, md: { padding: "9px 16px", fontSize: 13 }, lg: { padding: "11px 22px", fontSize: 14 } };
  const v = {
    primary: { background: C.accent, color: C.white },
    secondary: { background: C.gray50, color: C.navy },
    navy: { background: C.navy, color: C.white },
  };
  return <button onClick={onClick} style={{ cursor: "pointer", border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, ...s[size], ...v[variant], ...style }}>{children}</button>;
}

function Spinner({ label = "Chargement…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.gray50}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 13, color: C.gray400 }}>{label}</span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <Card accent={C.bad}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>Connexion au serveur impossible</div>
          <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{message}. Vérifie que le backend tourne sur {API_URL}.</div>
        </div>
        {onRetry && <Btn size="sm" variant="secondary" onClick={onRetry}>Réessayer</Btn>}
      </div>
    </Card>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
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
        <div style={{ marginTop: 16, padding: 10, background: C.bg, borderRadius: 8, fontSize: 11, color: C.gray400, lineHeight: 1.6 }}>
          <strong style={{ color: C.gray600 }}>RZ :</strong> thomas.desternes / rz2024<br />
          <strong style={{ color: C.gray600 }}>Magasins :</strong> dijon · lons · pontarlier · chalon · besancon
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ user, data }) {
  const stores = user.role === "rz" ? STORES_ORDER : [user.store];
  const d = data?.page1, d2 = data?.page2;

  const tz = {
    margeTotal: Object.values(d?.accessoires || {}).reduce((s, v) => s + (v.margeTotal || 0), 0),
    margeAcc:   Object.values(d?.accessoires || {}).reduce((s, v) => s + (v.margeAcc   || 0), 0),
    margeGP:    Object.values(d?.gp          || {}).reduce((s, v) => s + (v.margeGP    || 0), 0),
    occasion:   Object.values(d?.occasion    || {}).reduce((s, v) => s + (v.volume     || 0), 0),
    mobileo:    Object.values(d2?.mobileo    || {}).reduce((s, v) => s + (v.total      || 0), 0),
    atm:        Object.values(d2?.atm        || {}).reduce((s, v) => s + (v.total      || 0), 0),
  };

  const computeSynthese = () => {
    const forts = [], faibles = [];
    for (const store of stores) {
      const acc = d?.accessoires?.[store], gp = d?.gp?.[store], occ = d?.occasion?.[store];
      const mob = d2?.mobileo?.[store], atm = d2?.atm?.[store];
      if (acc?.ratio != null) {
        if (acc.ratio >= 25) forts.push(`${store} — Accessoires ${acc.ratio}%`);
        else if (acc.ratio < 20) faibles.push(`${store} — Accessoires ${acc.ratio}% (obj. 25%)`);
      }
      if (gp?.ratio != null) {
        if (gp.ratio >= 20) forts.push(`${store} — GP ${gp.ratio}%`);
        else if (gp.ratio < 18) faibles.push(`${store} — GP ${gp.ratio}% (obj. 20%)`);
      }
      if (occ?.volume != null && occ?.objectif) {
        const pct = Math.round((occ.volume / occ.objectif) * 100);
        if (pct >= 100) forts.push(`${store} — Occasion ${occ.volume}/${occ.objectif}`);
        else if (pct < 40) faibles.push(`${store} — Occasion ${occ.volume}/${occ.objectif}`);
      }
      if (mob?.total != null) {
        if (mob.total >= 10) forts.push(`${store} — Mobileo ${mob.total} contrats`);
        else if (mob.total === 0) faibles.push(`${store} — Mobileo : aucun contrat`);
      }
      if (atm?.ratio != null && atm?.mobOcc > 0) {
        if (atm.ratio >= 10) forts.push(`${store} — ATM ${atm.ratio}%`);
        else if (atm.ratio === 0) faibles.push(`${store} — ATM 0% (obj. 10%)`);
      }
    }
    return { forts, faibles };
  };
  const synthese = computeSynthese();
  const faits = (data?.faitsMarquants && data.faitsMarquants.length)
    ? data.faitsMarquants
    : (data?.syntheseRZ ? [data.syntheseRZ] : []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Vue d'ensemble</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>{data?.period} · données Notion du {data?.updated}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={NOTION_PAGE1_URL} target="_blank" rel="noopener noreferrer"><Btn size="sm" variant="secondary">📄 Analyse détaillée — Page 1</Btn></a>
          <a href={NOTION_PAGE2_URL} target="_blank" rel="noopener noreferrer"><Btn size="sm" variant="secondary">📄 Analyse détaillée — Page 2</Btn></a>
        </div>
      </div>

      {user.role === "rz" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {[
            { label: "Marge totale zone", val: eur(tz.margeTotal), icon: "💰" },
            { label: "Ratio Accessoires", val: tz.margeTotal ? `${((tz.margeAcc / tz.margeTotal) * 100).toFixed(1)}%` : "—", icon: "🛒" },
            { label: "Ratio GP zone",     val: tz.margeTotal ? `${((tz.margeGP  / tz.margeTotal) * 100).toFixed(1)}%` : "—", icon: "🛡️" },
            { label: "Mobiles Occasion",  val: `${tz.occasion} unités`, icon: "📱" },
            { label: "Forfaits Mobileo",  val: `${tz.mobileo} contrats`, icon: "📶" },
            { label: "Contrats ATM",      val: `${tz.atm} sur ${tz.occasion} occ.`, icon: "🔒" },
          ].map(({ label, val, icon }) => (
            <Card key={label} style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{val}</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{label}</div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card style={{ borderTop: `3px solid ${C.ok}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>✓ Points forts</div>
          {synthese.forts.length === 0
            ? <div style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>Aucun objectif pleinement atteint ce mois-ci.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {synthese.forts.map((f, i) => <div key={i} style={{ fontSize: 12, color: C.text, display: "flex", gap: 7, lineHeight: 1.5 }}><span style={{ color: C.ok }}>●</span>{f}</div>)}
              </div>
          }
        </Card>
        <Card style={{ borderTop: `3px solid ${C.bad}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.bad, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>⚠ Points à travailler</div>
          {synthese.faibles.length === 0
            ? <div style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>Aucun point critique. Bon mois !</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {synthese.faibles.map((f, i) => <div key={i} style={{ fontSize: 12, color: C.text, display: "flex", gap: 7, lineHeight: 1.5 }}><span style={{ color: C.bad }}>●</span>{f}</div>)}
              </div>
          }
        </Card>
      </div>

      {faits.length > 0 && (
        <Card accent={C.accent}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>⭐ Ce que je retiens de cette journée</div>
          {faits.map((f, i) => <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0", fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{f}</p>)}
        </Card>
      )}

      {(() => {
        const retours = [];
        for (const store of stores) {
          const items = [d?.analysis?.accessoires?.[store], d?.analysis?.gp?.[store], d2?.analysis?.mobileo?.[store], d2?.analysis?.atm?.[store]].filter(Boolean);
          if (items.length) retours.push({ store, items });
        }
        if (retours.length === 0) return null;
        return (
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>💬 Mes retours par magasin</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {retours.map(({ store, items }) => (
                <div key={store} style={{ padding: "10px 12px", background: C.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{store}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {items.map((t, i) => <div key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.55, display: "flex", gap: 6 }}><span style={{ color: C.accent }}>•</span>{t}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
        {stores.map(store => {
          const acc = d?.accessoires?.[store], gp = d?.gp?.[store], occ = d?.occasion?.[store];
          const mob = d2?.mobileo?.[store], atm = d2?.atm?.[store];
          const kpis = [
            { k: "Acc.", v: acc?.ratio, suf: "%", s: acc?.status },
            { k: "GP",   v: gp?.ratio,  suf: "%", s: gp?.status },
            { k: "Occ.", v: occ?.volume, suf: "", s: occ?.volume >= occ?.objectif ? "ok" : "bad" },
            { k: "Mob.", v: mob?.total,  suf: "", s: mob?.total >= 10 ? "ok" : "bad" },
            { k: "ATM",  v: atm?.ratio,  suf: "%", s: atm?.status },
          ];
          const okC = kpis.filter(x => x.s === "ok").length;
          const tc = okC >= 4 ? C.ok : okC >= 2 ? C.warn : C.bad;
          return (
            <Card key={store} style={{ borderTop: `3px solid ${tc}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.navy, marginBottom: 6 }}>{store}</div>
              <div style={{ fontSize: 11, color: tc, fontWeight: 700, marginBottom: 10 }}>{okC}/5 objectifs atteints</div>
              {kpis.map(({ k, v, suf, s }) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: C.gray400 }}>{k}</span>
                  <span style={{ color: v == null ? C.gray200 : statusC(s), fontWeight: 700 }}>{v == null ? "—" : `${v}${suf}`}</span>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYSIS LIST ─────────────────────────────────────────────────────────────
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
function ResultsPage({ user, data, onRefresh, refreshing }) {
  const isRZ = user.role === "rz";
  const [filterStore, setFilterStore] = useState("all");
  const allStores = isRZ ? STORES_ORDER : [user.store];
  const stores = (isRZ && filterStore !== "all") ? [filterStore] : allStores;
  const d = data?.page1, d2 = data?.page2;

  const TH = ({ children, a = "left" }) => <th style={{ textAlign: a, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: "uppercase", borderBottom: `2px solid ${C.gray50}`, whiteSpace: "nowrap" }}>{children}</th>;
  const TD = ({ children, a = "left", b }) => <td style={{ padding: "9px 10px", fontSize: 13, textAlign: a, fontWeight: b ? 700 : 400 }}>{children}</td>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Résultats commerciaux</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>{data?.period} · données du {data?.updated}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isRZ && (
            <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
              style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "inherit", color: C.navy, background: C.white, cursor: "pointer" }}>
              <option value="all">🏢 Tous les magasins</option>
              {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {isRZ && <Btn size="sm" variant="secondary" onClick={onRefresh} style={{ opacity: refreshing ? 0.6 : 1 }}>{refreshing ? "⏳ Synchro…" : "🔄 Actualiser"}</Btn>}
        </div>
      </div>

      {/* ACCESSOIRES */}
      <Card>
        <SectionHead>🛒 Ratio Accessoires — Objectif ≥ 25%</SectionHead>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Magasin</TH><TH a="right">Marge Acc.</TH><TH a="right">Marge Tot.</TH><TH a="right">Ratio</TH><TH a="center">Tend.</TH><TH>Progression</TH></tr></thead>
            <tbody>
              {stores.map((s, i) => { const a = d?.accessoires?.[s]; if (!a) return null;
                return <tr key={s} style={{ background: i % 2 ? C.bg : C.white }}>
                  <TD b>{s}</TD><TD a="right">{eur(a.margeAcc)}</TD><TD a="right">{eur(a.margeTotal)}</TD>
                  <TD a="right"><span style={{ fontWeight: 800, color: statusC(a.status) }}>{a.ratio}%</span></TD>
                  <TD a="center">{trendLabel(a.trend)}</TD><TD><Gauge value={a.ratio} max={40} target={25} color={statusC(a.status)} /></TD>
                </tr>; })}
            </tbody>
          </table>
        </div>
        <AnalysisList isRZ={isRZ} stores={stores} store={user.store} analysisMap={d?.analysis?.accessoires} />
      </Card>

      {/* GP */}
      <Card>
        <SectionHead>🛡️ Ratio Garantie Plus — Objectif ≥ 20%</SectionHead>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Magasin</TH><TH a="right">Marge GP</TH><TH a="right">Marge Tot.</TH><TH a="right">Ratio</TH><TH a="center">Tend.</TH><TH>Progression</TH></tr></thead>
            <tbody>
              {stores.map((s, i) => { const a = d?.gp?.[s]; if (!a) return null;
                return <tr key={s} style={{ background: i % 2 ? C.bg : C.white }}>
                  <TD b>{s}</TD><TD a="right">{eur(a.margeGP)}</TD><TD a="right">{eur(a.margeTotal)}</TD>
                  <TD a="right"><span style={{ fontWeight: 800, color: statusC(a.status) }}>{a.ratio}%</span></TD>
                  <TD a="center">{trendLabel(a.trend)}</TD><TD><Gauge value={a.ratio} max={35} target={20} color={statusC(a.status)} /></TD>
                </tr>; })}
            </tbody>
          </table>
        </div>
        <AnalysisList isRZ={isRZ} stores={stores} store={user.store} analysisMap={d?.analysis?.gp} />
      </Card>

      {/* OCCASION */}
      <Card>
        <SectionHead>📱 Mobiles d'Occasion — Objectifs différenciés</SectionHead>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Magasin</TH><TH a="right">Volume</TH><TH a="right">Marge</TH><TH a="right">Objectif</TH><TH a="right">%</TH><TH a="center">Tend.</TH><TH>Progression</TH></tr></thead>
            <tbody>
              {stores.map((s, i) => { const a = d?.occasion?.[s]; if (!a) return null;
                const pct = a.objectif ? Math.round((a.volume / a.objectif) * 100) : 0;
                const col = pct >= 100 ? C.ok : pct >= 60 ? C.warn : C.bad;
                return <tr key={s} style={{ background: i % 2 ? C.bg : C.white }}>
                  <TD b>{s}</TD><TD a="right"><span style={{ fontWeight: 800, color: col, fontSize: 15 }}>{a.volume}</span></TD>
                  <TD a="right">{eur(a.marge)}</TD><TD a="right" b>{a.objectif}</TD>
                  <TD a="right"><span style={{ fontWeight: 700, color: col }}>{pct}%</span></TD>
                  <TD a="center">{trendLabel(a.trend)}</TD><TD><Gauge value={a.volume} max={a.objectif} target={a.objectif} color={col} /></TD>
                </tr>; })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MOBILEO */}
      <Card>
        <SectionHead>📶 Forfaits Mobileo — Objectif 10-15 / magasin</SectionHead>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Magasin</TH><TH>Vendeurs</TH><TH a="right">Total</TH><TH a="center">Tend.</TH><TH>Progression</TH></tr></thead>
            <tbody>
              {stores.map((s, i) => { const a = d2?.mobileo?.[s]; if (!a) return null;
                const col = a.total >= 10 ? C.ok : a.total >= 6 ? C.warn : C.bad;
                return <tr key={s} style={{ background: i % 2 ? C.bg : C.white }}>
                  <TD b>{s}</TD>
                  <TD><div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {Object.entries(a.vendeurs || {}).map(([v, n]) => <span key={v} style={{ fontSize: 12 }}>{v} : <strong style={{ color: n > 0 ? C.ok : C.gray200 }}>{n}</strong></span>)}
                  </div></TD>
                  <TD a="right"><span style={{ fontWeight: 800, color: col, fontSize: 16 }}>{a.total}</span></TD>
                  <TD a="center">{trendLabel(a.trend)}</TD><TD><Gauge value={a.total} max={15} target={10} color={col} /></TD>
                </tr>; })}
            </tbody>
          </table>
        </div>
        <AnalysisList isRZ={isRZ} stores={stores} store={user.store} analysisMap={d2?.analysis?.mobileo} />
      </Card>

      {/* ATM */}
      <Card>
        <SectionHead>🔒 Assurances ATM — Objectif ≥ 10% des occ.</SectionHead>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Magasin</TH><TH a="right">ATM</TH><TH a="right">Mob. Occ.</TH><TH a="right">Ratio</TH><TH a="center">Tend.</TH><TH>Progression</TH></tr></thead>
            <tbody>
              {stores.map((s, i) => { const a = d2?.atm?.[s]; if (!a) return null;
                const col = a.status === "ok" ? C.ok : a.status === "low" ? C.gray400 : C.bad;
                return <tr key={s} style={{ background: i % 2 ? C.bg : C.white }}>
                  <TD b>{s}</TD><TD a="right"><span style={{ fontWeight: 800, color: a.total > 0 ? C.ok : C.bad }}>{a.total}</span></TD>
                  <TD a="right">{a.mobOcc}</TD><TD a="right"><span style={{ fontWeight: 800, color: col }}>{a.ratio}%</span></TD>
                  <TD a="center">{trendLabel(a.trend)}</TD><TD><Gauge value={a.ratio} max={25} target={10} color={col} /></TD>
                </tr>; })}
            </tbody>
          </table>
        </div>
        <AnalysisList isRZ={isRZ} stores={stores} store={user.store} analysisMap={d2?.analysis?.atm} />
      </Card>
    </div>
  );
}

// ─── VISITS PAGE ──────────────────────────────────────────────────────────────
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

  const KPI_COLS = [
    { key: "margeTotale", label: "Marge €",    fmt: v => v != null ? `${Math.round(v).toLocaleString("fr-FR")} €` : "—" },
    { key: "acc",         label: "Acc. %",      fmt: v => v != null ? `${v}%` : "—" },
    { key: "gp",          label: "GP %",        fmt: v => v != null ? `${v}%` : "—" },
    { key: "occ",         label: "Mob. Occ.",   fmt: v => v != null ? `${v}` : "—" },
    { key: "mobileo",     label: "Mobileo",     fmt: v => v != null ? `${v}` : "—" },
  ];

  // Accès simplifié à une valeur depuis byStoreMois
  const getVal = (store, mois, key) => {
    const row = byStoreMois[store]?.[mois];
    if (!row) return null;
    if (key === "margeTotale") return row.margeTotale ?? null;
    if (key === "acc")         return row.accessoires ?? null;
    if (key === "gp")          return row.gp ?? null;
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
function GoatKeyframes() {
  return (
    <style>{`
      @keyframes goatGrow    { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes goatRise    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes goatPop     { 0% { transform: scale(0.85); opacity: 0; } 70% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes goatFlicker { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      .goat-bar-fill  { animation: goatGrow 0.7s cubic-bezier(.2,.9,.3,1) both; transform-origin: left; }
      .goat-card-in   { animation: goatRise 0.45s ease both; }
      .goat-pop       { animation: goatPop 0.5s cubic-bezier(.34,1.56,.64,1) both; }
      .goat-fire      { animation: goatFlicker 1.4s ease-in-out infinite; }
      .goat-detail-desktop { display: none; }
      @media (min-width: 600px) { .goat-detail-desktop { display: flex !important; } }
      @media (prefers-reduced-motion: reduce) {
        .goat-bar-fill, .goat-card-in, .goat-pop, .goat-fire { animation: none !important; }
      }
    `}</style>
  );
}

function GoatScoreBar({ label, value, max, color, delay = 0 }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.gray400, marginBottom: 3, fontWeight: 600 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 800, color: C.navy }}>{(value || 0).toFixed(1)}<span style={{ color: C.gray400, fontWeight: 600 }}>/{max}</span></span>
      </div>
      <div style={{ height: 6, background: C.gray50, borderRadius: 4, overflow: "hidden" }}>
        <div className="goat-bar-fill" style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 4, animationDelay: `${delay}ms` }} />
      </div>
    </div>
  );
}

function GoatMedal({ rank, size = 30 }) {
  const cfg = rank === 1 ? { grad: `linear-gradient(145deg, ${GOAT_GOLD}, #C98A00)`,   ring: GOAT_GOLD,   label: "🥇" }
            : rank === 2 ? { grad: `linear-gradient(145deg, ${GOAT_SILVER}, #8B8F96)`, ring: GOAT_SILVER, label: "🥈" }
            : rank === 3 ? { grad: `linear-gradient(145deg, ${GOAT_BRONZE}, #8C5524)`, ring: GOAT_BRONZE, label: "🥉" }
            :              { grad: C.gray50, ring: C.gray200, label: null };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: cfg.grad,
      color: rank <= 3 ? C.white : C.gray400,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: size * 0.4, flexShrink: 0,
      boxShadow: rank <= 3 ? `0 3px 8px ${cfg.ring}66` : "none",
      border: rank > 3 ? `1.5px solid ${C.gray200}` : "none",
    }}>
      {cfg.label || rank}
    </div>
  );
}

function GoatPodium({ top3 }) {
  if (!top3 || top3.length < 1) return null;
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = top3.length >= 3 ? [128, 168, 100] : top3.map((_, i) => 168 - i * 30);
  const podiumColors = [GOAT_SILVER, GOAT_GOLD, GOAT_BRONZE];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, padding: "18px 8px 0" }}>
      {order.map((v, i) => {
        const rank = top3.length >= 3 ? [2, 1, 3][i] : i + 1;
        const h = heights[i];
        const col = top3.length >= 3 ? podiumColors[i] : podiumColors[rank - 1];
        return (
          <div key={v.name} className="goat-pop" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 96, animationDelay: `${i * 110}ms` }}>
            <GoatMedal rank={rank} size={36} />
            <div style={{ marginTop: 8, fontWeight: 800, fontSize: 13, color: C.white, textAlign: "center", lineHeight: 1.2 }}>{v.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{v.store}</div>
            <div style={{
              width: "100%", height: h, borderRadius: "10px 10px 4px 4px",
              background: `linear-gradient(180deg, ${col}, ${col}99)`,
              display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10,
              boxShadow: `0 4px 14px ${col}55`,
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.white }}>{v.total}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoatRankRow({ v, rank, index }) {
  const isLeader = rank === 1;
  return (
    <div className="goat-card-in" style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      background: isLeader ? `linear-gradient(90deg, ${GOAT_GOLD}1c, transparent)` : (index % 2 === 0 ? C.white : C.bg),
      borderRadius: 10, border: isLeader ? `1.5px solid ${GOAT_GOLD}66` : "1px solid transparent",
      animationDelay: `${index * 60}ms`,
    }}>
      <GoatMedal rank={rank} />
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.navy, display: "flex", alignItems: "center", gap: 6 }}>
          {v.name}
          {v.isSolo && <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, background: C.accent + "18", padding: "1px 6px", borderRadius: 8 }}>SOLO +10%</span>}
        </div>
        <div style={{ fontSize: 11, color: C.gray400 }}>{v.store}</div>
      </div>
      <div style={{ width: 168, minWidth: 150, flexDirection: "column" }} className="goat-detail-desktop">
        <GoatScoreBar label="Acc."    value={v.breakdown?.accessoires} max={25} color={C.accent}  delay={index * 60} />
        <GoatScoreBar label="GP"      value={v.breakdown?.gp}          max={25} color={C.accentB} delay={index * 60 + 40} />
        <GoatScoreBar label="Mobileo" value={v.breakdown?.mobileo}     max={30} color={C.ok}      delay={index * 60 + 80} />
        <GoatScoreBar label="ATM"     value={v.breakdown?.atm}         max={20} color={C.warn}    delay={index * 60 + 120} />
      </div>
      <div style={{ textAlign: "center", minWidth: 54 }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: isLeader ? GOAT_GOLD : C.navy }}>{v.total}</div>
        <div style={{ fontSize: 9, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.04em" }}>/ 100</div>
      </div>
    </div>
  );
}

function GoatRankingPanel({ title, subtitle, scores, icon }) {
  const sorted = [...(scores || [])].sort((a, b) => b.total - a.total);
  const top3 = sorted.slice(0, 3), rest = sorted.slice(3);
  return (
    <Card style={{ overflow: "hidden", padding: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, padding: "16px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.white }}>{title}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{subtitle}</div>
          </div>
        </div>
        {sorted.length > 0 ? <GoatPodium top3={top3} /> : (
          <div style={{ padding: "20px 0 18px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Pas encore de données pour cette période.</div>
        )}
      </div>
      {sorted.length > 0 && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {top3.map((v, i) => <GoatRankRow key={v.name} v={v} rank={i + 1} index={i} />)}
          {rest.map((v, i) => <GoatRankRow key={v.name} v={v} rank={i + 4} index={i + 3} />)}
        </div>
      )}
    </Card>
  );
}

function GoatPage({ user, goatData, onRefresh, refreshing }) {
  const isRZ = user.role === "rz";
  const data = goatData || GOAT_DATA_FALLBACK;
  const seasonPoints = computeGoatSeasonPoints(data.titlesHistory);
  const goat = seasonPoints[0];
  const streak = computeCurrentStreak(data.titlesHistory);
  const showStreak = streak && streak.count >= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <GoatKeyframes />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.navy, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🐐</span> GOAT — Classement vendeurs
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: C.gray400 }}>
            Mix produit : Accessoires (25) · GP (25) · Mobileo (30) · ATM (20) — score /100, plafonné par objectif
          </p>
        </div>
        {isRZ && <Btn size="sm" variant="secondary" onClick={onRefresh} style={{ opacity: refreshing ? 0.6 : 1 }}>{refreshing ? "⏳ Synchro…" : "🔄 Actualiser depuis Notion"}</Btn>}
      </div>

      {/* Hero — GOAT de la saison */}
      <div className="goat-pop" style={{
        position: "relative", overflow: "hidden", borderRadius: 16,
        background: `radial-gradient(circle at 18% 20%, ${C.accent}33, transparent 55%), linear-gradient(135deg, ${C.navy}, #1c1c1c)`,
        padding: "22px 22px", boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(145deg, ${GOAT_GOLD}, #C98A00)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            boxShadow: `0 6px 18px ${GOAT_GOLD}55`,
          }}>🐐</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: C.accentB, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>GOAT de la saison · Juin 2025 – Juin 2026</div>
            {goat ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.white, marginTop: 4 }}>{goat.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{goat.store}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {goat.months > 0 && <span style={{ fontSize: 11, color: GOAT_GOLD, fontWeight: 700 }}>🏆 {goat.months} MVP mensuel{goat.months > 1 ? "s" : ""}</span>}
                  {goat.weeks > 0  && <span style={{ fontSize: 11, color: C.accentB, fontWeight: 700 }}>⭐ {goat.weeks} MVP hebdo{goat.weeks > 1 ? "s" : ""}</span>}
                  {showStreak && <span className="goat-fire" style={{ fontSize: 11, color: "#FF4D2E", fontWeight: 700 }}>🔥 {streak.count} mois de suite</span>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>Pas encore de titre décerné.</div>
            )}
          </div>
          {goat && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: GOAT_GOLD, lineHeight: 1 }}>{goat.points}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>points saison</div>
            </div>
          )}
        </div>
      </div>

      {/* Classement saison */}
      <Card>
        <SectionHead>🏁 Classement saison — points cumulés (1 pt/MVP semaine · 3 pts/MVP mois)</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {seasonPoints.length === 0 && <div style={{ fontSize: 12, color: C.gray400 }}>Pas encore de titres attribués cette saison.</div>}
          {seasonPoints.map((p, i) => (
            <div key={p.name} className="goat-card-in" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", background: i === 0 ? `linear-gradient(90deg, ${GOAT_GOLD}1c, transparent)` : C.bg, borderRadius: 9, animationDelay: `${i * 50}ms` }}>
              <GoatMedal rank={i + 1} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.gray400 }}>{p.store}</div>
              </div>
              <div style={{ fontSize: 11, color: C.gray400, textAlign: "right", minWidth: 120 }}>
                {p.months > 0 && <span>🏆 {p.months} mois</span>}{p.months > 0 && p.weeks > 0 && " · "}{p.weeks > 0 && <span>⭐ {p.weeks} sem.</span>}
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: i === 0 ? GOAT_GOLD : C.navy, minWidth: 38, textAlign: "right" }}>{p.points}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* MVP du mois */}
      <GoatRankingPanel title="Meilleur vendeur du mois" subtitle={data.monthly?.label || "—"} scores={data.monthly?.scores} icon="🏆" />

      {/* MVP de la semaine */}
      <GoatRankingPanel title="MVP de la semaine" subtitle={data.weekly?.label || "—"} scores={data.weekly?.scores} icon="⭐" />

      {/* Historique des titres */}
      <Card>
        <SectionHead>📜 Historique des titres — saison en cours</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(data.titlesHistory || []).length === 0 && <div style={{ fontSize: 12, color: C.gray400 }}>Aucun titre décerné pour l'instant.</div>}
          {(data.titlesHistory || []).map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "8px 12px", background: i % 2 === 0 ? C.white : C.bg, borderRadius: 7 }}>
              <span style={{ color: C.gray400 }}>{t.type === "month" ? "🏆 Mois" : "⭐ Semaine"} — {t.label}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: C.navy }}>{t.winner}</span>
                <span style={{ fontSize: 11, color: C.gray400 }}>{t.score}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card accent={C.accent}>
        <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.7 }}>
          <strong style={{ color: C.navy }}>ℹ️ Méthode de calcul :</strong> chaque KPI est plafonné à 100% de son objectif individuel. L'objectif Mobileo individuel = objectif magasin (12, milieu de la fourchette 10–15) ÷ nombre de vendeurs actifs. Les magasins solo (Chalon, Besançon) reçoivent un bonus de +10% sur le score final car le vendeur porte l'intégralité de l'activité seul.
        </div>
      </Card>
    </div>
  );
}

// ─── GUIDE MOBILEO ────────────────────────────────────────────────────────────
function GuidePage() {
  const Section = ({ id, icon, title, children }) => (
    <Card style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.navy }}>{title}</h3>
      </div>
      {children}
    </Card>
  );
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.gray50}` }}>
      <div style={{ minWidth: 160, fontSize: 12, fontWeight: 700, color: C.navy, flexShrink: 0 }}>{k}</div>
      <div style={{ fontSize: 12, color: C.gray600, lineHeight: 1.6 }}>{v}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>📘 Guide Ventes Mobileo</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>Trame de découverte client — offres mobiles</p>
      </div>
      <Card accent={C.accent}>
        <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>
          "Je ne vous propose pas de changer pour changer. Je vous propose simplement de vérifier si votre offre est encore adaptée à votre usage."
        </p>
      </Card>
      <Section id="adn" icon="🎯" title="1. L'ADN commercial attendu">
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
      <Section id="trame" icon="📋" title="2. Trame complète de A à Z">
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
      <Section id="questions" icon="❓" title="3. Les bonnes questions de découverte">
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
      <Section id="operateurs" icon="📡" title="4. Approche selon l'opérateur">
        {[["Orange","Angle : service et proximité — \"Vous aimez le réseau Orange. En revanche, êtes-vous satisfait de l'accompagnement quand vous avez besoin d'aide ?\""],
          ["SFR","Angle : incertitude / changement — \"Avec les évolutions du marché, savez-vous comment votre offre peut évoluer demain ?\""],
          ["Free","Angle : prix ou réseau — \"Qu'est-ce qui vous a poussé à aller chez Free : le prix, la data, ou autre chose ?\""],
          ["Bouygues","Angle : adéquation de l'offre — \"Regardons si votre forfait correspond toujours à votre usage actuel.\""],
          ["Client Suisse","Angle : honnêteté — \"Si votre offre Suisse est très avantageuse, je vous le dirai.\""],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="closing" icon="✅" title="5. Argumentation et closing">
        {[["Client intéressé",'"On le met en place ensemble maintenant ?"'],
          ["Client hésitant",'"Qu\'est-ce qui vous manque pour être rassuré ?"'],
          ["Client pressé",'"Je note les éléments et on reprend au moment de la restitution."'],
          ["Client refuse",'"Aucun souci. Si votre besoin évolue, on reste disponible."'],
        ].map(([k, v]) => <Row key={k} k={k} v={v} />)}
      </Section>
      <Section id="obj1" icon="💬" title="6. Objections fréquentes — prix et opérateur">
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
      <Section id="obj2" icon="🧠" title="7. Objections — peur, temps et décision">
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
      <Section id="memo" icon="📋" title="8. Fiche mémo comptoir">
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
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [visits, setVisits] = useState(null);
  const [history, setHistory] = useState(null);
  const [goatData, setGoatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [r, v, h, g] = await Promise.all([
        api.get(`/api/results${refresh ? "?refresh=1" : ""}`),
        api.get(`/api/visits${refresh  ? "?refresh=1" : ""}`),
        api.get(`/api/history${refresh ? "?refresh=1" : ""}`).catch(() => ({ months: [], byStore: {} })),
        api.get(`/api/goat${refresh    ? "?refresh=1" : ""}`).catch(() => null),
      ]);
      setResults(r);
      setVisits(v.visits);
      setHistory(h);
      setGoatData(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  if (!user) return <LoginScreen onLogin={(u) => { setUser(u); setPage("dashboard"); }} />;

  const nav = [
    { id: "dashboard", label: "Vue d'ensemble",     icon: "📊" },
    { id: "results",   label: "Résultats",           icon: "📈" },
    { id: "history",   label: "Historique",          icon: "📅" },
    { id: "goat",      label: "GOAT",                icon: "🐐" },
    { id: "guide",     label: "Guide Ventes Mobileo", icon: "📘" },
    { id: "visits",    label: "Visites",             icon: "📋" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; }
        a { text-decoration: none; }
        .nav-tabs-desktop { display: flex; gap: 2px; flex: 1; }
        .nav-burger { display: none; }
        .nav-user-role { display: block; }
        .nav-mobile-menu { display: none; }
        @media (max-width: 700px) {
          .nav-tabs-desktop { display: none !important; }
          .nav-burger { display: inline-flex !important; }
          .nav-user-role { display: none !important; }
          .nav-mobile-menu.open { display: flex !important; }
          .main-content { padding: 16px 12px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: C.navy, padding: "0 16px", display: "flex", alignItems: "center", height: 54, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.25)", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 12, flexShrink: 0 }}>
          <img src={logoRepairMobile} alt="Repair Mobile" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover" }} />
          <div>
            <div style={{ color: C.white, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>Repair<span style={{ color: C.accentB }}>Mobile</span></div>
            <div style={{ color: C.accentB, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Pilotage Réseau</div>
          </div>
        </div>

        <div className="nav-tabs-desktop">
          {nav.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setPage(id)}
              style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: page === id ? C.accent : "transparent", color: page === id ? C.white : C.gray400, fontSize: 12, fontWeight: page === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div className="nav-user-role" style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: C.white, fontSize: 11, fontWeight: 600 }}>{user.name}</div>
          <div style={{ color: C.accentB, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>{user.role === "rz" ? "Resp. de Zone" : "Magasin"}</div>
        </div>

        <button onClick={() => { api.token = null; setUser(null); }} style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${C.navyL}`, background: "transparent", color: C.gray400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>⏏</button>

        <button className="nav-burger" onClick={() => setMenuOpen(o => !o)}
          style={{ alignItems: "center", justifyContent: "center", width: 38, height: 34, borderRadius: 7, border: `1px solid ${C.navyL}`, background: menuOpen ? C.accent : "transparent", color: C.white, fontSize: 18, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, padding: 0 }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Menu mobile déroulant */}
      <div className={`nav-mobile-menu${menuOpen ? " open" : ""}`}
        style={{ flexDirection: "column", background: C.navyMid, position: "sticky", top: 54, zIndex: 99, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", padding: "8px" }}>
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.navyL}`, marginBottom: 6 }}>
          <div style={{ color: C.white, fontSize: 13, fontWeight: 700 }}>{user.name}</div>
          <div style={{ color: C.accentB, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{user.role === "rz" ? "Responsable de Zone" : "Magasin"}</div>
        </div>
        {nav.map(({ id, label, icon }) => (
          <button key={id} onClick={() => { setPage(id); setMenuOpen(false); }}
            style={{ textAlign: "left", padding: "11px 14px", borderRadius: 8, border: "none", background: page === id ? C.accent : "transparent", color: page === id ? C.white : C.gray200, fontSize: 14, fontWeight: page === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 2 }}>
            {icon}  {label}
          </button>
        ))}
      </div>

      {/* MAIN */}
      <main className="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 18px" }}>
        {page === "guide" ? (
          <GuidePage />
        ) : (
          <>
            {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={() => loadAll()} /></div>}
            {loading ? <Spinner label="Lecture des données Notion…" /> : (
              <>
                {page === "dashboard" && results && <Dashboard user={user} data={results} />}
                {page === "results"   && results && <ResultsPage user={user} data={results} onRefresh={() => loadAll(true)} refreshing={refreshing} />}
                {page === "history"   && <HistoryPage user={user} history={history} />}
                {page === "goat"      && <GoatPage user={user} goatData={goatData} onRefresh={() => loadAll(true)} refreshing={refreshing} />}
                {page === "visits"    && <VisitsPage user={user} visits={visits} />}
                {!results && !error && <Spinner />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
