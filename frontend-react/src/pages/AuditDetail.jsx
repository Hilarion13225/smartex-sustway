import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, MapPin } from 'lucide-react';
import Revele from '../components/Revele';
import SaisieCritereMission from '../components/audit/SaisieCritereMission';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';



/** RG34/RG35 : questionnaire figé de la mission — liste des critères à évaluer. */
export default function AuditDetail() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [chargement, setChargement] = useState(true);

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
            <SaisieCritereMission
              entrepriseId={entrepriseId}
              auditId={auditId}
              criteres={criteres ?? []}
              peutModifier={peutModifier}
              surChangement={rafraichir}
            />
          </Revele>
        </>
      )}
    </>
  );
}
