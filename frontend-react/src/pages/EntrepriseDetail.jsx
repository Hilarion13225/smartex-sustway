import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, PlusCircle, Smartphone, Trash2, Wallet } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';

/**
 * Détail d'une entreprise : abonnement (avec reprise de paiement si en
 * attente — RG20), et gestion des sites (RG04, endpoints déjà prêts côté
 * API depuis la phase B, jamais encore branchés côté frontend jusqu'ici).
 */
export default function EntrepriseDetail() {
  const { entrepriseId } = useParams();
  const { entreprises, recupererAbonnement, payerAbonnement } = useApiAuth();

  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [abonnement, setAbonnement] = useState(null);
  const [chargementAbonnement, setChargementAbonnement] = useState(true);

  const [sites, setSites] = useState(null);
  const [chargementSites, setChargementSites] = useState(true);

  const rafraichirAbonnement = useCallback(() => {
    setChargementAbonnement(true);
    recupererAbonnement(entrepriseId)
      .then(setAbonnement)
      .catch(() => setAbonnement(null))
      .finally(() => setChargementAbonnement(false));
  }, [entrepriseId, recupererAbonnement]);

  const rafraichirSites = useCallback(() => {
    setChargementSites(true);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/sites`)
      .then(setSites)
      .catch(() => setSites([]))
      .finally(() => setChargementSites(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichirAbonnement();
    rafraichirSites();
  }, [rafraichirAbonnement, rafraichirSites]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to="/app" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux entreprises
      </Link>

      <PageTitre
        icone={MapPin}
        titre={entreprise.raisonSociale}
        description={`${entreprise.identifiantLegal}${entreprise.secteurCode ? ' — ' + entreprise.secteurCode : ''}${entreprise.taille ? ' — ' + entreprise.taille : ''}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader titre="Abonnement" icone={Wallet} />
          {chargementAbonnement ? (
            <Loader message="Chargement de l’abonnement…" />
          ) : abonnement ? (
            <AbonnementSection
              entrepriseId={entrepriseId}
              abonnement={abonnement}
              payerAbonnement={payerAbonnement}
              onPaye={rafraichirAbonnement}
            />
          ) : (
            <Vide message="Aucun abonnement trouvé pour cette entreprise." />
          )}
        </Card>

        <Card className="p-5">
          <CardHeader titre="Sites" icone={MapPin} />
          {chargementSites ? (
            <Loader message="Chargement des sites…" />
          ) : (
            <SitesSection entrepriseId={entrepriseId} sites={sites} onChange={rafraichirSites} />
          )}
        </Card>
      </div>
    </>
  );
}

function AbonnementSection({ entrepriseId, abonnement, payerAbonnement, onPaye }) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function payer(fournisseur) {
    setErreur(null);
    setChargement(true);
    try {
      await payerAbonnement(entrepriseId, fournisseur);
      onPaye();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-500">Formule</dt>
          <dd className="font-medium">{abonnement.formuleNom}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Périodicité</dt>
          <dd className="font-medium">{abonnement.periodicite ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Statut</dt>
          <dd>
            <Badge ton={abonnement.statut === 'ACTIF' ? 'vert' : 'ambre'}>{abonnement.statut}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">Échéance</dt>
          <dd className="font-medium">{abonnement.dateFin ?? '—'}</dd>
        </div>
      </dl>

      {abonnement.statut === 'EN_ATTENTE_PAIEMENT' ? (
        <div className="rounded-lg border border-ink-200 p-3">
          {erreur ? (
            <div className="mb-2">
              <Alerte ton="rouge">{erreur}</Alerte>
            </div>
          ) : null}
          <p className="mb-2 text-xs text-ink-500">
            Paiement PI-SPI/Wave — stub de développement (voir README), active l’abonnement immédiatement.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={chargement} onClick={() => payer('PI_SPI')}>
              {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wallet className="h-4 w-4" aria-hidden />}
              Payer via PI-SPI
            </button>
            <button type="button" className="btn-secondary" disabled={chargement} onClick={() => payer('WAVE')}>
              {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
              Payer via Wave
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SitesSection({ entrepriseId, sites, onChange }) {
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [formulaire, setFormulaire] = useState({ nom: '', adresse: '', ville: '', codePostal: '', paysCodeIso2: 'CI' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creerSite(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/sites`, formulaire);
      setFormulaire({ nom: '', adresse: '', ville: '', codePostal: '', paysCodeIso2: 'CI' });
      setAfficherFormulaire(false);
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function desactiverSite(siteId) {
    try {
      await api.delete(`/api/v1/entreprises/${entrepriseId}/sites/${siteId}`);
    } finally {
      onChange();
    }
  }

  return (
    <div className="space-y-4">
      {sites && sites.length > 0 ? (
        <ul className="space-y-2">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-ink-200 p-3 text-sm">
              <div>
                <p className="font-medium">{s.nom}</p>
                <p className="text-xs text-ink-500">{[s.ville, s.paysNom].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge ton={s.statut === 'ACTIF' ? 'vert' : 'neutre'}>{s.statut}</Badge>
                {s.statut !== 'ARCHIVE' ? (
                  <button
                    type="button"
                    className="btn-ghost p-1.5 text-rose-600"
                    title="Désactiver"
                    onClick={() => desactiverSite(s.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Vide message="Aucun site pour l’instant." />
      )}

      {afficherFormulaire ? (
        <form className="space-y-3 rounded-lg border border-ink-200 p-3" onSubmit={creerSite}>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="site-nom">
                Nom du site
              </label>
              <input
                id="site-nom"
                required
                className="input"
                value={formulaire.nom}
                onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="site-pays">
                Code pays (ISO alpha-2)
              </label>
              <input
                id="site-pays"
                required
                maxLength={2}
                className="input uppercase"
                value={formulaire.paysCodeIso2}
                onChange={(e) => setFormulaire({ ...formulaire, paysCodeIso2: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="label" htmlFor="site-ville">
                Ville
              </label>
              <input
                id="site-ville"
                className="input"
                value={formulaire.ville}
                onChange={(e) => setFormulaire({ ...formulaire, ville: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="site-adresse">
                Adresse
              </label>
              <input
                id="site-adresse"
                className="input"
                value={formulaire.adresse}
                onChange={(e) => setFormulaire({ ...formulaire, adresse: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={chargement}>
              {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Créer le site
            </button>
            <button type="button" className="btn-ghost" onClick={() => setAfficherFormulaire(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setAfficherFormulaire(true)}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          Ajouter un site
        </button>
      )}
    </div>
  );
}
