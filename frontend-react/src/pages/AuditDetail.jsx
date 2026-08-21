import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, ClipboardX, FileText, Gauge, Leaf, Search } from 'lucide-react';
import Revele from '../components/Revele';
import { Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
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
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [criteres, setCriteres] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');

  const rafraichir = useCallback(() => {
    setChargement(true);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres`),
    ])
      .then(([a, c]) => {
        setAudit(a);
        setCriteres(c);
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

          <Revele>
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
