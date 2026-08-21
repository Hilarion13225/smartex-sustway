import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';

const TONS_STATUT = { ACTIF: 'vert', INACTIF: 'neutre', SUSPENDU: 'ambre', ARCHIVE: 'rouge' };
const TONS_CRITICITE = { FAIBLE: 'neutre', MOYENNE: 'bleu', ELEVEE: 'ambre', CRITIQUE: 'rouge' };
const NIVEAUX_CRITICITE = ['FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE'];
const TYPES_APPLICABILITE = ['GENERALE', 'SECTORIELLE', 'BAILLEUR'];

/** Module 4 (back-office) : domaines, critères et criticité sectorielle d'un référentiel — réservé à SUPER_ADMIN. */
export default function ReferentielDetail() {
  const { code } = useParams();
  const { roleCourant, peut } = useApiAuth();

  const [referentiel, setReferentiel] = useState(null);
  const [domaines, setDomaines] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [secteurs, setSecteurs] = useState([]);
  const [bailleurs, setBailleurs] = useState([]);
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
    ])
      .then(([tousLesReferentiels, d, c, s, b]) => {
        setReferentiel(tousLesReferentiels.find((r) => r.code === code) ?? null);
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

  if (!peut('referentiel:administrer')) {
    return <Alerte ton="ambre">Cet espace est réservé aux super-administrateurs (rôle actuel : {ROLE_LIBELLE[roleCourant] ?? 'aucun'}).</Alerte>;
  }

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

          <Revele>
            <Card className="mb-6">
              <CardHeader
                titre="Domaines"
                sousTitre="RG08 — un référentiel se décompose en plusieurs domaines"
                action={
                  <button type="button" className="btn-secondary" onClick={() => setAfficherFormulaireDomaine((v) => !v)}>
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Nouveau domaine
                  </button>
                }
              />
              <div className="p-5 pt-0">
                {afficherFormulaireDomaine ? (
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
                      <DomaineRow key={d.id} domaine={d} referentielCode={code} onChange={rafraichir} />
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
                sousTitre="RG09 — chaque critère appartient à un domaine et porte une criticité"
                action={
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!domaines || domaines.length === 0}
                    onClick={() => setAfficherFormulaireCritere((v) => !v)}
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Nouveau critère
                  </button>
                }
              />
              <div className="p-5 pt-0">
                {afficherFormulaireCritere ? (
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
                      <CritereRow key={c.id} critere={c} secteurs={secteurs} bailleurs={bailleurs} onChange={rafraichir} />
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
        </>
      )}
    </>
  );
}

function DomaineRow({ domaine, referentielCode, onChange }) {
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
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-xs text-ink-500">{domaine.code}</span>
          <span className="ml-2 font-medium text-ink-900">{domaine.nom}</span>
          <span className="ml-2 text-xs text-ink-400">ordre {domaine.ordre}</span>
        </div>
        <button type="button" className="btn-ghost" onClick={() => setEdition((v) => !v)}>
          {edition ? 'Fermer' : 'Modifier'}
        </button>
      </div>

      {edition ? (
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
              <option key={t} value={t}>
                {t}
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

function CritereRow({ critere, secteurs, bailleurs, onChange }) {
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
  const [tagsBailleur, setTagsBailleur] = useState(null);

  const rafraichirOverrides = useCallback(() => {
    api
      .get(`/api/v1/referentiels/criteres/${critere.id}/criticite-secteur`)
      .then(setOverrides)
      .catch(() => setOverrides([]));
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
      <tr className="transition-colors hover:bg-ink-50/60">
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
          <button type="button" className="btn-ghost" onClick={ouvrir}>
            {ouvert ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            Détails
          </button>
        </td>
      </tr>
      {ouvert ? (
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
                      <option key={t} value={t}>
                        {t}
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
              <button type="submit" className="btn-primary" disabled={chargement}>
                {chargement ? <SustwayLoader taille="sm" /> : null}
                Enregistrer
              </button>
            </form>

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Criticité par secteur (RG37)
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

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Financements verts — bailleur (RG39)
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
            <li key={o.secteurCode} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
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
            <li key={t.bailleurCode} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
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
