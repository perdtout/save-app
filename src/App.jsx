import { useState, useEffect, useCallback } from "react";
import logoRepairMobile from "./RepairMobile.png";

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION — change cette URL pour pointer vers ton backend
//  En local : "http://localhost:3001"
//  En ligne : "https://ton-app.up.railway.app" (ou Render/Fly)
// ═══════════════════════════════════════════════════════════════════════════
const API_URL = "https://save-backend-cn9b.onrender.com";

// ─── DESIGN TOKENS — Juvi-Group ──────────────────────────────────────────────
const C = {
  // Charte Repair Mobile : anthracite foncé (REPAIR) + orange vif (MOBILE)
  navy: "#2B2B2B", navyMid: "#363636", navyL: "#4A4A4A",
  accent: "#E8612C", accentB: "#FF8A50", white: "#FFFFFF",
  bg: "#F7F5F3", gray50: "#F0EDEA", gray200: "#D6CFC8",
  gray400: "#8A847E", gray600: "#5A544E",
  ok: "#22C55E", warn: "#F59E0B", bad: "#EF4444", text: "#2B2B2B",
};

const STORES_ORDER = ["Pontarlier", "Lons-le-Saunier", "Dijon", "Besançon", "Chalon-sur-Saône"];

// Liens directs vers les pages Notion d'analyse détaillée
const NOTION_PAGE1_URL = "https://www.notion.so/379b706fb59681b68663eb4920323d27";
const NOTION_PAGE2_URL = "https://www.notion.so/379b706fb596813ebfe1d33c85a87531";

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
    margeAcc: Object.values(d?.accessoires || {}).reduce((s, v) => s + (v.margeAcc || 0), 0),
    margeGP: Object.values(d?.gp || {}).reduce((s, v) => s + (v.margeGP || 0), 0),
    occasion: Object.values(d?.occasion || {}).reduce((s, v) => s + (v.volume || 0), 0),
    mobileo: Object.values(d2?.mobileo || {}).reduce((s, v) => s + (v.total || 0), 0),
    atm: Object.values(d2?.atm || {}).reduce((s, v) => s + (v.total || 0), 0),
  };

  // ─── Synthèse automatique : calcule points forts / points faibles ───────────
  const computeSynthese = () => {
    const forts = [], faibles = [];
    for (const store of stores) {
      const acc = d?.accessoires?.[store], gp = d?.gp?.[store], occ = d?.occasion?.[store];
      const mob = d2?.mobileo?.[store], atm = d2?.atm?.[store];
      // Accessoires
      if (acc?.ratio != null) {
        if (acc.ratio >= 25) forts.push(`${store} — Accessoires ${acc.ratio}%`);
        else if (acc.ratio < 20) faibles.push(`${store} — Accessoires ${acc.ratio}% (obj. 25%)`);
      }
      // GP
      if (gp?.ratio != null) {
        if (gp.ratio >= 20) forts.push(`${store} — GP ${gp.ratio}%`);
        else if (gp.ratio < 18) faibles.push(`${store} — GP ${gp.ratio}% (obj. 20%)`);
      }
      // Occasion
      if (occ?.volume != null && occ?.objectif) {
        const pct = Math.round((occ.volume / occ.objectif) * 100);
        if (pct >= 100) forts.push(`${store} — Occasion ${occ.volume}/${occ.objectif}`);
        else if (pct < 40) faibles.push(`${store} — Occasion ${occ.volume}/${occ.objectif}`);
      }
      // Mobileo
      if (mob?.total != null) {
        if (mob.total >= 10) forts.push(`${store} — Mobileo ${mob.total} contrats`);
        else if (mob.total === 0) faibles.push(`${store} — Mobileo : aucun contrat`);
      }
      // ATM
      if (atm?.ratio != null && atm?.mobOcc > 0) {
        if (atm.ratio >= 10) forts.push(`${store} — ATM ${atm.ratio}%`);
        else if (atm.ratio === 0) faibles.push(`${store} — ATM 0% (obj. 10%)`);
      }
    }
    return { forts, faibles };
  };
  const synthese = computeSynthese();
  // Fait marquant / "Ce que je retiens de cette journée" (depuis Notion)
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
          <a href={NOTION_PAGE1_URL} target="_blank" rel="noopener noreferrer">
            <Btn size="sm" variant="secondary">📄 Analyse détaillée — Page 1</Btn>
          </a>
          <a href={NOTION_PAGE2_URL} target="_blank" rel="noopener noreferrer">
            <Btn size="sm" variant="secondary">📄 Analyse détaillée — Page 2</Btn>
          </a>
        </div>
      </div>

      {user.role === "rz" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {[
            { label: "Marge totale zone", val: eur(tz.margeTotal), icon: "💰" },
            { label: "Ratio Accessoires", val: tz.margeTotal ? `${((tz.margeAcc / tz.margeTotal) * 100).toFixed(1)}%` : "—", icon: "🛒" },
            { label: "Ratio GP zone", val: tz.margeTotal ? `${((tz.margeGP / tz.margeTotal) * 100).toFixed(1)}%` : "—", icon: "🛡️" },
            { label: "Mobiles Occasion", val: `${tz.occasion} unités`, icon: "📱" },
            { label: "Forfaits Mobileo", val: `${tz.mobileo} contrats`, icon: "📶" },
            { label: "Contrats ATM", val: `${tz.atm} sur ${tz.occasion} occ.`, icon: "🔒" },
          ].map(({ label, val, icon }) => (
            <Card key={label} style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{val}</div>
              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── ENCART SYNTHÈSE : Points forts / Points faibles ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card style={{ borderTop: `3px solid ${C.ok}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>✓ Points forts</div>
          {synthese.forts.length === 0 ? (
            <div style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>Aucun objectif pleinement atteint ce mois-ci.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {synthese.forts.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: C.text, display: "flex", gap: 7, alignItems: "flex-start", lineHeight: 1.5 }}>
                  <span style={{ color: C.ok, flexShrink: 0 }}>●</span>{f}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card style={{ borderTop: `3px solid ${C.bad}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.bad, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>⚠ Points à travailler</div>
          {synthese.faibles.length === 0 ? (
            <div style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>Aucun point critique. Bon mois !</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {synthese.faibles.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: C.text, display: "flex", gap: 7, alignItems: "flex-start", lineHeight: 1.5 }}>
                  <span style={{ color: C.bad, flexShrink: 0 }}>●</span>{f}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Ce que je retiens de cette journée (fait marquant) */}
      {faits.length > 0 && (
        <Card accent={C.accent}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>⭐ Ce que je retiens de cette journée</div>
          {faits.map((f, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0", fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{f}</p>
          ))}
        </Card>
      )}

      {/* Mes retours par magasin (synthèse des commentaires Notion) */}
      {(() => {
        const retours = [];
        for (const store of stores) {
          const items = [
            d?.analysis?.accessoires?.[store],
            d?.analysis?.gp?.[store],
            d2?.analysis?.mobileo?.[store],
            d2?.analysis?.atm?.[store],
          ].filter(Boolean);
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
                    {items.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.55, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ color: C.accent, flexShrink: 0 }}>•</span>{t}
                      </div>
                    ))}
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
            { k: "GP", v: gp?.ratio, suf: "%", s: gp?.status },
            { k: "Occ.", v: occ?.volume, suf: "", s: occ?.volume >= occ?.objectif ? "ok" : "bad" },
            { k: "Mob.", v: mob?.total, suf: "", s: mob?.total >= 10 ? "ok" : "bad" },
            { k: "ATM", v: atm?.ratio, suf: "%", s: atm?.status },
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

// ─── ANALYSIS LIST (commentaires RZ) ─────────────────────────────────────────
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

// ─── RESULTS PAGE (Page 1 + Page 2) ──────────────────────────────────────────
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
                  <TD a="center" >{trendLabel(a.trend)}</TD><TD><Gauge value={a.ratio} max={40} target={25} color={statusC(a.status)} /></TD>
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

          {v.objectifsAtteints && (
            <div style={{ fontSize: 12, color: C.gray600, marginBottom: 10 }}>Objectifs : <strong>{v.objectifsAtteints}</strong></div>
          )}

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
          {v.prochainRdv && (
            <div style={{ fontSize: 12, color: C.gray600 }}>📅 Prochain RDV : <strong>{v.prochainRdv}</strong></div>
          )}
        </Card>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── HISTORY PAGE — courbes de progression mois par mois ─────────────────────

// Jours fériés français (fixes + mobiles via Pâques) pour une année donnée
function joursFeries(annee) {
  const feries = new Set([
    `${annee}-01-01`, `${annee}-05-01`, `${annee}-05-08`, `${annee}-07-14`,
    `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`,
  ]);
  // Calcul de Pâques (algorithme de Meeus)
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(annee, mois - 1, jour);
  const addJours = (date, n) => { const dt = new Date(date); dt.setDate(dt.getDate() + n); return dt; };
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  feries.add(iso(addJours(paques, 1)));   // Lundi de Pâques
  feries.add(iso(addJours(paques, 39)));  // Ascension
  feries.add(iso(addJours(paques, 50)));  // Lundi de Pentecôte
  return feries;
}

// Nombre de jours travaillés (mardi→samedi, hors fériés) dans un mois,
// jusqu'à une date limite optionnelle (incluse). Sinon tout le mois.
function joursOuvres(annee, mois, jusquau = null) {
  const feries = joursFeries(annee);
  const dernierJour = new Date(annee, mois, 0).getDate();
  const limite = jusquau != null ? Math.min(jusquau, dernierJour) : dernierJour;
  let n = 0;
  for (let j = 1; j <= limite; j++) {
    const dt = new Date(annee, mois - 1, j);
    const jourSem = dt.getDay(); // 0=dim, 1=lun, ..., 6=sam
    const estOuvre = jourSem >= 2 && jourSem <= 6; // mardi(2) → samedi(6)
    const iso = `${annee}-${String(mois).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
    if (estOuvre && !feries.has(iso)) n++;
  }
  return n;
}

// Détermine si une clé "AAAA-MM" correspond au mois en cours
function estMoisEnCours(moisKey) {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return moisKey === cur;
}

// Projette la valeur d'un volume du mois en cours sur le mois complet
function projeterVolume(valeurActuelle, moisKey) {
  if (valeurActuelle == null) return null;
  const [annee, mois] = moisKey.split("-").map(Number);
  const now = new Date();
  const jourAuj = now.getDate();
  const ecoules = joursOuvres(annee, mois, jourAuj);
  const total = joursOuvres(annee, mois);
  if (ecoules <= 0) return null;
  return { projete: Math.round((valeurActuelle / ecoules) * total), ecoules, total };
}

// ─── Analyse automatique d'une série de chiffres ─────────────────────────────
function analyzeSeries(points, { suffix = "", target = null, higherIsBetter = true }) {
  const pts = points.filter(p => p.value != null);
  if (pts.length < 2) return null;
  const vals = pts.map(p => p.value);
  const first = vals[0], last = vals[vals.length - 1];
  const delta = +(last - first).toFixed(1);
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);

  // Régularité : écart-type relatif (variations mois à mois)
  const diffs = [];
  for (let i = 1; i < vals.length; i++) diffs.push(Math.abs(vals[i] - vals[i - 1]));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const amplitude = maxV - minV;
  const regulier = amplitude === 0 ? true : (avgDiff / (Math.abs(avg) || 1)) < 0.15;

  // Tendance sur les 3 derniers points
  const recent = vals.slice(-3);
  const recentTrend = recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0;

  // Détermination du sens
  let sens, couleur, icone;
  const seuil = Math.max(0.1, Math.abs(avg) * 0.02);
  if (Math.abs(delta) <= seuil) { sens = "stable"; couleur = C.gray600; icone = "➡️"; }
  else {
    const positif = higherIsBetter ? delta > 0 : delta < 0;
    sens = delta > 0 ? "hausse" : "baisse";
    couleur = positif ? C.ok : C.bad;
    icone = delta > 0 ? "📈" : "📉";
  }

  // Construction de la phrase
  const fmt = (v) => `${v}${suffix}`;
  const nbMois = pts.length;
  let phrase = "";
  if (sens === "stable") {
    phrase = `Stable autour de ${fmt(avg)} sur ${nbMois} mois.`;
  } else {
    const motSens = sens === "hausse" ? "Progression" : "Repli";
    phrase = `${motSens} de ${delta > 0 ? "+" : ""}${fmt(delta)} sur ${nbMois} mois (de ${fmt(first)} à ${fmt(last)}).`;
  }
  // régularité
  phrase += regulier ? ` Évolution régulière.` : ` Évolution irrégulière (de ${fmt(minV)} à ${fmt(maxV)}).`;
  // inflexion récente
  if (pts.length >= 4 && Math.abs(recentTrend) > seuil) {
    const recOk = higherIsBetter ? recentTrend > 0 : recentTrend < 0;
    phrase += recentTrend > 0
      ? ` Tendance récente à la hausse${recOk ? " 👍" : ""}.`
      : ` Tendance récente à la baisse${recOk ? "" : " ⚠️"}.`;
  }
  // objectif
  if (target != null) {
    const okCount = vals.filter(v => higherIsBetter ? v >= target : v <= target).length;
    if (okCount === nbMois) phrase += ` Objectif (${fmt(target)}) tenu sur toute la période.`;
    else if (okCount === 0) phrase += ` Jamais au niveau de l'objectif (${fmt(target)}).`;
    else phrase += ` Objectif atteint ${okCount}/${nbMois} mois.`;
  }

  return { phrase, couleur, icone, delta, suffix, avg, last };
}

function MiniLineChart({ data, label, suffix = "", target, color = C.accent, higherIsBetter = true, isVolume = false }) {
  const points = data.filter(d => d.value != null);
  if (points.length === 0) return null;

  // Mois en cours : dernier point si sa clé = mois courant
  const lastIdx = points.length - 1;
  const lastMois = points[lastIdx]?.mois;
  const enCours = lastMois && estMoisEnCours(lastMois);

  // Projection (volumes uniquement) pour le mois en cours
  let projection = null;
  if (enCours && isVolume) {
    projection = projeterVolume(points[lastIdx].value, lastMois);
  }

  // Série d'analyse : on EXCLUT le mois en cours (incomplet)
  const analysisPoints = enCours ? points.slice(0, -1) : points;

  // Points à tracer : on ajoute un point fantôme "projeté" si volume en cours
  const drawPoints = points.map((p, i) => ({
    ...p,
    estEnCours: enCours && i === lastIdx,
  }));

  const values = drawPoints.map(p => p.value);
  const projValue = projection ? projection.projete : null;
  const allValuesForScale = projValue != null ? [...values, projValue] : values;
  const rawMax = Math.max(...allValuesForScale, target != null ? target : -Infinity);
  const rawMin = Math.min(...allValuesForScale, target != null ? target : Infinity);
  const span = (rawMax - rawMin) || Math.abs(rawMax) || 1;
  const maxV = rawMax + span * 0.15;
  const minV = Math.max(0, rawMin - span * 0.15);
  const range = (maxV - minV) || 1;
  const W = 340, H = 150, padX = 12, padTop = 22, padBot = 26;
  const plotH = H - padTop - padBot;
  const plotW = W - padX * 2;
  const stepX = drawPoints.length > 1 ? plotW / (drawPoints.length - 1) : 0;
  const xy = drawPoints.map((p, i) => ({
    x: padX + i * stepX,
    y: padTop + plotH - ((p.value - minV) / range) * plotH,
    v: p.value, mois: p.mois, estEnCours: p.estEnCours,
  }));

  // Courbe lissée (Catmull-Rom -> Bézier) pour un rendu plus agréable
  const smoothPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  // On lisse jusqu'à l'avant-dernier point si le dernier est "en cours" (trait plein),
  // puis on relie en pointillé vers le mois en cours.
  const solidPts = enCours ? xy.slice(0, -1) : xy;
  const linePath = smoothPath(solidPts.length >= 2 ? solidPts : xy);
  const baseY = padTop + plotH;
  const refPts = solidPts.length >= 2 ? solidPts : xy;
  const areaPath = `${linePath} L ${refPts[refPts.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} L ${refPts[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`;
  const targetY = target != null ? padTop + plotH - ((target - minV) / range) * plotH : null;
  const gid = `grad-${label.replace(/[^a-z]/gi, "")}`;
  const labelEvery = drawPoints.length <= 6 ? 1 : drawPoints.length <= 12 ? 2 : 3;
  const analysis = analyzeSeries(analysisPoints, { suffix, target, higherIsBetter });
  const last = enCours ? null : values[values.length - 1];
  const lastComplete = analysisPoints.length ? analysisPoints[analysisPoints.length - 1].value : values[values.length - 1];
  const lastXY = xy[xy.length - 1];

  const gridYs = [0.25, 0.5, 0.75].map(f => padTop + plotH * f);

  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: "0.01em" }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{lastComplete}{suffix}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 150, display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* grille */}
        {gridYs.map((gy, i) => (
          <line key={i} x1={padX} y1={gy} x2={W - padX} y2={gy} stroke={C.gray50} strokeWidth="1" />
        ))}
        {/* ligne objectif */}
        {targetY != null && targetY > padTop && targetY < baseY && (
          <>
            <line x1={padX} y1={targetY} x2={W - padX} y2={targetY} stroke={C.warn} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.7" />
            <text x={W - padX} y={targetY - 5} textAnchor="end" fontSize="8.5" fontWeight="600" fill={C.warn}>objectif {target}{suffix}</text>
          </>
        )}
        {/* aire + courbe (mois complets) */}
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
        {/* segment pointillé vers le mois en cours (incomplet) */}
        {enCours && xy.length >= 2 && (
          <line x1={xy[xy.length - 2].x} y1={xy[xy.length - 2].y} x2={lastXY.x} y2={lastXY.y}
            stroke={color} strokeWidth="2" strokeDasharray="3 3" opacity="0.55" />
        )}
        {/* points */}
        {xy.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === xy.length - 1 ? "4.5" : "2.5"}
            fill={p.estEnCours ? C.white : (i === xy.length - 1 ? color : C.white)}
            stroke={color} strokeWidth={i === xy.length - 1 ? "2" : "1.5"}
            strokeDasharray={p.estEnCours ? "2 1.5" : "0"} />
        ))}
        {/* valeur du dernier point complet */}
        {!enCours && (
          <text x={Math.min(lastXY.x, W - padX - 14)} y={Math.max(lastXY.y - 11, padTop - 2)} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={color}>{last}{suffix}</text>
        )}
        {/* labels axe X */}
        {xy.map((p, i) => (
          (i % labelEvery === 0 || i === xy.length - 1) ? (
            <text key={`l${i}`} x={p.x} y={H - 8} textAnchor="middle" fontSize="8.5"
              fill={p.estEnCours ? C.accent : C.gray400} fontWeight={p.estEnCours ? "700" : "400"}>
              {p.mois.slice(5)}/{p.mois.slice(2, 4)}{p.estEnCours ? "*" : ""}
            </text>
          ) : null
        ))}
      </svg>

      {/* Bandeau mois en cours / projection */}
      {enCours && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: C.accent + "12", borderRadius: 6, fontSize: 11, color: C.gray600, lineHeight: 1.5 }}>
          {projection
            ? <><strong style={{ color: C.accent }}>* {lastMois.slice(5)}/{lastMois.slice(0, 4)} en cours</strong> : {points[lastIdx].value}{suffix} à ce jour ({projection.ecoules}/{projection.total} j. travaillés). Projection fin de mois ≈ <strong style={{ color: C.navy }}>{projection.projete}{suffix}</strong>.</>
            : <><strong style={{ color: C.accent }}>* {lastMois.slice(5)}/{lastMois.slice(0, 4)} en cours</strong> : {points[lastIdx].value}{suffix} à ce jour (mois incomplet, exclu de l'analyse de tendance).</>}
        </div>
      )}

      {analysis ? (
        <div style={{ marginTop: 10, paddingTop: 11, borderTop: `1px solid ${C.gray50}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.3 }}>{analysis.icone}</span>
          <span style={{ fontSize: 12, color: C.text, lineHeight: 1.55 }}>{analysis.phrase}</span>
        </div>
      ) : (
        <div style={{ marginTop: 10, paddingTop: 11, borderTop: `1px solid ${C.gray50}`, fontSize: 11.5, color: C.gray400, fontStyle: "italic" }}>
          Pas assez de mois complets pour analyser la tendance.
        </div>
      )}
    </Card>
  );
}

function HistoryPage({ user, history }) {
  const isRZ = user.role === "rz";
  const [selStore, setSelStore] = useState(isRZ ? STORES_ORDER[0] : user.store);
  const byStore = history?.byStore || {};
  const months = history?.months || [];

  // Fenêtre glissante : 18 derniers mois maximum
  const fullData = byStore[selStore] || [];
  const storeData = fullData.slice(-18);
  const mkSeries = (key) => storeData.map(r => ({ mois: r.mois, value: r[key] }));
  const periodeLabel = storeData.length
    ? `${storeData[0].mois} → ${storeData[storeData.length - 1].mois} (${storeData.length} mois)`
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Historique & progression</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>
            {isRZ ? selStore : "Votre magasin"}{periodeLabel ? ` · ${periodeLabel}` : ""}
          </p>
        </div>
        {isRZ && (
          <select value={selStore} onChange={e => setSelStore(e.target.value)}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "inherit", color: C.navy, background: C.white, cursor: "pointer" }}>
            {STORES_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {months.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "28px 0", color: C.gray400 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13 }}>Aucun historique pour l'instant.<br />L'archivage se remplit mois après mois dans Notion.</div>
          </div>
        </Card>
      ) : storeData.length < 2 ? (
        <Card accent={C.accent}>
          <div style={{ fontSize: 13, color: C.gray600, lineHeight: 1.6 }}>
            <strong style={{ color: C.navy }}>{selStore}</strong> — un seul mois archivé pour l'instant ({storeData[0]?.mois}). Les courbes de progression apparaîtront dès qu'un deuxième mois sera enregistré.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          <MiniLineChart data={mkSeries("accessoires")} label="Ratio Accessoires" suffix="%" target={25} color="#E8612C" />
          <MiniLineChart data={mkSeries("gp")} label="Ratio GP" suffix="%" target={20} color="#FF8A50" />
          <MiniLineChart data={mkSeries("occasion")} label="Mobiles Occasion" suffix="" target={storeData[storeData.length - 1]?.objectifOccasion} color="#C04A1E" isVolume />
          <MiniLineChart data={mkSeries("mobileo")} label="Forfaits Mobileo" suffix="" target={10} color="#E8612C" isVolume />
          <MiniLineChart data={mkSeries("atm")} label="Ratio ATM" suffix="%" target={10} color="#FF8A50" />
          <MiniLineChart data={mkSeries("margeTotale")} label="Marge Totale" suffix="€" color="#2B2B2B" isVolume />
        </div>
      )}
    </div>
  );
}

// ─── GUIDE VENTES MOBILEO — contenu des 9 pages du guide de formation ────────
function GuidePage() {
  const [open, setOpen] = useState("adn");

  const Section = ({ id, icon, title, children }) => {
    const isOpen = open === id;
    return (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <button onClick={() => setOpen(isOpen ? "" : id)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", border: "none", background: isOpen ? C.accent : C.white, color: isOpen ? C.white : C.navy, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, textAlign: "left" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>{icon}</span>{title}</span>
          <span style={{ fontSize: 18, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
        </button>
        {isOpen && <div style={{ padding: "16px 18px", borderTop: `1px solid ${C.gray50}` }}>{children}</div>}
      </Card>
    );
  };

  const Phrase = ({ children }) => (
    <div style={{ background: C.bg, borderLeft: `3px solid ${C.accent}`, borderRadius: 6, padding: "10px 14px", margin: "8px 0", fontSize: 13, fontStyle: "italic", color: C.text, lineHeight: 1.6 }}>« {children} »</div>
  );
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.gray50}`, fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: C.navy, minWidth: 130, flexShrink: 0 }}>{k}</div>
      <div style={{ color: C.text }}>{v}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>Guide Ventes Mobileo</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>Trame de découverte client — offres mobiles · support terrain</p>
      </div>

      <Section id="adn" icon="🧬" title="1. L'ADN commercial attendu">
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 }}>
          <div><strong style={{ color: C.navy }}>Conseiller avant de vendre.</strong> Le client vient d'abord pour une réparation ou un problème. La proposition Mobileo doit être présentée comme un service utile, pas comme une vente forcée.</div>
          <div><strong style={{ color: C.navy }}>Rendre la proposition systématique.</strong> Le potentiel vient de la régularité. Si la question n'est pas posée, aucune vente ne peut se déclencher.</div>
          <div><strong style={{ color: C.navy }}>Faire parler le client.</strong> Une bonne vente commence par des questions ouvertes. Le client doit parler plus que le vendeur.</div>
          <div><strong style={{ color: C.navy }}>Reformuler avant d'argumenter.</strong> La reformulation montre qu'on écoute et permet de répondre précisément à l'objection.</div>
          <div><strong style={{ color: C.navy }}>Rester crédible.</strong> Lorsque l'offre actuelle du client est réellement meilleure, on le reconnaît. Cela renforce la confiance.</div>
          <Phrase>Je ne vous propose pas de changer pour changer. Je vous propose simplement de vérifier si votre offre est encore adaptée à votre usage.</Phrase>
        </div>
      </Section>

      <Section id="trame" icon="🗺️" title="2. Trame complète de A à Z">
        <Row k="1. Accueil" v="Prendre en charge le besoin principal : réparation, diagnostic, protection." />
        <Row k="2. Accroche" v={'"Je me permets de vous demander chez quel opérateur vous êtes actuellement ?"'} />
        <Row k="3. Présentation" v={'"Chez Repair Mobile, on répare et protège les téléphones, et on peut aussi étudier votre forfait mobile."'} />
        <Row k="4. Découverte" v="Comprendre prix, réseau, data, Suisse, engagement, box, satisfaction." />
        <Row k="5. Vérification" v="Application opérateur ou facture : prix réel + consommation data." />
        <Row k="6. Proposition" v="Comparer l'offre actuelle avec une solution adaptée." />
        <Row k="7. Objection" v="Reformuler, rassurer, puis répondre." />
        <Row k="8. Closing" v={'"On le met en place ensemble maintenant ?"'} />
        <div style={{ marginTop: 10, fontSize: 12, color: C.gray600, fontStyle: "italic" }}>À éviter : les questions fermées comme "Ça vous intéresse ?" trop tôt. Préférer : "Qu'est-ce qui est important pour vous dans votre forfait ?"</div>
      </Section>

      <Section id="questions" icon="❓" title="3. Les bonnes questions de découverte">
        <Row k="Opérateur" v="Chez quel opérateur êtes-vous actuellement ? Depuis combien de temps ?" />
        <Row k="Prix" v="Savez-vous combien vous payez réellement chaque mois ?" />
        <Row k="Usage" v="Vous utilisez surtout internet, appels, partage de connexion, vidéos, GPS ?" />
        <Row k="Data" v="On peut regarder ensemble votre consommation réelle ?" />
        <Row k="Réseau" v="Vous captez bien partout : maison, travail, trajets, vacances ?" />
        <Row k="Suisse" v="Avez-vous besoin d'utiliser votre forfait en Suisse ?" />
        <Row k="Satisfaction" v="Quand vous avez un problème, êtes-vous bien accompagné ?" />
        <Row k="Frein" v="Qu'est-ce qui vous retiendrait aujourd'hui de changer ?" />
        <div style={{ marginTop: 10, fontSize: 12, color: C.gray600, fontStyle: "italic" }}>Objectif : ne pas deviner. Faire constater au client lui-même son prix, son usage et ses irritants.</div>
      </Section>

      <Section id="operateur" icon="📡" title="4. Approche selon l'opérateur">
        <Row k="Orange" v="Service et proximité : « Vous aimez le réseau Orange. En revanche, êtes-vous satisfait de l'accompagnement quand vous avez besoin d'aide ? »" />
        <Row k="SFR" v="Incertitude / changement : « Avec les évolutions du marché, savez-vous comment votre offre peut évoluer demain ? Nous pouvons vous proposer une solution stable sur réseau Orange. »" />
        <Row k="Free" v="Prix ou réseau : « Qu'est-ce qui vous a poussé à aller chez Free : le prix, la data, ou autre chose ? » Puis vérifier la qualité réseau." />
        <Row k="Bouygues" v="Adéquation de l'offre : « Regardons si votre forfait correspond toujours à votre usage actuel et si une économie est possible. »" />
        <Row k="Client Suisse" v="Honnêteté : « Si votre offre Suisse est très avantageuse, je vous le dirai. L'objectif est de vous conseiller correctement. »" />
        <div style={{ marginTop: 10, fontSize: 12, color: C.gray600, fontStyle: "italic" }}>Règle : chaque opérateur donne un angle d'entrée, mais la proposition doit toujours rester personnalisée.</div>
      </Section>

      <Section id="closing" icon="🤝" title="5. Argumentation et closing">
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 }}>
          <div><strong style={{ color: C.navy }}>Argumenter par bénéfice client.</strong> Ne pas vendre uniquement des gigas. Traduire l'offre en bénéfices : économie, réseau, simplicité, accompagnement, proximité.</div>
          <div><strong style={{ color: C.navy }}>Faire constater le besoin.</strong> « Vous avez un forfait 150 Go, mais vous consommez 8 Go. Aujourd'hui, votre forfait est surdimensionné par rapport à votre usage. »</div>
          <div><strong style={{ color: C.navy }}>Rassurer sur la simplicité.</strong> « On s'occupe de la mise en place avec vous. L'objectif est que ce soit clair, net et transparent. »</div>
          <div style={{ marginTop: 4, fontWeight: 700, color: C.navy }}>Formules de closing selon la situation :</div>
        </div>
        <div style={{ marginTop: 8 }}>
          <Row k="Client intéressé" v={'"On le met en place ensemble maintenant ?"'} />
          <Row k="Client hésitant" v={'"Qu\'est-ce qui vous manque pour être rassuré ?"'} />
          <Row k="Client pressé" v={'"Je note les éléments et on reprend au moment de la restitution."'} />
          <Row k="Client refuse" v={'"Aucun souci. Si votre besoin évolue, on reste disponible."'} />
        </div>
      </Section>

      <Section id="obj1" icon="💬" title="6. Objections fréquentes — prix et opérateur">
        <Row k="Je vais réfléchir" v="Si je comprends bien, la proposition vous intéresse mais vous voulez être rassuré avant de décider ?" />
        <Row k="Je paie déjà peu cher" v="Regardons ensemble si ce prix correspond vraiment à votre usage et s'il y a des options cachées." />
        <Row k="C'est trop cher" v="Qu'est-ce qui est le plus important pour vous : le prix le plus bas ou le bon équilibre prix, réseau et service ?" />
        <Row k="Je n'utilise pas internet" v="Justement, il existe peut-être une offre plus adaptée à votre consommation réelle." />
        <Row k="J'ai une offre avec ma box" v="Votre box n'est pas impactée. Nous parlons uniquement de votre ligne mobile." />
        <Row k="Je suis bien chez Orange" v="Vous appréciez le réseau Orange. Et côté service, quand vous avez besoin d'aide, vous êtes satisfait ?" />
        <Row k="Je préfère la boutique" v="C'est possible. Ici, l'avantage est que nous vous accompagnons directement et restons disponibles." />
        <Row k="Free pour le prix" v="Le prix est important. Vérifions aussi si le réseau et l'usage correspondent bien à vos besoins." />
      </Section>

      <Section id="obj2" icon="🧠" title="7. Objections — peur, temps et décision">
        <Row k="Je n'aime pas changer" v="Je comprends. Ce que je vous propose, c'est de vérifier, pas de changer sans raison." />
        <Row k="J'ai peur que ça coupe" v="La portabilité est prévue pour limiter ce risque et nous vous accompagnons dans les étapes." />
        <Row k="Je ne connais pas votre offre" v="C'est justement notre rôle de vous l'expliquer simplement et de comparer avec votre offre actuelle." />
        <Row k="Je suis engagé" v="Regardons votre situation avant de conclure quoi que ce soit." />
        <Row k="Demander à mon conjoint" v="Bien sûr. On peut préparer les éléments pour que vous puissiez lui expliquer clairement." />
        <Row k="Je n'ai pas le temps" v="L'étude est rapide. Sinon, je note et on reprend à la restitution du téléphone." />
        <Row k="Mauvaise expérience" v="Je comprends votre prudence. Justement, on avance étape par étape, de façon claire." />
        <Row k="Non merci" v="Aucun souci. Je vous le propose car cela peut être utile, mais la décision vous appartient." />
      </Section>

      <Section id="memo" icon="📋" title="8. Fiche mémo comptoir">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["1", "Demander", '"Chez quel opérateur êtes-vous ?"'],
            ["2", "Découvrir", '"Qu\'est-ce qui compte le plus pour vous ?"'],
            ["3", "Vérifier", "Prix réel + consommation + engagement + Suisse."],
            ["4", "Comparer", "Offre actuelle vs besoin réel."],
            ["5", "Reformuler", '"Si je comprends bien..."'],
            ["6", "Proposer", "Une solution simple et adaptée."],
            ["7", "Conclure", '"On le met en place ensemble ?"'],
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

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [visits, setVisits] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [r, v, h] = await Promise.all([
        api.get(`/api/results${refresh ? "?refresh=1" : ""}`),
        api.get(`/api/visits${refresh ? "?refresh=1" : ""}`),
        api.get(`/api/history${refresh ? "?refresh=1" : ""}`).catch(() => ({ months: [], byStore: {} })),
      ]);
      setResults(r);
      setVisits(v.visits);
      setHistory(h);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  if (!user) return <LoginScreen onLogin={(u) => { setUser(u); setPage("dashboard"); }} />;

  const nav = [
    { id: "dashboard", label: "Vue d'ensemble", icon: "📊" },
    { id: "results", label: "Résultats", icon: "📈" },
    { id: "history", label: "Historique", icon: "📅" },
    { id: "guide", label: "Guide Ventes Mobileo", icon: "📘" },
    { id: "visits", label: "Visites", icon: "📋" },
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

        {/* Onglets — visibles sur ordinateur */}
        <div className="nav-tabs-desktop">
          {nav.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setPage(id)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: page === id ? C.accent : "transparent", color: page === id ? C.white : C.gray400, fontSize: 12, fontWeight: page === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{icon} {label}</button>
          ))}
        </div>

        {/* Pousse les éléments de droite au bout */}
        <div style={{ flex: 1 }} />

        {/* Infos utilisateur — masquées sur mobile pour gagner de la place */}
        <div className="nav-user-role" style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: C.white, fontSize: 11, fontWeight: 600 }}>{user.name}</div>
          <div style={{ color: C.accentB, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em" }}>{user.role === "rz" ? "Resp. de Zone" : "Magasin"}</div>
        </div>

        {/* Déconnexion — toujours visible */}
        <button onClick={() => { api.token = null; setUser(null); }} style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${C.navyL}`, background: "transparent", color: C.gray400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>⏏</button>

        {/* Bouton hamburger — visible sur mobile uniquement */}
        <button className="nav-burger" onClick={() => setMenuOpen(o => !o)} style={{ alignItems: "center", justifyContent: "center", width: 38, height: 34, borderRadius: 7, border: `1px solid ${C.navyL}`, background: menuOpen ? C.accent : "transparent", color: C.white, fontSize: 18, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, padding: 0 }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Menu déroulant mobile */}
      <div className={`nav-mobile-menu${menuOpen ? " open" : ""}`} style={{ flexDirection: "column", background: C.navyMid, position: "sticky", top: 54, zIndex: 99, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", padding: "8px" }}>
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.navyL}`, marginBottom: 6 }}>
          <div style={{ color: C.white, fontSize: 13, fontWeight: 700 }}>{user.name}</div>
          <div style={{ color: C.accentB, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{user.role === "rz" ? "Responsable de Zone" : "Magasin"}</div>
        </div>
        {nav.map(({ id, label, icon }) => (
          <button key={id} onClick={() => { setPage(id); setMenuOpen(false); }} style={{ textAlign: "left", padding: "11px 14px", borderRadius: 8, border: "none", background: page === id ? C.accent : "transparent", color: page === id ? C.white : C.gray200, fontSize: 14, fontWeight: page === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 2 }}>{icon}  {label}</button>
        ))}
      </div>

      <main className="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 18px" }}>
        {page === "guide" ? (
          <GuidePage />
        ) : (
          <>
            {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={() => loadAll()} /></div>}
            {loading ? <Spinner label="Lecture des données Notion…" /> : (
              <>
                {page === "dashboard" && results && <Dashboard user={user} data={results} />}
                {page === "results" && results && <ResultsPage user={user} data={results} onRefresh={() => loadAll(true)} refreshing={refreshing} />}
                {page === "history" && <HistoryPage user={user} history={history} />}
                {page === "visits" && <VisitsPage user={user} visits={visits} />}
                {!results && !error && <Spinner />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
