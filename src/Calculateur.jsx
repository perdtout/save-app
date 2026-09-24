// ═══════════════════════════════════════════════════════════════════════════
// Calculateur de prix de réparation — écran « Au comptoir »
//
// Reprise de l'outil casifox.github.io/save-calculateur-de-prix, aux couleurs
// de l'app. Même règle de calcul de la réparation, à l'euro près :
//   TTC réparation = ((prix pièce HT × 1,3) + main d'œuvre HT) × 1,2
//   arrondi à la dizaine la plus proche (144 → 140, 145 → 150)
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
const COEF_PIECE = 1.3;
const COEF_TVA = 1.2;
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

const arrondiDizaine = (v) => (v <= 0 ? 0 : Math.round(v / 10) * 10);

export const indexPalier = (valeur) => PALIERS_GP.findIndex(p => valeur <= p.max);

export function calculerPrix(piece, mo) {
  const pieceMajoree = piece * COEF_PIECE;
  const ht = pieceMajoree + mo;
  const ttcBrut = ht * COEF_TVA;
  const ttc = arrondiDizaine(ttcBrut);
  return { pieceMajoree, ht, ttcBrut, ttc, margeHT: ttc / COEF_TVA - piece };
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
function ChampMontant({ id, label, value, onChange, erreur }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="calc-in">
        <input id={id} className={`input${erreur ? " err" : ""}`} inputMode="decimal"
          autoComplete="off" placeholder="0,00" value={value} onChange={onChange} />
        <em>€</em>
      </div>
      {erreur && <div className="calc-err">Montant illisible</div>}
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
  const [moTxt, setMoTxt] = useState("");
  const [objet, setObjet] = useState("");
  const [qualirepar, setQualirepar] = useState(false);
  // Garantie Plus
  const [palierForce, setPalierForce] = useState(null);
  // Divers
  const [copie, setCopie] = useState(false);
  const [detail, setDetail] = useState(false);

  const piece = lireMontant(pieceTxt);
  const mo = lireMontant(moTxt);
  const valeur = lireMontant(valeurTxt);
  const errPiece = Number.isNaN(piece);
  const errMo = Number.isNaN(mo);
  const errValeur = Number.isNaN(valeur);
  const pret = piece != null && mo != null && !errPiece && !errMo && (piece > 0 || mo > 0);

  const calc = pret ? calculerPrix(piece, mo) : null;
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
    setPieceTxt(""); setMoTxt(""); setObjet(""); setQualirepar(false);
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
            <ChampMontant id="calc-mo" label="Main d'œuvre (HT)" value={moTxt}
              onChange={(e) => { setMoTxt(e.target.value); touche(); }} erreur={errMo} />
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
              {!calc && <div className="warn" style={{ color: "rgba(255,255,255,.55)" }}>Saisis le prix de la pièce et la main d'œuvre</div>}
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
                  <div className="mrow"><span>Pièce × {String(COEF_PIECE).replace(".", ",")}</span><b>{euros(calc.pieceMajoree)}</b></div>
                  <div className="mrow"><span>+ Main d'œuvre</span><b>{euros(mo)}</b></div>
                  <div className="mrow"><span>= Total HT</span><b>{euros(calc.ht)}</b></div>
                  <div className="mrow"><span>TTC (TVA 20 %)</span><b>{euros(calc.ttcBrut)}</b></div>
                  <div className="mrow"><span>Réparation arrondie à la dizaine</span><b>{euros(calc.ttc)}</b></div>
                  <div className="mrow"><span>+ Garantie Plus</span><b>{palier != null ? euros(gp) : "—"}</b></div>
                  <div className="mrow"><span>+ Film Ocadia</span><b>{euros(pack.film)}</b></div>
                  {pack.bonus > 0 && <div className="mrow"><span>− Bonus QualiRépar</span><b>−{euros(pack.bonus)}</b></div>}
                  <div className="mrow tot"><span>Prix du pack TTC</span><b>{packComplet ? euros(pack.pack) : "—"}</b></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
