# -*- coding: utf-8 -*-
"""
Contenu métier SMARTEX_SUSTWAY, domaines D1 à D3.

Les critères de ce référentiel sont souvent rédigés à l'impératif
(« Diffuser… », « Promouvoir… »). Ils sont ici retournés en exigence
vérifiable : ce que l'organisation doit avoir, faire ou démontrer.

Deux précautions tenues d'un bout à l'autre. Aucune référence
réglementaire n'est fabriquée : là où le critère renvoie à la loi, l'exigence
dit « la législation applicable » sans citer de texte. Aucune certification
n'est présentée comme obligatoire : là où le critère parle de « viser » une
certification, l'exigence porte sur le déploiement du système de management,
et le certificat reste une preuve facultative.
"""

CONTENU = {

    # === D1 : Valeurs et principes éthiques ==============================

    "D1-01": dict(
        intitule="Code de conduite et d'éthique formalisé",
        enonce=(
            "L'organisation doit disposer d'un code de conduite et d'éthique écrit, énonçant les "
            "valeurs et principes qui régissent ses relations avec ses parties prenantes internes "
            "et externes, validé par sa direction et daté."
        ),
        preuves=[
            ("POLITIQUE", "Code de conduite et d'éthique",
             "Document daté et validé, couvrant les parties prenantes internes et externes.", True),
        ],
        regles=[
            ("R1", "SIGNATURE", "Le code doit être validé par la direction",
             "ELEVEE", 0, {"mention_attendue": "validation ou approbation par la direction"}),
            ("R2", "ELEMENT_ATTENDU", "Le code doit couvrir les parties prenantes internes et externes",
             "MOYENNE", 0, {"elements": ["valeurs et principes", "parties prenantes internes",
                                         "parties prenantes externes"]}),
        ],
    ),

    "D1-02": dict(
        intitule="Sensibilisation des salariés aux valeurs de l'entreprise",
        enonce=(
            "L'organisation doit porter ses valeurs et ses règles de conduite à la connaissance de "
            "ses salariés par des actions identifiables — accueil des nouveaux entrants, sessions "
            "de sensibilisation, diffusion interne — et en conserver la trace."
        ),
        preuves=[
            ("REGISTRE", "Trace des actions de sensibilisation menées",
             "Dates, formats et participants.", True),
            ("PREUVE_OPERATIONNELLE", "Supports de sensibilisation interne",
             "Livret d'accueil, affichage, supports de session.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Des actions doivent avoir été menées récemment",
             "MOYENNE", 0, {"champ": "date de la dernière action de sensibilisation"}),
        ],
    ),

    "D1-03": dict(
        intitule="Communication des valeurs aux parties prenantes externes",
        enonce=(
            "L'organisation doit communiquer ses valeurs à ses clients, partenaires, fournisseurs "
            "et autres parties intéressées, par des supports identifiables, et pouvoir en produire "
            "des exemples."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Supports de communication externe",
             "Site internet, plaquettes, présentations commerciales, courriers.", True),
        ],
        regles=[],
    ),

    "D1-04": dict(
        intitule="Redevabilité sur les impacts des décisions et activités",
        enonce=(
            "L'organisation doit rendre compte des impacts de ses décisions et de ses activités à "
            "son personnel et à ses autres parties prenantes, en couvrant au minimum les impacts "
            "environnementaux, économiques et sociaux ainsi que les risques de santé et de "
            "sécurité, selon une périodicité qu'elle définit."
        ),
        preuves=[
            ("RAPPORT", "Support de reddition de comptes",
             "Rapport, bilan ou communication couvrant les impacts de la période.", True),
            ("PROCEDURE", "Modalités de reddition de comptes",
             "Périodicité, destinataires et canaux retenus.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les catégories d'impact attendues doivent être traitées",
             "MOYENNE", 0,
             {"elements": ["impacts environnementaux", "impacts économiques", "impacts sociaux",
                           "risques de santé et de sécurité"]}),
        ],
    ),

    "D1-05": dict(
        intitule="Transparence sur les décisions à impact significatif",
        enonce=(
            "L'organisation doit communiquer des informations sur les décisions et activités ayant "
            "un impact significatif sur la société, l'économie ou l'environnement, et rendre ces "
            "informations accessibles aux parties prenantes concernées."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Informations publiées sur les décisions significatives",
             "Publications, communiqués, pages du site, rapports.", True),
        ],
        regles=[],
    ),

    "D1-06": dict(
        intitule="Cartographie des parties prenantes et de leurs attentes",
        enonce=(
            "L'organisation doit disposer d'une cartographie de ses parties prenantes identifiant, "
            "pour chacune, ses attentes et exigences, et pouvoir montrer comment ces attentes sont "
            "prises en compte dans ses décisions et activités."
        ),
        preuves=[
            ("RAPPORT", "Cartographie des parties prenantes",
             "Parties prenantes identifiées et attentes associées.", True),
            ("PROCEDURE", "Modalités de prise en compte des attentes",
             "Décrit comment les attentes remontent et sont traitées.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La cartographie doit associer des attentes aux parties prenantes",
             "MOYENNE", 0, {"elements": ["parties prenantes identifiées", "attentes et besoins associés"]}),
        ],
    ),

    "D1-07": dict(
        intitule="Dispositif de respect des droits humains",
        enonce=(
            "L'organisation doit disposer d'un dispositif interne — engagement écrit, "
            "responsabilité identifiée et modalités de signalement — assurant le respect des droits "
            "humains dans ses activités."
        ),
        preuves=[
            ("POLITIQUE", "Engagement écrit en matière de droits humains",
             "Document validé énonçant l'engagement de l'organisation.", True),
            ("PROCEDURE", "Modalités de signalement et de traitement",
             "Canal de signalement et responsabilité désignée.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le dispositif doit désigner une responsabilité et un canal",
             "MOYENNE", "exigence",
             {"elements": ["engagement écrit", "responsabilité désignée", "canal de signalement"]}),
        ],
    ),

    # === D2-S1 : Information financière et conseil d'administration ======

    "D2-08": dict(
        intitule="Diffusion des résultats financiers et non financiers",
        enonce=(
            "L'organisation doit diffuser ses résultats financiers et non financiers auprès des "
            "destinataires concernés, dans des conditions garantissant leur accessibilité, et "
            "pouvoir produire les documents diffusés."
        ),
        preuves=[
            ("RAPPORT", "États financiers ou rapport annuel diffusé",
             "Document du dernier exercice, tel que diffusé.", True),
            ("RAPPORT", "Information non financière diffusée",
             "Rapport extra-financier, bilan RSE ou équivalent.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Les documents doivent porter sur le dernier exercice clos",
             "MOYENNE", 0, {"champ": "exercice couvert", "anciennete_maximale_mois": 24}),
        ],
    ),

    "D2-09": dict(
        intitule="Respect des droits de propriété des associés",
        enonce=(
            "L'organisation doit respecter les droits attachés à la qualité d'associé ou "
            "d'actionnaire tels qu'ils résultent de ses statuts et de la législation applicable, "
            "notamment l'accès à l'information et la participation aux décisions relevant de leur "
            "compétence."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Statuts de l'organisation",
             "Document en vigueur définissant les droits des associés.", True),
            ("REGISTRE", "Procès-verbaux des assemblées",
             "Attestent de la convocation et de la tenue des assemblées.", False),
        ],
        regles=[],
    ),

    "D2-10": dict(
        intitule="Actionnariat salarié",
        enonce=(
            "L'organisation doit pouvoir décrire la place des salariés dans la structure de son "
            "capital et, le cas échéant, les dispositifs par lesquels elle favorise l'actionnariat "
            "salarié. En l'absence d'un tel dispositif, elle doit pouvoir l'indiquer explicitement."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Éléments sur la structure du capital",
             "Répartition du capital faisant apparaître la part détenue par les salariés.", True),
        ],
        regles=[],
    ),

    "D2-11": dict(
        intitule="Représentation des salariés au conseil d'administration",
        enonce=(
            "Lorsque l'organisation est dotée d'un conseil d'administration ou d'un organe "
            "équivalent, elle doit pouvoir indiquer si les salariés y sont représentés et selon "
            "quelles modalités."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Composition du conseil d'administration",
             "Document indiquant la qualité de chaque membre.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La composition doit permettre d'identifier les représentants salariés",
             "MOYENNE", 0, {"elements": ["composition de l'organe", "qualité des membres"]}),
        ],
    ),

    "D2-12": dict(
        intitule="Indépendance des administrateurs",
        enonce=(
            "Lorsque l'organisation est dotée d'un conseil d'administration ou d'un organe "
            "équivalent, elle doit pouvoir indiquer si certains de ses membres sont indépendants et "
            "sur quels critères cette indépendance est appréciée."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Composition du conseil et critères d'indépendance",
             "Document identifiant les membres indépendants et le critère retenu.", True),
        ],
        regles=[],
    ),

    "D2-13": dict(
        intitule="Comités spécialisés de contrôle",
        enonce=(
            "L'organisation doit pouvoir indiquer si des comités spécialisés de contrôle — audit, "
            "risques, rémunérations ou équivalents — existent auprès de son organe de gouvernance, "
            "et en préciser la composition et le mandat."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Acte constitutif ou règlement des comités",
             "Composition et mandat des comités existants.", True),
        ],
        regles=[],
    ),

    # === D2-S2 : Lutte contre la corruption ==============================

    "D2-14": dict(
        intitule="Politique formalisée de lutte contre la corruption",
        enonce=(
            "L'organisation doit disposer d'une politique écrite de lutte contre la corruption, "
            "établie en connaissance de la législation applicable dans les pays où elle opère, "
            "énonçant les comportements interdits et les conduites attendues."
        ),
        preuves=[
            ("POLITIQUE", "Politique de lutte contre la corruption",
             "Document daté et validé, énonçant interdits et conduites attendues.", True),
        ],
        regles=[
            ("R1", "SIGNATURE", "La politique doit être validée par la direction",
             "ELEVEE", 0, {"mention_attendue": "validation ou approbation par la direction"}),
            ("R2", "ELEMENT_ATTENDU", "La politique doit énoncer les comportements interdits",
             "ELEVEE", 0, {"elements": ["comportements interdits", "conduites attendues"]}),
        ],
    ),

    "D2-15": dict(
        intitule="Responsable de la conformité anti-corruption",
        enonce=(
            "L'organisation doit désigner une personne ou un comité chargé de veiller au respect "
            "des mesures anti-corruption, de la sensibilisation du personnel, de l'évaluation des "
            "risques de corruption et de la vigilance sur les projets associés à ses activités. "
            "La désignation doit être écrite et le périmètre de la mission précisé."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Acte de désignation du responsable ou du comité",
             "Note, décision ou lettre de mission précisant le périmètre.", True),
            ("REGISTRE", "Trace des actions menées",
             "Sensibilisations, évaluations de risques, vigilance sur les projets.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La mission doit couvrir les quatre volets attendus",
             "MOYENNE", 0,
             {"elements": ["supervision de la conformité", "sensibilisation du personnel",
                           "évaluation des risques de corruption", "vigilance sur les projets"]}),
        ],
    ),

    "D2-16": dict(
        intitule="Action contre toutes les formes de corruption",
        enonce=(
            "L'organisation doit prendre des mesures couvrant les différentes formes de corruption "
            "— publique et privée, active et passive, extorsion et paiements de facilitation — et "
            "pouvoir décrire les dispositifs de prévention et de détection qu'elle a mis en place."
        ),
        preuves=[
            ("PROCEDURE", "Dispositifs de prévention et de détection",
             "Contrôles, canal d'alerte, règles sur les cadeaux et paiements.", True),
            ("REGISTRE", "Registre des signalements et de leur traitement",
             "Trace des alertes reçues et des suites, éventuellement anonymisée.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les formes de corruption visées doivent être couvertes",
             "MOYENNE", 0,
             {"elements": ["corruption publique et privée", "corruption active et passive",
                           "extorsion et paiements de facilitation"]}),
        ],
    ),

    "D2-17": dict(
        intitule="Système de management anti-corruption",
        enonce=(
            "L'organisation doit déployer un système de management anti-corruption structuré — "
            "évaluation des risques, mesures de maîtrise, contrôle et amélioration. Le critère vise "
            "un système orienté vers la certification ISO 37001 : la certification effective n'est "
            "pas exigée, mais si elle a été obtenue, le certificat en atteste."
        ),
        preuves=[
            ("PROCEDURE", "Description du système de management anti-corruption",
             "Périmètre, évaluation des risques, mesures de maîtrise et contrôle.", True),
            ("CERTIFICAT", "Certificat ISO 37001",
             "Facultatif : atteste d'une certification effectivement obtenue.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
        ],
    ),

    # === D2-S3 : Discipline fiscale ======================================

    "D2-18": dict(
        intitule="Conformité fiscale et coopération avec les autorités",
        enonce=(
            "L'organisation doit se conformer aux obligations fiscales qui lui sont applicables et "
            "coopérer avec les autorités compétentes. Elle doit pouvoir justifier de la régularité "
            "de sa situation fiscale par une attestation ou tout document équivalent délivré par "
            "l'administration."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Attestation de régularité fiscale",
             "Document délivré par l'administration fiscale compétente.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "L'attestation doit être récente",
             "ELEVEE", 0, {"champ": "date de délivrance de l'attestation",
                           "anciennete_maximale_mois": 12}),
        ],
    ),

    # === D2-S4 : Droits de l'homme =======================================

    "D2-19": dict(
        intitule="Politiques de protection des droits des salariés",
        enonce=(
            "L'organisation doit disposer de politiques écrites protégeant les droits de ses "
            "salariés, et pouvoir indiquer dans quelle mesure ces exigences sont portées auprès de "
            "sa chaîne de valeur."
        ),
        preuves=[
            ("POLITIQUE", "Politiques de protection des droits des salariés",
             "Documents couvrant les droits protégés et leur portée.", True),
            ("DOCUMENT_LEGAL", "Clauses répercutées auprès des partenaires",
             "Clauses contractuelles ou charte fournisseurs.", False),
        ],
        regles=[],
    ),

    "D2-20": dict(
        intitule="Dialogue avec les acteurs des droits humains",
        enonce=(
            "L'organisation doit pouvoir décrire les échanges qu'elle entretient avec les "
            "autorités, les organisations syndicales, les ONG ou d'autres organismes sur les "
            "questions liées aux droits humains, et en conserver la trace."
        ),
        preuves=[
            ("REGISTRE", "Trace des échanges menés",
             "Dates, interlocuteurs et sujets abordés.", False),
        ],
        regles=[],
    ),

    "D2-21": dict(
        intitule="Prévention de la complicité dans les atteintes aux droits humains",
        enonce=(
            "L'organisation doit disposer d'un dispositif de vigilance lui permettant de s'assurer "
            "qu'elle ne contribue pas, directement ou par ses relations d'affaires, à des atteintes "
            "aux droits humains, et de traiter les situations portées à sa connaissance."
        ),
        preuves=[
            ("PROCEDURE", "Dispositif de vigilance sur les droits humains",
             "Critères d'examen des relations d'affaires et traitement des alertes.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Le dispositif doit couvrir les relations d'affaires",
             "MOYENNE", 0, {"elements": ["examen des relations d'affaires", "traitement des alertes"]}),
        ],
    ),

    # === D3-S1 : L'emploi ================================================

    "D3-22": dict(
        intitule="Respect de l'âge minimum d'admission à l'emploi",
        enonce=(
            "L'organisation doit connaître l'âge minimum d'admission à l'emploi fixé par la "
            "législation applicable et s'assurer qu'aucune personne n'ayant pas atteint cet âge "
            "n'est employée, au moyen d'une vérification documentée à l'embauche."
        ),
        preuves=[
            ("PROCEDURE", "Procédure de vérification de l'âge à l'embauche",
             "Pièces exigées et contrôle effectué.", True),
            ("POLITIQUE", "Engagement écrit relatif au travail des enfants",
             "Politique ou clause interdisant l'emploi en dessous de l'âge légal.", False),
        ],
        regles=[
            ("R1", "PRESENCE", "Un contrôle de l'âge à l'embauche doit être décrit",
             "ELEVEE", 0, {"elements": ["vérification de l'âge", "pièces justificatives exigées"]}),
        ],
    ),

    "D3-23": dict(
        intitule="Vigilance sur le travail des enfants chez les partenaires",
        enonce=(
            "L'organisation doit porter auprès de ses fournisseurs et sous-traitants l'exigence de "
            "ne pas employer d'enfants en dessous de l'âge légal, par une clause contractuelle, une "
            "charte ou une démarche équivalente dont elle conserve la trace."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Clause ou charte transmise aux partenaires",
             "Exemple de clause contractuelle ou de charte signée.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "L'exigence doit figurer dans le document transmis",
             "MOYENNE", 0, {"elements": ["interdiction du travail des enfants",
                                         "engagement du partenaire"]}),
        ],
    ),

    "D3-24": dict(
        intitule="Respect des règles applicables aux conditions d'emploi",
        enonce=(
            "L'organisation doit connaître et appliquer les règles issues de la législation en "
            "vigueur en matière de durée du travail, de rémunération minimale, de majoration des "
            "heures supplémentaires, de repos hebdomadaire, de jours fériés, de congés annuels "
            "payés et de congés parentaux, et pouvoir en justifier."
        ),
        preuves=[
            ("REGISTRE", "Éléments de suivi du temps de travail et des congés",
             "Registres, plannings ou extraits du système de gestion des temps.", True),
            ("DOCUMENT_LEGAL", "Bulletins de paie ou modèle de bulletin",
             "Permettent de vérifier rémunération et majorations appliquées.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les éléments attendus doivent être identifiables",
             "ELEVEE", "exigence",
             {"elements": ["durée du travail", "rémunération", "heures supplémentaires",
                           "repos hebdomadaire", "congés annuels payés"]}),
        ],
    ),

    "D3-25": dict(
        intitule="Politique formalisée d'égalité des chances",
        enonce=(
            "L'organisation doit disposer d'une politique écrite d'égalité des chances et de "
            "non-discrimination, couvrant au minimum le recrutement, la gestion des carrières, les "
            "conditions de rémunération et la promotion de la diversité et de la parité."
        ),
        preuves=[
            ("POLITIQUE", "Politique d'égalité des chances et de non-discrimination",
             "Document daté et validé, couvrant les processus RH concernés.", True),
            ("INDICATEUR", "Indicateurs de diversité ou de parité",
             "Répartition des effectifs, écarts constatés.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La politique doit couvrir les processus RH attendus",
             "MOYENNE", 0,
             {"elements": ["recrutement", "gestion des carrières", "conditions de rémunération",
                           "diversité et parité"]}),
        ],
    ),

    "D3-26": dict(
        intitule="Responsable de l'égalité des chances",
        enonce=(
            "L'organisation doit désigner une personne ou un comité chargé de veiller au respect "
            "des mesures d'égalité des chances et d'en superviser l'application, par une "
            "désignation écrite précisant le périmètre de la mission."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Acte de désignation",
             "Note, décision ou lettre de mission précisant le périmètre.", True),
        ],
        regles=[],
    ),

    "D3-27": dict(
        intitule="Emploi des personnes en situation de handicap",
        enonce=(
            "L'organisation doit pouvoir décrire les dispositions qu'elle prend en faveur de "
            "l'emploi des personnes en situation de handicap — recrutement, aménagement des postes, "
            "partenariats — ou, à défaut, exposer les raisons pour lesquelles aucune disposition "
            "n'a été prise."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des dispositions prises",
             "Conventions, aménagements réalisés, actions de recrutement.", False),
        ],
        regles=[],
    ),

    "D3-28": dict(
        intitule="Élimination du travail forcé",
        enonce=(
            "L'organisation doit avoir pris des mesures écartant toute forme de travail forcé ou "
            "obligatoire dans ses activités : engagement libre, liberté de quitter l'emploi, "
            "absence de rétention de documents d'identité ou de caution financière."
        ),
        preuves=[
            ("POLITIQUE", "Engagement écrit contre le travail forcé",
             "Politique ou clause contractuelle.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "Les garanties attendues doivent être identifiables",
             "ELEVEE", "exigence",
             {"elements": ["consentement libre", "liberté de quitter l'emploi",
                           "absence de rétention de documents d'identité"]}),
        ],
    ),

    "D3-29": dict(
        intitule="Audits sur le travail forcé dans la chaîne de valeur",
        enonce=(
            "L'organisation doit conduire, selon une périodicité qu'elle définit, des vérifications "
            "auprès de sa chaîne de valeur portant sur l'absence de travail forcé, et en conserver "
            "les rapports."
        ),
        preuves=[
            ("RAPPORT", "Rapports d'audit fournisseurs sur le travail forcé",
             "Périmètre audité, constats et suites données.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Les audits doivent être récents",
             "MOYENNE", 0, {"champ": "date du dernier audit"}),
        ],
    ),

    "D3-30": dict(
        intitule="Lutte contre la précarité de l'emploi",
        enonce=(
            "L'organisation doit pouvoir décrire les dispositions qu'elle prend pour limiter la "
            "précarité des emplois qu'elle propose — recours aux contrats durables, conditions de "
            "renouvellement, perspectives d'évolution — et les appuyer sur des éléments factuels "
            "tels que la répartition de ses effectifs par type de contrat."
        ),
        preuves=[
            ("INDICATEUR", "Répartition des effectifs par type de contrat",
             "Données sur au moins une période, permettant d'apprécier la structure d'emploi.", True),
        ],
        regles=[],
    ),

    "D3-31": dict(
        intitule="Promotion d'emplois décents",
        enonce=(
            "L'organisation doit pouvoir décrire les dispositions par lesquelles elle favorise des "
            "emplois décents — rémunération, protection sociale, conditions d'exercice, dialogue — "
            "et les appuyer sur des éléments vérifiables."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des dispositions prises",
             "Accords, notes internes, dispositifs de protection sociale.", False),
        ],
        regles=[],
    ),

    # === D3-S2 : La formation ============================================

    "D3-32": dict(
        intitule="Politique formalisée de formation",
        enonce=(
            "L'organisation doit disposer d'une politique de formation écrite et cohérente avec les "
            "postes occupés, identifiant les besoins de compétences, les formations prévues et les "
            "moyens qui leur sont consacrés."
        ),
        preuves=[
            ("POLITIQUE", "Politique ou plan de formation",
             "Besoins identifiés, formations prévues et moyens associés.", True),
            ("REGISTRE", "Registre des formations dispensées",
             "Dates, thèmes et participants.", False),
        ],
        regles=[
            ("R1", "COHERENCE_DECLARATION",
             "Les formations dispensées doivent correspondre au plan annoncé",
             "MOYENNE", "exigence",
             {"elements": ["formations prévues au plan", "formations effectivement dispensées"]}),
        ],
    ),

    "D3-33": dict(
        intitule="Responsable du déploiement des formations",
        enonce=(
            "L'organisation doit désigner une personne ou un comité chargé du déploiement de ses "
            "programmes de formation, par une désignation écrite précisant le périmètre de la "
            "mission."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Acte de désignation",
             "Note, décision ou lettre de mission.", True),
        ],
        regles=[],
    ),

    # === D3-S3 : Conditions de travail et de vie =========================

    "D3-34": dict(
        intitule="Santé, sécurité et hygiène sur le lieu de travail",
        enonce=(
            "L'organisation doit assurer des conditions de santé, de sécurité et d'hygiène "
            "adaptées aux risques de ses activités : évaluation des risques professionnels, mesures "
            "de prévention associées, équipements de protection et suivi des incidents."
        ),
        preuves=[
            ("RAPPORT", "Évaluation des risques professionnels",
             "Document identifiant les risques par poste et les mesures retenues.", True),
            ("REGISTRE", "Registre des incidents et accidents",
             "Trace des événements survenus et des suites données.", False),
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des moyens en place",
             "Équipements de protection, signalétique, installations sanitaires.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "L'évaluation doit associer risques et mesures de prévention",
             "ELEVEE", 0, {"elements": ["risques identifiés par poste", "mesures de prévention"]}),
            ("R2", "DATE_VALIDITE", "L'évaluation des risques doit être à jour",
             "ELEVEE", 0, {"champ": "date de dernière mise à jour de l'évaluation"}),
        ],
    ),

    "D3-35": dict(
        intitule="Amélioration de l'environnement de travail",
        enonce=(
            "L'organisation doit pouvoir décrire les actions engagées pour améliorer "
            "l'environnement de travail de ses collaborateurs — espaces de repos, restauration, "
            "vestiaires, aménagements — et en apporter des éléments factuels."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des aménagements réalisés",
             "Photographies, plans, notes internes, factures de travaux.", False),
        ],
        regles=[],
    ),

    "D3-36": dict(
        intitule="Système de management de la santé et de la sécurité au travail",
        enonce=(
            "L'organisation doit formaliser son engagement en matière de santé et de sécurité au "
            "travail par un système de management structuré — politique, évaluation des risques, "
            "programme d'action et revue. Le critère vise un système orienté vers une certification "
            "reconnue en santé et sécurité au travail : la certification effective n'est pas "
            "exigée, mais si elle a été obtenue, le certificat en atteste."
        ),
        preuves=[
            ("PROCEDURE", "Description du système de management santé-sécurité",
             "Politique, périmètre, programme d'action et revue.", True),
            ("CERTIFICAT", "Certificat de management santé-sécurité",
             "Facultatif : atteste d'une certification effectivement obtenue.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
        ],
    ),

    "D3-37": dict(
        intitule="Système de management des conditions de travail",
        enonce=(
            "L'organisation doit formaliser son engagement en faveur de conditions de travail "
            "décentes par un système de management structuré couvrant les pratiques sociales. Le "
            "critère vise un système orienté vers la certification SA 8000 : la certification "
            "effective n'est pas exigée, mais si elle a été obtenue, le certificat en atteste."
        ),
        preuves=[
            ("PROCEDURE", "Description du système de management des conditions de travail",
             "Politique sociale, périmètre et modalités de contrôle.", True),
            ("CERTIFICAT", "Certificat SA 8000",
             "Facultatif : atteste d'une certification effectivement obtenue.", False),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Le certificat produit doit être en cours de validité",
             "MOYENNE", 1, {"champ": "date de fin de validité du certificat"}),
        ],
    ),

    # === D3-S4 : Relations professionnelles ==============================

    "D3-38": dict(
        intitule="Renforcement du dialogue social",
        enonce=(
            "L'organisation doit disposer d'espaces de dialogue avec ses salariés ou leurs "
            "représentants, se réunissant selon une périodicité identifiable, et conserver la trace "
            "des échanges tenus."
        ),
        preuves=[
            ("REGISTRE", "Comptes rendus des instances de dialogue",
             "Dates, participants et sujets abordés.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Des réunions doivent avoir eu lieu récemment",
             "MOYENNE", 0, {"champ": "date de la dernière réunion"}),
        ],
    ),

    "D3-39": dict(
        intitule="Respect de la liberté d'association",
        enonce=(
            "L'organisation doit respecter la liberté de ses salariés de constituer des "
            "organisations représentatives et d'y adhérer, et ne prendre aucune mesure "
            "défavorable fondée sur l'exercice de cette liberté."
        ),
        preuves=[
            ("POLITIQUE", "Engagement écrit relatif à la liberté d'association",
             "Politique, accord ou clause du règlement intérieur.", True),
        ],
        regles=[],
    ),

    "D3-40": dict(
        intitule="Droit de négociation collective",
        enonce=(
            "L'organisation doit reconnaître le droit de négociation collective de ses salariés et "
            "en faciliter l'exercice, et pouvoir produire les accords conclus ou la trace des "
            "négociations menées."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Accords collectifs ou comptes rendus de négociation",
             "Documents attestant de négociations effectivement tenues.", True),
        ],
        regles=[],
    ),

    "D3-41": dict(
        intitule="Procédure d'examen des réclamations",
        enonce=(
            "L'organisation doit disposer d'une procédure écrite d'examen des réclamations "
            "individuelles et collectives, précisant les modalités de saisine, les délais de "
            "traitement et les voies de conciliation volontaire."
        ),
        preuves=[
            ("PROCEDURE", "Procédure d'examen des réclamations",
             "Saisine, délais, responsables et conciliation.", True),
            ("REGISTRE", "Registre des réclamations et de leur traitement",
             "Trace des saisines et des suites données.", False),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La procédure doit préciser saisine, délais et conciliation",
             "MOYENNE", 0,
             {"elements": ["modalités de saisine", "délai de traitement",
                           "mécanisme de conciliation"]}),
        ],
    ),

    "D3-42": dict(
        intitule="Moyens d'exercice des représentants du personnel",
        enonce=(
            "Lorsque des représentants du personnel existent, l'organisation doit leur donner les "
            "moyens d'exercer leurs fonctions — accès aux locaux, possibilité de se réunir, "
            "diffusion d'informations — et pouvoir décrire ces moyens."
        ),
        preuves=[
            ("PREUVE_OPERATIONNELLE", "Éléments attestant des moyens accordés",
             "Note interne, accord, mise à disposition de local ou de panneau.", True),
        ],
        regles=[],
    ),

    # === D3-S5 : Communautés et développement local ======================

    "D3-43": dict(
        intitule="Retombées positives pour les communautés d'implantation",
        enonce=(
            "L'organisation doit pouvoir décrire les retombées de ses activités pour les "
            "communautés où elle est implantée — emplois, formations, développement culturel ou "
            "éducatif, accès aux technologies — et les appuyer sur des éléments factuels."
        ),
        preuves=[
            ("RAPPORT", "Bilan des retombées locales",
             "Actions menées et effets constatés sur la période.", True),
            ("INDICATEUR", "Données chiffrées des retombées",
             "Recrutements locaux, montants engagés, bénéficiaires.", False),
        ],
        regles=[],
    ),

    "D3-44": dict(
        intitule="Dialogue avec les communautés locales sur les sujets sensibles",
        enonce=(
            "L'organisation doit disposer d'un canal de dialogue avec les communautés riveraines "
            "permettant de traiter les sujets controversés liés à ses activités, et conserver la "
            "trace des échanges et des suites données."
        ),
        preuves=[
            ("REGISTRE", "Trace des échanges avec les riverains",
             "Réclamations reçues, réunions tenues et suites données.", True),
        ],
        regles=[
            ("R1", "ELEMENT_ATTENDU", "La trace doit faire apparaître les suites données",
             "MOYENNE", 0, {"elements": ["sujets soulevés", "suites données"]}),
        ],
    ),

    "D3-45": dict(
        intitule="Soutien aux projets de la communauté locale",
        enonce=(
            "L'organisation doit pouvoir décrire les soutiens financiers ou matériels qu'elle "
            "apporte à des activités ou projets de la communauté locale, et en produire la trace."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Conventions de don, de mécénat ou de partenariat",
             "Documents attestant des soutiens accordés.", False),
        ],
        regles=[],
    ),

    "D3-46": dict(
        intitule="Acquittement régulier des impôts locaux",
        enonce=(
            "L'organisation doit s'acquitter des impôts et taxes locaux dont elle est redevable "
            "selon les échéances applicables, et pouvoir justifier de la régularité de sa "
            "situation."
        ),
        preuves=[
            ("DOCUMENT_LEGAL", "Justificatifs de paiement des impôts locaux",
             "Quittances, avis d'imposition acquittés ou attestation de régularité.", True),
        ],
        regles=[
            ("R1", "DATE_VALIDITE", "Les justificatifs doivent porter sur la période récente",
             "ELEVEE", 0, {"champ": "période couverte par le justificatif",
                           "anciennete_maximale_mois": 12}),
        ],
    ),
}
