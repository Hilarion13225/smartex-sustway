import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Landmark } from 'lucide-react';
import EnTeteDomaine from './EnTeteDomaine';
import NavigationCritere from './NavigationCritere';
import CarteCritere from './CarteCritere';
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
 * Saisie des critères d'une mission d'audit, critère par critère.
 *
 * Le niveau choisi est enregistré comme évaluation experte
 * (`PUT .../criteres/{id}/evaluations`) : la note 1-5 y est dérivée d'une
 * probabilité représentative par ScoringEngine, conformément à RG27 qui
 * interdit de poser la note directement.
 */
export default function SaisieCritereMission({ entrepriseId, auditId, criteres, peutModifier, surChangement }) {
  const [indice, setIndice] = useState(0);
  const [niveau, setNiveau] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [marquePourRevue, setMarquePourRevue] = useState(false);
  const [preuves, setPreuves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [brouillonEnregistre, setBrouillonEnregistre] = useState(false);
  const minuteur = useRef(null);

  const critere = criteres[indice] ?? null;
  const critereId = critere?.id ?? null;
  const codeCritere = critere?.critereCode ?? null;

  useEffect(() => () => clearTimeout(minuteur.current), []);

  /** Recharge l'évaluation la plus récente et les preuves du critère affiché. */
  const chargerCritere = useCallback(() => {
    if (!critereId) return;
    setChargement(true);
    setErreur(null);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/evaluations`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/preuves`),
    ])
      .then(([evaluations, toutesLesPreuves]) => {
        // RG14 conserve tout l'historique : la dernière évaluation en date est
        // celle qui reflète l'état courant du critère.
        const derniere = [...(evaluations ?? [])].sort(
          (a, b) => new Date(b.dateEvaluation) - new Date(a.dateEvaluation)
        )[0];
        setNiveau(derniere?.note ?? null);
        setCommentaire(derniere?.justification ?? '');
        // L'API rattache les preuves au critère par son code métier
        // (`critereCodes`), pas par l'identifiant de la ligne d'audit.
        setPreuves(
          (toutesLesPreuves ?? []).filter((preuve) =>
            (preuve.critereCodes ?? []).includes(codeCritere)
          )
        );
      })
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Chargement du critère impossible'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId, critereId, codeCritere]);

  useEffect(() => {
    chargerCritere();
  }, [chargerCritere]);

  const completes = useMemo(() => criteres.filter((c) => c.statut === 'EVALUE').length, [criteres]);

  async function enregistrer() {
    if (!critereId || niveau == null) return false;
    setErreur(null);
    try {
      await api.put(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/evaluations`,
        { niveau, justification: commentaire || null }
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

  function allerA(nouvelIndice) {
    setIndice(Math.min(criteres.length - 1, Math.max(0, nouvelIndice)));
    setBrouillonEnregistre(false);
  }

  /** Téléverse chaque fichier puis l'associe au critère comme preuve. */
  async function ajouterPreuves(fichiers) {
    setErreur(null);
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
      chargerCritere();
      surChangement?.();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Dépôt de la preuve impossible');
    }
  }

  if (criteres.length === 0) {
    return <Alerte ton="neutre">Aucun critère à évaluer sur cette mission.</Alerte>;
  }

  return (
    <div className="space-y-5">
      <EnTeteDomaine
        icone={Landmark}
        domaine={critere?.domaineCode ?? '—'}
        description="Sélectionnez le niveau de maturité qui décrit le mieux la situation observée."
        completes={completes}
        total={criteres.length}
        surVoirTousLesCriteres={() => {}}
      />

      <NavigationCritere
        indice={indice + 1}
        total={criteres.length}
        surPrecedent={() => allerA(indice - 1)}
        surSuivant={() => allerA(indice + 1)}
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement du critère…" />
      ) : (
        <CarteCritere
          code={critere.critereCode}
          criticite={LIBELLES_CRITICITE[critere.criticite] ?? critere.criticite ?? '—'}
          question={critere.critereLibelle}
          marquePourRevue={marquePourRevue}
          surMarquerPourRevue={() => setMarquePourRevue((valeur) => !valeur)}
          niveauSelectionne={niveau}
          surSelectionNiveau={peutModifier ? setNiveau : () => {}}
          commentaire={commentaire}
          surChangementCommentaire={setCommentaire}
          fichiers={preuves.map((preuve) => ({
            id: preuve.id,
            nom: preuve.documentNomOriginal ?? preuve.description ?? 'Document',
          }))}
          surAjoutFichiers={ajouterPreuves}
          surPrecedent={() => allerA(indice - 1)}
          surBrouillon={surBrouillon}
          surContinuer={surContinuer}
          brouillonEnregistre={brouillonEnregistre}
          premier={indice === 0}
        />
      )}
    </div>
  );
}
