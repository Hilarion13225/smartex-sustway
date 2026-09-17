import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Pencil,
  PlusCircle,
  RotateCcw,
  Smartphone,
  TrendingUp,
  Trash2,
  Wallet,
} from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import { useApiAuth } from '../auth/useApiAuth';
import { groupesDeLOrganisation } from '../lib/navigationOrganisation';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { COULEURS, GraphiqueLigne } from '../components/charts';
import { api, ApiError } from '../lib/apiClient';
import PageIntrouvable from './PageIntrouvable';
import { formaterDate } from '../lib/export';

const TAILLES = [
  { code: 'TPE', libelle: 'TPE' },
  { code: 'PME', libelle: 'PME' },
  { code: 'ETI', libelle: 'ETI' },
  { code: 'GRANDE_ENTREPRISE', libelle: 'Grande entreprise' },
];

/**
 * Détail d'une entreprise : fiche légale (RG02), abonnement (avec reprise
 * de paiement si en attente — RG20), gestion des sites (RG04), et accès aux
 * audits RSE (RG10/RG11).
 */
export default function EntrepriseDetail() {
  const { entrepriseId } = useParams();
  const { entreprises, recupererAbonnement, payerAbonnement, modifierEntreprise, peut, roleCourant } = useApiAuth();

  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [abonnement, setAbonnement] = useState(null);
  const [chargementAbonnement, setChargementAbonnement] = useState(true);

  const [sites, setSites] = useState(null);
  const [chargementSites, setChargementSites] = useState(true);
  const [erreurSites, setErreurSites] = useState(null);

  const [editionFiche, setEditionFiche] = useState(false);

  const rafraichirAbonnement = useCallback(() => {
    setChargementAbonnement(true);
    recupererAbonnement(entrepriseId)
      .then(setAbonnement)
      .catch(() => setAbonnement(null))
      .finally(() => setChargementAbonnement(false));
  }, [entrepriseId, recupererAbonnement]);

  const rafraichirSites = useCallback(() => {
    setChargementSites(true);
    setErreurSites(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/sites`)
      // Un échec rendait `[]`, et la carte annonçait « aucun site » : une
      // organisation multi-sites paraissait n'en avoir aucun.
      .catch((err) => {
        setErreurSites(err instanceof ApiError ? err.message : 'Chargement des sites impossible');
        return null;
      })
      .then(setSites)
      .finally(() => setChargementSites(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichirAbonnement();
    rafraichirSites();
  }, [rafraichirAbonnement, rafraichirSites]);

  if (!entreprise) {
    // La route `:entrepriseId` capte tout segment unique sous /app : une faute
    // de frappe arrivait donc ici, et n'y trouvait qu'un état vide sans
    // chemin de retour, alors que la page introuvable existe depuis P1.4 et
    // sait justement quoi proposer. Elle ne distingue pas l'organisation
    // inexistante de l'inaccessible — l'ancien libellé ne le faisait pas non
    // plus, et ne pas révéler laquelle des deux est le bon réflexe.
    return <PageIntrouvable />;
  }

  const peutAdministrer = peut('entreprise:modifier', abonnement?.formuleCode);

  return (
    <>
      <Breadcrumb
        elements={[
          { libelle: 'Organisations', vers: '/app/entreprises' },
          { libelle: entreprise.raisonSociale },
        ]}
      />

      <PageTitre
        icone={MapPin}
        titre={entreprise.raisonSociale}
        description={`${entreprise.identifiantLegal}${entreprise.secteurCode ? ' — ' + entreprise.secteurCode : ''}${entreprise.taille ? ' — ' + entreprise.taille : ''}`}
        actions={
          peutAdministrer ? (
            <button type="button" className="btn-secondary" onClick={() => setEditionFiche((v) => !v)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Modifier la fiche
            </button>
          ) : null
        }
      />

      <AccesOrganisation
        entrepriseId={entrepriseId}
        peut={peut}
        formule={abonnement?.formuleCode}
        roleCourant={roleCourant}
      />

      {editionFiche ? (
        <Revele>
          <Card className="mb-6 p-5">
            <CardHeader
              titre="Fiche organisation"
              icone={Building2}
              sousTitre="Identité légale, secteur, taille, effectif et chiffre d’affaires — le secteur détermine la criticité des critères du référentiel."
            />
            <FormulaireEntreprise
              entreprise={entreprise}
              onEnregistrer={(payload) => modifierEntreprise(entrepriseId, payload)}
              onTermine={() => setEditionFiche(false)}
            />
          </Card>
        </Revele>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Revele>
          <Card className="h-full p-5">
          {/* L'historique des paiements est une entrée du bloc d'accès
              ci-dessus (« Abonnement et paiements ») : un second lien vers la
              même adresse, à deux écrans d'intervalle, n'ajoute rien. */}
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
            <Vide message="Aucun abonnement trouvé pour cette organisation." />
          )}
          </Card>
        </Revele>

        <Revele delai={120}>
          <Card className="h-full p-5">
          <CardHeader titre="Sites" icone={MapPin} />
          {erreurSites ? (
            <div className="mb-4">
              <Alerte ton="rouge">{erreurSites}</Alerte>
            </div>
          ) : null}
          {chargementSites ? (
            <Loader message="Chargement des sites…" />
          ) : (
            <SitesSection
              entrepriseId={entrepriseId}
              sites={sites}
              erreurChargement={erreurSites}
              onChange={rafraichirSites}
              peutModifier={peutAdministrer}
            />
          )}
          </Card>
        </Revele>
      </div>

      <Revele delai={160}>
        <Card className="mt-6 p-5">
          <CardHeader
            titre="Évolution du score"
            icone={TrendingUp}
            sousTitre="Score global de chaque mission dans le temps, comparé à la moyenne du secteur quand elle est disponible."
          />
          <div className="h-72 pt-4">
            <EvolutionScoreSection entrepriseId={entrepriseId} secteurCode={entreprise.secteurCode} />
          </div>
        </Card>
      </Revele>
    </>
  );
}

/**
 * Tout ce qui s'ouvre depuis cette organisation.
 *
 * C'est le point d'entrée de la supervision, dont le menu ne garde que ce qui
 * vaut pour le portefeuille entier : sans sélecteur d'organisation, ses
 * entrées par organisation visaient une entreprise choisie à sa place.
 *
 * Les groupes, les libellés et les conditions de visibilité viennent de
 * `lib/navigationOrganisation.js`, le même module que la barre latérale des
 * comptes client. Les retaper ici aurait créé la seconde navigation qui finit
 * par diverger de la première.
 */
function AccesOrganisation({ entrepriseId, peut, formule, roleCourant }) {
  const groupes = groupesDeLOrganisation(entrepriseId, { peut, formule, roleCourant });
  if (groupes.length === 0) return null;

  return (
    <Revele>
      <div className="mb-6 space-y-5">
        {groupes.map((groupe) => (
          <section key={groupe.titre}>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              {groupe.titre}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupe.liens.map((lien) => {
                const Icone = lien.icone;
                return (
                  <Link
                    key={lien.vers}
                    to={lien.vers}
                    className="group flex items-start gap-3 rounded-xl border border-ink-200 bg-surface p-3.5 transition-colors hover:border-brand-300 hover:bg-ink-50"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
                      <Icone className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-900">{lien.libelle}</span>
                      {lien.description ? (
                        <span className="mt-0.5 block text-xs leading-snug text-ink-500">{lien.description}</span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Revele>
  );
}

function EvolutionScoreSection({ entrepriseId, secteurCode }) {
  const [missions, setMissions] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    setChargement(true);
    setErreur(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits`)
      .then((audits) =>
        Promise.all(
          audits.map((audit) =>
            api
              .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/score-historique`)
              .then((historique) => ({ audit, historique }))
          )
        )
      )
      .then((resultats) => setMissions(resultats.filter((m) => m.historique.length > 0)))
      // Un échec rendait `[]`, et le panneau annonçait « pas encore
      // d'historique » : un historique réel devenait indiscernable d'une API
      // tombée.
      .catch((err) => {
        setErreur(
          err instanceof ApiError ? err.message : 'Chargement de l’évolution du score impossible'
        );
        setMissions(null);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    if (!secteurCode) {
      setBenchmark(null);
      return;
    }
    api
      .get(`/api/v1/secteurs/${secteurCode}/benchmark`)
      .then(setBenchmark)
      .catch(() => setBenchmark(null));
  }, [secteurCode]);

  if (chargement) return <Loader message="Chargement de l’évolution du score…" />;

  if (erreur) return <Alerte ton="rouge">{erreur}</Alerte>;

  if (!missions || missions.length === 0) {
    return (
      <Vide message="Pas encore d’historique de score — l’évolution apparaît dès qu’une évaluation est validée sur une mission." />
    );
  }

  const dates = [...new Set(missions.flatMap((m) => m.historique.map((h) => h.date)))].sort();
  const palette = [COULEURS.brand, COULEURS.bleu, COULEURS.violet, COULEURS.ambre];

  const series = missions.map((m, index) => ({
    label: m.audit.nom,
    couleur: palette[index % palette.length],
    format: 'score',
    data: dates.map((date) => {
      const point = m.historique.find((h) => h.date === date);
      return point ? Number(point.scoreGlobal) : null;
    }),
  }));

  if (benchmark && benchmark.scoreMoyen !== null) {
    series.push({
      label: `Moyenne du secteur (${benchmark.nombreEntreprises} entreprises)`,
      couleur: COULEURS.gris,
      pointille: true,
      format: 'score',
      data: dates.map(() => Number(benchmark.scoreMoyen)),
    });
  }

  return <GraphiqueLigne labels={dates.map(formaterDate)} series={series} />;
}

function FormulaireEntreprise({ entreprise, onEnregistrer, onTermine }) {
  const { listerSecteurs } = useApiAuth();
  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({
    raisonSociale: entreprise.raisonSociale,
    identifiantLegal: entreprise.identifiantLegal,
    secteurCode: entreprise.secteurCode ?? '',
    taille: entreprise.taille ?? '',
    effectif: entreprise.effectif ?? '',
    chiffreAffaires: entreprise.chiffreAffaires ?? '',
    deviseChiffreAffaires: entreprise.deviseChiffreAffaires ?? 'XOF',
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    listerSecteurs()
      .then(setSecteurs)
      .catch(() => setSecteurs([]));
  }, [listerSecteurs]);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await onEnregistrer({
        ...formulaire,
        secteurCode: formulaire.secteurCode || null,
        taille: formulaire.taille || null,
        // Champ vidé : on transmet null pour effacer la valeur, pas 0.
        effectif: formulaire.effectif === '' ? null : Number(formulaire.effectif),
        chiffreAffaires:
          formulaire.chiffreAffaires === '' ? null : Number(formulaire.chiffreAffaires),
        deviseChiffreAffaires: formulaire.deviseChiffreAffaires || 'XOF',
      });
      onTermine();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={enregistrer}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="entreprise-raison-sociale">
            Raison sociale
          </label>
          <input
            id="entreprise-raison-sociale"
            required
            className="input"
            value={formulaire.raisonSociale}
            onChange={(e) => setFormulaire({ ...formulaire, raisonSociale: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="entreprise-identifiant-legal">
            Identifiant légal
          </label>
          <input
            id="entreprise-identifiant-legal"
            required
            className="input"
            value={formulaire.identifiantLegal}
            onChange={(e) => setFormulaire({ ...formulaire, identifiantLegal: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="entreprise-secteur">
            Secteur d’activité
          </label>
          <select
            id="entreprise-secteur"
            className="input"
            value={formulaire.secteurCode}
            onChange={(e) => setFormulaire({ ...formulaire, secteurCode: e.target.value })}
          >
            <option value="">Non renseigné</option>
            {secteurs.map((s) => (
              <option key={s.code} value={s.code}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entreprise-taille">
            Taille
          </label>
          <select
            id="entreprise-taille"
            className="input"
            value={formulaire.taille}
            onChange={(e) => setFormulaire({ ...formulaire, taille: e.target.value })}
          >
            <option value="">Non renseignée</option>
            {TAILLES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entreprise-effectif">
            Effectif
          </label>
          <input
            id="entreprise-effectif"
            type="number"
            min="0"
            step="1"
            className="input"
            placeholder="Nombre de personnes"
            value={formulaire.effectif}
            onChange={(e) => setFormulaire({ ...formulaire, effectif: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="entreprise-chiffre-affaires">
            Chiffre d’affaires annuel
          </label>
          <div className="flex gap-2">
            <input
              id="entreprise-chiffre-affaires"
              type="number"
              min="0"
              step="1000"
              className="input"
              placeholder="Montant"
              value={formulaire.chiffreAffaires}
              onChange={(e) => setFormulaire({ ...formulaire, chiffreAffaires: e.target.value })}
            />
            <input
              aria-label="Devise du chiffre d’affaires"
              className="input w-24 uppercase"
              maxLength={3}
              placeholder="XOF"
              value={formulaire.deviseChiffreAffaires}
              onChange={(e) =>
                setFormulaire({ ...formulaire, deviseChiffreAffaires: e.target.value.toUpperCase() })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Enregistrer
        </button>
        <button type="button" className="btn-ghost" onClick={onTermine}>
          Annuler
        </button>
      </div>

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
    </form>
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
        <div className="rounded-xl bg-ink-50/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-500">Formule</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{abonnement.formuleNom}</dd>
        </div>
        <div className="rounded-xl bg-ink-50/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-500">Statut</dt>
          <dd className="mt-1">
            <Badge ton={abonnement.statut === 'ACTIF' ? 'vert' : 'ambre'}>{abonnement.statut}</Badge>
          </dd>
        </div>
        <div className="rounded-xl bg-ink-50/70 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-500">Échéance</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{abonnement.dateFin ?? '—'}</dd>
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
              {chargement ? <SustwayLoader taille="sm" /> : <Wallet className="h-4 w-4" aria-hidden />}
              Payer via PI-SPI
            </button>
            <button type="button" className="btn-secondary" disabled={chargement} onClick={() => payer('WAVE')}>
              {chargement ? <SustwayLoader taille="sm" /> : <Smartphone className="h-4 w-4" aria-hidden />}
              Payer via Wave
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SITE_VIDE = { nom: '', adresse: '', ville: '', codePostal: '', paysCodeIso2: 'CI' };

function SitesSection({ entrepriseId, sites, erreurChargement, onChange, peutModifier }) {
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [siteEnEdition, setSiteEnEdition] = useState(null);
  const [formulaire, setFormulaire] = useState(SITE_VIDE);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  function ouvrirCreation() {
    setSiteEnEdition(null);
    setFormulaire(SITE_VIDE);
    setErreur(null);
    setAfficherFormulaire(true);
  }

  function ouvrirEdition(site) {
    setSiteEnEdition(site);
    setFormulaire({
      nom: site.nom,
      adresse: site.adresse ?? '',
      ville: site.ville ?? '',
      codePostal: site.codePostal ?? '',
      paysCodeIso2: site.paysCodeIso2 ?? 'CI',
    });
    setErreur(null);
    setAfficherFormulaire(true);
  }

  function fermerFormulaire() {
    setAfficherFormulaire(false);
    setSiteEnEdition(null);
    setFormulaire(SITE_VIDE);
  }

  async function enregistrerSite(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      if (siteEnEdition) {
        await api.put(`/api/v1/entreprises/${entrepriseId}/sites/${siteEnEdition.id}`, formulaire);
      } else {
        await api.post(`/api/v1/entreprises/${entrepriseId}/sites`, formulaire);
      }
      fermerFormulaire();
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

  async function reactiverSite(siteId) {
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/sites/${siteId}/reactivation`);
    } finally {
      onChange();
    }
  }

  return (
    <div className="space-y-4">
      {sites && sites.length > 0 ? (
        <ul className="space-y-2">
          {sites.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-ink-100 bg-surface p-3 text-sm transition duration-300 hover:border-brand-200 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{s.nom}</p>
                <p className="text-xs text-ink-500">{[s.ville, s.paysNom].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge ton={s.statut === 'ACTIF' ? 'vert' : 'neutre'}>{s.statut}</Badge>
                {peutModifier && s.statut === 'ARCHIVE' ? (
                  <button
                    type="button"
                    className="btn-ghost p-1.5 text-brand-600"
                    title="Réactiver"
                    onClick={() => reactiverSite(s.id)}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
                {s.statut !== 'ARCHIVE' && peutModifier ? (
                  <>
                    <button
                      type="button"
                      className="btn-ghost p-1.5"
                      title="Modifier le site"
                      onClick={() => ouvrirEdition(s)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost p-1.5 text-rose-600"
                      title="Désactiver"
                      onClick={() => desactiverSite(s.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : erreurChargement ? null : (
        <Vide message="Aucun site pour l’instant." />
      )}

      {!peutModifier ? null : afficherFormulaire ? (
        <form className="space-y-3 rounded-lg border border-ink-200 p-3" onSubmit={enregistrerSite}>
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
              {chargement ? <SustwayLoader taille="sm" /> : null}
              {siteEnEdition ? 'Enregistrer le site' : 'Créer le site'}
            </button>
            <button type="button" className="btn-ghost" onClick={fermerFormulaire}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary" onClick={ouvrirCreation}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          Ajouter un site
        </button>
      )}
    </div>
  );
}
