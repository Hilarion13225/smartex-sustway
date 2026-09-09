# -*- coding: utf-8 -*-
"""
Contenu métier du référentiel IFC_SFI.

Chaque entrée reformule le critère en exigence vérifiable, sans inventer
d'obligation réglementaire ni de seuil. Les critères qui ne concernent que
certaines activités (acquisition foncière, biodiversité, peuples autochtones,
patrimoine culturel) sont formulés conditionnellement : « lorsque les
activités … ». C'est la portée réelle du critère, pas une règle universelle.

Portée des règles : None = le critère, "exigence" = l'exigence,
un entier = l'index de la preuve attendue concernée.
"""

CONTENU = {

    # --- D1 : Évaluation et gestion des risques et impacts ---------------

    "D1-01": dict(
        intitule="Système de gestion environnementale documenté",
        enonce=(
            "L'organisation doit disposer d'un système de gestion environnementale documenté, "
            "couvrant l'identification de ses impacts environnementaux, les mesures de maîtrise "
            "retenues, les responsabilités associées et le suivi de leur mise en œuvre. La "
            "documentation doit être à jour et refléter les activités réellement exercées."
        ),
        preuves=[
            ("POLITIQUE", "Politique environnementale de l'organisation",
             "Document validé par la direction, énonçant les engagements environnementaux.", True),
            ("PROCEDURE", "Procédures de maîtrise des impacts environnementaux",
             "Procédures décrivant les dispositions opérationnelles et les responsabilités.", True),
            ("REGISTRE", "Registre des impacts environnementaux identifiés",
             "Recensement des impacts, de leur évaluation et des mesures associées.", False),
        ],
        regles=[
            ("R1", "SIGNATURE", "La politique environnementale doit être validée par la direction",
             "ELEVEE", 0, {"mention_attendue": "validation ou approbation par la direction"}),
            ("R2", "ELEMENT_ATTENDU", "Le système doit désigner des responsabilités et un suivi",
             "MOYENNE", "exigence",
             {"elements": ["responsabilités désignées", "modalités de suivi",
                           "mesures de maîtrise des impacts"]}),
        ],
    ),

    "D1-02": dict(
        intitule="Système de gestion sociale documenté",
        enonce=(
            "L'organisation doit disposer d'un système de gestion des aspects sociaux documenté, "
            "couvrant les conditions de travail, la santé et la sécurité, et les relations avec "
            "les personnes affectées par ses activités, avec des responsabilités identifiées et "
            "un suivi de leur mise en œuvre."
        ),
        preuves=[
            ("POLITIQUE", "Politique sociale ou de gestion des ressources humaines",
             "Document validé par la direction couvrant les engagements sociaux.", True),
            ("PROCEDURE", "Procédures de gestion des aspects sociaux",
             "Procédures relatives aux conditions de travail et à la santé-sécurité.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le système doit couvrir travail, santé-sécurité et parties affectées",
             "MOYENNE", "exigence",
             {"elements": ["conditions de travail", "santé et sécurité au travail",
                           "relations avec les personnes affectées"]}),
        ],
    ),

    "D1-03": dict(
        intitule="Étude d'impact préalable aux projets",
        enonce=(
            "Lorsque l'organisation engage un projet susceptible d'avoir des impacts "
            "environnementaux ou sociaux, elle doit conduire une étude d'impact avant le "
            "démarrage des travaux, et en conserver le rapport ainsi que les mesures d'atténuation "
            "qui en découlent. L'étendue de l'étude dépend de la nature du projet et des "
            "obligations applicables localement."
        ),
        preuves=[
            ("RAPPORT", "Étude d'impact environnemental et social",
             "Rapport d'étude daté, antérieur au démarrage du projet concerné.", True),
            ("DOCUMENT_LEGAL", "Autorisation ou avis de l'autorité compétente",
             "Lorsque la réglementation locale en prévoit une.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'étude doit être antérieure au démarrage du projet",
             "ELEVEE", 0, {"champ": "date de l'étude d'impact"}),
            ("R2", "ELEMENT_ATTENDU", "L'étude doit énoncer des mesures d'atténuation",
             "MOYENNE", 0, {"elements": ["mesures d'atténuation", "impacts identifiés"]}),
        ],
    ),

    "D1-04": dict(
        intitule="Plan de suivi et reporting périodique",
        enonce=(
            "L'organisation doit disposer d'un dispositif de suivi de sa performance "
            "environnementale et sociale, précisant les indicateurs suivis, leur périodicité et "
            "les destinataires du reporting, et produire effectivement ces rapports selon la "
            "périodicité annoncée."
        ),
        preuves=[
            ("PROCEDURE", "Plan de suivi et de reporting",
             "Document précisant indicateurs, périodicité et destinataires.", True),
            ("RAPPORT", "Rapports de suivi produits sur la période",
             "Rapports effectivement établis, attestant que le plan est appliqué.", True),
        ],
        regles=[
            ("R1", "COHERENCE_DECLARATION",
             "Les rapports produits doivent correspondre à la périodicité annoncée",
             "MOYENNE", "exigence",
             {"elements": ["périodicité annoncée dans le plan",
                           "dates des rapports effectivement produits"]}),
        ],
    ),

    # --- D2 : Main-d'œuvre et conditions de travail ----------------------

    "D2-05": dict(
        intitule="Absence de travail forcé dans les relations de travail",
        enonce=(
            "L'organisation doit s'assurer qu'aucune de ses relations de travail ne relève du "
            "travail forcé ou obligatoire : engagement librement consenti, liberté de quitter "
            "l'emploi, absence de rétention de documents d'identité ou de cautions. Cet engagement "
            "doit être formalisé et opposable, y compris dans les contrats."
        ),
        preuves=[
            ("POLITIQUE", "Engagement écrit contre le travail forcé",
             "Politique ou clause contractuelle interdisant le travail forcé.", True),
            ("DOCUMENT_LEGAL", "Modèle de contrat de travail",
             "Permet de vérifier les conditions d'engagement et de rupture.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Rechercher les garanties contre le travail forcé",
             "ELEVEE", "exigence",
             {"elements": ["consentement libre à l'embauche", "liberté de quitter l'emploi",
                           "absence de rétention de documents d'identité",
                           "absence de caution financière exigée du salarié"]}),
        ],
    ),

    "D2-06": dict(
        intitule="Absence de travail des enfants",
        enonce=(
            "L'organisation doit s'assurer qu'aucune personne n'ayant pas atteint l'âge minimum "
            "d'admission à l'emploi fixé par la législation applicable n'est employée, et disposer "
            "d'un dispositif de vérification de l'âge à l'embauche."
        ),
        preuves=[
            ("POLITIQUE", "Engagement écrit contre le travail des enfants",
             "Politique ou clause contractuelle fixant l'âge minimum d'embauche.", True),
            ("PROCEDURE", "Procédure de vérification de l'âge à l'embauche",
             "Décrit les pièces exigées et le contrôle effectué.", True),
        ],
        regles=[
            ("R1", "PRESENCE", "Un dispositif de vérification de l'âge doit être décrit",
             "ELEVEE", 1, {"elements": ["vérification de l'âge", "pièces justificatives exigées"]}),
        ],
    ),

    "D2-07": dict(
        intitule="Formation santé et sécurité des employés",
        enonce=(
            "L'organisation doit former ses employés aux risques de santé et de sécurité liés à "
            "leur poste, et conserver la trace des formations dispensées : contenu, dates et "
            "participants."
        ),
        preuves=[
            ("REGISTRE", "Registre des formations santé-sécurité",
             "Dates, thèmes et participants aux sessions dispensées.", True),
            ("PROCEDURE", "Programme ou plan de formation santé-sécurité",
             "Décrit les formations prévues et leur périodicité.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le registre doit identifier dates, thèmes et participants",
             "MOYENNE", 0, {"elements": ["dates des sessions", "thèmes traités", "participants"]}),
            ("R2", "DATE_VALIDITE", "Les formations doivent être récentes",
             "MOYENNE", 0, {"champ": "date de la dernière session de formation"}),
        ],
    ),

    "D2-08": dict(
        intitule="Mécanisme de plainte accessible aux travailleurs",
        enonce=(
            "L'organisation doit mettre à la disposition de ses travailleurs un mécanisme de "
            "plainte accessible, dont les modalités de saisine et de traitement sont portées à "
            "leur connaissance, et conserver la trace des plaintes reçues et de leur suite."
        ),
        preuves=[
            ("PROCEDURE", "Procédure de traitement des plaintes des travailleurs",
             "Modalités de saisine, délais et responsabilités de traitement.", True),
            ("REGISTRE", "Registre des plaintes reçues et de leur traitement",
             "Trace des saisines et des suites données, éventuellement anonymisée.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La procédure doit préciser saisine, délais et suites",
             "MOYENNE", 0,
             {"elements": ["modalités de saisine", "délai de traitement", "suites données"]}),
        ],
    ),

    "D2-09": dict(
        intitule="Mécanisme de résolution des conflits du travail",
        enonce=(
            "L'organisation doit disposer d'un dispositif de résolution des différends avec ses "
            "travailleurs, distinct ou complémentaire du mécanisme de plainte, et en décrire les "
            "étapes ainsi que les personnes qui en ont la charge."
        ),
        preuves=[
            ("PROCEDURE", "Procédure de résolution des conflits du travail",
             "Étapes, interlocuteurs et modalités de recours.", True),
        ],
        regles=[],
    ),

    # --- D3 : Ressources et prévention de la pollution -------------------

    "D3-10": dict(
        intitule="Mesure et maîtrise de la consommation d'énergie",
        enonce=(
            "L'organisation doit mesurer sa consommation d'énergie de façon régulière et disposer "
            "d'un objectif de maîtrise ou de réduction de cette consommation, assorti du suivi "
            "permettant d'en constater l'évolution."
        ),
        preuves=[
            ("INDICATEUR", "Relevés de consommation d'énergie",
             "Données de consommation sur plusieurs périodes comparables.", True),
            ("RAPPORT", "Objectif de maîtrise ou de réduction et suivi associé",
             "Document énonçant l'objectif retenu et l'avancement constaté.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Des relevés de consommation doivent être fournis",
             "ELEVEE", 0, {"elements": ["consommation d'énergie", "périodes de relevé"]}),
            ("R2", "COHERENCE_DECLARATION",
             "L'objectif déclaré doit se retrouver dans les données fournies",
             "MOYENNE", "exigence",
             {"elements": ["objectif de réduction déclaré", "évolution constatée dans les relevés"]}),
        ],
    ),

    "D3-11": dict(
        intitule="Mesure et maîtrise de la consommation d'eau",
        enonce=(
            "L'organisation doit mesurer sa consommation d'eau de façon régulière et disposer d'un "
            "objectif de maîtrise ou de réduction de cette consommation, assorti du suivi "
            "permettant d'en constater l'évolution."
        ),
        preuves=[
            ("INDICATEUR", "Relevés de consommation d'eau",
             "Données de consommation sur plusieurs périodes comparables.", True),
            ("RAPPORT", "Objectif de maîtrise ou de réduction et suivi associé",
             "Document énonçant l'objectif retenu et l'avancement constaté.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Des relevés de consommation doivent être fournis",
             "ELEVEE", 0, {"elements": ["consommation d'eau", "périodes de relevé"]}),
        ],
    ),

    "D3-14": dict(
        intitule="Tri des déchets à la source",
        enonce=(
            "L'organisation doit trier ses déchets par catégorie à la source, disposer des moyens "
            "matériels correspondants et avoir porté les consignes de tri à la connaissance des "
            "personnes concernées."
        ),
        preuves=[
            ("PROCEDURE", "Consignes de tri des déchets",
             "Document décrivant les catégories triées et les modalités.", True),
            ("PREUVE_OPERATIONNELLE", "Éléments attestant du tri effectif",
             "Photographies des points de collecte, signalétique, bordereaux par flux.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les catégories de déchets triés doivent être identifiées",
             "MOYENNE", 0, {"elements": ["catégories de déchets", "modalités de tri"]}),
        ],
    ),

    "D3-15": dict(
        intitule="Recyclage ou valorisation des déchets",
        enonce=(
            "L'organisation doit orienter ses déchets vers le recyclage ou la valorisation lorsque "
            "des filières existent et sont accessibles, et conserver la trace des quantités "
            "remises et des prestataires sollicités."
        ),
        preuves=[
            ("REGISTRE", "Registre des enlèvements de déchets",
             "Quantités par flux, dates et destination.", True),
            ("DOCUMENT_LEGAL", "Contrat ou attestation du prestataire de collecte",
             "Identifie la filière de traitement retenue.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La destination des déchets doit être identifiable",
             "MOYENNE", 0, {"elements": ["filière de traitement", "quantités remises", "dates"]}),
        ],
    ),

    # --- D4 : Santé, sécurité et sûreté des communautés ------------------

    "D4-16": dict(
        intitule="Plan d'urgence en cas d'accident",
        enonce=(
            "L'organisation doit disposer d'un plan d'urgence adapté aux risques de ses activités, "
            "identifiant les scénarios retenus, les conduites à tenir, les moyens d'alerte et les "
            "personnes responsables, et l'avoir porté à la connaissance des personnes concernées."
        ),
        preuves=[
            ("PROCEDURE", "Plan d'urgence ou plan d'intervention",
             "Scénarios, conduites à tenir, moyens d'alerte et responsables.", True),
            ("REGISTRE", "Trace des exercices ou simulations réalisés",
             "Dates et participants aux exercices d'évacuation ou de simulation.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le plan doit identifier scénarios, alerte et responsables",
             "ELEVEE", 0,
             {"elements": ["scénarios d'accident", "moyens d'alerte", "responsables désignés",
                           "conduites à tenir"]}),
            ("R2", "DATE_VALIDITE", "Le plan doit avoir été revu récemment",
             "MOYENNE", 0, {"champ": "date de dernière révision du plan"}),
        ],
    ),

    "D4-17": dict(
        intitule="Information des communautés sur les risques",
        enonce=(
            "Lorsque les activités de l'organisation présentent des risques pour les populations "
            "riveraines, celle-ci doit les en informer par des moyens adaptés et conserver la trace "
            "de ces actions d'information."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Supports d'information des riverains",
             "Affiches, réunions publiques, courriers, comptes rendus.", True),
        ],
        regles=[],
    ),

    "D4-18": dict(
        intitule="Mesures matérielles de sécurité des sites",
        enonce=(
            "L'organisation doit mettre en place, sur ses sites, les mesures de sécurité adaptées "
            "aux risques identifiés — signalisation, délimitation des zones dangereuses, contrôle "
            "des accès — et pouvoir en justifier l'existence effective."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des mesures en place",
             "Photographies de la signalisation, des clôtures, des dispositifs d'accès.", True),
            ("PROCEDURE", "Consignes de sécurité et de contrôle des accès",
             "Document décrivant les dispositions applicables sur site.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Rechercher les dispositifs de sécurité décrits",
             "MOYENNE", "exigence",
             {"elements": ["signalisation des risques", "délimitation des zones dangereuses",
                           "contrôle des accès"]}),
        ],
    ),

    # --- D5 : Acquisition de terres et réinstallation --------------------

    "D5-19": dict(
        intitule="Consultation préalable des populations affectées",
        enonce=(
            "Lorsque les activités de l'organisation impliquent l'acquisition de terres ou la "
            "restriction d'usage de terrains occupés, les populations affectées doivent être "
            "consultées avant la décision, et la trace de cette consultation conservée."
        ),
        preuves=[
            ("RAPPORT", "Compte rendu de la consultation des populations affectées",
             "Dates, participants, sujets abordés et suites annoncées.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "La consultation doit précéder l'acquisition",
             "ELEVEE", 0, {"champ": "date de la consultation"}),
        ],
    ),

    "D5-20": dict(
        intitule="Plan de compensation des personnes affectées",
        enonce=(
            "Lorsqu'une acquisition de terres entraîne une perte de biens, de revenus ou d'accès "
            "pour des personnes ou des ménages, l'organisation doit disposer d'un plan de "
            "compensation écrit précisant les bénéficiaires, la base d'évaluation retenue et les "
            "modalités de versement."
        ),
        preuves=[
            ("PROCEDURE", "Plan de compensation",
             "Bénéficiaires, base d'évaluation et modalités de versement.", True),
            ("REGISTRE", "Registre des compensations versées",
             "Trace des versements effectués et de leurs bénéficiaires.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le plan doit exposer sa base d'évaluation",
             "ELEVEE", 0,
             {"elements": ["base d'évaluation des compensations", "bénéficiaires identifiés",
                           "modalités de versement"]}),
        ],
    ),

    "D5-21": dict(
        intitule="Suivi des personnes réinstallées",
        enonce=(
            "Lorsque des personnes ont été réinstallées du fait des activités de l'organisation, "
            "celle-ci doit assurer un suivi de leur situation après la réinstallation et en "
            "conserver les constats."
        ),
        preuves=[
            ("RAPPORT", "Rapport de suivi des personnes réinstallées",
             "Constats postérieurs à la réinstallation.", True),
        ],
        regles=[],
    ),

    # --- D6 : Biodiversité et ressources naturelles vivantes -------------

    "D6-22": dict(
        intitule="Identification préalable des zones sensibles",
        enonce=(
            "Avant d'engager une activité sur un site nouveau, l'organisation doit vérifier la "
            "présence de zones sensibles ou protégées à proximité et conserver la trace de cette "
            "identification, y compris lorsqu'elle conclut à l'absence de zone concernée."
        ),
        preuves=[
            ("RAPPORT", "Étude ou note d'identification des zones sensibles",
             "Périmètre examiné, sources consultées et conclusion.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'identification doit précéder le démarrage de l'activité",
             "ELEVEE", 0, {"champ": "date de l'identification"}),
        ],
    ),

    "D6-23": dict(
        intitule="Mesures de restauration écologique",
        enonce=(
            "Lorsque les activités de l'organisation portent atteinte à des milieux à forte "
            "biodiversité ou à des ressources naturelles vivantes, celle-ci doit prévoir des "
            "mesures de restauration ou de compensation écologique, en préciser le calendrier et "
            "en suivre la réalisation."
        ),
        preuves=[
            ("PROCEDURE", "Plan de restauration ou de compensation écologique",
             "Mesures retenues, calendrier et responsables.", True),
            ("PREUVE_OPERATIONNELLE", "Éléments attestant de la réalisation des mesures",
             "Photographies, constats de terrain, rapports d'avancement.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le plan doit préciser mesures et calendrier",
             "MOYENNE", 0, {"elements": ["mesures de restauration", "calendrier de réalisation"]}),
        ],
    ),

    "D6-26": dict(
        intitule="Exploitation durable des ressources halieutiques",
        enonce=(
            "Lorsque l'organisation exploite des ressources halieutiques, elle doit décrire les "
            "dispositions par lesquelles cette exploitation reste soutenable — zones et périodes "
            "d'exploitation, engins utilisés, volumes prélevés — et justifier du respect des "
            "autorisations applicables."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Autorisations d'exploitation",
             "Licences ou permis délivrés par l'autorité compétente.", True),
            ("REGISTRE", "Relevés des volumes prélevés",
             "Quantités, zones et périodes d'exploitation.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'autorisation doit être en cours de validité",
             "ELEVEE", 0, {"champ": "date de fin de validité de l'autorisation"}),
        ],
    ),

    # --- D7 : Peuples autochtones ----------------------------------------

    "D7-27": dict(
        intitule="Consentement libre, préalable et éclairé",
        enonce=(
            "Lorsque les activités de l'organisation affectent des communautés autochtones, "
            "celle-ci doit conduire un processus de consultation recherchant leur consentement "
            "libre, préalable et éclairé, et en conserver la trace : information transmise, "
            "échanges tenus et position exprimée par la communauté."
        ),
        preuves=[
            ("RAPPORT", "Compte rendu du processus de consultation",
             "Information transmise, échanges tenus et position exprimée.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le compte rendu doit établir le caractère préalable et éclairé",
             "ELEVEE", 0,
             {"elements": ["information transmise à la communauté", "date des échanges",
                           "position exprimée par la communauté"]}),
        ],
    ),

    "D7-28": dict(
        intitule="Respect des traditions et cultures locales",
        enonce=(
            "L'organisation doit avoir identifié les usages, traditions et pratiques culturelles "
            "des communautés concernées par ses activités, et pris des dispositions pour éviter "
            "d'y porter atteinte."
        ),
        preuves=[
            ("PROCEDURE", "Dispositions prises au regard des usages locaux",
             "Note ou procédure décrivant les précautions retenues.", True),
        ],
        regles=[],
    ),

    "D7-29": dict(
        intitule="Partage des bénéfices avec les communautés",
        enonce=(
            "L'organisation doit pouvoir décrire les retombées directes de ses activités pour les "
            "communautés concernées — emplois, formations, infrastructures ou services — et en "
            "apporter des éléments factuels."
        ),
        preuves=[
            ("RAPPORT", "Bilan des retombées locales",
             "Emplois créés, formations dispensées, infrastructures financées.", True),
            ("INDICATEUR", "Données chiffrées des retombées",
             "Effectifs recrutés localement, montants engagés.", False),
        ],
        regles=[],
    ),

    # --- D8 : Patrimoine culturel ----------------------------------------

    "D8-30": dict(
        intitule="Identification du patrimoine culturel proche",
        enonce=(
            "L'organisation doit avoir vérifié la présence de sites archéologiques, historiques ou "
            "culturels à proximité de ses activités, et conserver la trace de cette identification, "
            "y compris lorsqu'elle conclut à l'absence de site concerné."
        ),
        preuves=[
            ("RAPPORT", "Note d'identification du patrimoine culturel",
             "Périmètre examiné, sources consultées et conclusion.", True),
        ],
        regles=[],
    ),

    "D8-31": dict(
        intitule="Procédure de découverte fortuite",
        enonce=(
            "L'organisation doit disposer d'une procédure applicable en cas de découverte fortuite "
            "de vestiges lors de travaux : arrêt des opérations concernées, préservation du site, "
            "information de l'autorité compétente et conditions de reprise."
        ),
        preuves=[
            ("PROCEDURE", "Procédure de découverte fortuite",
             "Conduite à tenir, personnes à alerter et conditions de reprise.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La procédure doit prévoir arrêt, préservation et alerte",
             "MOYENNE", 0,
             {"elements": ["arrêt des travaux", "préservation du site",
                           "information de l'autorité compétente"]}),
        ],
    ),

    "D8-32": dict(
        intitule="Respect et valorisation des traditions culturelles locales",
        enonce=(
            "L'organisation doit pouvoir décrire les dispositions par lesquelles elle respecte les "
            "traditions culturelles des territoires où elle opère, et le cas échéant les actions "
            "par lesquelles elle contribue à leur valorisation."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des actions menées",
             "Comptes rendus, conventions, supports de communication.", False),
        ],
        regles=[],
    ),
}
