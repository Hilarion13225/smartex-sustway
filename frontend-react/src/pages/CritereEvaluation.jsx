import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  History,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Pencil,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';
import { NIVEAUX_MATURITE } from '../components/audit/niveauxMaturite';
import { memeTexte } from '../components/audit/libelles';
import { libelleStatut, tonStatut } from '../components/audit/statutsCritere';
import AxesAmelioration from '../components/audit/AxesAmelioration';

/**
 * Personnel interne Smartex : il supervise la mission mais ne renseigne pas
 * le questionnaire déclaratif — celui-ci est la parole de l'organisation
 * auditée (RG09), que l'IA confronte ensuite aux preuves.
 */
const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN']);

const TONS_CRITICITE = { FAIBLE: 'neutre', MOYENNE: 'bleu', ELEVEE: 'ambre', CRITIQUE: 'rouge' };
const TONS_STATUT_EVAL = { PROVISOIRE: 'ambre', EN_REVUE: 'violet', VALIDEE: 'vert' };
// Le questionnaire se répond sur l'échelle de maturité à cinq niveaux, la
// même que la saisie de critère et que la note d'évaluation. Les anciennes
// réponses fermées (OUI/NON/PARTIEL) restent lisibles en base mais ne sont
// plus proposées à la saisie.

export default function CritereEvaluation() {
  const { entrepriseId, auditId, auditCritereId } = useParams();
  const { state } = useLocation();
  const { peut, roleCourant } = useApiAuth();

  const [critere, setCritere] = useState(state?.critere ?? null);
  const [preuves, setPreuves] = useState(null);
  const [saisie, setSaisie] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [audit, setAudit] = useState(null);
  const [chargement, setChargement] = useState(!state?.critere);

  const peutDeclarer =
    peut('preuve:deposer', audit?.formuleCode) && !ROLES_INTERNES_SMARTEX.has(roleCourant);

  const rafraichir = useCallback(() => {
    const promesses = [
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}/evaluations`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}/questions`),
    ];
    if (!critere) {
      promesses.push(api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`));
    }
    Promise.all(promesses)
      .then(([p, e, a, s, tousLesCriteres]) => {
        setPreuves(p);
        setEvaluations(e);
        setAudit(a);
        setSaisie(s);
        if (tousLesCriteres) {
          setCritere(tousLesCriteres.find((c) => c.id === auditCritereId) ?? null);
        }
      })
      .catch(() => {
        setPreuves([]);
        setEvaluations([]);
        setSaisie({ scenario: null, questions: [] });
      })
      .finally(() => setChargement(false));
    // critere volontairement absent des dépendances : ne pas re-fetcher la
    // liste complète des critères juste parce que la référence a changé
    // après le premier chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, auditId, auditCritereId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const preuvesDuCritere = (preuves ?? []).filter((p) => critere && p.critereCodes.includes(critere.critereCode));
  // L'API renvoie les évaluations de la plus récente à la plus ancienne.
  const derniereEvaluation = evaluations && evaluations.length > 0 ? evaluations[0] : null;
  // RG09 : la collecte déclarative vaut source d'analyse au même titre que
  // les preuves — l'API accepte l'évaluation dès que l'une des deux existe.
  const declaratifRenseigne = Boolean(
    saisie && (saisie.scenario || (saisie.questions ?? []).some((q) => q.niveau || q.valeur || q.commentaire))
  );

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits/${auditId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la mission
      </Link>

      {chargement || !critere ? (
        <Loader message="Chargement du critère…" />
      ) : (
        <>
          <PageTitre
            icone={ClipboardCheck}
            titre={`${critere.critereCode} — ${critere.critereLibelle}`}
            description={critere.domaineCode}
            actions={
              <>
                {critere.criticite ? (
                  <Badge ton={TONS_CRITICITE[critere.criticite] ?? 'neutre'}>Criticité {critere.criticite}</Badge>
                ) : null}
                <Badge ton={tonStatut(critere.statut)}>{libelleStatut(critere.statut)}</Badge>
              </>
            }
          />

          <Revele>
            <Card className="mb-6 p-5">
              <CardHeader
                titre="Déclaration de l’organisation"
                icone={ListChecks}
                sousTitre="Réponses et description de la situation, telles qu’analysées avec les preuves"
                action={
                  peutDeclarer ? (
                    <Link
                      to={`/app/${entrepriseId}/audits/${auditId}`}
                      className="btn-secondary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Modifier dans la mission
                    </Link>
                  ) : null
                }
              />
              <DeclarationLecture saisie={saisie} libelleCritere={critere.critereLibelle} />
            </Card>
          </Revele>

          <div className="grid gap-6 lg:grid-cols-2">
            <Revele>
              <Card className="h-full p-5">
                <CardHeader titre="Preuves" icone={FileText} sousTitre="Un document peut servir à plusieurs critères" />
                <PreuvesSection
                  entrepriseId={entrepriseId}
                  auditId={auditId}
                  auditCritereId={auditCritereId}
                  preuves={preuvesDuCritere}
                  onChange={rafraichir}
                  peutDeposer={peut('preuve:deposer', audit?.formuleCode)}
                />
              </Card>
            </Revele>

            <Revele delai={120}>
              <Card className="h-full p-5">
                <CardHeader titre="Évaluation IA" icone={Sparkles} />
                <EvaluationSection
                  entrepriseId={entrepriseId}
                  auditId={auditId}
                  auditCritereId={auditCritereId}
                  peutEvaluer={preuvesDuCritere.length > 0 || declaratifRenseigne}
                  formuleCode={audit?.formuleCode}
                  missionTerminee={audit?.statut === 'TERMINE'}
                  derniereEvaluation={derniereEvaluation}
                  evaluationsPrecedentes={(evaluations ?? []).slice(1)}
                  onChange={rafraichir}
                />
              </Card>
            </Revele>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Déclaration de l'organisation, en lecture seule.
 *
 * La saisie a lieu dans l'onglet « Critères » de la mission, seul endroit où
 * l'organisation répond : cette page en est la fiche de consultation, avec
 * l'historique des analyses et les preuves rattachées.
 */
function DeclarationLecture({ saisie, libelleCritere }) {
  const questions = saisie?.questions ?? [];

  if (questions.length === 0) {
    return <Vide message="Aucune question rattachée à ce critère." />;
  }

  return (
    <div className="mt-4 space-y-4">
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.auditQuestionId} className="rounded-xl border border-ink-100 bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink-900">
                {memeTexte(q.libelle, libelleCritere) ? 'Réponse déclarée' : q.libelle}
              </p>
              <Badge ton={q.statut === 'REPONDU' ? 'vert' : 'neutre'}>{q.statut}</Badge>
            </div>

            <p className="mt-2 text-sm text-ink-700">{reponseLisible(q)}</p>
            {q.commentaire ? (
              <p className="mt-1.5 text-sm text-ink-600">{q.commentaire}</p>
            ) : null}
            {q.dateReponse ? (
              <p className="mt-2 text-xs text-ink-500">
                Dernière saisie le {formaterDateHeure(q.dateReponse)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <MessageSquareText className="h-4 w-4 text-ink-400" aria-hidden />
          Situation décrite par l’organisation
        </p>
        {saisie?.scenario ? (
          <p className="mt-2 whitespace-pre-line rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700">
            {saisie.scenario}
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-400">Aucune situation décrite.</p>
        )}
      </div>
    </div>
  );
}

/** Réponse d'une question, rendue lisible quelle que soit son échelle. */
function reponseLisible(question) {
  if (question.niveau != null) {
    const niveau = NIVEAUX_MATURITE.find((n) => n.niveau === question.niveau);
    return niveau ? `${niveau.niveau} — ${niveau.titre}` : `Niveau ${question.niveau}`;
  }
  if (question.valeur) {
    return question.valeur === 'OUI' ? 'Oui' : question.valeur === 'NON' ? 'Non' : question.valeur;
  }
  return 'Pas encore renseignée.';
}


function PreuvesSection({ entrepriseId, auditId, auditCritereId, preuves, onChange, peutDeposer }) {
  const [fichier, setFichier] = useState(null);
  const [description, setDescription] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function televerserEtAssocier(e) {
    e.preventDefault();
    if (!fichier) return;
    setErreur(null);
    setChargement(true);
    try {
      const donneesFormulaire = new FormData();
      donneesFormulaire.append('fichier', fichier);
      const document = await api.post(`/api/v1/entreprises/${entrepriseId}/documents`, donneesFormulaire);

      // Le backend a déjà rejeté toute menace détectée (statut INFECTE) et tout
      // échec de scan quand smartex.antivirus.echec-bloquant est actif — un
      // document renvoyé ici a donc déjà passé ces contrôles ; un statut ERREUR
      // signifie seulement que le scan était indisponible et volontairement non
      // bloquant (voir echec-bloquant=false), pas que le document est refusé.
      await api.post(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`, {
        documentId: document.id,
        description,
        type: 'JUSTIFICATIF',
        auditCritereIds: [auditCritereId],
      });

      setFichier(null);
      setDescription('');
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-4">
      {preuves.length > 0 ? (
        <ul className="space-y-2">
          {preuves.map((p) => (
            <li key={p.id} className="rounded-xl border border-ink-100 bg-surface p-3 text-sm">
              <p className="font-medium text-ink-900">{p.documentNomOriginal}</p>
              {p.description ? <p className="text-xs text-ink-500">{p.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <Vide message="Aucune preuve déposée pour ce critère." />
      )}

      {peutDeposer ? (
        <form className="space-y-3 rounded-lg border border-dashed border-ink-200 p-3" onSubmit={televerserEtAssocier}>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
          <div>
            <label className="label" htmlFor="preuve-fichier">
              Déposer un document
            </label>
            <input
              id="preuve-fichier"
              type="file"
              required
              className="input"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="label" htmlFor="preuve-description">
              Description (optionnelle)
            </label>
            <input
              id="preuve-description"
              className="input"
              placeholder="Politique signée par la direction…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={chargement || !fichier}>
            {chargement ? <SustwayLoader taille="sm" /> : <UploadCloud className="h-4 w-4" aria-hidden />}
            Déposer comme preuve
          </button>
        </form>
      ) : null}
    </div>
  );
}

function EvaluationSection({
  entrepriseId,
  auditId,
  auditCritereId,
  peutEvaluer,
  formuleCode,
  missionTerminee,
  derniereEvaluation,
  evaluationsPrecedentes,
  onChange,
}) {
  const { roleCourant, peut } = useApiAuth();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Décider d'un axe relève du pilotage de la mission, permission que l'API
  // exige déjà : `audit:modifier`. Aucune permission nouvelle n'est introduite
  // pour cet écran. La formule est passée parce que cette permission est
  // retirée en FREE : sans elle, le bouton s'afficherait pour un compte que
  // l'API refuserait par 403.
  const peutDeciderDesAxes = peut('audit:modifier', formuleCode);

  // Valider relève d'une permission distincte de celle qui lance l'analyse :
  // produire un résultat n'est pas l'accepter. Le backend reste la source de
  // vérité — ce test ne fait qu'éviter d'afficher un bouton qui rendrait 403.
  const peutValiderLEvaluation = peut('evaluation:valider', formuleCode);

  async function lancerEvaluation() {
    setErreur(null);
    setChargement(true);
    try {
      await api.post(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}/evaluations`,
        undefined
      );
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      <button type="button" className="btn-primary w-full" disabled={!peutEvaluer || chargement} onClick={lancerEvaluation}>
        {chargement ? <SustwayLoader taille="sm" /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {chargement ? 'Analyse en cours (Document → Evidence → Compliance)…' : 'Lancer l’évaluation IA'}
      </button>
      {!peutEvaluer ? (
        <p className="text-xs text-ink-500">
          Déposez une preuve ou renseignez le questionnaire avant de pouvoir lancer l’évaluation.
        </p>
      ) : null}

      {derniereEvaluation ? <ResultatEvaluation evaluation={derniereEvaluation} /> : <Vide message="Aucune évaluation pour l’instant." />}

      {/* Le geste qui transforme un résultat de machine en verdict. Il
          n'existait dans aucun écran : la route était là depuis 5.7-C, sans
          bouton pour l'appeler. */}
      {derniereEvaluation ? (
        <ValidationEvaluation
          entrepriseId={entrepriseId}
          auditId={auditId}
          auditCritereId={auditCritereId}
          evaluation={derniereEvaluation}
          missionTerminee={missionTerminee}
          peutValider={peutValiderLEvaluation}
          onValidee={onChange}
        />
      ) : null}

      {/* Le raisonnement détaillé n'est proposé qu'aux rôles qui y ont
          réellement accès côté API : ouvrir un volet qui répondrait 403
          serait une promesse non tenue. */}
      {derniereEvaluation && ROLES_DETAIL_IA.has(roleCourant) ? (
        <DetailRaisonnementIa
          entrepriseId={entrepriseId}
          auditId={auditId}
          auditCritereId={auditCritereId}
          evaluationId={derniereEvaluation.id}
        />
      ) : null}

      {/* Les axes sont opérationnels — ils disent quoi faire — donc lisibles
          par tout membre de l'entreprise. Seule la décision est réservée aux
          rôles qui portent `audit:modifier`. */}
      <AxesAmelioration
        entrepriseId={entrepriseId}
        auditId={auditId}
        auditCritereId={auditCritereId}
        peutDecider={peutDeciderDesAxes}
      />

      {evaluationsPrecedentes.length > 0 ? (
        <HistoriqueEvaluations evaluations={evaluationsPrecedentes} />
      ) : null}
    </div>
  );
}

/**
 * Valider une évaluation.
 *
 * Le bouton n'apparaît que si les trois conditions que l'API exige sont
 * réunies : la permission, le statut `EN_REVUE`, et une mission encore
 * ouverte. En proposer davantage produirait des refus que l'utilisateur ne
 * pourrait pas anticiper.
 *
 * La confirmation dit ce qui va se produire — score et non-conformités
 * enregistrés — et ne présente pas le geste comme réversible : il ne l'est
 * pas.
 */
function ValidationEvaluation({
  entrepriseId,
  auditId,
  auditCritereId,
  evaluation,
  missionTerminee,
  peutValider,
  onValidee,
}) {
  const [confirmation, setConfirmation] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  if (evaluation.statut === 'VALIDEE') {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge ton="vert" icone={CheckCircle2}>
          Évaluation validée
        </Badge>
        {evaluation.valideeLe ? (
          <span className="text-xs text-ink-500">le {formaterDateHeure(evaluation.valideeLe)}</span>
        ) : null}
      </div>
    );
  }

  if (evaluation.statut !== 'EN_REVUE') return null;

  if (!peutValider) {
    return (
      <p className="mt-3 text-xs italic text-ink-500">
        Cette évaluation attend une validation par l’administration de la mission.
      </p>
    );
  }

  if (missionTerminee) {
    return (
      <p className="mt-3 text-xs italic text-ink-500">
        La mission est clôturée : son résultat est figé.
      </p>
    );
  }

  async function valider() {
    setChargement(true);
    setErreur(null);
    try {
      await api.post(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}` +
          `/evaluations/${evaluation.id}/validation`,
        {}
      );
      setConfirmation(false);
      onChangeSafe();
    } catch (err) {
      // Les trois codes ne disent pas la même chose : un droit manquant, un
      // objet disparu, ou un conflit d'état dont l'API explique le motif.
      if (err instanceof ApiError) {
        setErreur(
          err.statut === 403
            ? "Votre rôle ne permet pas de valider cette évaluation."
            : err.statut === 404
              ? "Cette évaluation n’existe plus, ou n’appartient pas à ce critère."
              : err.message
        );
      } else {
        setErreur('La validation a échoué.');
      }
    } finally {
      setChargement(false);
    }
  }

  function onChangeSafe() {
    if (typeof onValidee === 'function') onValidee();
  }

  return (
    <div className="mt-3">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {confirmation ? (
        <div className="mt-2 rounded-xl border border-ink-100 p-4">
          <Alerte ton="ambre">
            Vous êtes sur le point de valider définitivement cette évaluation. Après validation, le
            score et les éventuelles non-conformités seront enregistrés. Souhaitez-vous continuer ?
          </Alerte>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={chargement} onClick={valider}>
              {chargement ? <SustwayLoader taille="sm" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
              Confirmer la validation
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmation(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setConfirmation(true)}>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Valider cette évaluation
        </button>
      )}
    </div>
  );
}

function HistoriqueEvaluations({ evaluations }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="rounded-xl border border-ink-100">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-700"
        aria-expanded={ouvert}
        onClick={() => setOuvert((precedent) => !precedent)}
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-ink-400" aria-hidden />
          Historique des évaluations ({evaluations.length})
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-400 ${ouvert ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {ouvert ? (
        <ul className="space-y-3 border-t border-ink-100 p-4">
          {evaluations.map((evaluation) => (
            <li key={evaluation.id}>
              <ResultatEvaluation evaluation={evaluation} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const TONS_COUVERTURE = {
  COMPLETE: 'vert',
  PARTIELLE: 'ambre',
  INSUFFISANTE: 'rouge',
  NON_VERIFIABLE: 'neutre',
};

const LIBELLES_COUVERTURE = {
  COMPLETE: 'Couverte',
  PARTIELLE: 'Partiellement couverte',
  INSUFFISANTE: 'Non couverte',
  NON_VERIFIABLE: 'Non vérifiable',
};

const TONS_PRESENCE = { PRESENT: 'vert', PARTIEL: 'ambre', ABSENT: 'rouge', NON_VERIFIABLE: 'neutre' };

const LIBELLES_PRESENCE = {
  PRESENT: 'Présent',
  PARTIEL: 'Partiel',
  ABSENT: 'Absent',
  NON_VERIFIABLE: 'Non vérifiable',
};

/** Rôles auxquels le raisonnement détaillé de l'IA est ouvert. */
const ROLES_DETAIL_IA = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT', 'RESPONSABLE_ENTREPRISE']);

/**
 * Le raisonnement de l'IA, attente par attente.
 *
 * Replié par défaut et chargé à l'ouverture : ces trois listes ne servent
 * qu'à celui qui veut comprendre *pourquoi* une note a été rendue, et les
 * charger d'emblée ferait trois requêtes par évaluation affichée.
 *
 * L'accès est restreint aux mêmes rôles que côté API. Le composant n'est
 * pas rendu du tout pour un collaborateur : afficher un volet qui répondrait
 * 403 à l'ouverture serait une promesse non tenue.
 */
function DetailRaisonnementIa({ entrepriseId, auditId, auditCritereId, evaluationId }) {
  const [ouvert, setOuvert] = useState(false);
  const [detail, setDetail] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const ouvrir = async () => {
    const prochainEtat = !ouvert;
    setOuvert(prochainEtat);
    if (!prochainEtat || detail || chargement) return;

    setChargement(true);
    setErreur(null);
    try {
      const reponse = await api.get(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}` +
          `/evaluations/${evaluationId}/detail`,
      );
      setDetail(reponse);
    } catch (e) {
      setErreur(e?.message ?? 'Le détail n’a pas pu être chargé.');
    } finally {
      setChargement(false);
    }
  };

  const vide =
    detail &&
    detail.preuves.length === 0 &&
    detail.constats.length === 0 &&
    detail.constatsDocumentaires.length === 0;

  return (
    <div className="rounded-xl border border-ink-100">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-700"
        aria-expanded={ouvert}
        onClick={ouvrir}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ink-400" aria-hidden />
          Détail du raisonnement
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-400 ${ouvert ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {ouvert ? (
        <div className="space-y-4 border-t border-ink-100 p-4">
          {chargement ? <Loader message="Chargement du détail…" /> : null}

          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

          {/* Une liste vide n'est pas une erreur : elle dit qu'aucun détail
              n'a été enregistré, ce qui est le cas des évaluations
              antérieures au contrat V2. */}
          {vide ? (
            <Vide message="Cette évaluation n’a pas enregistré de raisonnement détaillé." />
          ) : null}

          {detail?.risqueMetier ? <BlocRisqueMetier risque={detail.risqueMetier} /> : null}

          {detail && detail.preuves.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Preuves attendues ({detail.preuves.length})
              </h4>
              <ul className="space-y-3">
                {detail.preuves.map((preuve) => (
                  <li key={preuve.id} className="rounded-lg border border-ink-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={TONS_COUVERTURE[preuve.couverture] ?? 'neutre'}>
                        {LIBELLES_COUVERTURE[preuve.couverture] ?? preuve.couverture}
                      </Badge>
                      {preuve.exigenceCode ? (
                        <span className="text-xs text-ink-500">{preuve.exigenceCode}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink-900">{preuve.preuveAttendueLibelle}</p>
                    {preuve.justification ? (
                      <p className="mt-1 text-sm text-ink-700">{preuve.justification}</p>
                    ) : null}
                    {preuve.conflit ? (
                      <div className="mt-2">
                        <Alerte ton="ambre">Contradiction entre pièces : {preuve.conflit}</Alerte>
                      </div>
                    ) : null}
                    <ListeElements titre="Observé" elements={preuve.elementsObserves} />
                    <ListeElements titre="Manquant" elements={preuve.elementsManquants} />
                    {/* Distincte de « manquant », et jamais fusionnée avec
                        elle : non vérifiable signifie qu'on n'a pas pu
                        regarder, pas qu'on a regardé sans trouver. */}
                    <ListeElements titre="Non vérifiable" elements={preuve.elementsNonVerifiables} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail && detail.constatsDocumentaires.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Ce que disent les pièces ({detail.constatsDocumentaires.length})
              </h4>
              <ul className="space-y-2">
                {detail.constatsDocumentaires.map((constat) => (
                  <li key={constat.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={TONS_PRESENCE[constat.presence] ?? 'neutre'}>
                        {LIBELLES_PRESENCE[constat.presence] ?? constat.presence}
                      </Badge>
                      <span className="font-medium text-ink-900">{constat.documentNom}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{constat.preuveAttendueLibelle}</p>
                    <ListeElements titre="Relevé" elements={constat.elementsReleves} />
                    <ListeElements titre="Manquant" elements={constat.elementsManquants} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail && detail.constats.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Observations rattachées ({detail.constats.length})
              </h4>
              <ul className="space-y-2">
                {detail.constats.map((constat) => (
                  <li key={constat.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Un signal du Risk Agent est une observation de
                          l'IA, pas un risque réglementaire : le libellé le
                          dit, et la couleur reste neutre. */}
                      <Badge ton={constat.nature === 'SIGNAL_RISQUE' ? 'ambre' : 'neutre'}>
                        {constat.nature === 'SIGNAL_RISQUE' ? 'Signal IA' : 'Élément manquant'}
                      </Badge>
                      {constat.categorie ? (
                        <span className="text-xs text-ink-500">{constat.categorie}</span>
                      ) : null}
                    </div>
                    {constat.cibleLibelle ? (
                      <p className="mt-1 text-xs text-ink-500">{constat.cibleLibelle}</p>
                    ) : null}
                    {constat.justification ? (
                      <p className="mt-1 text-ink-700">{constat.justification}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const TONS_NIVEAU_RG26 = { MINEURE: 'neutre', MODEREE: 'ambre', MAJEURE: 'rouge', CRITIQUE: 'rouge' };

/**
 * Le risque métier RG26 — déterministe, et qui montre son calcul.
 *
 * C'est ce qui le distingue du signal de l'IA : un chiffre qui affiche son
 * opération n'a pas besoin qu'on le croie sur parole. Le rouge est réservé
 * à ce bloc, parce qu'il porte un fait établi ; le signal de l'IA, lui,
 * s'identifie par son intitulé et son avertissement.
 */
function BlocRisqueMetier({ risque }) {
  const indeterminable = risque.risqueAttendu == null;

  return (
    <section className="rounded-lg border border-ink-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        Risque métier — {risque.source}
      </p>

      {indeterminable ? (
        <p className="mt-2 text-sm text-ink-600">{risque.explication}</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge ton={TONS_NIVEAU_RG26[risque.niveau] ?? 'neutre'}>{risque.niveau}</Badge>
            <span className="text-lg font-semibold text-ink-900">
              {Number(risque.risqueAttendu).toFixed(2)}
            </span>
          </div>

          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-600">
            <div className="flex justify-between gap-2">
              <dt>Probabilité de conformité</dt>
              <dd className="font-medium text-ink-900">
                {Math.round(Number(risque.probabiliteConformite) * 100)} %
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Criticité</dt>
              <dd className="font-medium text-ink-900">
                {risque.criticiteCode} ({Number(risque.criticitePoids).toFixed(2)})
              </dd>
            </div>
          </dl>

          {/* Le calcul en toutes lettres : c'est lui qui fait la
              différence entre un résultat déterministe et un avis. */}
          <p className="mt-2 border-t border-ink-100 pt-2 font-mono text-xs text-ink-500">
            {risque.explication}
          </p>

          {/* Tant que l'évaluation n'est pas validée, aucune valeur n'a été
              arrêtée : le dire évite qu'un écart entre l'avant et l'après
              validation passe pour une incohérence. */}
          <p className="mt-1 text-xs italic text-ink-500">
            {risque.fige
              ? `Valeur figée à la validation : ${Number(risque.risqueFigeNonConformite).toFixed(2)} (${risque.niveauFigeNonConformite}).`
              : 'Calcul provisoire : aucune valeur n’a encore été arrêtée pour ce critère.'}
          </p>
        </>
      )}
    </section>
  );
}

/** Une liste d'éléments, masquée si elle est vide. */
function ListeElements({ titre, elements }) {
  if (!elements || elements.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs uppercase tracking-wide text-ink-500">{titre}</p>
      <ul className="mt-0.5 list-inside list-disc text-sm text-ink-700">
        {elements.map((element, index) => (
          <li key={`${titre}-${index}`}>{element}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultatEvaluation({ evaluation }) {
  const probabilitePct = Math.round(Number(evaluation.probabiliteConforme) * 100);
  const confiancePct = evaluation.confianceIa != null ? Math.round(Number(evaluation.confianceIa) * 100) : null;

  return (
    <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={TONS_STATUT_EVAL[evaluation.statut] ?? 'neutre'}>{evaluation.statut}</Badge>
        <Badge ton={evaluation.source === 'EXPERT' ? 'violet' : 'bleu'}>{evaluation.source}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Probabilité de conformité</p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900">{probabilitePct}%</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Niveau d’engagement</p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900">{evaluation.niveauEngagement} / 5</p>
        </div>
        {confiancePct != null ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Confiance IA</p>
            <p className="mt-0.5 text-lg font-semibold text-ink-900">{confiancePct}%</p>
          </div>
        ) : null}
        {evaluation.dateEvaluation ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Évalué le</p>
            <p className="mt-0.5 text-sm text-ink-700">{formaterDateHeure(evaluation.dateEvaluation)}</p>
          </div>
        ) : null}
      </div>

      {/* Une justification absente et une justification masquée ne se
          ressemblent pas : sans ce drapeau, l'écran afficherait un vide là
          où l'information existe mais n'est pas accessible à ce rôle. */}
      {evaluation.justification ? (
        <p className="text-sm text-ink-700">{evaluation.justification}</p>
      ) : evaluation.justificationsMasquees ? (
        <p className="text-xs italic text-ink-500">
          Le raisonnement détaillé de l’IA est réservé à l’administration de l’audit.
        </p>
      ) : null}

      {/* Le signal de l'IA n'est plus affiché en rouge vif.
          Le rouge dit « fait établi » ; un signal n'en est pas un, et la
          couleur d'alarme le faisait passer pour un constat réglementaire.
          Ce sont désormais le titre, la source et l'avertissement qui
          l'identifient — pas la couleur. */}
      {evaluation.signalRisque != null ? (
        <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-sm">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Signal de risque — IA
              </p>
              <p className="mt-0.5 font-medium text-ink-900">
                {evaluation.signalRisque ? 'Signal détecté' : 'Aucun signal détecté'}
              </p>
              {evaluation.signalRisque && evaluation.categorieRisque ? (
                <p className="mt-0.5 text-xs text-ink-600">
                  Catégorie : {evaluation.categorieRisque}
                </p>
              ) : null}
              {/* Une confiance absente n'est jamais rendue par un zéro :
                  « inconnue » et « nulle » sont deux affirmations
                  différentes. Le chemin V1 ne produit pas ce champ. */}
              <p className="mt-0.5 text-xs text-ink-600">
                Confiance :{' '}
                {evaluation.confianceRisque != null
                  ? `${Math.round(Number(evaluation.confianceRisque) * 100)} %`
                  : 'non disponible'}
              </p>
              {evaluation.justificationRisque ? (
                <p className="mt-1 text-xs text-ink-700">{evaluation.justificationRisque}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-2 border-t border-ink-200 pt-2 text-xs italic text-ink-500">
            Signal généré par l’IA — aide à l’analyse, sans valeur réglementaire.
          </p>
        </div>
      ) : null}

      {evaluation.recommandationNecessaire ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Pistes d’amélioration</p>
            <p className="mt-0.5 text-xs">{evaluation.pistesAmelioration}</p>
          </div>
        </div>
      ) : evaluation.recommandationNecessaire === false ? (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Aucune recommandation nécessaire.
        </div>
      ) : null}
    </div>
  );
}
