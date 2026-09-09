"""
Les cinq extracteurs.

Chacun tient dans une classe courte parce qu'ils font tous la même chose :
ouvrir un fichier, en tirer du texte, et dire d'où vient chaque morceau. Ce
qui les distingue est ce que leur format permet de mesurer — une page, une
feuille et une ligne, un paragraphe, un chemin.

Aucun n'invente de localisation. Quand un format ne permet pas de situer
l'information de façon fiable, le champ reste nul : envoyer un relecteur à la
mauvaise page avec assurance est pire que de ne rien lui dire.
"""

from __future__ import annotations

import csv
import io
import json

from app.extraction.base import Extracteur, ExtractionImpossible, Section, SourceExtraite
from app.models.import_referentiel import Localisation, TypeSource


class ExtracteurPdf(Extracteur):
    """
    PDF, page par page.

    Extraction locale plutôt qu'envoi direct du fichier au modèle multimodal,
    comme le fait `document_agent` pour les pièces d'audit. Deux raisons, et
    aucune n'est une préférence de style. La page doit être une mesure, pas une
    affirmation du modèle : demander « à quelle page as-tu lu cela ? » produit
    une réponse plausible, pas une référence vérifiable. Et un référentiel de
    plusieurs dizaines de pages doit être découpé pour tenir dans les limites
    d'appel — sans frontières de page connues, on ne sait pas où couper.

    Un PDF scanné sans couche texte ressort vide : le cas est détecté et
    rapporté, jamais comblé par une invention.
    """

    type_source = TypeSource.PDF

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        try:
            from pypdf import PdfReader
        except ImportError as exc:  # pragma: no cover - dépendance déclarée
            raise ExtractionImpossible("Lecture PDF indisponible sur ce service") from exc

        try:
            lecteur = PdfReader(io.BytesIO(contenu))
        except Exception as exc:
            raise ExtractionImpossible(f"PDF illisible : {exc}") from exc

        sections: list[Section] = []
        for index, page in enumerate(lecteur.pages, start=1):
            try:
                texte = page.extract_text() or ""
            except Exception:
                texte = ""
            if texte.strip():
                sections.append(
                    Section(
                        texte=texte,
                        localisation=Localisation(type=TypeSource.PDF, page=index),
                    )
                )

        source = SourceExtraite(
            type_source=TypeSource.PDF,
            sections=sections,
            metadonnees={"pages": len(lecteur.pages), "pages_avec_texte": len(sections)},
        )
        if not source.non_vide():
            raise ExtractionImpossible(
                "Aucun texte extractible : le document est probablement une image "
                "numérisée sans couche texte"
            )
        return source


class ExtracteurDocx(Extracteur):
    """
    DOCX : paragraphes et tableaux, dans l'ordre du document.

    Les tableaux sont lus explicitement. Un référentiel s'écrit très souvent
    sous forme de tableau, et une extraction qui ne lirait que les paragraphes
    rendrait un document apparemment vide sans rien signaler — l'échec le plus
    coûteux, celui qui ressemble à un succès.
    """

    type_source = TypeSource.DOCX

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        try:
            from docx import Document
        except ImportError as exc:  # pragma: no cover - dépendance déclarée
            raise ExtractionImpossible("Lecture DOCX indisponible sur ce service") from exc

        try:
            document = Document(io.BytesIO(contenu))
        except Exception as exc:
            raise ExtractionImpossible(f"DOCX illisible : {exc}") from exc

        sections: list[Section] = []
        rang = 0
        for paragraphe in document.paragraphs:
            rang += 1
            texte = paragraphe.text.strip()
            if texte:
                sections.append(
                    Section(
                        texte=texte,
                        localisation=Localisation(type=TypeSource.DOCX, paragraphe=rang),
                    )
                )

        nb_tableaux = 0
        for tableau in document.tables:
            nb_tableaux += 1
            for ligne_index, ligne in enumerate(tableau.rows, start=1):
                cellules = [c.text.strip() for c in ligne.cells]
                texte = " | ".join(c for c in cellules if c)
                if texte:
                    sections.append(
                        Section(
                            texte=texte,
                            # Le numéro de paragraphe ne s'applique pas à une
                            # ligne de tableau : la ligne la situe, et prétendre
                            # à un paragraphe serait faux.
                            localisation=Localisation(type=TypeSource.DOCX, ligne=ligne_index),
                        )
                    )

        source = SourceExtraite(
            type_source=TypeSource.DOCX,
            sections=sections,
            metadonnees={"paragraphes": rang, "tableaux": nb_tableaux},
        )
        if not source.non_vide():
            raise ExtractionImpossible("Le document ne contient aucun texte exploitable")
        return source


class ExtracteurXlsx(Extracteur):
    """
    XLSX : feuille par feuille, ligne par ligne.

    Chaque feuille est lue avec ses propres en-têtes : rien ne garantit
    qu'elles partagent une structure, et le supposer ferait lire les colonnes
    d'une feuille avec les intitulés d'une autre. Les cellules fusionnées sont
    rapportées telles qu'openpyxl les rend — la valeur sur la première
    cellule, vide sur les suivantes — sans tentative de reconstitution.
    """

    type_source = TypeSource.XLSX

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        try:
            from openpyxl import load_workbook
        except ImportError as exc:  # pragma: no cover - dépendance déclarée
            raise ExtractionImpossible("Lecture XLSX indisponible sur ce service") from exc

        try:
            classeur = load_workbook(io.BytesIO(contenu), read_only=True, data_only=True)
        except Exception as exc:
            raise ExtractionImpossible(f"Classeur illisible : {exc}") from exc

        sections: list[Section] = []
        feuilles: dict[str, int] = {}

        for feuille in classeur.worksheets:
            entetes: list[str] = []
            lignes_lues = 0
            for index, ligne in enumerate(feuille.iter_rows(values_only=True), start=1):
                valeurs = ["" if v is None else str(v).strip() for v in ligne]
                if not any(valeurs):
                    continue
                if not entetes:
                    entetes = valeurs
                    continue
                lignes_lues += 1
                # Les valeurs sont préfixées de leur en-tête : sans cela, le
                # modèle recevrait des colonnes anonymes et devrait deviner
                # laquelle porte le code, laquelle le libellé.
                paires = [
                    f"{entetes[i] or f'colonne {i + 1}'} : {valeurs[i]}"
                    for i in range(len(valeurs))
                    if valeurs[i]
                ]
                sections.append(
                    Section(
                        texte=" | ".join(paires),
                        localisation=Localisation(
                            type=TypeSource.XLSX, feuille=feuille.title, ligne=index
                        ),
                    )
                )
            feuilles[feuille.title] = lignes_lues

        classeur.close()
        source = SourceExtraite(
            type_source=TypeSource.XLSX, sections=sections, metadonnees={"feuilles": feuilles}
        )
        if not source.non_vide():
            raise ExtractionImpossible("Le classeur ne contient aucune ligne exploitable")
        return source


class ExtracteurCsv(Extracteur):
    """
    CSV, séparateur détecté plutôt que supposé.

    Le point-virgule est courant dans les exports francophones, la tabulation
    dans les copies de tableur. Supposer la virgule rendrait une seule colonne
    contenant toute la ligne, sans erreur apparente.
    """

    type_source = TypeSource.CSV
    SEPARATEURS = [",", ";", "\t", "|"]

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        texte = self._decoder(contenu)
        separateur = self._detecter_separateur(texte)

        lecteur = csv.reader(io.StringIO(texte), delimiter=separateur)
        sections: list[Section] = []
        entetes: list[str] = []
        lignes = 0

        for index, ligne in enumerate(lecteur, start=1):
            valeurs = [v.strip() for v in ligne]
            if not any(valeurs):
                continue
            if not entetes:
                entetes = valeurs
                continue
            lignes += 1
            paires = [
                f"{entetes[i] if i < len(entetes) and entetes[i] else f'colonne {i + 1}'} : {valeurs[i]}"
                for i in range(len(valeurs))
                if valeurs[i]
            ]
            sections.append(
                Section(
                    texte=" | ".join(paires),
                    localisation=Localisation(type=TypeSource.CSV, ligne=index),
                )
            )

        source = SourceExtraite(
            type_source=TypeSource.CSV,
            sections=sections,
            metadonnees={"separateur": separateur, "lignes": lignes, "colonnes": len(entetes)},
        )
        if not source.non_vide():
            raise ExtractionImpossible("Le fichier ne contient aucune ligne exploitable")
        return source

    @staticmethod
    def _decoder(contenu: bytes) -> str:
        """UTF-8 d'abord, avec ou sans marque d'ordre ; puis les encodages hérités."""
        for encodage in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
            try:
                return contenu.decode(encodage)
            except UnicodeDecodeError:
                continue
        raise ExtractionImpossible("Encodage du fichier non reconnu")

    @classmethod
    def _detecter_separateur(cls, texte: str) -> str:
        premiere = next((l for l in texte.splitlines() if l.strip()), "")
        if not premiere:
            raise ExtractionImpossible("Le fichier est vide")
        # Le séparateur le plus présent sur la première ligne non vide. Le
        # Sniffer de la bibliothèque standard se trompe sur les fichiers à une
        # seule colonne ; ce comptage direct est plus prévisible.
        occurrences = {s: premiere.count(s) for s in cls.SEPARATEURS}
        meilleur = max(occurrences, key=occurrences.get)
        return meilleur if occurrences[meilleur] > 0 else ","


class ExtracteurJson(Extracteur):
    """
    JSON, analysé strictement.

    Chaque nœud est situé par son chemin, ce qui donne la localisation la plus
    précise des cinq formats. Le contenu n'est jamais évalué comme du code :
    seule la bibliothèque standard est utilisée.
    """

    type_source = TypeSource.JSON
    PROFONDEUR_MAXIMALE = 6

    def extraire(self, contenu: bytes, nom_fichier: str) -> SourceExtraite:
        try:
            donnees = json.loads(contenu.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ExtractionImpossible(f"JSON invalide : {exc}") from exc

        sections: list[Section] = []
        self._parcourir(donnees, "$", sections, 0)

        source = SourceExtraite(
            type_source=TypeSource.JSON,
            sections=sections,
            metadonnees={"noeuds": len(sections)},
        )
        if not source.non_vide():
            raise ExtractionImpossible("Le document JSON ne contient aucune valeur exploitable")
        return source

    def _parcourir(self, noeud, chemin: str, sections: list[Section], profondeur: int) -> None:
        """
        Descend jusqu'à une profondeur bornée, puis rend le sous-arbre entier.

        Descendre indéfiniment produirait une section par valeur scalaire et
        ferait perdre la structure ; s'arrêter net perdrait le détail. La borne
        garde des sections lisibles tout en conservant leur chemin.
        """
        if profondeur >= self.PROFONDEUR_MAXIMALE or not isinstance(noeud, (dict, list)):
            texte = json.dumps(noeud, ensure_ascii=False)
            if texte.strip() not in ("{}", "[]", '""', "null"):
                sections.append(
                    Section(
                        texte=texte,
                        localisation=Localisation(type=TypeSource.JSON, chemin=chemin),
                    )
                )
            return

        if isinstance(noeud, dict):
            for cle, valeur in noeud.items():
                self._parcourir(valeur, f"{chemin}.{cle}", sections, profondeur + 1)
        else:
            for index, valeur in enumerate(noeud):
                self._parcourir(valeur, f"{chemin}[{index}]", sections, profondeur + 1)


# --- Choix de l'extracteur ---------------------------------------------------

PAR_TYPE_MIME: dict[str, Extracteur] = {
    "application/pdf": ExtracteurPdf(),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ExtracteurDocx(),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ExtracteurXlsx(),
    "text/csv": ExtracteurCsv(),
    "application/json": ExtracteurJson(),
}


def extracteur_pour(type_mime: str) -> Extracteur:
    """
    L'extracteur correspondant au type déclaré.

    Le type a déjà été contrôlé côté Java avant que le fichier n'arrive ici ;
    un type inconnu à ce stade signale une divergence entre les deux listes,
    et vaut mieux être dit que deviné.
    """
    extracteur = PAR_TYPE_MIME.get(type_mime)
    if extracteur is None:
        raise ExtractionImpossible(f"Aucun extracteur pour le type {type_mime}")
    return extracteur
