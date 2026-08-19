import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, PlusCircle } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { Alerte, Badge, Card, PageTitre, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';

/** RG24/RG25 : la création exige une formule payante (Free refusée par l'API). */
export default function Entreprises() {
  const { entreprises, creerEntreprise } = useApiAuth();

  const [secteurs, setSecteurs] = useState([]);
  const [formulaire, setFormulaire] = useState({
    raisonSociale: '',
    identifiantLegal: '',
    secteurCode: '',
    taille: 'PME',
    formuleCode: 'STANDARD',
    periodicite: 'ANNUELLE',
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

  return (
    <>
      <PageTitre
        icone={Building2}
        titre="Entreprises"
        description="Chaque entreprise est créée avec un abonnement (RG24) — la formule Free ne permet pas la création (RG25)."
        actions={
          <button type="button" className="btn-primary" onClick={() => setAfficherFormulaire((v) => !v)}>
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nouvelle entreprise
          </button>
        }
      />

      {afficherFormulaire ? (
        <Card className="mb-6 p-5">
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
              <div>
                <label className="label" htmlFor="periodicite">
                  Périodicité
                </label>
                <select
                  id="periodicite"
                  className="input"
                  value={formulaire.periodicite}
                  onChange={(e) => setFormulaire({ ...formulaire, periodicite: e.target.value })}
                >
                  <option value="MENSUELLE">Mensuelle</option>
                  <option value="ANNUELLE">Annuelle</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={chargement}>
              {chargement ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Créer l’entreprise
            </button>
          </form>
        </Card>
      ) : null}

      {entreprises.length === 0 ? (
        <Vide message="Aucune entreprise pour l’instant." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entreprises.map((e) => (
            <Link key={e.id} to={`/app/${e.id}`} className="card block p-5 transition-shadow hover:shadow-md">
              <p className="font-medium text-ink-900">{e.raisonSociale}</p>
              <p className="mt-0.5 text-xs text-ink-500">{e.identifiantLegal}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.secteurCode ? <Badge>{e.secteurCode}</Badge> : null}
                {e.taille ? <Badge>{e.taille}</Badge> : null}
                <Badge ton={e.statut === 'ACTIF' ? 'vert' : 'neutre'}>{e.statut}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
