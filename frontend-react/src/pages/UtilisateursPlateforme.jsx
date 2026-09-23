import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Building2, KeyRound, ShieldCheck, Users } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE, ROLES_SUPERVISION } from '../auth/permissions';

/**
 * Les utilisateurs de toute la plateforme, pour la gouvernance SMARTEX.
 *
 * <h2>Pourquoi une agrégation côté client</h2>
 *
 * L'API n'expose aucune liste d'utilisateurs de portée plateforme :
 * `/api/v1/utilisateurs` se limite à `/moi`, et les comptes ne se lisent que
 * par organisation (`/entreprises/{id}/membres`). Cette page reconstitue donc
 * la vue d'ensemble en interrogeant chaque organisation, exactement comme
 * `lib/portefeuille.js` le fait déjà pour les missions — le procédé est celui
 * de la maison, pas une exception inventée ici.
 *
 * Ce que cela coûte, et qu'il faut savoir avant de s'y fier : une requête par
 * organisation. À deux organisations c'est indolore ; à deux cents, la page
 * deviendra lente et il faudra un endpoint dédié. La dépendance est consignée
 * dans le rapport sous BACKEND_DEPENDENCY, avec le contrat attendu.
 *
 * <h2>Ce que la page ne montre pas</h2>
 *
 * La « dernière activité » par utilisateur est demandée mais n'existe nulle
 * part : `MembreEntrepriseDto` porte `dateAffectation`, c'est-à-dire la date
 * du rattachement, pas celle de la dernière connexion. La colonne affiche donc
 * l'affectation sous son vrai nom plutôt qu'une activité qu'aucune donnée ne
 * soutient.
 *
 * Un même compte peut être rattaché à plusieurs organisations : il apparaît
 * une fois, avec la liste de ses rattachements. Le dédoublonnage se fait sur
 * `utilisateurId`, jamais sur l'e-mail, qui n'est pas la clé.
 */
export default function UtilisateursPlateforme() {
  const { entreprises, roleCourant, utilisateur } = useApiAuth();
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('TOUS');
  const [filtreOrganisation, setFiltreOrganisation] = useState('TOUTES');
  // `enCours` porte la clé du compte en cours de traitement : il désarme ses
  // seuls boutons, pas ceux de toute la table.
  const [enCours, setEnCours] = useState(null);
  const [message, setMessage] = useState(null);
  const monId = utilisateur?.id ?? null;

  const superviseur = ROLES_SUPERVISION.has(roleCourant);

  useEffect(() => {
    if (!superviseur) {
      setChargement(false);
      return undefined;
    }
    let vivant = true;
    setChargement(true);

    Promise.all(
      (entreprises ?? []).map((organisation) =>
        api
          .get(`/api/v1/entreprises/${organisation.id}/membres`)
          .then((membres) => ({ organisation, membres: membres ?? [] }))
          // Une organisation qui refuse ou échoue ne doit pas vider la page
          // entière : elle sort du total, les autres restent lisibles.
          .catch(() => ({ organisation, membres: [] }))
      )
    ).then((resultats) => {
      if (!vivant) return;
      const parUtilisateur = new Map();
      resultats.forEach(({ organisation, membres }) => {
        membres.forEach((membre) => {
          const cle = membre.utilisateurId ?? membre.id;
          const existant = parUtilisateur.get(cle);
          const rattachement = {
            organisationId: organisation.id,
            organisationNom: organisation.raisonSociale,
            roleCode: membre.roleCode,
            statut: membre.statut,
            dateAffectation: membre.dateAffectation,
          };
          if (existant) {
            existant.rattachements.push(rattachement);
            return;
          }
          parUtilisateur.set(cle, {
            cle,
            nom: membre.nom,
            prenom: membre.prenom,
            email: membre.email,
            deuxfaActive: membre.deuxfaActive,
            // Statut du compte lui-même, distinct du statut d'un rattachement :
            // un compte suspendu ne peut plus se connecter, un rattachement
            // révoqué lui retire seulement une organisation.
            statutCompte: membre.statutCompte ?? null,
            rattachements: [rattachement],
          });
        });
      });
      setComptes([...parUtilisateur.values()]);
      setChargement(false);
    });

    return () => {
      vivant = false;
    };
  }, [entreprises, superviseur]);

  const roles = useMemo(() => {
    const trouves = new Set();
    comptes.forEach((c) => c.rattachements.forEach((r) => r.roleCode && trouves.add(r.roleCode)));
    return [...trouves].sort();
  }, [comptes]);

  const filtres = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    return comptes.filter((compte) => {
      const correspondTexte =
        !requete ||
        `${compte.prenom ?? ''} ${compte.nom ?? ''} ${compte.email ?? ''}`.toLowerCase().includes(requete);
      const correspondRole =
        filtreRole === 'TOUS' || compte.rattachements.some((r) => r.roleCode === filtreRole);
      const correspondOrganisation =
        filtreOrganisation === 'TOUTES' ||
        compte.rattachements.some((r) => r.organisationId === filtreOrganisation);
      return correspondTexte && correspondRole && correspondOrganisation;
    });
  }, [comptes, recherche, filtreRole, filtreOrganisation]);

  /**
   * Déclenche l'envoi d'un lien de réinitialisation.
   *
   * L'administrateur ne choisit aucun mot de passe et n'en voit aucun : le
   * lien part vers l'intéressé, qui seul le fixera. C'est ce qui empêche un
   * administrateur de se connecter sous l'identité d'un utilisateur — et donc
   * d'agir en son nom sur des évaluations qui doivent rester opposables.
   */
  async function reinitialiser(compte) {
    setEnCours(compte.cle);
    setMessage(null);
    try {
      await api.post(`/api/v1/utilisateurs/${compte.cle}/reinitialisation`, {});
      setMessage({
        ton: 'succes',
        texte: `Un lien de réinitialisation a été envoyé à ${compte.email}. Son mot de passe actuel reste inchangé tant qu’il ne l’a pas suivi.`,
      });
    } catch (e) {
      setMessage({ ton: 'erreur', texte: e?.message ?? 'Envoi impossible.' });
    } finally {
      setEnCours(null);
    }
  }

  async function changerStatut(compte, statut) {
    setEnCours(compte.cle);
    setMessage(null);
    try {
      const misAJour = await api.put(`/api/v1/utilisateurs/${compte.cle}/statut`, { statut });
      setComptes((avant) =>
        avant.map((c) => (c.cle === compte.cle ? { ...c, statutCompte: misAJour?.statut ?? statut } : c))
      );
      setMessage({
        ton: 'succes',
        texte:
          statut === 'SUSPENDU'
            ? `${compte.prenom} ${compte.nom} ne peut plus se connecter.`
            : `${compte.prenom} ${compte.nom} peut de nouveau se connecter.`,
      });
    } catch (e) {
      setMessage({ ton: 'erreur', texte: e?.message ?? 'Changement de statut impossible.' });
    } finally {
      setEnCours(null);
    }
  }

  if (!superviseur) {
    return (
      <Vide message="Cette vue est réservée à l’administration de la plateforme." />
    );
  }
  if (chargement) return <Loader message="Recensement des comptes de la plateforme…" />;

  return (
    <div className="space-y-6">
      <Breadcrumb
        elements={[
          { libelle: 'Tableau de bord', vers: '/app' },
          { libelle: 'Utilisateurs de la plateforme' },
        ]}
      />

      <PageTitre
        titre="Utilisateurs de la plateforme"
        description="Tous les comptes rattachés à une organisation, quel que soit son portefeuille."
        icone={Users}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-500">Rechercher</span>
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, prénom ou adresse"
              className="input w-full"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-500">Rôle</span>
            <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} className="input">
              <option value="TOUS">Tous les rôles</option>
              {roles.map((code) => (
                <option key={code} value={code}>
                  {ROLE_LIBELLE[code] ?? code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-500">Organisation</span>
            <select
              value={filtreOrganisation}
              onChange={(e) => setFiltreOrganisation(e.target.value)}
              className="input"
            >
              <option value="TOUTES">Toutes les organisations</option>
              {(entreprises ?? []).map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.raisonSociale}
                </option>
              ))}
            </select>
          </label>
          <p className="ml-auto text-sm text-ink-500">
            {filtres.length} compte{filtres.length > 1 ? 's' : ''}
            {filtres.length !== comptes.length ? ` sur ${comptes.length}` : ''}
          </p>
        </div>
      </Card>

      {message ? (
        <Alerte ton={message.ton === 'erreur' ? 'rouge' : 'vert'}>{message.texte}</Alerte>
      ) : null}

      <Card className="p-5">
        {filtres.length === 0 ? (
          <Vide message="Aucun compte ne correspond à cette recherche." />
        ) : (
          <Tableau entetes={['Utilisateur', 'Organisation et rôle', 'Statut', 'Affecté le', '2FA', 'Administration']}>
            {filtres.map((compte) => (
              <tr key={compte.cle}>
                <td className="td">
                  <p className="font-medium text-ink-900">
                    {compte.prenom} {compte.nom}
                  </p>
                  <p className="text-xs text-ink-500">{compte.email}</p>
                </td>
                <td className="td">
                  <ul className="space-y-1">
                    {compte.rattachements.map((r) => (
                      <li key={`${compte.cle}-${r.organisationId}-${r.roleCode}`} className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/app/${r.organisationId}`}
                          className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-600"
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {r.organisationNom}
                        </Link>
                        <Badge ton="bleu">{ROLE_LIBELLE[r.roleCode] ?? r.roleCode}</Badge>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="td">
                  {compte.statutCompte === 'SUSPENDU' ? (
                    <Badge ton="rouge">Suspendu</Badge>
                  ) : compte.rattachements.every((r) => r.statut === 'ACTIF') ? (
                    <Badge ton="vert">Actif</Badge>
                  ) : (
                    <Badge ton="ambre">Accès révoqué</Badge>
                  )}
                </td>
                {/* `dateAffectation` et non « dernière activité » : c'est la
                    date du rattachement, la seule que l'API expose. */}
                <td className="td text-sm text-ink-600">
                  {compte.rattachements[0]?.dateAffectation
                    ? new Date(compte.rattachements[0].dateAffectation).toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td className="td">
                  {compte.deuxfaActive ? (
                    <Badge ton="vert" icone={ShieldCheck}>
                      Activée
                    </Badge>
                  ) : (
                    <span className="text-sm text-ink-400">—</span>
                  )}
                </td>
                {/* Deux gestes seulement, et aucun ne touche au mot de passe :
                    l'administrateur débloque, l'intéressé choisit. */}
                <td className="td">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={enCours === compte.cle}
                      onClick={() => reinitialiser(compte)}
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                      Réinitialiser le mot de passe
                    </button>
                    {compte.statutCompte === 'SUSPENDU' ? (
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        disabled={enCours === compte.cle}
                        onClick={() => changerStatut(compte, 'ACTIF')}
                      >
                        Réactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost text-xs text-rose-600"
                        disabled={enCours === compte.cle || compte.cle === monId}
                        title={compte.cle === monId ? 'Vous ne pouvez pas suspendre votre propre compte' : undefined}
                        onClick={() => changerStatut(compte, 'SUSPENDU')}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                        Suspendre
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Tableau>
        )}
      </Card>

      <p className="text-xs text-ink-400">
        Les rôles et les rattachements se gèrent depuis la fiche de l’organisation. Aucune action ci-dessus ne révèle ni ne fixe un mot de passe.
      </p>
    </div>
  );
}
