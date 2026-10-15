// ═══════════════════════════════════════════════════════════════════════════
// Tarifs réparation — écran « Au comptoir »
//
// Le vendeur choisit la marque, le modèle, puis la réparation (écran origine,
// écran compatible par gamme, vitre arrière, batterie origine ou compatible).
// Les prix viennent du classeur Google Sheets « Tarifs_SAVE » via /api/tarifs :
// le RZ n'y saisit que les prix d'achat, la main d'œuvre et la GP, le serveur
// calcule le prix de vente avec la règle du calculateur.
//
// Certaines réparations ne se font que dans un magasin (vitres arrière Apple
// listées dans l'onglet Prix fixes → Pontarlier ; micro-soudure → Dijon) :
// on les affiche partout, avec le magasin qui les réalise, pour orienter le client.
//
// « Autre » : modèle ou réparation hors catalogue. Le technicien saisit le prix
// de la pièce (HT) et son temps estimé ; le prix sort avec la même règle que
// Tarifs_V2_Save (paramètres renvoyés par /api/tarifs).
//
// Autres marques (Xiaomi, Oppo, Honor, Huawei, Motorola, Autres) : devis
// VERROUILLÉ. Le vendeur choisit la réparation (écran, écran à coller, batterie,
// vitre arrière), le nombre de pièces et leur coût total ; le temps n'est pas
// saisi, il vient de l'onglet « Autres marques » du classeur (+5 min par pièce
// au-delà de la première). La Garantie Plus suit la valeur du téléphone.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from "react";
import { calculerPack, calculerPrixTemps, PALIERS_GP, indexPalier } from "./Calculateur.jsx";

// « Écran compatible » + gamme « Bolt » → « Compatible Bolt » sous l'en-tête ÉCRAN.
const sousTitre = (r) => {
  const reste = r.libelle.replace(r.famille, "").trim();
  const txt = [reste, r.gamme].filter(Boolean).join(" ");
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : r.libelle;
};

// Choix « Autre » dans les listes (marque, modèle) et carte « Autre réparation ».
const AUTRE = "__autre__";
// Marques hors grille : valeur « am:Xiaomi » dans la liste des marques.
const PREFIXE_AM = "am:";
const FORFAIT = "__forfait__";
// Suggestions pour la catégorie « Autre réparation » (le vendeur peut taper autre chose).
const SUGGESTIONS_AUTRE = ["Connecteur de charge", "Caméra arrière", "Caméra avant", "Nappe", "Haut-parleur", "Bouton"];
const TYPES_AUTRE = [
  { type: "Écran", temps: "ecran" },
  { type: "Batterie", temps: "batterie" },
  { type: "Coque arrière", temps: "coque" },
  { type: "Connecteur de charge", temps: null },
  { type: "Autre", temps: null },
];

// Saisie libre « 28,5 » ou « 28.5 » → nombre ; vide ou illisible → null.
const lireNombre = (s) => {
  const t = String(s ?? "").replace(/\s|€/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const euros = (v) =>
  v == null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const CSS = `
.tar{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:18px;align-items:start}
.tar-choix{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:12px}
.tar-choix .select{width:100%;font-size:15px;padding:10px 12px}
@media(max-width:520px){.tar-choix{grid-template-columns:1fr}}
.tar-reps{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.tar-rep{border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:12px 14px;
  text-align:left;font:inherit;color:var(--ink);cursor:pointer;position:relative}
.tar-rep:hover{border-color:var(--brand-light)}
.tar-rep.on{border-color:var(--brand);background:var(--brand-wash)}
.tar-rep .fam{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.tar-rep .nom{font-size:14px;font-weight:650;margin:2px 0 8px}
.tar-rep .p{font-size:22px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.tar-rep .gp{font-size:12.5px;color:var(--sub);margin-top:2px;font-variant-numeric:tabular-nums}
.tar-rep .ou{display:inline-block;margin-top:8px}
.tar-res{position:sticky;top:120px}
.tar-hero{background:var(--ink);color:#fff;border-radius:var(--r);padding:20px 22px;box-shadow:var(--shadow-lift)}
.tar-hero .lbl{color:var(--brand-light)}
.tar-hero .tel{font-size:13px;color:rgba(255,255,255,.7);margin-top:4px}
.tar-hero .big-price{font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin:8px 0 4px;
  font-variant-numeric:tabular-nums}
.tar-hero .line{display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.75);padding:3px 0;
  font-variant-numeric:tabular-nums}
.tar-hero .line.bonus{color:#8FD6AE}
.tar-hero .lines{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14)}
.tar-hero .alt{display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:12px;
  border-top:1px solid rgba(255,255,255,.14);font-size:13px;color:rgba(255,255,255,.75)}
.tar-hero .alt b{font-size:19px;color:#fff;font-variant-numeric:tabular-nums}
.tar-hero .warn{margin-top:12px;font-size:12.5px;color:var(--brand-light)}
.tar-check{display:flex;gap:10px;align-items:center;margin-top:12px;font-size:13px;cursor:pointer;user-select:none}
.tar-check input{width:17px;height:17px;accent-color:var(--brand);margin:0}
.tar-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.tar-actions .btn{flex:1;justify-content:center}
.tar-vide{color:var(--muted);font-size:13.5px;padding:6px 0}
.tar-ano li{font-size:13px;margin:4px 0}
.tar-rep.autre{border-style:dashed}
.tar-libre{margin-top:10px}
.tar-libre .input{width:100%}
.tar-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tar-form .plein{grid-column:1/-1}
.tar-form .input,.tar-form .select{width:100%}
.tar-types{display:flex;flex-wrap:wrap;gap:6px}
.tar-types button{border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 12px;
  font:inherit;font-size:13px;color:var(--ink);cursor:pointer}
.tar-types button.on{border-color:var(--brand);background:var(--brand-wash);font-weight:650}
.tar-nb{display:flex;align-items:center;gap:8px}
.tar-nb button{width:40px;height:40px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);
  font:inherit;font-size:20px;font-weight:700;color:var(--ink);cursor:pointer}
.tar-nb button:disabled{opacity:.35;cursor:default}
.tar-nb b{min-width:34px;text-align:center;font-size:20px;font-variant-numeric:tabular-nums}
.tar-verrou{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;margin-top:12px;
  border-radius:var(--r-sm);background:var(--brand-wash);font-size:13px}
.tar-verrou b{font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:520px){.tar-form{grid-template-columns:1fr}}
@media(max-width:860px){.tar{grid-template-columns:1fr}.tar-res{position:static}}
`;

export default function Tarifs({ user, api }) {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [repId, setRepId] = useState("");
  const [film, setFilm] = useState(false);
  const [qualirepar, setQualirepar] = useState(false);
  const [copie, setCopie] = useState(false);
  // Saisie libre : modèle / marque hors liste, réparation hors catalogue.
  const [marqueLibre, setMarqueLibre] = useState("");
  const [modeleLibre, setModeleLibre] = useState("");
  const [autre, setAutre] = useState({ type: "Écran", designation: "", pa: "", temps: "", gp: "" });
  // Autres marques : devis au forfait.
  const [fo, setFo] = useState({ cat: "", nb: 1, cout: "", valeur: "", designation: "" });
  const estRZ = user?.role === "rz";

  const charger = useCallback(async (forcer = false) => {
    setChargement(true); setErreur(null);
    try {
      const d = await api.get(`/api/tarifs${forcer ? "?refresh=1" : ""}`);
      setData(d);
      setMarque(m => m || d.marques?.[0]?.nom || "");
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [api]);

  useEffect(() => { charger(); }, [charger]);

  const modeles = useMemo(() => {
    const liste = data?.marques?.find(m => m.nom === marque)?.modeles || [];
    return liste;
  }, [data, marque]);

  const tel = data?.marques?.find(m => m.nom === marque)?.modeles.find(m => m.nom === modele) || null;
  const autresMarques = data?.autresMarques || [];
  const am = marque.startsWith(PREFIXE_AM) ? autresMarques.find(m => m.nom === marque.slice(PREFIXE_AM.length)) || null : null;
  const amGenerique = !!am && /^autres?$/i.test(am.nom);
  const modeleAutre = marque === AUTRE || modele === AUTRE || !!am;
  const nomMarque = marque === AUTRE || amGenerique ? (marqueLibre.trim() || "Autre marque") : (am ? am.nom : marque);
  const nomModele = modeleAutre ? (modeleLibre.trim() || "modèle non listé") : modele;
  const telChoisi = !!tel || modeleAutre;

  // Réparation saisie par le technicien : prix de la pièce + temps estimé.
  const tempsDefaut = (type) => {
    const k = TYPES_AUTRE.find(t => t.type === type)?.temps;
    const v = k ? data?.params?.tempsDefaut?.[k] : null;
    return v != null ? String(v) : "";
  };
  const paAutre = lireNombre(autre.pa), tempsAutre = lireNombre(autre.temps), gpAutre = lireNombre(autre.gp);
  const calcAutre = paAutre != null && tempsAutre != null ? calculerPrixTemps(paAutre, tempsAutre, data?.params) : null;
  const libelleAutre = autre.type === "Autre" ? (autre.designation.trim() || "Réparation hors catalogue")
    : `${autre.type}${autre.designation.trim() ? ` ${autre.designation.trim()}` : ""}`;
  const repAutre = calcAutre ? {
    id: AUTRE, famille: "Autre", libelle: libelleAutre, gamme: "", source: "saisie",
    prix: calcAutre.prix, prixAvecGP: gpAutre ? Math.round((calcAutre.prix + gpAutre) * 100) / 100 : null, magasins: [],
  } : null;

  // Forfait autres marques : temps de la marque + 5 min par pièce supplémentaire.
  const catsAutres = data?.categoriesAutres || [];
  const catFo = catsAutres.find(c => c.id === fo.cat) || null;
  const tempsBaseFo = am && catFo ? am.temps?.[catFo.id] : null;
  const pieceSup = data?.params?.tempsPieceSup ?? 5;
  const tempsFo = tempsBaseFo != null ? tempsBaseFo + pieceSup * Math.max(0, fo.nb - 1) : null;
  const coutFo = lireNombre(fo.cout), valeurFo = lireNombre(fo.valeur);
  const palierFo = valeurFo ? indexPalier(valeurFo) : -1;
  const gpFo = palierFo >= 0 ? PALIERS_GP[palierFo].prix : null;
  const desigFo = fo.designation.trim();
  const manqueDesig = fo.cat === "autre" && !desigFo;
  const calcFo = coutFo != null && coutFo > 0 && tempsFo != null && !manqueDesig ? calculerPrixTemps(coutFo, tempsFo, data?.params) : null;
  const libelleFo = fo.cat === "autre" ? desigFo : catFo?.libelle;
  const repFo = calcFo ? {
    id: FORFAIT, famille: catFo.libelle, libelle: libelleFo, gamme: "", source: "forfait",
    prix: calcFo.prix, prixAvecGP: gpFo ? Math.round((calcFo.prix + gpFo) * 100) / 100 : null, magasins: [],
  } : null;

  const rep = am ? repFo : repId === AUTRE ? repAutre : (tel?.reparations.find(r => r.id === repId) || null);
  const gpRep = am ? gpFo : repId === AUTRE ? gpAutre : tel?.gp;

  // Magasins qui réalisent la réparation ; liste vide = tous les magasins.
  const magasinsPour = (r) => r?.magasins || [];
  const horsMagasin = (r) => {
    const mags = magasinsPour(r);
    return mags.length > 0 && user?.store && !mags.includes(user.store);
  };

  const nomRep = (r) => r ? `${r.libelle}${r.gamme ? ` ${r.gamme}` : ""}` : "";
  const pack = rep ? calculerPack(rep.prix, rep.prixAvecGP ? gpRep : 0, qualirepar) : null;
  // Le film est une option : on le retire du pack si le vendeur ne le propose pas.
  const totalPack = pack ? pack.pack - (film ? 0 : pack.film) : null;

  const ouvrirAutre = (gp) => {
    setRepId(AUTRE); setCopie(false);
    setAutre(a => ({ ...a, gp: gp != null ? String(gp).replace(".", ",") : "", temps: a.temps || tempsDefaut(a.type) }));
  };
  const choisirMarque = (m) => {
    setMarque(m); setCopie(false);
    if (m.startsWith(PREFIXE_AM)) { setModele(""); setRepId(""); return; }
    if (m === AUTRE) { setModele(AUTRE); ouvrirAutre(null); }
    else { setModele(""); setRepId(""); }
  };
  const majFo = (champ, v) => { setFo(f => ({ ...f, [champ]: v })); setCopie(false); };
  const choisirModele = (m) => {
    setModele(m); setCopie(false);
    if (m === AUTRE) { ouvrirAutre(null); return; }
    if (repId === AUTRE) { ouvrirAutre(data.marques.find(x => x.nom === marque)?.modeles.find(x => x.nom === m)?.gp); return; }
    // On garde la même réparation d'un modèle à l'autre si elle existe.
    const t = data.marques.find(x => x.nom === marque)?.modeles.find(x => x.nom === m);
    if (!t?.reparations.some(r => r.id === repId)) setRepId(t?.reparations[0]?.id || "");
  };

  const texteDevis = () => {
    const l = [`Devis Repair Mobile — ${nomRep(rep)} — ${nomMarque} ${nomModele}`];
    l.push(`Réparation : ${euros(rep.prix)} TTC`);
    if (rep.prixAvecGP) {
      l.push(`Avec Garantie Plus (${euros(gpRep)}) : ${euros(rep.prixAvecGP)} TTC`);
      if (film || pack.bonus) l.push(`Pack${film ? " avec film Ocadia" : ""}${pack.bonus ? ", bonus QualiRépar déduit" : ""} : ${euros(totalPack)} TTC`);
    }
    if (rep.id === AUTRE) l.push("Tarif établi selon la pièce et le temps estimé, sous réserve de diagnostic.");
    if (rep.id === FORFAIT) l.push(`Tarif forfaitaire ${nomMarque} (${fo.nb} pièce${fo.nb > 1 ? "s" : ""}), sous réserve de diagnostic.`);
    const mags = magasinsPour(rep);
    if (mags.length) l.push(`Réalisée à : ${mags.join(", ")}`);
    return l.join("\n");
  };

  const copier = async () => {
    const txt = texteDevis();
    try { await navigator.clipboard.writeText(txt); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  };

  if (chargement && !data) {
    return <div className="stack"><style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="card tar-vide">Lecture des tarifs…</div></div>;
  }

  return (
    <div className="stack">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ctx">
        <div>
          <h1 className="h-screen">Tarifs réparation</h1>
          <p>Choisis le téléphone puis la réparation · prix TTC sans et avec Garantie Plus</p>
        </div>
        {estRZ && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data?.sheetUrl && <a className="btn btn-ghost btn-sm" href={data.sheetUrl} target="_blank" rel="noreferrer">Ouvrir le classeur ↗</a>}
            <button className="btn btn-ghost btn-sm" disabled={chargement} onClick={() => charger(true)}>
              {chargement ? "Lecture…" : "Actualiser les prix"}
            </button>
          </div>
        )}
      </div>

      {erreur && (
        <div className="card accent-brand">
          <b>Tarifs indisponibles.</b> <span className="txt-muted">{erreur}</span>
          <div style={{ marginTop: 10 }}><button className="btn btn-ghost btn-sm" onClick={() => charger()}>Réessayer</button></div>
        </div>
      )}

      {data && data.configured === false && (
        <div className="card accent-brand">
          Le classeur des tarifs n'est pas encore branché.
          {estRZ && <span className="txt-muted"> Ajoute la variable GOOGLE_SHEET_TARIFS_ID sur Render (identifiant du Google Sheet Tarifs_SAVE).</span>}
        </div>
      )}

      {estRZ && data?.anomalies?.length > 0 && (
        <div className="card accent-brand">
          <h2 className="h-section">À corriger dans le classeur ({data.anomalies.length})</h2>
          <ul className="tar-ano">{data.anomalies.map((a, i) => <li key={i}>{a}</li>)}</ul>
          <p className="note">Ces lignes ne sont pas affichées aux magasins tant qu'elles ne sont pas corrigées. Décimales : tape une virgule (28,5), jamais un point.</p>
        </div>
      )}

      {data?.marques?.length > 0 && (
        <div className="tar">
          <div className="stack">
            <div className="card">
              <h2 className="h-section">Téléphone</h2>
              <div className="tar-choix">
                <div>
                  <label className="field-label" htmlFor="tar-marque">Marque</label>
                  <select id="tar-marque" className="select" value={marque} onChange={(e) => choisirMarque(e.target.value)}>
                    {autresMarques.length > 0 ? (
                      <>
                        <optgroup label="Grille de prix">
                          {data.marques.map(m => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
                        </optgroup>
                        <optgroup label="Autres marques (forfait)">
                          {autresMarques.map(m => <option key={m.nom} value={PREFIXE_AM + m.nom}>{m.nom}</option>)}
                        </optgroup>
                      </>
                    ) : (
                      <>
                        {data.marques.map(m => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
                        <option value={AUTRE}>Autre marque…</option>
                      </>
                    )}
                  </select>
                  {(marque === AUTRE || amGenerique) && (
                    <input className="input txt tar-libre" autoComplete="off" placeholder="Nom de la marque (ex. : Google Pixel)"
                      value={marqueLibre} onChange={(e) => { setMarqueLibre(e.target.value); setCopie(false); }} />
                  )}
                </div>
                <div>
                  <label className="field-label" htmlFor="tar-modele">Modèle</label>
                  {marque !== AUTRE && !am && (
                    <select id="tar-modele" className="select" value={modele} onChange={(e) => choisirModele(e.target.value)}>
                      <option value="">Choisir un modèle…</option>
                      {modeles.map(m => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
                      <option value={AUTRE}>Autre modèle (non listé)…</option>
                    </select>
                  )}
                  {modeleAutre && (
                    <input id={marque === AUTRE || am ? "tar-modele" : undefined} className={`input txt${am ? "" : " tar-libre"}`} autoComplete="off"
                      placeholder="Ex. : Redmi Note 13" value={modeleLibre}
                      onChange={(e) => { setModeleLibre(e.target.value); setCopie(false); }} />
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="h-section">Réparation{telChoisi ? ` — ${nomModele}` : ""}</h2>
              {!telChoisi && <div className="tar-vide">Choisis un modèle pour voir les réparations proposées.</div>}
              {tel && (
                <div className="tar-reps">
                  {tel.reparations.map(r => (
                    <button key={r.id} className={`tar-rep${r.id === repId ? " on" : ""}`} onClick={() => { setRepId(r.id); setCopie(false); }}>
                      <div className="fam">{r.famille}</div>
                      <div className="nom">{sousTitre(r)}</div>
                      <div className="p">{euros(r.prix)}</div>
                      <div className="gp">{r.prixAvecGP ? `avec GP : ${euros(r.prixAvecGP)}` : "GP non renseignée"}</div>
                      {magasinsPour(r).length > 0 && (
                        <span className={`chip no-dot ou ${horsMagasin(r) ? "c-warn" : "c-brand"}`}>{magasinsPour(r).join(", ")} uniquement</span>
                      )}
                      {estRZ && (
                        <div className="meta" style={{ marginTop: 6 }}>
                          {r.source === "fixe"
                            ? (data.version === 2 ? "Prix fixe (Tarifs_SAVE)" : "Prix fixe (PA à saisir)")
                            : `PA ${euros(r.pa)} · ${r.temps != null ? `${r.temps}+${data.params?.pec ?? 10} min · ` : ""}MO ${r.mo != null ? euros(r.mo) : "?"} · marge ${euros(r.margeHT)} HT`}
                        </div>
                      )}
                    </button>
                  ))}
                  <button className={`tar-rep autre${repId === AUTRE ? " on" : ""}`} onClick={() => ouvrirAutre(tel.gp)}>
                    <div className="fam">Autre</div>
                    <div className="nom">Réparation non listée</div>
                    <div className="gp">Saisis le prix de la pièce et ton temps estimé</div>
                  </button>
                </div>
              )}
              {am && (
                <div className="tar-reps">
                  {catsAutres.map(c => {
                    const t = am.temps?.[c.id];
                    return (
                      <button key={c.id} className={`tar-rep${fo.cat === c.id ? " on" : ""}`} disabled={t == null}
                        onClick={() => majFo("cat", c.id)}>
                        <div className="fam">Forfait {am.nom}</div>
                        <div className="nom">{c.libelle}</div>
                        <div className="gp">{t != null ? `Temps standard : ${t} min` : "Non proposé"}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {am?.remarque && <p className="note">{am.remarque}</p>}
              {modeleAutre && !am && <div className="tar-vide">Modèle hors catalogue : saisis la pièce et ton temps ci-dessous.</div>}
              {tel?.remarque && <p className="note">{tel.remarque}</p>}
            </div>

            {am && fo.cat && (
              <div className="card">
                <h2 className="h-section">{fo.cat === "autre" ? "Autre réparation" : catFo?.libelle} {nomMarque} — pièces</h2>
                <div className="tar-form">
                  {fo.cat === "autre" && (
                    <div className="plein">
                      <label className="field-label" htmlFor="fo-desig">Réparation effectuée</label>
                      <div className="tar-types" style={{ marginBottom: 8 }}>
                        {SUGGESTIONS_AUTRE.map(s => (
                          <button key={s} type="button" className={fo.designation === s ? "on" : ""} onClick={() => majFo("designation", s)}>{s}</button>
                        ))}
                      </div>
                      <input id="fo-desig" className={`input txt${manqueDesig && (fo.cout || fo.valeur) ? " err" : ""}`} autoComplete="off"
                        placeholder="Ou tape la réparation (ex. : nappe power)" value={fo.designation}
                        onChange={(e) => majFo("designation", e.target.value)} />
                    </div>
                  )}
                  <div>
                    <span className="field-label">Nombre de pièces utilisées</span>
                    <div className="tar-nb">
                      <button type="button" disabled={fo.nb <= 1} onClick={() => majFo("nb", Math.max(1, fo.nb - 1))} aria-label="Une pièce de moins">−</button>
                      <b>{fo.nb}</b>
                      <button type="button" disabled={fo.nb >= 10} onClick={() => majFo("nb", Math.min(10, fo.nb + 1))} aria-label="Une pièce de plus">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="fo-cout">Coût total des pièces (€ HT)</label>
                    <input id="fo-cout" className={`input${fo.cout && coutFo == null ? " err" : ""}`} inputMode="decimal" placeholder="Ex. : 42,50"
                      value={fo.cout} onChange={(e) => majFo("cout", e.target.value)} />
                  </div>
                  <div className="plein">
                    <label className="field-label" htmlFor="fo-valeur">Valeur du téléphone (pour la Garantie Plus)</label>
                    <input id="fo-valeur" className={`input${fo.valeur && valeurFo == null ? " err" : ""}`} inputMode="decimal" placeholder="Ex. : 250"
                      value={fo.valeur} onChange={(e) => majFo("valeur", e.target.value)} />
                    {gpFo != null && <div className="meta" style={{ marginTop: 4 }}>Palier {PALIERS_GP[palierFo].label} → Garantie Plus {euros(gpFo)}</div>}
                  </div>
                </div>
                <div className="tar-verrou">
                  <span>
                    Temps facturé : {tempsBaseFo} min{fo.nb > 1 ? ` + ${pieceSup * (fo.nb - 1)} min (${fo.nb - 1} pièce${fo.nb > 2 ? "s" : ""} en plus)` : ""}
                    {" "}+ {data.params?.pec ?? 10} min de prise en charge
                  </span>
                  <b>{tempsFo != null ? tempsFo + (data.params?.pec ?? 10) : "—"} min</b>
                </div>
                <p className="note">
                  Additionne le prix d'achat HT de toutes les pièces utilisées. Le temps est fixé par marque et par réparation :
                  il ne se modifie pas au comptoir.
                </p>
                {estRZ && calcFo && (
                  <div className="meta">Pièces {euros(coutFo)} · MO {euros(calcFo.mo)} · marge {euros(calcFo.margeHT)} HT</div>
                )}
              </div>
            )}

            {repId === AUTRE && telChoisi && !am && (
              <div className="card">
                <h2 className="h-section">Autre réparation — calcul du tarif</h2>
                <div className="tar-form">
                  <div className="plein">
                    <span className="field-label">Type de réparation</span>
                    <div className="tar-types">
                      {TYPES_AUTRE.map(t => (
                        <button key={t.type} className={autre.type === t.type ? "on" : ""}
                          onClick={() => { setCopie(false); setAutre(a => ({ ...a, type: t.type, temps: a.temps && a.temps !== tempsDefaut(a.type) ? a.temps : tempsDefaut(t.type) })); }}>
                          {t.type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="plein">
                    <label className="field-label" htmlFor="tar-desig">{autre.type === "Autre" ? "Désignation" : "Précision (facultatif)"}</label>
                    <input id="tar-desig" className="input txt" autoComplete="off"
                      placeholder={autre.type === "Autre" ? "Ex. : nappe power" : "Ex. : compatible OLED"}
                      value={autre.designation} onChange={(e) => { setAutre(a => ({ ...a, designation: e.target.value })); setCopie(false); }} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="tar-pa">Prix de la pièce (€ HT)</label>
                    <input id="tar-pa" className={`input${autre.pa && paAutre == null ? " err" : ""}`} inputMode="decimal" placeholder="Ex. : 28,50"
                      value={autre.pa} onChange={(e) => { setAutre(a => ({ ...a, pa: e.target.value })); setCopie(false); }} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="tar-temps">Temps de réparation (min)</label>
                    <input id="tar-temps" className={`input${autre.temps && tempsAutre == null ? " err" : ""}`} inputMode="numeric" placeholder="Ex. : 20"
                      value={autre.temps} onChange={(e) => { setAutre(a => ({ ...a, temps: e.target.value })); setCopie(false); }} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="tar-gp">Garantie Plus (€ TTC)</label>
                    <input id="tar-gp" className={`input${autre.gp && gpAutre == null ? " err" : ""}`} inputMode="decimal" placeholder="Facultatif"
                      value={autre.gp} onChange={(e) => { setAutre(a => ({ ...a, gp: e.target.value })); setCopie(false); }} />
                  </div>
                </div>
                <p className="note">
                  Temps de la réparation seule : la prise en charge du client ({data.params?.pec ?? 10} min) est ajoutée automatiquement.
                  Même calcul que la grille : pièce × {String(data.params?.coef ?? 1.3).replace(".", ",")} + temps au taux horaire, TTC arrondi à la dizaine.
                </p>
                {estRZ && calcAutre && (
                  <div className="meta">PA {euros(paAutre)} · {tempsAutre}+{data.params?.pec ?? 10} min · MO {euros(calcAutre.mo)} · marge {euros(calcAutre.margeHT)} HT</div>
                )}
              </div>
            )}
          </div>

          <div className="tar-res stack">
            <div>
              <div className="tar-hero">
                <div className="lbl">{rep ? nomRep(rep) : "Prix de la réparation"}</div>
                {rep && <div className="tel">{nomMarque} {nomModele}</div>}
                <div className="big-price">{rep ? euros(rep.prixAvecGP ?? rep.prix) : "—"}</div>
                {rep && <div className="tel">{rep.prixAvecGP ? "avec Garantie Plus" : (rep.id === FORFAIT ? "saisis la valeur du téléphone pour la Garantie Plus" : rep.id === AUTRE ? "sans Garantie Plus (montant non saisi)" : "Garantie Plus non renseignée pour ce modèle")}</div>}
                {rep && rep.prixAvecGP && (
                  <div className="lines">
                    <div className="line"><span>Réparation</span><span>{euros(rep.prix)}</span></div>
                    <div className="line"><span>Garantie Plus</span><span>{euros(gpRep)}</span></div>
                    {film && <div className="line"><span>Film Ocadia</span><span>{euros(pack.film)}</span></div>}
                    {pack.bonus > 0 && <div className="line bonus"><span>Bonus QualiRépar</span><span>−{euros(pack.bonus)}</span></div>}
                    {(film || pack.bonus > 0) && <div className="line" style={{ color: "#fff", fontWeight: 700 }}><span>Total pack</span><span>{euros(totalPack)}</span></div>}
                  </div>
                )}
                {rep && (
                  <div className="alt">
                    <span>Sans Garantie Plus</span>
                    <b>{euros(rep.prix)}</b>
                  </div>
                )}
                {rep && horsMagasin(rep) && (
                  <div className="warn">Réparation faite uniquement à {magasinsPour(rep).join(", ")} : oriente le client.</div>
                )}
                {!rep && <div className="warn" style={{ color: "rgba(255,255,255,.55)" }}>
                  {am ? (!fo.cat ? "Choisis la réparation." : manqueDesig ? "Indique la réparation effectuée." : "Saisis le coût total des pièces.")
                    : repId === AUTRE ? "Saisis le prix de la pièce et le temps de réparation." : "Choisis un modèle puis une réparation."}
                </div>}
              </div>
              {rep && rep.prixAvecGP && (
                <div className="card" style={{ marginTop: 12, padding: "12px 16px" }}>
                  <label className="tar-check">
                    <input type="checkbox" checked={film} onChange={(e) => { setFilm(e.target.checked); setCopie(false); }} />
                    <span>Ajouter le film Ocadia ({euros(pack.film)})</span>
                  </label>
                  <label className="tar-check">
                    <input type="checkbox" checked={qualirepar} onChange={(e) => { setQualirepar(e.target.checked); setCopie(false); }} />
                    <span>Bonus QualiRépar (smartphone et panne éligibles)</span>
                  </label>
                </div>
              )}
              <div className="tar-actions">
                <button className="btn btn-primary" disabled={!rep} onClick={copier}>{copie ? "✓ Devis copié" : "Copier le devis"}</button>
              </div>
            </div>

            {data.microSoudure?.length > 0 && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <h2 className="h-section" style={{ margin: 0 }}>Micro-soudure</h2>
                  <span className={`chip no-dot ${user?.store && !(data.params?.magasinsMicro || []).includes(user.store) ? "c-warn" : "c-brand"}`}>
                    {(data.params?.magasinsMicro || []).join(", ")} uniquement
                  </span>
                </div>
                {data.microSoudure.map(m => (
                  <div className="mrow" key={m.prestation}>
                    <span>{m.prestation}{m.remarque && <span className="meta" style={{ display: "block" }}>{m.remarque}</span>}</span>
                    <b>{euros(m.prix)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
