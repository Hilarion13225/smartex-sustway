import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Eraser,
  FileText,
  History,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Save,
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

const TONS_CRITICITE = { FAIBLE: 'neutre', MOYENNE: 'bleu', ELEVEE: 'ambre', CRITIQUE: 'rouge' };
const TONS_STATUT_EVAL = { PROVISOIRE: 'ambre', EN_REVUE: 'violet', VALIDEE: 'vert' };
const VALEURS_REPONSE = [
  { code: 'OUI', libelle: 'Oui' },
  { code: 'NON', libelle: 'Non' },
  { code: 'PARTIEL', libelle: 'Partiellement' },
  { code: 'NON_APPLICABLE', libelle: 'Non applicable' },
];

export default function CritereEvaluation() {
  const { entrepriseId, auditId, auditCritereId } = useParams();
  const { state } = useLocation();
  const { peut } = useApiAuth();

  const [critere, setCritere] = useState(state?.critere ?? null);
  const [preuves, setPreuves] = useState(null);
  const [saisie, setSaisie] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [audit, setAudit] = useState(null);
  const [chargement, setChargement] = useState(!state?.critere);

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
    saisie && (saisie.scenario || (saisie.questions ?? []).some((q) => q.valeur || q.commentaire))
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
                <Badge ton={critere.statut === 'EVALUE' ? 'vert' : 'neutre'}>{critere.statut}</Badge>
              </>
            }
          />

          <Revele>
            <Card className="mb-6 p-5">
              <CardHeader
                titre="Questionnaire & scénario"
                icone={ListChecks}
                sousTitre="Réponses déclaratives et description de la situation, analysées avec les preuves"
              />
              <SaisieSection
                entrepriseId={entrepriseId}
                auditId={auditId}
                auditCritereId={auditCritereId}
                saisie={saisie}
                onChange={setSaisie}
                peutRepondre={peut('preuve:deposer', audit?.formuleCode)}
              />
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

function SaisieSection({ entrepriseId, auditId, auditCritereId, saisie, onChange, peutRepondre }) {
  const [scenario, setScenario] = useState(saisie?.scenario ?? '');
  const [reponses, setReponses] = useState(() => reponsesInitiales(saisie));
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    setScenario(saisie?.scenario ?? '');
    setReponses(reponsesInitiales(saisie));
  }, [saisie]);

  const questions = saisie?.questions ?? [];

  function modifier(auditQuestionId, champ, valeur) {
    setEnregistre(false);
    setReponses((precedentes) => ({
      ...precedentes,
      [auditQuestionId]: { ...precedentes[auditQuestionId], [champ]: valeur },
    }));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setEnregistrement(true);
    try {
      const resultat = await api.put(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}/questions`,
        {
          scenario,
          reponses: questions.map((q) => ({
            auditQuestionId: q.auditQuestionId,
            valeur: reponses[q.auditQuestionId]?.valeur || null,
            commentaire: reponses[q.auditQuestionId]?.commentaire || null,
          })),
        }
      );
      onChange(resultat);
      setEnregistre(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setEnregistrement(false);
    }
  }

  if (!saisie) return <Loader message="Chargement du questionnaire…" />;
  if (questions.length === 0) return <Vide message="Aucune question rattachée à ce critère." />;

  return (
    <form className="space-y-5" onSubmit={enregistrer}>
      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.auditQuestionId} className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink-900">{q.libelle}</p>
              <Badge ton={q.statut === 'REPONDU' ? 'vert' : 'neutre'}>{q.statut}</Badge>
            </div>

            {q.type === 'FERMEE' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {VALEURS_REPONSE.map((v) => (
                  <label
                    key={v.code}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                      reponses[q.auditQuestionId]?.valeur === v.code
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-ink-200 text-ink-600'
                    } ${peutRepondre ? '' : 'pointer-events-none opacity-60'}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`reponse-${q.auditQuestionId}`}
                      value={v.code}
                      checked={reponses[q.auditQuestionId]?.valeur === v.code}
                      disabled={!peutRepondre}
                      onChange={() => modifier(q.auditQuestionId, 'valeur', v.code)}
                    />
                    {v.libelle}
                  </label>
                ))}
                {peutRepondre && reponses[q.auditQuestionId]?.valeur ? (
                  <button
                    type="button"
                    className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600"
                    onClick={() => modifier(q.auditQuestionId, 'valeur', null)}
                  >
                    <Eraser className="mr-1 inline h-4 w-4" aria-hidden />
                    Effacer la réponse
                  </button>
                ) : null}
              </div>
            ) : null}

            <label className="label mt-3" htmlFor={`commentaire-${q.auditQuestionId}`}>
              {q.type === 'FERMEE' ? 'Précision (optionnelle)' : 'Réponse'}
            </label>
            <textarea
              id={`commentaire-${q.auditQuestionId}`}
              className="input min-h-[70px]"
              placeholder="Décrivez la pratique en place, les limites constatées…"
              value={reponses[q.auditQuestionId]?.commentaire ?? ''}
              disabled={!peutRepondre}
              onChange={(e) => modifier(q.auditQuestionId, 'commentaire', e.target.value)}
            />

            {q.dateReponse ? (
              <p className="mt-2 text-xs text-ink-500">Dernière saisie le {formaterDateHeure(q.dateReponse)}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div>
        <label className="label flex items-center gap-2" htmlFor="scenario-critere">
          <MessageSquareText className="h-4 w-4 text-ink-400" aria-hidden />
          Scénario — situation de l’entreprise sur ce critère
        </label>
        <textarea
          id="scenario-critere"
          className="input min-h-[120px]"
          placeholder="Contexte, dispositifs en place, écarts connus, projets en cours…"
          value={scenario}
          disabled={!peutRepondre}
          onChange={(e) => {
            setEnregistre(false);
            setScenario(e.target.value);
          }}
        />
        <p className="mt-1 text-xs text-ink-500">
          Analysé par l’IA en complément des preuves ; une déclaration sans document réduit la confiance.
        </p>
      </div>

      {peutRepondre ? (
        <button type="submit" className="btn-primary" disabled={enregistrement}>
          {enregistrement ? <SustwayLoader taille="sm" /> : <Save className="h-4 w-4" aria-hidden />}
          Enregistrer la saisie
        </button>
      ) : (
        <p className="text-xs text-ink-500">Votre formule ou votre rôle ne permet pas de renseigner le questionnaire.</p>
      )}

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      {enregistre ? <Alerte ton="vert">Saisie enregistrée.</Alerte> : null}
    </form>
  );
}

function reponsesInitiales(saisie) {
  return Object.fromEntries(
    (saisie?.questions ?? []).map((q) => [q.auditQuestionId, { valeur: q.valeur, commentaire: q.commentaire ?? '' }])
  );
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

      if (document.statutScan !== 'SAIN') {
        setErreur(`Document rejeté par le scan antivirus (statut : ${document.statutScan})`);
        return;
      }

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
            <li key={p.id} className="rounded-xl border border-ink-100 bg-white p-3 text-sm">
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
        {evaluation.revueExperteDeclenchee ? (
          <Badge ton="ambre" icone={AlertTriangle}>
            En file de revue experte
          </Badge>
        ) : null}
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
