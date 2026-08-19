import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, ecrireToken, lireToken } from '../lib/apiClient';
import { decoderJwt, tokenExpire } from '../lib/jwt';

/**
 * Contexte d'authentification RÉEL — parle effectivement à l'API Quarkus
 * (voir README racine, section "API disponible (Phase B)").
 *
 * Volontairement SÉPARÉ du contexte de démonstration (auth/AuthContext.jsx,
 * utilisé par tout le reste de l'application sur des données mockées dans
 * data/mock.js). Les deux univers coexistent sans se marcher dessus :
 *   - AuthContext / useAuth()    -> démo complète (Dashboard, Audits...),
 *     nécessaire tant que les modules IA/scoring/rapports (phases D à G)
 *     n'existent pas côté backend.
 *   - ApiAuthContext / useApiAuth() -> connexion réelle (inscription,
 *     vérification email, connexion, création d'entreprise), sur les seuls
 *     modules effectivement construits et testés (phase B).
 *
 * Fusionner les deux viendrait soit casser tout le reste de l'app (qui
 * suppose un utilisateur mocké avec rôle/formule/audits), soit obliger à
 * reconstruire prématurément 15+ pages sur des données qui n'existent pas
 * encore côté API. On préfère avancer honnêtement : ce qui est réel est
 * clairement isolé et affiché comme tel (pages ConnexionReelle/EspaceReel).
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

  const inscrire = useCallback(async (nom, prenom, email, motDePasse) => {
    return api.post('/api/v1/auth/inscription', { nom, prenom, email, motDePasse }, { avecAuth: false });
  }, []);

  const verifierEmail = useCallback(async (tokenVerification) => {
    return api.get(`/api/v1/auth/verification-email?token=${encodeURIComponent(tokenVerification)}`, { avecAuth: false });
  }, []);

  const connecter = useCallback(async (email, motDePasse) => {
    const reponse = await api.post('/api/v1/auth/connexion', { email, motDePasse }, { avecAuth: false });
    ecrireToken(reponse.token);
    setToken(reponse.token);
  }, []);

  const deconnecter = useCallback(() => {
    ecrireToken(null);
    setToken(null);
    setUtilisateur(null);
    setEntreprises([]);
  }, []);

  const creerEntreprise = useCallback(async (payload) => {
    const entreprise = await api.post('/api/v1/entreprises', payload);
    setEntreprises((prev) => [...prev, entreprise]);
    return entreprise;
  }, []);

  const valeur = useMemo(
    () => ({
      token,
      utilisateur,
      entreprises,
      roleCourant,
      chargement,
      estConnecte: Boolean(token && utilisateur),
      inscrire,
      verifierEmail,
      connecter,
      deconnecter,
      creerEntreprise,
      rafraichirProfil: chargerProfil,
    }),
    [token, utilisateur, entreprises, roleCourant, chargement, inscrire, verifierEmail, connecter, deconnecter, creerEntreprise, chargerProfil]
  );

  return <ApiAuthContext.Provider value={valeur}>{children}</ApiAuthContext.Provider>;
}
