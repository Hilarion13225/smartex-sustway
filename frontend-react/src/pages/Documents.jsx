import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, MapPin, Search, ShieldCheck, Upload } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api, ApiError, telechargerFichierProtege } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';

const TONS_SCAN = { SAIN: 'vert', EN_ATTENTE: 'ambre', ERREUR: 'ambre', INFECTE: 'rouge' };

function formaterTaille(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Bibliothèque documentaire de l'entreprise (§1.4) : dépôt contrôlé par
 * l'antivirus côté API avant tout stockage, puis rattachement des
 * documents aux critères sous forme de preuves depuis la fiche critère.
 */
export default function Documents() {
  const { entrepriseId } = useParams();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [documents, setDocuments] = useState(null);
  const [sites, setSites] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/documents`).catch(() => []),
      api.get(`/api/v1/entreprises/${entrepriseId}/sites`).catch(() => []),
      api.get(`/api/v1/entreprises/${entrepriseId}/abonnement`).catch(() => null),
    ])
      .then(([listeDocuments, listeSites, abo]) => {
        setDocuments(listeDocuments);
        setSites(listeSites);
        setAbonnement(abo);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const documentsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!documents) return [];
    if (!q) return documents;
    return documents.filter((d) => d.nomOriginal.toLowerCase().includes(q));
  }, [documents, recherche]);

  async function telecharger(document) {
    setErreur(null);
    try {
      await telechargerFichierProtege(
        `/api/v1/entreprises/${entrepriseId}/documents/${document.id}/telechargement`,
        document.nomOriginal
      );
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const peutDeposer = peut('preuve:deposer', abonnement?.formuleCode);
  const volume = (documents ?? []).reduce((total, d) => total + d.taille, 0);
  const sains = (documents ?? []).filter((d) => d.statutScan === 'SAIN').length;

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’entreprise
      </Link>

      <PageTitre
        icone={FileText}
        titre="Bibliothèque documentaire"
        description={`${entreprise.raisonSociale} — tous les documents déposés, contrôlés par l’antivirus avant stockage, puis rattachés aux critères sous forme de preuves.`}
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement des documents…" />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard libelle="Documents déposés" valeur={documents.length} icone={FileText} ton="bleu" />
              <StatCard
                libelle="Analysés sans menace"
                valeur={`${sains} / ${documents.length}`}
                detail="Scan antivirus à l’upload"
                icone={ShieldCheck}
                ton={sains === documents.length ? 'vert' : 'ambre'}
              />
              <StatCard libelle="Volume stocké" valeur={formaterTaille(volume)} icone={Upload} ton="neutre" />
            </div>
          </Revele>

          {peutDeposer ? (
            <Revele delai={80}>
              <FormulaireDepot entrepriseId={entrepriseId} sites={sites} onDepose={rafraichir} />
            </Revele>
          ) : (
            <Alerte ton="ambre">
              Votre rôle ou la formule souscrite par cette entreprise ne permet pas le dépôt de documents.
            </Alerte>
          )}

          <Revele delai={120}>
            <Card className="mt-6 p-0">
              <CardHeader titre="Documents" sousTitre={`${documentsFiltres.length} document(s) affiché(s)`} />
              <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
                <Search className="h-4 w-4 text-ink-400" aria-hidden />
                <input
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-ink-400"
                  placeholder="Rechercher un document…"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>

              {documentsFiltres.length > 0 ? (
                <Tableau entetes={['Document', 'Site', 'Taille', 'Analyse', 'Déposé le', '']}>
                  {documentsFiltres.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td">
                        <p className="font-medium text-ink-900">{d.nomOriginal}</p>
                        <p className="text-xs text-ink-500">{d.typeMime}</p>
                      </td>
                      <td className="td text-sm text-ink-600">
                        {d.siteId ? sites.find((s) => s.id === d.siteId)?.nom ?? 'Site inconnu' : '—'}
                      </td>
                      <td className="td text-sm text-ink-600">{formaterTaille(d.taille)}</td>
                      <td className="td">
                        <Badge ton={TONS_SCAN[d.statutScan] ?? 'neutre'}>{d.statutScan}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{formaterDateHeure(d.createdAt)}</td>
                      <td className="td text-right">
                        <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => telecharger(d)}>
                          <Download className="h-4 w-4" aria-hidden />
                          Télécharger
                        </button>
                      </td>
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide
                    message={
                      documents.length === 0
                        ? 'Aucun document déposé pour cette entreprise.'
                        : 'Aucun document ne correspond à cette recherche.'
                    }
                  />
                </div>
              )}
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

function FormulaireDepot({ entrepriseId, sites, onDepose }) {
  const [fichier, setFichier] = useState(null);
  const [siteId, setSiteId] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function deposer(evenement) {
    evenement.preventDefault();
    if (!fichier) return;
    setErreur(null);
    setChargement(true);
    try {
      const donnees = new FormData();
      donnees.append('fichier', fichier);
      if (siteId) donnees.append('siteId', siteId);
      await api.post(`/api/v1/entreprises/${entrepriseId}/documents`, donnees);
      setFichier(null);
      evenement.target.reset();
      onDepose();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader titre="Déposer un document" icone={Upload} sousTitre="PDF, images ou documents bureautiques" />
      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={deposer}>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="document-fichier">
            Fichier
          </label>
          <input
            id="document-fichier"
            type="file"
            required
            className="input"
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className="label" htmlFor="document-site">
            Site concerné (optionnel)
          </label>
          <select id="document-site" className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Toute l’entreprise</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.nom}
              </option>
            ))}
          </select>
        </div>
        {erreur ? (
          <div className="sm:col-span-3">
            <Alerte ton="rouge">{erreur}</Alerte>
          </div>
        ) : null}
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={chargement || !fichier}>
            {chargement ? <SustwayLoader taille="sm" /> : <Upload className="h-4 w-4" aria-hidden />}
            Déposer
          </button>
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Le document reste isolé dans l’espace de cette entreprise.
          </p>
        </div>
      </form>
    </Card>
  );
}
