import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardX, Download } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { COULEURS, GraphiqueAnneau } from '../components/charts';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDate } from '../lib/export';

const NIVEAUX = ['CRITIQUE', 'MAJEURE', 'MODEREE', 'MINEURE'];
const COULEURS_NIVEAU = [COULEURS.rouge, COULEURS.ambre, '#eab308', COULEURS.gris];
const TONS_NIVEAU = { MINEURE: 'neutre', MODEREE: 'bleu', MAJEURE: 'ambre', CRITIQUE: 'rouge' };
const TONS_STATUT = { OUVERTE: 'rouge', EN_TRAITEMENT: 'ambre', CLOTUREE: 'vert' };

/**
 * Vue transverse : toutes les non-conformités de l'entreprise, toutes
 * missions confondues (même agrégation côté client que Plans d'actions,
 * faute d'endpoint d'agrégation dédié). Lecture seule — le traitement
 * (changement de statut, ajout d'actions) reste sur la page de la mission.
 */
export default function NonConformitesEntreprise() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtreNiveau, setFiltreNiveau] = useState('TOUS');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const audits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`);
      const parAudit = await Promise.all(
        audits.map(async (audit) => {
          const nonConformites = await api
            .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/non-conformites`)
            .catch(() => []);
          return nonConformites.map((nc) => ({ nc, audit }));
        })
      );
      setLignes(parAudit.flat());
      setErreur(null);
    } catch {
      setErreur('Impossible de charger les non-conformités.');
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const lignesFiltrees = useMemo(
    () => (filtreNiveau === 'TOUS' ? lignes : lignes.filter((l) => l.nc.niveau === filtreNiveau)),
    [lignes, filtreNiveau]
  );

  const repartition = useMemo(() => NIVEAUX.map((niveau) => lignes.filter((l) => l.nc.niveau === niveau).length), [lignes]);
  const ouvertes = lignes.filter((l) => l.nc.statut !== 'CLOTUREE').length;

  function exporter() {
    exporterCsv(
      'non-conformites.csv',
      ['Mission', 'Critère', 'Titre', 'Niveau', 'Statut', 'Détectée le'],
      lignes.map(({ nc, audit }) => [audit.nom, nc.critereCode, nc.titre, nc.niveau, nc.statut, formaterDate(nc.createdAt)])
    );
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <PageTitre
        icone={ClipboardX}
        titre="Non-conformités"
        description={`${entreprise.raisonSociale} — écarts détectés sur toutes les missions, avec leur niveau de priorité.`}
        actions={
          lignes.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={exporter}>
              <Download className="h-4 w-4" aria-hidden />
              Exporter en CSV
            </button>
          ) : null
        }
      />

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {chargement ? (
        <Loader message="Consolidation des non-conformités…" />
      ) : lignes.length === 0 ? (
        <Vide message="Aucune non-conformité pour l’instant sur les missions de cette entreprise." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard libelle="Total" valeur={lignes.length} icone={ClipboardX} ton="neutre" />
              <StatCard libelle="Encore ouvertes" valeur={ouvertes} icone={ClipboardX} ton={ouvertes > 0 ? 'ambre' : 'vert'} />
              <StatCard
                libelle="Critiques"
                valeur={lignes.filter((l) => l.nc.niveau === 'CRITIQUE').length}
                icone={ClipboardX}
                ton="rouge"
              />
            </div>
          </Revele>

          <Revele delai={80}>
            <Card className="mb-6">
              <CardHeader titre="Répartition par niveau" sousTitre="Toutes missions confondues" />
              <div className="h-64 p-5">
                <GraphiqueAnneau labels={NIVEAUX} data={repartition} couleurs={COULEURS_NIVEAU} />
              </div>
            </Card>
          </Revele>

          <Revele delai={120}>
            <Card className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
                <CardHeader titre="Détail" sousTitre={`${lignesFiltrees.length} sur ${lignes.length}`} />
                <select className="input w-auto" value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)}>
                  <option value="TOUS">Tous les niveaux</option>
                  {NIVEAUX.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <Tableau entetes={['Mission', 'Critère', 'Titre', 'Niveau', 'Statut', 'Détectée le', '']}>
                {lignesFiltrees.map(({ nc, audit }) => (
                  <tr key={nc.id} className="transition-colors hover:bg-ink-50/60">
                    <td className="td text-sm text-ink-600">{audit.nom}</td>
                    <td className="td font-mono text-xs text-ink-500">{nc.critereCode}</td>
                    <td className="td font-medium text-ink-900">{nc.titre}</td>
                    <td className="td">
                      <Badge ton={TONS_NIVEAU[nc.niveau] ?? 'neutre'}>{nc.niveau}</Badge>
                    </td>
                    <td className="td">
                      <Badge ton={TONS_STATUT[nc.statut] ?? 'neutre'}>{nc.statut}</Badge>
                    </td>
                    <td className="td text-sm text-ink-600">{formaterDate(nc.createdAt)}</td>
                    <td className="td text-right">
                      <Link to={`/app/${entrepriseId}/audits/${audit.id}/non-conformites`} className="btn-ghost">
                        Traiter
                      </Link>
                    </td>
                  </tr>
                ))}
              </Tableau>
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}
