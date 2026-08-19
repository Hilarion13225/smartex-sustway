import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, Loader2, LogOut, PlusCircle, ServerCog, ShieldCheck } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Loader } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';

/**
 * Espace authentifié RÉEL (phase B) : profil + entreprises + création
 * d'entreprise, tout via l'API Quarkus. Distinct de /app (démonstration
 * complète sur données mockées, modules IA/scoring non encore construits
 * côté backend — voir ApiAuthContext.jsx).
 */
export default function EspaceReel() {
  const { estConnecte, chargement, utilisateur, entreprises, deconnecter, creerEntreprise } = useApiAuth();

  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({ raisonSociale: '', identifiantLegal: '', secteurCode: '', taille: 'PME' });
  const [chargementCreation, setChargementCreation] = useState(false);
  const [erreurCreation, setErreurCreation] = useState(null);
  const [succesCreation, setSuccesCreation] = useState(false);

  useEffect(() => {
    api
      .get('/api/v1/secteurs', { avecAuth: false })
      .then((liste) => {
        setSecteurs(liste);
        if (liste.length) setFormulaire((f) => ({ ...f, secteurCode: liste[0].code }));
      })
      .catch(() => setSecteurs([]));
  }, []);

  async function soumettreCreation(e) {
    e.preventDefault();
    setErreurCreation(null);
    setSuccesCreation(false);
    setChargementCreation(true);
    try {
      await creerEntreprise(formulaire);
      setSuccesCreation(true);
      setFormulaire((f) => ({ ...f, raisonSociale: '', identifiantLegal: '' }));
    } catch (err) {
      setErreurCreation(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargementCreation(false);
    }
  }

  if (chargement) return <Loader />;
  if (!estConnecte) return <Navigate to="/connexion-reelle" replace />;

  return (
    <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="btn-ghost -ml-2">
            Retour à l’accueil
          </Link>
          <button type="button" className="btn-secondary" onClick={deconnecter}>
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-ink-800 p-2 text-white">
              <ServerCog className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Espace connecté — données réelles</h1>
              <p className="text-sm text-ink-500">Phase B : ce que vous voyez ici vient effectivement de l’API.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-ink-200 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
              Profil
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Nom complet</dt>
                <dd className="font-medium">
                  {utilisateur?.prenom} {utilisateur?.nom}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Email</dt>
                <dd className="font-medium">{utilisateur?.email}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Statut du compte</dt>
                <dd className="font-medium">{utilisateur?.statut}</dd>
              </div>
              <div>
                <dt className="text-ink-500">2FA</dt>
                <dd className="font-medium">{utilisateur?.deuxfaActive ? 'Active' : 'Inactive'}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-brand-600" aria-hidden />
              Vos entreprises ({entreprises.length})
            </p>
            {entreprises.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">Aucune entreprise pour l’instant — créez-en une ci-dessous.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {entreprises.map((e) => (
                  <li key={e.id} className="rounded-xl border border-ink-200 p-3 text-sm">
                    <p className="font-medium">{e.raisonSociale}</p>
                    <p className="text-xs text-ink-500">
                      {e.identifiantLegal} — {e.secteurCode ?? 'secteur non renseigné'} — {e.taille ?? 'taille non renseignée'} —{' '}
                      {e.statut}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-ink-200 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <PlusCircle className="h-4 w-4 text-brand-600" aria-hidden />
              Créer une entreprise
            </p>
            <p className="mt-1 text-xs text-ink-500">
              RG24 (à enforcer en phase C) : la vérification de la formule d’abonnement n’est pas encore branchée —
              la création fonctionne dès maintenant, sans contrôle d’abonnement.
            </p>

            <form className="mt-4 space-y-4" onSubmit={soumettreCreation}>
              {erreurCreation ? <Alerte ton="rouge">{erreurCreation}</Alerte> : null}
              {succesCreation ? <Alerte ton="vert">Entreprise créée avec succès.</Alerte> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="raisonSociale">
                    Raison sociale
                  </label>
                  <input
                    id="raisonSociale"
                    required
                    className="input"
                    value={formulaire.raisonSociale}
                    onChange={(e) => setFormulaire({ ...formulaire, raisonSociale: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="identifiantLegal">
                    Identifiant légal
                  </label>
                  <input
                    id="identifiantLegal"
                    required
                    className="input"
                    value={formulaire.identifiantLegal}
                    onChange={(e) => setFormulaire({ ...formulaire, identifiantLegal: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="secteurCode">
                    Secteur d’activité
                  </label>
                  <select
                    id="secteurCode"
                    className="input"
                    value={formulaire.secteurCode}
                    onChange={(e) => setFormulaire({ ...formulaire, secteurCode: e.target.value })}
                  >
                    {secteurs.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="taille">
                    Taille
                  </label>
                  <select
                    id="taille"
                    className="input"
                    value={formulaire.taille}
                    onChange={(e) => setFormulaire({ ...formulaire, taille: e.target.value })}
                  >
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={chargementCreation}>
                {chargementCreation ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Créer l’entreprise
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
