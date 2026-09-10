import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Send } from 'lucide-react';
import { Alerte, Card, CardHeader, StatCard } from '../../ui';
import { messageErreur, publierVersion } from '../../../lib/importReferentiel';

/**
 * Dernière étape : faire du brouillon la version courante du référentiel.
 *
 * Le bouton suit `publiable`, mais ce n'est pas lui qui autorise : la barrière
 * tient dans PostgreSQL, et refuserait quand même. Le calcul côté écran évite
 * seulement de proposer une action vouée à échouer.
 *
 * En cas de refus, le message du serveur est affiché tel quel. C'est souvent
 * le déclencheur qui parle, et il dit précisément combien d'éléments restent
 * à trancher — le reformuler perdrait cette précision.
 */
export default function PublierBrouillon({ brouillon, surPublication }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [publiee, setPubliee] = useState(false);

  async function publier() {
    setErreur(null);
    setEnCours(true);
    try {
      await publierVersion(brouillon.referentielCode, brouillon.versionNumero);
      setPubliee(true);
      await surPublication();
    } catch (err) {
      setErreur(messageErreur(err, 'La publication a échoué.'));
    } finally {
      setEnCours(false);
    }
  }

  if (publiee) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-ink-900">
          Version {brouillon.versionNumero} publiée
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-500">
          Elle sert désormais les nouvelles missions. Les missions déjà ouvertes continuent
          d’auditer la version qu’elles ont reçue.
        </p>
        <Link className="btn-secondary mt-5 inline-flex" to={`/app/referentiels/${brouillon.referentielCode}`}>
          Ouvrir le référentiel
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <CardHeader
        titre="Publier la version"
        icone={BadgeCheck}
        sousTitre="Toutes les propositions ont été traitées. La publication fige cette version : elle ne sera plus modifiable."
      />

      <div className="mt-5 space-y-5">
        {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            libelle="Référentiel"
            valeur={brouillon.referentielCode}
            detail={brouillon.referentielNom}
            icone={BadgeCheck}
            ton="bleu"
          />
          <StatCard
            libelle="Validées"
            valeur={brouillon.elementsValides}
            detail="propositions retenues"
            icone={CheckCircle2}
            ton="vert"
          />
          <StatCard
            libelle="Écartées"
            valeur={brouillon.elementsRejetes}
            detail="conservées, hors du contenu"
            icone={Send}
            ton="neutre"
          />
        </div>

        <Alerte ton="bleu">
          Une version publiée devient immuable. Pour la corriger ensuite, il faudra ouvrir un
          nouveau brouillon — les missions en cours ne seront pas affectées.
        </Alerte>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={publier}
            disabled={enCours || !brouillon.publiable}
          >
            <Send className="h-4 w-4" aria-hidden />
            Publier la version {brouillon.versionNumero}
          </button>
        </div>
      </div>
    </Card>
  );
}
