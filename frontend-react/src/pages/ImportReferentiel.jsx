import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileUp, Sparkles } from 'lucide-react';
import EtapesImport from '../components/referentiel/import/EtapesImport';
import DepotReferentiel from '../components/referentiel/import/DepotReferentiel';
import SuiviAnalyse from '../components/referentiel/import/SuiviAnalyse';
import RelectureBrouillon from '../components/referentiel/import/RelectureBrouillon';
import PublierBrouillon from '../components/referentiel/import/PublierBrouillon';
import { Alerte, Badge, Card, Loader, PageTitre, Tableau, Vide } from '../components/ui';
import Breadcrumb from '../components/Breadcrumb';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterDateHeure } from '../lib/export';
import { ApiError } from '../lib/apiClient';
import {
  STATUT,
  consulterBrouillon,
  consulterImport,
  formaterTaille,
  lancerAnalyse,
  listerImports,
  messageErreur,
} from '../lib/importReferentiel';

/** Intervalle de scrutation pendant l'analyse, en millisecondes. */
const PERIODE_SCRUTATION = 3000;

const TONS_STATUT = {
  EN_ATTENTE: 'neutre',
  ANALYSE_EN_COURS: 'ambre',
  BROUILLON_GENERE: 'vert',
  ECHEC: 'rouge',
};

const LIBELLES_STATUT = {
  EN_ATTENTE: 'En attente d’analyse',
  ANALYSE_EN_COURS: 'Analyse en cours',
  BROUILLON_GENERE: 'Brouillon généré',
  ECHEC: 'Échec',
};

/**
 * Import assisté d'un référentiel.
 *
 * L'étape affichée est déduite du statut rendu par le serveur, jamais d'un
 * état local : recharger la page, revenir plus tard ou ouvrir un second onglet
 * mène toujours au même endroit. C'est aussi ce qui permet de quitter pendant
 * l'analyse sans rien perdre.
 */
export default function ImportReferentiel() {
  const { importId } = useParams();
  const navigate = useNavigate();
  const { peut } = useApiAuth();

  if (!peut('referentiel:administrer')) {
    return (
      <Alerte ton="rouge">
        L’import de référentiel est réservé aux administrateurs Smartex.
      </Alerte>
    );
  }

  return importId ? (
    <Assistant importId={importId} />
  ) : (
    <Accueil
      surImportCree={(id, cible) =>
        navigate(`/app/referentiels/import/${id}`, { state: { cible } })
      }
    />
  );
}

// --- Accueil : dépôt et imports récents -------------------------------------

function Accueil({ surImportCree }) {
  const [imports, setImports] = useState(null);
  const [erreurImports, setErreurImports] = useState(null);

  const rafraichir = useCallback(() => {
    setErreurImports(null);
    listerImports()
      // Un échec rendait `[]`, et l'écran annonçait « aucun import » : un
      // dépôt en cours d'analyse paraissait avoir disparu.
      .catch((err) => {
        setErreurImports(
          err instanceof ApiError ? err.message : 'Chargement des imports impossible'
        );
        return [];
      })
      .then(setImports);
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  return (
    <div>
      <Breadcrumb elements={[{ libelle: 'Référentiels', vers: '/app/referentiels' }, { libelle: 'Import intelligent' }]} />

      <PageTitre
        titre="Import intelligent"
        icone={Sparkles}
        description="Constituer un référentiel à partir d’un document plutôt que de le ressaisir critère par critère. L’analyse propose une structure ; une personne décide de ce qui entre au catalogue."
      />

      <EtapesImport etapeCourante="importer" />

      <div className="space-y-6">
        {/* La cible voyage par l'état de navigation : elle ne sert qu'une
            fois, et la persister supposerait de gérer son obsolescence. */}
        <DepotReferentiel surImportCree={(cree, cible) => surImportCree(cree.id, cible)} />

        <Card className="p-5">
          <h2 className="card-title mb-4">
            <FileUp className="h-4 w-4 text-brand-600" aria-hidden />
            Imports récents
          </h2>

          {erreurImports ? (
            <div className="mb-4">
              <Alerte ton="rouge">{erreurImports}</Alerte>
            </div>
          ) : null}

          {imports === null ? (
            <Loader message="Chargement des imports…" />
          ) : erreurImports ? null : imports.length === 0 ? (
            <Vide message="Aucun import pour le moment." />
          ) : (
            <Tableau entetes={['Fichier', 'Déposé le', 'Par', 'Statut', '']}>
              {imports.map((ligne) => (
                <tr key={ligne.id}>
                  <td className="px-4 py-3 text-sm text-ink-900">
                    {ligne.nomFichier}
                    <span className="ml-2 text-xs text-ink-400">
                      {formaterTaille(ligne.taille)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500">
                    {formaterDateHeure(ligne.importeLe)}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500">{ligne.importeParNom ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge ton={TONS_STATUT[ligne.statut] ?? 'neutre'}>
                      {LIBELLES_STATUT[ligne.statut] ?? ligne.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link className="btn-ghost" to={`/app/referentiels/import/${ligne.id}`}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Tableau>
          )}
        </Card>
      </div>
    </div>
  );
}

// --- Assistant : un import précis -------------------------------------------

function Assistant({ importId }) {
  const [importSuivi, setImportSuivi] = useState(null);
  const [brouillon, setBrouillon] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [lancementEnCours, setLancementEnCours] = useState(false);
  const [battement, setBattement] = useState(0);

  // La cible saisie à l'étape 1, si l'on y arrive d'une traite. Après un
  // rechargement elle est perdue — l'écran le dit alors plutôt que de
  // deviner une destination.
  const emplacement = useLocation();
  const cible = useRef(emplacement.state?.cible ?? null);

  const recharger = useCallback(
    async (signal) => {
      const suivi = await consulterImport(importId, { signal });
      setImportSuivi(suivi);
      if (suivi.statut === STATUT.BROUILLON_GENERE) {
        setBrouillon(await consulterBrouillon(importId, { signal }));
      } else {
        setBrouillon(null);
      }
      return suivi;
    },
    [importId]
  );

  useEffect(() => {
    const controleur = new AbortController();
    let minuterie = null;
    let vivant = true;

    async function battre() {
      try {
        const suivi = await recharger(controleur.signal);
        if (!vivant) return;
        // La scrutation ne dure que le temps de l'analyse : la poursuivre
        // ensuite interrogerait le serveur sans rien attendre de nouveau.
        if (suivi.statut === STATUT.ANALYSE_EN_COURS) {
          minuterie = setTimeout(battre, PERIODE_SCRUTATION);
        }
      } catch (err) {
        if (!vivant || controleur.signal.aborted) return;
        setErreur(messageErreur(err, 'Import introuvable.'));
      } finally {
        if (vivant) setChargement(false);
      }
    }

    battre();

    return () => {
      // Sans cette coupure, la scrutation continuerait après la navigation :
      // requêtes inutiles, et écritures d'état sur un composant démonté.
      vivant = false;
      controleur.abort();
      if (minuterie) clearTimeout(minuterie);
    };
    // `battement` fait repartir la boucle après un lancement : elle s'arrête
    // d'elle-même dès que le statut n'est plus « analyse en cours », et rien
    // ne la réveillerait autrement.
  }, [recharger, battement]);

  async function lancer() {
    if (!cible.current) {
      setErreur(
        'La destination n’est plus connue. Revenez à la liste et redéposez le fichier pour la préciser.'
      );
      return;
    }
    setErreur(null);
    setLancementEnCours(true);
    try {
      await lancerAnalyse(importId, cible.current);
      setBattement((n) => n + 1);
    } catch (err) {
      setErreur(messageErreur(err, 'Le lancement de l’analyse a échoué.'));
    } finally {
      setLancementEnCours(false);
    }
  }

  if (chargement) return <Loader message="Chargement de l’import…" />;
  if (!importSuivi) {
    return <Alerte ton="rouge">{erreur ?? 'Import introuvable.'}</Alerte>;
  }

  const etape = etapeCourante(importSuivi, brouillon);

  return (
    <div>
      <Breadcrumb
        elements={[
          { libelle: 'Référentiels', vers: '/app/referentiels' },
          { libelle: 'Import intelligent', vers: '/app/referentiels/import' },
          { libelle: importSuivi.nomFichier },
        ]}
      />

      <PageTitre
        titre={importSuivi.nomFichier}
        icone={Sparkles}
        description={`Déposé le ${formaterDateHeure(importSuivi.importeLe)} · ${formaterTaille(
          importSuivi.taille
        )}`}
        actions={
          <Badge ton={TONS_STATUT[importSuivi.statut] ?? 'neutre'}>
            {LIBELLES_STATUT[importSuivi.statut] ?? importSuivi.statut}
          </Badge>
        }
      />

      <EtapesImport etapeCourante={etape} />

      {etape === 'analyser' ? (
        <SuiviAnalyse
          importSuivi={importSuivi}
          surLancer={lancer}
          lancementEnCours={lancementEnCours}
          erreur={erreur}
        />
      ) : null}

      {/* « Vérifier » et « Valider » sont le même écran : on tranche là où
          l'on lit. Le fil d'étapes avance dès la première décision, mais la
          page ne change pas — les distinguer ici laisserait l'écran vide
          entre la première décision et la dernière. */}
      {(etape === 'verifier' || etape === 'valider') && brouillon ? (
        <RelectureBrouillon
          brouillon={brouillon}
          importId={importId}
          surChangement={() => recharger()}
        />
      ) : null}

      {etape === 'publier' && brouillon ? (
        <PublierBrouillon brouillon={brouillon} surPublication={() => recharger()} />
      ) : null}
    </div>
  );
}

/**
 * Déduit l'étape de l'état du serveur.
 *
 * « Vérifier » et « Valider » partagent le même écran : on tranche là où l'on
 * lit. Le fil d'étapes montre « Valider » dès qu'une décision a été prise,
 * pour que l'avancement se voie sans changer de page.
 */
function etapeCourante(importSuivi, brouillon) {
  if (importSuivi.statut !== STATUT.BROUILLON_GENERE) return 'analyser';
  if (!brouillon) return 'analyser';
  if (brouillon.publiable) return 'publier';
  return brouillon.elementsValides + brouillon.elementsRejetes > 0 ? 'valider' : 'verifier';
}
