import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, CircleDashed, Cpu, Lock, Play, RotateCcw, Workflow } from 'lucide-react';
import { AGENTS, AUDITS, ENTREPRISES } from '../data/mock';
import { syntheseAudit } from '../lib/analyse';
import { SEUIL_CONFIANCE_IA, formaterPourcent, formaterScore } from '../lib/scoring';
import { Alerte, Badge, Card, CardHeader, PageTitre, StatCard, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { useAuth } from '../auth/useAuth';
const RESULTATS = {
  document: '38 documents indexés, 1 214 pages océrisées, 96 sections classifiées',
  evidence: '412 extraits de preuve rattachés aux critères applicables',
  compliance: 'Comparaison exigence / preuve réalisée sur l’ensemble des critères actifs',
  risk: '7 signaux de risque détectés (incohérences de dates, périmètre partiel)',
  scoring: 'Probabilité de conformité et niveau d’engagement calculés par critère',
  recommendation: '23 pistes d’amélioration proposées, dont 6 sur les critères bailleur',
  reporting: 'Contenu du rapport préparé : scores, probabilités, indice de préparation'
};
export default function Pipeline() {
  const {
    planActif,
    entreprise
  } = useAuth();
  const auditsVisibles = entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS;
  const [auditId, setAuditId] = useState(auditsVisibles.at(-1)?.id ?? '');
  const [executions, setExecutions] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef(null);
  const audit = AUDITS.find(a => a.id === auditId);
  const synthese = audit ? syntheseAudit(audit) : undefined;
  const entrepriseAudit = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
  const planAudit = entrepriseAudit?.plan ?? planActif;
  const agentsActifs = AGENTS.filter(agent => agent.planMinimum === 'STANDARD' || planAudit === 'AVANCEES');
  useEffect(() => () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
  }, []);
  const lancer = () => {
    if (planAudit === 'FREE') return;
    setEnCours(true);
    setExecutions(agentsActifs.map(agent => ({
      agent: agent.cle,
      statut: 'EN_ATTENTE',
      dureeMs: 0,
      resultat: ''
    })));
    const executerEtape = index => {
      if (index >= agentsActifs.length) {
        setEnCours(false);
        return;
      }
      const agent = agentsActifs[index];
      setExecutions(liste => liste.map((e, i) => i === index ? {
        ...e,
        statut: 'EN_COURS'
      } : e));
      minuteur.current = window.setTimeout(() => {
        setExecutions(liste => liste.map((e, i) => i === index ? {
          ...e,
          statut: 'TERMINE',
          dureeMs: 600 + index * 240,
          resultat: RESULTATS[agent.cle]
        } : e));
        executerEtape(index + 1);
      }, 700);
    };
    executerEtape(0);
  };
  const reinitialiser = () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    setExecutions([]);
    setEnCours(false);
  };
  return <>
      <PageTitre icone={Cpu} titre="Pipeline IA multi-agents" description="L’orchestrateur exécute les agents selon la formule souscrite. La probabilité de conformité n’est jamais saisie directement : elle est calculée puis dérivée en note." actions={<>
            <select className="input w-auto" value={auditId} onChange={e => setAuditId(e.target.value)}>
              {auditsVisibles.map(option => <option key={option.id} value={option.id}>
                  {option.reference} — {ENTREPRISES.find(e => e.id === option.entrepriseId)?.raisonSociale}
                </option>)}
            </select>
            <button type="button" className="btn-secondary" onClick={reinitialiser} disabled={executions.length === 0}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Réinitialiser
            </button>
            <button type="button" className="btn-primary" onClick={lancer} disabled={enCours || planAudit === 'FREE'}>
              <Play className="h-4 w-4" aria-hidden />
              Lancer l’analyse
            </button>
          </>} />

      {planAudit === 'FREE' ? <div className="mb-5">
          <Alerte ton="ambre">Aucun pipeline IA n’est exécuté en formule Free : le compte est en mode démonstration.</Alerte>
        </div> : planAudit === 'STANDARD' ? <div className="mb-5">
          <Alerte ton="bleu">
            Formule Standard : pipeline basique (Document, Compliance, Scoring). Les agents Risk et Recommendation ainsi
            que la revue experte sont réservés à la formule Avancées.
          </Alerte>
        </div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone={Workflow} ton="bleu" libelle="Agents activés" valeur={`${agentsActifs.length} / ${AGENTS.length}`} detail={`Formule ${planAudit}`} />
        <StatCard icone={Bot} ton="vert" libelle="Critères analysés" valeur={String(synthese?.evaluations.length ?? 0)} />
        <StatCard icone={CircleDashed} ton="ambre" libelle="Sous le seuil de confiance" valeur={String(synthese?.enFileRevue ?? 0)} detail={`Seuil ${formaterPourcent(SEUIL_CONFIANCE_IA)}`} />
        <StatCard icone={CheckCircle2} ton="vert" libelle="Score résultant" valeur={synthese ? `${formaterScore(synthese.scoreGlobal)} / 5` : '—'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader titre="Orchestration des agents" icone={Workflow} />
          <ul className="divide-y divide-ink-100">
            {AGENTS.map(agent => {
            const execution = executions.find(e => e.agent === agent.cle);
            const disponible = agentsActifs.some(a => a.cle === agent.cle);
            return <li key={agent.cle} className="flex items-start gap-3 px-5 py-4">
                  <span className={`mt-0.5 rounded-lg p-2 ${execution?.statut === 'TERMINE' ? 'bg-emerald-50 text-emerald-600' : execution?.statut === 'EN_COURS' ? 'bg-amber-50 text-amber-600' : 'bg-ink-100 text-ink-400'}`}>
                    {disponible ? execution?.statut === 'TERMINE' ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : execution?.statut === 'EN_COURS' ? <CircleDashed className="h-4 w-4 animate-spin" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {agent.nom}
                      {!disponible ? <Badge ton="neutre">Formule Avancées</Badge> : null}
                      {execution?.statut === 'TERMINE' ? <Badge ton="vert">{execution.dureeMs} ms</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{agent.description}</p>
                    {execution?.resultat ? <p className="mt-1 text-xs text-brand-700">{execution.resultat}</p> : null}
                  </div>
                </li>;
          })}
          </ul>
        </Card>

        <Card>
          <CardHeader titre="Distribution des probabilités de conformité" icone={Bot} sousTitre="Nombre de critères par tranche de probabilité" />
          <div className="h-96 p-5">
            {synthese ? <GraphiqueBarres labels={['< 25 %', '25-49 %', '50-74 %', '75-89 %', '≥ 90 %']} series={[{
            label: 'Critères',
            data: [synthese.evaluations.filter(e => e.probabilite < 0.25).length, synthese.evaluations.filter(e => e.probabilite >= 0.25 && e.probabilite < 0.5).length, synthese.evaluations.filter(e => e.probabilite >= 0.5 && e.probabilite < 0.75).length, synthese.evaluations.filter(e => e.probabilite >= 0.75 && e.probabilite < 0.9).length, synthese.evaluations.filter(e => e.probabilite >= 0.9).length],
            couleur: COULEURS.brand
          }]} /> : <Vide message="Sélectionnez une mission d’audit." />}
          </div>
        </Card>
      </div>
    </>;
}
