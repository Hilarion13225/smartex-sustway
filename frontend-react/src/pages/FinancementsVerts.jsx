import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';

/**
 * Vue transverse : l'indice de préparation bailleur (RG39-43) est calculé
 * par mission et par bailleur — cette page liste les missions de
 * l'entreprise avec leurs indices déjà calculés, et renvoie vers la
 * mission pour en calculer un nouveau. Réservé à la formule Avancées, dont
 * le statut est figé sur chaque mission (Audit.formuleAbonnement).
 */
export default function FinancementsVerts() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [lignes, setLignes] = useState(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const audits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`);
      const avecIndices = await Promise.all(
        audits.map(async (audit) => {
          if (audit.formuleCode !== 'AVANCEES') return { audit, indices: null };
          const indices = await api
            .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/indice-preparation`)
            .catch(() => []);
          return { audit, indices };
        })
      );
      setLignes(avecIndices);
    } catch {
      setLignes([]);
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <PageTitre
        icone={Leaf}
        titre="Financements verts"
        description={`${entreprise.raisonSociale} — indice de préparation bailleur (IFC/SFI) par mission, réservé à la formule Avancées.`}
      />

      <Alerte ton="ambre">
        L’indice de préparation est une mesure d’alignement aux exigences du bailleur, et non une garantie
        d’éligibilité au financement. La décision finale relève de la seule compétence du bailleur.
      </Alerte>

      {chargement ? (
        <Loader message="Chargement des missions…" />
      ) : lignes && lignes.length > 0 ? (
        <Revele delai={80}>
          <Card>
            <Tableau entetes={['Mission', 'Formule', 'Indices calculés', '']}>
              {lignes.map(({ audit, indices }) => (
                <tr key={audit.id} className="transition-colors hover:bg-ink-50/60">
                  <td className="td font-medium text-ink-900">{audit.nom}</td>
                  <td className="td">
                    <Badge ton={audit.formuleCode === 'AVANCEES' ? 'vert' : 'neutre'}>{audit.formuleCode ?? '—'}</Badge>
                  </td>
                  <td className="td">
                    {indices === null ? (
                      <span className="text-xs text-ink-400">Formule non éligible</span>
                    ) : indices.length === 0 ? (
                      <span className="text-xs text-ink-400">Aucun indice calculé</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {indices.map((i) => (
                          <span key={i.id} className="rounded-lg border border-ink-100 px-2 py-1 text-xs text-ink-700">
                            {i.bailleurNom} — {Number(i.score).toFixed(2)} / 5
                            <span className="ml-1 text-ink-400">({formaterDate(i.dateCalcul)})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="td text-right">
                    <Link to={`/app/${entrepriseId}/audits/${audit.id}/indice-preparation`} className="btn-ghost">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Tableau>
          </Card>
        </Revele>
      ) : (
        <Vide message="Aucune mission pour l’instant — créez-en une depuis « Missions d’audit »." />
      )}
    </>
  );
}
