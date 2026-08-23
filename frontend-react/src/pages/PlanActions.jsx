import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlarmClock, ArrowLeft, CheckCircle2, Download, ListTodo, PlusCircle, TriangleAlert } from 'lucide-react';
import Revele from '../components/Revele';
import SustwayLoader from '../components/SustwayLoader';
import { COULEURS, GraphiqueAnneau } from '../components/charts';
import { Alerte, Badge, Card, CardHeader, Loader, PageTitre, StatCard, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv, formaterDate } from '../lib/export';

const STATUTS = ['OUVERTE', 'EN_COURS', 'TERMINEE', 'VALIDEE'];

const STATUT_LIBELLE = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  VALIDEE: 'Validée',
};

const STATUT_TON = {
  OUVERTE: 'ambre',
  EN_COURS: 'bleu',
  TERMINEE: 'violet',
  VALIDEE: 'vert',
};

const PRIORITES = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];

const PRIORITE_TON = {
  CRITIQUE: 'rouge',
  HAUTE: 'ambre',
  MOYENNE: 'bleu',
  BASSE: 'neutre',
};

const NIVEAU_TON = {
  CRITIQUE: 'rouge',
  MAJEURE: 'ambre',
  MODEREE: 'bleu',
  MINEURE: 'neutre',
};

function estEnRetard(action) {
  if (!action.dateEcheance) return false;
  if (action.statut === 'TERMINEE' || action.statut === 'VALIDEE') return false;
  return new Date(action.dateEcheance) < new Date(new Date().toDateString());
}

/**
 * RG18 — pilotage transverse du plan d'actions correctives : toutes les
 * actions de l'entreprise, toutes missions confondues, avec échéances,
 * responsables et avancement. Une action reste toujours rattachée à une
 * non-conformité : la création depuis cet écran commence donc par choisir
 * la non-conformité qu'elle traite.
 */
export default function PlanActions() {
  const { entrepriseId } = useParams();
  const { entreprises, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [lignes, setLignes] = useState([]);
  const [nonConformites, setNonConformites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const audits = await api.get(`/api/v1/entreprises/${entrepriseId}/audits`);
      const parAudit = await Promise.all(
        audits.map(async (audit) => {
          const nonConformites = await api
            .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/non-conformites`)
            .catch(() => []);

          const parNc = await Promise.all(
            nonConformites
              .filter((nc) => nc.nombreActionsCorrectives > 0)
              .map(async (nc) => {
                const actions = await api
                  .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/non-conformites/${nc.id}/actions`)
                  .catch(() => []);
                return actions.map((action) => ({ action, nonConformite: nc, audit }));
              })
          );

          return { lignes: parNc.flat(), nonConformites: nonConformites.map((nc) => ({ nonConformite: nc, audit })) };
        })
      );
      setLignes(parAudit.flatMap((r) => r.lignes));
      setNonConformites(parAudit.flatMap((r) => r.nonConformites));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le plan d’actions.');
    } finally {
      setChargement(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const lignesFiltrees = useMemo(
    () => (filtreStatut === 'TOUS' ? lignes : lignes.filter((l) => l.action.statut === filtreStatut)),
    [lignes, filtreStatut]
  );

  const repartition = useMemo(
    () => STATUTS.map((statut) => lignes.filter((l) => l.action.statut === statut).length),
    [lignes]
  );

  const enRetard = useMemo(() => lignes.filter((l) => estEnRetard(l.action)), [lignes]);
  const cloturees = lignes.filter((l) => l.action.statut === 'VALIDEE').length;

  async function changerStatut(ligne, statut) {
    await api.put(
      `/api/v1/entreprises/${entrepriseId}/audits/${ligne.audit.id}/non-conformites/${ligne.nonConformite.id}/actions/${ligne.action.id}/statut`,
      { statut }
    );
    charger();
  }

  function exporter() {
    exporterCsv(
      'plan-actions-correctives.csv',
      ['Mission', 'Non-conformité', 'Niveau', 'Action', 'Priorité', 'Responsable', 'Échéance', 'Statut'],
      lignes.map(({ action, nonConformite, audit }) => [
        audit.nom,
        `${nonConformite.critereCode} — ${nonConformite.titre}`,
        nonConformite.niveau,
        action.titre,
        action.priorite,
        action.responsableNom ?? 'Non affecté',
        action.dateEcheance ? formaterDate(action.dateEcheance) : '—',
        STATUT_LIBELLE[action.statut] ?? action.statut,
      ])
    );
  }

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  const peutPiloter = peut('audit:modifier', entreprise.formuleCode);

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’entreprise
      </Link>

      <PageTitre
        icone={ListTodo}
        titre="Plan d’actions correctives"
        description={`${entreprise.raisonSociale} — suivi transverse des actions issues des non-conformités de toutes les missions.`}
        actions={
          <>
            {peutPiloter && nonConformites.length > 0 ? (
              <button type="button" className="btn-primary" onClick={() => setFormulaireOuvert((v) => !v)}>
                <PlusCircle className="h-4 w-4" aria-hidden />
                Nouvelle action
              </button>
            ) : null}
            {lignes.length > 0 ? (
              <button type="button" className="btn-secondary" onClick={exporter}>
                <Download className="h-4 w-4" aria-hidden />
                Exporter en CSV
              </button>
            ) : null}
          </>
        }
      />

      {formulaireOuvert ? (
        <Revele>
          <Card className="mb-6 p-5">
            <CardHeader
              titre="Nouvelle action corrective"
              icone={PlusCircle}
              sousTitre="L’action est rattachée à la non-conformité qu’elle traite (RG18)."
            />
            <FormulaireAction
              entrepriseId={entrepriseId}
              nonConformites={nonConformites}
              onTermine={() => setFormulaireOuvert(false)}
              onCree={charger}
            />
          </Card>
        </Revele>
      ) : null}

      {erreur ? (
        <div className="mb-6">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

      {chargement ? (
        <Loader message="Consolidation des actions correctives…" />
      ) : lignes.length === 0 ? (
        <Vide message="Aucune action corrective enregistrée. Créez-en une depuis « Nouvelle action » ou depuis une non-conformité." />
      ) : (
        <>
          <Revele>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard libelle="Actions au total" valeur={lignes.length} icone={ListTodo} ton="bleu" />
              <StatCard
                libelle="En retard"
                valeur={enRetard.length}
                detail="Échéance dépassée, action non terminée"
                icone={AlarmClock}
                ton={enRetard.length > 0 ? 'rouge' : 'vert'}
              />
              <StatCard
                libelle="Priorité critique"
                valeur={lignes.filter((l) => l.action.priorite === 'CRITIQUE').length}
                icone={TriangleAlert}
                ton="ambre"
              />
              <StatCard
                libelle="Validées"
                valeur={`${cloturees} / ${lignes.length}`}
                icone={CheckCircle2}
                ton="vert"
              />
            </div>
          </Revele>

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <Revele delai={80}>
              <Card className="h-full p-5">
                <CardHeader titre="Avancement du plan" />
                <div className="mt-4">
                  <GraphiqueAnneau
                    labels={STATUTS.map((s) => STATUT_LIBELLE[s])}
                    data={repartition}
                    couleurs={[COULEURS.ambre, COULEURS.bleu, COULEURS.violet, COULEURS.brand]}
                  />
                </div>
              </Card>
            </Revele>

            <Revele delai={120}>
              <Card className="h-full p-5 lg:col-span-2">
                <CardHeader titre="Échéances les plus proches" icone={AlarmClock} />
                <ul className="mt-4 space-y-3">
                  {[...lignes]
                    .filter((l) => l.action.dateEcheance && l.action.statut !== 'VALIDEE')
                    .sort((a, b) => a.action.dateEcheance.localeCompare(b.action.dateEcheance))
                    .slice(0, 5)
                    .map((l) => (
                      <li key={l.action.id} className="flex items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-none last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{l.action.titre}</p>
                          <p className="truncate text-xs text-ink-500">
                            {l.audit.nom} · {l.nonConformite.critereCode}
                          </p>
                        </div>
                        <Badge ton={estEnRetard(l.action) ? 'rouge' : 'neutre'}>
                          {formaterDate(l.action.dateEcheance)}
                        </Badge>
                      </li>
                    ))}
                </ul>
              </Card>
            </Revele>
          </div>

          <Revele delai={160}>
            <Card className="p-0">
              <CardHeader
                titre="Toutes les actions"
                sousTitre={`${lignesFiltrees.length} action(s) affichée(s)`}
                action={
                  <select
                    className="input w-auto py-1.5 text-sm"
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value)}
                    aria-label="Filtrer par statut"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    {STATUTS.map((statut) => (
                      <option key={statut} value={statut}>
                        {STATUT_LIBELLE[statut]}
                      </option>
                    ))}
                  </select>
                }
              />
              {lignesFiltrees.length > 0 ? (
                <Tableau
                  entetes={['Action', 'Non-conformité', 'Priorité', 'Responsable', 'Échéance', 'Statut', '']}
                >
                  {lignesFiltrees.map(({ action, nonConformite, audit }) => (
                    <tr key={action.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="td">
                        <p className="font-medium text-ink-900">{action.titre}</p>
                        <p className="text-xs text-ink-500">{audit.nom}</p>
                      </td>
                      <td className="td">
                        <Link
                          className="text-sm text-brand-700 hover:underline"
                          to={`/app/${entrepriseId}/audits/${audit.id}/non-conformites`}
                        >
                          {nonConformite.critereCode}
                        </Link>
                        <p className="mt-1">
                          <Badge ton={NIVEAU_TON[nonConformite.niveau] ?? 'neutre'}>{nonConformite.niveau}</Badge>
                        </p>
                      </td>
                      <td className="td">
                        <Badge ton={PRIORITE_TON[action.priorite] ?? 'neutre'}>{action.priorite}</Badge>
                      </td>
                      <td className="td text-sm text-ink-600">{action.responsableNom ?? 'Non affecté'}</td>
                      <td className="td text-sm">
                        {action.dateEcheance ? (
                          <span className={estEnRetard(action) ? 'font-medium text-rose-600' : 'text-ink-600'}>
                            {formaterDate(action.dateEcheance)}
                          </span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="td">
                        <Badge ton={STATUT_TON[action.statut] ?? 'neutre'}>{STATUT_LIBELLE[action.statut]}</Badge>
                      </td>
                      <td className="td">
                        {peutPiloter ? (
                          <select
                            className="input w-auto py-1 text-xs"
                            value={action.statut}
                            onChange={(e) => changerStatut({ action, nonConformite, audit }, e.target.value)}
                            aria-label={`Changer le statut de ${action.titre}`}
                          >
                            {STATUTS.map((statut) => (
                              <option key={statut} value={statut}>
                                {STATUT_LIBELLE[statut]}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </Tableau>
              ) : (
                <div className="p-6">
                  <Vide message="Aucune action ne correspond à ce filtre." />
                </div>
              )}
            </Card>
          </Revele>
        </>
      )}
    </>
  );
}

function FormulaireAction({ entrepriseId, nonConformites, onTermine, onCree }) {
  const [formulaire, setFormulaire] = useState({
    cible: '',
    titre: '',
    description: '',
    dateEcheance: '',
    priorite: 'MOYENNE',
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    const cible = nonConformites.find((c) => `${c.audit.id}:${c.nonConformite.id}` === formulaire.cible);
    if (!cible) {
      setErreur('Sélectionnez la non-conformité traitée par cette action.');
      return;
    }
    setChargement(true);
    try {
      await api.post(
        `/api/v1/entreprises/${entrepriseId}/audits/${cible.audit.id}/non-conformites/${cible.nonConformite.id}/actions`,
        {
          titre: formulaire.titre,
          description: formulaire.description,
          priorite: formulaire.priorite,
          dateEcheance: formulaire.dateEcheance || null,
        }
      );
      onCree();
      onTermine();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={enregistrer}>
      <div>
        <label className="label" htmlFor="action-non-conformite">
          Non-conformité traitée
        </label>
        <select
          id="action-non-conformite"
          required
          className="input"
          value={formulaire.cible}
          onChange={(e) => setFormulaire({ ...formulaire, cible: e.target.value })}
        >
          <option value="">Sélectionner…</option>
          {nonConformites.map(({ nonConformite, audit }) => (
            <option key={nonConformite.id} value={`${audit.id}:${nonConformite.id}`}>
              {audit.nom} — {nonConformite.critereCode} · {nonConformite.titre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="action-titre">
          Titre de l’action
        </label>
        <input
          id="action-titre"
          required
          className="input"
          placeholder="Formaliser la politique RH…"
          value={formulaire.titre}
          onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="action-description">
          Description
        </label>
        <textarea
          id="action-description"
          className="input"
          value={formulaire.description}
          onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="action-echeance">
            Échéance
          </label>
          <input
            id="action-echeance"
            type="date"
            className="input"
            value={formulaire.dateEcheance}
            onChange={(e) => setFormulaire({ ...formulaire, dateEcheance: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="action-priorite">
            Priorité
          </label>
          <select
            id="action-priorite"
            className="input"
            value={formulaire.priorite}
            onChange={(e) => setFormulaire({ ...formulaire, priorite: e.target.value })}
          >
            {PRIORITES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={chargement}>
          {chargement ? <SustwayLoader taille="sm" /> : null}
          Créer l’action
        </button>
        <button type="button" className="btn-ghost" onClick={onTermine}>
          Annuler
        </button>
      </div>

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
    </form>
  );
}
