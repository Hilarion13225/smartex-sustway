import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Revele from '../components/Revele';
import { Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';

const TONS_STATUT_AUDIT = { BROUILLON: 'neutre', EN_COURS: 'bleu', TERMINE: 'vert', CLOTURE: 'neutre' };

/**
 * Vue transverse : un rapport (module 12 — synthèse, détaillé, plan
 * d'actions ou indice financements verts) porte toujours sur UNE mission
 * précise — cette page ne fait donc que lister les missions et renvoyer
 * vers la génération/le téléchargement des rapports de chacune.
 */
export default function RapportsEntreprise() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audits, setAudits] = useState(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(() => {
    setChargement(true);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits`)
      .then(setAudits)
      .catch(() => setAudits([]))
      .finally(() => setChargement(false));
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
        icone={FileText}
        titre="Rapports RSE"
        description={`${entreprise.raisonSociale} — synthèse, plan d'actions et rapports détaillés, mission par mission.`}
      />

      {chargement ? (
        <Loader message="Chargement des missions…" />
      ) : audits && audits.length > 0 ? (
        <Revele>
          <Card>
            <Tableau entetes={['Mission', 'Référentiel', 'Statut', 'Début', '']}>
              {audits.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-ink-100/60">
                  <td className="td font-medium text-ink-900">{a.nom}</td>
                  <td className="td">{a.referentielCode}</td>
                  <td className="td">
                    <Badge ton={TONS_STATUT_AUDIT[a.statut] ?? 'neutre'}>{a.statut}</Badge>
                  </td>
                  <td className="td text-sm text-ink-600">{formaterDate(a.dateDebut)}</td>
                  <td className="td text-right">
                    <Link to={`/app/${entrepriseId}/audits/${a.id}/rapports`} className="btn-ghost">
                      Voir les rapports
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
