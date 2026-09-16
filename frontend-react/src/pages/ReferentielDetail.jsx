import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import VoletExigences from '../components/referentiel/VoletExigences';
import VoletVersions from '../components/referentiel/VoletVersions';
import { memoriserConsultation } from '../components/referentiel/derniersConsultes';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { TONS_CRITICITE, TONS_STATUT_REFERENTIEL as TONS_STATUT } from '../lib/tonsStatuts';

const NIVEAUX_CRITICITE = ['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'];
/**
 * Portée d'un critère dans les questionnaires.
 *
 * BAILLEUR reste proposé car des critères peuvent déjà porter cette valeur,
 * mais elle exclut le critère de tout questionnaire : rien ne relie
 * aujourd'hui une organisation à un bailleur, la question « ce critère la
 * concerne-t-il ? » n'a donc pas de réponse. L'écran le dit plutôt que de
 * laisser le critère disparaître en silence.
 */
const TYPES_APPLICABILITE = [
  { code: 'GENERALE', libelle: 'Générale — posé à toutes les organisations' },
  { code: 'SECTORIELLE', libelle: 'Sectorielle — réservé aux secteurs rattachés' },
  { code: 'BAILLEUR', libelle: 'Bailleur — hors questionnaire pour l’instant' },
];

/** Module 4 (back-office) : domaines, critères et criticité sectorielle d'un référentiel — réservé à SUPER_ADMIN. */
export default function ReferentielDetail() {
  const { code } = useParams();
  const { peut } = useApiAuth();
  // Lecture ouverte, écriture réservée : l'API n'exige SUPER_ADMIN que sur
  // les créations et modifications (voir ReferentielResource).
  const peutAdministrer = peut('referentiel:administrer');

  const [referentiel, setReferentiel] = useState(null);
  const [domaines, setDomaines] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [secteurs, setSecteurs] = useState([]);
  const [bailleurs, setBailleurs] = useState([]);
  const [versions, setVersions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [afficherFormulaireDomaine, setAfficherFormulaireDomaine] = useState(false);
  const [afficherFormulaireCritere, setAfficherFormulaireCritere] = useState(false);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    Promise.all([
      api.get('/api/v1/referentiels'),
      api.get(`/api/v1/referentiels/${code}/domaines`),
      api.get(`/api/v1/referentiels/${code}/criteres`),
      api.get('/api/v1/secteurs'),
      api.get('/api/v1/bailleurs'),
      api.get(`/api/v1/referentiels/${code}/versions`),
    ])
      .then(([tousLesReferentiels, d, c, s, b, v]) => {
        setReferentiel(tousLesReferentiels.find((r) => r.code === code) ?? null);
        setVersions(v);
        setDomaines(d);
        setCriteres(c);
        setSecteurs(s);
        setBailleurs(b);
      })
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [code]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  // Version de travail : le brouillon s'il en existe un, sinon la version
  // publiée — c'est elle que l'API renvoie sur /domaines et /criteres.
  const versionDeTravail =
    versions.find((v) => v.statut === 'BROUILLON') ?? versions.find((v) => v.statut === 'PUBLIEE');

  // Le contenu d'une version publiée est figé : l'API le refuse, la base
  // aussi. Masquer les commandes d'édition évite de proposer un geste qui
  // ne peut qu'échouer — mais ce n'est pas là que la règle est tenue.
  const peutModifierContenu = peutAdministrer && versionDeTravail?.modifiable === true;

  // Alimente la liste « Derniers consultés » du catalogue, tenue côté
  // navigateur : l'API ne journalise pas les consultations.
  useEffect(() => {
    if (referentiel) memoriserConsultation(referentiel);
  }, [referentiel]);

  return (
    <>
      <Link to="/app/referentiels" className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux référentiels
      </Link>

      {chargement ? (
        <Loader message="Chargement du référentiel…" />
      ) : !referentiel ? (
        <Vide message="Référentiel introuvable." />
      ) : (
        <>
          <PageTitre
            icone={BookOpen}
            titre={referentiel.nom}
            description={`${referentiel.code} — ${referentiel.type} — version ${referentiel.version}`}
            actions={<Badge ton={TONS_STATUT[referentiel.statut] ?? 'neutre'}>{referentiel.statut}</Badge>}
          />

          {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

          {peutAdministrer && versionDeTravail ? (
            <div className="mb-6">
              <Alerte ton={versionDeTravail.modifiable ? 'ambre' : 'bleu'}>
                {versionDeTravail.modifiable ? (
                  <>
                    Version <strong>{versionDeTravail.numero}</strong> en brouillon : le contenu
                    ci-dessous se modifie librement et aucune mission ne s’y appuie. Publiez-la
                    depuis l’onglet Versions pour qu’elle serve les prochaines missions.
                  </>
                ) : (
                  <>
                    Version <strong>{versionDeTravail.numero}</strong> publiée, donc figée : son
                    contenu ne se modifie plus, ni ici ni en base. Ouvrez une version brouillon
                    depuis l’onglet Versions pour faire évoluer ce référentiel — les missions déjà
                    créées continueront d’auditer la version qu’elles ont reçue.
                  </>
                )}
              </Alerte>
            </div>
          ) : null}

          <Revele>
            <Card className="mb-6">
              <CardHeader
                titre="Domaines"
                sousTitre="Un référentiel se décompose en plusieurs domaines"
                action={
                  peutModifierContenu ? (
                    <button type="button" className="btn-secondary" onClick={() => setAfficherFormulaireDomaine((v) => !v)}>
                      <PlusCircle className="h-4 w-4" aria-hidden />
                      Nouveau domaine
                    </button>
                  ) : null
                }
              />
              <div className="p-5 pt-0">
                {afficherFormulaireDomaine && peutModifierContenu ? (
                  <div className="mb-4">
                    <NouveauDomaineFormulaire
                      referentielCode={code}
                      onCree={() => {
                        setAfficherFormulaireDomaine(false);
                        rafraichir();
                      }}
                    />
                  </div>
                ) : null}

                {domaines && domaines.length > 0 ? (
                  <div className="space-y-2">
                    {domaines.map((d) => (
                      <DomaineRow key={d.id} domaine={d} referentielCode={code} onChange={rafraichir} peutAdministrer={peutModifierContenu} />
                    ))}
                  </div>
                ) : (
                  <Vide message="Aucun domaine pour l’instant." />
                )}
              </div>
            </Card>
          </Revele>

          <Revele delai={80}>
            <Card>
              <CardHeader
                titre="Critères"
                sousTitre="Chaque critère appartient à un domaine et porte une criticité"
                action={
                  peutModifierContenu ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!domaines || domaines.length === 0}
                      onClick={() => setAfficherFormulaireCritere((v) => !v)}
                    >
                      <PlusCircle className="h-4 w-4" aria-hidden />
                      Nouveau critère
                    </button>
                  ) : null
                }
              />
              <div className="p-5 pt-0">
                {afficherFormulaireCritere && peutModifierContenu ? (
                  <div className="mb-4">
                    <NouveauCritereFormulaire
                      referentielCode={code}
                      domaines={domaines ?? []}
                      onCree={() => {
                        setAfficherFormulaireCritere(false);
                        rafraichir();
                      }}
                    />
                  </div>
                ) : null}

                {criteres && criteres.length > 0 ? (
                  <Tableau entetes={['Code', 'Critère', 'Domaine', 'Applicabilité', 'Criticité', 'Statut', '']}>
                    {criteres.map((c) => (
                      <CritereRow key={c.id} critere={c} secteurs={secteurs} bailleurs={bailleurs} onChange={rafraichir} peutAdministrer={peutAdministrer} modifiable={peutModifierContenu} />
                    ))}
                  </Tableau>
                ) : (
                  <div className="p-6">
                    <Vide message="Aucun critère pour l’instant." />
                  </div>
                )}
              </div>
            </Card>
          </Revele>

          <Revele delai={120}>
            <Card>
              <CardHeader
                titre="Versions"
                sousTitre="Publications successives de ce référentiel et évolution de sa volumétrie"
              />
              <div className="p-5 pt-0">
                <VoletVersions
                  code={code}
                  peutAdministrer={peutAdministrer}
                  surChangement={rafraichir}
                />
              </div>
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

function DomaineRow({ domaine, referentielCode, onChange, peutAdministrer }) {
  const [edition, setEdition] = useState(false);
  const [formulaire, setFormulaire] = useState({
    nom: domaine.nom,
    description: domaine.description ?? '',
    ordre: domaine.ordre,
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/${referentielCode}/domaines/${domaine.code}`, formulaire);
      setEdition(false);
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-xs text-ink-500">{domaine.code}</span>
          <span className="ml-2 font-medium text-ink-900">{domaine.nom}</span>
          <span className="ml-2 text-xs text-ink-400">ordre {domaine.ordre}</span>
        </div>
        {peutAdministrer ? (
          <button type="button" className="btn-ghost" onClick={() => setEdition((v) => !v)}>
            {edition ? 'Fermer' : 'Modifier'}
          </button>
        ) : null}
      </div>

      {edition && peutAdministrer ? (
        <form className="mt-3 space-y-3 border-t border-ink-100 pt-3" onSubmit={enregistrer}>
          {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`domaine-nom-${domaine.id}`}>
                Nom
              </label>
              <input
                id={`domaine-nom-${domaine.id}`}
                className="input"
                value={formulaire.nom}
                onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`domaine-ordre-${domaine.id}`}>
                Ordre
              </label>
              <input
                id={`domaine-ordre-${domaine.id}`}
                type="number"
                className="input"
                value={formulaire.ordre}
                onChange={(e) => setFormulaire({ ...formulaire, ordre: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="label" htmlFor={`domaine-description-${domaine.id}`}>
                Description
              </label>
              <input
                id={`domaine-description-${domaine.id}`}
                className="input"
                value={formulaire.description}
                onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={chargement}>
            {chargement ? <SustwayLoader taille="sm" /> : null}
            Enregistrer
          </button>
        </form>
      ) : null}
    </div>
  );
}

function NouveauDomaineFormulaire({ referentielCode, onCree }) {
  const [formulaire, setFormulaire] = useState({ code: '', nom: '', description: '', ordre: 0 });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post(`/api/v1/referentiels/${referentielCode}/domaines`, formulaire);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-dashed border-ink-200 p-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="domaine-nouveau-code">
            Code
          </label>
          <input
            id="domaine-nouveau-code"
            required
            className="input"
            placeholder="GOUV"
            value={formulaire.code}
            onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="domaine-nouveau-nom">
            Nom
          </label>
          <input
            id="domaine-nouveau-nom"
            required
            className="input"
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="domaine-nouveau-ordre">
            Ordre
          </label>
          <input
            id="domaine-nouveau-ordre"
            type="number"
            className="input"
            value={formulaire.ordre}
            onChange={(e) => setFormulaire({ ...formulaire, ordre: Number(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-4">
          <label className="label" htmlFor="domaine-nouveau-description">
            Description (optionnelle)
          </label>
          <input
            id="domaine-nouveau-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer le domaine
      </button>
    </form>
  );
}

function NouveauCritereFormulaire({ referentielCode, domaines, onCree }) {
  const [formulaire, setFormulaire] = useState({
    domaineCode: domaines[0]?.code ?? '',
    code: '',
    libelle: '',
    description: '',
    applicabilite: 'GENERALE',
    criticiteCode: 'MOYENNE',
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { domaineCode, ...corps } = formulaire;
      await api.post(`/api/v1/referentiels/${referentielCode}/domaines/${domaineCode}/criteres`, corps);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-dashed border-ink-200 p-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="critere-nouveau-domaine">
            Domaine
          </label>
          <select
            id="critere-nouveau-domaine"
            className="input"
            value={formulaire.domaineCode}
            onChange={(e) => setFormulaire({ ...formulaire, domaineCode: e.target.value })}
          >
            {domaines.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="critere-nouveau-code">
            Code
          </label>
          <input
            id="critere-nouveau-code"
            required
            className="input"
            placeholder="GOUV-01"
            value={formulaire.code}
            onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="label" htmlFor="critere-nouveau-applicabilite">
            Applicabilité
          </label>
          <select
            id="critere-nouveau-applicabilite"
            className="input"
            value={formulaire.applicabilite}
            onChange={(e) => setFormulaire({ ...formulaire, applicabilite: e.target.value })}
          >
            {TYPES_APPLICABILITE.map((t) => (
              <option key={t.code} value={t.code}>
                {t.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="critere-nouveau-libelle">
            Libellé
          </label>
          <input
            id="critere-nouveau-libelle"
            required
            className="input"
            value={formulaire.libelle}
            onChange={(e) => setFormulaire({ ...formulaire, libelle: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="critere-nouveau-criticite">
            Criticité
          </label>
          <select
            id="critere-nouveau-criticite"
            className="input"
            value={formulaire.criticiteCode}
            onChange={(e) => setFormulaire({ ...formulaire, criticiteCode: e.target.value })}
          >
            {NIVEAUX_CRITICITE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="critere-nouveau-description">
            Description (optionnelle)
          </label>
          <input
            id="critere-nouveau-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer le critère
      </button>
    </form>
  );
}

function CritereRow({ critere, secteurs, bailleurs, onChange, peutAdministrer, modifiable }) {
  const [ouvert, setOuvert] = useState(false);
  const [formulaire, setFormulaire] = useState({
    libelle: critere.libelle,
    description: critere.description ?? '',
    applicabilite: critere.applicabilite,
    criticiteCode: critere.criticite ?? 'MOYENNE',
    actif: critere.actif,
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [coefficientsSecteur, setCoefficientsSecteur] = useState(null);
  const [secteursDuCritere, setSecteursDuCritere] = useState(null);
  const [tagsBailleur, setTagsBailleur] = useState(null);

  const rafraichirOverrides = useCallback(() => {
    api
      .get(`/api/v1/referentiels/criteres/${critere.id}/criticite-secteur`)
      .then(setOverrides)
      .catch(() => setOverrides([]));
  }, [critere.id]);

  const rafraichirCoefficients = useCallback(() => {
    api
      .get(`/api/v1/referentiels/criteres/${critere.id}/coefficient-secteur`)
      .then(setCoefficientsSecteur)
      .catch(() => setCoefficientsSecteur([]));
  }, [critere.id]);

  const rafraichirSecteurs = useCallback(() => {
    api
      .get(`/api/v1/referentiels/criteres/${critere.id}/secteurs`)
      .then(setSecteursDuCritere)
      .catch(() => setSecteursDuCritere([]));
  }, [critere.id]);

  const rafraichirTagsBailleur = useCallback(() => {
    api
      .get(`/api/v1/referentiels/criteres/${critere.id}/bailleur`)
      .then(setTagsBailleur)
      .catch(() => setTagsBailleur([]));
  }, [critere.id]);

  function ouvrir() {
    setOuvert((v) => {
      if (!v) {
        rafraichirOverrides();
        rafraichirCoefficients();
        rafraichirSecteurs();
        rafraichirTagsBailleur();
      }
      return !v;
    });
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/criteres/${critere.id}`, formulaire);
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <tr className="transition-colors hover:bg-ink-100/60">
        <td className="td font-mono text-xs text-ink-500">{critere.code}</td>
        <td className="td max-w-sm">{critere.libelle}</td>
        <td className="td">{critere.domaineCode}</td>
        <td className="td">{critere.applicabilite}</td>
        <td className="td">
          {critere.criticite ? <Badge ton={TONS_CRITICITE[critere.criticite] ?? 'neutre'}>{critere.criticite}</Badge> : '—'}
        </td>
        <td className="td">
          <Badge ton={formulaire.actif ? 'vert' : 'neutre'}>{formulaire.actif ? 'ACTIF' : 'INACTIF'}</Badge>
        </td>
        <td className="td text-right">
          {/* Le volet déplié est un formulaire d'édition : sans droit
              d'administration, l'ouvrir n'offrirait qu'une saisie refusée
              en 403 à l'enregistrement. */}
          <button
            type="button"
            className="btn-ghost"
            onClick={ouvrir}
            disabled={!peutAdministrer}
            aria-label={`Modifier le critère ${critere.code}`}
          >
            {ouvert ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            Détails
          </button>
        </td>
      </tr>
      {ouvert && peutAdministrer ? (
        <tr>
          <td colSpan={7} className="bg-ink-50/60 px-4 py-4">
            <form className="space-y-3" onSubmit={enregistrer}>
              {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor={`critere-libelle-${critere.id}`}>
                    Libellé
                  </label>
                  <input
                    id={`critere-libelle-${critere.id}`}
                    className="input"
                    value={formulaire.libelle}
                    onChange={(e) => setFormulaire({ ...formulaire, libelle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`critere-applicabilite-${critere.id}`}>
                    Applicabilité
                  </label>
                  <select
                    id={`critere-applicabilite-${critere.id}`}
                    className="input"
                    value={formulaire.applicabilite}
                    onChange={(e) => setFormulaire({ ...formulaire, applicabilite: e.target.value })}
                  >
                    {TYPES_APPLICABILITE.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`critere-criticite-${critere.id}`}>
                    Criticité générale
                  </label>
                  <select
                    id={`critere-criticite-${critere.id}`}
                    className="input"
                    value={formulaire.criticiteCode}
                    onChange={(e) => setFormulaire({ ...formulaire, criticiteCode: e.target.value })}
                  >
                    {NIVEAUX_CRITICITE.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor={`critere-description-${critere.id}`}>
                    Description
                  </label>
                  <input
                    id={`critere-description-${critere.id}`}
                    className="input"
                    value={formulaire.description}
                    onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-ink-700" htmlFor={`critere-actif-${critere.id}`}>
                    <input
                      id={`critere-actif-${critere.id}`}
                      type="checkbox"
                      checked={formulaire.actif}
                      onChange={(e) => setFormulaire({ ...formulaire, actif: e.target.checked })}
                    />
                    Actif
                  </label>
                </div>
              </div>
              {modifiable ? (
                <button type="submit" className="btn-primary" disabled={chargement}>
                  {chargement ? <SustwayLoader taille="sm" /> : null}
                  Enregistrer
                </button>
              ) : (
                <p className="text-xs text-ink-500">
                  Version publiée : ce critère est figé. Ouvrez une version brouillon pour le
                  modifier.
                </p>
              )}
            </form>

            {/* Ce qu'exige ce critère, ce qu'il faut produire pour le
                démontrer, et selon quelles règles conclure. Consultable même
                sur une version publiée : c'est l'écriture qui est fermée,
                pas la lecture. */}
            <div className="mt-5 border-t border-ink-200 pt-4">
              <VoletExigences critereId={critere.id} modifiable={modifiable} />
            </div>

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Criticité par secteur
              </p>
              {overrides === null ? (
                <SustwayLoader taille="sm" />
              ) : (
                <CriticiteSecteurPanel
                  critereId={critere.id}
                  overrides={overrides}
                  secteurs={secteurs}
                  onChange={rafraichirOverrides}
                />
              )}
            </div>

            {/* Un critère réservé n'est posé qu'aux secteurs rattachés ici :
                sans rattachement il ne figure dans aucun questionnaire, ce que
                le panneau signale explicitement. */}
            {formulaire.applicabilite === 'SECTORIELLE' ? (
              <div className="mt-5 border-t border-ink-200 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Secteurs concernés
                </p>
                <p className="mb-2 mt-0.5 text-xs text-ink-500">
                  Ce critère n’est posé qu’aux organisations de ces secteurs.
                </p>
                {secteursDuCritere === null ? (
                  <SustwayLoader taille="sm" />
                ) : (
                  <CritereSecteurPanel
                    critereId={critere.id}
                    rattachements={secteursDuCritere}
                    secteurs={secteurs}
                    onChange={rafraichirSecteurs}
                  />
                )}
              </div>
            ) : null}

            {formulaire.applicabilite === 'BAILLEUR' ? (
              <div className="mt-5 border-t border-ink-200 pt-4">
                <Alerte ton="ambre">
                  Un critère « Bailleur » n’est posé à personne : rien ne relie encore une
                  organisation à un bailleur. Repassez-le en « Générale » ou « Sectorielle » pour
                  qu’il figure dans les questionnaires.
                </Alerte>
              </div>
            ) : null}

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Pondération par secteur
              </p>
              <p className="mb-2 mt-0.5 text-xs text-ink-500">
                Combien ce critère compte dans la note — à distinguer de la criticité, qui fixe
                l’urgence d’un écart.
              </p>
              {coefficientsSecteur === null ? (
                <SustwayLoader taille="sm" />
              ) : (
                <CoefficientSecteurPanel
                  critereId={critere.id}
                  coefficientParDefaut={critere.coefficientPonderation}
                  surcharges={coefficientsSecteur}
                  secteurs={secteurs}
                  onChange={rafraichirCoefficients}
                />
              )}
            </div>

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Financements verts — bailleur
              </p>
              {tagsBailleur === null ? (
                <SustwayLoader taille="sm" />
              ) : (
                <BailleurTagPanel
                  critereId={critere.id}
                  tags={tagsBailleur}
                  bailleurs={bailleurs}
                  onChange={rafraichirTagsBailleur}
                />
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CriticiteSecteurPanel({ critereId, overrides, secteurs, onChange }) {
  const [secteurCode, setSecteurCode] = useState(secteurs[0]?.code ?? '');
  const [criticiteCode, setCriticiteCode] = useState('ELEVEE');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/criteres/${critereId}/criticite-secteur`, { secteurCode, criticiteCode });
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function supprimer(code) {
    try {
      await api.delete(`/api/v1/referentiels/criteres/${critereId}/criticite-secteur/${code}`);
      onChange();
    } catch {
      // l'overlay reste affiché : le rafraîchissement suivant reflète l'état réel
    }
  }

  return (
    <div className="space-y-3">
      {overrides.length > 0 ? (
        <ul className="space-y-1">
          {overrides.map((o) => (
            <li key={o.secteurCode} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <span>
                {o.secteurNom} → <Badge ton={TONS_CRITICITE[o.criticiteCode] ?? 'neutre'}>{o.criticiteCode}</Badge>
              </span>
              <button type="button" className="btn-ghost text-xs" onClick={() => supprimer(o.secteurCode)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-500">Aucune surcharge sectorielle — la criticité générale s’applique partout.</p>
      )}

      <form className="flex flex-wrap items-end gap-2" onSubmit={ajouter}>
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
        <div>
          <label className="label" htmlFor={`secteur-code-${critereId}`}>
            Secteur
          </label>
          <select
            id={`secteur-code-${critereId}`}
            className="input"
            value={secteurCode}
            onChange={(e) => setSecteurCode(e.target.value)}
          >
            {secteurs.map((s) => (
              <option key={s.code} value={s.code}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`secteur-criticite-${critereId}`}>
            Criticité pour ce secteur
          </label>
          <select
            id={`secteur-criticite-${critereId}`}
            className="input"
            value={criticiteCode}
            onChange={(e) => setCriticiteCode(e.target.value)}
          >
            {NIVEAUX_CRITICITE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary" disabled={chargement || !secteurCode}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Définir
        </button>
      </form>
    </div>
  );
}

/**
 * Secteurs auxquels un critère réservé s'applique.
 *
 * Sans rattachement, le critère ne figure dans aucun questionnaire — c'est le
 * sens d'un critère réservé, mais assez facile à obtenir par mégarde pour être
 * dit à l'écran.
 */
function CritereSecteurPanel({ critereId, rattachements, secteurs, onChange }) {
  const [secteurCode, setSecteurCode] = useState(secteurs[0]?.code ?? '');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const retenus = rattachements.filter((r) => r.applicable !== false);

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/criteres/${critereId}/secteurs`, {
        secteurCode,
        applicable: true,
      });
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function supprimer(code) {
    try {
      await api.delete(`/api/v1/referentiels/criteres/${critereId}/secteurs/${code}`);
      onChange();
    } catch {
      // le rafraîchissement suivant reflète l'état réel
    }
  }

  return (
    <div className="space-y-3">
      {retenus.length > 0 ? (
        <ul className="space-y-1">
          {retenus.map((r) => (
            <li
              key={r.secteurCode}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <span>{r.secteurNom}</span>
              <button type="button" className="btn-ghost text-xs" onClick={() => supprimer(r.secteurCode)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Alerte ton="ambre">
          Aucun secteur rattaché : ce critère n’est posé à aucune organisation. Rattachez au moins
          un secteur, ou repassez-le en « Générale ».
        </Alerte>
      )}

      <form className="flex flex-wrap items-end gap-2" onSubmit={ajouter}>
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
        <div>
          <label className="label" htmlFor={`critere-secteur-${critereId}`}>
            Secteur concerné
          </label>
          <select
            id={`critere-secteur-${critereId}`}
            className="input"
            value={secteurCode}
            onChange={(e) => setSecteurCode(e.target.value)}
          >
            {secteurs.map((s) => (
              <option key={s.code} value={s.code}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary" disabled={chargement || !secteurCode}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Rattacher
        </button>
      </form>

      <p className="text-xs text-ink-500">
        Le questionnaire est figé à la création d’une mission : ce rattachement ne modifie que les
        missions créées ensuite.
      </p>
    </div>
  );
}

/**
 * Pondérations sectorielles d'un critère.
 *
 * Le coefficient entre dans la note (note = niveau × coefficient) : le faire
 * varier par secteur est ce qui fait qu'un critère « compte plus » pour un
 * métier. La criticité voisine, elle, ne joue que sur la priorité des écarts.
 *
 * Seules les exceptions se saisissent : sans ligne, le critère garde le
 * coefficient de sa grille, rappelé ici pour situer chaque surcharge.
 */
function CoefficientSecteurPanel({ critereId, coefficientParDefaut, surcharges, secteurs, onChange }) {
  const [secteurCode, setSecteurCode] = useState(secteurs[0]?.code ?? '');
  const [coefficient, setCoefficient] = useState('3');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/criteres/${critereId}/coefficient-secteur`, {
        secteurCode,
        coefficient: Number(coefficient),
      });
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function supprimer(code) {
    try {
      await api.delete(`/api/v1/referentiels/criteres/${critereId}/coefficient-secteur/${code}`);
      onChange();
    } catch {
      // le rafraîchissement suivant reflète l'état réel
    }
  }

  return (
    <div className="space-y-3">
      {surcharges.length > 0 ? (
        <ul className="space-y-1">
          {surcharges.map((s) => (
            <li
              key={s.secteurCode}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <span>
                {s.secteurNom} → <Badge ton="bleu">coefficient {Number(s.coefficient)}</Badge>
              </span>
              <button type="button" className="btn-ghost text-xs" onClick={() => supprimer(s.secteurCode)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-500">
          Aucune pondération sectorielle — le coefficient {Number(coefficientParDefaut ?? 1)} de la grille
          s’applique à tous les secteurs.
        </p>
      )}

      <form className="flex flex-wrap items-end gap-2" onSubmit={ajouter}>
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
        <div>
          <label className="label" htmlFor={`coef-secteur-${critereId}`}>
            Secteur
          </label>
          <select
            id={`coef-secteur-${critereId}`}
            className="input"
            value={secteurCode}
            onChange={(e) => setSecteurCode(e.target.value)}
          >
            {secteurs.map((s) => (
              <option key={s.code} value={s.code}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`coef-valeur-${critereId}`}>
            Coefficient pour ce secteur
          </label>
          <select
            id={`coef-valeur-${critereId}`}
            className="input"
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
          >
            <option value="1">1 — secondaire</option>
            <option value="2">2 — important</option>
            <option value="3">3 — déterminant</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary" disabled={chargement || !secteurCode}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Définir
        </button>
      </form>

      <p className="text-xs text-ink-500">
        La pondération est figée à la création d’une mission : modifier ce coefficient n’altère pas
        les missions déjà lancées.
      </p>
    </div>
  );
}

function BailleurTagPanel({ critereId, tags, bailleurs, onChange }) {
  const [bailleurCode, setBailleurCode] = useState(bailleurs[0]?.code ?? '');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function ajouter(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.put(`/api/v1/referentiels/criteres/${critereId}/bailleur`, { bailleurCode, applicable: true });
      onChange();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  async function retirer(code) {
    try {
      await api.delete(`/api/v1/referentiels/criteres/${critereId}/bailleur/${code}`);
      onChange();
    } catch {
      // l'overlay reste affiché : le rafraîchissement suivant reflète l'état réel
    }
  }

  return (
    <div className="space-y-3">
      {tags.length > 0 ? (
        <ul className="space-y-1">
          {tags.filter((t) => t.applicable).map((t) => (
            <li key={t.bailleurCode} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <span>Compte pour l’indice de préparation {t.bailleurNom}</span>
              <button type="button" className="btn-ghost text-xs" onClick={() => retirer(t.bailleurCode)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-500">
          Ce critère ne compte pour aucun indice de préparation bailleur pour l’instant.
        </p>
      )}

      <form className="flex flex-wrap items-end gap-2" onSubmit={ajouter}>
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
        <div>
          <label className="label" htmlFor={`bailleur-code-${critereId}`}>
            Bailleur
          </label>
          <select
            id={`bailleur-code-${critereId}`}
            className="input"
            value={bailleurCode}
            onChange={(e) => setBailleurCode(e.target.value)}
          >
            {bailleurs.map((b) => (
              <option key={b.code} value={b.code}>
                {b.nom}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary" disabled={chargement || !bailleurCode}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Inclure dans l’indice
        </button>
      </form>
    </div>
  );
}
