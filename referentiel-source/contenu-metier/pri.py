# -*- coding: utf-8 -*-
"""
Contenu métier du référentiel PRI.

Ce référentiel s'adresse à des investisseurs : il porte sur des décisions
d'investissement, l'exercice de droits d'actionnaire et le dialogue avec des
sociétés investies. Les exigences le disent explicitement plutôt que de
prêter à toute organisation une activité d'investissement qu'elle n'a pas —
la portée reste celle du critère, sans invention.
"""

CONTENU = {

    # --- D1 : Intégration des enjeux ESG dans l'investissement -----------

    "D1-01": dict(
        intitule="Intégration de critères ESG dans les décisions d'investissement",
        enonce=(
            "L'organisation doit intégrer des critères environnementaux, sociaux et de gouvernance "
            "dans ses décisions d'investissement, et pouvoir montrer par quels éléments ces "
            "critères pèsent réellement sur la décision : critères retenus, moment de leur prise "
            "en compte et trace dans les dossiers d'investissement."
        ),
        preuves=[
            ("POLITIQUE", "Politique d'investissement responsable",
             "Document énonçant les critères ESG retenus et leur place dans la décision.", True),
            ("PROCEDURE", "Procédure d'instruction des dossiers d'investissement",
             "Décrit à quel stade les critères ESG interviennent.", False),
            ("RAPPORT", "Exemples de dossiers instruits avec analyse ESG",
             "Dossiers anonymisés montrant l'application effective des critères.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les trois dimensions ESG doivent être couvertes",
             "MOYENNE", "exigence",
             {"elements": ["critères environnementaux", "critères sociaux",
                           "critères de gouvernance"]}),
            ("R2", "COHERENCE_DECLARATION",
             "Les critères annoncés doivent se retrouver dans les dossiers instruits",
             "MOYENNE", "exigence",
             {"elements": ["critères ESG énoncés dans la politique",
                           "critères effectivement appliqués dans les dossiers"]}),
        ],
    ),

    "D1-14": dict(
        intitule="Méthodologie formalisée d'évaluation des risques ESG",
        enonce=(
            "L'organisation doit disposer d'une méthodologie écrite d'évaluation des risques et "
            "opportunités ESG, précisant les dimensions examinées, la façon dont elles sont "
            "appréciées et la manière dont le résultat est utilisé."
        ),
        preuves=[
            ("PROCEDURE", "Méthodologie d'évaluation des risques et opportunités ESG",
             "Dimensions examinées, mode d'appréciation et usage du résultat.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La méthodologie doit décrire son mode d'appréciation",
             "MOYENNE", 0,
             {"elements": ["dimensions examinées", "mode d'appréciation", "usage du résultat"]}),
        ],
    ),

    "D1-15": dict(
        intitule="Comparaison des projets sur leur performance ESG",
        enonce=(
            "Lorsque plusieurs projets d'investissement sont mis en concurrence, l'organisation "
            "doit les comparer sur leur performance ESG avant validation, et conserver la trace de "
            "cette comparaison."
        ),
        preuves=[
            ("RAPPORT", "Éléments de comparaison ESG entre projets",
             "Grilles, notes ou comptes rendus de comité montrant la comparaison.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "La comparaison doit précéder la validation du projet",
             "MOYENNE", 0, {"champ": "date de la comparaison"}),
        ],
    ),

    # --- D2 : Propriétaires actifs ---------------------------------------

    "D2-16": dict(
        intitule="Exercice des droits de vote au regard des enjeux ESG",
        enonce=(
            "Lorsque l'organisation détient des droits de vote dans des sociétés, elle doit les "
            "exercer en tenant compte des enjeux ESG, disposer de principes de vote écrits et "
            "conserver la trace des votes émis."
        ),
        preuves=[
            ("POLITIQUE", "Politique de vote",
             "Principes appliqués lors des votes, incluant les enjeux ESG.", True),
            ("REGISTRE", "Relevé des votes exercés",
             "Assemblées concernées, résolutions et sens du vote.", False),
        ],
        regles=[
            ("R1", "COHERENCE_DECLARATION",
             "Les votes émis doivent être cohérents avec la politique de vote",
             "MOYENNE", "exigence",
             {"elements": ["principes énoncés dans la politique de vote",
                           "sens des votes effectivement émis"]}),
        ],
    ),

    "D2-17": dict(
        intitule="Dialogue régulier avec les sociétés investies",
        enonce=(
            "L'organisation doit entretenir un dialogue régulier avec les sociétés dans lesquelles "
            "elle investit sur leurs pratiques ESG, et conserver la trace de ces échanges : "
            "interlocuteurs, sujets abordés et suites."
        ),
        preuves=[
            ("REGISTRE", "Trace des échanges avec les sociétés investies",
             "Dates, interlocuteurs, sujets ESG abordés et suites données.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les échanges doivent porter sur des sujets ESG identifiables",
             "MOYENNE", 0, {"elements": ["sujets ESG abordés", "dates des échanges", "suites données"]}),
        ],
    ),

    "D2-18": dict(
        intitule="Politique d'engagement actionnarial documentée",
        enonce=(
            "L'organisation doit disposer d'une politique d'engagement actionnarial écrite, "
            "précisant les situations dans lesquelles elle intervient auprès des sociétés "
            "investies, les moyens qu'elle mobilise et la façon dont elle rend compte de cet "
            "engagement."
        ),
        preuves=[
            ("POLITIQUE", "Politique d'engagement actionnarial",
             "Situations d'intervention, moyens mobilisés et reddition de comptes.", True),
        ],
        regles=[
            ("R1", "SIGNATURE", "La politique doit être validée par l'organe compétent",
             "MOYENNE", 0, {"mention_attendue": "validation par l'organe de gouvernance"}),
        ],
    ),

    # --- D3 : Divulgation des enjeux ESG ---------------------------------

    "D3-19": dict(
        intitule="Demande de publication ESG aux sociétés investies",
        enonce=(
            "L'organisation doit demander aux sociétés dans lesquelles elle investit de publier des "
            "informations ESG, et conserver la trace de ces demandes ainsi que des réponses "
            "obtenues."
        ),
        preuves=[
            ("REGISTRE", "Trace des demandes de publication adressées",
             "Sociétés sollicitées, informations demandées et réponses obtenues.", True),
        ],
        regles=[],
    ),

    "D3-20": dict(
        intitule="Vérification des données ESG publiées par un tiers",
        enonce=(
            "Lorsque l'organisation s'appuie sur des données ESG publiées, elle doit indiquer si "
            "ces données font l'objet d'une vérification par un tiers indépendant et, le cas "
            "échéant, en produire l'attestation."
        ),
        preuves=[
            ("CERTIFICAT", "Attestation ou rapport de vérification par un tiers",
             "Identifie le tiers, le périmètre vérifié et la conclusion.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "L'attestation doit identifier le tiers et le périmètre",
             "MOYENNE", 0,
             {"elements": ["identité du tiers vérificateur", "périmètre vérifié", "conclusion"]}),
            ("R2", "DATE_VALIDITE", "La vérification doit porter sur un exercice récent",
             "MOYENNE", 0, {"champ": "exercice couvert par la vérification"}),
        ],
    ),

    # --- D4 : Promotion des PRI dans l'industrie -------------------------

    "D4-22": dict(
        intitule="Promotion des PRI auprès des partenaires financiers",
        enonce=(
            "L'organisation doit pouvoir décrire les démarches par lesquelles elle encourage ses "
            "partenaires financiers à adopter les Principes pour l'investissement responsable, et "
            "en apporter des éléments factuels."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des démarches menées",
             "Courriers, présentations, comptes rendus de rencontres.", False),
        ],
        regles=[],
    ),

    "D4-23": dict(
        intitule="Participation à des initiatives collectives ESG",
        enonce=(
            "L'organisation doit pouvoir justifier de sa participation à des initiatives "
            "collectives ou associations professionnelles portant sur les enjeux ESG, en indiquant "
            "lesquelles et sous quelle forme."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Preuve d'adhésion ou de participation",
             "Attestation d'adhésion, convention ou compte rendu de participation.", True),
        ],
        regles=[],
    ),

    "D4-24": dict(
        intitule="Intégration des PRI dans les contrats et chartes",
        enonce=(
            "L'organisation doit intégrer une référence aux Principes pour l'investissement "
            "responsable dans ses contrats ou chartes de collaboration, et pouvoir en produire un "
            "exemple."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Contrat ou charte comportant la référence aux PRI",
             "Exemple de clause ou d'article intégrant les principes.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La référence aux PRI doit figurer dans le document",
             "MOYENNE", 0, {"elements": ["référence aux Principes pour l'investissement responsable"]}),
        ],
    ),

    # --- D5 : Travailler ensemble ----------------------------------------

    "D5-25": dict(
        intitule="Collaboration avec d'autres signataires des PRI",
        enonce=(
            "L'organisation doit pouvoir décrire les collaborations engagées avec d'autres "
            "signataires des PRI et l'objet de ces collaborations."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des collaborations",
             "Conventions, comptes rendus, publications communes.", False),
        ],
        regles=[],
    ),

    "D5-26": dict(
        intitule="Participation à des coalitions d'investisseurs",
        enonce=(
            "L'organisation doit pouvoir justifier de sa participation à des coalitions "
            "d'investisseurs constituées autour de thématiques ESG, en indiquant lesquelles et la "
            "nature de son engagement."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Preuve de participation à une coalition",
             "Adhésion, déclaration commune ou convention.", True),
        ],
        regles=[],
    ),

    "D5-27": dict(
        intitule="Projets communs de plaidoyer ou de recherche ESG",
        enonce=(
            "L'organisation doit pouvoir décrire les projets communs de plaidoyer ou de recherche "
            "ESG auxquels elle prend part, et en produire les livrables ou les traces."
        ),
        preuves=[
            ("RAPPORT", "Livrables des projets communs",
             "Publications, prises de position ou travaux de recherche.", False),
        ],
        regles=[],
    ),

    # --- D6 : Rendre compte ----------------------------------------------

    "D6-28": dict(
        intitule="Publication d'un rapport annuel ESG",
        enonce=(
            "L'organisation doit publier chaque année un rapport rendant compte de ses pratiques "
            "et de ses progrès en matière d'investissement responsable, et le rendre accessible à "
            "ses parties prenantes."
        ),
        preuves=[
            ("RAPPORT", "Rapport annuel ESG ou PRI",
             "Rapport publié couvrant le dernier exercice.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le rapport doit couvrir le dernier exercice clos",
             "ELEVEE", 0, {"champ": "exercice couvert par le rapport",
                           "anciennete_maximale_mois": 24}),
        ],
    ),

    "D6-29": dict(
        intitule="Mesure chiffrée des progrès",
        enonce=(
            "L'organisation doit suivre ses progrès ESG au moyen d'indicateurs chiffrés, "
            "comparables d'une période à l'autre, et publier ou conserver les valeurs constatées."
        ),
        preuves=[
            ("INDICATEUR", "Indicateurs ESG suivis",
             "Valeurs sur au moins deux périodes comparables.", True),
        ],
        regles=[
            ("R1", "PRESENCE", "Des valeurs chiffrées sur plusieurs périodes doivent être fournies",
             "MOYENNE", 0, {"elements": ["indicateurs chiffrés", "périodes comparables"]}),
        ],
    ),
}
