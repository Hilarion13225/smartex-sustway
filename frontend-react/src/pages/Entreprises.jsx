import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Clock, PlusCircle, Search, Sparkles, X } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Badge, Card, PageTitre } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';

/** Au-delà de ce nombre d'entreprises, la page affiche un champ de recherche (cas SUPER_ADMIN, accès global). */
const SEUIL_RECHERCHE = 6;

/** RG24/RG25 : la création exige une formule payante (Free refusée par l'API). */
export default function Entreprises() {
  const { entreprises, creerEntreprise, peut } = useApiAuth();
  const [recherche, setRecherche] = useState('');

  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({
    raisonSociale: '',
    identifiantLegal: '',
    secteurCode: '',
    taille: 'PME',
    formuleCode: 'STANDARD',
  });
  const [afficherFormulaire, setAfficherFormulaire] = useState(entreprises.length === 0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api
      .get('/api/v1/secteurs', { avecAuth: false })
      .then((liste) => {
        setSecteurs(liste);
        if (liste.length) setFormulaire((f) => ({ ...f, secteurCode: liste[0].code }));
      })
      .catch(() => setSecteurs([]));
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await creerEntreprise(formulaire);
      setFormulaire((f) => ({ ...f, raisonSociale: '', identifiantLegal: '' }));
      setAfficherFormulaire(false);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  const nombreActives = entreprises.filter((e) => e.statut === 'ACTIF').length;
  const nombreEnAttente = entreprises.length - nombreActives;

  // entreprise:creer n'est volontairement pas vérifiée quand l'utilisateur
  // n'a encore aucune entreprise (rôle transitoire AUCUN_ROLE_ATTRIBUE,
  // absent du modèle de permissions — peut() renverrait toujours faux et
  // bloquerait la création de la toute première entreprise). Au-delà,
  // un utilisateur déjà rattaché sans cette permission (VISITEUR) ne doit
  // plus voir un bouton qui échouerait au clic.
  const peutCreer = entreprises.length === 0 || peut('entreprise:creer');

  const entreprisesFiltrees = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    if (!requete) return entreprises;
    return entreprises.filter(
      (e) => e.raisonSociale.toLowerCase().includes(requete) || e.identifiantLegal?.toLowerCase().includes(requete)
    );
  }, [entreprises, recherche]);

  const statistiques = [
    { libelle: 'Entreprises suivies', valeur: entreprises.length, icone: Building2, ton: 'bleu' },
    { libelle: 'Abonnements actifs', valeur: nombreActives, icone: CheckCircle2, ton: 'vert' },
    { libelle: 'En attente', valeur: nombreEnAttente, icone: Clock, ton: 'ambre' },
  ];

  const TONS_PUCE = {
    bleu: 'bg-blue-50 text-blue-600 ring-blue-100',
    vert: 'bg-brand-50 text-brand-600 ring-brand-100',
    ambre: 'bg-amber-50 text-amber-600 ring-amber-100',
  };

  return (
    <>
      <PageTitre
        icone={Building2}
        titre="Entreprises"
        description="Chaque entreprise est créée avec un abonnement — la formule Free ne permet pas la création."
        actions={
          peutCreer ? (
            <button type="button" className="btn-vitrine" onClick={() => setAfficherFormulaire((v) => !v)}>
              {afficherFormulaire ? <X className="h-4 w-4" aria-hidden /> : <PlusCircle className="h-4 w-4" aria-hidden />}
              {afficherFormulaire ? 'Fermer' : 'Nouvelle entreprise'}
            </button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {statistiques.map((stat, index) => (
          <Revele key={stat.libelle} delai={index * 90} className="carte-stat">
            <span className={`rounded-xl p-3 ring-1 ${TONS_PUCE[stat.ton]}`}>
              <stat.icone className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{stat.libelle}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-900">{stat.valeur}</p>
            </div>
          </Revele>
        ))}
      </div>

      {afficherFormulaire ? (
        <Card className="mb-6 overflow-hidden p-5 motion-safe:animate-apparition-bas">
          <form className="space-y-4" onSubmit={soumettre}>
            {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="raisonSociale">
                  Raison sociale
                </label>
                <input
                  id="raisonSociale"
                  required
                  className="input"
                  value={formulaire.raisonSociale}
                  onChange={(e) => setFormulaire({ ...formulaire, raisonSociale: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="identifiantLegal">
                  Identifiant légal
                </label>
                <input
                  id="identifiantLegal"
                  required
                  className="input"
                  value={formulaire.identifiantLegal}
                  onChange={(e) => setFormulaire({ ...formulaire, identifiantLegal: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="secteurCode">
                  Secteur d’activité
                </label>
                <select
                  id="secteurCode"
                  className="input"
                  value={formulaire.secteurCode}
                  onChange={(e) => setFormulaire({ ...formulaire, secteurCode: e.target.value })}
                >
                  {secteurs.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="taille">
                  Taille
                </label>
                <select
                  id="taille"
                  className="input"
                  value={formulaire.taille}
                  onChange={(e) => setFormulaire({ ...formulaire, taille: e.target.value })}
                >
                  <option value="TPE">TPE</option>
                  <option value="PME">PME</option>
                  <option value="ETI">ETI</option>
                  <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="formuleCode">
                  Formule
                </label>
                <select
                  id="formuleCode"
                  className="input"
                  value={formulaire.formuleCode}
                  onChange={(e) => setFormulaire({ ...formulaire, formuleCode: e.target.value })}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="AVANCEES">Avancées</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-vitrine" disabled={chargement}>
              {chargement ? <SustwayLoader taille="sm" /> : null}
              Créer l’entreprise
            </button>
          </form>
        </Card>
      ) : null}

      {entreprises.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-14 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-halo-brand motion-safe:animate-apparition-douce"
            aria-hidden
          />
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="relative mt-4 text-base font-semibold text-ink-900">Aucune entreprise pour l’instant</p>
          <p className="relative mx-auto mt-1 max-w-md text-sm text-ink-500">
            Créez votre première entreprise pour lancer une évaluation RSE et suivre votre score domaine par domaine.
          </p>
          <button type="button" className="btn-vitrine relative mt-5" onClick={() => setAfficherFormulaire(true)}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Créer une entreprise
          </button>
        </div>
      ) : (
        <>
          {entreprises.length > SEUIL_RECHERCHE ? (
            <div className="relative mb-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                type="search"
                className="input pl-9"
                placeholder="Rechercher par raison sociale ou identifiant légal…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
          ) : null}

          {entreprisesFiltrees.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-surface px-6 py-10 text-center text-sm text-ink-500">
              Aucune entreprise ne correspond à « {recherche} ».
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entreprisesFiltrees.map((e, index) => (
                <Revele key={e.id} delai={index * 70}>
                  <Link to={`/app/${e.id}`} className="carte-app group block h-full">
                    <span
                      className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-halo-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition duration-300 group-hover:bg-brand-600 group-hover:text-white">
                        <Building2 className="h-5 w-5" aria-hidden />
                      </span>
                      <ArrowRight
                        className="h-4 w-4 text-ink-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600"
                        aria-hidden
                      />
                    </div>
                    <p className="relative mt-4 font-semibold text-ink-900">{e.raisonSociale}</p>
                    <p className="relative mt-0.5 text-xs text-ink-500">{e.identifiantLegal}</p>
                    <div className="relative mt-3 flex flex-wrap gap-2">
                      {e.secteurCode ? <Badge>{e.secteurCode}</Badge> : null}
                      {e.taille ? <Badge>{e.taille}</Badge> : null}
                      <Badge ton={e.statut === 'ACTIF' ? 'vert' : 'neutre'}>{e.statut}</Badge>
                    </div>
                  </Link>
                </Revele>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
