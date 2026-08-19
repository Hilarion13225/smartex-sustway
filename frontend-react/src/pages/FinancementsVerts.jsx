import { useState } from 'react';
import { Building2, Leaf, ShieldAlert, Target } from 'lucide-react';
import { AUDITS, ENTREPRISES } from '../data/mock';
import { CRITERES_BAILLEUR, CRITICITE_LIBELLE, criticiteEffective, critereParId } from '../data/referentiel';
import { syntheseAudit } from '../lib/analyse';
import { formaterPourcent, formaterScore, niveauEngagement, scoreEnPourcent } from '../lib/scoring';
import { Alerte, Badge, Barre, Card, CardHeader, PageTitre, StatCard, Tableau } from '../components/ui';
import { COULEURS, GraphiqueBarres } from '../components/charts';
import { CRITICITE_TON } from '../lib/libelles';
import { useAuth } from '../auth/useAuth';
const PERFORMANCE_STANDARDS = ['PS1 — Évaluation et gestion des risques environnementaux et sociaux', 'PS2 — Main-d’œuvre et conditions de travail', 'PS3 — Utilisation rationnelle des ressources et prévention de la pollution', 'PS4 — Santé, sécurité et sûreté des communautés', 'PS5 — Acquisition de terres et réinstallation involontaire', 'PS6 — Biodiversité et gestion durable des ressources naturelles', 'PS7 — Peuples autochtones', 'PS8 — Patrimoine culturel'];
export default function FinancementsVerts() {
  const {
    entreprise,
    peut
  } = useAuth();
  const auditsEligibles = (entreprise ? AUDITS.filter(a => a.entrepriseId === entreprise.id) : AUDITS).filter(a => a.referentiels.includes('IFC'));
  const [auditId, setAuditId] = useState(auditsEligibles.at(-1)?.id ?? '');
  const audit = AUDITS.find(a => a.id === auditId);
  const synthese = audit ? syntheseAudit(audit) : undefined;
  const entrepriseAudit = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
  const evaluationsBailleur = synthese?.evaluations.filter(e => critereParId(e.critereId)?.bailleurIfc) ?? [];
  if (!peut('bailleur:consulter')) {
    return <>
        <PageTitre icone={Leaf} titre="Financements verts (IFC/SFI)" description="Indice de préparation aux exigences du bailleur pilote." />
        <Alerte ton="ambre">
          L’indice de préparation aux financements verts est réservé à la formule Avancées. Il n’apparaît jamais dans un
          rapport Standard ou Free.
        </Alerte>
      </>;
  }
  return <>
      <PageTitre icone={Leaf} titre="Financements verts — bailleur pilote IFC/SFI" description="Référentiel transversal superposé aux référentiels déjà attribués : les critères existants pertinents sont tagués, les exigences manquantes sont ajoutées comme critères propres au bailleur." actions={<select className="input w-auto" value={auditId} onChange={e => setAuditId(e.target.value)}>
            {auditsEligibles.map(option => <option key={option.id} value={option.id}>
                {option.reference} — {ENTREPRISES.find(e => e.id === option.entrepriseId)?.raisonSociale}
              </option>)}
          </select>} />

      <div className="mb-5">
        <Alerte ton="ambre">
          L’indice de préparation est une mesure d’alignement aux exigences du bailleur, et non une garantie
          d’éligibilité au financement. La décision finale relève de la seule compétence du bailleur.
        </Alerte>
      </div>

      {synthese && entrepriseAudit ? <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icone={Leaf} ton="vert" libelle="Indice de préparation" valeur={`${formaterScore(synthese.indiceBailleur)} / 5`} detail={`${scoreEnPourcent(synthese.indiceBailleur)} % d’alignement`} />
            <StatCard icone={Target} ton="bleu" libelle="Critères tagués bailleur" valeur={String(evaluationsBailleur.length)} detail={`${CRITERES_BAILLEUR.length} au référentiel`} />
            <StatCard icone={ShieldAlert} ton="rouge" libelle="Critères non alignés" valeur={String(evaluationsBailleur.filter(e => e.probabilite < 0.6).length)} detail="Probabilité de conformité < 60 %" />
            <StatCard icone={Building2} libelle="Entreprise évaluée" valeur={entrepriseAudit.raisonSociale.split(' ')[0]} detail={entrepriseAudit.secteur} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader titre="Alignement par Performance Standard" sousTitre="Estimation dérivée des critères tagués" />
              <div className="h-96 p-5">
                <GraphiqueBarres horizontal max={5} labels={PERFORMANCE_STANDARDS.map(standard => standard.split(' —')[0])} series={[{
              label: 'Niveau moyen d’alignement',
              data: PERFORMANCE_STANDARDS.map((_, index) => {
                const tranche = evaluationsBailleur.filter((_, position) => position % PERFORMANCE_STANDARDS.length === index);
                if (tranche.length === 0) return 0;
                const total = tranche.reduce((somme, e) => somme + (e.noteExpert ?? niveauEngagement(e.probabilite)), 0);
                return Number((total / tranche.length).toFixed(2));
              }),
              couleur: COULEURS.brand
            }]} />
              </div>
            </Card>

            <Card>
              <CardHeader titre="Les 8 Performance Standards IFC/SFI" sousTitre="Mapping critères ↔ exigences fourni par les experts métier" />
              <ul className="divide-y divide-ink-100">
                {PERFORMANCE_STANDARDS.map(standard => <li key={standard} className="flex items-start gap-2 px-5 py-3 text-sm text-ink-700">
                    <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    {standard}
                  </li>)}
              </ul>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader titre="Critères du référentiel bailleur" sousTitre="Réutilisation des critères Smartex tagués et critères spécifiques ajoutés (préfixe IFC)" />
            <Tableau entetes={['Code', 'Critère', 'Origine', 'Probabilité', 'Niveau', 'Coefficient', 'Criticité']}>
              {evaluationsBailleur.map(evaluation => {
            const critere = critereParId(evaluation.critereId);
            const niveau = evaluation.noteExpert ?? niveauEngagement(evaluation.probabilite);
            const criticite = criticiteEffective(critere, entrepriseAudit.secteur);
            return <tr key={evaluation.id}>
                    <td className="td font-medium">{critere.code}</td>
                    <td className="td">{critere.libelle}</td>
                    <td className="td">
                      <Badge ton={critere.code.startsWith('IFC') ? 'vert' : 'neutre'}>
                        {critere.code.startsWith('IFC') ? 'Critère bailleur ajouté' : 'Critère Smartex tagué'}
                      </Badge>
                    </td>
                    <td className="td w-40">
                      <div className="flex items-center gap-2">
                        <Barre valeur={evaluation.probabilite * 100} ton={evaluation.probabilite < 0.6 ? 'rouge' : 'brand'} />
                        <span className="w-11 shrink-0 text-xs">{formaterPourcent(evaluation.probabilite)}</span>
                      </div>
                    </td>
                    <td className="td">{niveau}</td>
                    <td className="td">{evaluation.coefficient}</td>
                    <td className="td">
                      <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                    </td>
                  </tr>;
          })}
            </Tableau>
          </Card>
        </> : <Alerte ton="ambre">Aucune mission ne comporte le référentiel bailleur IFC/SFI.</Alerte>}
    </>;
}
