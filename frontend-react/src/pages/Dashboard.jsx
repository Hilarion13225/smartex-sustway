import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, ClipboardCheck, Gauge, Leaf, ShieldCheck, Sparkles, TrendingUp, TriangleAlert } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { ABONNEMENTS, AUDITS, BENCHMARK_SECTORIEL, ENTREPRISES, EVALUATIONS, HISTORIQUE_SCORES, NON_CONFORMITES, auditsDeLEntreprise } from '../data/mock';
import { PRIORITE_LIBELLE, PRIORITE_ORDRE, repartitionPriorites, syntheseAudit } from '../lib/analyse';
import { NIVEAUX_ENGAGEMENT, formaterScore, scoreEnPourcent } from '../lib/scoring';
import { COULEURS, GraphiqueAnneau, GraphiqueBarres, GraphiqueLigne, GraphiqueRadar } from '../components/charts';
import { Alerte, Badge, Card, CardHeader, PageTitre, StatCard, Vide } from '../components/ui';
import { STATUT_AUDIT_LIBELLE } from '../lib/libelles';
export default function Dashboard() {
  const {
    utilisateur,
    entreprise,
    planActif,
    peut
  } = useAuth();
  const audits = entreprise ? auditsDeLEntreprise(entreprise.id) : AUDITS;
  const synthese = useMemo(() => audits.at(-1) ? syntheseAudit(audits.at(-1)) : undefined, [audits]);
  const priorites = repartitionPriorites(entreprise ? synthese?.audit.id : undefined);
  const historique = entreprise ? HISTORIQUE_SCORES[entreprise.id] : HISTORIQUE_SCORES['ent-1'];
  const benchmark = entreprise ? BENCHMARK_SECTORIEL[entreprise.secteur] : 3.1;
  const enRevue = EVALUATIONS.filter(e => e.statut === 'FILE_REVUE').length;
  const portefeuille = ENTREPRISES.map(ent => {
    const audit = auditsDeLEntreprise(ent.id).at(-1);
    return {
      entreprise: ent,
      score: audit ? syntheseAudit(audit).scoreGlobal : 0
    };
  });
  return <>
      <PageTitre icone={Gauge} titre={`Bonjour ${utilisateur?.nom.split(' ')[0] ?? ''}`} description={entreprise ? `Vue consolidée de la performance RSE de ${entreprise.raisonSociale}, secteur ${entreprise.secteur}.` : 'Vue consolidée du portefeuille d’entreprises suivies par Smartex Expertises.'} actions={synthese ? <Link to={`/app/audits/${synthese.audit.id}`} className="btn-primary">
              Ouvrir {synthese.audit.reference}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link> : null} />

      {planActif === 'FREE' ? <div className="mb-6">
          <Alerte ton="ambre">
            Formule Free : mode visite et démonstration. Aucune création, modification ou suppression n’est autorisée sur
            les entités métier ; les données affichées sont fictives.
          </Alerte>
        </div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone={Gauge} ton="vert" libelle="Score RSE global" valeur={synthese ? `${formaterScore(synthese.scoreGlobal)} / 5` : '—'} detail={synthese ? `${scoreEnPourcent(synthese.scoreGlobal)} % de l’échelle Smartex` : undefined} />
        <StatCard icone={TriangleAlert} ton="rouge" libelle="Non-conformités" valeur={String(entreprise ? synthese?.nonConformites ?? 0 : NON_CONFORMITES.length)} detail={`${priorites.CRITIQUE} critiques, ${priorites.MAJEURE} majeures`} />
        <StatCard icone={ShieldCheck} ton="ambre" libelle="En file de revue experte" valeur={String(entreprise ? synthese?.enFileRevue ?? 0 : enRevue)} detail="Confiance IA inférieure à 80 %" />
        <StatCard icone={Leaf} ton={peut('bailleur:consulter') ? 'bleu' : 'neutre'} libelle="Indice de préparation IFC/SFI" valeur={peut('bailleur:consulter') && synthese ? `${formaterScore(synthese.indiceBailleur)} / 5` : 'Avancées'} detail={peut('bailleur:consulter') ? 'Mesure d’alignement, non une garantie' : 'Réservé à la formule Avancées'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titre="Évolution du score RSE" icone={TrendingUp} sousTitre="Comparaison avec la moyenne sectorielle issue de l’étude CGECI" />
          <div className="h-72 p-5">
            <GraphiqueLigne labels={historique.map(point => point.periode)} max={5} series={[{
            label: entreprise?.raisonSociale ?? 'Portefeuille Smartex',
            data: historique.map(point => point.score),
            couleur: COULEURS.brand,
            fond: COULEURS.brandClair
          }, {
            label: 'Moyenne sectorielle',
            data: historique.map(() => benchmark),
            couleur: COULEURS.gris
          }]} />
          </div>
        </Card>

        <Card>
          <CardHeader titre="Priorité des non-conformités" icone={TriangleAlert} sousTitre="Risque = (1 − probabilité) × criticité" />
          <div className="h-72 p-5">
            <GraphiqueAnneau labels={PRIORITE_ORDRE.map(priorite => PRIORITE_LIBELLE[priorite])} data={PRIORITE_ORDRE.map(priorite => priorites[priorite])} couleurs={[COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris]} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader titre="Score par domaine" icone={Sparkles} sousTitre="Méthode Smartex : Σ notes obtenues / Σ coefficients" />
          <div className="h-80 p-5">
            {synthese ? <GraphiqueRadar labels={synthese.scoresDomaines.map(domaine => domaine.code)} series={[{
            label: 'Score du domaine',
            data: synthese.scoresDomaines.map(domaine => Number(domaine.score.toFixed(2))),
            couleur: COULEURS.brand,
            fond: COULEURS.brandClair
          }, {
            label: 'Cible interne',
            data: synthese.scoresDomaines.map(() => 4),
            couleur: COULEURS.bleu,
            fond: 'rgba(37, 99, 235, 0.08)'
          }]} /> : <Vide message="Aucun audit disponible pour le moment." />}
          </div>
        </Card>

        <Card>
          <CardHeader titre="Répartition des niveaux d’engagement" icone={Gauge} sousTitre="Échelle de Likert 1 à 5" />
          <div className="h-80 p-5">
            {synthese ? <GraphiqueBarres horizontal labels={[5, 4, 3, 2, 1].map(niveau => `${niveau} — ${NIVEAUX_ENGAGEMENT[niveau]}`)} series={[{
            label: 'Critères',
            data: [5, 4, 3, 2, 1].map(niveau => synthese.repartitionNiveaux[niveau - 1]),
            couleur: COULEURS.brand
          }]} /> : <Vide message="Aucune évaluation disponible." />}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader titre="Missions d’audit récentes" icone={ClipboardCheck} />
          <ul className="divide-y divide-ink-100">
            {audits.slice(-4).reverse().map(audit => {
            const resume = syntheseAudit(audit);
            const ent = ENTREPRISES.find(e => e.id === audit.entrepriseId);
            return <li key={audit.id}>
                  <Link to={`/app/audits/${audit.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {audit.reference} — {ent?.raisonSociale}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {resume.evaluations.length} critères évalués · {resume.nonConformites} non-conformités
                      </p>
                    </div>
                    <Badge ton={audit.statut === 'CLOTURE' ? 'vert' : audit.statut === 'REVUE_EXPERTE' ? 'ambre' : 'bleu'}>
                      {STATUT_AUDIT_LIBELLE[audit.statut]}
                    </Badge>
                    <span className="text-sm font-semibold text-ink-900">{formaterScore(resume.scoreGlobal)}</span>
                  </Link>
                </li>;
          })}
          </ul>
        </Card>

        <Card>
          <CardHeader titre={entreprise ? 'Positionnement sectoriel' : 'Portefeuille d’entreprises'} icone={Building2} sousTitre="Score global sur 5" />
          <div className="h-72 p-5">
            <GraphiqueBarres labels={portefeuille.map(ligne => ligne.entreprise.raisonSociale.split(' ')[0])} max={5} series={[{
            label: 'Score RSE global',
            data: portefeuille.map(ligne => Number(ligne.score.toFixed(2))),
            couleur: COULEURS.brand
          }, {
            label: 'Moyenne du secteur',
            data: portefeuille.map(ligne => BENCHMARK_SECTORIEL[ligne.entreprise.secteur]),
            couleur: COULEURS.gris
          }]} />
          </div>
        </Card>
      </div>

      {!entreprise ? <Card className="mt-6">
          <CardHeader titre="Abonnements actifs" icone={Sparkles} />
          <ul className="divide-y divide-ink-100">
            {ABONNEMENTS.map(abonnement => {
          const ent = ENTREPRISES.find(e => e.id === abonnement.entrepriseId);
          return <li key={abonnement.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{ent?.raisonSociale}</span>
                  <Badge ton={abonnement.plan === 'AVANCEES' ? 'vert' : abonnement.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                    {abonnement.plan}
                  </Badge>
                  <span className="text-xs text-ink-500">
                    {abonnement.periodicite === 'ANNUELLE' ? 'Annuelle' : 'Mensuelle'} ·{' '}
                    {abonnement.moyenPaiement === 'AUCUN' ? 'Sans paiement' : abonnement.moyenPaiement.replace('_', '-')}
                  </span>
                </li>;
        })}
          </ul>
        </Card> : null}
    </>;
}
