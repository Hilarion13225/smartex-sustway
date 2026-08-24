import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, MapPin, Search, UserPlus, Users, X } from 'lucide-react';
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

const ROLES_INTERNES_SMARTEX = ['SUPER_ADMIN', 'ADMIN_AUDIT', 'EXPERT_REVIEWER'];

const LIBELLE_ROLE_MISSION = {
  AUDITEUR_PRINCIPAL: 'Auditeur principal',
  AUDITEUR_SECONDAIRE: 'Auditeur secondaire',
  EXPERT_REVIEWER: 'Expert reviewer',
  OBSERVATEUR: 'Observateur',
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

  const [sitesEntreprise, setSitesEntreprise] = useState([]);
  const [sitesAudit, setSitesAudit] = useState([]);
  const [selectionSites, setSelectionSites] = useState([]);
  const [sauvegardeSitesEnCours, setSauvegardeSitesEnCours] = useState(false);

  const [membres, setMembres] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [nouvelAuditeurId, setNouvelAuditeurId] = useState('');
  const [nouveauRoleMission, setNouveauRoleMission] = useState('AUDITEUR_PRINCIPAL');
  const [actionEquipeEnCours, setActionEquipeEnCours] = useState(false);
  const [erreurEquipe, setErreurEquipe] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`),
      api.get(`/api/v1/entreprises/${entrepriseId}/sites`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`),
      api.get(`/api/v1/entreprises/${entrepriseId}/membres`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/auditeurs`),
    ])
      .then(([a, c, se, sa, m, e]) => {
        setAudit(a);
        setCriteres(c);
        setSitesEntreprise(se.filter((s) => s.statut === 'ACTIF'));
        setSitesAudit(sa);
        setSelectionSites(sa.map((s) => s.id));
        setMembres(m);
        setEquipe(e);
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

  const candidatsAuditeurs = useMemo(
    () =>
      membres.filter(
        (m) =>
          m.statut === 'ACTIF' &&
          ROLES_INTERNES_SMARTEX.includes(m.roleCode) &&
          !equipe.some((eq) => eq.utilisateurId === m.utilisateurId)
      ),
    [membres, equipe]
  );

  function basculerSite(siteId) {
    setSelectionSites((prec) => (prec.includes(siteId) ? prec.filter((id) => id !== siteId) : [...prec, siteId]));
  }

  async function enregistrerSites() {
    setErreurEquipe(null);
    setSauvegardeSitesEnCours(true);
    try {
      const sites = await api.put(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/sites`, {
        siteIds: selectionSites,
      });
      setSitesAudit(sites);
    } catch (err) {
      setErreurEquipe(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setSauvegardeSitesEnCours(false);
    }
  }

  async function affecterAuditeur() {
    if (!nouvelAuditeurId) return;
    setErreurEquipe(null);
    setActionEquipeEnCours(true);
    try {
      await api.put(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/auditeurs/${nouvelAuditeurId}`, {
        roleMission: nouveauRoleMission,
      });
      const e = await api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/auditeurs`);
      setEquipe(e);
      setNouvelAuditeurId('');
    } catch (err) {
      setErreurEquipe(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setActionEquipeEnCours(false);
    }
  }

  async function retirerAuditeur(utilisateurId) {
    setErreurEquipe(null);
    try {
      await api.delete(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/auditeurs/${utilisateurId}`);
      setEquipe((prec) => prec.filter((eq) => eq.utilisateurId !== utilisateurId));
    } catch (err) {
      setErreurEquipe(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  const criteresFiltres = useMemo(() => {
    if (!criteres) return [];
    const q = recherche.trim().toLowerCase();
    if (!q) return criteres;
    return criteres.filter(
      (c) => c.critereCode.toLowerCase().includes(q) || c.critereLibelle.toLowerCase().includes(q)
    );
  }, [criteres, recherche]);

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

          {erreurEquipe ? <Alerte ton="rouge">{erreurEquipe}</Alerte> : null}

          <Revele>
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <CardHeader titre="Sites de la mission" sousTitre="Sites de l'entreprise couverts par cette mission." icone={MapPin} />
                {sitesEntreprise.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">
                    Aucun site actif pour cette entreprise — la mission porte sur l'entreprise entière.
                  </p>
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

              <Card className="p-5">
                <CardHeader titre="Équipe affectée" sousTitre="Auditeurs et experts Smartex affectés à cette mission." icone={Users} />
                {equipe.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">Aucun membre affecté pour l'instant.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {equipe.map((eq) => (
                      <li key={eq.utilisateurId} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          {eq.prenom} {eq.nom}
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge ton="bleu">{LIBELLE_ROLE_MISSION[eq.roleMission] ?? eq.roleMission}</Badge>
                          {peutModifier ? (
                            <button
                              type="button"
                              className="btn-ghost p-1"
                              aria-label={`Retirer ${eq.prenom} ${eq.nom}`}
                              onClick={() => retirerAuditeur(eq.utilisateurId)}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {peutModifier ? (
                  candidatsAuditeurs.length === 0 ? (
                    <p className="mt-4 text-xs text-ink-500">
                      Aucun autre membre du personnel Smartex (SUPER_ADMIN, ADMIN_AUDIT, EXPERT_REVIEWER) disponible à affecter.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <div className="min-w-[10rem] flex-1">
                        <label className="label" htmlFor="nouvel-auditeur">
                          Ajouter un membre
                        </label>
                        <select
                          id="nouvel-auditeur"
                          className="input text-sm"
                          value={nouvelAuditeurId}
                          onChange={(e) => setNouvelAuditeurId(e.target.value)}
                        >
                          <option value="">Choisir…</option>
                          {candidatsAuditeurs.map((m) => (
                            <option key={m.utilisateurId} value={m.utilisateurId}>
                              {m.prenom} {m.nom} ({m.roleCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-44">
                        <label className="label" htmlFor="role-mission">
                          Rôle sur la mission
                        </label>
                        <select
                          id="role-mission"
                          className="input text-sm"
                          value={nouveauRoleMission}
                          onChange={(e) => setNouveauRoleMission(e.target.value)}
                        >
                          {Object.entries(LIBELLE_ROLE_MISSION).map(([code, libelle]) => (
                            <option key={code} value={code}>
                              {libelle}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!nouvelAuditeurId || actionEquipeEnCours}
                        onClick={affecterAuditeur}
                      >
                        <UserPlus className="h-4 w-4" aria-hidden />
                        Affecter
                      </button>
                    </div>
                  )
                ) : null}
              </Card>
            </div>
          </Revele>

          <Revele delai={60}>
            <Card className="p-0">
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
                    <tr key={c.id} className="transition-colors hover:bg-ink-50/60">
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
                        : 'Aucun critère ne correspond à cette recherche.'
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
