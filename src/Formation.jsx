// ═══════════════════════════════════════════════════════════════════════════
// Formation nouvel arrivant — les bases de la réparation (famille « Formation »)
//
// Écran statique : aucune donnée serveur, il s'affiche même si le backend dort.
// Cinq onglets :
//   1. Vue éclatée   — schéma interactif d'un smartphone, rôle de chaque pièce
//   2. Poste & ESD   — tapis, bracelet, outils, gants, tenue SAVE, vêtements à éviter
//   3. Règles d'or   — l'ordre de réparation (batterie d'abord, test avant collage)
//   4. Check-list    — à cocher avant / pendant / après chaque intervention
//   5. Quiz          — 8 questions pour valider les acquis avec le responsable
//
// Ton : Thomas (RZ) qui parle directement à l'arrivant, en le tutoyant.
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from "react";

const CSS = `
.frm-hero{background:var(--ink);color:#fff;border-radius:var(--r);padding:22px 24px;position:relative;overflow:hidden}
.frm-hero h2{margin:0 0 6px;font-size:21px;letter-spacing:-.01em}
.frm-hero p{margin:0;color:rgba(255,255,255,.78);max-width:720px;font-size:14px}
.frm-hero .sig{margin-top:10px;color:var(--brand-light);font-size:12.5px;font-weight:600}
.frm-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(232,97,44,.45),transparent 70%)}
.frm-tabs{overflow-x:auto;max-width:100%}
.frm-ecl{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px;align-items:start}
@media(max-width:860px){.frm-ecl{grid-template-columns:1fr}}
.frm-svg{width:100%;height:auto;display:block}
.frm-svg .piece{cursor:pointer;transition:fill .15s}
.frm-svg .piece:hover{filter:brightness(.94)}
.frm-svg .pastille{cursor:pointer}
.frm-svg .pastille circle{fill:var(--ink);stroke:#fff;stroke-width:2}
.frm-svg .pastille.on circle{fill:var(--brand)}
.frm-svg .pastille text{fill:#fff;font-size:12px;font-weight:700;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.frm-svg .couche{fill:var(--muted);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.frm-liste{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.frm-liste button{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 11px;
  font-size:12.5px;font-weight:600;color:var(--sub);cursor:pointer}
.frm-liste button.on{border-color:var(--brand);background:var(--brand-wash);color:#C2481B}
.frm-fiche h3{margin:2px 0 4px;font-size:19px}
.frm-fiche .num{display:inline-flex;width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;
  font-weight:800;font-size:13px;align-items:center;justify-content:center;margin-right:8px;vertical-align:2px}
.frm-fiche dl{margin:14px 0 0;display:grid;gap:12px}
.frm-fiche dt{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.frm-fiche dd{margin:3px 0 0;font-size:14px;color:var(--ink)}
.frm-fiche .warn{background:var(--bad-wash);border-left:3px solid var(--bad);border-radius:8px;padding:10px 12px}
.frm-fiche .warn dt{color:var(--bad)}
.frm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.frm-carte{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:18px 20px}
.frm-carte .ico{font-size:26px;line-height:1}
.frm-carte h4{margin:8px 0 6px;font-size:15.5px}
.frm-carte p,.frm-carte li{font-size:13.5px;color:var(--sub);margin:0}
.frm-carte ul{margin:6px 0 0;padding-left:18px;display:grid;gap:4px}
.frm-carte.bad{border-top:3px solid var(--bad)}
.frm-carte.ok{border-top:3px solid var(--ok)}
.frm-carte.brand{border-top:3px solid var(--brand)}
.frm-pourquoi{background:var(--brand-wash);border-radius:var(--r);padding:16px 20px;font-size:14px}
.frm-pourquoi b{color:#C2481B}
.frm-etapes{display:grid;gap:12px;counter-reset:etape}
.frm-etape{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;background:var(--surface);
  border-radius:var(--r);box-shadow:var(--shadow);padding:16px 18px}
.frm-etape .n{width:44px;height:44px;border-radius:12px;background:var(--line-2);color:var(--ink);
  font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}
.frm-etape.cle{box-shadow:var(--shadow),inset 0 0 0 2px var(--brand)}
.frm-etape.cle .n{background:var(--brand);color:#fff}
.frm-etape h4{margin:0 0 4px;font-size:15.5px}
.frm-etape p{margin:0;font-size:13.5px;color:var(--sub)}
.frm-etape .pq{margin-top:8px;font-size:13px;color:var(--ink);background:var(--cream);border-radius:8px;padding:8px 10px}
.frm-badge{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
  background:var(--brand);color:#fff;border-radius:6px;padding:2px 7px;margin-left:8px;vertical-align:2px}
.frm-check h4{margin:0 0 10px;font-size:15px}
.frm-check label{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line-2);
  font-size:13.5px;cursor:pointer}
.frm-check label:first-of-type{border-top:none}
.frm-check input{accent-color:var(--brand);width:17px;height:17px;margin-top:1px;flex-shrink:0}
.frm-check label.fait span{color:var(--muted);text-decoration:line-through}
.frm-prog{height:8px;background:var(--line-2);border-radius:99px;overflow:hidden}
.frm-prog i{display:block;height:100%;background:var(--brand);border-radius:99px;transition:width .25s}
.frm-q{background:var(--surface);border-radius:var(--r);box-shadow:var(--shadow);padding:18px 20px}
.frm-q h4{margin:0 0 10px;font-size:15px}
.frm-q .opts{display:grid;gap:7px}
.frm-q .opts button{text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:10px;
  padding:9px 12px;font-size:13.5px;color:var(--ink);cursor:pointer}
.frm-q .opts button:hover:not([disabled]){border-color:var(--brand-light)}
.frm-q .opts button.bon{border-color:var(--ok);background:var(--ok-wash)}
.frm-q .opts button.faux{border-color:var(--bad);background:var(--bad-wash)}
.frm-q .opts button[disabled]{cursor:default}
.frm-q .expl{margin-top:10px;font-size:13px;color:var(--sub)}
.frm-score{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.frm-score b{font-size:28px;letter-spacing:-.02em}
`;

// ─── Vue éclatée ─────────────────────────────────────────────────────────────
// Chaque couche est dessinée dans un repère « téléphone à plat » (160 × 320),
// puis projetée en isométrie. Les pastilles sont recalculées avec la même projection.
const W = 160, H = 320;
const ISO = { a: 0.9, b: 0.35, c: -0.55, d: 0.45 };
const COUCHES = [
  { id: "avant",   label: "Face avant",   tx: 300, ty: 18 },
  { id: "chassis", label: "Châssis",      tx: 300, ty: 196 },
  { id: "arriere", label: "Face arrière", tx: 300, ty: 374 },
];
const proj = (x, y, c) => [c.tx + ISO.a * x + ISO.c * y, c.ty + ISO.b * x + ISO.d * y];
const matrice = (c) => `matrix(${ISO.a},${ISO.b},${ISO.c},${ISO.d},${c.tx},${c.ty})`;

const PIECES = [
  { n: 1, couche: "avant", nom: "Écran (vitre + dalle + tactile)", px: 80, py: 170,
    role: "Affiche l'image (dalle OLED ou LCD) et capte le toucher (couche tactile). La vitre de protection est collée dessus : on change l'ensemble, pas la vitre seule.",
    panne: "Vitre cassée, taches ou lignes, tactile fantôme ou mort, écran noir alors que le téléphone sonne.",
    attention: "Ouverture à la chaleur et au médiator, jamais en force : les nappes de l'écran sont fragiles et courtes. Sur iPhone, compare l'origine et le compatible (Bolt / Spark) avec le client avant de commander." },
  { n: 2, couche: "avant", nom: "Écouteur & capteurs (proximité, luminosité, Face ID)", px: 80, py: 18,
    role: "L'écouteur sert aux appels. Les capteurs éteignent l'écran contre l'oreille, règlent la luminosité et gèrent la reconnaissance faciale.",
    panne: "Son faible en appel, écran qui ne s'éteint pas pendant un appel, Face ID indisponible.",
    attention: "Ces éléments se transfèrent de l'ancien écran vers le neuf. Face ID est appairé à la carte mère : une nappe abîmée = Face ID perdu définitivement. Zéro précipitation sur cette étape." },
  { n: 3, couche: "chassis", nom: "Châssis (cadre)", px: 8, py: 200,
    role: "La structure du téléphone : il porte tous les composants, les boutons et souvent les antennes intégrées au cadre.",
    panne: "Cadre tordu après une chute (l'écran neuf ne se pose plus à plat), boutons enfoncés.",
    attention: "Un cadre tordu fait casser l'écran neuf à la pose. Contrôle-le avant de commander la pièce et préviens le client." },
  { n: 4, couche: "chassis", nom: "Carte mère", px: 110, py: 60,
    role: "Le cerveau : processeur, mémoire (les données du client), gestion de l'alimentation et du réseau. Tous les connecteurs de nappes y arrivent.",
    panne: "Ne s'allume plus, redémarre en boucle, pas de réseau, ne charge pas malgré un connecteur neuf.",
    attention: "La pièce la plus chère et la plus fragile. Aucun outil métal posé dessus batterie branchée. La micro-soudure se fait uniquement à Dijon : on oriente le client, on ne bricole pas." },
  { n: 5, couche: "chassis", nom: "Caméras", px: 32, py: 38,
    role: "Modules photo arrière (grand-angle, ultra grand-angle, téléobjectif) et caméra avant (sur la face avant selon le modèle).",
    panne: "Photo floue, écran noir dans l'appli, bruit de vibration (stabilisateur), lentille arrière fêlée.",
    attention: "Ne jamais toucher l'optique avec les doigts. Sur les iPhone récents, une caméra neuve peut afficher « pièce inconnue » : on l'annonce au client avant." },
  { n: 6, couche: "chassis", nom: "Batterie", px: 80, py: 195,
    role: "Stocke l'énergie. Elle alimente tout, y compris quand le téléphone semble éteint.",
    panne: "Autonomie faible, extinctions à 20-30 %, batterie gonflée qui soulève l'écran.",
    attention: "TOUJOURS la déconnecter en premier, avec un outil plastique. Gonflée ou percée : on ne force pas, on ne perce pas, on ne chauffe pas — on isole dans le bac de sécurité et on me prévient." },
  { n: 7, couche: "chassis", nom: "Connecteur de charge (sous-carte + micro)", px: 80, py: 290,
    role: "Prise de charge et de données. Sur beaucoup de modèles, la sous-carte porte aussi le micro principal.",
    panne: "Ne charge plus ou par intermittence, câble qui tient mal, micro qui ne marche plus en appel.",
    attention: "Toujours tenter un nettoyage (outil non conducteur) avant de vendre un remplacement : une peluche de poche suffit à bloquer la charge." },
  { n: 8, couche: "chassis", nom: "Haut-parleur", px: 132, py: 290,
    role: "Son des sonneries, de la musique et du haut-parleur en appel.",
    panne: "Son grésillant, faible ou absent, grille bouchée.",
    attention: "Vérifie le son avant démontage pour ne pas te faire reprocher une panne déjà existante." },
  { n: 9, couche: "chassis", nom: "Moteur vibreur", px: 28, py: 288,
    role: "Produit les vibrations et le retour haptique.",
    panne: "Plus de vibration, bruit de cliquetis.",
    attention: "Petit, souvent maintenu par des vis de longueurs différentes : range-les à part." },
  { n: 10, couche: "chassis", nom: "Nappes & connecteurs", px: 140, py: 125,
    role: "Les « câbles » plats qui relient chaque pièce à la carte mère, clipsés sur des connecteurs.",
    panne: "Une nappe mal clipsée ou pincée suffit à donner « écran noir » ou « tactile mort » après réparation.",
    attention: "On déclipse à la verticale avec un spatule plastique, jamais en tirant sur la nappe. On reclipse bien à plat, sans forcer." },
  { n: 11, couche: "arriere", nom: "Vitre arrière / coque", px: 50, py: 250,
    role: "Ferme le téléphone et protège l'intérieur. Sur la plupart des modèles récents, c'est du verre collé.",
    panne: "Vitre éclatée, coupures, poussière qui rentre.",
    attention: "Vitres arrière Apple de l'onglet « Prix fixes » des tarifs : faisables uniquement à Pontarlier. Les autres se font dans tous les magasins." },
  { n: 12, couche: "arriere", nom: "Bobine charge sans fil / NFC", px: 80, py: 170,
    role: "Permet la charge sans fil et le paiement sans contact.",
    panne: "Charge sans fil ou paiement mobile qui ne fonctionnent plus après une chute ou une réparation.",
    attention: "Souvent collée sous la vitre arrière : à décoller doucement, elle se déchire facilement." },
];

function VueEclatee() {
  const [sel, setSel] = useState(6);
  const p = PIECES.find(x => x.n === sel);
  const couleur = (n, base) => (n === sel ? "var(--brand)" : base);
  const couche = (id) => COUCHES.find(c => c.id === id);

  return (
    <div className="frm-ecl">
      <div className="card">
        <svg className="frm-svg" viewBox="0 0 470 590" role="img" aria-label="Vue éclatée d'un smartphone">
          {/* Lignes d'assemblage entre les couches */}
          {[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y], i) => {
            const [x1, y1] = proj(x, y, COUCHES[0]);
            const [x2, y2] = proj(x, y, COUCHES[2]);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1.2" strokeDasharray="4 5" />;
          })}

          {/* Face arrière */}
          <g transform={matrice(COUCHES[2])}>
            <rect className="piece" x="0" y="0" width={W} height={H} rx="22" fill={couleur(11, "#D6CFC8")} stroke="#8A847E" strokeWidth="1.5" onClick={() => setSel(11)} />
            <rect x="10" y="12" width="56" height="62" rx="12" fill="#B9B1A9" />
            <circle className="piece" cx="80" cy="170" r="40" fill="none" stroke={couleur(12, "#5A544E")} strokeWidth="7" onClick={() => setSel(12)} />
            <circle cx="80" cy="170" r="24" fill="none" stroke={couleur(12, "#5A544E")} strokeWidth="5" opacity=".7" />
          </g>

          {/* Châssis et composants */}
          <g transform={matrice(COUCHES[1])}>
            <rect className="piece" x="0" y="0" width={W} height={H} rx="22" fill={couleur(3, "#F0EDEA")} stroke="#5A544E" strokeWidth="2.5" onClick={() => setSel(3)} />
            <rect className="piece" x="70" y="12" width="78" height="108" rx="6" fill={couleur(4, "#3E6B4F")} onClick={() => setSel(4)} />
            <rect x="88" y="30" width="26" height="26" rx="3" fill="#2B2B2B" opacity=".75" />
            <rect x="120" y="70" width="18" height="12" rx="2" fill="#2B2B2B" opacity=".6" />
            <g className="piece" onClick={() => setSel(5)}>
              <rect x="10" y="12" width="56" height="62" rx="10" fill={couleur(5, "#4A4A4A")} />
              <circle cx="26" cy="28" r="10" fill="#1E1E1E" stroke="#8A847E" strokeWidth="2" />
              <circle cx="50" cy="28" r="10" fill="#1E1E1E" stroke="#8A847E" strokeWidth="2" />
              <circle cx="26" cy="54" r="10" fill="#1E1E1E" stroke="#8A847E" strokeWidth="2" />
            </g>
            <rect className="piece" x="20" y="132" width="120" height="128" rx="8" fill={couleur(6, "#F59E0B")} stroke="#B4881B" strokeWidth="1.5" onClick={() => setSel(6)} />
            <path className="piece" d="M128 120 L128 132 M136 120 L136 150 L148 150" stroke={couleur(10, "#E8612C")} strokeWidth="5" fill="none" strokeLinecap="round" onClick={() => setSel(10)} />
            <rect className="piece" x="12" y="272" width="34" height="34" rx="6" fill={couleur(9, "#8A847E")} onClick={() => setSel(9)} />
            <rect className="piece" x="54" y="276" width="54" height="28" rx="6" fill={couleur(7, "#5A544E")} onClick={() => setSel(7)} />
            <rect className="piece" x="116" y="272" width="34" height="36" rx="6" fill={couleur(8, "#6E6760")} onClick={() => setSel(8)} />
          </g>

          {/* Face avant */}
          <g transform={matrice(COUCHES[0])}>
            <rect className="piece" x="0" y="0" width={W} height={H} rx="22" fill={couleur(1, "#2B2B2B")} stroke="#1A1A1A" strokeWidth="2" onClick={() => setSel(1)} />
            <rect x="8" y="8" width={W - 16} height={H - 16} rx="16" fill="#363636" opacity=".55" pointerEvents="none" />
            <rect className="piece" x="52" y="10" width="56" height="16" rx="8" fill={couleur(2, "#0F0F0F")} stroke="#5A544E" strokeWidth="1" onClick={() => setSel(2)} />
          </g>

          {/* Titres de couches */}
          {COUCHES.map(c => {
            const [x, y] = proj(0, H, c);
            return <text key={c.id} className="couche" x={x - 14} y={y + 4} textAnchor="end">{c.label}</text>;
          })}

          {/* Pastilles numérotées */}
          {PIECES.map(pc => {
            const [x, y] = proj(pc.px, pc.py, couche(pc.couche));
            return (
              <g key={pc.n} className={`pastille${pc.n === sel ? " on" : ""}`} onClick={() => setSel(pc.n)}>
                <circle cx={x} cy={y} r="12" />
                <text x={x} y={y}>{pc.n}</text>
              </g>
            );
          })}
        </svg>
        <div className="frm-liste">
          {PIECES.map(pc => (
            <button key={pc.n} className={pc.n === sel ? "on" : ""} onClick={() => setSel(pc.n)}>
              {pc.n}. {pc.nom.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="card frm-fiche" aria-live="polite">
        <span className="lbl">{COUCHES.find(c => c.id === p.couche).label}</span>
        <h3><span className="num">{p.n}</span>{p.nom}</h3>
        <dl>
          <div><dt>À quoi ça sert</dt><dd>{p.role}</dd></div>
          <div><dt>Pannes qu'on voit au comptoir</dt><dd>{p.panne}</dd></div>
          <div className="warn"><dt>⚠️ Attention</dt><dd>{p.attention}</dd></div>
        </dl>
      </div>
    </div>
  );
}

// ─── Poste de travail & ESD ──────────────────────────────────────────────────
function PosteEsd() {
  return (
    <div className="stack">
      <div className="frm-pourquoi">
        <b>Pourquoi on est intransigeants sur l'électricité statique ?</b> Ton corps se charge en marchant, en bougeant
        sur ta chaise, en frottant tes vêtements. Tu ne sens une décharge qu'à partir d'environ 3 000 volts, alors qu'une
        décharge de quelques dizaines de volts suffit à abîmer une puce. Le pire, c'est que la panne n'apparaît pas tout
        de suite : le téléphone part avec le client et revient quelques jours plus tard. Une décharge ne se voit pas,
        elle se prévient.
      </div>

      <div className="frm-grid">
        <div className="frm-carte brand">
          <div className="ico">🟫</div>
          <h4>Tapis ESD relié à la terre</h4>
          <ul>
            <li>Toute réparation se fait <b>sur le tapis</b>, jamais sur le comptoir nu.</li>
            <li>Vérifie que le cordon de mise à la terre est bien branché.</li>
            <li>Tapis propre : pas de vis, de colle ou de morceaux de verre qui traînent.</li>
          </ul>
        </div>
        <div className="frm-carte brand">
          <div className="ico">⌚</div>
          <h4>Bracelet antistatique</h4>
          <ul>
            <li>Au poignet, en contact avec la peau, relié au tapis.</li>
            <li>On le met <b>avant</b> d'ouvrir le téléphone, on l'enlève après fermeture.</li>
          </ul>
        </div>
        <div className="frm-carte brand">
          <div className="ico">🧤</div>
          <h4>Gants ESD</h4>
          <ul>
            <li>Ils évitent les décharges et les traces de doigts sur les dalles et les optiques.</li>
            <li>Gants propres : un gant plein de colle ou de poussière abîme la pièce neuve.</li>
          </ul>
        </div>
        <div className="frm-carte brand">
          <div className="ico">🛠️</div>
          <h4>Outils ESD</h4>
          <ul>
            <li>Spatules et médiators en plastique ou nylon antistatique pour ouvrir et déclipser.</li>
            <li>Pinces ESD, tournevis avec le bon embout (pentalobe, tri-wing, cruciforme) : un mauvais embout abîme la vis.</li>
            <li>Tapis magnétique ou boîte à cases pour ranger les vis dans l'ordre.</li>
            <li>Pas de métal près d'une batterie branchée.</li>
          </ul>
        </div>
        <div className="frm-carte ok">
          <div className="ico">👕</div>
          <h4>Tenue SAVE obligatoire</h4>
          <ul>
            <li>La tenue SAVE, c'est notre image face au client et ta protection à l'atelier.</li>
            <li>Propre et portée tous les jours d'ouverture, du mardi au samedi.</li>
            <li>Cheveux longs attachés, manches qui ne traînent pas sur le tapis.</li>
          </ul>
        </div>
        <div className="frm-carte bad">
          <div className="ico">🚫</div>
          <h4>À ne pas porter à l'atelier</h4>
          <ul>
            <li>Laine, polaire, pulls en acrylique ou en nylon : ce sont des générateurs d'électricité statique.</li>
            <li>Bagues, bracelets et montres métalliques au poste de travail.</li>
            <li>Semelles isolantes très épaisses + moquette = charge garantie : touche le tapis avant de commencer.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Règles d'or ─────────────────────────────────────────────────────────────
const ETAPES = [
  { t: "Prise en charge et test d'entrée", d: "Avec le client devant toi : tu testes ce qui fonctionne (écran, tactile, son, caméras, charge, Face ID / empreinte) et tu notes l'état extérieur dans Trepidai.",
    pq: "Ce qui n'est pas noté à l'entrée deviendra « c'est vous qui l'avez cassé » à la sortie." },
  { t: "Éteindre le téléphone", d: "On ne démonte jamais un téléphone allumé. Retire la carte SIM et la coque du client, range-les dans le bac de la fiche." },
  { t: "Ouvrir proprement", d: "Chaleur douce, ventouse, médiator. Tu avances doucement en surveillant les nappes : sur la plupart des modèles, elles sont d'un seul côté et très courtes." },
  { t: "Déconnecter la batterie AVANT tout le reste", cle: true, d: "Première chose une fois ouvert : tu retires le cache et tu déclipses la nappe batterie avec une spatule plastique. Ensuite seulement tu touches à l'écran, au connecteur ou à n'importe quelle autre pièce.",
    pq: "Batterie branchée, un connecteur qui touche de travers suffit à griller un rétroéclairage, un circuit de charge ou toute la carte mère. C'est la règle n°1, sans exception." },
  { t: "Ranger les vis dans l'ordre", d: "Chaque vis a sa place et sa longueur. Tapis magnétique ou boîte à cases, dans l'ordre du démontage.",
    pq: "Une vis trop longue remise au mauvais endroit peut percer la carte mère." },
  { t: "Remplacer la pièce", d: "Pièce neuve sortie de son sachet antistatique au dernier moment. Transfère les éléments à récupérer (capteurs, caches, adhésifs) sans forcer." },
  { t: "Tester AVANT le remontage complet et le collage", cle: true, d: "Tu branches la pièce neuve, tu reconnectes la batterie, tu allumes et tu testes tout : affichage, tactile sur toute la surface, luminosité, son, caméras, Face ID, charge. Si c'est bon : batterie à nouveau déconnectée, puis seulement fermeture et collage.",
    pq: "Une pièce neuve peut être défectueuse. Si tu as déjà collé, tu redémontes, tu risques de casser l'écran et tu perds un joint. On teste d'abord, on colle ensuite." },
  { t: "Fermer, coller, tester de nouveau", d: "Joint neuf, vis à leur place, pression uniforme. Test de sortie complet, idéalement devant le client, puis saisie de la réparation dans Trepidai." },
];

function ReglesOr() {
  return (
    <div className="stack">
      <div className="frm-pourquoi">
        L'ordre compte autant que le geste. Les étapes <b>4</b> et <b>7</b> sont non négociables : ce sont elles qui
        évitent la plupart des retours atelier et des cartes mères grillées.
      </div>
      <div className="frm-etapes">
        {ETAPES.map((e, i) => (
          <div key={i} className={`frm-etape${e.cle ? " cle" : ""}`}>
            <div className="n">{i + 1}</div>
            <div>
              <h4>{e.t}{e.cle && <span className="frm-badge">Règle d'or</span>}</h4>
              <p>{e.d}</p>
              {e.pq && <div className="pq">💡 {e.pq}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Check-list ──────────────────────────────────────────────────────────────
const CHECK = [
  { titre: "Avant d'ouvrir", items: [
    "Tenue SAVE propre, pas de laine ni de polaire",
    "Bijoux et montre retirés",
    "Tapis ESD branché à la terre, propre",
    "Bracelet antistatique au poignet et relié",
    "Gants ESD mis",
    "Test d'entrée fait et noté dans Trepidai",
    "Téléphone éteint, SIM et coque retirées",
  ] },
  { titre: "Pendant", items: [
    "Batterie déconnectée en premier, outil plastique",
    "Vis rangées dans l'ordre du démontage",
    "Nappes déclipsées à la verticale, sans tirer",
    "Pièce neuve sortie du sachet au dernier moment",
  ] },
  { titre: "Avant de fermer", items: [
    "Pièce neuve branchée, batterie reconnectée, test complet OK",
    "Batterie de nouveau déconnectée",
    "Joint / adhésif neuf posé, collage",
    "Test de sortie complet et saisie Trepidai",
  ] },
];

function CheckList() {
  const total = CHECK.reduce((s, g) => s + g.items.length, 0);
  const [coches, setCoches] = useState({});
  const nb = Object.values(coches).filter(Boolean).length;
  const basculer = (k) => setCoches(c => ({ ...c, [k]: !c[k] }));

  return (
    <div className="stack">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
          <span className="lbl">Progression de l'intervention</span>
          <span className="meta">{nb} / {total}</span>
        </div>
        <div className="frm-prog"><i style={{ width: `${(nb / total) * 100}%` }} /></div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCoches({})}>Nouvelle intervention</button>
          {nb === total && <span className="meta" style={{ color: "var(--ok)", fontWeight: 600 }}>✔ Tout est fait, beau travail.</span>}
        </div>
      </div>
      <div className="frm-grid">
        {CHECK.map((g, gi) => (
          <div key={gi} className="frm-carte frm-check">
            <h4>{g.titre}</h4>
            {g.items.map((it, ii) => {
              const k = `${gi}-${ii}`;
              return (
                <label key={k} className={coches[k] ? "fait" : ""}>
                  <input type="checkbox" checked={!!coches[k]} onChange={() => basculer(k)} />
                  <span>{it}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quiz ────────────────────────────────────────────────────────────────────
const QUIZ = [
  { q: "Tu viens d'ouvrir un téléphone pour changer l'écran. Que fais-tu en premier ?",
    o: ["Je déclipse la nappe de l'écran", "Je déconnecte la batterie", "Je retire les vis du cache de la carte mère", "Je teste l'écran neuf"], r: 1,
    e: "La batterie d'abord, toujours. Tant qu'elle est branchée, la carte mère est sous tension." },
  { q: "L'écran neuf est branché. À quel moment le colles-tu ?",
    o: ["Tout de suite, pour gagner du temps", "Après avoir testé affichage, tactile, son, caméras et Face ID", "Le lendemain", "Seulement si le client le demande"], r: 1,
    e: "On teste d'abord, on colle ensuite. Une pièce neuve peut être défectueuse." },
  { q: "Quelle tenue est à éviter à l'atelier ?",
    o: ["Le polo SAVE en coton", "Un pull polaire", "La tenue SAVE avec les manches retroussées", "Des chaussures fermées"], r: 1,
    e: "Polaire, laine, acrylique, nylon : ce sont des générateurs d'électricité statique." },
  { q: "À partir de combien de volts ressens-tu une décharge électrostatique ?",
    o: ["Environ 30 V", "Environ 300 V", "Environ 3 000 V", "On la sent toujours"], r: 2,
    e: "Environ 3 000 V. Une puce peut être abîmée bien en dessous : c'est pour ça qu'on se protège sans attendre de la sentir." },
  { q: "Une batterie est gonflée et soulève l'écran. Que fais-tu ?",
    o: ["Je la chauffe pour la décoller plus vite", "J'appuie dessus pour refermer", "Je ne force pas, je l'isole dans le bac de sécurité et je préviens", "Je la perce pour la dégonfler"], r: 2,
    e: "Une batterie gonflée peut prendre feu. Pas de chaleur, pas de pression, pas d'outil pointu." },
  { q: "Avec quoi déclipses-tu une nappe ?",
    o: ["Un tournevis métal", "Une spatule plastique, à la verticale", "Une pince en tirant sur la nappe", "Avec l'ongle"], r: 1,
    e: "Spatule plastique ESD, on soulève le connecteur à la verticale, on ne tire jamais sur la nappe." },
  { q: "Pourquoi ranger les vis dans l'ordre du démontage ?",
    o: ["Pour faire propre", "Parce qu'une vis trop longue au mauvais endroit peut percer la carte mère", "Pour en avoir en stock", "Ça n'a pas d'importance"], r: 1,
    e: "Les vis n'ont pas toutes la même longueur. Une erreur de placement peut détruire la carte mère." },
  { q: "Pourquoi faire un test d'entrée devant le client ?",
    o: ["Pour remplir le temps d'attente", "Pour noter ce qui fonctionne et l'état du téléphone avant intervention", "Ce n'est pas utile si le client est pressé", "Pour vendre un accessoire"], r: 1,
    e: "Ce qui n'est pas constaté à l'entrée ne peut pas être défendu à la sortie." },
];

function Quiz() {
  const [rep, setRep] = useState({});
  const nbRep = Object.keys(rep).length;
  const score = QUIZ.reduce((s, q, i) => s + (rep[i] === q.r ? 1 : 0), 0);
  const fini = nbRep === QUIZ.length;

  return (
    <div className="stack">
      <div className="card frm-score">
        <div>
          <span className="lbl">Score</span>
          <div><b>{score}</b> <span className="meta">/ {QUIZ.length} · {nbRep} répondue{nbRep > 1 ? "s" : ""}</span></div>
        </div>
        {fini && (
          <div style={{ flex: 1, minWidth: 220, fontSize: 14 }}>
            {score === QUIZ.length
              ? "Sans faute, bravo. Montre ce score à ton responsable, tu peux passer à la pratique encadrée."
              : score >= 6
                ? "Bonne base. Relis les questions en rouge avec ton responsable avant ta première réparation seul."
                : "Pas encore. Reprends les onglets Règles d'or et Poste & ESD, puis refais le quiz."}
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setRep({})}>Recommencer</button>
      </div>
      {QUIZ.map((q, i) => {
        const choisi = rep[i];
        const repondu = choisi !== undefined;
        return (
          <div key={i} className="frm-q">
            <h4>{i + 1}. {q.q}</h4>
            <div className="opts">
              {q.o.map((o, j) => {
                const cls = !repondu ? "" : j === q.r ? "bon" : j === choisi ? "faux" : "";
                return (
                  <button key={j} className={cls} disabled={repondu} onClick={() => setRep(r => ({ ...r, [i]: j }))}>
                    {o}
                  </button>
                );
              })}
            </div>
            {repondu && <div className="expl">{choisi === q.r ? "✔ " : "✘ "}{q.e}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Écran ───────────────────────────────────────────────────────────────────
const ONGLETS = [
  { id: "eclate",  label: "Vue éclatée" },
  { id: "esd",     label: "Poste & ESD" },
  { id: "regles",  label: "Règles d'or" },
  { id: "check",   label: "Check-list" },
  { id: "quiz",    label: "Quiz" },
];

export default function Formation() {
  const [onglet, setOnglet] = useState("eclate");
  return (
    <div className="stack">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="frm-hero">
        <h2>Bienvenue chez SAVE — les bases de la réparation</h2>
        <p>
          Avant ta première réparation, on prend le temps. Ici tu trouves ce qu'il y a dans un smartphone, comment
          protéger ton poste et les règles qu'on ne contourne jamais. Si un point n'est pas clair, tu le dis :
          chez nous, une question posée vaut mieux qu'une carte mère grillée.
        </p>
        <div className="sig">— Thomas, responsable de zone</div>
      </div>

      <div className="frm-tabs">
        <div className="seg" role="tablist">
          {ONGLETS.map(o => (
            <button key={o.id} role="tab" aria-selected={onglet === o.id} className={onglet === o.id ? "on" : ""} onClick={() => setOnglet(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {onglet === "eclate" && <VueEclatee />}
      {onglet === "esd"    && <PosteEsd />}
      {onglet === "regles" && <ReglesOr />}
      {onglet === "check"  && <CheckList />}
      {onglet === "quiz"   && <Quiz />}
    </div>
  );
}
