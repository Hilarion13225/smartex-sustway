import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Landmark } from 'lucide-react';
import EnTeteDomaine from './EnTeteDomaine';
import ListeCriteres from './ListeCriteres';
import NavigationCritere from './NavigationCritere';
import CarteCritere from './CarteCritere';
import PanneauAnalyseIa from './PanneauAnalyseIa';
import { analyseDepuisEvaluation, analyserCritere } from './analyseCritere';
import { Alerte, Loader } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

/** Libellés lisibles des criticités renvoyées par l'API. */
const LIBELLES_CRITICITE = {
  FAIBLE: 'Faible',
  MOYENNE: 'Moyenne',
  ELEVEE: 'Élevée',
  CRITIQUE: 'Critique',
};

/** Signature de la saisie, pour repérer un écart avec l'analyse IA affichée. */
function signature(niveau, nombrePreuves) {
  return `${niveau ?? ''}|${nombrePreuves}`;
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
  const [reponseBinaire, setReponseBinaire] = useState(null);
  const [scenario, setScenario] = useState(null);
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
        setQuestion(premiereQuestion?.libelle ?? null);
        setQuestionBinaire(
          premiereQuestion?.echelleReponse === 'BINAIRE' ? premiereQuestion : null
        );
        setReponseBinaire(premiereQuestion?.valeur ?? null);
        // Le scénario appartient à la saisie déclarative du critère et non à
        // cet écran ; il est retransmis tel quel pour ne pas être effacé par
        // l'enregistrement d'une réponse.
        setScenario(saisie?.scenario ?? null);

        // RG14 conserve tout l'historique : la dernière évaluation en date est
        // celle qui reflète l'état courant du critère.
        const parDateDecroissante = [...(evaluations ?? [])].sort(
          (a, b) => new Date(b.dateEvaluation) - new Date(a.dateEvaluation)
        );
        const derniere = parDateDecroissante[0];
        setNiveau(derniere?.note ?? null);
        setDernierEnregistrement(derniere?.dateEvaluation ?? null);

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
          derniereIa ? signature(derniereIa.note, preuvesDuCritere.length) : null
        );
      })
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Chargement du critère impossible'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId, critereId, codeCritere]);

  useEffect(() => {
    chargerCritere();
  }, [chargerCritere]);

  const completes = useMemo(() => criteres.filter((c) => c.statut === 'EVALUE').length, [criteres]);

  /** Critères du domaine affiché, pour la carte de progression du panneau. */
  const criteresDuDomaine = useMemo(
    () => criteres.filter((c) => c.domaineCode === domaineCode),
    [criteres, domaineCode]
  );
  const completesDuDomaine = useMemo(
    () => criteresDuDomaine.filter((c) => c.statut === 'EVALUE').length,
    [criteresDuDomaine]
  );

  const desynchronisee =
    analyse != null && signatureAnalysee !== signature(niveau, preuves.length);

  /**
   * Enregistre une question factuelle : la réponse va au questionnaire
   * déclaratif (RG09), sans produire d'évaluation — un oui/non ne se convertit
   * pas en note de maturité. Le critère est ensuite évalué par le pipeline
   * d'agents, qui lit cette réponse.
   */
  async function enregistrerReponseBinaire() {
    await api.put(
      `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/questions`,
      {
        scenario,
        reponses: [
          {
            auditQuestionId: questionBinaire.auditQuestionId,
            valeur: reponseBinaire,
            commentaire: null,
          },
        ],
      }
    );
    setDernierEnregistrement(new Date().toISOString());
    surChangement?.();
    return true;
  }

  async function enregistrer() {
    if (!critereId) return false;
    if (questionBinaire) {
      if (!reponseBinaire) return false;
      setErreur(null);
      try {
        return await enregistrerReponseBinaire();
      } catch (err) {
        setErreur(err instanceof ApiError ? err.message : 'Enregistrement impossible');
        return false;
      }
    }
    if (niveau == null) return false;
    setErreur(null);
    try {
      // La justification n'est plus saisie à la main : celle qui compte est
      // produite par l'analyse IA à partir des preuves.
      const evaluation = await api.put(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/evaluations`,
        { niveau, justification: null }
      );
      setDernierEnregistrement(evaluation?.dateEvaluation ?? new Date().toISOString());
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
      setSignatureAnalysee(signature(niveau, preuves.length));
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
      (c) => c.domaineCode === domaineCode && c.statut !== 'EVALUE'
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
        description={
          peutSaisir
            ? 'Sélectionnez le niveau de maturité qui décrit le mieux la situation observée.'
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
              intitule={question ? critere.critereLibelle : null}
              binaire={questionBinaire != null}
              peutSaisir={peutSaisir}
              niveauSelectionne={niveau}
              surSelectionNiveau={peutSaisir ? setNiveau : () => {}}
              reponseBinaire={reponseBinaire}
              surSelectionBinaire={peutSaisir ? setReponseBinaire : () => {}}
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
