import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Hourglass, KeyRound, Minus, Pencil, ShieldCheck, UserMinus, UserPlus, Users, XCircle } from 'lucide-react';
import Revele from '../components/Revele';
import SustwayLoader from '../components/SustwayLoader';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { PERMISSIONS_PAR_ROLE, ROLE_LIBELLE, possedePermission } from '../auth/permissions';
import { formaterDate } from '../lib/export';

const PERMISSIONS_LIBELLE = {
  'entreprise:creer': 'Créer une entreprise',
  'entreprise:modifier': 'Modifier l’entreprise et ses sites',
  'audit:creer': 'Lancer une mission d’audit',
  'audit:modifier': 'Modifier une mission',
  'preuve:deposer': 'Déposer des documents et preuves',
  'revue:traiter': 'Traiter la file de revue experte',
  'referentiel:administrer': 'Administrer les référentiels',
  'rapport:consulter': 'Consulter les rapports',
  'rapport:detaille': 'Accéder au rapport détaillé',
  'bailleur:consulter': 'Consulter l’indice IFC/SFI',
};

const TOUTES_PERMISSIONS = Object.keys(PERMISSIONS_LIBELLE);

/**
 * Rôles qu'une entreprise cliente attribue elle-même — les rôles internes
 * Smartex n'en font pas partie. EMPLOYE retiré (décision produit, v1 :
 * seul le responsable de l'entreprise est audité) — voir même commentaire
 * côté API, MembreEntrepriseResource.ROLES_ATTRIBUABLES.
 */
const ROLES_ATTRIBUABLES = ['RESPONSABLE_ENTREPRISE', 'VISITEUR'];

/**
 * RG05 / section 4 — qui accède à l'entreprise, avec quel rôle, et ce que
 * chaque rôle peut réellement faire compte tenu de la formule souscrite
 * (le croisement rôle × formule est celui appliqué par l'application,
 * auth/permissions.js).
 */
export default function Utilisateurs() {
  const { entrepriseId } = useParams();
  const { entreprises, utilisateur, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [membres, setMembres] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [sites, setSites] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [membreEnEdition, setMembreEnEdition] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [messageSucces, setMessageSucces] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/membres`).catch(() => []),
      api.get(`/api/v1/entreprises/${entrepriseId}/membres/invitations`).catch(() => []),
      api.get(`/api/v1/entreprises/${entrepriseId}/abonnement`).catch(() => null),
      api.get(`/api/v1/entreprises/${entrepriseId}/sites`).catch(() => []),
    ])
      .then(([listeMembres, listeInvitations, abo, listeSites]) => {
        setMembres(listeMembres);
        setInvitations(listeInvitations);
        setAbonnement(abo);
        setSites(listeSites);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function revoquer(membre) {
    setErreur(null);
    try {
      await api.delete(`/api/v1/entreprises/${entrepriseId}/membres/${membre.id}`);
      rafraichir();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  async function revoquerInvitation(invitation) {
    setErreur(null);
    try {
      await api.delete(`/api/v1/entreprises/${entrepriseId}/membres/invitations/${invitation.id}`);
      rafraichir();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  const rolesPresents = useMemo(() => {
    const codes = new Set((membres ?? []).map((m) => m.roleCode).filter((code) => PERMISSIONS_PAR_ROLE[code]));
    return codes.size > 0 ? [...codes] : Object.keys(PERMISSIONS_PAR_ROLE);
  }, [membres]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const formule = abonnement?.formuleCode;
  const peutAdministrer = peut('entreprise:modifier', formule);

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’entreprise
      </Link>

      <PageTitre
        icone={Users}
        titre="Utilisateurs et permissions"
        description={`${entreprise.raisonSociale} — accès accordés et droits effectifs de chaque rôle sous la formule ${abonnement?.formuleNom ?? '—'}.`}
        actions={
          peutAdministrer ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setMembreEnEdition(null);
                setFormulaireOuvert(true);
              }}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Ajouter un collaborateur
            </button>
          ) : null
        }
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      {messageSucces ? <Alerte ton="vert">{messageSucces}</Alerte> : null}

      {formulaireOuvert ? (
        <Revele>
          <Card className="mb-6 p-5">
            <CardHeader
              titre={membreEnEdition ? 'Modifier un accès' : 'Accorder un accès'}
              icone={UserPlus}
              sousTitre="S'il n'a pas encore de compte Smartex Sustway, une invitation par email lui est envoyée ; l'accès peut être limité à un site."
            />
            <FormulaireMembre
              entrepriseId={entrepriseId}
              membre={membreEnEdition}
              sites={sites}
              onTermine={() => {
                setFormulaireOuvert(false);
                setMembreEnEdition(null);
              }}
              onEnregistre={(invitationEnvoyee, email) => {
                setMessageSucces(
                  invitationEnvoyee
                    ? `Invitation envoyée à ${email} — l'accès sera actif dès qu'iel aura créé son compte.`
                    : null
                );
                rafraichir();
              }}
            />
          </Card>
        </Revele>
      ) : null}

      {chargement ? (
        <Loader message="Chargement des accès…" />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard libelle="Utilisateurs rattachés" valeur={membres.length} icone={Users} ton="bleu" />
              <StatCard
                libelle="Rôles distincts"
                valeur={new Set(membres.map((m) => m.roleCode)).size}
                icone={ShieldCheck}
                ton="neutre"
              />
              <StatCard
                libelle="Double authentification"
                valeur={`${membres.filter((m) => m.deuxfaActive).length} / ${membres.length}`}
                detail="Comptes protégés par la 2FA"
                icone={KeyRound}
                ton={membres.every((m) => m.deuxfaActive) ? 'vert' : 'ambre'}
              />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="mb-6 p-0">
              <CardHeader titre="Accès à l’entreprise" icone={Users} sousTitre="Rattachements actifs" />
              {membres.length > 0 ? (
                <Tableau
                  entetes={[
                    'Utilisateur',
                    'Rôle',
                    'Périmètre',
                    '2FA',
                    'Depuis',
                    'Statut',
                    ...(peutAdministrer ? ['Actions'] : []),
                  ]}
                >
                  {membres.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td">
                        <p className="font-medium text-ink-900">
                          {m.prenom} {m.nom}
                          {m.utilisateurId === utilisateur?.id ? (
                            <span className="ml-2 text-xs text-ink-400">(vous)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-ink-500">{m.email}</p>
                      </td>
                      <td className="td">
                        <Badge ton="bleu">{ROLE_LIBELLE[m.roleCode] ?? m.roleNom}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{m.siteNom ?? 'Toute l’entreprise'}</td>
                      <td className="td">
                        <Badge ton={m.deuxfaActive ? 'vert' : 'neutre'}>{m.deuxfaActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{formaterDate(m.dateAffectation)}</td>
                      <td className="td">
                        <Badge ton={m.statut === 'ACTIF' ? 'vert' : 'neutre'}>{m.statut}</Badge>
                      </td>
                      {peutAdministrer ? (
                        <td className="td">
                          {m.utilisateurId === utilisateur?.id || m.statut !== 'ACTIF' ? (
                            <span className="text-xs text-ink-400">—</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="btn-ghost p-1.5"
                                title="Modifier le rôle ou le périmètre"
                                onClick={() => {
                                  setMembreEnEdition(m);
                                  setFormulaireOuvert(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost p-1.5 text-rose-600"
                                title="Retirer l’accès"
                                onClick={() => revoquer(m)}
                              >
                                <UserMinus className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide message="Aucun utilisateur rattaché à cette entreprise." />
                </div>
              )}
            </Card>
          </Revele>

          {invitations.length > 0 ? (
            <Revele delai={100}>
              <Card className="mb-6 p-0">
                <CardHeader
                  titre="Invitations en attente"
                  icone={Hourglass}
                  sousTitre="Le rôle et le site seront appliqués automatiquement dès la création du compte."
                />
                <Tableau
                  entetes={['E-mail', 'Rôle', 'Périmètre', 'Envoyée le', 'Expire le', ...(peutAdministrer ? [''] : [])]}
                >
                  {invitations.map((i) => (
                    <tr key={i.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td font-medium text-ink-900">{i.email}</td>
                      <td className="td">
                        <Badge ton="bleu">{ROLE_LIBELLE[i.roleCode] ?? i.roleNom}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{i.siteNom ?? 'Toute l’entreprise'}</td>
                      <td className="td text-sm text-ink-600">{formaterDate(i.createdAt)}</td>
                      <td className="td text-sm text-ink-600">{formaterDate(i.expireAt)}</td>
                      {peutAdministrer ? (
                        <td className="td text-right">
                          <button
                            type="button"
                            className="btn-ghost p-1.5 text-rose-600"
                            title="Annuler l’invitation"
                            onClick={() => revoquerInvitation(i)}
                          >
                            <XCircle className="h-4 w-4" aria-hidden />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </Tableau>
              </Card>
            </Revele>
          ) : null}

          <Revele delai={120}>
            <Card className="p-0">
              <CardHeader
                titre="Droits effectifs par rôle"
                icone={ShieldCheck}
                sousTitre="Croisement rôle × formule souscrite — une permission grisée est retirée par la formule."
              />
              <Tableau entetes={['Permission', ...rolesPresents.map((code) => ROLE_LIBELLE[code] ?? code)]}>
                {TOUTES_PERMISSIONS.map((permission) => (
                  <tr key={permission} className="transition-colors hover:bg-ink-50/60">
                    <td className="td">
                      <p className="text-sm text-ink-900">{PERMISSIONS_LIBELLE[permission]}</p>
                      <p className="font-mono text-xs text-ink-400">{permission}</p>
                    </td>
                    {rolesPresents.map((role) => (
                      <td key={role} className="td">
                        {possedePermission(role, formule, permission) ? (
                          <Check className="h-4 w-4 text-emerald-600" aria-label="Autorisé" />
                        ) : (
                          <Minus className="h-4 w-4 text-ink-300" aria-label="Refusé" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Tableau>
            </Card>
          </Revele>

          <div className="mt-6">
            <Alerte ton="bleu">
              Un accès retiré reste listé avec le statut INACTIF : les dépôts de preuves et évaluations déjà réalisés
              par ce collaborateur conservent leur traçabilité. Les rôles internes Smartex ne s’attribuent pas depuis
              cet écran.
            </Alerte>
          </div>
        </>
      )}
    </>
  );
}

function FormulaireMembre({ entrepriseId, membre, sites, onTermine, onEnregistre }) {
  const [formulaire, setFormulaire] = useState({
    email: membre?.email ?? '',
    roleCode: membre?.roleCode ?? 'VISITEUR',
    siteId: membre?.siteId ?? '',
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const perimetre = { roleCode: formulaire.roleCode, siteId: formulaire.siteId || null };
      if (membre) {
        await api.put(`/api/v1/entreprises/${entrepriseId}/membres/${membre.id}`, perimetre);
        onEnregistre(false);
      } else {
        const reponse = await api.post(`/api/v1/entreprises/${entrepriseId}/membres`, { email: formulaire.email, ...perimetre });
        // Le collaborateur n'avait pas encore de compte : une invitation a
        // été envoyée à la place d'un rattachement direct (InvitationDto
        // porte expireAt, absent de MembreEntrepriseDto).
        onEnregistre('expireAt' in reponse, formulaire.email);
      }
      onTermine();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={enregistrer}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="membre-email">
            E-mail du collaborateur
          </label>
          <input
            id="membre-email"
            type="email"
            required
            disabled={Boolean(membre)}
            className="input"
            placeholder="collaborateur@entreprise.ci"
            value={formulaire.email}
            onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="membre-role">
            Rôle
          </label>
          <select
            id="membre-role"
            className="input"
            value={formulaire.roleCode}
            onChange={(e) => setFormulaire({ ...formulaire, roleCode: e.target.value })}
          >
            {ROLES_ATTRIBUABLES.map((code) => (
              <option key={code} value={code}>
                {ROLE_LIBELLE[code] ?? code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="membre-site">
            Périmètre
          </label>
          <select
            id="membre-site"
            className="input"
            value={formulaire.siteId}
            onChange={(e) => setFormulaire({ ...formulaire, siteId: e.target.value })}
          >
            <option value="">Toute l’entreprise</option>
            {sites
              .filter((s) => s.statut === 'ACTIF')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          {membre ? 'Enregistrer' : 'Accorder l’accès'}
        </button>
        <button type="button" className="btn-ghost" onClick={onTermine}>
          Annuler
        </button>
      </div>

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
    </form>
  );
}
