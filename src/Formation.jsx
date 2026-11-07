// ═══════════════════════════════════════════════════════════════════════════
// Formation nouvel arrivant — les bases de la réparation (famille « Formation »)
//
// Écran statique : aucune donnée serveur, il s'affiche même si le backend dort.
// Cinq onglets :
//   1. Vue éclatée   — schéma interactif d'un smartphone, rôle de chaque pièce
//   2. Poste & ESD   — tapis, bracelet, outils, gants, tenue SAVE, vêtements à éviter
//   3. Règles d'or   — l'ordre de réparation (batterie d'abord, test avant collage)
//   4. Check-list    — à cocher avant / pendant / après chaque intervention
//   5. Quiz          — 10 questions pour valider les acquis avec le responsable
//
// Ton : Thomas (RZ) qui parle directement à l'arrivant, en le tutoyant.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";

const CSS = `
.frm-hero{background:var(--ink);color:#fff;border-radius:var(--r);padding:22px 24px;position:relative;overflow:hidden}
.frm-hero h2{margin:0 0 6px;font-size:21px;letter-spacing:-.01em}
.frm-hero p{margin:0;color:rgba(255,255,255,.78);max-width:720px;font-size:14px}
.frm-hero .sig{margin-top:10px;color:var(--brand-light);font-size:12.5px;font-weight:600}
.frm-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;
  background:radial-gradient(circle,rgba(232,97,44,.45),transparent 70%)}
.frm-tabs{overflow-x:auto;max-width:100%}
.frm-ecl{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;align-items:start}
@media(max-width:980px){.frm-ecl{grid-template-columns:1fr}}
.frm-svg{width:100%;height:auto;display:block}
.frm-svg .piece{cursor:pointer;transition:fill .15s}
.frm-svg .piece:hover{filter:brightness(.94)}
.frm-svg .pastille{cursor:pointer}
.frm-svg .pastille circle{fill:var(--ink);stroke:#fff;stroke-width:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.frm-svg .pastille.on circle{fill:var(--brand)}
.frm-svg .pastille text{fill:#fff;font-weight:700;text-anchor:middle;dominant-baseline:central;pointer-events:none}
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
// Quatre couches flottantes (écran, châssis, composants, vitre arrière), chacune
// dessinée dans un repère « téléphone à plat » (160 × 320) puis projetée en
// isométrie. Chaque pièce a sa zone cliquable (hit) et une étiquette reliée par
// un trait. Sur téléphone, les étiquettes disparaissent au profit des pastilles.
const W = 160, H = 320;
const ISO = { a: 0.9, b: 0.35, c: -0.55, d: 0.45 };
const COUCHES = {
  avant:   { tx: 330, ty: 20,  ep: 6,  label: "Face avant" },
  chassis: { tx: 330, ty: 200, ep: 10, label: "Châssis" },
  compo:   { tx: 330, ty: 405, ep: 0,  label: "Composants" },
  arriere: { tx: 330, ty: 610, ep: 6,  label: "Face arrière" },
};
const proj = (x, y, c) => [c.tx + ISO.a * x + ISO.c * y, c.ty + ISO.b * x + ISO.d * y];
const matrice = (c) => `matrix(${ISO.a},${ISO.b},${ISO.c},${ISO.d},${c.tx},${c.ty})`;
const rr = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const CADRE = rr(0, 0, W, H, 22) + rr(9, 9, W - 18, H - 18, 15);
const NAPPE = "M144 112 L152 112 L152 262 L108 262";

const PIECES = [
  { n: 1, couche: "avant", court: "Écran", cote: "L", px: 30, py: 230,
    hit: { rect: [0, 0, W, H, 22] },
    nom: "Écran (vitre + dalle + tactile)",
    role: "Affiche l'image (dalle OLED ou LCD) et capte le toucher (couche tactile). La vitre de protection est collée dessus : on change l'ensemble, pas la vitre seule.",
    panne: "Vitre cassée, taches ou lignes, tactile fantôme ou mort, écran noir alors que le téléphone sonne.",
    attention: "Ouverture à la chaleur et au médiator, jamais en force : les nappes de l'écran sont fragiles et courtes. Sur iPhone, compare l'origine et le compatible (Bolt / Spark) avec le client avant de commander." },
  { n: 4, couche: "chassis", court: "Caméra avant & Face ID", cote: "L", px: 44, py: 34,
    hit: { rect: [36, 25, 88, 17, 8] },
    nom: "Caméra avant & module Face ID",
    role: "La caméra avant fait les selfies et les visios. Sur iPhone, le module Face ID (projecteur de points + caméra infrarouge) sert au déverrouillage par le visage.",
    panne: "Selfie flou ou noir, « Face ID indisponible », déverrouillage facial qui ne marche plus après une chute.",
    attention: "Face ID est appairé à la carte mère : il ne se remplace pas chez nous. Une nappe abîmée = Face ID perdu définitivement. On le teste à l'entrée devant le client et on le manipule sans aucune précipitation." },
  { n: 2, couche: "chassis", court: "Écouteur (earpiece)", cote: "L", px: 90, py: 16,
    hit: { rect: [56, 11, 44, 11, 5] },
    nom: "Écouteur interne (earpiece)",
    role: "Le petit haut-parleur du haut : c'est lui qu'on entend quand on téléphone avec l'appareil collé à l'oreille. Sur beaucoup de modèles, il sert aussi de 2ᵉ haut-parleur en stéréo.",
    panne: "Le client entend mal ou plus du tout en appel alors que le haut-parleur du bas fonctionne, son grésillant, grille encrassée.",
    attention: "Sur un changement d'écran, on vérifie qu'il est bien remonté et que sa grille n'est pas bouchée par la colle. Test obligatoire : un appel de contrôle, téléphone à l'oreille, avant de rendre l'appareil." },
  { n: 3, couche: "chassis", court: "Capteur luminosité", cote: "R", px: 120, py: 16,
    hit: { rect: [104, 11, 24, 11, 4] },
    nom: "Capteur de luminosité & de proximité",
    role: "Le capteur de luminosité règle automatiquement la luminosité de l'écran. Le capteur de proximité éteint l'écran quand le téléphone est contre l'oreille, pour éviter de raccrocher avec la joue.",
    panne: "Luminosité automatique qui ne marche plus, écran qui reste allumé (ou noir) pendant un appel, appels raccrochés tout seuls.",
    attention: "Souvent sur une petite nappe à transférer de l'ancien écran vers le neuf. Une nappe pincée ou un capteur mal positionné = écran noir en appel. Test : appel de contrôle + main devant le capteur." },
  { n: 5, couche: "chassis", court: "Châssis (cadre)", cote: "L", px: 4, py: 200,
    hit: { d: CADRE },
    nom: "Châssis (cadre)",
    role: "La structure du téléphone : il porte tous les composants, les boutons et souvent les antennes intégrées au cadre (les petites bandes plastique sur le métal).",
    panne: "Cadre tordu après une chute (l'écran neuf ne se pose plus à plat), boutons enfoncés.",
    attention: "Un cadre tordu fait casser l'écran neuf à la pose. Contrôle-le avant de commander la pièce et préviens le client." },
  { n: 6, couche: "compo", court: "Carte mère", cote: "R", px: 108, py: 40,
    hit: { rect: [66, 10, 84, 108, 6] },
    nom: "Carte mère",
    role: "Le cerveau : processeur, mémoire (les données du client), gestion de l'alimentation et du réseau. Tous les connecteurs de nappes y arrivent.",
    panne: "Ne s'allume plus, redémarre en boucle, pas de réseau, ne charge pas malgré un connecteur neuf.",
    attention: "La pièce la plus chère et la plus fragile. Aucun outil métal posé dessus batterie branchée. La micro-soudure se fait uniquement à Dijon : on oriente le client, on ne bricole pas." },
  { n: 7, couche: "compo", court: "Caméras arrière", cote: "L", px: 12, py: 64,
    hit: { rect: [10, 10, 52, 60, 10] },
    nom: "Caméras arrière",
    role: "Le bloc photo arrière (grand-angle, ultra grand-angle, téléobjectif selon le modèle), relié à la carte mère par sa nappe.",
    panne: "Photo floue, écran noir dans l'appli, bruit de vibration (stabilisateur), lentille arrière fêlée.",
    attention: "Ne jamais toucher l'optique avec les doigts. Sur les iPhone récents, une caméra neuve peut afficher « pièce inconnue » : on l'annonce au client avant." },
  { n: 8, couche: "compo", court: "Batterie", cote: "L", px: 24, py: 200,
    hit: { rect: [18, 128, 124, 130, 8] },
    nom: "Batterie",
    role: "Stocke l'énergie. Elle alimente tout, y compris quand le téléphone semble éteint.",
    panne: "Autonomie faible, extinctions à 20-30 %, batterie gonflée qui soulève l'écran.",
    attention: "TOUJOURS la déconnecter en premier, avec un outil plastique. Gonflée ou percée : on ne force pas, on ne perce pas, on ne chauffe pas — on isole dans le bac de sécurité et on me prévient." },
  { n: 9, couche: "compo", court: "Connecteur de charge", cote: "R", px: 82, py: 300,
    hit: { rect: [56, 266, 52, 42, 4] },
    nom: "Connecteur de charge (sous-carte + micro)",
    role: "Prise de charge et de données. Sur beaucoup de modèles, la sous-carte porte aussi le micro principal.",
    panne: "Ne charge plus ou par intermittence, câble qui tient mal, micro qui ne marche plus en appel.",
    attention: "Toujours tenter un nettoyage (outil non conducteur) avant de vendre un remplacement : une peluche de poche suffit à bloquer la charge." },
  { n: 10, couche: "compo", court: "Haut-parleur", cote: "R", px: 140, py: 300,
    hit: { rect: [112, 268, 36, 38, 6] },
    nom: "Haut-parleur",
    role: "Son des sonneries, de la musique et du haut-parleur en appel.",
    panne: "Son grésillant, faible ou absent, grille bouchée.",
    attention: "Vérifie le son avant démontage pour ne pas te faire reprocher une panne déjà existante." },
  { n: 11, couche: "compo", court: "Moteur vibreur", cote: "L", px: 18, py: 296,
    hit: { rect: [14, 268, 36, 36, 5] },
    nom: "Moteur vibreur",
    role: "Produit les vibrations et le retour haptique.",
    panne: "Plus de vibration, bruit de cliquetis.",
    attention: "Petit, souvent maintenu par des vis de longueurs différentes : range-les à part." },
  { n: 12, couche: "compo", court: "Nappes", cote: "R", px: 152, py: 180,
    hit: { d: NAPPE, trait: true },
    nom: "Nappes & connecteurs",
    role: "Les « câbles » plats (en orange sur le schéma) qui relient chaque pièce à la carte mère, clipsés sur des connecteurs dorés.",
    panne: "Une nappe mal clipsée ou pincée suffit à donner « écran noir » ou « tactile mort » après réparation.",
    attention: "On déclipse à la verticale avec une spatule plastique, jamais en tirant sur la nappe. On reclipse bien à plat, sans forcer. Chaque déclipsage fatigue le connecteur : on ne déconnecte que ce qui est nécessaire." },
  { n: 13, couche: "arriere", court: "Vitre arrière", cote: "L", px: 24, py: 250,
    hit: { rect: [0, 0, W, H, 22] },
    nom: "Vitre arrière / coque",
    role: "Ferme le téléphone et protège l'intérieur. Sur la plupart des modèles récents, c'est du verre collé, avec l'îlot des objectifs photo.",
    panne: "Vitre éclatée, coupures, poussière qui rentre.",
    attention: "Vitres arrière Apple de l'onglet « Prix fixes » des tarifs : faisables uniquement à Pontarlier. Les autres se font dans tous les magasins." },
  { n: 14, couche: "arriere", court: "Charge sans fil / NFC", cote: "R", px: 118, py: 170,
    hit: { circle: [80, 170, 46] },
    nom: "Bobine charge sans fil / NFC",
    role: "La bobine en cuivre permet la charge sans fil (et l'aimantation MagSafe sur iPhone) ; l'antenne NFC permet le paiement sans contact.",
    panne: "Charge sans fil ou paiement mobile qui ne fonctionnent plus après une chute ou une réparation.",
    attention: "Souvent collée sous la vitre arrière : à décoller doucement, elle se déchire facilement." },
];
PIECES.sort((x, y) => x.n - y.n);

// Forme d'une zone cliquable / de surbrillance, dans le repère de la couche.
function Zone({ hit, ...props }) {
  if (hit.rect) { const [x, y, w, h, r] = hit.rect; return <rect x={x} y={y} width={w} height={h} rx={r} {...props} />; }
  if (hit.circle) { const [cx, cy, r] = hit.circle; return <circle cx={cx} cy={cy} r={r} {...props} />; }
  return <path d={hit.d} fillRule="evenodd" {...props} />;
}

// Objectif photo : bague métal, verre sombre, reflet.
const Objectif = ({ x, y, r }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="url(#frmBague)" />
    <circle cx={x} cy={y} r={r * 0.74} fill="#0E0E10" />
    <circle cx={x} cy={y} r={r * 0.42} fill="#22324D" />
    <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.16} fill="#fff" opacity=".75" />
  </g>
);

// Épaisseur d'une couche : copie sombre décalée vers le bas, dessinée dessous.
const Tranche = ({ c, d, couleur }) => (
  <g transform={`translate(0,${c.ep})`}><g transform={matrice(c)}><path d={d} fill={couleur} fillRule="evenodd" /></g></g>
);

function DessinArriere() {
  return (
    <>
      <path d={rr(0, 0, W, H, 22)} fill="url(#frmDos)" stroke="#A9A29A" strokeWidth="1.2" />
      <path d="M0 0 L120 0 L0 150 Z" fill="#fff" opacity=".12" />
      {/* Îlot photo */}
      <rect x="8" y="8" width="62" height="68" rx="15" fill="#DCD6CF" stroke="#B9B1A9" strokeWidth="1.2" />
      <Objectif x={25} y={27} r={10.5} />
      <Objectif x={25} y={56} r={10.5} />
      <Objectif x={52} y={41} r={10.5} />
      <circle cx="54" cy="64" r="3.6" fill="#FFF6D8" stroke="#C9C2B8" />
      {/* Aimants MagSafe + bobine cuivre */}
      <circle cx="80" cy="170" r="46" fill="none" stroke="#8A8F96" strokeWidth="3.5" strokeDasharray="5 3" />
      {[40, 34, 28, 22, 16].map(r => (
        <circle key={r} cx="80" cy="170" r={r} fill="none" stroke="#B8733A" strokeWidth="3.2" />
      ))}
      <circle cx="80" cy="170" r="9" fill="#2B2B2B" />
      <path d="M80 210 L80 236 L96 236" stroke="#E8892C" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  );
}

function DessinComposants() {
  return (
    <>
      {/* Caméras arrière */}
      <rect x="10" y="10" width="52" height="60" rx="10" fill="#3B3B3D" stroke="#222" />
      <Objectif x={25} y={27} r={9} />
      <Objectif x={25} y={53} r={9} />
      <Objectif x={48} y={40} r={9} />
      <path d="M36 70 L36 84 L68 84" stroke="#E8892C" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Carte mère */}
      <rect x="66" y="10" width="84" height="108" rx="6" fill="#1F5E3B" stroke="#143F27" strokeWidth="1.2" />
      <rect x="72" y="16" width="40" height="46" rx="3" fill="url(#frmMetal)" stroke="#8A8F96" />
      <rect x="116" y="16" width="28" height="30" rx="3" fill="url(#frmMetal)" stroke="#8A8F96" />
      <rect x="74" y="68" width="32" height="32" rx="2" fill="#151515" />
      <rect x="80" y="74" width="20" height="20" rx="1" fill="#2A2A2A" />
      {[54, 68, 82, 96].map(y => <rect key={y} x="116" y={y} width="26" height="8" rx="1.5" fill="#D4AF37" stroke="#9C7C1C" strokeWidth=".8" />)}
      {[[70, 106], [78, 108], [86, 106], [94, 109], [102, 106], [110, 108]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="3" fill="#C9C2B8" />)}
      {/* Batterie */}
      <rect x="18" y="128" width="124" height="130" rx="8" fill="url(#frmBatt)" stroke="#111" />
      <rect x="30" y="150" width="100" height="70" rx="4" fill="#ECE8E3" />
      <text x="80" y="181" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2B2B2B">Li-ion</text>
      <text x="80" y="198" textAnchor="middle" fontSize="9" fill="#5A544E">3,87 V · 3 279 mAh</text>
      <path d="M68 206 L80 206 L74 214 Z" fill="#E8612C" />
      <rect x="118" y="104" width="16" height="30" rx="2" fill="#E8892C" />
      {/* Nappe principale vers la sous-carte */}
      <path d={NAPPE} stroke="#E8892C" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Vibreur */}
      <rect x="14" y="268" width="36" height="36" rx="5" fill="url(#frmMetal)" stroke="#8A847E" />
      <rect x="20" y="276" width="24" height="20" rx="3" fill="#A9A29A" />
      <circle cx="32" cy="286" r="4" fill="#5A544E" />
      {/* Sous-carte + port de charge */}
      <rect x="56" y="266" width="52" height="20" rx="3" fill="#E8892C" />
      <rect x="66" y="270" width="12" height="8" rx="1" fill="#D4AF37" />
      <rect x="64" y="286" width="36" height="22" rx="5" fill="url(#frmMetal)" stroke="#8A8F96" />
      <rect x="70" y="293" width="24" height="8" rx="4" fill="#111" />
      {/* Haut-parleur */}
      <rect x="112" y="268" width="36" height="38" rx="6" fill="#1E1E1E" />
      {[0, 1, 2, 3].map(i => [0, 1, 2].map(j => (
        <circle key={`${i}${j}`} cx={119 + i * 7.5} cy={278 + j * 9} r="1.8" fill="#77706A" />
      )))}
    </>
  );
}

function DessinChassis() {
  return (
    <>
      <path d={CADRE} fill="url(#frmMetal)" stroke="#6E737A" strokeWidth="1.2" fillRule="evenodd" />
      {/* Bandes d'antenne */}
      {[[0, 40], [151, 40], [0, 280], [151, 280]].map(([x, y], i) => <rect key={i} x={x} y={y} width="9" height="3" fill="#E8E3DE" />)}
      {/* Boutons */}
      <rect x="-4" y="58" width="5" height="16" rx="2" fill="#8A8F96" />
      <rect x="-4" y="88" width="5" height="30" rx="2" fill="#8A8F96" />
      <rect x="-4" y="124" width="5" height="30" rx="2" fill="#8A8F96" />
      <rect x="159" y="100" width="5" height="44" rx="2" fill="#8A8F96" />
      {/* Écouteur interne (earpiece) */}
      <rect x="56" y="11" width="44" height="11" rx="5.5" fill="#1A1A1A" stroke="#555" strokeWidth=".8" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <circle key={i} cx={61 + i * 4.3} cy="16.5" r="1.1" fill="#6E6760" />)}
      {/* Capteur luminosité & proximité */}
      <rect x="104" y="11" width="24" height="11" rx="4" fill="#202020" stroke="#555" strokeWidth=".8" />
      <circle cx="111" cy="16.5" r="2.6" fill="#3A1F2A" />
      <circle cx="121" cy="16.5" r="2.6" fill="#2C2C2C" stroke="#777" strokeWidth=".6" />
      {/* Caméra avant & Face ID */}
      <rect x="36" y="25" width="88" height="17" rx="8.5" fill="#161616" />
      <circle cx="48" cy="33.5" r="4.3" fill="#22324D" stroke="#555" />
      <circle cx="64" cy="33.5" r="2.4" fill="#3A3A3A" />
      <circle cx="96" cy="33.5" r="4.8" fill="#0E0E10" stroke="#666" />
      <circle cx="95" cy="32.3" r="1.2" fill="#fff" opacity=".7" />
      <circle cx="113" cy="33.5" r="3" fill="#3A1F2A" />
    </>
  );
}

function DessinEcran() {
  return (
    <>
      <rect x="150" y="128" width="18" height="34" rx="2" fill="#E8892C" />
      <path d={rr(0, 0, W, H, 22)} fill="#101010" stroke="#000" />
      <path d={rr(6, 6, W - 12, H - 12, 17)} fill="url(#frmEcran)" />
      {[0, 1, 2, 3].map(i => [0, 1, 2, 3, 4].map(j => (
        <rect key={`${i}${j}`} x={20 + i * 33} y={46 + j * 38} width="22" height="22" rx="6" fill="#fff" opacity=".22" />
      )))}
      <rect x="18" y="268" width="124" height="34" rx="12" fill="#fff" opacity=".14" />
      <rect x="58" y="14" width="44" height="13" rx="6.5" fill="#000" />
      <rect x="66" y="2.5" width="28" height="2" rx="1" fill="#3A3A3A" />
      <path d="M0 0 L160 0 L0 210 Z" fill="#fff" opacity=".08" />
    </>
  );
}

const ORDRE = ["arriere", "compo", "chassis", "avant"];
const DESSINS = { arriere: DessinArriere, compo: DessinComposants, chassis: DessinChassis, avant: DessinEcran };
const TRANCHES = { arriere: ["#A9A29A", rr(0, 0, W, H, 22)], chassis: ["#5E636A", CADRE], avant: ["#000", rr(0, 0, W, H, 22)] };

// Positions des étiquettes : à hauteur de leur pièce, sans se chevaucher.
function placerEtiquettes() {
  const pts = PIECES.map(p => {
    const [x, y] = proj(p.px, p.py, COUCHES[p.couche]);
    return { ...p, x, y, ly: y };
  });
  for (const cote of ["L", "R"]) {
    const lst = pts.filter(p => p.cote === cote).sort((a, b) => a.y - b.y);
    let prec = -Infinity;
    for (const p of lst) { p.ly = Math.max(p.y, prec + 26); prec = p.ly; }
  }
  return pts;
}
const ETIQUETTES = placerEtiquettes();

function useEtroit() {
  const q = "(max-width:700px)";
  const [etroit, setEtroit] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setEtroit(m.matches);
    m.addEventListener ? m.addEventListener("change", f) : m.addListener(f);
    return () => (m.removeEventListener ? m.removeEventListener("change", f) : m.removeListener(f));
  }, []);
  return etroit;
}

function VueEclatee() {
  const [sel, setSel] = useState(8);
  const etroit = useEtroit();
  const p = PIECES.find(x => x.n === sel);
  const coins = [[0, 0], [W, 0], [0, H], [W, H]];

  return (
    <div className="frm-ecl">
      <div className="card">
        <svg className="frm-svg" viewBox={etroit ? "140 0 360 840" : "-24 0 724 840"} role="img" aria-label="Vue éclatée d'un smartphone">
          <defs>
            <linearGradient id="frmMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E4E6E9" /><stop offset=".5" stopColor="#B7BCC2" /><stop offset="1" stopColor="#8E949B" />
            </linearGradient>
            <linearGradient id="frmBague" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E9EBEE" /><stop offset="1" stopColor="#7D838A" />
            </linearGradient>
            <linearGradient id="frmDos" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#EFEBE6" /><stop offset="1" stopColor="#C9C1B8" />
            </linearGradient>
            <linearGradient id="frmBatt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4A4A4C" /><stop offset="1" stopColor="#242426" />
            </linearGradient>
            <linearGradient id="frmEcran" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1C2436" /><stop offset=".6" stopColor="#5A3A3A" /><stop offset="1" stopColor="#E8612C" />
            </linearGradient>
            <filter id="frmOmbre" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#2B2B2B" floodOpacity=".22" />
            </filter>
          </defs>

          {/* Lignes d'assemblage */}
          {coins.map(([x, y], i) => {
            const [x1, y1] = proj(x, y, COUCHES.avant);
            const [x2, y2] = proj(x, y, COUCHES.arriere);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D6CFC8" strokeWidth="1.2" strokeDasharray="4 5" />;
          })}

          {ORDRE.map(id => {
            const c = COUCHES[id];
            const Dessin = DESSINS[id];
            const pieces = PIECES.filter(x => x.couche === id);
            return (
              <g key={id} filter="url(#frmOmbre)">
                {TRANCHES[id] && <Tranche c={c} couleur={TRANCHES[id][0]} d={TRANCHES[id][1]} />}
                <g transform={matrice(c)}>
                  <Dessin />
                  {pieces.filter(x => x.n === sel).map(x => (
                    x.hit.trait
                      ? <path key="hl" d={x.hit.d} stroke="#E8612C" strokeWidth="11" strokeOpacity=".55" fill="none" strokeLinecap="round" pointerEvents="none" />
                      : <Zone key="hl" hit={x.hit} fill="rgba(232,97,44,.22)" stroke="#E8612C" strokeWidth="3" pointerEvents="none" />
                  ))}
                  {pieces.map(x => (
                    x.hit.trait
                      ? <path key={x.n} d={x.hit.d} stroke="transparent" strokeWidth="14" fill="none" style={{ cursor: "pointer" }} onClick={() => setSel(x.n)} />
                      : <Zone key={x.n} hit={x.hit} fill="transparent" style={{ cursor: "pointer" }} onClick={() => setSel(x.n)} />
                  ))}
                </g>
              </g>
            );
          })}

          {/* Étiquettes (grand écran) */}
          {!etroit && ETIQUETTES.map(e => {
            const on = e.n === sel;
            const gauche = e.cote === "L";
            const xt = gauche ? 146 : 514;
            return (
              <g key={`e${e.n}`} style={{ cursor: "pointer" }} onClick={() => setSel(e.n)}>
                <polyline points={`${xt + (gauche ? 4 : -4)},${e.ly} ${gauche ? 160 : 500},${e.ly} ${e.x},${e.y}`}
                  fill="none" stroke={on ? "#E8612C" : "#8A847E"} strokeWidth={on ? 1.6 : 1} />
                <text x={xt} y={e.ly} textAnchor={gauche ? "end" : "start"} dominantBaseline="central"
                  fontSize="12.5" fontWeight={on ? 800 : 600} fill={on ? "#C2481B" : "#2B2B2B"}>
                  {gauche ? `${e.court}  ${e.n}` : `${e.n}  ${e.court}`}
                </text>
              </g>
            );
          })}

          {/* Pastilles numérotées */}
          {ETIQUETTES.map(e => (
            <g key={`p${e.n}`} className={`pastille${e.n === sel ? " on" : ""}`} onClick={() => setSel(e.n)}>
              <circle cx={e.x} cy={e.y} r={etroit ? 13 : 10} />
              <text x={e.x} y={e.y} style={etroit ? { fontSize: 13 } : { fontSize: 10.5 }}>{e.n}</text>
            </g>
          ))}
        </svg>
        <div className="frm-liste">
          {PIECES.map(pc => (
            <button key={pc.n} className={pc.n === sel ? "on" : ""} onClick={() => setSel(pc.n)}>
              {pc.n}. {pc.court}
            </button>
          ))}
        </div>
      </div>

      <div className="card frm-fiche" aria-live="polite">
        <span className="lbl">{COUCHES[p.couche].label}</span>
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
  { t: "Basculer les composants : le minimum de nappes", d: "Quand l'écran neuf est livré avec son châssis et qu'il faut basculer la carte mère, le connecteur de charge, les caméras ou le haut-parleur : tu ne déconnectes que les nappes strictement nécessaires. Quand deux éléments peuvent passer ensemble d'un châssis à l'autre en restant reliés, tu les laisses reliés.",
    pq: "Chaque fois qu'on débranche et rebranche une nappe, on fatigue le connecteur et on risque de le tordre ou de l'arracher. Moins de manipulations = moins de pannes créées par nous." },
  { t: "Remplacer la pièce", d: "Pièce neuve sortie de son sachet antistatique au dernier moment. Transfère les éléments à récupérer (capteurs, caches, adhésifs) sans forcer." },
  { t: "Tester AVANT le remontage complet et le collage", cle: true, d: "Tu branches la pièce neuve, tu reconnectes la batterie, tu allumes et tu testes tout : affichage, tactile sur toute la surface, luminosité automatique, son, appel de contrôle (écouteur + capteur de proximité), caméras, Face ID, charge. Si c'est bon : batterie à nouveau déconnectée, puis seulement fermeture et collage.",
    pq: "Une pièce neuve peut être défectueuse. Si tu as déjà collé, tu redémontes, tu risques de casser l'écran et tu perds un joint. On teste d'abord, on colle ensuite." },
  { t: "Fermer, coller, tester de nouveau", d: "Joint neuf, vis à leur place, pression uniforme. Test de sortie complet, idéalement devant le client, puis saisie de la réparation dans Trepidai." },
];

function ReglesOr() {
  return (
    <div className="stack">
      <div className="frm-pourquoi">
        L'ordre compte autant que le geste. Les étapes <b>4</b> et <b>8</b> sont non négociables : ce sont elles qui
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
    "Bascule châssis : seulement les nappes nécessaires déconnectées",
    "Pièce neuve sortie du sachet au dernier moment",
  ] },
  { titre: "Avant de fermer", items: [
    "Pièce neuve branchée, batterie reconnectée, test complet OK",
    "Appel de contrôle : écouteur et capteur de proximité OK",
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
  { q: "Tu changes un écran livré avec châssis : il faut basculer la carte mère et le connecteur de charge. Comment fais-tu ?",
    o: ["Je déconnecte toutes les nappes pour être tranquille", "Je ne déconnecte que les nappes nécessaires et je laisse reliés les éléments qui passent ensemble", "Je laisse tout dans l'ancien châssis", "Peu importe, les connecteurs ne s'abîment pas"], r: 1,
    e: "Chaque débranchement / rebranchement fatigue le connecteur. Moins on touche aux nappes, moins on crée de pannes." },
  { q: "Après un changement d'écran, le client se plaint que l'écran reste allumé pendant ses appels et qu'il raccroche avec la joue. Quelle pièce vérifies-tu ?",
    o: ["Le haut-parleur du bas", "Le capteur de proximité", "La batterie", "Le moteur vibreur"], r: 1,
    e: "Le capteur de proximité éteint l'écran contre l'oreille. Nappe pincée ou capteur mal repositionné : c'est le premier suspect." },
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
              : score >= 8
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
