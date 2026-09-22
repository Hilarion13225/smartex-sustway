import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import PreuveVersVerdict, { PREUVE_PAR_DEFAUT } from './PreuveVersVerdict';

/**
 * Le mécanisme, joué par le visiteur plutôt que montré figé.
 *
 * Le héros affichait un spécimen, puis trois dans un carrousel : on le
 * regardait. Ici on le déclenche. Choisir un pilier rejoue l'analyse sur une
 * pièce de ce domaine — le passage se surligne, le trait descend, le verdict
 * tombe et la jauge se remplit. En six secondes, sans compte ni inscription,
 * le visiteur a vu la plateforme faire ce qu'elle promet.
 *
 * C'est le principe « preuve avant promesse » mené à son terme : la vitrine ne
 * dit plus ce que fait l'outil, et ne le montre plus non plus — elle le fait
 * faire. Le spécimen reste le seul élément audacieux de la page, comme le veut
 * DESIGN-VITRINE.md ; il est simplement devenu le seul élément jouable.
 *
 * Les trois onglets sont les trois piliers évalués. Ce n'est pas un habillage :
 * c'est l'axe selon lequel le référentiel est construit, et le visiteur
 * découvre en jouant qu'un pilier peut ne pas être conforme.
 *
 * Accessibilité : onglets ARIA complets — flèches pour circuler, Origine et
 * Fin pour les extrémités, `aria-selected` sur l'onglet actif, panneau relié
 * par `aria-labelledby`. Le rejeu est un vrai bouton, pas un clic sur la carte.
 * Sous « réduire les animations », le CSS du spécimen affiche directement
 * l'état final : le contenu est alors lu sans rien attendre.
 */
const PIECES = [
  {
    pilier: 'Environnement',
    document: 'Plan de gestion des déchets 2025.pdf',
    page: 'p. 2',
    passage:
      'Les déchets dangereux sont collectés séparément et remis à un prestataire agréé, avec bordereau de suivi.',
    domaine: 'environnement',
    critere: 'La filière des déchets dangereux est tracée',
    conforme: true,
    probabilite: 0.91,
  },
  { pilier: 'Social', ...PREUVE_PAR_DEFAUT },
  {
    pilier: 'Gouvernance',
    document: 'Code de conduite interne.pdf',
    page: 'p. 7',
    passage: 'Les manquements peuvent être signalés à la direction par la voie hiérarchique habituelle.',
    domaine: 'gouvernance',
    critere: 'Un dispositif d’alerte protège celui qui signale',
    conforme: false,
    probabilite: 0.34,
  },
];

export default function EssaiPreuve({ className = '', surSombre = false }) {
  const [choisi, setChoisi] = useState(1);
  // Changer la clé du spécimen le remonte, ce qui relance les animations CSS :
  // c'est ce qui permet de rejouer la même pièce sans la quitter.
  const [rejeu, setRejeu] = useState(0);
  const onglets = useRef([]);

  const choisir = (index) => {
    setChoisi(index);
    setRejeu((n) => n + 1);
  };

  const surTouche = (evenement) => {
    const dernier = PIECES.length - 1;
    const cible = {
      ArrowRight: Math.min(choisi + 1, dernier),
      ArrowLeft: Math.max(choisi - 1, 0),
      Home: 0,
      End: dernier,
    }[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    choisir(cible);
    onglets.current[cible]?.focus();
  };

  const piece = PIECES[choisi];

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${surSombre ? 'text-white/70' : 'text-ink-600'}`}>
          Choisissez un pilier : l’analyse se rejoue.
        </p>
        <button
          type="button"
          onClick={() => choisir(choisi)}
          className={`inline-flex items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-sm font-medium transition-colors ${
            surSombre ? 'text-white/80 hover:bg-white/10' : 'text-ink-700 hover:bg-ink-100'
          }`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Rejouer
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Pilier évalué"
        onKeyDown={surTouche}
        className={`flex gap-1 rounded-[8px] p-1 ${surSombre ? 'bg-white/10' : 'bg-ink-100'}`}
      >
        {PIECES.map((p, index) => (
          <button
            key={p.pilier}
            ref={(noeud) => {
              onglets.current[index] = noeud;
            }}
            role="tab"
            id={`pilier-${index}`}
            aria-selected={index === choisi}
            aria-controls="specimen-joue"
            tabIndex={index === choisi ? 0 : -1}
            onClick={() => choisir(index)}
            className={`min-h-10 flex-1 rounded-[5px] px-3 text-[15px] font-semibold transition-colors ${
              index === choisi
                ? surSombre
                  ? 'bg-white text-[#193E2C]'
                  : 'bg-surface text-ink-900 shadow-sm'
                : surSombre
                  ? 'text-white/75 hover:text-white'
                  : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {p.pilier}
          </button>
        ))}
      </div>

      <div id="specimen-joue" role="tabpanel" aria-labelledby={`pilier-${choisi}`} className="mt-4">
        <PreuveVersVerdict key={`${choisi}-${rejeu}`} preuve={piece} legende={false} anime />
      </div>

      <p className={`mt-3 text-sm ${surSombre ? 'text-white/70' : 'text-ink-500'}`}>
        Exemple illustratif, sur une pièce du pilier {piece.pilier.toLowerCase()}.
      </p>
    </div>
  );
}
