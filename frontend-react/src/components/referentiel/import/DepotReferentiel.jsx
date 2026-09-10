import { useEffect, useState } from 'react';
import { FileText, Info, Upload, X } from 'lucide-react';
import DepotPreuves from '../../audit/DepotPreuves';
import { Alerte, Barre, Card, CardHeader } from '../../ui';
import { TYPES_REFERENTIEL } from '../typesReferentiel';
import {
  EXTENSIONS_IMPORT,
  LIBELLE_FORMATS_IMPORT,
  TAILLE_MAX_IMPORT,
  deposerFichier,
  formaterTaille,
  listerReferentiels,
  messageErreur,
} from '../../../lib/importReferentiel';

/**
 * Première étape : le fichier, et l'endroit où son contenu devra atterrir.
 *
 * La cible est saisie ici plutôt que déduite du document. Un fichier peut
 * annoncer un code voisin de celui d'un référentiel existant, ou aucun ;
 * laisser son contenu décider de l'endroit où il s'écrit ouvrirait un
 * brouillon sur le mauvais référentiel, qu'il faudrait ensuite démêler.
 *
 * Le dépôt et l'analyse sont deux gestes distincts, comme côté serveur : le
 * fichier est d'abord contrôlé — type, taille, empreinte, antivirus — et ce
 * n'est qu'ensuite qu'il part au service d'agents. Séparer les deux évite
 * qu'un dépôt reste suspendu le temps d'une lecture qui peut durer.
 */
export default function DepotReferentiel({ surImportCree }) {
  const [fichier, setFichier] = useState(null);
  const [progression, setProgression] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [referentiels, setReferentiels] = useState([]);

  const [mode, setMode] = useState('nouveau');
  const [referentielId, setReferentielId] = useState('');
  const [numeroVersion, setNumeroVersion] = useState('');
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [type, setType] = useState('SMARTEX');

  useEffect(() => {
    listerReferentiels()
      .then(setReferentiels)
      .catch(() => setReferentiels([]));
  }, []);

  const enCours = progression !== null;

  async function envoyer(evenement) {
    evenement.preventDefault();
    if (!fichier || enCours) return;

    setErreur(null);
    setProgression(0);
    try {
      const cree = await deposerFichier(fichier, setProgression);
      surImportCree(cree, cible());
    } catch (err) {
      setErreur(messageErreur(err, 'Le dépôt a échoué.'));
      setProgression(null);
    }
  }

  /** Ce que l'étape suivante enverra à l'API pour ouvrir le brouillon. */
  function cible() {
    return mode === 'existant'
      ? { referentielId, numeroVersion: numeroVersion.trim() }
      : {
          codeReferentiel: code.trim().toUpperCase(),
          nomReferentiel: nom.trim(),
          typeReferentiel: type,
        };
  }

  const cibleComplete =
    mode === 'existant'
      ? Boolean(referentielId && numeroVersion.trim())
      : Boolean(code.trim() && nom.trim() && type);

  return (
    <Card className="p-5">
      <CardHeader
        titre="Déposer un référentiel"
        icone={Upload}
        sousTitre="Le fichier est contrôlé à la réception. L’analyse ne démarre qu’ensuite, et rien n’est publié automatiquement."
      />

      <form onSubmit={envoyer} className="mt-5 space-y-5">
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

        {fichier ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-surface p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500">
              <FileText className="h-5 w-5" strokeWidth={1.6} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{fichier.name}</p>
              <p className="text-xs text-ink-500">
                {formaterTaille(fichier.size)}
                {fichier.type ? ` · ${fichier.type}` : null}
              </p>
            </div>
            {!enCours ? (
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => setFichier(null)}
                aria-label={`Retirer le fichier ${fichier.name}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : (
          <DepotPreuves
            surAjout={(fichiers) => {
              setErreur(null);
              setFichier(fichiers[0]);
            }}
            typesAcceptes={EXTENSIONS_IMPORT}
            tailleMax={TAILLE_MAX_IMPORT}
            libelleFormats={LIBELLE_FORMATS_IMPORT}
            multiple={false}
          />
        )}

        {enCours ? (
          <div role="status" aria-live="polite">
            <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
              <span>Téléversement en cours…</span>
              <span className="tabular-nums">{progression} %</span>
            </div>
            <Barre valeur={progression} />
          </div>
        ) : null}

        <fieldset className="space-y-3 border-t border-ink-100 pt-5">
          <legend className="sr-only">Référentiel de destination</legend>
          <p className="text-sm font-medium text-ink-900">Où déposer le contenu extrait ?</p>

          <div className="flex flex-wrap gap-4">
            {[
              { valeur: 'nouveau', libelle: 'Créer un nouveau référentiel' },
              { valeur: 'existant', libelle: 'Alimenter un référentiel existant' },
            ].map((choix) => (
              <label key={choix.valeur} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="radio"
                  name="mode-cible"
                  value={choix.valeur}
                  checked={mode === choix.valeur}
                  onChange={() => setMode(choix.valeur)}
                  disabled={enCours}
                />
                {choix.libelle}
              </label>
            ))}
          </div>

          {mode === 'existant' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="import-referentiel">
                  Référentiel
                </label>
                <select
                  id="import-referentiel"
                  className="input"
                  value={referentielId}
                  onChange={(e) => setReferentielId(e.target.value)}
                  disabled={enCours}
                >
                  <option value="">Choisir…</option>
                  {referentiels.map((referentiel) => (
                    <option key={referentiel.id} value={referentiel.id}>
                      {referentiel.code} — {referentiel.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="import-numero">
                  Numéro de la version à ouvrir
                </label>
                <input
                  id="import-numero"
                  className="input"
                  value={numeroVersion}
                  onChange={(e) => setNumeroVersion(e.target.value)}
                  placeholder="2.1"
                  disabled={enCours}
                />
                {/* Le serveur ne le déduit pas : une numérotation inventée
                    suivrait chaque mission menée sur cette version. */}
                <p className="mt-1 text-xs text-ink-400">
                  À vous de le fixer — il ne peut pas être deviné.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="import-code">
                  Code
                </label>
                <input
                  id="import-code"
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="GRI_2021"
                  disabled={enCours}
                />
              </div>
              <div>
                <label className="label" htmlFor="import-nom">
                  Nom
                </label>
                <input
                  id="import-nom"
                  className="input"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Global Reporting Initiative"
                  disabled={enCours}
                />
              </div>
              <div>
                <label className="label" htmlFor="import-type">
                  Type
                </label>
                <select
                  id="import-type"
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={enCours}
                >
                  {TYPES_REFERENTIEL.map((choix) => (
                    <option key={choix.code} value={choix.code}>
                      {choix.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </fieldset>

        <div className="flex items-start gap-2 text-xs text-ink-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            L’extraction produit un <strong>brouillon</strong>. Chaque élément proposé devra être
            accepté ou écarté par une personne avant toute publication.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={!fichier || !cibleComplete || enCours}>
            <Upload className="h-4 w-4" aria-hidden />
            Déposer le fichier
          </button>
        </div>
      </form>
    </Card>
  );
}
