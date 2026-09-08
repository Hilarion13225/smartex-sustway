import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Landmark } from 'lucide-react';
import EnTeteDomaine from './EnTeteDomaine';
import ListeCriteres from './ListeCriteres';
import NavigationCritere from './NavigationCritere';
import CarteCritere from './CarteCritere';
import PanneauAnalyseIa from './PanneauAnalyseIa';
import { analyseDepuisEvaluation, analyserCritere } from './analyseCritere';
import { memeTexte } from './libelles';
import { estRenseigne } from './statutsCritere';
import { Alerte, Loader } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

/** Libellés lisibles des criticités renvoyées par l'API. */
const LIBELLES_CRITICITE = {
  FAIBLE: 'Faible',
  MOYENNE: 'Moyenne',
  ELEVEE: 'Élevée',
  CRITIQUE: 'Critique',
};

/**
 * Signature de la saisie, pour repérer un écart avec l'analyse IA affichée.
 * Le scénario en fait partie : les agents le lisent, le modifier périme donc
 * l'analyse au même titre qu'un changement de niveau ou de preuve.
 */
function signature(niveau, scenario, nombrePreuves) {
  return `${niveau ?? ''}|${(scenario ?? '').trim().length}|${nombrePreuves}`;
}

/**
 * Saisie des critères d'une mission d'audit, critère par critère, avec le
 * panneau d'analyse IA en colonne de droite.
 *
 * Le niveau choisi est enregistré comme évaluation experte
 * (`PUT .../criteres/{id}/evaluations`) : la note 1-5 y est dérivée d'une
 * probabilité représentative par ScoringEngine, conformément à RG27 qui
 * interdit de poser la note directement.
 *
 * Deux droits distincts, et non un seul : déclarer un niveau et déposer une
 * preuve appartiennent à l'organisation auditée (`peutSaisir`), tandis que
 * lancer l'analyse relève de la supervision (`peutAnalyser`). Les confondre
 * revenait à faire remplir le questionnaire par le responsable audit, alors
 * que son rôle est de superviser un travail d'analyse fait par l'IA.
 */
export default function SaisieCritereMission({
  entrepriseId,
  auditId,
  criteres,
  peutSaisir,
  peutAnalyser,
  surChangement,
}) {
  const [indice, setIndice] = useState(0);
  const [niveau, setNiveau] = useState(null);
  const [question, setQuestion] = useState(null);
  // Question factuelle : la réponse est un oui/non rangé dans le
  // questionnaire, non un niveau de maturité (voir la migration V27).
  const [questionBinaire, setQuestionBinaire] = useState(null);
  // Identifiant de la question portée par le critère : c'est elle que la
  // déclaration renseigne, quelle que soit son échelle de réponse.
  const [premiereQuestionId, setPremiereQuestionId] = useState(null);
  const [reponseBinaire, setReponseBinaire] = useState(null);
  const [scenario, setScenario] = useState('');
  const [preuves, setPreuves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [brouillonEnregistre, setBrouillonEnregistre] = useState(false);
  const [listeOuverte, setListeOuverte] = useState(false);
  const [depotEnCours, setDepotEnCours] = useState(false);
  const [analyse, setAnalyse] = useState(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [erreurAnalyse, setErreurAnalyse] = useState(null);
  const [signatureAnalysee, setSignatureAnalysee] = useState(null);
  const [dernierEnregistrement, setDernierEnregistrement] = useState(null);
  const minuteur = useRef(null);

  const critere = criteres[indice] ?? null;
  const critereId = critere?.id ?? null;
  const codeCritere = critere?.critereCode ?? null;
  const domaineCode = critere?.domaineCode ?? null;

  useEffect(() => () => clearTimeout(minuteur.current), []);

  /**
   * Recharge l'évaluation la plus récente et les preuves du critère affiché.
   * `silencieux` évite de masquer la carte derrière l'indicateur de chargement
   * quand elle est déjà à l'écran — après un dépôt de preuve, seule la liste
   * des fichiers change, faire disparaître le critère donnerait l'impression
   * d'un rechargement de la page.
   */
  const chargerCritere = useCallback((silencieux = false) => {
    if (!critereId) return;
    if (!silencieux) setChargement(true);
    setErreur(null);
    setErreurAnalyse(null);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/evaluations`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/questions`),
    ])
      .then(([evaluations, toutesLesPreuves, saisie]) => {
        // Le libellé du critère est une formulation déclarative, destinée aux
        // tableaux et aux rapports ; c'est la question du référentiel, elle
        // interrogative, qui s'adresse à l'auditeur (voir la migration V21).
        const premiereQuestion = saisie?.questions?.[0] ?? null;
        setPremiereQuestionId(premiereQuestion?.auditQuestionId ?? null);
        setQuestion(premiereQuestion?.libelle ?? null);
        setQuestionBinaire(
          premiereQuestion?.echelleReponse === 'BINAIRE' ? premiereQuestion : null
        );
        setReponseBinaire(premiereQuestion?.valeur ?? null);
        setScenario(saisie?.scenario ?? '');

        // Le niveau affiché est celui que l'organisation a déclaré, lu dans le
        // questionnaire — et non la note de la dernière évaluation, qui est le
        // verdict de l'IA après examen des preuves. Les confondre montrerait à
        // l'organisation un niveau qu'elle n'a pas choisi.
        setNiveau(premiereQuestion?.niveau ?? null);
        setDernierEnregistrement(premiereQuestion?.dateReponse ?? null);

        // RG14 conserve tout l'historique : les évaluations servent ici à
        // retrouver la dernière analyse IA.
        const parDateDecroissante = [...(evaluations ?? [])].sort(
          (a, b) => new Date(b.dateEvaluation) - new Date(a.dateEvaluation)
        );

        // L'API rattache les preuves au critère par son code métier
        // (`critereCodes`), pas par l'identifiant de la ligne d'audit.
        const preuvesDuCritere = (toutesLesPreuves ?? []).filter((preuve) =>
          (preuve.critereCodes ?? []).includes(codeCritere)
        );
        setPreuves(preuvesDuCritere);

        // Seule une évaluation produite par le pipeline porte une analyse ;
        // une saisie humaine plus récente ne la remplace pas mais la périme,
        // d'où la signature calculée sur l'état analysé et non sur l'état saisi.
        const derniereIa = parDateDecroissante.find((e) => e.source === 'IA');
        setAnalyse(analyseDepuisEvaluation(derniereIa));
        setSignatureAnalysee(
          derniereIa
            ? signature(derniereIa.note, saisie?.scenario, preuvesDuCritere.length)
            : null
        );
      })
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Chargement du critère impossible'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId, critereId, codeCritere]);

  useEffect(() => {
    chargerCritere();
  }, [chargerCritere]);

  // L'avancement de la collecte se mesure sur ce que l'organisation a
  // renseigné, pas sur ce que l'IA a déjà analysé : l'analyse a lieu à la
  // clôture, un compteur fondé sur elle resterait à zéro jusqu'au bout.
  const completes = useMemo(() => criteres.filter(estRenseigne).length, [criteres]);

  /** Critères du domaine affiché, pour la carte de progression du panneau. */
  const criteresDuDomaine = useMemo(
    () => criteres.filter((c) => c.domaineCode === domaineCode),
    [criteres, domaineCode]
  );
  const completesDuDomaine = useMemo(
    () => criteresDuDomaine.filter(estRenseigne).length,
    [criteresDuDomaine]
  );

  const desynchronisee =
    analyse != null && signatureAnalysee !== signature(niveau, scenario, preuves.length);

  /**
   * Enregistre la déclaration de l'organisation sur le critère : sa réponse —
   * niveau de maturité ou oui/non selon la question — et sa description de la
   * situation.
   *
   * Un seul appel pour l'ensemble (RG09) : la réponse et le scénario forment
   * la même déclaration, et les séparer en deux requêtes laissait la porte
   * ouverte à un enregistrement partiel. Aucune note n'est produite ici,
   * l'analyse IA a lieu à la clôture de la mission.
   */
  async function enregistrer() {
    if (!critereId || !premiereQuestionId) return false;
    if (questionBinaire ? !reponseBinaire : niveau == null) return false;

    setErreur(null);
    try {
      const saisie = await api.put(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/questions`,
        {
          scenario: scenario?.trim() ? scenario : null,
          reponses: [
            {
              auditQuestionId: premiereQuestionId,
              valeur: questionBinaire ? reponseBinaire : null,
              niveau: questionBinaire ? null : niveau,
              commentaire: null,
            },
          ],
        }
      );
      setDernierEnregistrement(
        saisie?.questions?.[0]?.dateReponse ?? new Date().toISOString()
      );
      surChangement?.();
      return true;
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
      return false;
    }
  }

  async function surBrouillon() {
    if (await enregistrer()) {
      setBrouillonEnregistre(true);
      clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => setBrouillonEnregistre(false), 2500);
    }
  }

  async function surContinuer() {
    if (await enregistrer()) allerA(indice + 1);
  }

  /** Lance le pipeline d'agents IA sur le critère affiché. */
  async function lancerAnalyse() {
    if (!critereId) return;
    setAnalyseEnCours(true);
    setErreurAnalyse(null);
    try {
      const resultat = await analyserCritere({ entrepriseId, auditId, critereId });
      setAnalyse(resultat);
      setSignatureAnalysee(signature(niveau, scenario, preuves.length));
      surChangement?.();
    } catch (err) {
      setErreurAnalyse(err instanceof ApiError ? err.message : 'Analyse IA impossible');
    } finally {
      setAnalyseEnCours(false);
    }
  }

  function allerA(nouvelIndice) {
    setIndice(Math.min(criteres.length - 1, Math.max(0, nouvelIndice)));
    setBrouillonEnregistre(false);
  }

  /** Amène au premier critère non encore évalué du domaine affiché. */
  function allerAuProchainDuDomaine() {
    const cible = criteres.findIndex(
      (c) => c.domaineCode === domaineCode && !estRenseigne(c)
    );
    if (cible >= 0) allerA(cible);
  }

  /** Téléverse chaque fichier puis l'associe au critère comme preuve. */
  async function ajouterPreuves(fichiers) {
    setErreur(null);
    setDepotEnCours(true);
    try {
      for (const fichier of fichiers) {
        const donnees = new FormData();
        donnees.append('fichier', fichier);
        const document = await api.post(`/api/v1/entreprises/${entrepriseId}/documents`, donnees);
        await api.post(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`, {
          documentId: document.id,
          description: '',
          type: 'JUSTIFICATIF',
          auditCritereIds: [critereId],
        });
      }
      chargerCritere(true);
      surChangement?.();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Dépôt de la preuve impossible');
    } finally {
      setDepotEnCours(false);
    }
  }

  if (criteres.length === 0) {
    return <Alerte ton="neutre">Aucun critère à évaluer sur cette mission.</Alerte>;
  }

  return (
    <div className="space-y-5">
      <EnTeteDomaine
        icone={Landmark}
        domaine={domaineCode ?? '—'}
        // Consigne neutre : un domaine mélange des critères de maturité et des
        // constats factuels, la consigne précise se lit sur chaque critère.
        description={
          peutSaisir
            ? 'Répondez critère par critère, puis joignez les preuves à l’appui.'
            : 'Déclarations de l’organisation et preuves déposées, telles que l’IA les analyse.'
        }
        completes={completes}
        total={criteres.length}
        listeOuverte={listeOuverte}
        surVoirTousLesCriteres={() => setListeOuverte((ouvert) => !ouvert)}
      />

      {listeOuverte ? (
        <ListeCriteres
          criteres={criteres}
          indiceCourant={indice}
          surSelection={(cible) => {
            allerA(cible);
            setListeOuverte(false);
          }}
        />
      ) : null}

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {/* Deux colonnes seulement à partir de `xl` : en dessous, le panneau
          passe sous le questionnaire plutôt que de comprimer les cinq cartes
          de maturité. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <NavigationCritere
            indice={indice + 1}
            total={criteres.length}
            surPrecedent={() => allerA(indice - 1)}
            surSuivant={() => allerA(indice + 1)}
          />

          {chargement ? (
            <Loader message="Chargement du critère…" />
          ) : (
            <CarteCritere
              code={critere.critereCode}
              criticite={LIBELLES_CRITICITE[critere.criticite] ?? critere.criticite ?? '—'}
              question={question ?? critere.critereLibelle}
              // L'intitulé déclaratif n'est montré que s'il apporte autre
              // chose que la question : sur la grille RSE importée, les deux
              // sont identiques et s'affichaient l'un sous l'autre.
              intitule={
                question && !memeTexte(question, critere.critereLibelle)
                  ? critere.critereLibelle
                  : null
              }
              binaire={questionBinaire != null}
              peutSaisir={peutSaisir}
              niveauSelectionne={niveau}
              surSelectionNiveau={peutSaisir ? setNiveau : () => {}}
              reponseBinaire={reponseBinaire}
              surSelectionBinaire={peutSaisir ? setReponseBinaire : () => {}}
              scenario={scenario}
              surChangementScenario={peutSaisir ? setScenario : () => {}}
              fichiers={preuves.map((preuve) => ({
                id: preuve.id,
                nom: preuve.documentNomOriginal ?? preuve.description ?? 'Document',
              }))}
              surAjoutFichiers={ajouterPreuves}
              depotEnCours={depotEnCours}
              surPrecedent={() => allerA(indice - 1)}
              surBrouillon={surBrouillon}
              surContinuer={surContinuer}
              brouillonEnregistre={brouillonEnregistre}
              premier={indice === 0}
            />
          )}
        </div>

        <PanneauAnalyseIa
          analyse={analyse}
          analyseEnCours={analyseEnCours}
          analyseDesynchronisee={desynchronisee}
          erreurAnalyse={erreurAnalyse}
          peutAnalyser={peutAnalyser}
          surAnalyser={lancerAnalyse}
          domaine={domaineCode ?? '—'}
          domaineCompletes={completesDuDomaine}
          domaineTotal={criteresDuDomaine.length}
          surVoirDetailDomaine={
            completesDuDomaine < criteresDuDomaine.length ? allerAuProchainDuDomaine : null
          }
          dernierEnregistrement={dernierEnregistrement}
        />
      </div>
    </div>
  );
}
