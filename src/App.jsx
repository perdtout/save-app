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

// Notion peut renvoyer le caractère de remplacement Unicode lorsqu'une
// ancienne puce/emoji n'est plus décodable. On garde alors un texte lisible.
function cleanNotionText(value) {
  if (typeof value === "string") {
    return value.replace(/[\uFFFD]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "•");
  }
  if (Array.isArray(value)) return value.map(cleanNotionText);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanNotionText(item)]));
  }
  return value;
}

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

// ─── SAISONS — une saison va de juin à mai de l'année suivante ───────────────
const SAISON_DEBUT_MOIS = 6; // juin

// "2026-07-14" → "2026-2027" · "2026-04-02" → "2025-2026"
function saisonDe(iso) {
  if (!iso) return null;
  const [y, m] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m) return null;
  const debut = m >= SAISON_DEBUT_MOIS ? y : y - 1;
  return `${debut}-${debut + 1}`;
}

function saisonCourante() {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return saisonDe(iso);
}

const saisonLibelle = (cle) => {
  if (!cle) return "—";
  const [a, b] = cle.split("-");
  return `Juin ${a} — Mai ${b}`;
};

// Points de saison : 3 par MVP mensuel, 1 par MVP hebdomadaire
function computeGoatSeasonPoints(titlesHistory) {
  const pts = {};
  (titlesHistory || []).forEach(t => {
    if (!pts[t.winner]) pts[t.winner] = { weeks: 0, months: 0, points: 0, store: t.store };
    if (t.store && !pts[t.winner].store) pts[t.winner].store = t.store;
    if (t.type === "week")  { pts[t.winner].weeks  += 1; pts[t.winner].points += 1; }
    if (t.type === "month") { pts[t.winner].months += 1; pts[t.winner].points += 3; }
  });
  return Object.entries(pts)
    .map(([name, p]) => ({ name, ...p, store: p.store || GOAT_VENDORS[name]?.store }))
    .sort((a, b) => b.points - a.points || b.months - a.months);
}

// Série de titres mensuels consécutifs, sur la période fournie
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

// Regroupe les titres par saison et désigne le GOAT de chaque saison terminée
function palmaresParSaison(titlesHistory, saisonEnCours) {
  const parSaison = {};
  (titlesHistory || []).forEach(t => {
    const cle = saisonDe(t.start);
    if (!cle || cle === saisonEnCours) return;
    (parSaison[cle] = parSaison[cle] || []).push(t);
  });
  return Object.entries(parSaison)
    .map(([cle, titres]) => {
      const classement = computeGoatSeasonPoints(titres);
      return { cle, vainqueur: classement[0], classement };
    })
    .sort((a, b) => b.cle.localeCompare(a.cle));
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

// __STYLES_START__
const STYLES = `
/* ══════════════════════════════════════════════════════════════════════════
   SAVE Pilotage — feuille de style
   Charte Repair Mobile conservée. Les couleurs de statut ont été révisées
   pour ne plus être confondues avec l'orange de marque : séparation validée
   par calcul, y compris en vision daltonienne.
   ══════════════════════════════════════════════════════════════════════════ */

:root{
  /* Marque */
  --brand:#E8612C; --brand-light:#FF8A50; --brand-wash:#FDEEE7;
  --ink:#2B2B2B; --ink-2:#363636; --ink-3:#4A4A4A;
  --cream:#F7F5F3; --surface:#FFFFFF;
  --line:#EAE5E0; --line-2:#F2EEEA;
  --muted:#8A847E; --sub:#5A544E;

  /* Statuts */
  --ok:#2E7D53;      --ok-wash:#EAF3EE;
  --warn:#B4881B;    --warn-wash:#F8F1DF;
  --bad:#A02724;     --bad-wash:#F7EAE9;
  --neutral:#8A847E; --neutral-wash:#F0EDEA;

  --r:14px; --r-sm:10px;
  --shadow:0 1px 2px rgba(43,43,43,.04), 0 6px 20px rgba(43,43,43,.06);
  --shadow-lift:0 2px 4px rgba(43,43,43,.05), 0 12px 28px rgba(43,43,43,.10);
}

*{box-sizing:border-box}
html,body{margin:0}
body{
  background:var(--cream); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
}
a{text-decoration:none}
button{font-family:inherit}
:focus-visible{outline:2px solid var(--brand); outline-offset:2px; border-radius:6px}

/* ─── Typographie ───────────────────────────────────────────────────────── */
.h-screen{font-size:22px;font-weight:700;margin:0;letter-spacing:-.01em}
.h-section{font-size:15px;font-weight:700;margin:0 0 14px}
.lbl{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.meta{font-size:12.5px;color:var(--muted)}
.ctx{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:22px}
.ctx p{margin:0;font-size:12.5px;color:var(--muted)}
.stack{display:flex;flex-direction:column;gap:18px}
.sec{margin-bottom:30px}

/* ─── Barre de navigation ───────────────────────────────────────────────── */
.nav{background:var(--ink);padding:0 20px;height:58px;display:flex;align-items:center;gap:10px;
  position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.22)}
.nav-logo{width:34px;height:34px;border-radius:9px;object-fit:cover;flex-shrink:0}
.nav-brand{color:#fff;font-size:13.5px;font-weight:700;line-height:1.15}
.nav-brand i{color:var(--brand-light);font-style:normal}
.nav-sub{color:rgba(255,255,255,.45);font-size:9.5px;letter-spacing:.11em;text-transform:uppercase}
.nav-links{display:flex;gap:2px;margin-left:20px}
.nav-links button{color:rgba(255,255,255,.6);font-size:12.5px;font-weight:500;padding:7px 13px;
  border-radius:8px;border:none;background:transparent;cursor:pointer;white-space:nowrap}
.nav-links button:hover{color:#fff;background:rgba(255,255,255,.06)}
.nav-links button.on{background:rgba(255,255,255,.11);color:#fff;font-weight:600}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:14px;flex-shrink:0}
.nav-stamp{display:flex;align-items:center;gap:7px;font-size:11.5px;color:rgba(255,255,255,.55);white-space:nowrap}
.nav-stamp i{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.nav-user{text-align:right}
.nav-user b{display:block;color:#fff;font-size:11.5px;font-weight:600}
.nav-user span{color:var(--brand-light);font-size:9px;text-transform:uppercase;letter-spacing:.06em}
.nav-icon{padding:5px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.16);background:transparent;
  color:rgba(255,255,255,.65);font-size:13px;cursor:pointer}
.nav-burger{display:none;align-items:center;justify-content:center;width:38px;height:34px;border-radius:8px;
  border:1px solid rgba(255,255,255,.16);background:transparent;color:#fff;font-size:17px;cursor:pointer;padding:0}
.nav-mobile{display:none;flex-direction:column;background:var(--ink-2);position:sticky;top:58px;z-index:99;
  padding:8px;box-shadow:0 6px 16px rgba(0,0,0,.25)}
.nav-mobile.open{display:flex}
.nav-mobile button{text-align:left;padding:12px 14px;border-radius:9px;border:none;background:transparent;
  color:rgba(255,255,255,.75);font-size:14.5px;font-weight:500;cursor:pointer;margin-bottom:2px}
.nav-mobile button.on{background:var(--brand);color:#fff;font-weight:600}

main{max-width:1200px;margin:0 auto;padding:28px 20px 64px}

/* ─── Cartes ────────────────────────────────────────────────────────────── */
.card{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:20px 22px}
.card.pad-0{padding:0}
.card.accent-brand{border-left:3px solid var(--brand)}
.card.accent-bad{border-left:3px solid var(--bad)}
.grid{display:grid;gap:14px}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-auto{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.grid-stores{grid-template-columns:repeat(auto-fit,minmax(216px,1fr))}

/* ─── Tuiles KPI ────────────────────────────────────────────────────────── */
.tile{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:16px 18px 18px}
.tile .lbl{font-size:11px}
.tile .val{font-size:29px;font-weight:750;letter-spacing:-.025em;margin:8px 0 2px;line-height:1}
.tile .val small{font-size:15px;font-weight:600;color:var(--muted);letter-spacing:0}
.tile .foot{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;min-height:18px;flex-wrap:wrap}
.tile .foot b{color:var(--ink);font-weight:650}
.tile.hero .val{font-size:40px}

/* ─── Jauge ─────────────────────────────────────────────────────────────── */
.meter{position:relative;height:6px;border-radius:3px;background:var(--line-2);margin:11px 0 9px}
.meter i{position:absolute;left:0;top:0;height:100%;border-radius:3px;display:block;transition:width .5s ease}
.meter u{position:absolute;top:-3px;width:2px;height:12px;background:var(--ink);opacity:.22;border-radius:1px}
.meter.flat{margin:0}
.fill-ok{background:var(--ok)} .fill-warn{background:var(--warn)}
.fill-bad{background:var(--bad)} .fill-neutral{background:var(--neutral)}

/* ─── Pastilles ─────────────────────────────────────────────────────────── */
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:650;
  padding:3px 9px;border-radius:20px;white-space:nowrap}
.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.chip.no-dot::before{display:none}
.c-ok{background:var(--ok-wash);color:var(--ok)}
.c-warn{background:var(--warn-wash);color:var(--warn)}
.c-bad{background:var(--bad-wash);color:var(--bad)}
.c-neutral{background:var(--neutral-wash);color:var(--sub)}
.c-brand{background:var(--brand-wash);color:var(--brand)}
.trend{font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:3px}
.t-up{color:var(--ok)} .t-down{color:var(--bad)} .t-flat{color:var(--muted)}
.txt-ok{color:var(--ok)} .txt-warn{color:var(--warn)} .txt-bad{color:var(--bad)} .txt-muted{color:var(--muted)}

/* ─── Boutons ───────────────────────────────────────────────────────────── */
.btn{cursor:pointer;border:none;border-radius:9px;font-weight:600;display:inline-flex;align-items:center;
  gap:6px;padding:8px 15px;font-size:13px;transition:filter .15s}
.btn:hover{filter:brightness(.95)}
.btn-primary{background:var(--brand);color:#fff}
.btn-secondary{background:var(--line-2);color:var(--ink)}
.btn-ink{background:var(--ink);color:#fff}
.btn-ghost{background:transparent;color:var(--sub);border:1px solid var(--line)}
.btn-sm{padding:6px 12px;font-size:12px}
.btn-lg{padding:11px 22px;font-size:14px}
.btn[disabled]{opacity:.55;cursor:default}

/* ─── Sous-onglets ──────────────────────────────────────────────────────── */
.seg{display:inline-flex;background:var(--line-2);border-radius:11px;padding:3px;gap:3px;flex-wrap:wrap}
.seg button{border:none;background:transparent;font-size:13px;font-weight:600;color:var(--sub);
  padding:7px 16px;border-radius:8px;cursor:pointer}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(43,43,43,.10)}

/* ─── Champs ────────────────────────────────────────────────────────────── */
.select,.input{border:1.5px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13px;
  font-family:inherit;color:var(--ink);background:var(--surface);cursor:pointer}
.input{cursor:text;width:100%}
.field-label{font-size:10.5px;font-weight:700;color:var(--muted);text-transform:uppercase;
  letter-spacing:.06em;display:block;margin-bottom:5px}

/* ─── Tableaux ──────────────────────────────────────────────────────────── */
.tbl-wrap{overflow-x:auto}
table.tbl{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
table.tbl th{text-align:left;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);padding:0 12px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
table.tbl td{padding:13px 12px;border-bottom:1px solid var(--line-2);font-size:14px}
table.tbl tr:last-child td{border-bottom:none}
table.tbl .r{text-align:right} table.tbl .c{text-align:center}
table.tbl td.name{font-weight:650}
table.tbl td .cell-sub{font-size:11.5px;color:var(--muted);font-weight:400;margin-top:1px}
table.tbl tr.dim td{background:var(--neutral-wash);color:var(--muted)}
table.tbl tr.clickable{cursor:pointer}
table.tbl tr.clickable:hover td{background:var(--brand-wash)}
.big{font-size:16px;font-weight:750;letter-spacing:-.01em}
.note{font-size:12.5px;color:var(--muted);margin:12px 0 0;line-height:1.6}

/* ─── Cartes magasin ────────────────────────────────────────────────────── */
.store{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:18px 20px;
  cursor:pointer;transition:box-shadow .18s, transform .18s;border-top:3px solid transparent;
  text-align:left;border-left:none;border-right:none;border-bottom:none;width:100%;font:inherit;color:inherit}
.store:hover{transform:translateY(-2px);box-shadow:var(--shadow-lift)}
.store.s-ok{border-top-color:var(--ok)} .store.s-warn{border-top-color:var(--warn)} .store.s-bad{border-top-color:var(--bad)}
.store h3{margin:0;font-size:15.5px;font-weight:700}
.store .team{font-size:11.5px;color:var(--muted);margin:2px 0 12px}
.store .marge{font-size:22px;font-weight:750;letter-spacing:-.02em}
.store .marge-lbl{font-size:11px;color:var(--muted);margin-bottom:14px}
.kpiline{display:flex;align-items:center;gap:9px;margin-bottom:8px}
.kpiline>span:first-child{font-size:11.5px;color:var(--muted);width:38px;flex-shrink:0}
.kpiline .bar{flex:1;height:5px;border-radius:3px;background:var(--line-2);position:relative}
.kpiline .bar i{position:absolute;left:0;top:0;height:100%;border-radius:3px}
.kpiline .bar u{position:absolute;top:-2.5px;width:1.5px;height:10px;background:var(--ink);opacity:.2}
.kpiline b{font-size:12.5px;font-weight:700;width:46px;text-align:right;font-variant-numeric:tabular-nums}
.store .score{font-size:11.5px;font-weight:650;margin-top:12px;padding-top:11px;border-top:1px solid var(--line-2);
  display:flex;justify-content:space-between;align-items:center;gap:8px}

/* ─── Priorités ────────────────────────────────────────────────────────── */
.prio-item{display:flex;gap:16px;align-items:flex-start;padding:15px 22px;border-top:1px solid var(--line-2)}
.prio-item:first-of-type{border-top:none}
.prio-rank{width:24px;height:24px;border-radius:7px;background:var(--brand-wash);color:var(--brand);
  font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.prio-txt{flex:1;min-width:0}
.prio-txt b{font-weight:650;font-size:14.5px}
.prio-txt p{margin:3px 0 0;font-size:13px;color:var(--sub);line-height:1.6}
.prio-num{text-align:right;flex-shrink:0}
.prio-num .v{font-size:20px;font-weight:750;letter-spacing:-.02em}
.prio-num .o{font-size:11.5px;color:var(--muted)}

/* ─── Commentaire RZ ───────────────────────────────────────────────────── */
.quote{background:var(--brand-wash);border-radius:var(--r);padding:18px 22px;border-left:3px solid var(--brand)}
.quote p{margin:8px 0 0;font-size:14.5px;line-height:1.65;white-space:pre-wrap}

/* ─── Plan d'action ────────────────────────────────────────────────────── */
.action{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-top:1px solid var(--line-2)}
.action:first-of-type{border-top:none}
.action .check{width:19px;height:19px;border-radius:6px;border:1.5px solid var(--line);flex-shrink:0;margin-top:2px}
.action .check.done{background:var(--ok);border-color:var(--ok)}
.action .check.doing{border-color:var(--warn);background:var(--warn-wash)}
.action .body{flex:1;min-width:0}
.action .body b{font-weight:600;font-size:14px}
.action.is-done .body b{color:var(--muted);text-decoration:line-through}
.action .body p{margin:3px 0 0;font-size:12px;color:var(--muted)}
.action .side{display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}

/* ─── États ────────────────────────────────────────────────────────────── */
.empty{text-align:center;padding:30px 10px;color:var(--muted);font-size:13px}
.spin{width:30px;height:30px;border:3px solid var(--line-2);border-top-color:var(--brand);border-radius:50%;
  animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}

/* ─── Cartes mobiles (remplacent les tableaux) ─────────────────────────── */
.mcards{display:none}
.mcard{background:var(--surface);border-radius:12px;box-shadow:var(--shadow);padding:15px 16px;margin-bottom:11px}
.mcard .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
.mcard h4{margin:0;font-size:14.5px;font-weight:700}
.mrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:7px 0;
  border-top:1px solid var(--line-2);font-size:13px}
.mrow:first-of-type{border-top:none}
.mrow span{color:var(--muted);font-size:12.5px}
.mrow b{font-weight:700;font-variant-numeric:tabular-nums}

@media(max-width:900px){ .grid-3{grid-template-columns:repeat(2,1fr)} }
@media(max-width:768px){
  .nav-links,.nav-user,.nav-stamp{display:none}
  .nav-burger{display:inline-flex}
  main{padding:18px 13px 56px}
  .grid-3{grid-template-columns:1fr}
  .card{padding:17px 16px}
  .prio-item{padding:14px 16px;flex-wrap:wrap}
  .tbl-wrap{display:none}
  .mcards{display:block}
  .h-screen{font-size:20px}
}
@media(prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }

/* ══════════════════════════════════════════════════════════════════════════
   GOAT — trois colonnes : saison · mois · semaine
   ══════════════════════════════════════════════════════════════════════════ */
.goat-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start}
.goat-card{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);overflow:hidden;
  border-top:3px solid transparent;animation:rise .45s cubic-bezier(.2,.9,.3,1) both}
.goat-card.k-saison{border-top-color:#D4A017}
.goat-card.k-mois{border-top-color:var(--brand)}
.goat-card.k-semaine{border-top-color:#3E6FB0}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

.goat-head{padding:15px 17px 16px;color:#fff;position:relative;overflow:hidden}
.goat-head::after{content:"";position:absolute;right:-26px;top:-26px;width:96px;height:96px;border-radius:50%;
  background:rgba(255,255,255,.07)}
.k-saison .goat-head{background:radial-gradient(circle at 88% 8%,rgba(244,180,0,.42),transparent 62%),
  linear-gradient(135deg,#2B2B2B,#3E3527)}
.k-mois .goat-head{background:linear-gradient(135deg,#C2481B,#E8612C 65%,#FF8A50)}
.k-semaine .goat-head{background:linear-gradient(135deg,#2C4A70,#3E6FB0)}
.goat-head .k{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;color:rgba(255,255,255,.7)}
.goat-head h3{margin:4px 0 0;font-size:16px;font-weight:800;color:#fff;letter-spacing:-.01em;
  display:flex;align-items:center;gap:8px}
.goat-head .p{margin:3px 0 0;font-size:11.5px;color:rgba(255,255,255,.72)}

.goat-hero{display:flex;align-items:center;gap:13px;padding:15px 17px;
  background:linear-gradient(120deg,#FFF9EC,#FDF1E4);border-bottom:1px solid var(--line-2)}
.goat-hero .badge{width:50px;height:50px;border-radius:50%;flex-shrink:0;font-size:25px;
  background:linear-gradient(145deg,#FFD34E,#D4A017 55%,#A8760A);
  display:flex;align-items:center;justify-content:center;box-shadow:0 5px 16px rgba(212,160,23,.45)}
.goat-hero .who{flex:1;min-width:0}
.goat-hero .who b{display:block;font-size:18px;font-weight:850;letter-spacing:-.02em}
.goat-hero .who>span{font-size:11.5px;color:var(--muted)}
.goat-hero .pts{text-align:right;flex-shrink:0}
.goat-hero .pts b{display:block;font-size:26px;font-weight:850;line-height:1;color:#B8860B}
.goat-hero .pts span{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}
.goat-tags{margin-top:5px;display:flex;gap:6px;flex-wrap:wrap}
.goat-tag{font-size:10.5px;font-weight:750;padding:2px 8px;border-radius:20px;white-space:nowrap}
.tag-gold{background:#FBEFCE;color:#8A6400} .tag-brand{background:var(--brand-wash);color:#C2481B}
.tag-fire{background:#FDE4DE;color:#B33A22}

.goat-row{display:flex;align-items:center;gap:11px;padding:11px 15px;border-top:1px solid var(--line-2);
  transition:background .15s}
.goat-row:hover{background:#FCFAF8}
.goat-row.lead{background:linear-gradient(90deg,rgba(244,180,0,.16),rgba(244,180,0,.02))}
.goat-row.lead:hover{background:linear-gradient(90deg,rgba(244,180,0,.22),rgba(244,180,0,.04))}
.goat-row.zero{opacity:.5}
.goat-row .rk{width:25px;height:25px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-size:11.5px;font-weight:850;background:var(--line-2);color:var(--muted)}
.goat-row .rk.m1{background:linear-gradient(145deg,#FFD34E,#C98A00);color:#fff;box-shadow:0 2px 7px rgba(201,138,0,.45)}
.goat-row .rk.m2{background:linear-gradient(145deg,#DDE1E6,#9AA0A8);color:#fff}
.goat-row .rk.m3{background:linear-gradient(145deg,#E2A76B,#B06A28);color:#fff}
.goat-row .who{flex:1;min-width:0}
.goat-row .who b{font-size:13.5px;font-weight:750;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.goat-row .who>span{font-size:11px;color:var(--muted)}
.goat-row .sc{font-size:16px;font-weight:850;font-variant-numeric:tabular-nums;flex-shrink:0;letter-spacing:-.02em}
.goat-row .sc small{font-size:9.5px;color:var(--muted);font-weight:650}
.goat-solo{font-size:8.5px;font-weight:800;color:#fff;background:var(--brand);
  padding:1px 6px;border-radius:8px;margin-left:6px;vertical-align:1.5px;letter-spacing:.03em}

/* Composition du score — barre empilée, une teinte du clair au foncé */
.stackbar{display:flex;gap:2px;height:6px;margin-top:6px}
.stackbar i{display:block;border-radius:2px;min-width:2px;animation:grow .55s cubic-bezier(.2,.9,.3,1) both;transform-origin:left}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.sg1{background:#F9D2B6} .sg2{background:#F0A170} .sg3{background:#E8612C} .sg4{background:#9E3610}
.goat-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--sub);align-items:center;
  background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:12px 18px}
.goat-legend span{display:inline-flex;align-items:center;gap:6px}
.goat-legend i{width:11px;height:11px;border-radius:3px;display:inline-block}

/* Historique repliable sous chaque colonne */
.hist{border-top:1px solid var(--line);background:#FCFAF8}
.hist summary{list-style:none;cursor:pointer;padding:12px 15px;font-size:12.5px;font-weight:700;color:var(--sub);
  display:flex;align-items:center;gap:8px;transition:background .15s}
.hist summary::-webkit-details-marker{display:none}
.hist summary::after{content:"▾";margin-left:auto;color:var(--brand);font-size:13px;transition:transform .25s ease}
.hist[open] summary::after{transform:rotate(180deg)}
.hist summary:hover{background:var(--brand-wash);color:var(--brand)}
.hist-body{padding:2px 15px 14px;max-height:280px;overflow-y:auto}
.hist-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;
  border-top:1px solid var(--line-2);font-size:12px}
.hist-row:first-child{border-top:none}
.hist-row .who{font-weight:700}
.hist-row .per{color:var(--muted)}
.hist-row .sc{font-weight:750;color:#B8860B;font-variant-numeric:tabular-nums}

/* ══════════════════════════════════════════════════════════════════════════
   Accordéon — Guide Ventes Mobileo
   ══════════════════════════════════════════════════════════════════════════ */
.acc{border-top:1px solid var(--line-2);border-left:3px solid transparent;transition:border-color .25s,background .2s}
.acc:first-child{border-top:none}
.acc.open{border-left-color:var(--acc-c,var(--brand));background:#FDFCFB}
.acc-head{display:flex;align-items:center;gap:14px;width:100%;padding:15px 20px;background:none;border:none;
  cursor:pointer;text-align:left;font:inherit;transition:background .15s}
.acc-head:hover{background:var(--line-2)}
.acc-ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:17px;flex-shrink:0;background:var(--acc-wash,var(--brand-wash));transition:transform .25s ease}
.acc.open .acc-ico{transform:scale(1.06)}
.acc-title{flex:1;min-width:0}
.acc-title b{display:block;font-size:15px;font-weight:700;letter-spacing:-.01em}
.acc-title span{font-size:11.5px;color:var(--muted)}
.acc-num{font-size:11px;font-weight:800;color:var(--acc-c,var(--brand));background:var(--acc-wash,var(--brand-wash));
  border-radius:20px;padding:2px 9px;flex-shrink:0}
.acc-chev{color:var(--muted);font-size:11px;transition:transform .3s cubic-bezier(.4,0,.2,1);flex-shrink:0}
.acc.open .acc-chev{transform:rotate(90deg);color:var(--acc-c,var(--brand))}
.acc-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.4,0,.2,1)}
.acc.open .acc-body{grid-template-rows:1fr}
.acc-body>.acc-inner{overflow:hidden}
.acc-body>.acc-inner>div{padding:2px 20px 20px 68px;opacity:0;transition:opacity .3s ease .06s}
.acc.open .acc-body>.acc-inner>div{opacity:1}
.guide-row{display:flex;gap:16px;padding:10px 0;border-bottom:1px solid var(--line-2)}
.guide-row:last-child{border-bottom:none}
.guide-row .k{min-width:170px;flex-shrink:0;font-size:13px;font-weight:700;color:var(--acc-c,var(--ink))}
.guide-row .v{font-size:13.5px;color:var(--sub);line-height:1.6}
.guide-block{padding:11px 14px;background:var(--surface);border-radius:10px;margin-bottom:7px;
  border-left:3px solid var(--acc-c,var(--brand));box-shadow:0 1px 3px rgba(43,43,43,.05)}
.guide-block b{display:block;font-size:13.5px;font-weight:700;margin-bottom:3px}
.guide-block span{font-size:13px;color:var(--sub);line-height:1.55}

@media(max-width:1000px){ .goat-cols{grid-template-columns:1fr} }
@media(max-width:768px){
  .acc-head{padding:13px 14px;gap:11px}
  .acc-body>.acc-inner>div{padding:2px 14px 16px}
  .guide-row{flex-direction:column;gap:3px}
  .guide-row .k{min-width:0}
}
/* ══════════════════════════════════════════════════════════════════════════
   Process — bibliothèque documentaire
   ══════════════════════════════════════════════════════════════════════════ */
.proc-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.proc-search{flex:1;min-width:220px;padding:11px 14px;border:1px solid var(--line);
  border-radius:10px;font:inherit;font-size:14px;background:var(--surface);color:var(--ink)}
.proc-search:focus{outline:2px solid var(--brand);outline-offset:-1px;border-color:transparent}
.proc-row{display:flex;align-items:center;gap:13px;padding:12px 0;border-bottom:1px solid var(--line-2)}
.proc-row:last-child{border-bottom:none}
.proc-fmt{font-size:10px;font-weight:800;letter-spacing:.04em;padding:4px 7px;border-radius:6px;
  width:46px;text-align:center;flex-shrink:0}
.proc-fmt.pdf{background:#F7EAE9;color:#A02724}
.proc-fmt.word{background:#E8EEF7;color:#2A5C93}
.proc-main{flex:1;min-width:0}
.proc-title{font-size:13.5px;font-weight:700;line-height:1.35}
.proc-meta{font-size:11.5px;color:var(--muted);font-weight:600;margin-top:2px}
.proc-note{font-size:11.5px;color:var(--sub);margin-top:3px;line-height:1.45}
.proc-tag{display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:.03em;
  padding:3px 7px;border-radius:6px;margin-left:7px;vertical-align:1px}
.proc-tag.new{background:#EAF3EE;color:#2E7D53}
.proc-tag.old{background:#FBF0D8;color:#B4881B}
.proc-tag.off{background:#F0EDEA;color:#5A544E}
.proc-tag.ext{background:#F0EBF7;color:#7A5AA6}
.proc-empty{padding:26px 20px;text-align:center;color:var(--muted);font-size:13px;font-weight:600}
@media(max-width:768px){
  .proc-row{flex-wrap:wrap;gap:8px}
  .proc-fmt{order:1}
  .proc-main{flex:1 1 100%;order:2}
  .proc-row .btn{order:3;margin-left:auto}
}

`;
// __STYLES_END__

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

// Les projections suivent la dernière journée réellement saisie dans
// Notion, pas la date de l'appareil qui consulte le tableau de bord.
function moisPourDonnees(data) {
  const courant = moisEnCours();
  const ecoules = Number(data?.workdays?.elapsed);
  const total = Number(data?.workdays?.total);
  if (!ecoules || !total) return courant;
  return { ...courant, ecoules, total, ratio: ecoules / total };
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
  const mois = moisPourDonnees(data);
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
  const fmt = (v) => `${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${suffix}`;
  const nbMois = pts.length;
  let phrase = "";
  if (sens === "stable") phrase = `Stable autour de ${fmt(avg)} sur ${nbMois} mois.`;
  else { const mot = sens === "hausse" ? "Progression" : "Repli"; phrase = `${mot} de ${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))} sur ${nbMois} mois, de ${fmt(first)} à ${fmt(last)}.`; }
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

// ─── COURBE DE TENDANCE ───────────────────────────────────────────────────────
// Trait fin, points seulement aux extrémités et sur le mois en cours, ligne
// d'objectif discrète, projection de fin de mois en pointillé. Survol : repère
// vertical + infobulle.
function TrendChart({ points, target, suffix = "", isVolume = false, mois }) {
  const [hover, setHover] = useState(null);
  const pts = (points || []).filter(p => p.value != null);
  if (pts.length < 2) {
    return <div className="empty" style={{ padding: "26px 0" }}>Pas assez d'historique pour tracer une tendance.</div>;
  }

  const lastIdx = pts.length - 1;
  const enCours = estMoisEnCours(pts[lastIdx].mois);
  const projection = (enCours && isVolume) ? projeterVolume(pts[lastIdx].value, pts[lastIdx].mois) : null;
  const projValue = projection?.projete ?? null;

  const W = 360, H = 132, padL = 6, padR = projValue != null ? 40 : 30, padT = 20, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const vals = pts.map(p => p.value);
  const all = [...vals, ...(projValue != null ? [projValue] : []), ...(target != null ? [target] : [])];
  const rawMax = Math.max(...all), rawMin = Math.min(...all);
  const span = (rawMax - rawMin) || Math.abs(rawMax) || 1;
  const maxV = rawMax + span * 0.18, minV = Math.max(0, rawMin - span * 0.18);
  const range = (maxV - minV) || 1;

  const x = (i) => padL + (pts.length > 1 ? (i * plotW) / (pts.length - 1) : 0);
  const y = (v) => padT + plotH - ((v - minV) / range) * plotH;
  const xy = pts.map((p, i) => ({ ...p, x: x(i), y: y(p.value), i }));

  const line = xy.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${xy[lastIdx].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${padL} ${(padT + plotH).toFixed(1)} Z`;
  const targetY = target != null ? y(target) : null;

  const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const moisCourt = (cle) => { const m = parseInt((cle || "").split("-")[1], 10); return MOIS_COURTS[m - 1] || ""; };
  const moisLong = (cle) => { const [a, m] = (cle || "").split("-"); return `${moisCourt(cle)} ${a}`; };
  const fmt = (v) => `${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${suffix}`;

  const idxLabels = new Set([0, lastIdx, Math.floor(lastIdx / 2)]);
  const pointe = hover != null ? xy[hover] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8612C" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#E8612C" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Repères horizontaux, discrets */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={padL} x2={W - padR} y1={padT + plotH * f} y2={padT + plotH * f}
            stroke="#F2EEEA" strokeWidth="1" />
        ))}

        {/* Objectif */}
        {targetY != null && (
          <>
            <line x1={padL} x2={W - padR} y1={targetY} y2={targetY} stroke="#D6CFC8" strokeWidth="1" />
            <text x={W - padR + 4} y={targetY + 3} fontSize="9" fill="#8A847E">obj. {fmt(target)}</text>
          </>
        )}

        <path d={area} fill="url(#tg)" />
        <path d={line} fill="none" stroke="#E8612C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Projection de fin de mois */}
        {projValue != null && (
          <>
            <line x1={xy[lastIdx].x} y1={xy[lastIdx].y} x2={xy[lastIdx].x + 26} y2={y(projValue)}
              stroke="#B4881B" strokeWidth="1.5" strokeDasharray="3,3" />
            <circle cx={xy[lastIdx].x + 26} cy={y(projValue)} r="3.5" fill="#B4881B" stroke="#fff" strokeWidth="2" />
          </>
        )}

        {/* Points : extrémités et mois en cours seulement */}
        {xy.map((p, i) => (
          (i === 0 || i === lastIdx) && (
            <circle key={i} cx={p.x} cy={p.y} r="4.5"
              fill={i === lastIdx && enCours ? "#B4881B" : "#E8612C"} stroke="#fff" strokeWidth="2" />
          )
        ))}

        {/* Étiquettes directes, parcimonieuses */}
        {xy.map((p, i) => idxLabels.has(i) && i !== Math.floor(lastIdx / 2) && (
          <text key={`l${i}`} x={p.x} y={p.y - 10} textAnchor={i === 0 ? "start" : "middle"}
            fontSize="10" fontWeight="700" fill={i === lastIdx && enCours ? "#B4881B" : "#5A544E"}>{fmt(p.value)}</text>
        ))}

        {/* Axe des mois */}
        {xy.map((p, i) => (idxLabels.has(i)) && (
          <text key={`x${i}`} x={p.x} y={H - 6} textAnchor={i === 0 ? "start" : i === lastIdx ? "end" : "middle"}
            fontSize="9" fill="#8A847E">{moisCourt(p.mois)}</text>
        ))}

        {/* Repère de survol */}
        {pointe && (
          <>
            <line x1={pointe.x} x2={pointe.x} y1={padT - 6} y2={padT + plotH} stroke="#2B2B2B" strokeWidth="1" opacity="0.18" />
            <circle cx={pointe.x} cy={pointe.y} r="5" fill="#E8612C" stroke="#fff" strokeWidth="2" />
          </>
        )}

        {/* Zones de survol */}
        {xy.map((p, i) => (
          <rect key={`h${i}`} x={p.x - plotW / (pts.length * 2)} y={0}
            width={plotW / pts.length} height={H} fill="transparent"
            onMouseEnter={() => setHover(i)} />
        ))}
      </svg>

      {pointe && (
        <div style={{
          position: "absolute", top: 0, left: `${(pointe.x / W) * 100}%`, transform: "translateX(-50%)",
          background: "#2B2B2B", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 11.5,
          whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,.22)", zIndex: 3,
        }}>
          <b>{fmt(pointe.value)}</b> <span style={{ opacity: .6 }}>{moisLong(pointe.mois)}</span>
        </div>
      )}

      {projection && (
        <div style={{
          marginTop: 8, padding: "8px 11px", background: "var(--warn-wash)", borderRadius: 9,
          fontSize: 12, color: "var(--warn)", fontWeight: 650, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap",
        }}>
          <span>Mois en cours : {fmt(pts[lastIdx].value)} en {projection.ecoules} j ouvrés</span>
          <span style={{ marginLeft: "auto", color: "var(--ink)" }}>Projection fin de mois <b>≈ {fmt(projection.projete)}</b></span>
        </div>
      )}
    </div>
  );
}

// ─── ÉCRAN HISTORIQUE ─────────────────────────────────────────────────────────
function HistoryPage({ user, history }) {
  const isRZ = user.role === "rz";
  const stores = isRZ ? STORES_ORDER : [user.store];
  const [vue, setVue] = useState("courbes");
  const [kpi, setKpi] = useState("acc");
  const [magasin, setMagasin] = useState("all");
  const [moisSel, setMoisSel] = useState(null);
  const [storeTab, setStoreTab] = useState(stores[0]);

  const MOIS_FR = { "01": "Janv.", "02": "Févr.", "03": "Mars", "04": "Avr.", "05": "Mai", "06": "Juin",
                    "07": "Juil.", "08": "Août", "09": "Sept.", "10": "Oct.", "11": "Nov.", "12": "Déc." };
  const moisLabel = (k) => { if (!k) return "—"; const [y, m] = k.split("-"); return `${MOIS_FR[m] || m} ${y}`; };

  const byStoreMois = {};
  for (const [store, rows] of Object.entries(history?.byStore || {})) {
    byStoreMois[store] = {};
    for (const row of (Array.isArray(rows) ? rows : [])) if (row.mois) byStoreMois[store][row.mois] = row;
  }
  const allMonths = (history?.months || []).slice().sort();

  if (!allMonths.length) {
    return (
      <div className="stack">
        <h1 className="h-screen">Historique mensuel</h1>
        <Card><div className="empty">Pas encore d'historique mensuel disponible dans Notion.</div></Card>
      </div>
    );
  }

  const KPIS = [
    { id: "acc",     label: "Ratio accessoires", champ: "accessoires", suffix: " %", target: ACC_OBJ },
    { id: "gp",      label: "Ratio GP",          champ: "gp",          suffix: " %", target: GP_OBJ },
    { id: "occ",     label: "Mobiles d'occasion", champ: "occasion",   suffix: "",   volume: true },
    { id: "mobileo", label: "Forfaits Mobileo",  champ: "mobileo",     suffix: "",   volume: true, target: MOBILEO_OBJ },
    { id: "atm",     label: "Ratio ATM",         champ: "atm",         suffix: " %", target: ATM_OBJ },
  ];
  const k = KPIS.find(x => x.id === kpi);
  const cible = (store) => kpi === "occ" ? (OCC_OBJ[store] ?? null) : (k.target ?? null);

  const serie = (store) => allMonths.map(m => ({ mois: m, value: byStoreMois[store]?.[m]?.[k.champ] ?? null }));
  const derniere = (store) => {
    const s = serie(store).filter(p => p.value != null);
    return s.length ? s[s.length - 1].value : null;
  };

  const magasinsAffiches = magasin === "all" ? stores : [magasin];

  const evo = (a, b) => (a == null || b == null || b === 0) ? null : +(((a - b) / Math.abs(b)) * 100).toFixed(1);
  const EvoChip = ({ pct }) => pct == null
    ? <span className="txt-muted">—</span>
    : <span className={`trend ${pct > 0 ? "t-up" : pct < 0 ? "t-down" : "t-flat"}`}>
        {pct > 0 ? "▲" : pct < 0 ? "▼" : "▬"} {Math.abs(pct).toLocaleString("fr-FR")} %
      </span>;

  const COLS = [
    { key: "margeTotale",      label: "Marge",        fmt: eur },
    { key: "accessoires",      label: "Acc.",         fmt: v => pct(v),  obj: ACC_OBJ },
    { key: "margeAccessoires", label: "dont acc.",    fmt: eur },
    { key: "gp",               label: "GP",           fmt: v => pct(v),  obj: GP_OBJ },
    { key: "margeGP",          label: "dont GP",      fmt: eur },
    { key: "occasion",         label: "Occasion",     fmt: v => v ?? "—" },
    { key: "mobileo",          label: "Mobileo",      fmt: v => v ?? "—" },
  ];
  const val = (store, m, key) => byStoreMois[store]?.[m]?.[key] ?? null;

  const moisEffectif = moisSel || allMonths[allMonths.length - 1];

  return (
    <div className="stack">
      <div className="ctx">
        <h1 className="h-screen">Historique</h1>
        <p>{allMonths.length} mois · {moisLabel(allMonths[0])} → {moisLabel(allMonths[allMonths.length - 1])}</p>
      </div>

      <div className="seg">
        <button className={vue === "courbes" ? "on" : ""} onClick={() => setVue("courbes")}>Tendances</button>
        <button className={vue === "comparaison" ? "on" : ""} onClick={() => setVue("comparaison")}>Comparaison N / N-1</button>
        <button className={vue === "tableau" ? "on" : ""} onClick={() => setVue("tableau")}>Tableau complet</button>
      </div>

      {vue === "courbes" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select className="select" value={kpi} onChange={e => setKpi(e.target.value)}>
              {KPIS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            {isRZ && (
              <select className="select" value={magasin} onChange={e => setMagasin(e.target.value)}>
                <option value="all">Les 5 magasins</option>
                {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <span className="meta">
              {k.target || kpi === "occ" ? "Ligne grise = objectif" : "Aucun objectif fixé sur cet indicateur"}
              {k.volume ? " · pointillé = projection de fin de mois" : ""}
            </span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: magasinsAffiches.length === 1
            ? "1fr" : "repeat(auto-fit,minmax(330px,1fr))" }}>
            {magasinsAffiches.map(store => {
              const pts = serie(store);
              const t = cible(store);
              const derniereVal = derniere(store);
              const statut = t != null ? statusFor(derniereVal, t) : "neutral";
              const an = analyzeSeries(pts.filter(p => !estMoisEnCours(p.mois)),
                { suffix: k.suffix, target: t, higherIsBetter: true });
              return (
                <Card key={store}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                    <div>
                      <h3 className="h-section" style={{ margin: 0 }}>{store}</h3>
                      <span className="meta">{k.label}</span>
                    </div>
                    <Chip status={statut}>
                      {derniereVal != null
                        ? `${Number(derniereVal).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${k.suffix}`
                        : "—"}
                    </Chip>
                  </div>
                  {an && (
                    <p style={{ margin: "6px 0 10px", fontSize: 12.5, lineHeight: 1.55, color: an.couleur }}>{an.phrase}</p>
                  )}
                  <TrendChart points={pts} target={t} suffix={k.suffix} isVolume={!!k.volume} />
                </Card>
              );
            })}
          </div>
        </>
      )}

      {vue === "comparaison" && (() => {
        const [y, mm] = moisEffectif.split("-");
        const n = moisEffectif, n1 = `${+y - 1}-${mm}`, n2 = `${+y - 2}-${mm}`;
        return (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select className="select" value={moisEffectif} onChange={e => setMoisSel(e.target.value)}>
                {allMonths.slice().reverse().map(m => <option key={m} value={m}>{moisLabel(m)}</option>)}
              </select>
              <span className="meta">{moisLabel(n)} comparé à {moisLabel(n1)} et {moisLabel(n2)}</span>
            </div>
            {!allMonths.includes(n1) && (
              <Card accent={C.accent}>
                <div className="note" style={{ margin: 0 }}>
                  Aucune donnée pour <b>{moisLabel(n1)}</b> : l'historique Notion démarre en {moisLabel(allMonths[0])}.
                  La comparaison année sur année deviendra possible à partir de {moisLabel(`${+allMonths[0].split("-")[0] + 1}-${allMonths[0].split("-")[1]}`)}.
                </div>
              </Card>
            )}
            {stores.map(store => (
              <Card key={store}>
                <SectionHead>{store}</SectionHead>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr>
                      <th>Indicateur</th>
                      <th className="r">{moisLabel(n)}</th><th className="c">vs N-1</th>
                      <th className="r">{moisLabel(n1)}</th><th className="c">vs N-2</th>
                      <th className="r">{moisLabel(n2)}</th>
                    </tr></thead>
                    <tbody>
                      {COLS.map(c => {
                        const vN = val(store, n, c.key), vN1 = val(store, n1, c.key), vN2 = val(store, n2, c.key);
                        return (
                          <tr key={c.key}>
                            <td className="name">{c.label}</td>
                            <td className="r"><span className={c.obj ? `txt-${statusFor(vN, c.obj)}` : ""}
                              style={{ fontWeight: 700 }}>{c.fmt(vN)}</span></td>
                            <td className="c"><EvoChip pct={evo(vN, vN1)} /></td>
                            <td className="r txt-muted">{c.fmt(vN1)}</td>
                            <td className="c"><EvoChip pct={evo(vN, vN2)} /></td>
                            <td className="r txt-muted">{c.fmt(vN2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mcards">
                  {COLS.map(c => {
                    const vN = val(store, n, c.key), vN1 = val(store, n1, c.key);
                    return (
                      <div className="mrow" key={c.key}>
                        <span>{c.label}</span>
                        <b>{c.fmt(vN)} <span style={{ fontWeight: 400 }}><EvoChip pct={evo(vN, vN1)} /></span></b>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </>
        );
      })()}

      {vue === "tableau" && (
        <>
          {isRZ && (
            <div className="seg">
              {stores.map(s => (
                <button key={s} className={storeTab === s ? "on" : ""} onClick={() => setStoreTab(s)}>{s}</button>
              ))}
            </div>
          )}
          <Card>
            <SectionHead>{isRZ ? storeTab : user.store} — mois par mois</SectionHead>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  <th>Mois</th><th className="r">Marge</th><th className="c">Évol.</th>
                  <th className="r">Acc.</th><th className="r">GP</th>
                  <th className="r">Occasion</th><th className="r">Mobileo</th>
                </tr></thead>
                <tbody>
                  {Object.keys(byStoreMois[isRZ ? storeTab : user.store] || {}).sort().reverse().map((m, i, arr) => {
                    const st = isRZ ? storeTab : user.store;
                    const r = byStoreMois[st]?.[m] || {};
                    const prev = arr[i + 1] ? byStoreMois[st]?.[arr[i + 1]] : null;
                    return (
                      <tr key={m}>
                        <td className="name">{moisLabel(m)}</td>
                        <td className="r" style={{ fontWeight: 700 }}>{eur(r.margeTotale)}</td>
                        <td className="c"><EvoChip pct={prev ? evo(r.margeTotale, prev.margeTotale) : null} /></td>
                        <td className={`r txt-${statusFor(r.accessoires, ACC_OBJ)}`} style={{ fontWeight: 700 }}>{pct(r.accessoires)}</td>
                        <td className={`r txt-${statusFor(r.gp, GP_OBJ)}`} style={{ fontWeight: 700 }}>{pct(r.gp)}</td>
                        <td className="r">{r.occasion ?? "—"}</td>
                        <td className="r">{r.mobileo ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              Vert : objectif atteint (accessoires ≥ {ACC_OBJ} %, GP ≥ {GP_OBJ} %) · ambre : sous l'objectif de moins de 15 % · brique : en dessous.
            </p>
          </Card>
        </>
      )}
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
  const zero = typeof score === "number" && score <= 0;
  return (
    <div className={`goat-row${rank === 1 && !zero ? " lead" : ""}${zero ? " zero" : ""}`}>
      <div className={`rk${rank <= 3 && !zero ? ` m${rank}` : ""}`}>{rank}</div>
      <div className="who">
        <b>{name}{isSolo && <span className="goat-solo">SOLO</span>}</b>
        <span>{store}</span>
        {breakdown && <GoatStack breakdown={breakdown} />}
      </div>
      <div className="sc" style={{ color: rank === 1 && !zero ? "#B8860B" : "var(--ink)" }}>
        {typeof score === "number" ? score.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : score}
        {suffix && <small> {suffix}</small>}
      </div>
    </div>
  );
}

function GoatHistory({ label, entries, vide }) {
  if (!entries?.length) {
    return vide ? <div className="hist"><div className="hist-body" style={{ padding: "13px 15px" }}>
      <span className="meta">{vide}</span></div></div> : null;
  }
  return (
    <details className="hist">
      <summary>{label} ({entries.length})</summary>
      <div className="hist-body">
        {entries.map((t, i) => (
          <div className="hist-row" key={i}>
            <span className="per">{t.periode}</span>
            <span style={{ display: "flex", gap: 9, alignItems: "baseline" }}>
              <span className="who">{t.gagnant}</span>
              {t.detail && <span className="sc">{t.detail}</span>}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function GoatColumn({ variant, icon, kicker, title, subtitle, hero, rows, history, historyLabel, emptyLabel, emptyHistory }) {
  return (
    <div className={`goat-card k-${variant}`}>
      <div className="goat-head">
        <div className="k">{kicker}</div>
        <h3>{icon} {title}</h3>
        {subtitle && <p className="p">{subtitle}</p>}
      </div>
      {hero}
      {rows?.length ? rows : <div className="empty" style={{ padding: "22px 14px" }}>{emptyLabel}</div>}
      <GoatHistory label={historyLabel} entries={history} vide={emptyHistory} />
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
  const saison = saisonCourante();

  // Si le backend ne renvoie pas encore la date des titres, on ne peut pas les
  // rattacher à une saison : on affiche tout, en le disant.
  const datesDispo = titres.some(t => t.start);
  const dansSaison = (t) => !datesDispo || saisonDe(t.start) === saison;

  const titresSaison  = titres.filter(dansSaison);
  const moisSaison    = titresSaison.filter(t => t.type === "month");
  const semainesSaison = titresSaison.filter(t => t.type === "week");

  const classementSaison = computeGoatSeasonPoints(titresSaison);
  const goat = classementSaison[0];
  const streak = computeCurrentStreak(moisSaison);
  const showStreak = streak && streak.count >= 2;

  const saisonsPassees = datesDispo ? palmaresParSaison(titres, saison) : [];

  const moisScores = [...(data.monthly?.scores || [])].sort((a, b) => b.total - a.total);
  const semScores  = [...(data.weekly?.scores  || [])].sort((a, b) => b.total - a.total);

  return (
    <div className="stack">
      <div className="ctx" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="h-screen">🐐 GOAT — Classement vendeurs</h1>
          <p>
            Saison en cours : <b>{saisonLibelle(saison)}</b> · score sur 100, chaque indicateur plafonné à son
            objectif, bonus +10 % pour les magasins solo
            {lastLoaded ? ` · lu dans Notion ${stampLabel(lastLoaded)}` : ""}
          </p>
        </div>
        {isRZ && <Btn size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Synchronisation…" : "Actualiser depuis Notion"}
        </Btn>}
      </div>

      {!datesDispo && (
        <Card accent={C.bad}>
          <div className="note" style={{ margin: 0 }}>
            Les titres remontent sans leur date : impossible de les répartir par saison. Le classement affiché
            couvre donc <b>tout l'historique</b>, pas seulement la saison en cours. Déployer la dernière version
            du backend corrige ce point.
          </div>
        </Card>
      )}

      <GoatLegend />

      <div className="goat-cols">
        {/* ── Colonne 1 : la saison en cours ── */}
        <GoatColumn
          variant="saison" icon="🐐"
          kicker={`Saison ${saison?.replace("-", " – ")}`}
          title="GOAT de la saison"
          subtitle={`${saisonLibelle(saison)} · 3 points par MVP du mois, 1 point par MVP de la semaine`}
          hero={goat && (
            <div className="goat-hero">
              <div className="badge">🐐</div>
              <div className="who">
                <b>{goat.name}</b>
                <span>{goat.store}</span>
                <div className="goat-tags">
                  {goat.months > 0 && <span className="goat-tag tag-gold">🏆 {goat.months} mois</span>}
                  {goat.weeks > 0 && <span className="goat-tag tag-brand">⭐ {goat.weeks} semaine{goat.weeks > 1 ? "s" : ""}</span>}
                  {showStreak && <span className="goat-tag tag-fire">🔥 {streak.count} d'affilée</span>}
                </div>
              </div>
              <div className="pts"><b>{goat.points}</b><span>points</span></div>
            </div>
          )}
          rows={classementSaison.slice(1).map((p, i) => (
            <GoatRow key={p.name} rank={i + 2} name={p.name} store={p.store} score={p.points} suffix="pts" />
          ))}
          emptyLabel="La saison vient de commencer : aucun titre décerné pour l'instant."
          historyLabel="Les saisons précédentes"
          emptyHistory="Première saison en cours de calcul — aucune saison terminée avant celle-ci."
          history={saisonsPassees.map(s => ({
            periode: saisonLibelle(s.cle),
            gagnant: s.vainqueur?.name || "—",
            detail: s.vainqueur ? `${s.vainqueur.points} pts` : null,
          }))}
        />

        {/* ── Colonne 2 : le mois écoulé ── */}
        <GoatColumn
          variant="mois" icon="🏆"
          kicker="Mois précédent"
          title="MVP du mois"
          subtitle={data.monthly?.label || "Période non renseignée"}
          rows={moisScores.map((v, i) => (
            <GoatRow key={v.name} rank={i + 1} name={v.name} store={v.store} score={v.total}
              isSolo={v.isSolo} breakdown={v.breakdown} suffix="/100" />
          ))}
          emptyLabel="Pas encore de classement mensuel."
          historyLabel="Les mois de la saison"
          emptyHistory="Aucun MVP mensuel décerné depuis le début de la saison."
          history={moisSaison.map(t => ({ periode: t.label, gagnant: t.winner, detail: t.score }))}
        />

        {/* ── Colonne 3 : la semaine écoulée ── */}
        <GoatColumn
          variant="semaine" icon="⭐"
          kicker="Semaine précédente"
          title="MVP de la semaine"
          subtitle={data.weekly?.label || "Période non renseignée"}
          rows={semScores.map((v, i) => (
            <GoatRow key={v.name} rank={i + 1} name={v.name} store={v.store} score={v.total}
              isSolo={v.isSolo} breakdown={v.breakdown} suffix="/100" />
          ))}
          emptyLabel="Pas encore de classement hebdomadaire."
          historyLabel="Les semaines de la saison"
          emptyHistory="Aucun MVP hebdomadaire décerné depuis le début de la saison."
          history={semainesSaison.map(t => ({ periode: t.label, gagnant: t.winner, detail: t.score }))}
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

// Les 8 rubriques du guide : icône et couleur d'accent, purement décoratives —
// elles servent de repère visuel pour retrouver une rubrique d'un coup d'œil.
const GUIDE_META = [
  { id: "adn",        icon: "🎯", c: "#E8612C", wash: "#FDEEE7" },
  { id: "trame",      icon: "🧭", c: "#C98A00", wash: "#FBF0D8" },
  { id: "questions",  icon: "❓", c: "#2E7D6B", wash: "#E6F2EF" },
  { id: "operateurs", icon: "📡", c: "#3E6FB0", wash: "#E8EEF7" },
  { id: "closing",    icon: "🤝", c: "#2E7D53", wash: "#EAF3EE" },
  { id: "obj1",       icon: "💬", c: "#A02724", wash: "#F7EAE9" },
  { id: "obj2",       icon: "🧠", c: "#7A5AA6", wash: "#F0EBF7" },
  { id: "memo",       icon: "📌", c: "#4A4A4A", wash: "#F0EDEA" },
];
const GUIDE_IDS = GUIDE_META.map(g => g.id);

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

  const Section = ({ id, title, hint, children }) => {
    const open = ouverts.has(id);
    const meta = GUIDE_META.find(g => g.id === id) || {};
    const n = GUIDE_IDS.indexOf(id) + 1;
    return (
      <div className={`acc${open ? " open" : ""}`} style={{ "--acc-c": meta.c, "--acc-wash": meta.wash }}>
        <button className="acc-head" onClick={() => bascule(id)} aria-expanded={open}>
          <span className="acc-ico">{meta.icon}</span>
          <span className="acc-title">
            <b>{title}</b>
            {hint && <span>{hint}</span>}
          </span>
          <span className="acc-num">{n}/8</span>
          <span className="acc-chev">▶</span>
        </button>
        <div className="acc-body">
          <div className="acc-inner"><div>{children}</div></div>
        </div>
      </div>
    );
  };

  const Row = ({ k, v }) => (
    <div className="guide-row"><div className="k">{k}</div><div className="v">{v}</div></div>
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
            <div key={t} className="guide-block"><b>{t}</b><span>{d}</span></div>
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

// ─── PROCESS — bibliothèque documentaire ──────────────────────────────────────
// Même logique d'accordéon que le guide Mobileo : replié par défaut, un geste
// pour ouvrir. Les fichiers restent dans le Drive, l'app ne fait que les lister
// à partir de la base Notion « Process ». La recherche vient en premier : en
// magasin on ne cherche pas un thème, on cherche un mot.
const PROCESS_META = {
  "Réparation & atelier": { icon: "🔧", c: "#3E6FB0", wash: "#E8EEF7", hint: "Pièces, rebus, atelier" },
  "Occasion & reprise":   { icon: "📱", c: "#2E7D53", wash: "#EAF3EE", hint: "Reprise, grading, commandes" },
  "Brokers":              { icon: "🤝", c: "#7A5AA6", wash: "#F0EBF7", hint: "Partenaires grands comptes" },
  "Ventes & partenaires": { icon: "🛒", c: "#E8612C", wash: "#FDEEE7", hint: "Forfaits, box, assurances" },
  "SAV & administratif":  { icon: "🛡️", c: "#C98A00", wash: "#FBF0D8", hint: "Garanties, facturation" },
};
const PROCESS_THEMES = Object.keys(PROCESS_META);

const MOIS_COURTS = ["janv.","févr.","mars","avril","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function dateProcess(iso) {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (isNaN(d)) return "date inconnue";
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}
function joursDepuis(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return (Date.now() - d.getTime()) / 86400000;
}

function ProcessPage({ user, items, error, onRefresh, refreshing }) {
  const [q, setQ] = useState("");
  const [ouverts, setOuverts] = useState(() => new Set());
  const estRZ = user.role === "rz";

  const bascule = (t) => setOuverts(prev => {
    const n = new Set(prev);
    n.has(t) ? n.delete(t) : n.add(t);
    return n;
  });

  const recherche = q.trim().toLowerCase();
  const liste = (items || []).filter(p =>
    !recherche || `${p.title} ${p.theme} ${p.note || ""}`.toLowerCase().includes(recherche));

  // Une recherche en cours déplie tout : on veut voir les résultats, pas des titres fermés.
  const themes = PROCESS_THEMES
    .map(t => ({ t, rows: liste.filter(p => p.theme === t) }))
    .filter(g => g.rows.length);
  const autres = liste.filter(p => !PROCESS_THEMES.includes(p.theme));
  if (autres.length) themes.push({ t: "Autres", rows: autres });

  const vieux = (items || []).filter(p => (joursDepuis(p.updated) ?? 0) > 730).length;

  if (error) {
    return (
      <div className="stack">
        <h1 className="h-screen">Process</h1>
        <ErrorBanner message={error} onRetry={onRefresh} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="ctx" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="h-screen">Process</h1>
          <p>
            {(items || []).length} process · classés par thème · les documents restent dans le Drive
            {estRZ && vieux > 0 && ` · ${vieux} de plus de deux ans`}
          </p>
        </div>
        {estRZ && onRefresh && (
          <Btn size="sm" variant="ghost" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Lecture…" : "Rafraîchir"}
          </Btn>
        )}
      </div>

      <div className="proc-tools">
        <input
          className="proc-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un process (ex : rebus, acompte, Karapass…)"
        />
      </div>

      {!items?.length ? (
        <Card><div className="proc-empty">Aucun process n'est publié pour le moment.</div></Card>
      ) : !themes.length ? (
        <Card><div className="proc-empty">Aucun process ne correspond à cette recherche.</div></Card>
      ) : (
        <Card className="pad-0">
          {themes.map(({ t, rows }) => {
            const meta = PROCESS_META[t] || { icon: "📄", c: C.gray600, wash: C.gray50, hint: "" };
            const open = recherche ? true : ouverts.has(t);
            return (
              <div key={t} className={`acc${open ? " open" : ""}`} style={{ "--acc-c": meta.c, "--acc-wash": meta.wash }}>
                <button className="acc-head" onClick={() => bascule(t)} aria-expanded={open}>
                  <span className="acc-ico">{meta.icon}</span>
                  <span className="acc-title">
                    <b>{t}</b>
                    {meta.hint && <span>{meta.hint}</span>}
                  </span>
                  <span className="acc-num">{rows.length}</span>
                  <span className="acc-chev">▶</span>
                </button>
                <div className="acc-body">
                  <div className="acc-inner">
                    <div>
                      {rows.map(p => <ProcessRow key={p.id} p={p} estRZ={estRZ} />)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function ProcessRow({ p, estRZ }) {
  const j = joursDepuis(p.updated);
  const nouveau = j != null && j <= 30;
  const aRevoir = j != null && j > 730;
  const fmt = (p.format || "PDF").toLowerCase() === "word" ? "word" : "pdf";
  return (
    <div className="proc-row">
      <span className={`proc-fmt ${fmt}`}>{fmt === "word" ? "WORD" : "PDF"}</span>
      <div className="proc-main">
        <div className="proc-title">
          {p.title}
          {nouveau && <span className="proc-tag new">NOUVEAU</span>}
          {!nouveau && aRevoir && estRZ && <span className="proc-tag old">À REVOIR</span>}
          {p.audience === "Public externe" && <span className="proc-tag ext">PUBLIC EXTERNE</span>}
          {estRZ && !p.published && <span className="proc-tag off">NON PUBLIÉ</span>}
        </div>
        <div className="proc-meta">
          Mis à jour le {dateProcess(p.updated)}
          {p.audience && p.audience !== "Tous" && p.audience !== "Public externe" && ` · ${p.audience}`}
        </div>
        {estRZ && p.note && <div className="proc-note">{p.note}</div>}
      </div>
      {p.url
        ? <a className="btn btn-primary btn-sm" href={p.url} target="_blank" rel="noreferrer">Ouvrir</a>
        : <span className="proc-tag off">Lien manquant</span>}
    </div>
  );
}

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
  const [processList, setProcessList] = useState([]);
  const [processError, setProcessError] = useState("");
  const [lastLoaded, setLastLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [serverState, setServerState] = useState("checking"); // checking | waking | ok | down

  const mois = moisPourDonnees(results);

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
    setError(""); setGoatError(""); setVendorsError(""); setProcessError("");
    const q = refresh ? "?refresh=1" : "";
    try {
      const [r, v, h, g, vd, ac, pc] = await Promise.all([
        api.get(`/api/results${q}`),
        // Une panne de la base Visites ne doit pas masquer les résultats.
        api.get(`/api/visits${q}`).catch(() => ({ visits: [] })),
        api.get(`/api/history${q}`).catch(() => ({ months: [], byStore: {} })),
        api.get(`/api/goat${q}`).catch(e => { setGoatError(e.message || "lecture impossible"); return null; }),
        api.get(`/api/vendors${q}`).catch(e => { setVendorsError(e.message || "endpoint indisponible"); return null; }),
        api.get(`/api/actions${q}`).catch(() => ({ actions: [] })),
        // La bibliothèque de process ne doit jamais bloquer l'affichage des résultats.
        api.get(`/api/process${q}`).catch(e => { setProcessError(e.message || "lecture impossible"); return { process: [] }; }),
      ]);
      setResults(cleanNotionText(r));
      setVisits(v.visits);
      setHistory(h);
      setGoatData(g);
      setVendors(vd?.vendors || null);
      setActions(ac?.actions || []);
      setProcessList(pc?.process || []);
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
    setVendors(null); setActions([]); setProcessList([]); setLastLoaded(null);
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

  const Styles = () => <style dangerouslySetInnerHTML={{ __html: STYLES }} />;

  if (!user) return <><Styles /><LoginScreen serverState={serverState} onRetryPing={checkServer} onLogin={(u) => { setUser(u); setPage("dashboard"); }} /></>;

  const nav = [
    { id: "dashboard", label: "Vue d'ensemble" },
    { id: "store",     label: "Magasins" },
    { id: "results",   label: "Résultats" },
    { id: "history",   label: "Historique" },
    { id: "goat",      label: "GOAT" },
    { id: "guide",     label: "Guide Mobileo" },
    { id: "process",   label: "Process" },
    { id: "visits",    label: "Visites" },
  ];
  const navActive = page;
  const dataStamp = results?.updated
    ? `Données au ${results.updated}`
    : lastLoaded ? `Données ${stampLabel(lastLoaded)}` : "—";

  return (
    <>
      <Styles />
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
            {(loading || refreshing) ? "Lecture Notion…" : dataStamp}
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
            {dataStamp}
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
                {page === "process" && (
                  <ProcessPage user={user} items={processList} error={processError}
                    onRefresh={() => loadAll(true)} refreshing={refreshing} />
                )}
                {!results && !error && <Spinner />}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
