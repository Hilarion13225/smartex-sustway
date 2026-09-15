/**
 * Modèle de permissions centralisé (section 4 du CDC) : le contrôle
 * d'accès ne se résume jamais à une seule vérification de rôle éparpillée
 * dans chaque page — il croise systématiquement le rôle ET la formule
 * souscrite par l'entreprise concernée.
 *
 * PERMISSIONS_PAR_ROLE fixe ce qu'un rôle peut faire en théorie.
 * RESTRICTIONS_PAR_PLAN retire des permissions selon la formule, mais
 * UNIQUEMENT pour les rôles côté client (RESPONSABLE_ENTREPRISE, VISITEUR)
 * — le personnel interne Smartex (SUPER_ADMIN) n'est jamais
 * bridé par la formule d'un client : il audite/administre au nom de
 * Smartex, pas au nom de l'entreprise.
 *
 * EMPLOYE retiré du modèle (décision produit) : dans cette première
 * version, seul le responsable de l'entreprise est audité. Le rôle reste
 * défini côté API (table role, permission preuve:deposer/rapport:consulter
 * — voir V15) pour ne rien casser côté rattachements déjà existants et
 * simplifier une réintroduction dans une version ultérieure si pertinent.
 */

/**
 * `entreprise:creer` est accordée à RESPONSABLE_ENTREPRISE — divergence
 * assumée par rapport au prototype de référence (où seul le staff Smartex
 * onboardait les clients) : ce backend fonctionne en auto-inscription,
 * n'importe quel utilisateur crée sa propre entreprise et en devient
 * responsable (RG05). Cette permission n'est volontairement pas utilisée
 * pour gater le bouton de création dans Entreprises.jsx : un utilisateur
 * qui n'a encore aucune entreprise porte le rôle transitoire
 * AUCUN_ROLE_ATTRIBUE (absent de ce modèle), et `peut()` renverrait
 * toujours faux pour lui — le gating casserait la création de la toute
 * première entreprise, précisément l'action qui établit le rôle.
 */
export const PERMISSIONS_PAR_ROLE = {
  // RG05 : SUPER_ADMIN n'a pas "entreprise:creer" — le
  // personnel Smartex administre/audite les entreprises de ses clients, il
  // ne les crée pas à leur place (voir EntrepriseResource.creer, refus 403
  // pour tout rôle interne). Miroir exact de cette contrainte backend.
  // "membres:gerer" (ajouter/modifier/révoquer un accès collaborateur) est
  // volontairement réservée à SUPER_ADMIN seul — décision produit : même
  // RESPONSABLE_ENTREPRISE ne gère plus son équipe en libre-service. Miroir
  // exact de AutorisationService.ROLES_GESTION_MEMBRES côté backend, à ne
  // pas confondre avec "entreprise:modifier" (fiche entreprise, restée plus
  // largement accordée).
  SUPER_ADMIN: [
    'entreprise:modifier',
    'membres:gerer',
    'audit:creer',
    'audit:modifier',
    'audit:cloturer',
    'analyse:executer',
    // Entériner une évaluation produite par l'IA (V66, ouverte au responsable
    // par V72). Son absence de cette liste rendait le bouton de validation
    // invisible pour tout le monde, alors que l'API l'accordait : le modèle
    // d'affichage doit refléter l'état réel des rôles en base.
    'evaluation:valider',
    'preuve:deposer',
    'referentiel:administrer',
    'rapport:consulter',
    'rapport:detaille',
    'bailleur:consulter',
  ],
  RESPONSABLE_ENTREPRISE: [
    'entreprise:creer',
    'entreprise:modifier',
    'audit:creer',
    'audit:modifier',
    // Il lance l'analyse de ses propres missions et les clôture : deux
    // capacités distinctes, l'isolation par entreprise bornant le périmètre.
    'audit:cloturer',
    'analyse:executer',
    // V72 : il valide les évaluations de sa propre entreprise. Retirée en
    // formule FREE (voir RESTRICTIONS_PAR_PLAN), contrairement aux deux
    // capacités ci-dessus.
    'evaluation:valider',
    'preuve:deposer',
    'rapport:consulter',
    'bailleur:consulter',
  ],
  // Le collaborateur fournit la matière — réponses et pièces — sans jamais
  // déclencher l'évaluation ni figer une mission. Ni analyse:executer ni
  // audit:cloturer, ce que l'API refuse également (V42).
  COLLABORATEUR: ['preuve:deposer', 'rapport:consulter'],
};

/** Permissions retirées selon la formule souscrite — rôles côté client uniquement (RG21/RG24/RG25/RG41). */
const RESTRICTIONS_PAR_PLAN = {
  // 'evaluation:valider' est retirée de FREE (miroir de AutorisationService,
  // qui y expose la conséquence : analyse:executer et audit:cloturer restent,
  // elles, accordées en FREE).
  FREE: ['entreprise:creer', 'entreprise:modifier', 'audit:creer', 'audit:modifier', 'preuve:deposer', 'rapport:detaille', 'bailleur:consulter', 'evaluation:valider'],
  STANDARD: ['rapport:detaille', 'bailleur:consulter'],
  AVANCEES: [],
};

/**
 * Ramène un code de formule à une clé connue de RESTRICTIONS_PAR_PLAN.
 *
 * <p>Miroir exact d'AutorisationService : le backend normalise `null` en
 * `"FREE"` puis lit la table avec un `getOrDefault(..., get("FREE"))`, de
 * sorte qu'une formule absente <em>comme</em> une formule inconnue retombent
 * toutes deux sur le plan le plus restrictif.
 *
 * <p>Le frontend, lui, indexait la table directement. Une clé absente rend
 * `undefined`, dont la négation vaut `true` : une formule `undefined`, `null`
 * ou mal orthographiée était donc traitée comme « aucune restriction », soit
 * l'inverse exact de l'intention. Le défaut restait invisible parce que
 * l'API refuse ensuite en 403 — mais l'interface proposait des actions
 * vouées à échouer.
 *
 * <p>FREE n'est plus commercialisée (migration V22, `active = false`) ; elle
 * survit précisément pour ce rôle de repli sûr, des deux côtés.
 */
function formuleEffective(plan) {
  return typeof plan === 'string' && plan in RESTRICTIONS_PAR_PLAN ? plan : 'FREE';
}

// Personnel interne Smartex. ADMIN_AUDIT a été fusionné dans SUPER_ADMIN
// (V43) puis désactivé (V44) : il n'y figure plus.
const ROLES_INTERNES_SMARTEX = new Set(['SUPER_ADMIN']);

/**
 * Rôles habilités à administrer une entreprise (abonnement, journal d'audit) —
 * reflète exactement AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE côté
 * API. Ce n'est pas une permission soumise à la formule mais une capacité de
 * rôle, d'où un contrôle par code de rôle plutôt que par possedePermission().
 */
export const ROLES_ADMINISTRATION_ENTREPRISE = new Set([
  'SUPER_ADMIN',
  'RESPONSABLE_ENTREPRISE',
]);

/**
 * Libellés affichés. Les trois rôles désactivés (V44) y restent : un compte
 * historique consulté dans le journal d'audit doit se lire, même si le rôle
 * n'est plus attribuable. Ils n'apparaissent en revanche plus dans
 * PERMISSIONS_PAR_ROLE — ils n'accordent donc plus rien.
 */
export const ROLE_LIBELLE = {
  SUPER_ADMIN: 'Administrateur global',
  RESPONSABLE_ENTREPRISE: 'Responsable entreprise',
  COLLABORATEUR: 'Collaborateur',
  AUCUN_ROLE_ATTRIBUE: 'Free',
  // Rôles historiques, conservés pour la lisibilité des traces.
  ADMIN_AUDIT: 'Administrateur métier (rôle retiré)',
  EMPLOYE: 'Employé (rôle retiré)',
  VISITEUR: 'Visiteur (rôle retiré)',
};

/**
 * Contrôle centralisé : rôle puis formule (section 4). `plan` peut être
 * omis quand la permission n'est jamais soumise à restriction de formule
 * pour ce rôle (ex. referentiel:administrer, qui ne figure dans aucune
 * restriction par formule).
 *
 * <p>Attention : l'omettre pour une permission qui, elle, <em>est</em>
 * restreinte revient désormais à demander « cette permission survit-elle au
 * plan le plus restrictif ? » — voir {@link formuleEffective}. C'est le
 * comportement du backend ; s'y aligner ferme un écart où l'interface
 * proposait des actions que l'API refusait.
 */
export function possedePermission(role, plan, permission) {
  if (!role || !PERMISSIONS_PAR_ROLE[role]?.includes(permission)) return false;
  if (ROLES_INTERNES_SMARTEX.has(role)) return true;
  return !RESTRICTIONS_PAR_PLAN[formuleEffective(plan)].includes(permission);
}
