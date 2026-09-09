# -*- coding: utf-8 -*-
"""
Contenu métier SMARTEX_SUSTWAY, domaines D4 à D6.

Le domaine D4 est bâti sur un motif répété — suivi, objectifs de réduction,
système de management — décliné sur l'eau, l'énergie, les rejets
atmosphériques, les rejets liquides et les déchets. Les exigences suivent ce
motif tout en restant distinctes : mesurer n'est pas se fixer un objectif, et
se fixer un objectif n'est pas piloter un système. Les confondre reviendrait à
noter trois fois la même chose.
"""

CONTENU = {

    # === D4-S1 : Mesures d'ordre général =================================

    "D4-47": dict(
        intitule="Conformité environnementale réglementaire",
        enonce=(
            "L'organisation doit avoir identifié les dispositions législatives et réglementaires "
            "environnementales applicables à ses activités et pouvoir justifier des autorisations, "
            "déclarations ou contrôles qu'elles imposent."
        ),
        preuves=[
            ("REGISTRE", "Recensement des obligations environnementales applicables",
             "Liste des textes et obligations identifiés pour les activités exercées.", True),
            ("DOCUMENT_LEGAL", "Autorisations ou récépissés de déclaration",
             "Documents délivrés par les autorités compétentes.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Les autorisations produites doivent être en cours de validité",
             "ELEVEE", 1, {"champ": "date de fin de validité de l'autorisation"}),
        ],
    ),

    "D4-48": dict(
        intitule="Système interne de management de l'environnement",
        enonce=(
            "L'organisation doit disposer d'un système interne de management de l'environnement "
            "comportant des objectifs définis, des responsables désignés, des moyens affectés et un "
            "suivi des réalisations."
        ),
        preuves=[
            ("PROCEDURE", "Description du système de management environnemental",
             "Objectifs, responsables, moyens et modalités de suivi.", True),
            ("POLITIQUE", "Charte ou politique environnementale",
             "Document énonçant les engagements de l'organisation.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les quatre composantes attendues doivent être présentes",
             "MOYENNE", 0,
             {"elements": ["objectifs définis", "responsables désignés", "moyens affectés",
                           "suivi des réalisations"]}),
        ],
    ),

    "D4-49": dict(
        intitule="Sensibilisation du personnel à la responsabilité environnementale",
        enonce=(
            "L'organisation doit mener auprès de son personnel des actions de sensibilisation ou de "
            "formation portant sur les mesures de protection de l'environnement qui le concernent, "
            "et en conserver la trace."
        ),
        preuves=[
            ("REGISTRE", "Trace des actions de sensibilisation environnementale",
             "Dates, thèmes et participants.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Des actions doivent avoir été menées récemment",
             "MOYENNE", 0, {"champ": "date de la dernière action"}),
        ],
    ),

    "D4-50": dict(
        intitule="Système de management environnemental sur tous les sites",
        enonce=(
            "L'organisation doit déployer un système de management environnemental couvrant "
            "l'ensemble de ses sites. Le critère vise un système orienté vers la certification "
            "ISO 14001 : la certification effective n'est pas exigée, mais si elle a été obtenue, "
            "le certificat en atteste et son périmètre doit être vérifiable."
        ),
        preuves=[
            ("PROCEDURE", "Description du système et de son périmètre",
             "Sites couverts, processus et modalités de revue.", True),
            ("CERTIFICAT", "Certificat ISO 14001",
             "Facultatif : atteste d'une certification effectivement obtenue.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
            ("R2", "ELEMENT_ATTENDU", "Le périmètre couvert doit être identifiable",
             "MOYENNE", 1, {"elements": ["périmètre de certification", "sites couverts"]}),
        ],
    ),

    "D4-51": dict(
        intitule="Dispositifs d'intervention sur les impacts environnementaux",
        enonce=(
            "L'organisation doit disposer de moyens d'intervention adaptés aux impacts "
            "environnementaux que ses activités peuvent produire — confinement, dépollution, "
            "alerte — et pouvoir en décrire la mise en œuvre."
        ),
        preuves=[
            ("PROCEDURE", "Procédures d'intervention en cas d'incident environnemental",
             "Conduite à tenir, moyens disponibles et responsables.", True),
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des moyens disponibles",
             "Kits d'intervention, rétentions, équipements en place.", False),
        ],
        regles=[],
    ),

    "D4-52": dict(
        intitule="Études d'impact environnemental périodiques",
        enonce=(
            "L'organisation doit conduire des études d'impact environnemental selon une périodicité "
            "ou à l'occasion des évolutions qui le justifient, et en rendre les conclusions "
            "accessibles aux parties prenantes concernées."
        ),
        preuves=[
            ("RAPPORT", "Études d'impact environnemental réalisées",
             "Rapports datés, avec périmètre et conclusions.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'étude la plus récente doit être exploitable",
             "MOYENNE", 0, {"champ": "date de la dernière étude"}),
        ],
    ),

    "D4-53": dict(
        intitule="Approche de précaution face aux risques environnementaux",
        enonce=(
            "L'organisation doit pouvoir décrire la manière dont elle tient compte des incertitudes "
            "environnementales dans ses décisions — analyse préalable, mesures conservatoires, "
            "renoncement à certaines options — et illustrer cette approche par des cas concrets. "
            "Ce critère est principalement déclaratif : la preuve documentaire y est plus difficile "
            "que le constat d'une démarche."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments illustrant l'approche de précaution",
             "Comptes rendus de décision, analyses préalables, arbitrages documentés.", False),
        ],
        regles=[],
    ),

    "D4-54": dict(
        intitule="Prise en compte de l'impact environnemental des nouveaux produits",
        enonce=(
            "Lorsque l'organisation développe de nouveaux produits ou services, elle doit examiner "
            "leur impact environnemental potentiel — consommation d'énergie, recyclabilité, "
            "émissions — et conserver la trace de cet examen."
        ),
        preuves=[
            ("PROCEDURE", "Modalités de prise en compte de l'environnement en conception",
             "Critères examinés et moment de leur prise en compte.", True),
            ("RAPPORT", "Exemples d'analyses réalisées",
             "Analyses environnementales de produits ou services développés.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les critères environnementaux examinés doivent être identifiables",
             "MOYENNE", 0,
             {"elements": ["consommation d'énergie", "recyclabilité", "pollution ou émissions"]}),
        ],
    ),

    # === D4-S2 : Consommations d'eau =====================================

    "D4-55": dict(
        intitule="Suivi et contrôle des consommations d'eau",
        enonce=(
            "L'organisation doit suivre ses consommations d'eau par des relevés réguliers, "
            "conserver l'historique de ces relevés et être en mesure de détecter les écarts "
            "anormaux, notamment les fuites."
        ),
        preuves=[
            ("INDICATEUR", "Relevés de consommation d'eau",
             "Historique sur plusieurs périodes comparables.", True),
            ("PROCEDURE", "Modalités de relevé et de détection des écarts",
             "Fréquence des relevés et traitement des anomalies.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Un historique de consommation doit être fourni",
             "ELEVEE", 0, {"elements": ["relevés de consommation d'eau", "périodes couvertes"]}),
        ],
    ),

    "D4-56": dict(
        intitule="Objectifs de réduction de la consommation d'eau",
        enonce=(
            "L'organisation doit s'être fixé des objectifs de réduction de sa consommation d'eau, "
            "quantitatifs ou qualitatifs, formulés de manière vérifiable et rattachés à une "
            "échéance."
        ),
        preuves=[
            ("RAPPORT", "Objectifs de réduction de la consommation d'eau",
             "Objectifs retenus, échéance et point d'avancement.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "L'objectif doit être rattaché à une échéance",
             "MOYENNE", 0, {"elements": ["objectif de réduction", "échéance"]}),
            ("R2", "COHERENCE_DECLARATION",
             "L'avancement annoncé doit s'appuyer sur les relevés fournis",
             "MOYENNE", "exigence",
             {"elements": ["objectif annoncé", "évolution constatée des consommations"]}),
        ],
    ),

    "D4-57": dict(
        intitule="Système de management de la consommation d'eau",
        enonce=(
            "L'organisation doit disposer d'un dispositif organisé de gestion de sa consommation "
            "d'eau — responsabilités, moyens, revue périodique — qu'il fasse ou non l'objet d'une "
            "certification."
        ),
        preuves=[
            ("PROCEDURE", "Description du dispositif de gestion de l'eau",
             "Responsabilités, moyens et revue périodique.", True),
            ("CERTIFICAT", "Certificat éventuel",
             "Facultatif : le critère n'exige aucune certification.", False),
        ],
        regles=[],
    ),

    # === D4-S3 : Consommations d'énergie =================================

    "D4-58": dict(
        intitule="Suivi et contrôle de la consommation d'énergie",
        enonce=(
            "L'organisation doit suivre sa consommation d'énergie par des relevés réguliers, "
            "conserver l'historique de ces relevés et pouvoir en analyser l'évolution."
        ),
        preuves=[
            ("INDICATEUR", "Relevés de consommation d'énergie",
             "Historique sur plusieurs périodes comparables, par source si possible.", True),
            ("PROCEDURE", "Modalités de relevé et d'analyse",
             "Fréquence des relevés et traitement des écarts.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Un historique de consommation doit être fourni",
             "ELEVEE", 0, {"elements": ["relevés de consommation d'énergie", "périodes couvertes"]}),
        ],
    ),

    "D4-59": dict(
        intitule="Objectifs de réduction de la consommation d'énergie",
        enonce=(
            "L'organisation doit s'être fixé des objectifs de réduction de sa consommation "
            "d'énergie, quantitatifs ou qualitatifs, formulés de manière vérifiable et rattachés à "
            "une échéance."
        ),
        preuves=[
            ("RAPPORT", "Objectifs de réduction de la consommation d'énergie",
             "Objectifs retenus, échéance et point d'avancement.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "L'objectif doit être rattaché à une échéance",
             "MOYENNE", 0, {"elements": ["objectif de réduction", "échéance"]}),
        ],
    ),

    "D4-60": dict(
        intitule="Système de management de l'énergie",
        enonce=(
            "L'organisation doit disposer d'un dispositif organisé de gestion de sa consommation "
            "d'énergie — responsabilités, moyens, revue périodique — qu'il fasse ou non l'objet "
            "d'une certification. Lorsqu'une certification de management de l'énergie a été "
            "obtenue, le certificat en atteste."
        ),
        preuves=[
            ("PROCEDURE", "Description du dispositif de gestion de l'énergie",
             "Responsabilités, moyens et revue périodique.", True),
            ("CERTIFICAT", "Certificat de management de l'énergie",
             "Facultatif : le critère n'exige aucune certification.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
        ],
    ),

    "D4-61": dict(
        intitule="Recours aux énergies renouvelables",
        enonce=(
            "L'organisation doit pouvoir indiquer si elle recourt à des sources d'énergie "
            "renouvelables, dans quelle proportion et sous quelle forme — production propre, "
            "contrat de fourniture — et en apporter la justification."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Contrat de fourniture ou justificatif d'installation",
             "Contrat d'énergie renouvelable ou facture d'installation.", False),
            ("INDICATEUR", "Part des énergies renouvelables dans la consommation",
             "Donnée chiffrée sur la période.", False),
        ],
        regles=[],
    ),

    # === D4-S4 : Rejets atmosphériques ===================================

    "D4-62": dict(
        intitule="Suivi et contrôle des rejets atmosphériques",
        enonce=(
            "Lorsque les activités de l'organisation produisent des rejets atmosphériques, elle "
            "doit en assurer le suivi par des mesures ou des estimations documentées et en "
            "conserver l'historique."
        ),
        preuves=[
            ("INDICATEUR", "Relevés ou estimations des rejets atmosphériques",
             "Historique par source et par période.", True),
            ("RAPPORT", "Rapports de mesure ou de contrôle",
             "Contrôles réalisés, le cas échéant par un organisme extérieur.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Des données de rejets doivent être fournies",
             "MOYENNE", 0, {"elements": ["rejets atmosphériques", "périodes couvertes"]}),
        ],
    ),

    "D4-63": dict(
        intitule="Objectifs de réduction des rejets atmosphériques",
        enonce=(
            "L'organisation doit s'être fixé des objectifs de réduction de ses rejets "
            "atmosphériques, quantitatifs ou qualitatifs, rattachés à une échéance."
        ),
        preuves=[
            ("RAPPORT", "Objectifs de réduction des rejets atmosphériques",
             "Objectifs retenus, échéance et point d'avancement.", True),
        ],
        regles=[],
    ),

    "D4-64": dict(
        intitule="Système de management des rejets atmosphériques",
        enonce=(
            "L'organisation doit disposer d'un dispositif organisé de gestion de ses rejets "
            "atmosphériques — responsabilités, moyens de maîtrise, revue périodique — qu'il fasse "
            "ou non l'objet d'une certification."
        ),
        preuves=[
            ("PROCEDURE", "Description du dispositif de gestion des rejets atmosphériques",
             "Responsabilités, moyens de maîtrise et revue.", True),
        ],
        regles=[],
    ),

    # === D4-S5 : Rejets liquides =========================================

    "D4-65": dict(
        intitule="Suivi et contrôle des rejets liquides",
        enonce=(
            "Lorsque les activités de l'organisation produisent des rejets liquides, elle doit en "
            "assurer le suivi par des mesures ou des analyses documentées et en conserver "
            "l'historique."
        ),
        preuves=[
            ("INDICATEUR", "Relevés ou analyses des rejets liquides",
             "Historique par point de rejet et par période.", True),
            ("RAPPORT", "Rapports d'analyse",
             "Analyses réalisées, le cas échéant par un laboratoire extérieur.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Des données de rejets doivent être fournies",
             "MOYENNE", 0, {"elements": ["rejets liquides", "périodes couvertes"]}),
        ],
    ),

    "D4-66": dict(
        intitule="Objectifs de réduction des rejets liquides",
        enonce=(
            "L'organisation doit s'être fixé des objectifs de réduction de ses rejets liquides, "
            "quantitatifs ou qualitatifs, rattachés à une échéance."
        ),
        preuves=[
            ("RAPPORT", "Objectifs de réduction des rejets liquides",
             "Objectifs retenus, échéance et point d'avancement.", True),
        ],
        regles=[],
    ),

    "D4-67": dict(
        intitule="Système de management des rejets liquides",
        enonce=(
            "L'organisation doit disposer d'un dispositif organisé de gestion de ses rejets "
            "liquides — responsabilités, moyens de maîtrise, revue périodique — qu'il fasse ou non "
            "l'objet d'une certification."
        ),
        preuves=[
            ("PROCEDURE", "Description du dispositif de gestion des rejets liquides",
             "Responsabilités, moyens de maîtrise et revue.", True),
        ],
        regles=[],
    ),

    # === D4-S6 : Déchets solides =========================================

    "D4-68": dict(
        intitule="Suivi et contrôle des déchets solides",
        enonce=(
            "L'organisation doit suivre ses déchets solides par flux — quantités produites, "
            "destinations, prestataires — et conserver la trace des enlèvements réalisés."
        ),
        preuves=[
            ("REGISTRE", "Registre de suivi des déchets",
             "Quantités par flux, dates d'enlèvement et destinations.", True),
            ("DOCUMENT_LEGAL", "Bordereaux ou attestations de prise en charge",
             "Documents remis par les prestataires de collecte.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le registre doit identifier flux, quantités et destinations",
             "MOYENNE", 0, {"elements": ["flux de déchets", "quantités", "destinations"]}),
        ],
    ),

    "D4-69": dict(
        intitule="Objectifs de réduction des déchets solides",
        enonce=(
            "L'organisation doit s'être fixé des objectifs de réduction de ses déchets solides, "
            "quantitatifs ou qualitatifs, rattachés à une échéance."
        ),
        preuves=[
            ("RAPPORT", "Objectifs de réduction des déchets",
             "Objectifs retenus, échéance et point d'avancement.", True),
        ],
        regles=[],
    ),

    "D4-70": dict(
        intitule="Système de management des déchets solides",
        enonce=(
            "L'organisation doit disposer d'un dispositif organisé de gestion de ses déchets — "
            "responsabilités, tri, filières retenues, revue périodique — qu'il fasse ou non l'objet "
            "d'une certification."
        ),
        preuves=[
            ("PROCEDURE", "Description du dispositif de gestion des déchets",
             "Responsabilités, tri, filières et revue.", True),
        ],
        regles=[],
    ),

    # === D5-S1 : Relations avec les clients ==============================

    "D5-71": dict(
        intitule="Protection des données et de la vie privée des clients",
        enonce=(
            "L'organisation doit disposer de dispositions écrites encadrant la collecte, "
            "l'utilisation, la conservation et la sécurité des données personnelles de ses clients, "
            "conformes aux règles applicables là où elle opère."
        ),
        preuves=[
            ("POLITIQUE", "Politique de protection des données personnelles",
             "Finalités, durées de conservation, droits des personnes et sécurité.", True),
            ("PROCEDURE", "Mesures de sécurité des données",
             "Contrôles d'accès, sauvegardes, gestion des incidents.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La politique doit couvrir les éléments attendus",
             "MOYENNE", 0,
             {"elements": ["finalités de la collecte", "durée de conservation",
                           "droits des personnes", "mesures de sécurité"]}),
        ],
    ),

    "D5-72": dict(
        intitule="Information des clients sur les produits et services",
        enonce=(
            "L'organisation doit fournir à ses clients les informations nécessaires pour choisir en "
            "connaissance de cause — caractéristiques, conditions d'usage, précautions, prix — par "
            "des supports identifiables."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Supports d'information client",
             "Notices, fiches produit, conditions générales, étiquetage.", True),
        ],
        regles=[],
    ),

    "D5-73": dict(
        intitule="Sécurité et santé des clients dans l'usage des produits",
        enonce=(
            "L'organisation doit avoir identifié les risques pour la sécurité et la santé liés à "
            "l'usage de ses produits ou services et pris les mesures correspondantes — avertissements, "
            "consignes d'usage, dispositifs de rappel."
        ),
        preuves=[
            ("PROCEDURE", "Mesures de sécurité pour les utilisateurs",
             "Avertissements, consignes d'usage, procédure de rappel.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les mesures attendues doivent être identifiables",
             "MOYENNE", 0, {"elements": ["risques identifiés", "avertissements ou consignes",
                                         "procédure de rappel"]}),
        ],
    ),

    "D5-74": dict(
        intitule="Qualité des biens et services comme objectif central",
        enonce=(
            "L'organisation doit avoir formalisé un objectif de qualité de ses biens ou services, "
            "assorti de modalités de contrôle et d'un traitement des non-conformités constatées."
        ),
        preuves=[
            ("POLITIQUE", "Politique ou engagement qualité",
             "Objectifs de qualité retenus et responsabilités.", True),
            ("REGISTRE", "Suivi des non-conformités et réclamations",
             "Trace des écarts constatés et des suites données.", False),
        ],
        regles=[],
    ),

    "D5-75": dict(
        intitule="Promotion d'une consommation responsable",
        enonce=(
            "L'organisation doit pouvoir décrire les actions par lesquelles elle informe ou "
            "sensibilise ses consommateurs à une consommation responsable, et en produire les "
            "supports."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Supports de sensibilisation des consommateurs",
             "Campagnes, mentions sur les produits, contenus pédagogiques.", False),
        ],
        regles=[],
    ),

    "D5-76": dict(
        intitule="Service après-vente et traitement des réclamations",
        enonce=(
            "L'organisation doit disposer d'un dispositif de traitement des réclamations et litiges "
            "de ses clients, dont les modalités de saisine et les délais de réponse sont portés à "
            "leur connaissance."
        ),
        preuves=[
            ("PROCEDURE", "Procédure de traitement des réclamations clients",
             "Modalités de saisine, délais et responsables.", True),
            ("REGISTRE", "Registre des réclamations et de leur traitement",
             "Trace des saisines et des suites données.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La procédure doit préciser saisine et délais",
             "MOYENNE", 0, {"elements": ["modalités de saisine", "délai de réponse"]}),
        ],
    ),

    "D5-77": dict(
        intitule="Études de satisfaction client",
        enonce=(
            "L'organisation doit mesurer la satisfaction de ses clients selon une périodicité "
            "qu'elle définit, et conserver les résultats obtenus ainsi que les suites données."
        ),
        preuves=[
            ("RAPPORT", "Résultats des enquêtes de satisfaction",
             "Méthode, période, résultats et suites données.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'enquête la plus récente doit être exploitable",
             "MOYENNE", 0, {"champ": "date de la dernière enquête"}),
        ],
    ),

    "D5-78": dict(
        intitule="Système de management de la qualité",
        enonce=(
            "L'organisation doit déployer un système de management de la qualité structuré — "
            "processus identifiés, contrôles, traitement des non-conformités, revue. Le critère "
            "vise un système orienté vers la certification ISO 9001 : la certification effective "
            "n'est pas exigée, mais si elle a été obtenue, le certificat en atteste."
        ),
        preuves=[
            ("PROCEDURE", "Description du système de management de la qualité",
             "Processus, contrôles, non-conformités et revue.", True),
            ("CERTIFICAT", "Certificat ISO 9001",
             "Facultatif : atteste d'une certification effectivement obtenue.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
        ],
    ),

    # === D5-S2 : La concurrence ==========================================

    "D5-79": dict(
        intitule="Respect des règles de concurrence du secteur",
        enonce=(
            "L'organisation doit avoir identifié les règles de concurrence applicables à son "
            "secteur et disposer de dispositions internes écartant les pratiques déloyales — "
            "ententes, dénigrement, usage abusif d'informations confidentielles."
        ),
        preuves=[
            ("POLITIQUE", "Dispositions internes en matière de concurrence",
             "Règles de conduite commerciale et pratiques interdites.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les pratiques interdites doivent être énoncées",
             "MOYENNE", 0, {"elements": ["pratiques commerciales interdites",
                                         "conduites attendues des commerciaux"]}),
        ],
    ),

    # === D5-S3 : Fournisseurs et sous-traitants ==========================

    "D5-80": dict(
        intitule="Sensibilisation des fournisseurs aux impacts environnementaux",
        enonce=(
            "L'organisation doit porter auprès de ses fournisseurs et sous-traitants l'attente "
            "qu'ils identifient et réduisent les principaux impacts environnementaux de leurs "
            "activités, et conserver la trace de cette démarche."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Trace de la démarche auprès des fournisseurs",
             "Charte transmise, questionnaire, réunion ou courrier.", True),
        ],
        regles=[],
    ),

    "D5-81": dict(
        intitule="Sensibilisation des fournisseurs aux impacts sociaux",
        enonce=(
            "L'organisation doit porter auprès de ses fournisseurs et sous-traitants l'attente "
            "qu'ils identifient et réduisent les principaux impacts sociaux de leurs activités, et "
            "conserver la trace de cette démarche."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Trace de la démarche auprès des fournisseurs",
             "Charte transmise, questionnaire, réunion ou courrier.", True),
        ],
        regles=[],
    ),

    "D5-82": dict(
        intitule="Analyse des offres en coût total",
        enonce=(
            "L'organisation doit analyser les offres de ses fournisseurs et sous-traitants au-delà "
            "du seul prix d'achat, en prenant en compte les autres composantes du coût — logistique, "
            "usage, après-vente, durée de vie — et conserver la trace de cette analyse."
        ),
        preuves=[
            ("PROCEDURE", "Méthode d'analyse des offres",
             "Critères d'attribution et composantes de coût prises en compte.", True),
            ("RAPPORT", "Exemples d'analyses comparatives réalisées",
             "Grilles de comparaison ou rapports de sélection.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les composantes du coût total doivent être identifiables",
             "MOYENNE", 0,
             {"elements": ["prix d'acquisition", "coûts logistiques", "coûts après-vente"]}),
        ],
    ),

    "D5-83": dict(
        intitule="Critères sociaux et environnementaux dans les achats",
        enonce=(
            "L'organisation doit intégrer des critères sociaux et environnementaux dans son "
            "processus d'achat, et pouvoir montrer où ces critères interviennent dans la sélection "
            "des fournisseurs."
        ),
        preuves=[
            ("PROCEDURE", "Processus d'achat intégrant des critères ESG",
             "Critères retenus et stade auquel ils interviennent.", True),
        ],
        regles=[],
    ),

    "D5-84": dict(
        intitule="Politique d'achats responsables formalisée",
        enonce=(
            "L'organisation doit disposer d'une politique d'achats responsables écrite, fondée sur "
            "des principes environnementaux, sociaux, de gouvernance et d'éthique, validée et "
            "portée à la connaissance des acteurs concernés."
        ),
        preuves=[
            ("POLITIQUE", "Politique d'achats responsables",
             "Principes retenus, périmètre et responsabilités.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les quatre familles de principes doivent être couvertes",
             "MOYENNE", 0,
             {"elements": ["principes environnementaux", "principes sociaux",
                           "principes de gouvernance", "principes éthiques"]}),
        ],
    ),

    "D5-85": dict(
        intitule="Formation des acteurs de la chaîne d'approvisionnement",
        enonce=(
            "L'organisation doit former ou sensibiliser les acteurs internes de sa chaîne "
            "d'approvisionnement — achats, logistique, comptabilité fournisseurs, qualité — à sa "
            "politique d'achats responsables, et en conserver la trace."
        ),
        preuves=[
            ("REGISTRE", "Trace des actions de formation ou de sensibilisation",
             "Dates, thèmes et participants par fonction.", True),
        ],
        regles=[],
    ),

    "D5-86": dict(
        intitule="Système de management des achats responsables",
        enonce=(
            "L'organisation doit structurer sa démarche d'achats responsables — responsabilités, "
            "critères, évaluation des fournisseurs, revue. Le critère vise un système orienté vers "
            "les lignes directrices ISO 20400 : aucune certification n'est exigée, ces lignes "
            "directrices n'étant pas une norme certifiable."
        ),
        preuves=[
            ("PROCEDURE", "Description de la démarche d'achats responsables",
             "Responsabilités, critères, évaluation et revue.", True),
        ],
        regles=[],
    ),

    "D5-87": dict(
        intitule="Association des fournisseurs à la politique d'achats responsables",
        enonce=(
            "L'organisation doit associer ses fournisseurs et sous-traitants à sa politique "
            "d'achats responsables, par une charte, une clause contractuelle ou un engagement "
            "équivalent dont elle conserve la trace."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Charte fournisseurs ou clause contractuelle",
             "Document transmis et, si possible, retourné signé.", True),
        ],
        regles=[
            ("R1", "SIGNATURE", "L'engagement du fournisseur doit être matérialisé",
             "MOYENNE", 0, {"mention_attendue": "engagement ou signature du fournisseur"}),
        ],
    ),

    "D5-88": dict(
        intitule="Audits des fournisseurs au regard des exigences RSE",
        enonce=(
            "L'organisation doit conduire des audits ou évaluations de ses fournisseurs et "
            "sous-traitants au regard de ses exigences RSE, selon une périodicité ou des critères "
            "de sélection qu'elle définit, et en conserver les rapports."
        ),
        preuves=[
            ("RAPPORT", "Rapports d'audit ou d'évaluation fournisseurs",
             "Périmètre, constats et suites données.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Les audits doivent être récents",
             "MOYENNE", 0, {"champ": "date du dernier audit fournisseur"}),
        ],
    ),

    "D5-90": dict(
        intitule="Enquêtes de satisfaction des fournisseurs",
        enonce=(
            "L'organisation doit recueillir l'appréciation de ses fournisseurs et sous-traitants "
            "sur la relation d'affaires — équité financière, qualité des échanges, gestion des "
            "litiges — et conserver les résultats obtenus."
        ),
        preuves=[
            ("RAPPORT", "Résultats des enquêtes fournisseurs",
             "Méthode, période, résultats et suites données.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les thèmes attendus doivent être couverts",
             "MOYENNE", 0,
             {"elements": ["équité financière", "qualité des échanges", "gestion des litiges"]}),
        ],
    ),

    # === D6 : Prise en charge organisationnelle de la RSE ================

    "D6-91": dict(
        intitule="Équipe dédiée à la RSE",
        enonce=(
            "L'organisation doit avoir désigné une personne ou une équipe en charge de la RSE, "
            "quelles que soient les dimensions couvertes, par une désignation écrite précisant le "
            "périmètre de la mission et les moyens affectés."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Acte de désignation de l'équipe RSE",
             "Note, décision ou organigramme précisant le périmètre.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La désignation doit préciser le périmètre de la mission",
             "MOYENNE", 0, {"elements": ["personne ou équipe désignée", "périmètre de la mission"]}),
        ],
    ),

    "D6-92": dict(
        intitule="Publication annuelle d'un rapport RSE",
        enonce=(
            "L'organisation doit publier chaque année un rapport rendant compte de ses pratiques et "
            "de ses résultats en matière de RSE, de performance ESG ou de développement durable."
        ),
        preuves=[
            ("RAPPORT", "Rapport RSE ou de développement durable",
             "Rapport publié couvrant le dernier exercice.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le rapport doit couvrir le dernier exercice clos",
             "ELEVEE", 0, {"champ": "exercice couvert par le rapport",
                           "anciennete_maximale_mois": 24}),
        ],
    ),

    "D6-93": dict(
        intitule="Accessibilité publique du rapport RSE",
        enonce=(
            "Le rapport RSE publié par l'organisation doit être accessible à toute personne "
            "souhaitant en prendre connaissance, par un canal public identifiable, et "
            "l'organisation doit pouvoir indiquer lequel."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Élément attestant de l'accessibilité du rapport",
             "Adresse de publication, capture de la page, mise à disposition sur demande.", True),
        ],
        regles=[
            ("R1", "COHERENCE_DECLARATION",
             "Le canal annoncé doit correspondre au rapport effectivement publié",
             "MOYENNE", "exigence",
             {"elements": ["canal de publication annoncé", "rapport effectivement accessible"]}),
        ],
    ),
}
