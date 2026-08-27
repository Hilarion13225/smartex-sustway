import { Scale } from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import { SMARTEX } from '../config/smartex';

const SECTIONS = [
  {
    titre: 'Éditeur du site',
    contenu: [
      `Le site et la plateforme ${SMARTEX.produit} sont édités par ${SMARTEX.editeur}, dont le siège est situé à ${SMARTEX.adresse}.`,
      `Contact : ${SMARTEX.email} — ${SMARTEX.telephone}.`,
    ],
  },
  {
    titre: 'Propriété intellectuelle',
    contenu: [
      `La marque ${SMARTEX.produit}, le référentiel d’évaluation, la méthodologie de scoring, les contenus rédactionnels et les éléments graphiques du site sont la propriété exclusive de ${SMARTEX.editeur}.`,
      'Toute reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite.',
    ],
  },
  {
    titre: 'Données personnelles',
    contenu: [
      'Les données saisies lors de la création d’un compte et les documents déposés dans le cadre d’une évaluation sont traités pour les seules finalités de l’évaluation RSE souscrite.',
      'Les données sont chiffrées au repos et en transit, et isolées par entreprise. Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’opposition et d’effacement, exerçable à l’adresse indiquée ci-dessus.',
    ],
  },
  {
    titre: 'Cookies',
    contenu: [
      'Le site n’utilise que les mécanismes de stockage strictement nécessaires au fonctionnement de la plateforme, notamment la conservation de la session d’authentification.',
    ],
  },
  {
    titre: 'Limites d’interprétation des résultats',
    contenu: [
      'Les scores, probabilités de conformité et indices de préparation produits par la plateforme sont des mesures d’alignement méthodologiques.',
      'Ils ne constituent ni une certification, ni un avis de conformité réglementaire, ni une garantie d’éligibilité à un financement.',
    ],
  },
  {
    titre: 'Hébergement et disponibilité',
    contenu: [
      `${SMARTEX.editeur} met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie d’absence d’interruption, notamment lors des opérations de maintenance.`,
    ],
  },
];

export default function MentionsLegales() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Informations légales"
        icone={Scale}
        titre="Mentions légales"
        description={`Conditions d’édition, propriété intellectuelle et traitement des données de la plateforme ${SMARTEX.produit}.`}
      />

      <section className="mx-auto max-w-3xl px-5 py-20">
        <div className="space-y-8">
          {SECTIONS.map((section, index) => (
            <Revele key={section.titre} delai={index * 70}>
              <article className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-ink-900">{section.titre}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
                  {section.contenu.map((paragraphe) => (
                    <p key={paragraphe}>{paragraphe}</p>
                  ))}
                </div>
              </article>
            </Revele>
          ))}
        </div>

        <p className="mt-10 text-xs text-ink-500">
          Les informations d’immatriculation et l’identité de l’hébergeur sont communiquées sur demande à{' '}
          <a className="font-medium text-brand-700 underline" href={`mailto:${SMARTEX.email}`}>
            {SMARTEX.email}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
