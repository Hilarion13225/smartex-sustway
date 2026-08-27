import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PlusCircle } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { ROLE_LIBELLE } from '../auth/permissions';

const TYPES_REFERENTIEL = ['SMARTEX', 'PRI', 'GRESB', 'ITIE', 'IFC_SFI'];
const STATUTS = ['ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE'];

/** Module 4 (back-office) : gestion des référentiels — réservé à SUPER_ADMIN. */
export default function ReferentielsListe() {
  const { roleCourant, peut } = useApiAuth();

  const [referentiels, setReferentiels] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurGlobale, setErreurGlobale] = useState(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const rafraichir = useCallback(() => {
    setChargement(true);
    setErreurGlobale(null);
    api
      .get('/api/v1/referentiels')
      .then(setReferentiels)
      .catch((err) => setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function changerStatut(code, statut) {
    setErreurGlobale(null);
    try {
      await api.put(`/api/v1/referentiels/${code}`, { statut });
      rafraichir();
    } catch (err) {
      setErreurGlobale(err instanceof ApiError ? err.message : 'Erreur inattendue');
    }
  }

  if (!peut('referentiel:administrer')) {
    return <Alerte ton="ambre">Cet espace est réservé aux super-administrateurs (rôle actuel : {ROLE_LIBELLE[roleCourant] ?? 'aucun'}).</Alerte>;
  }

  return (
    <>
      <PageTitre
        icone={BookOpen}
        titre="Référentiels"
        description="Module 4 — back-office : référentiels, domaines et critères d'évaluation."
        actions={
          <button type="button" className="btn-primary" onClick={() => setAfficherFormulaire((v) => !v)}>
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nouveau référentiel
          </button>
        }
      />

      {erreurGlobale ? <Alerte ton="rouge">{erreurGlobale}</Alerte> : null}

      {afficherFormulaire ? (
        <Revele>
          <Card className="mb-6 p-5">
            <NouveauReferentielFormulaire
              onCree={() => {
                setAfficherFormulaire(false);
                rafraichir();
              }}
            />
          </Card>
        </Revele>
      ) : null}

      {chargement ? (
        <Loader message="Chargement des référentiels…" />
      ) : referentiels && referentiels.length > 0 ? (
        <Revele delai={80}>
          <Card>
            <Tableau entetes={['Code', 'Nom', 'Type', 'Version', 'Statut', '']}>
              {referentiels.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-ink-100/60">
                  <td className="td font-mono text-xs text-ink-500">{r.code}</td>
                  <td className="td font-medium text-ink-900">{r.nom}</td>
                  <td className="td">{r.type}</td>
                  <td className="td">{r.version}</td>
                  <td className="td">
                    <select
                      className="input w-auto py-1 text-xs"
                      value={r.statut}
                      onChange={(e) => changerStatut(r.code, e.target.value)}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="td text-right">
                    <Link to={`/app/referentiels/${r.code}`} className="btn-ghost">
                      Gérer
                    </Link>
                  </td>
                </tr>
              ))}
            </Tableau>
          </Card>
        </Revele>
      ) : (
        <Vide message="Aucun référentiel — créez le premier." />
      )}
    </>
  );
}

function NouveauReferentielFormulaire({ onCree }) {
  const [formulaire, setFormulaire] = useState({ code: '', nom: '', type: 'SMARTEX', version: '1.0', description: '' });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      await api.post('/api/v1/referentiels', formulaire);
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Erreur inattendue');
    } finally {
      setChargement(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={creer}>
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ref-code">
            Code
          </label>
          <input
            id="ref-code"
            required
            className="input"
            placeholder="SMARTEX_SUSTWAY"
            value={formulaire.code}
            onChange={(e) => setFormulaire({ ...formulaire, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="label" htmlFor="ref-nom">
            Nom
          </label>
          <input
            id="ref-nom"
            required
            className="input"
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="ref-type">
            Type
          </label>
          <select
            id="ref-type"
            className="input"
            value={formulaire.type}
            onChange={(e) => setFormulaire({ ...formulaire, type: e.target.value })}
          >
            {TYPES_REFERENTIEL.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ref-version">
            Version
          </label>
          <input
            id="ref-version"
            className="input"
            value={formulaire.version}
            onChange={(e) => setFormulaire({ ...formulaire, version: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ref-description">
            Description (optionnelle)
          </label>
          <input
            id="ref-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer le référentiel
      </button>
    </form>
  );
}
