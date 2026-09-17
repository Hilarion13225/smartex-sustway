import {
  BookOpen,
  Building2,
  ClipboardList,
  ClipboardX,
  FileText,
  FolderOpen,
  History,
  Leaf,
  ListTodo,
  Sparkles,
  Target,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { ROLES_ADMINISTRATION_ENTREPRISE } from '../auth/permissions';

/**
 * Les pages d'une organisation, définies une seule fois.
 *
 * Deux surfaces les affichent : la barre latérale des comptes client, où le
 * sélecteur d'organisation fournit le contexte, et la fiche d'organisation,
 * qui sert de point d'entrée à la supervision — celle-ci n'a pas de sélecteur
 * et son menu ne garde que ce qui est global.
 *
 * Elles sont ici plutôt que dans l'une des deux parce qu'une seconde liste de
 * libellés, d'icônes et de permissions finirait par diverger de la première :
 * un lien ajouté d'un côté manquerait de l'autre, et rien ne le signalerait.
 *
 * Une entrée porte `chemin` quand elle vise une organisation précise, `vers`
 * quand elle est globale. La fiche ne retient que les premières : « la liste
 * des organisations » n'a pas sa place dans l'une d'elles.
 */
export const GROUPES_ORGANISATION = [
  {
    // Les entrées se suivent dans l'ordre où le travail se fait : on cadre le
    // périmètre, on ouvre une mission, on dépose les preuves, l'IA les
    // confronte au référentiel.
    titre: 'Parcours d’audit',
    liens: [
      { vers: '/app/entreprises', libelle: 'Organisations', icone: Building2 },
      // Quels critères s'appliquent compte tenu du secteur (RG34). C'est
      // l'étape de cadrage que ce groupe annonce ; elle n'existait que dans
      // la navigation du collaborateur, si bien que celui qui exécute voyait
      // le périmètre et celui qui pilote ne le voyait pas.
      { chemin: (id) => `/app/${id}/questionnaire`, libelle: 'Périmètre applicable', icone: ClipboardList },
      { chemin: (id) => `/app/${id}/audits`, libelle: 'Missions d’audit', icone: ClipboardList },
      { chemin: (id) => `/app/${id}/documents`, libelle: 'Bibliothèque documentaire', icone: FolderOpen },
      { chemin: (id) => `/app/${id}/pipeline-ia`, libelle: 'Pipeline IA', icone: Sparkles },
    ],
  },
  {
    // Ce qui sort de l'audit, dans l'ordre où cela se lit : les écarts, ce
    // qu'on fait pour les traiter, puis ce qu'on en restitue.
    titre: 'Résultats',
    liens: [
      // Ces trois entrées se suivent et se ressemblent. Leur différence tient
      // à l'origine de ce qu'elles listent — un écart, la correction d'un
      // écart, un axe validé — et rien dans le menu ne la disait.
      {
        chemin: (id) => `/app/${id}/non-conformites`,
        libelle: 'Non-conformités',
        icone: ClipboardX,
        description: 'Les écarts constatés, toutes missions confondues.',
      },
      {
        chemin: (id) => `/app/${id}/plan-actions`,
        libelle: 'Actions correctives',
        icone: ListTodo,
        description: 'Les actions qui traitent ces écarts. Elles naissent des non-conformités.',
      },
      {
        chemin: (id) => `/app/${id}/plans`,
        libelle: 'Plans d’amélioration',
        icone: Target,
        description: 'Construits à partir des axes validés — distincts des actions correctives.',
      },
      { chemin: (id) => `/app/${id}/rapports`, libelle: 'Rapports RSE', icone: FileText, permission: 'rapport:consulter' },
      {
        chemin: (id) => `/app/${id}/financements-verts`,
        libelle: 'Financements verts',
        icone: Leaf,
        permission: 'bailleur:consulter',
      },
    ],
  },
  {
    titre: 'Administration',
    liens: [
      {
        vers: '/app/referentiels',
        libelle: 'Référentiels',
        icone: BookOpen,
        // L'entrée reste masquée tant que le rôle ne porte pas
        // `referentiel:administrer` — c'est le filtre qui décide, pas cette
        // déclaration. Depuis V32, la permission est portée par SUPER_ADMIN.
        permission: 'referentiel:administrer',
        enfants: [
          { libelle: 'Référentiels', vers: '/app/referentiels' },
          { libelle: 'Import intelligent', vers: '/app/referentiels/import' },
        ],
      },
      // `membres:gerer` est réservée à SUPER_ADMIN (voir PERMISSIONS_PAR_ROLE) :
      // c'est la règle qu'appliquait déjà la fiche d'organisation, exprimée ici
      // par une permission plutôt que par un test de rôle écrit à la main.
      {
        chemin: (id) => `/app/${id}/utilisateurs`,
        libelle: 'Utilisateurs et permissions',
        icone: Users,
        permission: 'membres:gerer',
      },
      { chemin: (id) => `/app/${id}/abonnement`, libelle: 'Abonnement et paiements', icone: Wallet, administration: true },
      { chemin: (id) => `/app/${id}/journal`, libelle: 'Journal d’audit', icone: History, administration: true },
      { vers: '/app/profil', libelle: 'Profil & sécurité', icone: UserCog },
    ],
  },
];

/**
 * Un lien est-il visible pour ce compte ?
 *
 * Masquer un lien n'est pas une mesure de sécurité : les mêmes restrictions
 * sont contrôlées par l'API (voir AutorisationService et les tests d'isolation
 * multi-tenant). C'est ici une question de lisibilité — ne pas proposer une
 * page qui répondrait 403.
 */
export function lienVisible(lien, { peut, formule, roleCourant, nombreOrganisations = 0 }) {
  if (lien.permission && !peut(lien.permission, formule)) return false;
  if (lien.administration && !ROLES_ADMINISTRATION_ENTREPRISE.has(roleCourant)) return false;
  // Une page qui confronte plusieurs organisations n'a rien à produire quand
  // il n'y en a qu'une : la proposer promet un résultat qui ne viendra pas.
  // L'entrée revient d'elle-même dès qu'une seconde organisation existe, et sa
  // route n'est pas touchée.
  if (lien.multiOrganisation && nombreOrganisations < 2) return false;
  return true;
}

/**
 * Les mêmes groupes, réduits à ce qui vise une organisation et résolu pour
 * elle. C'est ce que la fiche d'organisation affiche.
 *
 * Un groupe qui ne garde aucun lien disparaît, plutôt que de laisser un titre
 * au-dessus du vide.
 */
export function groupesDeLOrganisation(entrepriseId, contexte) {
  return GROUPES_ORGANISATION.map((groupe) => ({
    titre: groupe.titre,
    liens: groupe.liens
      .filter((lien) => lien.chemin && lienVisible(lien, contexte))
      .map((lien) => ({ ...lien, vers: lien.chemin(entrepriseId) })),
  })).filter((groupe) => groupe.liens.length > 0);
}
