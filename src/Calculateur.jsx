// ═══════════════════════════════════════════════════════════════════════════
// Calculateur de prix de réparation — écran « Au comptoir »
//
// Méthode au taux horaire (octobre 2026), la même que la grille Tarifs_V2_Save :
//   main d'œuvre HT = (temps de réparation estimé + 10 min de prise en charge) × 70 € ÷ 60
//   TTC réparation  = ((prix pièce HT × 1,3) + main d'œuvre HT) × 1,2
//   arrondi à la dizaine la plus proche (144 → 140, 145 → 150), puis − 0,01 € (139,99)
// Le technicien saisit le prix d'achat de la pièce et SON temps de réparation
// effectif ; les 10 minutes (accueil, diagnostic, devis, encaissement) sont
// ajoutées automatiquement.
//
// Garantie Plus : le palier dépend de la VALEUR DU TÉLÉPHONE (pas du prix de
// la réparation). Le vendeur saisit cette valeur ; deux liens ouvrent la
// recherche du modèle sur Back Market et Google Shopping pour l'aider.
// Aucun appel serveur, aucun service payant : tout se calcule dans le navigateur.
//
// Pack : réparation + Garantie Plus + film Ocadia, moins le bonus QualiRépar
// (aide de l'État) quand le smartphone est éligible. Un seul prix à annoncer.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from "react";

// ─── Règles de prix (à modifier ici si la politique tarifaire change) ────────
// Mêmes valeurs que l'onglet Paramètres de Tarifs_V2_Save : si tu changes le taux
// horaire dans le classeur, change-le aussi ici.
export const REGLES_PRIX = {
  taux: 70,      // € HT de l'heure
  pec: 10,       // minutes de prise en charge ajoutées au temps du technicien
  coef: 1.3,     // prix d'achat pièce × 1,3 (30 % de marge sur la pièce)
  tva: 1.2,
  arrondi: 10,   // arrondi à la dizaine
  decote: 0.01,  // 140 → 139,99
};
const COEF_PIECE = REGLES_PRIX.coef;
const COEF_TVA = REGLES_PRIX.tva;
const TEMPS_RAPIDES = [10, 15, 20, 30, 45, 60];
const PRIX_FILM_OCADIA = 29.99;
const BONUS_QUALIREPAR = 25;

// Paliers Garantie Plus : plafond de la VALEUR DU TÉLÉPHONE → prix de la GP
const PALIERS_GP = [
  { max: 150,      label: "0 – 150 €",        prix: 29.99 },
  { max: 300,      label: "151 – 300 €",      prix: 39.99 },
  { max: 450,      label: "301 – 450 €",      prix: 49.99 },
  { max: 600,      label: "451 – 600 €",      prix: 59.99 },
  { max: 900,      label: "601 – 900 €",      prix: 79.99 },
  { max: 1200,     label: "901 – 1 200 €",    prix: 99.99 },
  { max: Infinity, label: "1 201 € et +",     prix: 119.99 },
];

// Qui voit la marge estimée : le RZ seulement. Ajouter "magasin" pour l'ouvrir à tous.
const ROLES_VOIENT_MARGE = ["rz"];

// ─── Utilitaires ─────────────────────────────────────────────────────────────
// Accepte "49,90", "49.90", "49 €" ; renvoie null si vide, NaN si illisible.
function lireMontant(txt) {
  const s = String(txt ?? "").replace(/\s|€/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

const euros = (v) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const eurosSaisie = (v) => String(Math.round(v * 100) / 100).replace(".", ",");

const virgule = (v) => String(v).replace(".", ",");

export const indexPalier = (valeur) => PALIERS_GP.findIndex(p => valeur <= p.max);

// Prix d'une réparation au taux horaire. `p` permet de passer les paramètres
// lus dans le classeur (page Tarifs) ; sinon les règles ci-dessus s'appliquent.
export function calculerPrixTemps(piece, temps, p = {}) {
  const r = { ...REGLES_PRIX, ...Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v != null)) };
  const tempsFacture = temps + r.pec;
  const mo = Math.round(tempsFacture * r.taux / 60 * 100) / 100;
  const pieceMajoree = piece * r.coef;
  const ht = pieceMajoree + mo;
  const ttcBrut = Math.round(ht * r.tva * 1e6) / 1e6;
  const arrondi = r.arrondi > 0 ? Math.floor(ttcBrut / r.arrondi + 0.5) * r.arrondi : ttcBrut;
  const ttc = arrondi <= 0 ? 0 : Math.round((arrondi - (r.decote || 0)) * 100) / 100;
  return {
    tempsFacture, mo, pieceMajoree, ht, ttcBrut, ttc, regles: r,
    prix: ttc, margeHT: Math.round((ttc / r.tva - piece) * 100) / 100,
  };
}

// Prix du pack. Le bonus ne peut pas dépasser le prix de la réparation.
export function calculerPack(ttc, gp, eligible) {
  const bonus = eligible ? Math.min(BONUS_QUALIREPAR, ttc) : 0;
  return {
    bonus,
    film: PRIX_FILM_OCADIA,
    pack: ttc + gp + PRIX_FILM_OCADIA - bonus,
    reparationSeule: ttc - bonus,
  };
}

// ─── Styles propres à l'écran (s'appuient sur les variables de la charte) ────
const CSS = `
.calc{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);
  grid-template-areas:"tel res" "rep res" "gp res";grid-template-rows:auto auto 1fr;gap:18px;align-items:start}
.calc-a-tel{grid-area:tel}.calc-a-rep{grid-area:rep}.calc-a-gp{grid-area:gp}.calc-res{grid-area:res}
.calc-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.calc-fields .full{grid-column:1/-1}
.calc-in{position:relative}
.calc-in .input{font-size:18px;font-weight:650;padding:11px 38px 11px 14px;font-variant-numeric:tabular-nums}
.calc-in .input::placeholder{font-weight:400;color:#B8B0A8}
.calc-in .input.txt{font-size:15px;font-weight:500;padding-right:14px}
.calc-in .input:focus{outline:none;border-color:var(--brand)}
.calc-in .input.err{border-color:var(--bad)}
.calc-in em{position:absolute;right:13px;top:50%;transform:translateY(-50%);font-style:normal;
  color:var(--muted);font-size:14px;pointer-events:none}
.calc-err{font-size:12px;color:var(--bad);margin-top:5px}
.calc-liens{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:var(--muted)}
.calc-liens a.off{opacity:.45;pointer-events:none}
.calc-check{display:flex;gap:10px;align-items:center;margin-top:14px;padding:11px 13px;border:1.5px solid var(--line);
  border-radius:var(--r-sm);cursor:pointer;font-size:13.5px;user-select:none}
.calc-check input{width:18px;height:18px;accent-color:var(--brand);margin:0;flex-shrink:0}
.calc-check.on{border-color:var(--brand);background:var(--brand-wash)}
.calc-check b{font-weight:650}
.calc-check span{color:var(--muted);font-size:12px;display:block}
.calc-gp{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}
.calc-gp button{border:1.5px solid var(--line);background:var(--surface);border-radius:10px;
  padding:9px 11px;text-align:left;cursor:pointer;font:inherit;color:var(--ink);transition:border-color .15s;position:relative}
.calc-gp button:hover{border-color:var(--brand-light)}
.calc-gp button span{display:block;font-size:11.5px;color:var(--muted)}
.calc-gp button b{font-size:15px;font-variant-numeric:tabular-nums}
.calc-gp button.on{border-color:var(--brand);background:var(--brand-wash)}
.calc-gp button.on span{color:var(--brand)}
.calc-gp button.sug::after{content:"conseillé";position:absolute;top:-8px;right:8px;font-size:9.5px;
  font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--ink);color:#fff;
  padding:1px 6px;border-radius:6px}
.calc-res{position:sticky;top:120px}
.calc-hero{background:var(--ink);color:#fff;border-radius:var(--r);padding:20px 22px;box-shadow:var(--shadow-lift)}
.calc-hero .lbl{color:var(--brand-light)}
.calc-hero .big-price{font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin:6px 0 4px;
  font-variant-numeric:tabular-nums}
.calc-hero .sub{font-size:12.5px;color:rgba(255,255,255,.6)}
.calc-hero .lines{margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14)}
.calc-hero .line{display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.75);padding:3px 0;
  font-variant-numeric:tabular-nums}
.calc-hero .line.bonus{color:#8FD6AE}
.calc-hero .alt{display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:12px;
  border-top:1px solid rgba(255,255,255,.14);font-size:13px;color:rgba(255,255,255,.75)}
.calc-hero .alt b{font-size:19px;color:#fff;font-variant-numeric:tabular-nums}
.calc-hero .warn{margin-top:12px;font-size:12.5px;color:var(--brand-light)}
.calc-hero.empty-st .big-price{color:rgba(255,255,255,.3)}
.calc-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.calc-actions .btn{flex:1;justify-content:center}
.calc-det{font-size:13px}
.calc-det .mrow b{font-weight:650}
.calc-det .mrow.tot{border-top:1.5px solid var(--line)}
.calc-det .mrow.tot b{font-weight:800}
.calc-marge{display:flex;justify-content:space-between;align-items:center;gap:10px}
.calc-temps{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.calc-temps button{border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 11px;
  font:inherit;font-size:12.5px;color:var(--ink);cursor:pointer;font-variant-numeric:tabular-nums}
.calc-temps button.on{border-color:var(--brand);background:var(--brand-wash);font-weight:650}
.calc-aide{font-size:12px;color:var(--muted);margin-top:6px}
.calc-fiche ol{margin:8px 0 0;padding-left:20px;font-size:13.5px;line-height:1.55}
.calc-fiche li{margin:4px 0}
.calc-fiche .ex{margin-top:10px;padding:10px 12px;border-radius:var(--r-sm);background:var(--brand-wash);font-size:12.5px;line-height:1.5}
.calc-marge .v{white-space:nowrap;font-size:22px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
@media(max-width:860px){
  .calc{grid-template-columns:1fr;grid-template-rows:auto;grid-template-areas:"tel" "rep" "res" "gp"}
  .calc-res{position:static}
}
@media(max-width:520px){
  .calc-fields{grid-template-columns:1fr}
  .calc-hero .big-price{font-size:34px}
}
`;

// ─── Champ montant ───────────────────────────────────────────────────────────
function ChampMontant({ id, label, value, onChange, erreur, unite = "€", placeholder = "0,00", msgErreur = "Montant illisible", children }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="calc-in">
        <input id={id} className={`input${erreur ? " err" : ""}`} inputMode="decimal"
          autoComplete="off" placeholder={placeholder} value={value} onChange={onChange} />
        <em>{unite}</em>
      </div>
      {erreur && <div className="calc-err">{msgErreur}</div>}
      {children}
    </div>
  );
}

// ─── Fiche méthode : comment le prix est construit ──────────────────────────
function FicheMethode() {
  const r = REGLES_PRIX;
  const ex = calculerPrixTemps(30, 15);
  return (
    <div className="calc-fiche">
      <ol>
        <li><b>Temps de réparation</b> : le technicien estime son temps effectif, de l'ouverture du téléphone au test final.</li>
        <li><b>+ {r.pec} minutes</b> ajoutées d'office pour la prise en charge : accueil, diagnostic, devis, encaissement.</li>
        <li><b>Main d'œuvre</b> = temps total × {r.taux} € HT de l'heure.</li>
        <li><b>Pièce</b> = prix d'achat HT × {virgule(r.coef)}, soit {Math.round((r.coef - 1) * 100)} % de marge sur la pièce.</li>
        <li><b>Prix TTC</b> = (pièce majorée + main d'œuvre) × {virgule(r.tva)}, arrondi à la dizaine la plus proche{r.decote ? `, moins ${virgule(r.decote)} €` : ""}.</li>
      </ol>
      <div className="ex">
        <b>Exemple</b> — pièce à 30 € HT, 15 min de réparation :
        {" "}15 + {r.pec} = {ex.tempsFacture} min × {r.taux} €/h = {euros(ex.mo)} ·
        {" "}30 × {virgule(r.coef)} = {euros(ex.pieceMajoree)} ·
        {" "}({euros(ex.pieceMajoree)} + {euros(ex.mo)}) × {virgule(r.tva)} = {euros(ex.ttcBrut)} → <b>{euros(ex.ttc)}</b>
      </div>
      <p className="note">Même calcul que la page Tarifs : un prix du calculateur et un prix de la grille sont comparables.</p>
    </div>
  );
}

// ─── Écran ──────────────────────────────────────────────────────────────────
export default function Calculateur({ user }) {
  // Téléphone
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [valeurTxt, setValeurTxt] = useState("");
  // Réparation
  const [pieceTxt, setPieceTxt] = useState("");
  const [tempsTxt, setTempsTxt] = useState("");
  const [objet, setObjet] = useState("");
  const [qualirepar, setQualirepar] = useState(false);
  // Garantie Plus
  const [palierForce, setPalierForce] = useState(null);
  // Divers
  const [copie, setCopie] = useState(false);
  const [detail, setDetail] = useState(false);
  const [fiche, setFiche] = useState(false);

  const piece = lireMontant(pieceTxt);
  const temps = lireMontant(tempsTxt);
  const valeur = lireMontant(valeurTxt);
  const errPiece = Number.isNaN(piece);
  const errTemps = Number.isNaN(temps) || (temps != null && temps > 480);
  const errValeur = Number.isNaN(valeur);
  const pret = piece != null && temps != null && !errPiece && !errTemps;

  const calc = pret ? calculerPrixTemps(piece, temps) : null;
  const palierConseille = valeur != null && !errValeur && valeur > 0 ? indexPalier(valeur) : -1;
  const palier = palierForce ?? (palierConseille >= 0 ? palierConseille : null);
  const gp = palier != null ? PALIERS_GP[palier].prix : 0;
  const pack = calc ? calculerPack(calc.ttc, gp, qualirepar) : null;
  const packComplet = !!calc && palier != null;
  const voitMarge = ROLES_VOIENT_MARGE.includes(user?.role);
  const nomTel = [marque.trim(), modele.trim()].filter(Boolean).join(" ");

  const touche = () => setCopie(false);

  const changerTel = (setter) => (e) => {
    setter(e.target.value); touche();
  };
  // Nouvelle valeur = on revient au palier conseillé (sinon un choix manuel
  // fait pour le client précédent resterait collé au devis suivant).
  const changerValeur = (e) => { setValeurTxt(e.target.value); setPalierForce(null); touche(); };

  const reinit = () => {
    setMarque(""); setModele(""); setValeurTxt("");
    setPieceTxt(""); setTempsTxt(""); setObjet(""); setQualirepar(false);
    setPalierForce(null); setCopie(false); setDetail(false);
  };

  const texteDevis = () => {
    const titre = [objet.trim(), nomTel].filter(Boolean).join(" — ");
    const l = [`Devis Repair Mobile${titre ? ` — ${titre}` : ""}`];
    if (packComplet) {
      l.push(`Pack réparation protégée : ${euros(pack.pack)} TTC`);
      l.push(`• Réparation : ${euros(calc.ttc)}`);
      l.push(`• Garantie Plus : ${euros(gp)}`);
      l.push(`• Film de protection Ocadia : ${euros(pack.film)}`);
      if (pack.bonus) l.push(`• Bonus réparation QualiRépar : −${euros(pack.bonus)}`);
      l.push("");
    }
    l.push(`Réparation seule : ${euros(pack.reparationSeule)} TTC${pack.bonus ? " (bonus QualiRépar déduit)" : ""}`);
    return l.join("\n");
  };

  const copier = async () => {
    const txt = texteDevis();
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  };

  return (
    <div className="stack">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ctx">
        <div>
          <h1 className="h-screen">Calculateur de prix</h1>
          <p>Réparation · Garantie Plus selon la valeur du téléphone · Pack avec film Ocadia et bonus QualiRépar</p>
        </div>
      </div>

      <div className="calc">
        {/* ── Téléphone du client ── */}
        <div className="card calc-a-tel">
          <h2 className="h-section">Téléphone du client</h2>
          <div className="calc-fields">
            <div>
              <label className="field-label" htmlFor="calc-marque">Marque</label>
              <div className="calc-in">
                <input id="calc-marque" className="input txt" autoComplete="off" placeholder="Ex. : Apple"
                  value={marque} onChange={changerTel(setMarque)} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="calc-modele">Modèle</label>
              <div className="calc-in">
                <input id="calc-modele" className="input txt" autoComplete="off" placeholder="Ex. : iPhone 13"
                  value={modele} onChange={changerTel(setModele)} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div>
              <ChampMontant id="calc-valeur" label="Valeur du téléphone" value={valeurTxt}
                onChange={changerValeur} erreur={errValeur} />
            </div>
          </div>
          <div className="calc-liens">
            <span>Trouver le prix :</span>
            <a className={`btn btn-ghost btn-sm${nomTel ? "" : " off"}`} target="_blank" rel="noreferrer"
              href={nomTel ? `https://www.backmarket.fr/fr-fr/search?q=${encodeURIComponent(nomTel)}` : undefined}>
              Back Market ↗
            </a>
            <a className={`btn btn-ghost btn-sm${nomTel ? "" : " off"}`} target="_blank" rel="noreferrer"
              href={nomTel ? `https://www.google.fr/search?tbm=shop&q=${encodeURIComponent(nomTel)}` : undefined}>
              Google Shopping ↗
            </a>
          </div>
        </div>

        {/* ── Réparation ── */}
        <div className="card calc-a-rep">
          <h2 className="h-section">Réparation</h2>
          <div className="calc-fields">
            <ChampMontant id="calc-piece" label="Prix d'achat pièce (HT)" value={pieceTxt}
              onChange={(e) => { setPieceTxt(e.target.value); touche(); }} erreur={errPiece} />
            <ChampMontant id="calc-temps" label="Temps de réparation estimé" value={tempsTxt} unite="min" placeholder="Ex. : 20"
              onChange={(e) => { setTempsTxt(e.target.value); touche(); }} erreur={errTemps} msgErreur="Temps en minutes (0 à 480)">
              <div className="calc-temps">
                {TEMPS_RAPIDES.map(t => (
                  <button key={t} type="button" className={temps === t ? "on" : ""}
                    onClick={() => { setTempsTxt(String(t)); touche(); }}>{t} min</button>
                ))}
              </div>
              <div className="calc-aide">Ton temps de réparation seul. +{REGLES_PRIX.pec} min de prise en charge ajoutées automatiquement.</div>
            </ChampMontant>
            <div className="full">
              <label className="field-label" htmlFor="calc-objet">Réparation (facultatif, pour le devis)</label>
              <div className="calc-in">
                <input id="calc-objet" className="input txt" autoComplete="off" placeholder="Ex. : remplacement écran"
                  value={objet} onChange={(e) => { setObjet(e.target.value); touche(); }} />
              </div>
            </div>
          </div>
          <label className={`calc-check${qualirepar ? " on" : ""}`}>
            <input type="checkbox" checked={qualirepar} onChange={(e) => { setQualirepar(e.target.checked); touche(); }} />
            <div>
              <b>Bonus QualiRépar : −{euros(BONUS_QUALIREPAR)}</b>
              <span>Seulement si le smartphone et la panne sont éligibles</span>
            </div>
          </label>
        </div>

        {/* ── Garantie Plus ── (sous le prix sur téléphone) */}
        <div className="card calc-a-gp">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <h2 className="h-section" style={{ margin: 0 }}>Garantie Plus</h2>
            {palierForce != null && palierConseille >= 0 && palierForce !== palierConseille && (
              <button className="btn btn-ghost btn-sm" onClick={() => setPalierForce(null)}>
                Revenir au palier conseillé
              </button>
            )}
          </div>
          <div className="calc-gp">
            {PALIERS_GP.map((p, i) => (
              <button key={p.label}
                className={`${i === palier ? "on" : ""}${i === palierConseille ? " sug" : ""}`}
                onClick={() => { setPalierForce(i); touche(); }}>
                <span>{p.label}</span>
                <b>{euros(p.prix)}</b>
              </button>
            ))}
          </div>
          <p className="note">
            Le palier dépend de la valeur du téléphone. Il est proposé dès que la valeur est connue ;
            tu peux en choisir un autre.
          </p>
        </div>

        {/* ── Résultat ── */}
        <div className="calc-res stack">
          <div>
            <div className={`calc-hero${calc ? "" : " empty-st"}`}>
              <div className="lbl">Prix du pack</div>
              <div className="big-price">{packComplet ? euros(pack.pack) : "—"}</div>
              <div className="sub">Réparation + Garantie Plus + film Ocadia{qualirepar ? " − bonus QualiRépar" : ""}</div>
              {calc && (
                <div className="lines">
                  <div className="line"><span>Réparation</span><span>{euros(calc.ttc)}</span></div>
                  <div className="line"><span>Garantie Plus</span><span>{palier != null ? euros(gp) : "palier à choisir"}</span></div>
                  <div className="line"><span>Film Ocadia</span><span>{euros(pack.film)}</span></div>
                  {pack.bonus > 0 && (
                    <div className="line bonus"><span>Bonus QualiRépar</span><span>−{euros(pack.bonus)}</span></div>
                  )}
                </div>
              )}
              {!calc && <div className="warn" style={{ color: "rgba(255,255,255,.55)" }}>Saisis le prix de la pièce et ton temps de réparation</div>}
              {calc && palier == null && <div className="warn">Saisis la valeur du téléphone ou choisis un palier GP pour afficher le prix du pack.</div>}
              <div className="alt">
                <span>Réparation seule{pack?.bonus ? " (bonus déduit)" : ""}</span>
                <b>{calc ? euros(pack.reparationSeule) : "—"}</b>
              </div>
            </div>
            <div className="calc-actions">
              <button className="btn btn-primary" disabled={!calc} onClick={copier}>
                {copie ? "✓ Devis copié" : "Copier le devis"}
              </button>
              <button className="btn btn-ghost" onClick={reinit}>Nouveau client</button>
            </div>
          </div>

          {calc && voitMarge && (
            <div className="card accent-brand">
              <div className="calc-marge">
                <div>
                  <div className="lbl">Marge réparation (HT)</div>
                  <div className="meta">hors GP et film · bonus remboursé par QualiRépar · visible RZ uniquement</div>
                </div>
                <div className="v">{euros(calc.margeHT)}</div>
              </div>
            </div>
          )}

          {calc && (
            <div className="card calc-det">
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(d => !d)}>
                {detail ? "Masquer le détail" : "Voir le détail du calcul"}
              </button>
              {detail && (
                <div style={{ marginTop: 12 }}>
                  <div className="mrow"><span>Temps : {temps} + {calc.regles.pec} min de prise en charge</span><b>{calc.tempsFacture} min</b></div>
                  <div className="mrow"><span>Main d'œuvre ({calc.regles.taux} € HT/h)</span><b>{euros(calc.mo)}</b></div>
                  <div className="mrow"><span>Pièce × {virgule(COEF_PIECE)}</span><b>{euros(calc.pieceMajoree)}</b></div>
                  <div className="mrow"><span>= Total HT</span><b>{euros(calc.ht)}</b></div>
                  <div className="mrow"><span>TTC (TVA 20 %)</span><b>{euros(calc.ttcBrut)}</b></div>
                  <div className="mrow"><span>Réparation arrondie à la dizaine{calc.regles.decote ? ` − ${virgule(calc.regles.decote)} €` : ""}</span><b>{euros(calc.ttc)}</b></div>
                  <div className="mrow"><span>+ Garantie Plus</span><b>{palier != null ? euros(gp) : "—"}</b></div>
                  <div className="mrow"><span>+ Film Ocadia</span><b>{euros(pack.film)}</b></div>
                  {pack.bonus > 0 && <div className="mrow"><span>− Bonus QualiRépar</span><b>−{euros(pack.bonus)}</b></div>}
                  <div className="mrow tot"><span>Prix du pack TTC</span><b>{packComplet ? euros(pack.pack) : "—"}</b></div>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <button className="btn btn-ghost btn-sm" onClick={() => setFiche(f => !f)}>
              {fiche ? "Masquer la méthode" : "Comment est calculé le prix ?"}
            </button>
            {fiche && <FicheMethode />}
          </div>
        </div>
      </div>
    </div>
  );
}
