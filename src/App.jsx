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
  navy: "##FA9461", navyMid: "#F2550C", navyL: "#F2550C",
  accent: "#F2550C", accentB: "#F2550C", white: "#FFFFFF",
  bg: "#F4F7FB", gray50: "#EEF2F7", gray200: "#C8D4E3",
  gray400: "#7A92AD", gray600: "#4A6278",
  ok: "#22C55E", warn: "#F59E0B", bad: "#EF4444", text: "#0D1F3C",
};

const STORES_ORDER = ["Pontarlier", "Lons-le-Saunier", "Dijon", "Besançon", "Chalon-sur-Saône"];

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
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Vue d'ensemble</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>{data?.period} · données Notion du {data?.updated}</p>
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
function MiniLineChart({ data, label, suffix = "", target, color = C.accent }) {
  // data : [{ mois, value }]
  const points = data.filter(d => d.value != null);
  if (points.length === 0) return null;
  const values = points.map(p => p.value);
  const maxV = Math.max(...values, target || 0) * 1.1;
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;
  const W = 280, H = 90, pad = 8;
  const stepX = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    x: pad + i * stepX,
    y: H - pad - ((p.value - minV) / range) * (H - pad * 2),
    v: p.value, mois: p.mois,
  }));
  const path = xy.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const targetY = target != null ? H - pad - ((target - minV) / range) * (H - pad * 2) : null;
  const last = points[points.length - 1].value;
  const first = points[0].value;
  const delta = last - first;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: delta > 0 ? C.ok : delta < 0 ? C.bad : C.gray400 }}>
          {points.length > 1 ? (delta > 0 ? `📈 +${delta.toFixed(1)}${suffix}` : delta < 0 ? `📉 ${delta.toFixed(1)}${suffix}` : "➡️ stable") : ""}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90 }}>
        {targetY != null && (
          <line x1={pad} y1={targetY} x2={W - pad} y2={targetY} stroke={C.navy} strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            {(i === xy.length - 1 || xy.length <= 4) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.navy}>{p.v}{suffix}</text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {xy.map((p, i) => (
          <span key={i} style={{ fontSize: 9, color: C.gray400, flex: 1, textAlign: "center" }}>{p.mois.slice(5)}/{p.mois.slice(2, 4)}</span>
        ))}
      </div>
    </Card>
  );
}

function HistoryPage({ user, history }) {
  const isRZ = user.role === "rz";
  const allStores = isRZ ? STORES_ORDER : [user.store];
  const [selStore, setSelStore] = useState(isRZ ? STORES_ORDER[0] : user.store);
  const byStore = history?.byStore || {};
  const months = history?.months || [];

  const storeData = byStore[selStore] || [];
  const mkSeries = (key) => storeData.map(r => ({ mois: r.mois, value: r[key] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Historique & progression</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>
            {months.length} mois archivé{months.length > 1 ? "s" : ""}{months.length ? ` · de ${months[0]} à ${months[months.length - 1]}` : ""}
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
            <strong style={{ color: C.navy }}>{selStore}</strong> — un seul mois archivé pour l'instant ({storeData[0]?.mois}). Les courbes de progression apparaîtront dès qu'un deuxième mois sera enregistré. Patience, l'historique se construit mois après mois !
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <MiniLineChart data={mkSeries("accessoires")} label="Ratio Accessoires" suffix="%" target={25} color={C.accent} />
          <MiniLineChart data={mkSeries("gp")} label="Ratio GP" suffix="%" target={20} color="#8B5CF6" />
          <MiniLineChart data={mkSeries("occasion")} label="Mobiles Occasion" suffix="" target={storeData[storeData.length - 1]?.objectifOccasion} color="#0EA5E9" />
          <MiniLineChart data={mkSeries("mobileo")} label="Forfaits Mobileo" suffix="" target={10} color="#F59E0B" />
          <MiniLineChart data={mkSeries("atm")} label="Ratio ATM" suffix="%" target={10} color="#22C55E" />
          <MiniLineChart data={mkSeries("margeTotale")} label="Marge Totale" suffix="€" color={C.navy} />
        </div>
      )}

      {/* Comparaison année sur année si plusieurs années */}
      {storeData.length >= 2 && (
        <Card>
          <SectionHead>📊 Détail mois par mois — {selStore}</SectionHead>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.gray50}` }}>
                  {["Mois", "Acc.", "GP", "Occ.", "Mobileo", "ATM", "Marge"].map(h => (
                    <th key={h} style={{ textAlign: h === "Mois" ? "left" : "right", padding: "7px 8px", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storeData.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 ? C.bg : C.white }}>
                    <td style={{ padding: "7px 8px", fontWeight: 700, color: C.navy }}>{r.mois}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: r.accessoires >= 25 ? C.ok : C.bad, fontWeight: 600 }}>{r.accessoires ?? "—"}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: r.gp >= 20 ? C.ok : C.bad, fontWeight: 600 }}>{r.gp ?? "—"}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right" }}>{r.occasion ?? "—"}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: r.mobileo >= 10 ? C.ok : C.bad, fontWeight: 600 }}>{r.mobileo ?? "—"}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: r.atm >= 10 ? C.ok : C.bad, fontWeight: 600 }}>{r.atm ?? "—"}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: C.gray600 }}>{r.margeTotale ? `${r.margeTotale.toLocaleString("fr-FR")}€` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
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
      </main>
    </div>
  );
}
