import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
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

export default function CritereEvaluation() {
  const { entrepriseId, auditId, auditCritereId } = useParams();
  const { state } = useLocation();
  const { peut } = useApiAuth();

  const [critere, setCritere] = useState(state?.critere ?? null);
  const [preuves, setPreuves] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [audit, setAudit] = useState(null);
  const [chargement, setChargement] = useState(!state?.critere);

  const rafraichir = useCallback(() => {
    const promesses = [
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${auditCritereId}/evaluations`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
    ];
    if (!critere) {
      promesses.push(api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`));
    }
    Promise.all(promesses)
      .then(([p, e, a, tousLesCriteres]) => {
        setPreuves(p);
        setEvaluations(e);
        setAudit(a);
        if (tousLesCriteres) {
          setCritere(tousLesCriteres.find((c) => c.id === auditCritereId) ?? null);
        }
      })
      .catch(() => {
        setPreuves([]);
        setEvaluations([]);
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
  const derniereEvaluation = evaluations && evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

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

          <div className="grid gap-6 lg:grid-cols-2">
            <Revele>
              <Card className="h-full p-5">
                <CardHeader titre="Preuves" icone={FileText} sousTitre="RG15 — un document peut servir à plusieurs critères" />
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
                  peutEvaluer={preuvesDuCritere.length > 0}
                  derniereEvaluation={derniereEvaluation}
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

function EvaluationSection({ entrepriseId, auditId, auditCritereId, peutEvaluer, derniereEvaluation, onChange }) {
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
        <p className="text-xs text-ink-500">Déposez au moins une preuve avant de pouvoir lancer l’évaluation.</p>
      ) : null}

      {derniereEvaluation ? <ResultatEvaluation evaluation={derniereEvaluation} /> : <Vide message="Aucune évaluation pour l’instant." />}
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
