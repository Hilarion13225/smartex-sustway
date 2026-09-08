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

/**
 * Personnel interne Smartex : il supervise la mission mais ne renseigne pas
 * le questionnaire déclaratif — celui-ci est la parole de l'organisation
 * auditée (RG09), que l'IA confronte ensuite aux preuves.
 */
const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN', 'ADMIN_AUDIT']);

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
  derniereEvaluation,
  evaluationsPrecedentes,
  onChange,
}) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

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

      {evaluationsPrecedentes.length > 0 ? (
        <HistoriqueEvaluations evaluations={evaluationsPrecedentes} />
      ) : null}
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

      {evaluation.justification ? <p className="text-sm text-ink-700">{evaluation.justification}</p> : null}

      {evaluation.signalRisque != null ? (
        <div
          className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            evaluation.signalRisque ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">
              {evaluation.signalRisque ? `Signal de risque détecté${evaluation.categorieRisque ? ' — ' + evaluation.categorieRisque : ''}` : 'Aucun signal de risque'}
            </p>
            {evaluation.justificationRisque ? <p className="mt-0.5 text-xs">{evaluation.justificationRisque}</p> : null}
          </div>
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
