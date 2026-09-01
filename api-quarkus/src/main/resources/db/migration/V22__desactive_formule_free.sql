-- =====================================================================
-- Retire la formule Free de l'offre
-- =====================================================================
-- Désactivation plutôt que suppression : FormuleResource.lister() (endpoint
-- public consommé par la page Formules et l'assistant d'inscription) filtre
-- déjà sur formule_abonnement.active — désactiver suffit à la faire
-- disparaître de l'offre proposée, sans toucher à d'éventuelles données
-- historiques ni risquer une contrainte de clé étrangère. Aucune entreprise
-- ne peut de toute façon avoir d'abonnement en formule Free (RG25,
-- EntrepriseResource.creer refuse la formule FREE), donc aucune ligne
-- abonnement ne référence cette formule.
-- =====================================================================

UPDATE formule_abonnement SET active = false WHERE code = 'FREE';
