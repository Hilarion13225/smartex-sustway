import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, PlusCircle } from 'lucide-react';
import SustwayLoader from '../components/SustwayLoader';
import Revele from '../components/Revele';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import { api, ApiError } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDate } from '../lib/export';

const TONS_STATUT_AUDIT = {
  BROUILLON: 'neutre',
  EN_COURS: 'bleu',
  TERMINE: 'vert',
  CLOTURE: 'neutre',
};

/**
 * RG10/RG11 : liste des missions d'audit d'une entreprise, et création
 * d'une nouvelle mission (le questionnaire est composé dynamiquement côté
 * API à la création — voir QuestionnaireService).
 */
export default function AuditsListe() {
  const { entrepriseId } = useParams();
  const navigate = useNavigate();
  const { entreprises, recupererAbonnement, peut } = useApiAuth();
  const entreprise = entreprises.find((e) => e.id === entrepriseId);

  const [audits, setAudits] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [referentiels, setReferentiels] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  const rafraichir = useCallback(() => {
    setChargement(true);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits`)
      .then(setAudits)
      .catch(() => setAudits([]))
      .finally(() => setChargement(false));
  }, [entrepriseId]);

  useEffect(() => {
    rafraichir();
    api
      .get('/api/v1/referentiels')
      .then((liste) => setReferentiels(liste.filter((r) => r.statut === 'ACTIF')))
      .catch(() => setReferentiels([]));
    recupererAbonnement(entrepriseId)
      .then(setAbonnement)
      .catch(() => setAbonnement(null));
  }, [rafraichir, entrepriseId, recupererAbonnement]);

  const peutCreerAudit = peut('audit:creer', abonnement?.formuleCode);

  if (!entreprise) {
    return <Vide message="Entreprise introuvable ou non accessible." />;
  }

  return (
    <>
      <Link to={`/app/${entrepriseId}`} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à {entreprise.raisonSociale}
      </Link>

      <PageTitre
        icone={ClipboardList}
        titre="Missions d’audit"
        description={`Audits RSE de ${entreprise.raisonSociale} — méthodologie Smartex Sustway.`}
        actions={
          peutCreerAudit ? (
            <button type="button" className="btn-primary" onClick={() => setAfficherFormulaire((v) => !v)}>
              <PlusCircle className="h-4 w-4" aria-hidden />
              Nouvel audit
            </button>
          ) : null
        }
      />

      {!peutCreerAudit ? (
        <Alerte ton="ambre">La création d’une nouvelle mission n’est pas disponible avec la formule actuelle de cette entreprise.</Alerte>
      ) : null}

      {afficherFormulaire ? (
        <Revele>
          <Card className="mb-6 p-5">
            <NouvelAuditFormulaire
              entrepriseId={entrepriseId}
              referentiels={referentiels}
              onCree={(audit) => {
                setAfficherFormulaire(false);
                navigate(`/app/${entrepriseId}/audits/${audit.id}`);
              }}
            />
          </Card>
        </Revele>
      ) : null}

      {chargement ? (
        <Loader message="Chargement des audits…" />
      ) : audits && audits.length > 0 ? (
        <Revele delai={80}>
          <Card>
            <Tableau entetes={['Mission', 'Référentiel', 'Critères', 'Statut', 'Début', '']}>
              {audits.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-ink-100/60">
                  <td className="td font-medium text-ink-900">{a.nom}</td>
                  <td className="td">{a.referentielCode}</td>
                  <td className="td">{a.nombreCriteres}</td>
                  <td className="td">
                    <Badge ton={TONS_STATUT_AUDIT[a.statut] ?? 'neutre'}>{a.statut}</Badge>
                  </td>
                  <td className="td">{formaterDate(a.dateDebut)}</td>
                  <td className="td text-right">
                    <Link to={`/app/${entrepriseId}/audits/${a.id}`} className="btn-ghost">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Tableau>
          </Card>
        </Revele>
      ) : (
        <Vide message="Aucun audit pour l’instant — créez la première mission." />
      )}
    </>
  );
}

function NouvelAuditFormulaire({ entrepriseId, referentiels, onCree }) {
  const [formulaire, setFormulaire] = useState({
    referentielCode: '',
    nom: '',
    description: '',
    dateDebut: new Date().toISOString().slice(0, 10),
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const audit = await api.post(`/api/v1/entreprises/${entrepriseId}/audits`, formulaire);
      onCree(audit);
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
          <label className="label" htmlFor="audit-referentiel">
            Référentiel
          </label>
          <select
            id="audit-referentiel"
            required
            className="input"
            value={formulaire.referentielCode}
            onChange={(e) => setFormulaire({ ...formulaire, referentielCode: e.target.value })}
          >
            <option value="" disabled>
              Choisir un référentiel…
            </option>
            {referentiels.map((r) => (
              <option key={r.code} value={r.code}>
                {r.nom} ({r.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-nom">
            Nom de la mission
          </label>
          <input
            id="audit-nom"
            required
            className="input"
            placeholder="Audit RSE 2026"
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-date-debut">
            Date de début
          </label>
          <input
            id="audit-date-debut"
            type="date"
            required
            className="input"
            value={formulaire.dateDebut}
            onChange={(e) => setFormulaire({ ...formulaire, dateDebut: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-description">
            Description (optionnelle)
          </label>
          <input
            id="audit-description"
            className="input"
            value={formulaire.description}
            onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={chargement}>
        {chargement ? <SustwayLoader taille="sm" /> : null}
        Créer l’audit
      </button>
    </form>
  );
}
