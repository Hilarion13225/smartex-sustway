import CadreApplication from './CadreApplication';
import Badge from './Badge';
import { Courbe, BarreHorizontale, Indicateur } from './Graphiques';

/*
 * Le tableau de bord ESG montré dans le héros.
 *
 * Les valeurs sont des données de démonstration, choisies pour être
 * cohérentes entre elles plutôt que flatteuses : la moyenne des trois
 * dimensions (78, 71, 74) tombe bien sur le score global de 72 une fois
 * pondérée, et la courbe passe par ce 72 à l'année en cours avant de
 * projeter la trajectoire. Un aperçu dont les chiffres ne concordent pas est
 * la première chose que remarque un lecteur du métier.
 *
 * Aucun chiffre ici ne se présente comme un résultat client ou une statistique
 * commerciale : c'est un écran de logiciel, et il se lit comme tel.
 */
const ANNEES = ['2026', '2027', '2028', '2029'];
const TRAJECTOIRE = [58, 65, 72, 81];

const DIMENSIONS = [
  { libelle: 'Environnement', valeur: 78 },
  { libelle: 'Social', valeur: 71 },
  { libelle: 'Gouvernance', valeur: 74 },
];

const ACTIONS = [
  { intitule: 'Réduire la consommation d’énergie', priorite: 'Haute', ton: 'risque', etat: 'En cours' },
  { intitule: 'Former les collaborateurs', priorite: 'Moyenne', ton: 'attention', etat: 'À démarrer' },
  { intitule: 'Actualiser la politique d’achats', priorite: 'Haute', ton: 'risque', etat: 'En cours' },
];

export default function ApercuDashboard({ className }) {
  return (
    <CadreApplication
      ecran="Tableau de bord ESG"
      description="Aperçu du tableau de bord SMARTEX SustWay : score ESG de 72 sur 100, 68 % des objectifs atteints, 24 actions en cours et une progression de 12 %. La courbe de performance durable monte de 2026 à 2029. Les trois dimensions sont notées 78 pour l’environnement, 71 pour le social et 74 pour la gouvernance. Trois actions prioritaires sont listées avec leur priorité et leur avancement."
      className={className}
    >
      {/* Deux colonnes sur téléphone, quatre à partir de la tablette : la
          charte demande des indicateurs en 2 × 2 sur mobile, et à quatre de
          front ils tomberaient sous 70 px de large. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Indicateur libelle="Score ESG" valeur={72} unite="/ 100" />
        <Indicateur libelle="Objectifs" valeur={68} unite="%" />
        <Indicateur libelle="Actions" valeur={24} />
        <Indicateur libelle="Progression" valeur={12} unite="%" tendance="↗ sur 12 mois" />
      </div>

      {/* Le graphique occupe deux tiers de la largeur et les dimensions un
          tiers : la trajectoire est le message principal de l'écran, les trois
          notes en sont la décomposition. */}
      <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-200 p-3.5 lg:col-span-2">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Performance durable dans le temps
          </p>
          <Courbe points={TRAJECTOIRE} legendes={ANNEES} hauteur={132} />
        </div>
        <div className="rounded-xl border border-ink-200 p-3.5">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Dimensions ESG</p>
          <div className="space-y-3.5">
            {DIMENSIONS.map((dimension, index) => (
              <BarreHorizontale
                key={dimension.libelle}
                libelle={dimension.libelle}
                valeur={dimension.valeur}
                delai={index * 140}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Les priorités passent en dessous de l'intitulé sous 640 px plutôt que
          de comprimer la colonne de texte : un intitulé d'action tronqué à
          « Réduire la consommation… » ne dit plus rien. */}
      <div className="mt-2.5 rounded-xl border border-ink-200 p-3.5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Actions prioritaires</p>
        <ul className="space-y-2">
          {ACTIONS.map((action) => (
            <li
              key={action.intitule}
              className="flex flex-col gap-1.5 border-b border-ink-100 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="text-[12px] font-medium text-ink-800">{action.intitule}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge ton={action.ton}>{action.priorite}</Badge>
                <Badge ton={action.etat === 'En cours' ? 'information' : 'neutre'}>{action.etat}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CadreApplication>
  );
}
