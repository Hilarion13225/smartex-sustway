import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, ecrireToken, lireToken } from '../lib/apiClient';
import { decoderJwt, tokenExpire } from '../lib/jwt';
import { possedePermission } from './permissions';

/**
 * Contexte d'authentification RÉEL — parle effectivement à l'API Quarkus
 * (voir README racine, section "API disponible"). Couvre désormais
 * l'inscription, la vérification email, la connexion (avec 2FA optionnelle
 * en deux étapes — RG36), les entreprises, les abonnements/paiements et la
 * gestion de la 2FA.
 *
 * Volontairement SÉPARÉ du contexte de démonstration (auth/AuthContext.jsx,
 * utilisé par le reste de l'application sur des données mockées dans
 * data/mock.js — Dashboard, Audits, Pipeline... modules pas encore
 * construits côté API, phases D à G). Les deux univers coexistent sans se
 * marcher dessus.
 */
export const ApiAuthContext = createContext(null);

export function ApiAuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = lireToken();
    return t && !tokenExpire(t) ? t : null;
  });
  const [utilisateur, setUtilisateur] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [chargement, setChargement] = useState(true);

  const claims = useMemo(() => (token ? decoderJwt(token) : null), [token]);
  const roleCourant = claims?.role ?? null;

  const chargerProfil = useCallback(async () => {
    if (!token) {
      setUtilisateur(null);
      setEntreprises([]);
      setChargement(false);
      return;
    }
    setChargement(true);
    try {
      const [moi, mesEntreprises] = await Promise.all([
        api.get('/api/v1/utilisateurs/moi'),
        api.get('/api/v1/entreprises'),
      ]);
      setUtilisateur(moi);
      setEntreprises(mesEntreprises);
    } catch {
      // Token invalide ou expiré côté serveur : on nettoie proprement plutôt
      // que de laisser l'app dans un état incohérent (token présent mais
      // profil inaccessible).
      ecrireToken(null);
      setToken(null);
      setUtilisateur(null);
      setEntreprises([]);
    } finally {
      setChargement(false);
    }
  }, [token]);

  useEffect(() => {
    chargerProfil();
  }, [chargerProfil]);

  // --- Inscription / vérification email ---------------------------------

  const inscrire = useCallback(async (nom, prenom, email, motDePasse) => {
    return api.post('/api/v1/auth/inscription', { nom, prenom, email, motDePasse }, { avecAuth: false });
  }, []);

  const verifierEmail = useCallback(async (tokenVerification) => {
    return api.get(`/api/v1/auth/verification-email?token=${encodeURIComponent(tokenVerification)}`, { avecAuth: false });
  }, []);

  // --- Connexion (RG36 : deux étapes si la 2FA est active) ---------------

  /**
   * Retourne la réponse brute de l'API : {deuxFaRequise, methode, tokenPreAuth}
   * si la 2FA doit encore être validée (le token de session n'est PAS
   * positionné dans ce cas — l'appelant doit ensuite appeler confirmerDeuxFa),
   * ou {deuxFaRequise:false, token, typeToken} sinon (session déjà active
   * au retour de cet appel).
   */
  const connecter = useCallback(async (email, motDePasse) => {
    const reponse = await api.post('/api/v1/auth/connexion', { email, motDePasse }, { avecAuth: false });
    if (!reponse.deuxFaRequise) {
      ecrireToken(reponse.token);
      setToken(reponse.token);
    }
    return reponse;
  }, []);

  const confirmerDeuxFa = useCallback(async (tokenPreAuth, code) => {
    const reponse = await api.post('/api/v1/auth/connexion/2fa', { tokenPreAuth, code }, { avecAuth: false });
    ecrireToken(reponse.token);
    setToken(reponse.token);
    return reponse;
  }, []);

  const deconnecter = useCallback(() => {
    ecrireToken(null);
    setToken(null);
    setUtilisateur(null);
    setEntreprises([]);
  }, []);

  // --- Gestion de la 2FA (utilisateur déjà connecté) ----------------------

  const demarrerActivationAppDeuxFa = useCallback(async () => {
    return api.post('/api/v1/auth/2fa/app/demarrer', undefined);
  }, []);

  const confirmerActivationAppDeuxFa = useCallback(
    async (code) => {
      const u = await api.post('/api/v1/auth/2fa/app/confirmer', { code });
      setUtilisateur(u);
      return u;
    },
    []
  );

  const demarrerActivationSmsDeuxFa = useCallback(async (telephone) => {
    return api.post('/api/v1/auth/2fa/sms/demarrer', { telephone });
  }, []);

  const confirmerActivationSmsDeuxFa = useCallback(
    async (tokenActivation, code) => {
      const u = await api.post('/api/v1/auth/2fa/sms/confirmer', { tokenActivation, code });
      setUtilisateur(u);
      return u;
    },
    []
  );

  const desactiverDeuxFa = useCallback(async () => {
    const u = await api.post('/api/v1/auth/2fa/desactiver', undefined);
    setUtilisateur(u);
    return u;
  }, []);

  // --- Entreprises / abonnements / paiements ------------------------------

  /** RG24/RG25 : payload doit inclure formuleCode (+ periodicite si formule payante). */
  const creerEntreprise = useCallback(async (payload) => {
    const reponse = await api.post('/api/v1/entreprises', payload);
    setEntreprises((prev) => [...prev, reponse.entreprise]);
    return reponse; // { entreprise, abonnement }
  }, []);

  const modifierEntreprise = useCallback(async (entrepriseId, payload) => {
    const entreprise = await api.put(`/api/v1/entreprises/${entrepriseId}`, payload);
    setEntreprises((prev) => prev.map((e) => (e.id === entrepriseId ? entreprise : e)));
    return entreprise;
  }, []);

  const recupererAbonnement = useCallback(async (entrepriseId) => {
    return api.get(`/api/v1/entreprises/${entrepriseId}/abonnement`);
  }, []);

  const payerAbonnement = useCallback(async (entrepriseId, fournisseur) => {
    return api.post(`/api/v1/entreprises/${entrepriseId}/abonnement/paiements`, { fournisseur });
  }, []);

  const listerFormules = useCallback(async () => {
    return api.get('/api/v1/formules', { avecAuth: false });
  }, []);

  const listerSecteurs = useCallback(async () => {
    return api.get('/api/v1/secteurs', { avecAuth: false });
  }, []);

  /**
   * `plan` (formule de l'entreprise concernée par l'action) est fourni par
   * l'appelant plutôt que lu d'un état global : contrairement au prototype
   * de référence, un même compte peut être rattaché à plusieurs entreprises
   * à des formules différentes — il n'existe pas de « formule active »
   * unique côté application. Omettre `plan` reste sûr pour les permissions
   * jamais soumises à restriction de formule (ex. referentiel:administrer).
   */
  const peut = useCallback(
    (permission, plan) => possedePermission(roleCourant, plan, permission),
    [roleCourant]
  );

  const valeur = useMemo(
    () => ({
      token,
      utilisateur,
      entreprises,
      roleCourant,
      peut,
      chargement,
      estConnecte: Boolean(token && utilisateur),
      inscrire,
      verifierEmail,
      connecter,
      confirmerDeuxFa,
      deconnecter,
      demarrerActivationAppDeuxFa,
      confirmerActivationAppDeuxFa,
      demarrerActivationSmsDeuxFa,
      confirmerActivationSmsDeuxFa,
      desactiverDeuxFa,
      creerEntreprise,
      modifierEntreprise,
      recupererAbonnement,
      payerAbonnement,
      listerFormules,
      listerSecteurs,
      rafraichirProfil: chargerProfil,
    }),
    [
      token,
      utilisateur,
      entreprises,
      roleCourant,
      peut,
      chargement,
      inscrire,
      verifierEmail,
      connecter,
      confirmerDeuxFa,
      deconnecter,
      demarrerActivationAppDeuxFa,
      confirmerActivationAppDeuxFa,
      demarrerActivationSmsDeuxFa,
      confirmerActivationSmsDeuxFa,
      desactiverDeuxFa,
      creerEntreprise,
      modifierEntreprise,
      recupererAbonnement,
      payerAbonnement,
      listerFormules,
      listerSecteurs,
      chargerProfil,
    ]
  );

  return <ApiAuthContext.Provider value={valeur}>{children}</ApiAuthContext.Provider>;
}
