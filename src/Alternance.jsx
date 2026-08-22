// ═══════════════════════════════════════════════════════════════════════════
// Alternance — suivi des contrats d'apprentissage
//
// Premier écran de l'app sorti d'App.jsx. Il n'importe rien du fichier
// principal : il s'appuie sur les classes CSS globales déjà injectées, et
// reçoit `api` et `user` en propriétés. Une seule ligne de couplage.
//
// Trois lectures selon qui regarde, et c'est le SERVEUR qui tranche :
//   • le RZ voit tout ;
//   • le tuteur voit son alternant et peut saisir ;
//   • l'alternante voit son parcours, sans les commentaires ni les notes
//     d'un jalon non validé — ces champs ne sont même pas dans la réponse.
//
// Cet écran ne filtre donc rien à l'affichage. Ce qui ne doit pas être vu
// n'arrive pas jusqu'ici.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const jour = (iso) =>
  !iso ? "—" : new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const jourLong = (iso) =>
  !iso ? "—" : new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

// Samedi de la semaine en cours — le point se fait ce jour-là
function samediCourant() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

const TYPE_STYLE = {
  "Jalon":   { chip: "c-bad",     ico: "🔴" },
  "Étape":   { chip: "c-brand",   ico: "▸"  },
  "CFA":     { chip: "c-neutral", ico: "🎓" },
  "Congés":  { chip: "c-ok",      ico: "🌴" },
};

const VERDICT_CHIP = {
  "Validé":       "c-ok",
  "À rattraper":  "c-warn",
  "Non validé":   "c-bad",
  "En attente":   "c-neutral",
};

// ─── Bandeau d'en-tête ───────────────────────────────────────────────────────

function Entete({ a }) {
  const i = a.indicateurs || {};
  const pj = i.prochainJalon;

  return (
    <div className="grid grid-3" style={{ marginBottom: 18 }}>
      <div className="tile">
        <div className="lbl">Étape en cours</div>
        <div className="val" style={{ fontSize: 19, lineHeight: 1.25 }}>
          {i.etapeEnCours ? i.etapeEnCours.titre : "Hors période"}
        </div>
        <div className="foot">
          {i.etapeEnCours
            ? <>{i.etapeEnCours.semaine}{i.etapeEnCours.bloc ? <> · <b>{i.etapeEnCours.bloc}</b></> : null}</>
            : "Aucune étape planifiée à cette date"}
        </div>
      </div>

      <div className="tile">
        <div className="lbl">Prochain jalon</div>
        <div className="val" style={{ fontSize: 19, lineHeight: 1.25 }}>
          {pj ? pj.titre.replace(/^JALON \d+ — /, "") : "Aucun à venir"}
        </div>
        <div className="foot">
          {pj ? (
            <>
              {jourLong(pj.date)} ·{" "}
              <b className={pj.joursRestants <= 14 ? "txt-warn" : ""}>
                {pj.joursRestants <= 0 ? "aujourd'hui" : `dans ${pj.joursRestants} j`}
              </b>
            </>
          ) : "—"}
        </div>
      </div>

      <div className="tile">
        <div className="lbl">Présence effective</div>
        <div className="val">
          {i.presenceCumulee ?? 0}<small> jours</small>
        </div>
        <div className="foot">
          {a.finPeriodeEssai && (
            <>Essai : 45 j au <b>{jour(a.finPeriodeEssai)}</b></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Alerte points du samedi manquants ───────────────────────────────────────

function AlerteOublis({ manquants }) {
  if (!manquants || !manquants.length) return null;
  const liste = manquants.slice(-4);
  return (
    <div className="atm-alert">
      <span className="ic">⚠️</span>
      <div>
        <b>
          {manquants.length === 1
            ? "Un point du samedi n'a pas été saisi"
            : `${manquants.length} points du samedi n'ont pas été saisis`}
        </b>
        <p>
          {liste.map((m) => m.semaine).join(", ")}
          {manquants.length > liste.length ? " et d'autres avant" : ""}. Le carnet de bord
          est notre seule trace : sans lui, on ne saura pas dire à 12 mois si on a formé ou occupé.
        </p>
      </div>
    </div>
  );
}

// ─── Formulaire du point du samedi ───────────────────────────────────────────
// Volontairement court : Mobileo, occasion, ATM et les ratios viennent du GOAT
// et ne se ressaisissent pas. Le tuteur ne renseigne que ce que le GOAT ignore.

const VIDE = {
  semaine: "", date: samediCourant(), bloc: "", accroches: "", etudes: "",
  ceQuiAMarche: "", ceQuiACoince: "", engagement: "", objection: "", commentaireTuteur: "",
};

function PointDuSamedi({ api, alternant, onSaved }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(VIDE);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const maj = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const enregistrer = async () => {
    if (!f.semaine.trim()) { setErr("La semaine est obligatoire (ex. S39)."); return; }
    setBusy(true); setErr("");
    try {
      const num = (v) => (v === "" ? undefined : Number(v));
      await api.post("/api/alternance/hebdo", {
        alternantId: alternant.id,
        semaine: f.semaine.trim(),
        date: f.date,
        bloc: f.bloc || undefined,
        accroches: num(f.accroches),
        etudes: num(f.etudes),
        ceQuiAMarche: f.ceQuiAMarche,
        ceQuiACoince: f.ceQuiACoince,
        engagement: f.engagement,
        objection: f.objection,
        commentaireTuteur: f.commentaireTuteur,
      });
      setF(VIDE);
      setOuvert(false);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ouvert) {
    return (
      <button className="btn btn-primary" onClick={() => setOuvert(true)}>
        ✎ Saisir le point du samedi
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 className="h-section">Point du samedi</h3>

      <div className="atm-form">
        <div>
          <label>Semaine</label>
          <input value={f.semaine} onChange={maj("semaine")} placeholder="S39" />
        </div>
        <div>
          <label>Date du point</label>
          <input type="date" value={f.date} onChange={maj("date")} />
        </div>
        <div>
          <label>Bloc</label>
          <select value={f.bloc} onChange={maj("bloc")}>
            <option value="">—</option>
            {["Bloc 1", "Bloc 2", "Bloc 3", "Bloc 4", "Bloc 5"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Accroches opérateur posées</label>
          <input type="number" min="0" value={f.accroches} onChange={maj("accroches")} placeholder="20" />
        </div>
        <div>
          <label>Études réalisées</label>
          <input type="number" min="0" value={f.etudes} onChange={maj("etudes")} placeholder="4" />
        </div>
        <div />
      </div>

      <p className="note" style={{ marginTop: 4 }}>
        Mobileo, occasion, ATM et les ratios ne sont pas demandés ici : ils viennent du GOAT.
        Les trois premiers mois, c'est le nombre d'accroches qui compte, pas les ventes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        {[
          ["ceQuiAMarche", "Ce qui a marché — une phrase, un client, un moment"],
          ["ceQuiACoince", "Ce qui a coincé, et à quel moment précis de la trame"],
          ["engagement", "Sur quoi on se met d'accord pour la semaine prochaine"],
          ["objection", "Objection la plus fréquente rencontrée"],
        ].map(([k, label]) => (
          <div key={k}>
            <label className="field-label">{label}</label>
            <textarea
              className="input"
              rows={2}
              value={f[k]}
              onChange={maj(k)}
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13.5 }}
            />
          </div>
        ))}

        <div>
          <label className="field-label">Commentaire tuteur — non visible par l'alternante</label>
          <textarea
            className="input"
            rows={2}
            value={f.commentaireTuteur}
            onChange={maj("commentaireTuteur")}
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13.5 }}
          />
        </div>
      </div>

      {err && (
        <div className="atm-stop" style={{ marginTop: 14 }}>{err}</div>
      )}

      <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={enregistrer} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button className="btn btn-ghost" onClick={() => { setOuvert(false); setErr(""); }} disabled={busy}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Historique des points ───────────────────────────────────────────────────

function Historique({ lignes }) {
  if (!lignes.length) {
    return <div className="empty">Aucun point saisi pour l'instant.</div>;
  }
  return (
    <div>
      {lignes.map((h) => (
        <div key={h.id} className="mcard" style={{ marginBottom: 10 }}>
          <div className="top">
            <div>
              <h4>{h.semaine}{h.bloc ? ` · ${h.bloc}` : ""}</h4>
              <div className="meta">{jourLong(h.date)}</div>
            </div>
            <span className="chip c-brand no-dot">{h.accroches ?? "—"} accroches</span>
          </div>

          {h.etudes != null && (
            <div className="mrow"><span>Études réalisées</span><b>{h.etudes}</b></div>
          )}
          {h.ceQuiAMarche && (
            <div className="mrow" style={{ display: "block" }}>
              <span>Ce qui a marché</span>
              <div style={{ marginTop: 3 }}>{h.ceQuiAMarche}</div>
            </div>
          )}
          {h.ceQuiACoince && (
            <div className="mrow" style={{ display: "block" }}>
              <span>Ce qui a coincé</span>
              <div style={{ marginTop: 3 }}>{h.ceQuiACoince}</div>
            </div>
          )}
          {h.engagement && (
            <div className="mrow" style={{ display: "block" }}>
              <span>Engagement pour la semaine suivante</span>
              <div style={{ marginTop: 3 }}>{h.engagement}</div>
            </div>
          )}
          {h.commentaireTuteur && (
            <div className="atm-note" style={{ marginTop: 10, marginBottom: 0 }}>
              <b>Commentaire tuteur</b> — {h.commentaireTuteur}
            </div>
          )}
          {h.saisiPar && (
            <div className="meta" style={{ marginTop: 9 }}>Saisi par {h.saisiPar}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Parcours ────────────────────────────────────────────────────────────────

function Parcours({ etapes }) {
  const aujourd = new Date().toISOString().slice(0, 10);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Semaine</th>
            <th>Étape</th>
            <th className="c">Jours</th>
            <th className="c">Cumul</th>
            <th>Attendu</th>
            <th className="c">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {etapes.map((e) => {
            const style = TYPE_STYLE[e.type] || TYPE_STYLE["Étape"];
            const passe = (e.fin || e.debut) < aujourd;
            const jalon = e.type === "Jalon";
            return (
              <tr key={e.id} className={passe && !jalon ? "dim" : ""}>
                <td className="name" style={{ whiteSpace: "nowrap" }}>
                  {e.semaine || "—"}
                  <div className="cell-sub">{jour(e.debut)}{e.fin && e.fin !== e.debut ? ` → ${jour(e.fin)}` : ""}</div>
                </td>
                <td>
                  <span style={{ marginRight: 6 }}>{style.ico}</span>
                  <b style={{ fontWeight: jalon ? 750 : 600 }}>{e.titre}</b>
                  {e.bloc && <div className="cell-sub">{e.bloc}</div>}
                </td>
                <td className="c">{e.joursMagasin ?? "—"}</td>
                <td className="c">{e.cumulPresence ?? "—"}</td>
                <td style={{ fontSize: 13, color: "var(--sub)", maxWidth: 380 }}>
                  {e.attendu && e.attendu !== "—" ? e.attendu : ""}
                  {jalon && e.seuil && (
                    <div className="cell-sub" style={{ marginTop: 4 }}><b>Seuil :</b> {e.seuil}</div>
                  )}
                </td>
                <td className="c">
                  {jalon
                    ? <span className={`chip ${VERDICT_CHIP[e.verdict] || "c-neutral"}`}>{e.verdict || "En attente"}</span>
                    : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Fiche d'un alternant ────────────────────────────────────────────────────

function Fiche({ api, a, onReload }) {
  const [onglet, setOnglet] = useState("suivi");
  const i = a.indicateurs || {};

  return (
    <div>
      <div className="ctx">
        <h2 className="h-screen">{a.nom}</h2>
        <p>{a.magasin} · tuteur {a.tuteur || "—"}{a.referentAtelier ? ` · atelier ${a.referentAtelier}` : ""}</p>
        {a.statut && <span className="chip c-brand">{a.statut}</span>}
      </div>

      <Entete a={a} />
      <AlerteOublis manquants={i.pointsManquants} />

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={onglet === "suivi" ? "on" : ""} onClick={() => setOnglet("suivi")}>
          Suivi hebdomadaire
        </button>
        <button className={onglet === "parcours" ? "on" : ""} onClick={() => setOnglet("parcours")}>
          Parcours et jalons
        </button>
      </div>

      {onglet === "suivi" ? (
        <div>
          {a.peutEcrire && (
            <div style={{ marginBottom: 16 }}>
              <PointDuSamedi api={api} alternant={a} onSaved={onReload} />
            </div>
          )}
          <Historique lignes={a.hebdo || []} />
        </div>
      ) : (
        <div className="card pad-0" style={{ padding: "18px 20px" }}>
          <Parcours etapes={a.parcours || []} />
        </div>
      )}
    </div>
  );
}

// ─── Écran ───────────────────────────────────────────────────────────────────

export default function Alternance({ api, user }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actif, setActif] = useState(0);

  const charger = useCallback(async (force) => {
    setChargement(true); setErr("");
    try {
      setData(await api.get(`/api/alternance${force ? "?refresh=1" : ""}`));
    } catch (e) {
      setErr(e.message);
    } finally {
      setChargement(false);
    }
  }, [api]);

  useEffect(() => { charger(false); }, [charger]);

  if (chargement && !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 13, padding: 44 }}>
        <div className="spin" />
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Lecture du suivi…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="card accent-bad">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Lecture impossible</div>
            <div className="note" style={{ marginTop: 3 }}>{err}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => charger(true)}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (data && data.configured === false) {
    return (
      <div className="card">
        <h3 className="h-section">Suivi non configuré</h3>
        <p className="note">
          Les trois bases Notion de l'alternance ne sont pas rattachées au serveur.
          Vérifier <code>NOTION_ALT_ALTERNANTS_ID</code>, <code>NOTION_ALT_PARCOURS_ID</code> et{" "}
          <code>NOTION_ALT_HEBDO_ID</code> dans les variables d'environnement.
        </p>
      </div>
    );
  }

  const alternants = data?.alternants || [];

  if (!alternants.length) {
    return (
      <div className="card">
        <h3 className="h-section">Aucun alternant</h3>
        <p className="note">
          {user?.role === "rz"
            ? "Aucune fiche dans la base Alternants. En créer une dans Notion pour démarrer le suivi."
            : "Aucun contrat d'alternance rattaché à votre magasin."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {alternants.length > 1 && (
        <div className="seg" style={{ marginBottom: 18 }}>
          {alternants.map((a, n) => (
            <button key={a.id} className={n === actif ? "on" : ""} onClick={() => setActif(n)}>
              {a.nom} · {a.magasin}
            </button>
          ))}
        </div>
      )}

      <Fiche api={api} a={alternants[Math.min(actif, alternants.length - 1)]} onReload={() => charger(true)} />
    </div>
  );
}
