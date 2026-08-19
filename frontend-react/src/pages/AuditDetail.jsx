import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, ClipboardCheck, Download, FileStack, Gauge, Leaf, ListFilter, ShieldCheck, Sliders, TriangleAlert } from 'lucide-react';
import { DOMAINES, CRITICITE_LIBELLE, criticiteEffective, critereParId } from '../data/referentiel';
import { ENTREPRISES, PREUVES, auditParId } from '../data/mock';
import { syntheseAudit } from '../lib/analyse';
import { NIVEAUX_ENGAGEMENT, formaterPourcent, formaterScore, niveauEngagement, risqueAttendu, scorePondere } from '../lib/scoring';
import { exporterCsv, formaterDate, imprimerRapport } from '../lib/export';
import { Alerte, Badge, Barre, Card, CardHeader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { CRITICITE_TON, REFERENTIEL_LIBELLE, STATUT_AUDIT_LIBELLE, STATUT_EVALUATION_LIBELLE, STATUT_EVALUATION_TON } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
const ONGLETS = [{
  cle: 'criteres',
  libelle: 'Critères évalués'
}, {
  cle: 'questionnaire',
  libelle: 'Questionnaire'
}, {
  cle: 'preuves',
  libelle: 'Preuves déposées'
}, {
  cle: 'synthese',
  libelle: 'Synthèse et scores'
}];
export default function AuditDetail() {
  const {
    auditId
  } = useParams();
  const {
    peut
  } = useAuth();
  const audit = auditParId(auditId);
  const [onglet, setOnglet] = useState('criteres');
  const [domaineFiltre, setDomaineFiltre] = useState('tous');
  const [seulementRevue, setSeulementRevue] = useState(false);
  const [coefficients, setCoefficients] = useState({});
  const [detailOuvert, setDetailOuvert] = useState(null);
  const synthese = useMemo(() => audit ? syntheseAudit(audit) : undefined, [audit]);
  if (!audit || !synthese) {
    return <Vide message="Mission d’audit introuvable." />;
  }
  const entreprise = ENTREPRISES.find(e => e.id === audit.entrepriseId);
  const preuves = PREUVES.filter(p => p.auditId === audit.id);
  const appliquerCoefficient = evaluation => ({
    ...evaluation,
    coefficient: coefficients[evaluation.id] ?? evaluation.coefficient
  });
  const evaluations = synthese.evaluations.map(appliquerCoefficient);
  const scoreRecalcule = scorePondere(evaluations);
  const evaluationsFiltrees = evaluations.filter(evaluation => {
    const critere = critereParId(evaluation.critereId);
    if (!critere) return false;
    if (domaineFiltre !== 'tous' && critere.domaineId !== domaineFiltre) return false;
    if (seulementRevue && evaluation.statut !== 'FILE_REVUE') return false;
    return true;
  });
  return <>
      <Link to="/app/audits" className="btn-ghost mb-3 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toutes les missions
      </Link>

      <PageTitre icone={ClipboardCheck} titre={`${audit.reference} — ${entreprise?.raisonSociale ?? ''}`} description={`Période du ${formaterDate(audit.periodeDebut)} au ${formaterDate(audit.periodeFin)} · ${audit.siteIds.length} site(s) · responsable ${audit.responsable} · référentiel ${audit.versionReferentiel}`} actions={<>
            <button type="button" className="btn-secondary" onClick={() => exporterCsv(`${audit.reference}-evaluations.csv`, ['Code', 'Critère', 'Domaine', 'Probabilité', 'Confiance IA', 'Niveau', 'Coefficient', 'Note obtenue', 'Criticité', 'Statut'], evaluations.map(evaluation => {
        const critere = critereParId(evaluation.critereId);
        const niveau = evaluation.noteExpert ?? niveauEngagement(evaluation.probabilite);
        return [critere.code, critere.libelle, DOMAINES.find(d => d.id === critere.domaineId)?.libelle ?? '', formaterPourcent(evaluation.probabilite), formaterPourcent(evaluation.confianceIa), niveau, evaluation.coefficient, niveau * evaluation.coefficient, CRITICITE_LIBELLE[criticiteEffective(critere, entreprise?.secteur)], STATUT_EVALUATION_LIBELLE[evaluation.statut]];
      }))}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn-primary" onClick={imprimerRapport}>
              Générer le rapport PDF
            </button>
          </>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone={Gauge} ton="vert" libelle="Score global" valeur={`${formaterScore(scoreRecalcule)} / 5`} detail={STATUT_AUDIT_LIBELLE[audit.statut]} />
        <StatCard icone={Bot} ton="bleu" libelle="Critères évalués" valeur={String(evaluations.length)} detail={`${audit.referentiels.map(r => REFERENTIEL_LIBELLE[r]).join(', ')}`} />
        <StatCard icone={ShieldCheck} ton="ambre" libelle="En revue experte" valeur={String(synthese.enFileRevue)} detail="Confiance IA < 80 %" />
        <StatCard icone={Leaf} ton={peut('bailleur:consulter') ? 'vert' : 'neutre'} libelle="Indice IFC/SFI" valeur={peut('bailleur:consulter') ? `${formaterScore(synthese.indiceBailleur)} / 5` : 'Avancées'} detail={audit.referentiels.includes('IFC') ? 'Référentiel bailleur attribué' : 'Référentiel bailleur non attribué'} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-ink-200">
        {ONGLETS.map(item => <button key={item.cle} type="button" onClick={() => setOnglet(item.cle)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${onglet === item.cle ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
            {item.libelle}
          </button>)}
      </div>

      {onglet === 'criteres' ? <Card className="mt-5">
          <CardHeader titre="Évaluation critère par critère" icone={Sliders} sousTitre="Le coefficient de pondération reste ajustable par l’entreprise cliente ; le score est recalculé immédiatement." action={<div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <ListFilter className="h-3.5 w-3.5" aria-hidden />
                  Filtres
                </span>
                <select className="input w-auto py-1.5 text-xs" value={domaineFiltre} onChange={e => setDomaineFiltre(e.target.value)}>
                  <option value="tous">Tous les domaines</option>
                  {DOMAINES.map(domaine => <option key={domaine.id} value={domaine.id}>
                      {domaine.code} — {domaine.libelle}
                    </option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  <input type="checkbox" className="accent-brand-600" checked={seulementRevue} onChange={e => setSeulementRevue(e.target.checked)} />
                  Uniquement la file de revue
                </label>
              </div>} />
          <Tableau entetes={['Code', 'Critère', 'Probabilité', 'Confiance IA', 'Niveau', 'Coef.', 'Note', 'Criticité', 'Risque', 'Statut']}>
            {evaluationsFiltrees.map(evaluation => {
          const critere = critereParId(evaluation.critereId);
          const niveau = evaluation.noteExpert ?? niveauEngagement(evaluation.probabilite);
          const criticite = criticiteEffective(critere, entreprise?.secteur);
          const risque = risqueAttendu(evaluation, entreprise?.secteur);
          const ouvert = detailOuvert === evaluation.id;
          return <Fragment key={evaluation.id}>
                  <tr className="hover:bg-ink-50">
                    <td className="td font-medium">{critere.code}</td>
                    <td className="td">
                      <button type="button" className="text-left hover:text-brand-700" onClick={() => setDetailOuvert(ouvert ? null : evaluation.id)}>
                        {critere.libelle}
                      </button>
                      {critere.bailleurIfc ? <span className="ml-2 inline-flex">
                          <Badge ton="vert" icone={Leaf}>
                            IFC
                          </Badge>
                        </span> : null}
                    </td>
                    <td className="td w-32">
                      <div className="flex items-center gap-2">
                        <Barre valeur={evaluation.probabilite * 100} ton={evaluation.probabilite < 0.5 ? 'rouge' : evaluation.probabilite < 0.75 ? 'ambre' : 'brand'} />
                        <span className="w-11 shrink-0 text-xs">{formaterPourcent(evaluation.probabilite)}</span>
                      </div>
                    </td>
                    <td className="td">
                      <span className={evaluation.confianceIa < 0.8 ? 'text-amber-700' : ''}>{formaterPourcent(evaluation.confianceIa)}</span>
                    </td>
                    <td className="td">
                      <span title={NIVEAUX_ENGAGEMENT[niveau]}>{niveau}</span>
                    </td>
                    <td className="td">
                      <select className="input w-16 py-1 text-xs" value={evaluation.coefficient} onChange={e => setCoefficients({
                  ...coefficients,
                  [evaluation.id]: Number(e.target.value)
                })}>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </td>
                    <td className="td font-semibold">{niveau * evaluation.coefficient}</td>
                    <td className="td">
                      <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                    </td>
                    <td className="td">{risque.toFixed(2)}</td>
                    <td className="td">
                      <Badge ton={STATUT_EVALUATION_TON[evaluation.statut]}>{STATUT_EVALUATION_LIBELLE[evaluation.statut]}</Badge>
                    </td>
                  </tr>
                  {ouvert ? <tr className="bg-ink-50/60">
                      <td className="td" colSpan={10}>
                        <p className="text-sm text-ink-700">
                          <span className="font-medium">Justification IA :</span> {evaluation.justification}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          Auteur : {evaluation.auteur} · évaluation du {formaterDate(evaluation.date)} · criticité{' '}
                          {critere.criticiteParSecteur?.[entreprise?.secteur ?? ''] ? 'ajustée pour le secteur' : 'générale'}
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-600">
                          {critere.questions.map(question => <li key={question.id}>
                              {question.libelle} <span className="text-ink-400">— preuve attendue : {question.typePreuve}</span>
                            </li>)}
                        </ul>
                      </td>
                    </tr> : null}
                </Fragment>;
        })}
          </Tableau>
        </Card> : null}

      {onglet === 'questionnaire' ? <div className="mt-5 space-y-5">
          <Alerte>
            Le questionnaire est composé dynamiquement à partir des critères applicables au profil de l’entreprise
            (secteur {entreprise?.secteur}, {entreprise?.taille}, {entreprise?.statut}) et, le cas échéant, du référentiel
            bailleur attribué à la mission.
          </Alerte>
          {DOMAINES.filter(domaine => evaluations.some(e => critereParId(e.critereId)?.domaineId === domaine.id)).map(domaine => <Card key={domaine.id}>
              <CardHeader titre={`${domaine.code} — ${domaine.libelle}`} sousTitre={domaine.partie} />
              <ul className="divide-y divide-ink-100">
                {evaluations.filter(e => critereParId(e.critereId)?.domaineId === domaine.id).slice(0, 6).map(evaluation => {
            const critere = critereParId(evaluation.critereId);
            return <li key={evaluation.id} className="px-5 py-4">
                        <p className="text-sm font-medium">
                          {critere.code} — {critere.libelle}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {critere.questions.map(question => <li key={question.id} className="flex items-start gap-2 text-sm text-ink-600">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                              <span>
                                {question.libelle}
                                <span className="block text-xs text-ink-400">Preuve attendue : {question.typePreuve}</span>
                              </span>
                            </li>)}
                        </ul>
                      </li>;
          })}
              </ul>
            </Card>)}
        </div> : null}

      {onglet === 'preuves' ? <Card className="mt-5">
          <CardHeader titre="Preuves déposées" icone={FileStack} sousTitre="Scan antivirus à l’upload et restriction des types de fichiers acceptés." />
          <Tableau entetes={['Document', 'Type', 'Taille', 'Critères couverts', 'Déposé par', 'Date', 'Statut']}>
            {preuves.map(preuve => <tr key={preuve.id}>
                <td className="td font-medium">{preuve.nomFichier}</td>
                <td className="td">{preuve.type}</td>
                <td className="td">{preuve.tailleKo} Ko</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {preuve.criteresIds.length === 0 ? <span className="text-xs text-ink-400">Non rattaché</span> : preuve.criteresIds.map(id => <Badge key={id}>{critereParId(id)?.code ?? id}</Badge>)}
                  </div>
                </td>
                <td className="td">{preuve.deposePar}</td>
                <td className="td">{formaterDate(preuve.dateDepot)}</td>
                <td className="td">
                  <Badge ton={preuve.statut === 'ANALYSEE' ? 'vert' : 'ambre'}>
                    {preuve.statut === 'ANALYSEE' ? 'Analysée' : 'En attente'}
                  </Badge>
                </td>
              </tr>)}
          </Tableau>
        </Card> : null}

      {onglet === 'synthese' ? <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader titre="Score par domaine" icone={Gauge} />
            <div className="h-80 p-5">
              <GraphiqueBarres horizontal max={5} labels={synthese.scoresDomaines.map(domaine => domaine.code)} series={[{
            label: 'Score du domaine',
            data: synthese.scoresDomaines.map(domaine => Number(domaine.score.toFixed(2))),
            couleur: COULEURS.brand
          }]} />
            </div>
          </Card>

          <Card>
            <CardHeader titre="Détail du calcul" icone={Sliders} sousTitre="RG31, RG32 et RG35" />
            <div className="space-y-3 p-5 text-sm">
              <p>
                Note obtenue = niveau d’engagement (1-5) × coefficient de pondération (1-3), pour chacun des{' '}
                <span className="font-semibold">{evaluations.length}</span> critères actifs.
              </p>
              <p>
                Σ notes obtenues ={' '}
                <span className="font-semibold">
                  {evaluations.reduce((total, e) => total + (e.noteExpert ?? niveauEngagement(e.probabilite)) * e.coefficient, 0)}
                </span>{' '}
                · Σ coefficients = <span className="font-semibold">{evaluations.reduce((total, e) => total + e.coefficient, 0)}</span>
              </p>
              <p className="text-base font-semibold text-brand-700">Score RSE global = {formaterScore(scoreRecalcule)} / 5</p>
              <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
                Les critères non applicables ou désactivés sont exclus du numérateur comme du dénominateur : le total
                n’est jamais figé.
              </div>
              {peut('bailleur:consulter') && audit.referentiels.includes('IFC') ? <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
                    <Leaf className="h-4 w-4" aria-hidden />
                    Indice de préparation IFC/SFI : {formaterScore(synthese.indiceBailleur)} / 5
                  </p>
                  <p className="mt-1 text-xs text-brand-800/80">
                    Mesure d’alignement aux Performance Standards du bailleur, et non une garantie d’éligibilité au
                    financement.
                  </p>
                </div> : null}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader titre="Points de vigilance" icone={TriangleAlert} sousTitre="Critères au risque attendu le plus élevé" />
            <Tableau entetes={['Code', 'Critère', 'Probabilité', 'Criticité', 'Risque attendu']}>
              {[...evaluations].sort((a, b) => risqueAttendu(b, entreprise?.secteur) - risqueAttendu(a, entreprise?.secteur)).slice(0, 8).map(evaluation => {
            const critere = critereParId(evaluation.critereId);
            const criticite = criticiteEffective(critere, entreprise?.secteur);
            return <tr key={`risque-${evaluation.id}`}>
                      <td className="td font-medium">{critere.code}</td>
                      <td className="td">{critere.libelle}</td>
                      <td className="td">{formaterPourcent(evaluation.probabilite)}</td>
                      <td className="td">
                        <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                      </td>
                      <td className="td font-semibold">{risqueAttendu(evaluation, entreprise?.secteur).toFixed(2)}</td>
                    </tr>;
          })}
            </Tableau>
          </Card>
        </div> : null}
    </>;
}
