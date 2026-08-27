import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare } from 'lucide-react';
import Revele from './Revele';

/** Bandeau d'appel à l'action réutilisé en bas des pages publiques. */
export default function AppelAction({
  titre = 'Prêt à objectiver votre performance RSE ?',
  texte = 'Créez votre compte en quelques minutes, ou échangez avec un expert Smartex pour cadrer votre périmètre d’évaluation.',
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <Revele>
        {/* Bandeau volontairement toujours sombre (contraste fort), couleur figée plutôt que la variable --ink-900 (réactive au thème). */}
        <div className="relative overflow-hidden rounded-3xl bg-[#1f2533] px-6 py-14 text-center shadow-soft sm:px-12">
          <span
            className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl motion-safe:animate-respiration"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl motion-safe:animate-respiration [animation-delay:1.5s]"
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">{titre}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#aeb7c8]">{texte}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/inscription" className="btn-vitrine group">
                Créer un compte
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                to="/contact"
                className="btn rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-white transition duration-300 hover:bg-white/10 motion-safe:hover:-translate-y-0.5"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                Parler à un expert
              </Link>
            </div>
          </div>
        </div>
      </Revele>
    </section>
  );
}
