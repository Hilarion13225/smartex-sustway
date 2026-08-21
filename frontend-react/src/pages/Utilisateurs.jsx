import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, Minus, ShieldCheck, Users } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
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
 * RG05 / section 4 — qui accède à l'entreprise, avec quel rôle, et ce que
 * chaque rôle peut réellement faire compte tenu de la formule souscrite
 * (le croisement rôle × formule est celui appliqué par l'application,
 * auth/permissions.js).
 */
export default function Utilisateurs() {
  const { entrepriseId } = useParams();
  const { entreprises, utilisateur } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [membres, setMembres] = useState(null);
  const [abonnement, setAbonnement] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/membres`).catch(() => []),
      api.get(`/api/v1/entreprises/${entrepriseId}/abonnement`).catch(() => null),
    ])
      .then(([listeMembres, abo]) => {
        setMembres(listeMembres);
        setAbonnement(abo);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  const rolesPresents = useMemo(() => {
    const codes = new Set((membres ?? []).map((m) => m.roleCode).filter((code) => PERMISSIONS_PAR_ROLE[code]));
    return codes.size > 0 ? [...codes] : Object.keys(PERMISSIONS_PAR_ROLE);
  }, [membres]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const formule = abonnement?.formuleCode;

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
      />

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
                detail="Comptes protégés par la 2FA (RG36)"
                icone={KeyRound}
                ton={membres.every((m) => m.deuxfaActive) ? 'vert' : 'ambre'}
              />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="mb-6 p-0">
              <CardHeader titre="Accès à l’entreprise" icone={Users} sousTitre="Rattachements RG05 actifs" />
              {membres.length > 0 ? (
                <Tableau entetes={['Utilisateur', 'Rôle', 'Périmètre', '2FA', 'Depuis', 'Statut']}>
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
              L’invitation d’un nouveau collaborateur passe encore par l’équipe Smartex : l’API expose la liste des
              rattachements en lecture, la création d’accès n’est pas ouverte en libre-service.
            </Alerte>
          </div>
        </>
      )}
    </>
  );
}
