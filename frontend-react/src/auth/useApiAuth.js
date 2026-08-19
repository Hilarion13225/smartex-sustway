import { useContext } from 'react';
import { ApiAuthContext } from './ApiAuthContext';

export function useApiAuth() {
  const contexte = useContext(ApiAuthContext);
  if (!contexte) throw new Error('useApiAuth doit être utilisé à l’intérieur de ApiAuthProvider');
  return contexte;
}
