import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Leaf, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { UTILISATEURS, entrepriseParId } from '../data/mock';
import { ROLE_LIBELLE } from '../auth/permissions';
import { PLAN_LIBELLE } from '../data/formules';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui';
export default function Connexion() {
  const {
    connecter
  } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-3xl px-5">
        <Link to="/" className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-brand-600 p-2 text-white">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Connexion à Smartex Sustway</h1>
              <p className="text-sm text-ink-500">
                Sélectionnez un profil de démonstration : les permissions affichées dépendent du rôle et de la formule.
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {UTILISATEURS.map(utilisateur => {
            const entreprise = entrepriseParId(utilisateur.entrepriseId);
            return <li key={utilisateur.id}>
                  <button type="button" className="flex w-full items-center gap-4 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40" onClick={() => {
                connecter(utilisateur.id);
                navigate('/app');
              }}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                      <UserRound className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{utilisateur.nom}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {ROLE_LIBELLE[utilisateur.role]}
                        {entreprise ? ` — ${entreprise.raisonSociale}` : ' — Smartex Expertises'}
                      </span>
                    </span>
                    <Badge ton={utilisateur.plan === 'AVANCEES' ? 'vert' : utilisateur.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                      {PLAN_LIBELLE[utilisateur.plan]}
                    </Badge>
                    <span className="hidden items-center gap-1 text-xs text-ink-500 sm:flex">
                      {utilisateur.deuxFA === 'APP' ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> : utilisateur.deuxFA === 'SMS' ? <Smartphone className="h-3.5 w-3.5" aria-hidden /> : null}
                      {utilisateur.deuxFA === 'AUCUNE' ? 'Sans 2FA' : `2FA ${utilisateur.deuxFA === 'APP' ? 'application' : 'SMS'}`}
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-400" aria-hidden />
                  </button>
                </li>;
          })}
          </ul>

          <p className="mt-6 text-xs text-ink-500">
            Aucun mot de passe n’est demandé : cette maquette fonctionne intégralement sur des données de démonstration.
          </p>
        </div>
      </div>
    </div>;
}
