import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError, telechargerFichierProtege } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';

const TONS_FORMAT = { PDF: 'rouge', CSV: 'vert', EXCEL: 'bleu' };

/** Module 12 — génération et téléchargement du rapport de synthèse d'une mission (RG32, non-conformités). */
export default function Rapports() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [rapports, setRapports] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [generationEnCours, setGenerationEnCours] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/rapports`)
      .then(setRapports)
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function genererRapport(format) {
    setErreurGlobale(null);
    setGenerationEnCours(format);
    try {
      await api.post(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/rapports`, {
        type: 'SYNTHESE',
        format,
      });
      rafraichir();
    } catch (err) {
      setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setGenerationEnCours(null);
    }
  }

  async function telecharger(rapport) {
    try {
      await telechargerFichierProtege(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/rapports/${rapport.id}/telechargement`,
        `${rapport.type.toLowerCase()}.${rapport.format.toLowerCase()}`
      );
    } catch (err) {
      setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}/audits/${auditId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la mission
      </Link>

      <PageTitre
        icone={FileText}
        titre="Rapports"
        description="Rapport de synthèse (score global/par domaine + non-conformités) — module 12."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={generationEnCours !== null}
              onClick={() => genererRapport('CSV')}
            >
              {generationEnCours === 'CSV' ? <SustwayLoader taille="sm" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden />}
              Générer en CSV
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={generationEnCours !== null}
              onClick={() => genererRapport('PDF')}
            >
              {generationEnCours === 'PDF' ? <SustwayLoader taille="sm" /> : <FileType className="h-4 w-4" aria-hidden />}
              Générer en PDF
            </button>
          </>
        }
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement des rapports…" />
      ) : rapports && rapports.length > 0 ? (
        <Revele>
          <Card>
            <Tableau entetes={['Type', 'Format', 'Généré le', 'Par', '']}>
              {rapports.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-ink-50/60">
                  <td className="td">{r.type}</td>
                  <td className="td">
                    <Badge ton={TONS_FORMAT[r.format] ?? 'neutre'}>{r.format}</Badge>
                  </td>
                  <td className="td">{formaterDateHeure(r.createdAt)}</td>
                  <td className="td text-ink-500">{r.generePasNom ?? '—'}</td>
                  <td className="td text-right">
                    <button type="button" className="btn-ghost" onClick={() => telecharger(r)}>
                      <Download className="h-4 w-4" aria-hidden />
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </Tableau>
          </Card>
        </Revele>
      ) : (
        <Vide message="Aucun rapport généré pour l’instant — utilisez les boutons ci-dessus pour créer le premier." />
      )}
    </>
  );
}
