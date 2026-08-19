import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { UTILISATEURS, entrepriseParId } from '../data/mock';
import { possedePermission } from './permissions';
export const AuthContext = createContext(null);
const CLE_STOCKAGE = 'sustway.utilisateur';
export function AuthProvider({
  children
}) {
  const [utilisateurId, setUtilisateurId] = useState(() => localStorage.getItem(CLE_STOCKAGE));
  const [planSurcharge, setPlanSurcharge] = useState(null);
  useEffect(() => {
    if (utilisateurId) localStorage.setItem(CLE_STOCKAGE, utilisateurId);else localStorage.removeItem(CLE_STOCKAGE);
  }, [utilisateurId]);
  const utilisateur = useMemo(() => UTILISATEURS.find(u => u.id === utilisateurId) ?? null, [utilisateurId]);
  const entreprise = entrepriseParId(utilisateur?.entrepriseId);
  const planActif = planSurcharge ?? utilisateur?.plan ?? 'FREE';
  const connecter = useCallback(id => {
    setPlanSurcharge(null);
    setUtilisateurId(id);
  }, []);
  const deconnecter = useCallback(() => {
    setPlanSurcharge(null);
    setUtilisateurId(null);
  }, []);
  const peut = useCallback(permission => utilisateur ? possedePermission(utilisateur.role, planActif, permission) : false, [utilisateur, planActif]);
  const valeur = useMemo(() => ({
    utilisateur,
    entreprise,
    planActif,
    connecter,
    deconnecter,
    changerFormule: setPlanSurcharge,
    peut
  }), [utilisateur, entreprise, planActif, connecter, deconnecter, peut]);
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}
