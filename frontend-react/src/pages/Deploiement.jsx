import EtapesMission from '../components/vitrine/EtapesMission';
import { SMARTEX } from '../config/smartex';


/**
 * Comment se déroule un déploiement : les étapes, et ce qui est remis à
 * chacune.
 *
 * Ce contenu vivait dans la page Méthodologie, où il tenait la section
 * « Une démarche en trois étapes ». Il en est déplacé sans un mot changé :
 * la navigation demandée distingue ce sur quoi la solution se fonde — la
 * méthodologie — de la façon dont elle se met en place. La route
 * `/deploiement` existait déjà et redirigeait vers la méthodologie ; elle
 * mène maintenant à ce qu'elle annonce.
 */
export default function Deploiement() {
  return (
    <>
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h1 className="titre-page max-w-[18ch] text-ink-900">
            Du cadrage à la valorisation de vos résultats.
          </h1>
          <p className="mt-5 texte-chapo text-ink-600">
            Les étapes d’une mission {SMARTEX.produit}, et les livrables remis à chacune.
          </p>
        </div>
      </section>

      <EtapesMission />

    </>
  );
}
