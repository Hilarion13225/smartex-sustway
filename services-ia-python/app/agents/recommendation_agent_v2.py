"""
Recommendation Agent V2 — nommer la pièce exacte, sans inventer l'exigence.

Le V1 avait une consigne impossible à tenir : « jamais un conseil générique »,
alors qu'il ne recevait ni exigence, ni preuve attendue, ni règle. On lui
demandait d'être spécifique en le privant de ce qui rend spécifique. Il s'en
sortait par déduction depuis le résumé et la justification d'Evidence — et
s'en sortait souvent bien, mais rien dans son contexte ne le lui permettait.

Le V2 lui donne le catalogue **entier**, exigences comprises — contrairement à
Risk. La différence est délibérée : Risk ne doit pas rejuger le fond, et
l'énoncé des exigences l'y inviterait ; Recommendation, lui, doit nommer
l'attendu, et c'est précisément sa fonction.

C'est aussi l'agent où l'enrichissement présente le moins de risque : il ne
note pas, ne conclut pas sur la conformité, n'alimente aucun calcul. Sa sortie
est lue par un humain qui doit savoir **quoi produire**.

Le risque qui reste est d'une autre nature : donner le catalogue à un agent
dont le métier est de proposer des actions l'expose à extrapoler au-delà —
recommander une certification, un audit externe, un dispositif que le
référentiel ne demande pas. Le résultat serait crédible et faux, et un
auditeur pourrait le transmettre au client. D'où l'invariant central :

    Toute action se rattache à une exigence, une preuve attendue ou une règle
    effectivement transmise. Le rattachement rend la contrainte VÉRIFIABLE au
    lieu d'être seulement demandée.

Une nuance qui vaut d'être tenue : un point NON_VERIFIABLE n'appelle pas une
action corrective mais une pièce lisible. Recommander « mettre en place une
validation » sur un scan illisible reprocherait à l'organisation une lacune
qui n'est peut-être pas la sienne.

Le V1 (`recommendation_agent.py`) n'est pas touché.
"""

from __future__ import annotations

import logging
import time

from pydantic import BaseModel, Field

from app.services.appel_gemini import appeler_gemini
from app.models.contrat_v2 import (
    ActionRecommandee,
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    Organisation,
    Rattachement,
    ResultatEvidenceV2,
    ResultatRecommandationV2,
    ResultatRisqueV2,
    Situation,
    verifier_rattachements,
)
from app.services.gemini_client import get_client
from app.services.schema_gemini import schema_pour_gemini

logger = logging.getLogger(__name__)


class RecommendationAgentRequestV2(BaseModel):
    """
    Le contexte complet — décision 8, option D.

    `catalogue` est ici le catalogue entier, exigences comprises : nommer
    l'attendu est la fonction de cet agent. C'est la seule différence de
    périmètre avec Risk, et elle est voulue.

    Comme partout en V2, le contenu documentaire ne peut pas arriver :
    `AnalyseDocumentV2` n'a aucun champ de contenu.
    """

    critere: Critere
    situation: Situation | None = None
    organisation: Organisation | None = None
    catalogue: Catalogue = Field(default_factory=Catalogue)
    declaration: Declaration | None = None
    analyses_documents: list[AnalyseDocumentV2] = Field(default_factory=list)
    resultat_evidence: ResultatEvidenceV2
    # Absent quand la formule ne déclenche pas l'agent de risque.
    resultat_risque: ResultatRisqueV2 | None = None


# === Schéma soumis au modèle ==============================================


class _ActionModele(BaseModel):
    """Une action, et ce qu'elle vient combler."""

    action: str = Field(
        description="Action concrète et réalisable, en une phrase, en français."
    )
    rattachement_niveau: str = Field(
        description="EXIGENCE, PREUVE_ATTENDUE ou REGLE — ce que cette action vient combler."
    )
    rattachement_reference: str = Field(
        description="La référence exacte, telle qu'elle apparaît dans le contexte fourni."
    )


class _ResultatModele(BaseModel):
    """Sortie brute attendue de Gemini."""

    recommandation_necessaire: bool = Field(
        description="Y a-t-il quelque chose d'utile à recommander ?"
    )
    pistes_amelioration: str = Field(
        default="",
        description=(
            "2 à 4 phrases d'actions concrètes, en français. Vide si aucune "
            "recommandation n'a lieu d'être."
        ),
    )
    actions: list[_ActionModele] = Field(
        default_factory=list,
        description="Les mêmes actions, structurées et rattachées au référentiel.",
    )


# === Composition du prompt ================================================


def _formater_exigences(catalogue: Catalogue) -> str:
    """Ce que le référentiel demande — que seul cet agent reçoit, avec Evidence."""
    if not catalogue.exigences:
        return "(aucune exigence rédigée pour ce critère)"
    return "\n".join(
        f"- [{e.code}] {e.intitule} : {e.enonce}" for e in catalogue.exigences
    )


def _formater_attentes(catalogue: Catalogue) -> str:
    if not catalogue.preuves_attendues:
        return "(aucune pièce attendue n'est décrite pour ce critère)"
    lignes = []
    for preuve in catalogue.preuves_attendues:
        caractere = "obligatoire" if preuve.obligatoire else "facultative"
        lignes.append(
            f"- [{preuve.reference}] {preuve.libelle} "
            f"({preuve.type}, {caractere}, exigence {preuve.exigence_code})"
        )
        if preuve.description:
            lignes.append(f"    Recevabilité : {preuve.description}")
    return "\n".join(lignes)


def _formater_regles(catalogue: Catalogue) -> str:
    if not catalogue.regles_analyse:
        return "(aucune règle d'analyse n'est définie pour ce critère)"
    lignes = []
    for regle in catalogue.regles_analyse:
        if regle.portee.niveau == "PREUVE_ATTENDUE":
            portee = f"la pièce attendue [{regle.portee.reference}]"
        elif regle.portee.niveau == "EXIGENCE":
            portee = f"l'exigence [{regle.portee.reference}]"
        else:
            portee = "le critère dans son ensemble"
        details = ""
        definition = regle.definition if isinstance(regle.definition, dict) else {}
        elements = definition.get("elements")
        if elements:
            details = " Éléments attendus : " + ", ".join(str(e) for e in elements) + "."
        mention = definition.get("mention_attendue")
        if mention:
            details += f" Mention attendue : {mention}."
        lignes.append(
            f"- [{regle.code}, sévérité {regle.severite}] {regle.libelle} "
            f"— porte sur {portee}.{details}"
        )
    return "\n".join(lignes)


def _formater_evidence(resultat: ResultatEvidenceV2) -> str:
    lignes = [
        f"Probabilité de conformité : {resultat.probabilite_conformite:.2f} "
        f"(confiance {resultat.confiance:.2f})",
        f"Justification : {resultat.justification_conformite}",
        "",
        "Détail attente par attente :",
    ]
    if not resultat.evaluations:
        lignes.append("(aucune attente n'a été évaluée)")
    for evaluation in resultat.evaluations:
        lignes.append(f"- [{evaluation.reference}] couverture {evaluation.couverture}")
        for observe in evaluation.elements_observes:
            lignes.append(f"    déjà en place : {observe}")
        for manquant in evaluation.elements_manquants:
            lignes.append(f"    à produire : {manquant}")
        for non_verifiable in evaluation.elements_non_verifiables:
            lignes.append(f"    non vérifiable : {non_verifiable}")
        if evaluation.conflit:
            lignes.append(f"    CONFLIT ENTRE PIÈCES : {evaluation.conflit}")
    return "\n".join(lignes)


def _formater_risque(resultat: ResultatRisqueV2 | None) -> str:
    """
    Les signaux de risque, quand ils existent.

    Ils changent la nature de l'action : un signal PREUVE_GENERIQUE conduit à
    « personnaliser le document » là où son absence conduit à « fournir le
    document ».
    """
    if resultat is None:
        return "(aucune analyse de risque n'a été réalisée sur ce critère)"
    if not resultat.signal_risque:
        return "Aucun signal de risque n'a été détecté."
    lignes = [f"Signal principal : {resultat.categorie} — {resultat.justification}"]
    for signal in resultat.signaux:
        cible = f" sur [{signal.rattachement.reference}]" if signal.rattachement else ""
        lignes.append(f"- {signal.categorie}{cible} : {signal.justification}")
    return "\n".join(lignes)


def _formater_constats(analyses: list[AnalyseDocumentV2]) -> str:
    if not analyses:
        return "(aucune pièce n'a été déposée sur ce critère)"
    lignes = []
    for analyse in analyses:
        lignes.append(f"Pièce [{analyse.piece_reference}] « {analyse.nom} » : {analyse.resume}")
        for constat in analyse.constats:
            lignes.append(f"    [{constat.reference}] → {constat.presence}")
    return "\n".join(lignes)


def _formater_declaration(declaration: Declaration | None) -> str:
    if declaration is None or (not declaration.scenario and not declaration.reponses):
        return "(l'organisation n'a rien déclaré sur ce critère)"
    lignes = []
    for reponse in declaration.reponses:
        valeur = reponse.valeur or "sans réponse"
        commentaire = f" — {reponse.commentaire}" if reponse.commentaire else ""
        lignes.append(f"- {reponse.question} : {valeur}{commentaire}")
    if declaration.scenario:
        lignes.append(f"- Scénario décrit : {declaration.scenario}")
    return "\n".join(lignes)


def _formater_organisation(organisation: Organisation | None) -> str:
    """Absent, la section disparaît : signaler l'ignorance inviterait à la commenter."""
    if organisation is None or not organisation.secteur:
        return ""
    return (
        "\n=== G. CONTEXTE DE L'ORGANISATION ===\n"
        f"Secteur d'activité : {organisation.secteur}\n"
        "Le secteur peut rendre tes conseils plus applicables — vocabulaire, "
        "pièces habituellement produites dans ce domaine. Il ne change ni "
        "l'exigence, ni le diagnostic.\n"
        "N'en déduis AUCUNE obligation légale, réglementation, certification "
        "obligatoire ni seuil chiffré.\n"
    )


def _construire_prompt(requete: RecommendationAgentRequestV2) -> str:
    critere = requete.critere
    description = f"\nDescription : {critere.description}" if critere.description else ""
    situation = ""
    if requete.situation:
        s = requete.situation
        morceaux = [m for m in (s.referentiel_nom or s.referentiel_code, s.domaine_nom) if m]
        if morceaux:
            situation = "\nCadre : " + " — ".join(morceaux)

    return (
        "Tu es un agent de recommandation pour un audit RSE (plateforme Smartex "
        "Sustway).\n"
        "Ton rôle est de proposer des actions concrètes. Tu ne réévalues NI la "
        "conformité, NI le risque : les deux sont déjà établis ci-dessous.\n\n"
        "TU N'AS PAS LU LES DOCUMENTS. Ne dis jamais « le document montre » : tu "
        "raisonnes sur les résultats structurés qui te sont fournis.\n\n"
        f"Critère audité :\nCode : {critere.code}\nLibellé : {critere.libelle}"
        f"{description}{situation}\n\n"
        "=== A. CE QUE LE RÉFÉRENTIEL EXIGE ===\n"
        f"{_formater_exigences(requete.catalogue)}\n\n"
        "=== B. CE QUE L'AUDIT ATTEND EN DÉMONSTRATION ===\n"
        f"{_formater_attentes(requete.catalogue)}\n\n"
        "=== C. RÈGLES D'ANALYSE ===\n"
        f"{_formater_regles(requete.catalogue)}\n\n"
        "=== D. CE QUI A ÉTÉ DÉPOSÉ ===\n"
        f"{_formater_constats(requete.analyses_documents)}\n\n"
        "=== E. DIAGNOSTIC DE CONFORMITÉ ===\n"
        f"{_formater_evidence(requete.resultat_evidence)}\n\n"
        "=== F. SIGNAUX DE RISQUE ===\n"
        f"{_formater_risque(requete.resultat_risque)}\n\n"
        "=== CE QUE L'ORGANISATION DÉCLARE (non vérifié) ===\n"
        f"{_formater_declaration(requete.declaration)}\n"
        f"{_formater_organisation(requete.organisation)}\n"
        "=== CE QUE TU DOIS PRODUIRE ===\n"
        "Si la conformité est déjà pleine et sans réserve, réponds "
        "recommandation_necessaire=false et laisse pistes_amelioration vide. "
        "N'invente pas une amélioration qui n'a pas lieu d'être.\n\n"
        "Sinon, propose 2 à 4 actions concrètes, chacune nommant précisément la "
        "pièce ou l'élément à produire. Écris « Faire approuver le code de conduite "
        "par la direction et y porter la date d'entrée en vigueur », jamais "
        "« améliorer la documentation ».\n\n"
        "RATTACHEMENT OBLIGATOIRE. Chaque action doit se rattacher à une exigence "
        "[codes en A], une pièce attendue [références en B] ou une règle [codes en "
        "C]. Une action que tu ne peux rattacher à aucune de ces références ne doit "
        "pas être proposée : cela signifierait que le référentiel ne la demande "
        "pas.\n\n"
        "N'INVENTE JAMAIS UNE EXIGENCE. Ne recommande ni certification, ni audit "
        "externe, ni norme, ni dispositif que les sections A, B ou C ne mentionnent "
        "pas. Une recommandation crédible et fausse est pire qu'une recommandation "
        "absente : un auditeur pourrait la transmettre au client.\n\n"
        "Cas particuliers :\n"
        "- Un point NON VÉRIFIABLE n'appelle pas une action corrective mais une "
        "PIÈCE LISIBLE. Recommande de fournir un exemplaire exploitable, pas de "
        "mettre en place ce qui existe peut-être déjà.\n"
        "- Un signal PREUVE_GENERIQUE appelle de PERSONNALISER un document "
        "existant, pas d'en produire un nouveau.\n"
        "- Un CONFLIT entre pièces appelle de clarifier quelle version fait foi.\n"
        "- Ce que l'organisation DÉCLARE sans l'avoir démontré appelle de le "
        "documenter, pas de le mettre en place.\n\n"
        "Ne produis ni note, ni priorité, ni délai, ni estimation de coût : ces "
        "jugements ne t'appartiennent pas.\n\n"
        "Réponds en français."
    )


# === Recoupement ==========================================================


def _recouper(brut: _ResultatModele, requete: RecommendationAgentRequestV2
              ) -> list[ActionRecommandee]:
    """
    Ne garde que les actions rattachées à quelque chose de réellement transmis.

    Une action dont la référence est inconnue est ÉCARTÉE — pas simplement
    détachée. C'est le seul endroit du pipeline où l'on écarte plutôt que de
    retirer le rattachement, et la raison tient au métier : une action non
    rattachable est, par définition, une exigence que le référentiel ne
    demande pas. La conserver sans rattachement reviendrait à présenter une
    recommandation inventée comme si elle venait du référentiel.

    Chez Risk, à l'inverse, un signal mal accroché reste un signal juste : on
    y retire le rattachement sans perdre l'alerte. La différence n'est pas une
    incohérence, c'est que les deux sorties n'engagent pas la même chose.
    """
    candidates: list[tuple[ActionRecommandee, Rattachement]] = []
    for action in brut.actions:
        if action.rattachement_niveau not in ("EXIGENCE", "PREUVE_ATTENDUE", "REGLE"):
            logger.warning(
                "Recommendation V2 : niveau de rattachement inconnu, action écartée (%s)",
                action.rattachement_niveau,
            )
            continue
        rattachement = Rattachement(
            niveau=action.rattachement_niveau, reference=action.rattachement_reference
        )
        candidates.append((
            ActionRecommandee(action=action.action, rattachement=rattachement),
            rattachement,
        ))

    # `verifier_rattachements` est le point de vérité commun : il connaît les
    # trois espaces de références du catalogue et n'admet que ce qui s'y
    # trouve. Le dupliquer ici les ferait diverger.
    retenus = verifier_rattachements([r for _, r in candidates], requete.catalogue)
    admises = {(r.niveau, r.reference) for r in retenus}

    actions: list[ActionRecommandee] = []
    vues: set[tuple] = set()
    for action, rattachement in candidates:
        if (rattachement.niveau, rattachement.reference) not in admises:
            logger.warning(
                "Recommendation V2 : action écartée, référence hors référentiel (%s %s)",
                rattachement.niveau, rattachement.reference,
            )
            continue
        empreinte = (rattachement.niveau, rattachement.reference, action.action.strip())
        if empreinte in vues:
            logger.warning("Recommendation V2 : action en double écartée")
            continue
        vues.add(empreinte)
        actions.append(action)

    return actions


async def recommander(requete: RecommendationAgentRequestV2) -> ResultatRecommandationV2:
    """Propose des actions rattachées au référentiel, à partir des diagnostics amont."""
    debut = time.monotonic()
    logger.info(
        "Recommendation V2 : critère %s — %d exigence(s), %d attente(s), "
        "probabilité %.2f, risque %s",
        requete.critere.code,
        len(requete.catalogue.exigences),
        len(requete.catalogue.preuves_attendues),
        requete.resultat_evidence.probabilite_conformite,
        "signalé" if (requete.resultat_risque and requete.resultat_risque.signal_risque)
        else "absent",
    )

    client = get_client()

    try:
        appel = await appeler_gemini(
            agent="RECOMMENDATION",
            contents=_construire_prompt(requete),
            config={
                "response_mime_type": "application/json",
                "response_schema": schema_pour_gemini(_ResultatModele),
            },
            client=client,
        )
    except Exception:
        logger.error(
            "Recommendation V2 : échec Gemini sur le critère %s", requete.critere.code
        )
        raise
    reponse = appel.reponse

    brut = _ResultatModele.model_validate_json(reponse.text)
    actions = _recouper(brut, requete)

    duree_ms = int((time.monotonic() - debut) * 1000)
    logger.info(
        "Recommendation V2 : critère %s traité en %d ms — nécessaire %s, "
        "%d action(s) retenue(s) sur %d proposée(s)",
        requete.critere.code, duree_ms, brut.recommandation_necessaire,
        len(actions), len(brut.actions),
    )

    return ResultatRecommandationV2(
        recommandation_necessaire=brut.recommandation_necessaire,
        pistes_amelioration=brut.pistes_amelioration,
        actions=actions,
    )
