import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Download, FolderKanban, Trash2 } from 'lucide-react';
import Revele from '../components/Revele';
import Breadcrumb from '../components/Breadcrumb';
import { Alerte, Badge, Card, Loader, PageTitre, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { exporterCsv } from '../lib/export';
import { formaterScore } from '../lib/scoreAffiche';
import { STATUTS_PROJET as STATUTS } from '../lib/tonsStatuts';


/** Statut d'une mission, rendu lisible sans réécrire la valeur inconnue. */
const STATUTS_MISSION = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  CLOTURE: 'Clôturée',
};

/** Date ISO rendue en français ; renvoie la valeur brute si elle est absente. */
function formaterDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Détail d'un projet : ses organisations, l'avancement de leurs missions et
 * leur comparaison.
 *
 * Les scores sont chargés mission par mission plutôt qu'agrégés côté serveur :
 * chaque mission garde son propre calcul pondéré, et la comparaison se contente
 * de les mettre côte à côte — c'est ce qui garantit qu'aucune moyenne
 * intermédiaire ne vient déformer le score d'une organisation.
 */
export default function ProjetDetail() {
  const { projetId } = useParams();
  const navigate = useNavigate();

  const [projet, setProjet] = useState(null);
  const [scores, setScores] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [domaineChoisi, setDomaineChoisi] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const detail = await api.get(`/api/v1/projets/${projetId}`);
      setProjet(detail);

      const paires = await Promise.all(
        (detail.entreprises ?? [])
          .filter((ligne) => ligne.auditId)
          .map(async (ligne) => [
            ligne.entrepriseId,
            await api
              .get(`/api/v1/entreprises/${ligne.entrepriseId}/audits/${ligne.auditId}/score`)
              .catch(() => null),
          ])
      );
      setScores(Object.fromEntries(paires));
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [projetId]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Domaines proposés à la comparaison : ceux évalués sur au moins une mission. */
  const domaines = useMemo(() => {
    const connus = new Map();
    Object.values(scores).forEach((score) =>
      (score?.domaines ?? []).forEach((d) => {
        if (!connus.has(d.domaineCode)) connus.set(d.domaineCode, d.domaineNom ?? d.domaineCode);
      })
    );
    return [...connus.entries()].map(([code, nom]) => ({ code, nom }));
  }, [scores]);

  /**
   * Lignes du tableau, triées par score décroissant sur le périmètre choisi.
   * Une organisation sans mission ou sans critère évalué reste affichée, sans
   * rang : la masquer laisserait croire qu'elle ne fait pas partie du projet.
   */
  const lignes = useMemo(() => {
    const enrichies = (projet?.entreprises ?? []).map((ligne) => {
      const score = scores[ligne.entrepriseId];
      const perimetre = domaineChoisi
        ? score?.domaines?.find((d) => d.domaineCode === domaineChoisi)
        : score;

      const evalues = perimetre?.nombreCriteresEvalues ?? 0;
      return {
        ...ligne,
        valeur: evalues > 0 ? Number(domaineChoisi ? perimetre.score : perimetre.scoreGlobal) : null,
        note: Number(perimetre?.noteTotale ?? 0),
        coefficient: Number(perimetre?.coefficientTotal ?? 0),
        evalues,
        total: perimetre?.nombreCriteresTotal ?? 0,
      };
    });

    enrichies.sort((a, b) => {
      if (a.valeur == null && b.valeur == null) return 0;
      if (a.valeur == null) return 1;
      if (b.valeur == null) return -1;
      return b.valeur - a.valeur;
    });
    return enrichies;
  }, [projet, scores, domaineChoisi]);

  const intitule = domaineChoisi
    ? domaines.find((d) => d.code === domaineChoisi)?.nom ?? domaineChoisi
    : 'Score global';

  function exporter() {
    exporterCsv(
      `projet-${projet.nom}.csv`,
      ['Rang', 'Organisation', 'Mission', 'Statut', 'Note totale', 'Coefficient total', 'Score', 'Critères évalués'],
      lignes.map((l, index) => [
        l.valeur == null ? '' : index + 1,
        l.raisonSociale,
        l.auditNom ?? '',
        l.auditStatut ? STATUTS_MISSION[l.auditStatut] ?? l.auditStatut : 'Mission non créée',
        l.note,
        l.coefficient,
        l.valeur == null ? '' : formaterScore(l.valeur),
        `${l.evalues}/${l.total}`,
      ])
    );
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer le projet « ${projet.nom} » ? Les missions déjà créées sont conservées.`)) {
      return;
    }
    await api.delete(`/api/v1/projets/${projetId}`);
    navigate('/app/projets');
  }

  if (chargement) return <Loader message="Chargement du projet…" />;
  if (erreur) return <Alerte ton="rouge">{erreur}</Alerte>;
  if (!projet) return <Vide message="Projet introuvable." />;

  const sansMission = lignes.filter((l) => !l.auditId);

  return (
    <div className="space-y-5">
      <Breadcrumb
        elements={[
          { libelle: 'Projets d’audit', vers: '/app/projets' },
          { libelle: projet.nom },
        ]}
      />

      {/* L'en-tête passe par `PageTitre` comme toutes les autres pages : cet
          écran et le tableau de bord étaient les deux derniers à recomposer le
          leur à la main. Le badge de statut voyage dans `actions`, la même
          convention que la fiche d'un référentiel. */}
      <PageTitre
        icone={FolderKanban}
        titre={projet.nom}
        description={projet.description || undefined}
        actions={
          <Badge ton={STATUTS[projet.statut]?.ton ?? 'neutre'}>
            {STATUTS[projet.statut]?.libelle ?? projet.statut}
          </Badge>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-ink-500">
          {projet.referentielNom} · du {formaterDate(projet.dateDebut)}
          {projet.dateFin ? ` au ${formaterDate(projet.dateFin)}` : ''} ·{' '}
          {projet.nombreEntreprises}{' '}
          organisation{projet.nombreEntreprises > 1 ? 's' : ''}
        </p>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {/* Largeur bornée : les noms de domaines du référentiel Smartex font
              plusieurs lignes, et un select en largeur automatique étirerait
              la page bien au-delà de l'écran sur mobile. */}
          <select
            className="input w-full sm:w-56"
            aria-label="Comparer sur un domaine"
            value={domaineChoisi}
            onChange={(e) => setDomaineChoisi(e.target.value)}
          >
            <option value="">Score global</option>
            {domaines.map((d) => (
              <option key={d.code} value={d.code}>
                {d.nom}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={exporter}>
            <Download className="h-4 w-4" aria-hidden />
            Exporter
          </button>
          <button type="button" className="btn-secondary" onClick={supprimer}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer
          </button>
        </div>
      </div>

      {sansMission.length > 0 ? (
        <Alerte ton="ambre">
          {sansMission.length} organisation{sansMission.length > 1 ? 's n’ont' : ' n’a'} pas de
          mission générée, faute d’abonnement actif :{' '}
          {sansMission.map((l) => l.raisonSociale).join(', ')}.
        </Alerte>
      ) : null}

      <Revele>
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">Comparaison — {intitule}</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Note totale, coefficient total et score pondéré de chaque organisation du projet.
          </p>

          <div className="mt-4 hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="th w-12">Rang</th>
                  <th className="th">Organisation</th>
                  <th className="th">Mission</th>
                  <th className="th text-right">Note</th>
                  <th className="th text-right">Coef.</th>
                  <th className="th text-right">Score</th>
                  <th className="th text-right">Évalués</th>
                  <th className="th sr-only">Ouvrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {lignes.map((l, index) => (
                  <tr key={l.entrepriseId} className="transition-colors hover:bg-ink-50">
                    <td className="td font-semibold tabular-nums text-ink-900">
                      {l.valeur == null ? '—' : index + 1}
                    </td>
                    <td className="td max-w-[14rem] truncate font-medium text-ink-900">
                      {l.raisonSociale}
                    </td>
                    <td className="td max-w-[12rem] text-ink-600">
                      <span className="block truncate">{l.auditNom ?? 'Mission non créée'}</span>
                      {l.auditStatut ? (
                        <span className="block text-xs text-ink-400">
                          {STATUTS_MISSION[l.auditStatut] ?? l.auditStatut}
                        </span>
                      ) : null}
                    </td>
                    <td className="td text-right tabular-nums">{l.note}</td>
                    <td className="td text-right tabular-nums">{l.coefficient}</td>
                    <td className="td text-right font-semibold tabular-nums text-ink-900">
                      {l.valeur == null ? '—' : `${formaterScore(l.valeur)} / 5`}
                    </td>
                    <td className="td text-right tabular-nums text-ink-500">
                      {l.evalues}/{l.total}
                    </td>
                    <td className="td text-right">
                      {l.auditId ? (
                        <Link
                          to={`/app/${l.entrepriseId}/audits/${l.auditId}`}
                          aria-label={`Ouvrir la mission de ${l.raisonSociale}`}
                          className="inline-flex rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sous `lg` : une carte par organisation. */}
          <ul className="mt-4 space-y-3 lg:hidden">
            {lignes.map((l, index) => (
              <li
                key={l.entrepriseId}
                className="rounded-2xl border border-ink-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {l.valeur == null ? '' : `${index + 1}. `}
                      {l.raisonSociale}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {l.auditNom ?? 'Mission non créée'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
                    {l.valeur == null ? '—' : `${formaterScore(l.valeur)} / 5`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {l.auditStatut ? `${STATUTS_MISSION[l.auditStatut] ?? l.auditStatut} · ` : ''}
                  note {l.note} · coefficient {l.coefficient} · {l.evalues}/{l.total} critères
                  évalués
                </p>
                {l.auditId ? (
                  <Link
                    to={`/app/${l.entrepriseId}/audits/${l.auditId}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600"
                  >
                    Ouvrir la mission
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </Revele>
    </div>
  );
}
