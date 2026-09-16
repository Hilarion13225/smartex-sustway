import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, History, Search } from 'lucide-react';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDateHeure } from '../lib/export';

const TAILLE_PAGE = 50;

const TONS_ENTITE = {
  document: 'bleu',
  preuve: 'bleu',
  evaluation: 'violet',
  audit: 'vert',
  entreprise: 'vert',
  site: 'neutre',
  abonnement: 'ambre',
  paiement: 'ambre',
  utilisateur: 'neutre',
};

/**
 * RG19 / §1.4 — journal d'audit de l'entreprise : toute action importante
 * est tracée, y compris les accès en lecture aux documents sensibles.
 */
export default function Journal() {
  const { entrepriseId } = useParams();
  const { entreprises } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [entrees, setEntrees] = useState([]);
  const [page, setPage] = useState(0);
  const [finAtteinte, setFinAtteinte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');

  // `page` ne retient que la dernière page réellement obtenue : un lot qui
  // échoue ne doit pas être compté comme lu, sinon le bouton « Charger plus »
  // reprendrait à la page suivante et sauterait les entrées manquantes.
  const charger = useCallback(
    (numeroPage) => {
      setChargement(true);
      setErreur(null);
      api
        .get(`/api/v1/entreprises/${entrepriseId}/journal?page=${numeroPage}&taille=${TAILLE_PAGE}`)
        .then((lot) => {
          setEntrees((prev) => (numeroPage === 0 ? lot : [...prev, ...lot]));
          setPage(numeroPage);
          setFinAtteinte(lot.length < TAILLE_PAGE);
        })
        // Un lot plus court que la page marque la fin du journal — un échec
        // de chargement, non : le marquer ainsi arrêtait la liste en silence,
        // sans rien dire, et laissait croire le journal complet.
        .catch((err) =>
          setErreur(err instanceof ApiError ? err.message : 'Chargement du journal impossible')
        )
        .finally(() => setChargement(false));
    },
    [entrepriseId]
  );

  useEffect(() => {
    setPage(0);
    setFinAtteinte(false);
    charger(0);
  }, [charger]);

  const entreesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return entrees;
    return entrees.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.entite.toLowerCase().includes(q) ||
        (e.utilisateurNom ?? '').toLowerCase().includes(q)
    );
  }, [entrees, recherche]);

  function chargerSuite() {
    charger(page + 1);
  }

  function exporter() {
    exporterCsv(
      'journal-audit.csv',
      ['Horodatage', 'Utilisateur', 'Action', 'Entité', 'Identifiant', 'Adresse IP'],
      entrees.map((e) => [
        formaterDateHeure(e.createdAt),
        e.utilisateurNom ?? 'Système',
        e.action,
        e.entite,
        e.entiteId ?? '—',
        e.ipAddress ?? '—',
      ])
    );
  }

  if (!entreprise) {
    return <Vide message="Organisation introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’organisation
      </Link>

      <PageTitre
        icone={History}
        titre="Journal d’audit"
        description={`${entreprise.raisonSociale} — traçabilité des actions et des accès, y compris la consultation des documents sensibles.`}
        actions={
          entrees.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={exporter}>
              <Download className="h-4 w-4" aria-hidden />
              Exporter en CSV
            </button>
          ) : null
        }
      />

      <Revele>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard libelle="Entrées chargées" valeur={entrees.length} icone={History} ton="bleu" />
          <StatCard
            libelle="Types d’action"
            valeur={new Set(entrees.map((e) => e.action)).size}
            icone={History}
            ton="neutre"
          />
          <StatCard
            libelle="Dernière action"
            valeur={entrees[0] ? formaterDateHeure(entrees[0].createdAt) : '—'}
            detail={entrees[0]?.utilisateurNom ?? undefined}
            icone={History}
            ton="neutre"
          />
        </div>
      </Revele>

      <Revele delai={80}>
        <Card className="p-0">
          <CardHeader titre="Événements" sousTitre={`${entreesFiltrees.length} entrée(s) affichée(s)`} />
          <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
            <Search className="h-4 w-4 text-ink-400" aria-hidden />
            <input
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-ink-400"
              placeholder="Filtrer par action, entité ou utilisateur…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          {erreur ? (
            <div className="px-5 pt-4">
              <Alerte ton="rouge">{erreur}</Alerte>
            </div>
          ) : null}

          {entreesFiltrees.length > 0 ? (
            <Tableau entetes={['Horodatage', 'Utilisateur', 'Action', 'Entité', 'Identifiant']}>
              {entreesFiltrees.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-ink-100/60">
                  <td className="td whitespace-nowrap text-sm text-ink-600">{formaterDateHeure(e.createdAt)}</td>
                  <td className="td text-sm text-ink-700">{e.utilisateurNom ?? 'Système'}</td>
                  <td className="td font-medium text-ink-900">{e.action}</td>
                  <td className="td">
                    <Badge ton={TONS_ENTITE[e.entite] ?? 'neutre'}>{e.entite}</Badge>
                  </td>
                  <td className="td font-mono text-xs text-ink-400">{e.entiteId ?? '—'}</td>
                </tr>
              ))}
            </Tableau>
          ) : chargement ? (
            <Loader message="Chargement du journal…" />
          ) : erreur ? null : (
            <div className="p-6">
              <Vide message="Aucune entrée dans le journal pour cette organisation." />
            </div>
          )}

          {!finAtteinte ? (
            <div className="border-t border-ink-100 p-4 text-center">
              <button type="button" className="btn-secondary" disabled={chargement} onClick={chargerSuite}>
                {erreur ? 'Réessayer' : 'Charger plus d’entrées'}
              </button>
            </div>
          ) : null}
        </Card>
      </Revele>
    </>
  );
}
