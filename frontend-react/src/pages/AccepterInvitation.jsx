import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, UserPlus } from 'lucide-react';
import CadreAuth from '../components/CadreAuth';
import SustwayLoader from '../components/SustwayLoader';
import { Alerte, Badge } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';
import { ApiError } from '../lib/apiClient';
import { ROLE_LIBELLE } from '../auth/permissions';

const ATOUTS = [
  'Vos scores, preuves et plans d’action réunis dans un seul espace sécurisé.',
  'Double authentification disponible sur chaque compte.',
  'Suivi de la conformité domaine par domaine, dans le temps.',
];

/**
 * RG05 — acceptation d'une invitation reçue par email (collaborateur sans
 * compte existant, voir InvitationResource côté API) : crée le compte et
 * rattache directement à l'entreprise avec le rôle choisi par l'invitant,
 * sans passer par le tunnel d'inscription complet (pas de choix de
 * formule : l'entreprise existe déjà).
 */
export default function AccepterInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { consulterInvitation, accepterInvitation } = useApiAuth();

  const [statut, setStatut] = useState('chargement'); // 'chargement' | 'valide' | 'invalide'
  const [invitation, setInvitation] = useState(null);
  const [erreurChargement, setErreurChargement] = useState(null);

  const [formulaire, setFormulaire] = useState({ nom: '', prenom: '', motDePasse: '' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    consulterInvitation(token)
      .then((i) => {
        setInvitation(i);
        setStatut(i.valide ? 'valide' : 'invalide');
        if (!i.valide) setErreurChargement('Cette invitation a expiré ou a déjà été utilisée.');
      })
      .catch((err) => {
        setStatut('invalide');
        setErreurChargement(err instanceof ApiError ? err.message : 'Invitation introuvable.');
      });
  }, [token, consulterInvitation]);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await accepterInvitation(token, formulaire);
      navigate('/app');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <CadreAuth
      badge={
        <>
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Invitation
        </>
      }
      titre="Rejoindre une entreprise"
      description="Créez votre compte pour accepter l’invitation reçue par email."
      atouts={ATOUTS}
    >
      {statut === 'chargement' ? (
        <div className="flex justify-center py-8">
          <SustwayLoader taille="lg" />
        </div>
      ) : null}

      {statut === 'invalide' ? (
        <div className="space-y-4 text-center">
          <Alerte ton="rouge">{erreurChargement}</Alerte>
          <p className="text-sm text-ink-500">
            Demandez à la personne qui vous a invité de vous renvoyer une invitation.
          </p>
        </div>
      ) : null}

      {statut === 'valide' && invitation ? (
        <form className="space-y-5" onSubmit={soumettre}>
          <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
            <Mail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <p className="text-sm text-brand-800">
              <strong>{invitation.entrepriseNom}</strong> vous invite en tant que{' '}
              <Badge ton="vert">{ROLE_LIBELLE[invitation.roleCode] ?? invitation.roleNom}</Badge>
            </p>
          </div>

          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="invitation-prenom">
                Prénom
              </label>
              <input
                id="invitation-prenom"
                required
                className="input"
                value={formulaire.prenom}
                onChange={(e) => setFormulaire({ ...formulaire, prenom: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="invitation-nom">
                Nom
              </label>
              <input
                id="invitation-nom"
                required
                className="input"
                value={formulaire.nom}
                onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="invitation-mdp">
              Mot de passe (10 caractères minimum)
            </label>
            <input
              id="invitation-mdp"
              type="password"
              required
              minLength={10}
              className="input"
              value={formulaire.motDePasse}
              onChange={(e) => setFormulaire({ ...formulaire, motDePasse: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-vitrine w-full justify-center" disabled={chargement}>
            {chargement ? <SustwayLoader taille="sm" /> : null}
            Créer mon compte et rejoindre {invitation.entrepriseNom}
          </button>
        </form>
      ) : null}
    </CadreAuth>
  );
}
