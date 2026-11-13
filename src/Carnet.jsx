// ═══════════════════════════════════════════════════════════════════════════
// Carnet de réparations — famille « Formation »
//
// Le technicien en formation enregistre chaque réparation : marque, modèle,
// panne, méthode, autonomie, difficulté ressentie, temps passé, test final.
// Le référent (compte magasin) commente et valide ; le RZ voit tout.
//
// Quatre onglets :
//   1. Nouvelle réparation — le formulaire, pensé pour être rempli à l'atelier
//   2. Carnet              — toutes les réparations, détail + avis du référent
//   3. Progression         — volume, autonomie, temps, diversité marques × pannes
//   4. Acquis              — grille de compétences, validée par le référent
//
// Données : /api/carnet (Google Sheet Carnet_Reparations_SAVE).
// Ton : Thomas (RZ) qui parle directement à l'arrivant, en le tutoyant.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from "react";

const CSS = `
.crn-hero{background:var(--ink);color:#fff;border-radius:var(--r);padding:20px 24px;display:flex;gap:20px;flex-wrap:wrap;align-items:center}
.crn-hero h2{margin:0 0 4px;font-size:20px}
.crn-hero p{margin:0;color:rgba(255,255,255,.75);font-size:13.5px;max-width:640px}
.crn-hero .sig{margin-top:8px;color:var(--brand-light);font-size:12.5px;font-weight:600}
.crn-doublon{margin-left:auto;min-width:220px}
.crn-doublon .lbl{color:rgba(255,255,255,.55)}
.crn-doublon .big{font-size:22px;font-weight:800;color:#fff}
.crn-doublon .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:6px;overflow:hidden}
.crn-doublon .bar i{display:block;height:100%;background:var(--brand);border-radius:3px}
.crn-form{display:grid;gap:18px}
.crn-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.crn-opts{display:flex;flex-wrap:wrap;gap:6px}
.crn-opts button{border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:7px 13px;
  font-size:13px;font-weight:600;color:var(--sub);cursor:pointer;font-family:inherit}
.crn-opts button.on{border-color:var(--brand);background:var(--brand-wash);color:#C2481B}
.crn-opts button small{display:block;font-weight:500;font-size:11px;color:var(--muted)}
.crn-opts.big button{border-radius:12px;text-align:left;padding:9px 14px}
textarea.input{min-height:74px;resize:vertical;line-height:1.45}
.crn-aide{font-size:12px;color:var(--muted);margin-top:4px}
.crn-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.crn-kpi{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:14px 16px}
.crn-kpi .v{font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.crn-kpi .s{font-size:12px;color:var(--muted);margin-top:2px}
.crn-item{border-bottom:1px solid var(--line-2);padding:12px 4px;cursor:pointer}
.crn-item:last-child{border-bottom:none}
.crn-item:hover{background:var(--cream)}
.crn-item .top{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.crn-item .mod{font-weight:700}
.crn-item .right{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.crn-det{margin-top:10px;display:grid;gap:10px;font-size:13.5px}
.crn-det dt{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.crn-det dd{margin:2px 0 0;white-space:pre-wrap}
.crn-ref{background:var(--brand-wash);border-radius:10px;padding:12px 14px}
.crn-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--sub);margin-bottom:8px}
.crn-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.crn-hm{border-collapse:separate;border-spacing:3px;font-size:12px}
.crn-hm th{font-weight:600;color:var(--muted);font-size:11px;padding:2px 4px;text-align:left}
.crn-hm th.v{writing-mode:vertical-rl;transform:rotate(180deg);height:110px;text-align:left;vertical-align:bottom}
.crn-hm td{width:34px;height:30px;border-radius:6px;text-align:center;font-weight:700;font-variant-numeric:tabular-nums}
.crn-acq{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.crn-acq .card{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.crn-acq h4{margin:0;font-size:15px}
.crn-acq .card.ok{border-top:3px solid var(--ok)}
.crn-acq .card.pret{border-top:3px solid var(--brand)}
.crn-pips{display:flex;gap:4px}
.crn-pips i{width:18px;height:6px;border-radius:3px;background:var(--line)}
.crn-pips i.on{background:var(--brand)}
.crn-tip{position:relative}
`;

const DIFF = ["", "Facile", "Abordable", "Moyen", "Difficile", "Très difficile"];
const TEMPS_RAPIDES = [15, 30, 45, 60, 90];
// Autonomie = échelle ordonnée : une seule teinte, du clair au foncé.
const AUTO_COUL = { "Observé": "#EFA47F", "Guidé": "#E8612C", "Seul": "#8F3410" };
const TEST_CHIP = { "OK du 1er coup": "c-ok", "OK après reprise": "c-warn", "KO / non réparé": "c-bad" };
const STATUT_CHIP = { "Validé": "c-ok", "Prêt à valider": "c-brand", "En cours": "c-warn", "Pas commencé": "c-neutral" };

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  return d && m ? `${d}/${m}/${y.slice(2)}` : iso;
};
const todayIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

// Jours ouvrés mardi→samedi (hors fériés de la période : aucun entre mi-nov et début déc).
function joursOuvres(debut, fin) {
  const out = [];
  const d = new Date(debut + "T12:00:00");
  const f = new Date(fin + "T12:00:00");
  while (d <= f) { const j = d.getDay(); if (j >= 2 && j <= 6) out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}
// Lundi de la semaine d'une date ISO → libellé « sem. du 17/11 ».
function semaine(iso) {
  const d = new Date(iso + "T12:00:00");
  const decal = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - decal);
  return d.toISOString().slice(0, 10);
}

const VIDE = { date: "", marque: "", modele: "", categorie: "", panne: "", methode: "", autonomie: "", difficulte: 0, temps: "", test: "", aRetenir: "" };

// ─── Formulaire ────────────────────────────────────────────────────────────
function Formulaire({ ref_, modeles, initial, onSave, onCancel, saving, error, pourAutrui }) {
  const [f, setF] = useState(() => ({ ...VIDE, date: todayIso(), ...(initial || {}) }));
  useEffect(() => { setF({ ...VIDE, date: todayIso(), ...(initial || {}) }); }, [initial]);
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v && v.target ? v.target.value : v }));
  const Opts = ({ k, items, big }) => (
    <div className={`crn-opts${big ? " big" : ""}`}>
      {items.map(it => {
        const id = typeof it === "string" ? it : it.id;
        return (
          <button type="button" key={id} className={f[k] === id ? "on" : ""} onClick={() => set(k)(id)}>
            {typeof it === "string" ? it : it.label || it.id}
            {it.aide && <small>{it.aide}</small>}
          </button>
        );
      })}
    </div>
  );

  return (
    <form className="card crn-form" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div>
        <h3 className="h-section" style={{ marginBottom: 4 }}>{initial?.id ? "Modifier la réparation" : "Nouvelle réparation"}</h3>
        <div className="meta">
          {pourAutrui ? "Saisie faite par le référent pour le carnet de l'arrivant." :
            "Remplis-la juste après la réparation, quand tout est encore frais. Sois honnête sur le temps et la difficulté : c'est ta progression qu'on mesure, pas une note."}
        </div>
      </div>

      <div className="crn-row">
        <div><label className="field-label">Date</label><input className="input" type="date" value={f.date} onChange={set("date")} /></div>
        <div>
          <label className="field-label">Marque</label>
          <select className="select" style={{ width: "100%" }} value={f.marque} onChange={set("marque")}>
            <option value="">— Choisir —</option>
            {ref_.marques.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Modèle</label>
          <input className="input" list="crn-modeles" placeholder="ex. iPhone 13, Galaxy A54…" value={f.modele} onChange={set("modele")} />
          <datalist id="crn-modeles">{modeles.map(m => <option key={m} value={m} />)}</datalist>
        </div>
      </div>

      <div><label className="field-label">Type de réparation</label><Opts k="categorie" items={ref_.categories} /></div>

      <div>
        <label className="field-label">Panne constatée</label>
        <textarea className="input" placeholder="Ce que le client décrit, ce que tu as constaté au diagnostic (écran noir, tactile HS, ne charge plus…)" value={f.panne} onChange={set("panne")} />
      </div>
      <div>
        <label className="field-label">Comment tu l'as réparée</label>
        <textarea className="input" style={{ minHeight: 110 }} placeholder={"Ouverture (chaleur, ventouse, par l'avant/l'arrière), nappes déconnectées, pièce posée, remontage, collage, test.\nNote les vis, clips ou pièges propres à ce modèle."} value={f.methode} onChange={set("methode")} />
      </div>

      <div><label className="field-label">Autonomie</label><Opts k="autonomie" items={ref_.autonomie} big /></div>

      <div className="crn-row">
        <div>
          <label className="field-label">Difficulté ressentie</label>
          <div className="crn-opts">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} className={Number(f.difficulte) === n ? "on" : ""} onClick={() => set("difficulte")(n)}>
                {n} <small>{DIFF[n]}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Temps passé (minutes, de l'ouverture au test)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input className="input" style={{ width: 90 }} type="number" min="1" max="600" inputMode="numeric" value={f.temps} onChange={set("temps")} />
            <div className="crn-opts">
              {TEMPS_RAPIDES.map(t => <button type="button" key={t} className={Number(f.temps) === t ? "on" : ""} onClick={() => set("temps")(t)}>{t}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div><label className="field-label">Test final</label><Opts k="test" items={ref_.tests} /></div>

      <div>
        <label className="field-label">À retenir pour la prochaine fois</label>
        <textarea className="input" placeholder="Le piège, l'astuce, ce que tu ferais autrement" value={f.aRetenir} onChange={set("aRetenir")} />
      </div>

      {error && <div className="chip c-bad no-dot" style={{ whiteSpace: "normal" }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary btn-lg" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la réparation"}</button>
        {onCancel && <button type="button" className="btn btn-ghost btn-lg" onClick={onCancel}>Annuler</button>}
      </div>
    </form>
  );
}

// ─── Carnet (liste) ─────────────────────────────────────────────────────────
function Liste({ data, user, onEdit, onPatch, saving }) {
  const [ouvert, setOuvert] = useState(null);
  const [filtre, setFiltre] = useState("");
  const [comm, setComm] = useState({});
  const [par, setPar] = useState(defaultPar(user, data.apprenant));
  const items = [...data.interventions]
    .filter(r => !filtre || r.categorie === filtre)
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const estLui = data.apprenant?.name === user.name;
  const aValider = data.interventions.filter(r => !r.validePar).length;

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <h3 className="h-section" style={{ margin: 0 }}>{data.interventions.length} réparation{data.interventions.length > 1 ? "s" : ""}</h3>
        {data.peutValider && aValider > 0 && <span className="chip c-brand">{aValider} à relire</span>}
        <select className="select" style={{ marginLeft: "auto" }} value={filtre} onChange={e => setFiltre(e.target.value)}>
          <option value="">Tous les types</option>
          {data.referentiel.categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      {!items.length && <div className="meta" style={{ padding: "18px 0" }}>Aucune réparation enregistrée pour l'instant.</div>}
      {items.map(r => (
        <div key={r.id} className="crn-item" onClick={() => setOuvert(o => o === r.id ? null : r.id)}>
          <div className="top">
            <span className="txt-muted" style={{ width: 62, fontSize: 12.5 }}>{fmtDate(r.date)}</span>
            <span className="mod">{r.marque} {r.modele}</span>
            <span className="chip c-neutral no-dot">{r.categorie}</span>
            <span className="right">
              <span className="chip no-dot" style={{ background: AUTO_COUL[r.autonomie], color: "#fff" }}>{r.autonomie}</span>
              <span className="txt-muted">{r.temps} min · diff. {r.difficulte}/5</span>
              <span className={`chip ${TEST_CHIP[r.test] || "c-neutral"}`}>{r.test}</span>
              {r.validePar ? <span className="chip c-ok no-dot">✓ {r.validePar}</span> : <span className="chip c-neutral no-dot">à relire</span>}
            </span>
          </div>
          {ouvert === r.id && (
            <dl className="crn-det" onClick={e => e.stopPropagation()}>
              {r.panne && <div><dt>Panne constatée</dt><dd>{r.panne}</dd></div>}
              {r.methode && <div><dt>Méthode</dt><dd>{r.methode}</dd></div>}
              {r.aRetenir && <div><dt>À retenir</dt><dd>{r.aRetenir}</dd></div>}
              <div className="crn-ref">
                <dt>Avis du référent</dt>
                {data.peutValider ? (
                  <>
                    <textarea className="input" style={{ marginTop: 6, background: "#fff" }} placeholder="Ce qui était bien, ce qu'il faut corriger"
                      value={comm[r.id] ?? r.commentaire} onChange={e => setComm(c => ({ ...c, [r.id]: e.target.value }))} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input className="input" style={{ width: 150 }} placeholder="Validé par" value={par} onChange={e => setPar(e.target.value)} />
                      <button className="btn btn-primary btn-sm" disabled={saving}
                        onClick={() => onPatch(r.id, { commentaire: comm[r.id] ?? r.commentaire, valide: true, par })}>
                        {r.validePar ? "Mettre à jour" : "Valider la réparation"}
                      </button>
                      {r.validePar && <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => onPatch(r.id, { valide: false })}>Retirer la validation</button>}
                    </div>
                  </>
                ) : <dd>{r.commentaire || <span className="txt-muted">Pas encore relue.</span>}</dd>}
                {r.validePar && <div className="meta" style={{ marginTop: 6 }}>Validée par {r.validePar} le {fmtDate(r.dateValidation)}</div>}
              </div>
              {estLui && !r.validePar && <div><button className="btn btn-ghost btn-sm" onClick={() => onEdit(r)}>Modifier</button></div>}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

// Sur le compte magasin partagé, le nom du validateur n'est pas le magasin :
// on propose le référent désigné (Narcisse pour Killiann).
function defaultPar(user, app) {
  if (!app) return user.name;
  if (user.role === "store" && user.name === user.store) return app.referent || "";
  return user.name;
}

// ─── Progression ────────────────────────────────────────────────────────────
function Progression({ data }) {
  const L = data.interventions;
  const pct = (n) => (L.length ? Math.round((n / L.length) * 100) : 0);
  const marques = new Set(L.map(r => r.marque));
  const modeles = new Set(L.map(r => `${r.marque} ${r.modele}`.toLowerCase()));
  const cats = new Set(L.map(r => r.categorie));
  const valides = data.acquis.filter(a => a.statut === "Validé").length;

  // Volume par semaine, réparti par autonomie.
  const semaines = useMemo(() => {
    const m = {};
    for (const r of L) {
      const s = semaine(r.date);
      m[s] = m[s] || { s, Observé: 0, Guidé: 0, Seul: 0, total: 0, temps: 0, diff: 0 };
      m[s][r.autonomie] = (m[s][r.autonomie] || 0) + 1; m[s].total++; m[s].temps += r.temps || 0; m[s].diff += r.difficulte || 0;
    }
    return Object.values(m).sort((a, b) => a.s.localeCompare(b.s));
  }, [L]);
  const maxSem = Math.max(1, ...semaines.map(s => s.total));

  // Temps moyen par type : 2 premières vs 2 dernières.
  const tempsCat = useMemo(() => {
    const out = [];
    for (const c of data.referentiel.categories) {
      const l = L.filter(r => r.categorie === c).sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id));
      if (!l.length) continue;
      const moy = (arr) => Math.round(arr.reduce((s, r) => s + (r.temps || 0), 0) / arr.length);
      out.push({ c, n: l.length, avant: moy(l.slice(0, 2)), apres: l.length > 2 ? moy(l.slice(-2)) : null });
    }
    return out;
  }, [L, data.referentiel.categories]);
  const maxT = Math.max(1, ...tempsCat.flatMap(t => [t.avant, t.apres || 0]));

  // Matrice marques × types.
  const marquesVues = data.referentiel.marques.filter(m => marques.has(m));
  const catsVues = data.referentiel.categories.filter(c => cats.has(c));
  const cell = (m, c) => L.filter(r => r.marque === m && r.categorie === c).length;
  const maxCell = Math.max(1, ...marquesVues.flatMap(m => catsVues.map(c => cell(m, c))));

  if (!L.length) return <div className="card meta">La progression s'affichera dès la première réparation enregistrée.</div>;

  return (
    <div className="stack">
      <div className="crn-kpis">
        <div className="crn-kpi"><div className="lbl">Réparations</div><div className="v">{L.length}</div><div className="s">{semaines.length} semaine{semaines.length > 1 ? "s" : ""} d'atelier</div></div>
        <div className="crn-kpi"><div className="lbl">Marques</div><div className="v">{marques.size}</div><div className="s">{modeles.size} modèles différents</div></div>
        <div className="crn-kpi"><div className="lbl">Types de panne</div><div className="v">{cats.size}<span className="txt-muted" style={{ fontSize: 15 }}> / {data.referentiel.categories.length}</span></div><div className="s">diversité des cas</div></div>
        <div className="crn-kpi"><div className="lbl">Fait seul</div><div className="v">{pct(L.filter(r => r.autonomie === "Seul").length)} %</div><div className="s">des réparations</div></div>
        <div className="crn-kpi"><div className="lbl">Test OK 1er coup</div><div className="v">{pct(L.filter(r => r.test === "OK du 1er coup").length)} %</div><div className="s">qualité au remontage</div></div>
        <div className="crn-kpi"><div className="lbl">Acquis validés</div><div className="v">{valides}<span className="txt-muted" style={{ fontSize: 15 }}> / {data.acquis.length}</span></div><div className="s">{data.acquis.filter(a => a.statut === "Prêt à valider").length} prêt(s) à valider</div></div>
      </div>

      <div className="card">
        <h3 className="h-section">Réparations par semaine — de l'observation à l'autonomie</h3>
        <div className="crn-legend">{Object.entries(AUTO_COUL).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}</div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: 190, padding: "0 4px", overflowX: "auto" }}>
          {semaines.map(s => (
            <div key={s.s} style={{ flex: "0 0 64px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              title={`Semaine du ${fmtDate(s.s)} : ${s.total} réparation(s) — Observé ${s.Observé}, Guidé ${s.Guidé}, Seul ${s.Seul} · temps moyen ${Math.round(s.temps / s.total)} min · difficulté moy. ${(s.diff / s.total).toFixed(1)}`}>
              <b style={{ fontSize: 12.5 }}>{s.total}</b>
              <div style={{ width: 34, height: `${(s.total / maxSem) * 140}px`, display: "flex", flexDirection: "column-reverse", gap: 2 }}>
                {["Observé", "Guidé", "Seul"].map((k, i, arr) => s[k] ? (
                  <div key={k} style={{ flex: s[k], background: AUTO_COUL[k], borderRadius: i === arr.length - 1 || !arr.slice(i + 1).some(x => s[x]) ? "4px 4px 0 0" : 0 }} />
                ) : null)}
              </div>
              <span className="meta" style={{ fontSize: 11 }}>{fmtDate(s.s).slice(0, 5)}</span>
            </div>
          ))}
        </div>
        <div className="meta" style={{ marginTop: 6 }}>Semaine du lundi indiqué. Survole une barre pour le temps moyen et la difficulté.</div>
      </div>

      <div className="card">
        <h3 className="h-section">Temps moyen par type de réparation — tes débuts vs maintenant</h3>
        <div className="crn-legend"><span><i style={{ background: "#B9B2AB" }} />2 premières</span><span><i style={{ background: "#E8612C" }} />2 dernières (dès la 3e)</span></div>
        <div style={{ display: "grid", gap: 10 }}>
          {tempsCat.map(t => (
            <div key={t.c} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.c} <span className="txt-muted" style={{ fontWeight: 400 }}>· {t.n}</span></div>
              <div style={{ display: "grid", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }} title={`2 premières : ${t.avant} min`}>
                  <div style={{ height: 9, width: `${(t.avant / maxT) * 85}%`, background: "#B9B2AB", borderRadius: "0 4px 4px 0" }} /><span className="meta">{t.avant} min</span>
                </div>
                {t.apres != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} title={`2 dernières : ${t.apres} min`}>
                    <div style={{ height: 9, width: `${(t.apres / maxT) * 85}%`, background: "#E8612C", borderRadius: "0 4px 4px 0" }} />
                    <span className="meta">{t.apres} min {t.apres < t.avant && <b className="txt-ok">−{t.avant - t.apres}</b>}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="h-section">Diversité des cas — marques × types de réparation</h3>
        <div className="tbl-wrap">
          <table className="crn-hm">
            <thead><tr><th />{catsVues.map(c => <th key={c} className="v">{c}</th>)}<th className="v">Total</th></tr></thead>
            <tbody>
              {marquesVues.map(m => (
                <tr key={m}>
                  <th>{m}</th>
                  {catsVues.map(c => {
                    const n = cell(m, c); const a = n / maxCell;
                    return <td key={c} title={`${m} · ${c} : ${n}`} style={{ background: n ? `rgba(232,97,44,${0.15 + a * 0.75})` : "var(--line-2)", color: a > 0.5 ? "#fff" : "var(--ink)" }}>{n || ""}</td>;
                  })}
                  <td style={{ background: "transparent" }}>{L.filter(r => r.marque === m).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="meta" style={{ marginTop: 6 }}>Les cases vides sont les cas pas encore rencontrés : c'est là qu'il faut t'alimenter en priorité.</div>
      </div>
    </div>
  );
}

// ─── Acquis ─────────────────────────────────────────────────────────────────
function Acquis({ data, user, onDecision, saving }) {
  const [par, setPar] = useState(defaultPar(user, data.apprenant));
  const s = data.referentiel.seuil;
  return (
    <div className="stack">
      <div className="card meta" style={{ fontSize: 13 }}>
        Un acquis passe <b>« prêt à valider »</b> après {s.min} réparations du même type, dont les {s.derniersSeulOk} dernières
        faites <b>seul</b> avec un test <b>OK du 1er coup</b>. La validation reste une décision du référent ou du RZ, après contrôle.
        {data.peutValider && (
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="field-label" style={{ margin: 0 }}>Validé par</span>
            <input className="input" style={{ width: 160 }} value={par} onChange={e => setPar(e.target.value)} />
          </div>
        )}
      </div>
      <div className="crn-acq">
        {data.acquis.map(a => (
          <div key={a.id} className={`card ${a.statut === "Validé" ? "ok" : a.statut === "Prêt à valider" ? "pret" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
              <h4>{a.label}</h4><span className={`chip ${STATUT_CHIP[a.statut]}`}>{a.statut}</span>
            </div>
            <div className="crn-pips" title={`${a.n} réparation(s), dont ${a.seul} seul`}>
              {Array.from({ length: Math.max(s.min, a.n) }).map((_, i) => <i key={i} className={i < a.n ? "on" : ""} />)}
            </div>
            <div className="meta">{a.n} réparation{a.n > 1 ? "s" : ""} · {a.seul} seul
              {a.tempsDerniers != null && <> · {a.tempsPremiers} → <b>{a.tempsDerniers} min</b></>}</div>
            {a.modeles.length > 0 && <div className="meta" style={{ fontSize: 12 }}>{a.modeles.slice(0, 5).join(", ")}{a.modeles.length > 5 ? "…" : ""}</div>}
            {a.validation && <div className="meta txt-ok">✓ Validé par {a.validation.par} le {fmtDate(a.validation.date)}</div>}
            {data.peutValider && (
              a.validation
                ? <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => onDecision(a.id, false, par)}>Retirer la validation</button>
                : <button className={`btn btn-sm ${a.statut === "Prêt à valider" ? "btn-primary" : "btn-ghost"}`} disabled={saving || !a.n}
                    onClick={() => onDecision(a.id, true, par)}>Valider l'acquis</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Écran ──────────────────────────────────────────────────────────────────
export default function Carnet({ api, user }) {
  const [tech, setTech] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [edition, setEdition] = useState(null);
  const estApprenant = user.role === "trainee" || user.role === "apprentice";
  const [onglet, setOnglet] = useState(estApprenant ? "saisie" : "liste");

  const charger = useCallback(async (t = tech) => {
    try {
      const d = await api.get(`/api/carnet${t ? `?tech=${encodeURIComponent(t)}` : ""}`);
      setData(d); setError("");
    } catch (e) { setError(e.message); }
  }, [api, tech]);
  useEffect(() => { charger(tech); }, [tech]); // eslint-disable-line react-hooks/exhaustive-deps

  const enregistrer = async (f) => {
    setSaving(true); setSaveError("");
    try {
      if (f.id) await api.patch(`/api/carnet/${f.id}`, f);
      else await api.post("/api/carnet", { ...f, technicien: data.apprenant.name });
      setEdition(null); await charger(); setOnglet("liste");
    } catch (e) { setSaveError(e.message); } finally { setSaving(false); }
  };
  const patch = async (id, body) => {
    setSaving(true);
    try { await api.patch(`/api/carnet/${id}`, body); await charger(); } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const decision = async (acquis, valide, par) => {
    setSaving(true);
    try { await api.post("/api/carnet/acquis", { technicien: data.apprenant.name, acquis, valide, par }); await charger(); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  if (error) return <div className="card"><b>Carnet indisponible.</b> <span className="meta">{error}</span></div>;
  if (!data) return <div className="card meta">Chargement du carnet…</div>;
  if (!data.apprenant) return <div className="card meta">Aucun technicien en formation sur ton périmètre pour le moment.</div>;

  const app = data.apprenant;
  const modeles = [...new Set(data.interventions.map(r => r.modele))].sort();
  const peutSaisir = estApprenant || data.peutValider;
  const prenom = app.name.split(" ")[0];

  // Période de doublon : jours ouvrés écoulés / prévus.
  let doublon = null;
  if (app.debut && app.doublonJusquau) {
    const jours = joursOuvres(app.debut, app.doublonJusquau);
    const fait = jours.filter(j => j <= todayIso()).length;
    doublon = { total: jours.length, fait, fin: app.doublonJusquau };
  }

  const ONGLETS = [
    ...(peutSaisir ? [{ id: "saisie", label: edition ? "Modifier" : "＋ Nouvelle réparation" }] : []),
    { id: "liste", label: `Carnet (${data.interventions.length})` },
    { id: "prog", label: "Progression" },
    { id: "acquis", label: "Acquis" },
  ];

  return (
    <div className="stack">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="crn-hero">
        <div>
          <h2>{estApprenant ? "Ton carnet de réparations" : `Carnet de réparations — ${app.name}`}</h2>
          <p>
            {estApprenant
              ? `Chaque réparation que tu fais, tu la notes ici : la marque, le modèle, la panne, comment tu t'y es pris, ce que ça t'a coûté en temps et en effort. ${app.referent ? `${app.referent} relit et valide avec toi.` : ""} C'est ce carnet qui montrera tes progrès.`
              : `${app.store}${app.referent ? ` · référent ${app.referent}` : ""}. Relis chaque réparation, laisse un avis, et valide les acquis quand ${prenom} est prêt.`}
          </p>
          {estApprenant && <div className="sig">— Thomas, responsable de zone</div>}
        </div>
        {doublon && (
          <div className="crn-doublon">
            <div className="lbl">Doublon{app.referent ? ` avec ${app.referent}` : ""}</div>
            <div className="big">{todayIso() < app.debut ? `Début le ${fmtDate(app.debut)}` : `Jour ${Math.min(doublon.fait, doublon.total)} / ${doublon.total}`}</div>
            <div className="bar"><i style={{ width: `${(Math.min(doublon.fait, doublon.total) / doublon.total) * 100}%` }} /></div>
            <div className="lbl" style={{ marginTop: 6 }}>jusqu'au {fmtDate(doublon.fin)}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg" role="tablist">
          {ONGLETS.map(o => <button key={o.id} role="tab" className={onglet === o.id ? "on" : ""} onClick={() => setOnglet(o.id)}>{o.label}</button>)}
        </div>
        {data.apprenants.length > 1 && (
          <select className="select" style={{ marginLeft: "auto" }} value={app.name} onChange={e => { setTech(e.target.value); setEdition(null); }}>
            {data.apprenants.map(a => <option key={a.name} value={a.name}>{a.name} — {a.store}</option>)}
          </select>
        )}
      </div>

      {onglet === "saisie" && peutSaisir && (
        <Formulaire ref_={data.referentiel} modeles={modeles} initial={edition} saving={saving} error={saveError}
          pourAutrui={!estApprenant} onSave={enregistrer} onCancel={edition ? () => { setEdition(null); setOnglet("liste"); } : null} />
      )}
      {onglet === "liste" && <Liste data={data} user={user} saving={saving} onPatch={patch} onEdit={(r) => { setEdition(r); setOnglet("saisie"); }} />}
      {onglet === "prog" && <Progression data={data} />}
      {onglet === "acquis" && <Acquis data={data} user={user} saving={saving} onDecision={decision} />}
    </div>
  );
}
