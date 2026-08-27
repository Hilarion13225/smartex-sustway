import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, MapPin, Search } from 'lucide-react';
import clsx from 'clsx';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';

const TONS_CRITICITE = {
  FAIBLE: 'neutre',
  MOYENNE: 'bleu',
  ELEVEE: 'ambre',
  CRITIQUE: 'rouge',
};

const TONS_STATUT_CRITERE = {
  A_EVALUER: 'neutre',
  EVALUE: 'vert',
};

/** RG34/RG35 : questionnaire figé de la mission — liste des critères à évaluer. */
export default function AuditDetail() {
  const { entrepriseId, auditId } = useParams();
  const navigate = useNavigate();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [ongletCriteres, setOngletCriteres] = useState('A_EVALUER');

  const [sitesEntreprise, setSitesEntreprise] = useState([]);
  const [sitesAudit, setSitesAudit] = useState([]);
  const [selectionSites, setSelectionSites] = useState([]);
  const [sauvegardeSitesEnCours, setSauvegardeSitesEnCours] = useState(false);

  const [erreurSites, setErreurSites] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`),
      api.get(`/api/v1/entreprises/${entrepriseId}/sites`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`),
    ])
      .then(([a, c, se, sa]) => {
        setAudit(a);
        setCriteres(c);
        setSitesEntreprise(se.filter((s) => s.statut === 'ACTIF'));
        setSitesAudit(sa);
        setSelectionSites(sa.map((s) => s.id));
      })
      .catch(() => {
        setAudit(null);
        setCriteres([]);
      })
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const peutModifier = peut('audit:modifier', audit?.formuleCode);

  function basculerSite(siteId) {
    setSelectionSites((prec) => (prec.includes(siteId) ? prec.filter((id) => id !== siteId) : [...prec, siteId]));
  }

  async function enregistrerSites() {
    setErreurSites(null);
    setSauvegardeSitesEnCours(true);
    try {
      const sites = await api.put(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`, {
        siteIds: selectionSites,
      });
      setSitesAudit(sites);
    } catch (err) {
      setErreurSites(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setSauvegardeSitesEnCours(false);
    }
  }

  // RG34/RG35 : deux volets — un critère non évalué reste le travail à
  // faire, un critère évalué devient une trace de ce qui a déjà été traité ;
  // les mélanger dans une seule liste noyait l'un dans l'autre dès que la
  // mission avançait.
  const nombreParStatut = useMemo(() => {
    const compte = { A_EVALUER: 0, EVALUE: 0 };
    (criteres ?? []).forEach((c) => {
      if (c.statut in compte) compte[c.statut] += 1;
    });
    return compte;
  }, [criteres]);

  const criteresFiltres = useMemo(() => {
    if (!criteres) return [];
    const q = recherche.trim().toLowerCase();
    return criteres
      .filter((c) => c.statut === ongletCriteres)
      .filter((c) => !q || c.critereCode.toLowerCase().includes(q) || c.critereLibelle.toLowerCase().includes(q));
  }, [criteres, recherche, ongletCriteres]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux audits
      </Link>

      {chargement ? (
        <Loader message="Chargement de la mission…" />
      ) : !audit ? (
        <Vide message="Audit introuvable ou non accessible." />
      ) : (
        <>
          <PageTitre
            icone={ClipboardCheck}
            titre={audit.nom}
            description={`${audit.referentielCode} — ${audit.nombreCriteres} critères — début le ${audit.dateDebut}`}
            actions={
              <>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/score`} className="btn-secondary">
                  <Gauge className="h-4 w-4" aria-hidden />
                  Tableau de bord
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/non-conformites`} className="btn-secondary">
                  <ClipboardX className="h-4 w-4" aria-hidden />
                  Non-conformités
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/rapports`} className="btn-secondary">
                  <FileText className="h-4 w-4" aria-hidden />
                  Rapports
                </Link>
                <Link to={`/app/${entrepriseId}/audits/${auditId}/indice-preparation`} className="btn-secondary">
                  <Leaf className="h-4 w-4" aria-hidden />
                  Indice IFC/SFI
                </Link>
                <Badge ton="bleu">{audit.statut}</Badge>
              </>
            }
          />

          {erreurSites ? <Alerte ton="rouge">{erreurSites}</Alerte> : null}

          <Revele>
            <div className="mb-6 lg:max-w-xl">
              <Card className="p-5">
                <CardHeader titre="Sites de la mission" sousTitre="Sites de l'entreprise couverts par cette mission." icone={MapPin} />
                {sitesEntreprise.length === 0 ? (
                  <div className="mt-3">
                    <p className="text-sm text-ink-500">
                      Aucun site actif pour cette entreprise — la mission porte sur l'entreprise entière.
                    </p>
                    {peutModifier ? (
                      <Link to={`/app/${entrepriseId}`} className="btn-secondary mt-3">
                        <MapPin className="h-4 w-4" aria-hidden />
                        Ajouter un site à l'entreprise
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-2">
                      {sitesEntreprise.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-ink-700">
                          <input
                            type="checkbox"
                            checked={selectionSites.includes(s.id)}
                            disabled={!peutModifier}
                            onChange={() => basculerSite(s.id)}
                          />
                          {s.nom}
                          {s.ville ? <span className="text-ink-400">— {s.ville}</span> : null}
                        </label>
                      ))}
                    </div>
                    {peutModifier ? (
                      <button
                        type="button"
                        className="btn-secondary mt-4"
                        disabled={sauvegardeSitesEnCours}
                        onClick={enregistrerSites}
                      >
                        Enregistrer les sites
                      </button>
                    ) : null}
                    {!peutModifier && sitesAudit.length === 0 ? (
                      <p className="mt-3 text-xs text-ink-500">Aucun site sélectionné — la mission porte sur l'entreprise entière.</p>
                    ) : null}
                  </>
                )}
              </Card>
            </div>
          </Revele>

          <Revele delai={60}>
            <Card className="p-0">
              <div className="flex flex-wrap gap-2 border-b border-ink-100 px-5 pt-4">
                <button
                  type="button"
                  role="tab"
                  aria-selected={ongletCriteres === 'A_EVALUER'}
                  onClick={() => setOngletCriteres('A_EVALUER')}
                  className={clsx(
                    'rounded-t-lg px-3 pb-3 text-sm font-medium transition-colors',
                    ongletCriteres === 'A_EVALUER'
                      ? 'border-b-2 border-brand-600 text-brand-700'
                      : 'border-b-2 border-transparent text-ink-500 hover:text-ink-700'
                  )}
                >
                  Non évalués ({nombreParStatut.A_EVALUER})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={ongletCriteres === 'EVALUE'}
                  onClick={() => setOngletCriteres('EVALUE')}
                  className={clsx(
                    'rounded-t-lg px-3 pb-3 text-sm font-medium transition-colors',
                    ongletCriteres === 'EVALUE'
                      ? 'border-b-2 border-brand-600 text-brand-700'
                      : 'border-b-2 border-transparent text-ink-500 hover:text-ink-700'
                  )}
                >
                  Évalués ({nombreParStatut.EVALUE})
                </button>
              </div>
              <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
                <Search className="h-4 w-4 text-ink-400" aria-hidden />
                <input
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-ink-400"
                  placeholder="Rechercher un critère (code ou libellé)…"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>

              {criteresFiltres.length > 0 ? (
                <Tableau entetes={['Code', 'Critère', 'Criticité', 'Statut', '']}>
                  {criteresFiltres.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-ink-100/60">
                      <td className="td font-mono text-xs text-ink-500">{c.critereCode}</td>
                      <td className="td max-w-md">
                        <p className="font-medium text-ink-900">{c.critereLibelle}</p>
                        <p className="text-xs text-ink-500">{c.domaineCode}</p>
                      </td>
                      <td className="td">
                        {c.criticite ? <Badge ton={TONS_CRITICITE[c.criticite] ?? 'neutre'}>{c.criticite}</Badge> : '—'}
                      </td>
                      <td className="td">
                        <Badge ton={TONS_STATUT_CRITERE[c.statut] ?? 'neutre'}>{c.statut}</Badge>
                      </td>
                      <td className="td text-right">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => navigate(`/app/${entrepriseId}/audits/${auditId}/criteres/${c.id}`, { state: { critere: c } })}
                        >
                          Ouvrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide
                    message={
                      criteres && criteres.length === 0
                        ? 'Ce référentiel ne compte aucun critère actif — choisissez-en un autre pour un prochain audit.'
                        : recherche
                          ? 'Aucun critère ne correspond à cette recherche.'
                          : ongletCriteres === 'A_EVALUER'
                            ? 'Tous les critères ont été évalués — rien en attente ici.'
                            : 'Aucun critère évalué pour l’instant.'
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
