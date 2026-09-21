import { Check, FileText, Paperclip } from 'lucide-react';
import CadreApplication from './CadreApplication';
import Badge from './Badge';
import { Anneau, BarreHorizontale, Courbe } from './Graphiques';

/*
 * Un aperçu par fonctionnalité.
 *
 * La charte demande que chaque fonctionnalité soit accompagnée d'une vue du
 * produit, et non d'une illustration abstraite : c'est ce qui distingue une
 * page qui décrit un logiciel d'une page qui le montre. Chacun de ces aperçus
 * répond donc à la question « à quoi ressemble cet écran », pas « quelle
 * métaphore évoque cette idée ».
 *
 * Ils sont posés sans rail de navigation, contrairement au tableau de bord du
 * héros : à l'intérieur d'une carte de la grille, un rail mangerait un quart
 * de la largeur au profit d'un élément déjà montré plus haut.
 *
 * Les blocs partagés ci-dessous (ligne de tableau, en-tête d'écran) évitent
 * que six aperçus divergent sur la taille de leur texte ou l'épaisseur de
 * leurs filets — six variantes d'un même tableau se remarqueraient aussitôt.
 */

function TitreEcran({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{children}</p>
      {action ? <span className="rounded-md bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white">{action}</span> : null}
    </div>
  );
}

function Ligne({ children, className = '' }) {
  return (
    <li className={`flex items-center gap-2.5 border-b border-ink-100 py-2 last:border-0 ${className}`}>{children}</li>
  );
}

/* --- 01 · Campagnes & évaluations ---------------------------------------- */
const CAMPAGNES = [
  { nom: 'Évaluation ESG 2027', perimetre: 'Groupe', avancement: 72, etat: 'En cours', ton: 'information' },
  { nom: 'Diagnostic fournisseurs', perimetre: '18 sites', avancement: 45, etat: 'En cours', ton: 'information' },
  { nom: 'Revue de gouvernance', perimetre: 'Siège', avancement: 100, etat: 'Clôturée', ton: 'succes' },
];

export function ApercuCampagnes() {
  return (
    <CadreApplication
      rail={false}
      ecran="Campagnes"
      description="Écran des campagnes d’évaluation : trois campagnes listées avec leur périmètre, leur taux d’avancement et leur statut."
    >
      <TitreEcran action="Nouvelle campagne">Campagnes d’évaluation</TitreEcran>
      <ul>
        {CAMPAGNES.map((campagne) => (
          <Ligne key={campagne.nom}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-800">{campagne.nom}</span>
              <span className="block text-[10px] text-ink-500">{campagne.perimetre}</span>
            </span>
            <span className="hidden w-24 shrink-0 sm:block">
              <BarreHorizontale libelle="Avancement" valeur={campagne.avancement} compacte />
            </span>
            <Badge ton={campagne.ton}>{campagne.etat}</Badge>
          </Ligne>
        ))}
      </ul>
    </CadreApplication>
  );
}

/* --- 02 · Données & indicateurs ESG -------------------------------------- */
const INDICATEURS = [
  { libelle: 'Émissions scope 1 & 2', valeur: 64 },
  { libelle: 'Part d’énergie renouvelable', valeur: 52 },
  { libelle: 'Égalité professionnelle', valeur: 81 },
  { libelle: 'Achats responsables', valeur: 47 },
];

export function ApercuDonnees() {
  return (
    <CadreApplication
      rail={false}
      ecran="Indicateurs ESG"
      description="Écran des indicateurs ESG : une courbe de consolidation et quatre indicateurs environnementaux, sociaux et de gouvernance avec leur niveau d’atteinte."
    >
      <TitreEcran>Consolidation des indicateurs</TitreEcran>
      <Courbe points={[41, 49, 58, 64]} legendes={['T1', 'T2', 'T3', 'T4']} hauteur={92} className="mb-4" />
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {INDICATEURS.map((indicateur, index) => (
          <BarreHorizontale key={indicateur.libelle} libelle={indicateur.libelle} valeur={indicateur.valeur} delai={index * 110} compacte />
        ))}
      </div>
    </CadreApplication>
  );
}

/* --- 03 · Preuves & traçabilité ------------------------------------------ */
const PREUVES = [
  { critere: 'Politique environnementale', fichier: 'politique-env-2027.pdf', verifie: true },
  { critere: 'Bilan carbone', fichier: 'bilan-ges-scope-1-2.xlsx', verifie: true },
  { critere: 'Accord égalité femmes-hommes', fichier: 'accord-egalite.pdf', verifie: false },
];

export function ApercuPreuves() {
  return (
    <CadreApplication
      rail={false}
      ecran="Preuves"
      description="Écran de gestion des preuves : trois critères avec le justificatif qui leur est rattaché et leur état de vérification."
    >
      <TitreEcran>Justificatifs rattachés</TitreEcran>
      <ul>
        {PREUVES.map((preuve) => (
          <Ligne key={preuve.critere}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500">
              <Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-800">{preuve.critere}</span>
              <span className="block truncate text-[10px] text-ink-500">{preuve.fichier}</span>
            </span>
            {preuve.verifie ? (
              <Badge ton="succes">
                <Check className="h-3 w-3" strokeWidth={3} />
                Vérifiée
              </Badge>
            ) : (
              <Badge ton="attention">À vérifier</Badge>
            )}
          </Ligne>
        ))}
      </ul>
    </CadreApplication>
  );
}

/* --- 04 · Tableaux de bord ----------------------------------------------- */
const ECARTS = [
  { libelle: 'Environnement', valeur: 78 },
  { libelle: 'Social', valeur: 71 },
  { libelle: 'Gouvernance', valeur: 74 },
];

export function ApercuTableauDeBord() {
  return (
    <CadreApplication
      rail={false}
      ecran="Tableau de bord"
      description="Écran de tableau de bord : un score global de 72 sur 100 en anneau, et le détail des trois dimensions ESG notées 78, 71 et 74."
    >
      <TitreEcran>Score de maturité</TitreEcran>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <Anneau valeur={72} libelle="Score ESG global" taille={116} />
        <div className="w-full flex-1 space-y-3">
          {ECARTS.map((ecart, index) => (
            <BarreHorizontale key={ecart.libelle} libelle={ecart.libelle} valeur={ecart.valeur} delai={index * 140} compacte />
          ))}
        </div>
      </div>
    </CadreApplication>
  );
}

/* --- 05 · Plans d'action -------------------------------------------------- */
const PLANS = [
  { intitule: 'Réduire la consommation d’énergie', responsable: 'Direction technique', echeance: '31/03', priorite: 'Haute', ton: 'risque', avancement: 60 },
  { intitule: 'Former les collaborateurs', responsable: 'Ressources humaines', echeance: '30/06', priorite: 'Moyenne', ton: 'attention', avancement: 15 },
  { intitule: 'Actualiser la politique d’achats', responsable: 'Achats', echeance: '15/05', priorite: 'Haute', ton: 'risque', avancement: 40 },
];

export function ApercuPlansAction() {
  return (
    <CadreApplication
      rail={false}
      ecran="Plans d’action"
      description="Écran des plans d’action : trois actions avec leur responsable, leur échéance, leur priorité et leur taux d’avancement."
    >
      <TitreEcran>Suivi des actions</TitreEcran>
      <ul>
        {PLANS.map((plan) => (
          <Ligne key={plan.intitule} className="!items-start">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-800">{plan.intitule}</span>
              <span className="mt-0.5 block truncate text-[10px] text-ink-500">
                {plan.responsable} · échéance {plan.echeance}
              </span>
              <span className="mt-1.5 block max-w-[180px]">
                <BarreHorizontale libelle="Avancement" valeur={plan.avancement} compacte />
              </span>
            </span>
            <Badge ton={plan.ton}>{plan.priorite}</Badge>
          </Ligne>
        ))}
      </ul>
    </CadreApplication>
  );
}

/* --- 06 · Reporting ------------------------------------------------------- */
const RAPPORT = [
  'Périmètre et méthodologie',
  'Indicateurs environnementaux',
  'Indicateurs sociaux',
  'Gouvernance et éthique',
  'Plan d’action et trajectoire',
];

export function ApercuReporting() {
  return (
    <CadreApplication
      rail={false}
      ecran="Reporting"
      description="Écran de reporting : le sommaire d’un rapport de durabilité en cinq chapitres, avec un aperçu de la page de synthèse."
    >
      <TitreEcran action="Exporter">Rapport de durabilité</TitreEcran>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <ul className="space-y-1.5">
          {RAPPORT.map((chapitre, index) => (
            <li key={chapitre} className="flex items-center gap-2.5 text-[12px] text-ink-700">
              <span className="w-4 shrink-0 text-[10px] font-semibold tabular-nums text-ink-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1 truncate">{chapitre}</span>
              <span className="h-1 w-10 shrink-0 rounded-full bg-brand-100" />
            </li>
          ))}
        </ul>
        {/* Vignette de page : le rapport est un livrable, montrer sa forme
            compte autant que lister ses chapitres. */}
        <div className="hidden w-[92px] shrink-0 rounded-lg border border-ink-200 bg-ink-50 p-2.5 sm:block">
          <FileText className="mb-2 h-4 w-4 text-brand-600" strokeWidth={1.75} />
          <span className="mb-1.5 block h-1 w-full rounded-full bg-ink-300" />
          <span className="mb-1.5 block h-1 w-4/5 rounded-full bg-ink-200" />
          <span className="mb-3 block h-1 w-3/5 rounded-full bg-ink-200" />
          <span className="block h-7 w-full rounded bg-brand-100" />
        </div>
      </div>
    </CadreApplication>
  );
}
