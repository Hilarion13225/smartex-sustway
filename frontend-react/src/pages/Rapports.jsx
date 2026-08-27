import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError, telechargerFichierProtege } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';

const TONS_FORMAT = { PDF: 'rouge', CSV: 'vert', EXCEL: 'bleu' };

const LIBELLE_TYPE = {
  SYNTHESE: 'Synthèse',
  DETAILLE: 'Détaillé',
  PLAN_ACTION: "Plan d'actions",
  INDICE_FINANCEMENTS_VERTS: 'Indice financements verts',
};

const DESCRIPTION_TYPE = {
  SYNTHESE: 'Score global/par domaine + non-conformités de la mission.',
  DETAILLE: "Synthèse complétée de l'évaluation détaillée de chaque critère — réservé au personnel Smartex.",
  PLAN_ACTION: "Une ligne par action corrective, rattachée à sa non-conformité.",
  INDICE_FINANCEMENTS_VERTS: "Alignement avec les critères tagués d'un bailleur — réservé à la formule Avancées.",
};

/** Module 12 — génération et téléchargement des rapports d'une mission (RG32, non-conformités, RG18, RG41/RG42). */
export default function Rapports() {
  const { entrepriseId, auditId } = useParams();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audit, setAudit] = useState(null);
  const [bailleurs, setBailleurs] = useState([]);
  const [rapports, setRapports] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [generationEnCours, setGenerationEnCours] = useState(null);
  const [typeSelectionne, setTypeSelectionne] = useState('SYNTHESE');
  const [bailleurCode, setBailleurCode] = useState('');

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    Promise.all([
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}`),
      api.get('/api/v1/bailleurs'),
      api.get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/rapports`),
    ])
      .then(([a, b, r]) => {
        setAudit(a);
        setBailleurs(b);
        setRapports(r);
      })
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const formuleAvancees = audit?.formuleCode === 'AVANCEES';

  // RG41 : réservé à la formule Avancées, restriction stricte sur la formule de l'audit (même règle que IndicePreparation.jsx, staff inclus — pas de dérogation via peut()).
  const typesDisponibles = useMemo(() => {
    const types = ['SYNTHESE', 'PLAN_ACTION'];
    if (peut('rapport:detaille', audit?.formuleCode)) types.push('DETAILLE');
    if (formuleAvancees) types.push('INDICE_FINANCEMENTS_VERTS');
    return types;
  }, [peut, audit?.formuleCode, formuleAvancees]);

  useEffect(() => {
    if (!typesDisponibles.includes(typeSelectionne)) {
      setTypeSelectionne(typesDisponibles[0] ?? 'SYNTHESE');
    }
  }, [typesDisponibles, typeSelectionne]);

  useEffect(() => {
    if (bailleurs.length > 0 && !bailleurCode) {
      setBailleurCode(bailleurs[0].code);
    }
  }, [bailleurs, bailleurCode]);

  const generationBloquee =
    generationEnCours !== null || (typeSelectionne === 'INDICE_FINANCEMENTS_VERTS' && !bailleurCode);

  async function genererRapport(format) {
    setErreurGlobale(null);
    setGenerationEnCours(format);
    try {
      const payload = { type: typeSelectionne, format };
      if (typeSelectionne === 'INDICE_FINANCEMENTS_VERTS') {
        payload.bailleurCode = bailleurCode;
      }
      await api.post(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/rapports`, payload);
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
        description="Génération et téléchargement des rapports de la mission — module 12."
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {chargement ? (
        <Loader message="Chargement des rapports…" />
      ) : (
        <>
          <Revele>
            <Card className="mb-6 p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {typesDisponibles.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={type === typeSelectionne ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setTypeSelectionne(type)}
                  >
                    {LIBELLE_TYPE[type]}
                  </button>
                ))}
              </div>
              <p className="mb-4 text-sm text-ink-500">{DESCRIPTION_TYPE[typeSelectionne]}</p>

              {typeSelectionne === 'INDICE_FINANCEMENTS_VERTS' ? (
                bailleurs.length === 0 ? (
                  <Alerte ton="ambre">Aucun bailleur configuré.</Alerte>
                ) : (
                  <div className="mb-4 max-w-xs">
                    <label className="label" htmlFor="bailleurCode">
                      Bailleur
                    </label>
                    <select
                      id="bailleurCode"
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
                )
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={generationBloquee}
                  onClick={() => genererRapport('CSV')}
                >
                  {generationEnCours === 'CSV' ? <SustwayLoader taille="sm" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden />}
                  Générer en CSV
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={generationBloquee}
                  onClick={() => genererRapport('PDF')}
                >
                  {generationEnCours === 'PDF' ? <SustwayLoader taille="sm" /> : <FileType className="h-4 w-4" aria-hidden />}
                  Générer en PDF
                </button>
              </div>
            </Card>
          </Revele>

          {rapports && rapports.length > 0 ? (
            <Revele delai={80}>
              <Card>
                <Tableau entetes={['Type', 'Format', 'Généré le', 'Par', '']}>
                  {rapports.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-ink-100/60">
                      <td className="td">{LIBELLE_TYPE[r.type] ?? r.type}</td>
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
      )}
    </>
  );
}
