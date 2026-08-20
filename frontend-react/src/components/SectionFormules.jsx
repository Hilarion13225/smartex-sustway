import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterMontant } from '../lib/export';
import { Badge, Loader } from './ui';
import Revele from './Revele';

/**
 * Grille des formules, alimentée par l'endpoint public existant
 * (`listerFormules`). Utilisée par la page d'accueil et par la page Formules.
 */
export default function SectionFormules({ titre, description, id = 'formules' }) {
  const navigate = useNavigate();
  const { listerFormules } = useApiAuth();
  const [formules, setFormules] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    listerFormules()
      .then((liste) => {
        if (actif) setFormules(Array.isArray(liste) ? liste : []);
      })
      .catch(() => {
        if (actif) setFormules([]);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [listerFormules]);

  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <Revele className="max-w-2xl">
        <Badge ton="violet" icone={Sparkles}>
          Tarification
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold text-ink-900">{titre}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{description}</p>
      </Revele>

      {chargement ? (
        <Loader message="Chargement des formules…" />
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {formules.map((formule, index) => {
            const misEnAvant = formule.code === 'AVANCEES';
            const gratuit = Number(formule.prixMensuel) === 0;
            return (
              <Revele key={formule.code} delai={index * 110}>
                <article
                  className={clsx(
                    'carte-vitrine flex h-full flex-col',
                    misEnAvant && 'border-brand-300 ring-2 ring-brand-500/70'
                  )}
                >
                  {misEnAvant ? (
                    <span
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl motion-safe:animate-respiration"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink-900">{formule.nom}</h3>
                    {misEnAvant ? <Badge ton="vert">Recommandée</Badge> : null}
                  </div>
                  <p className="relative mt-2 text-sm text-ink-500">{formule.description}</p>
                  <p className="relative mt-5 text-4xl font-semibold text-ink-900">
                    {gratuit ? 'Gratuit' : formaterMontant(formule.prixMensuel)}
                    {!gratuit ? <span className="text-sm font-normal text-ink-500"> / mois</span> : null}
                  </p>
                  {!gratuit ? (
                    <p className="relative mt-1 text-xs text-ink-500">
                      ou {formaterMontant(formule.prixAnnuel)} en facturation annuelle
                    </p>
                  ) : (
                    <p className="relative mt-1 text-xs text-ink-500">Consultation en mode démonstration uniquement</p>
                  )}
                  <div className="flex-1" />
                  <button
                    type="button"
                    className={clsx('relative mt-7 w-full group', misEnAvant ? 'btn-vitrine' : 'btn-vitrine-clair')}
                    onClick={() => navigate(`/inscription?formule=${formule.code}`)}
                  >
                    Choisir {formule.nom}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </button>
                </article>
              </Revele>
            );
          })}
        </div>
      )}

      <p className="mt-8 flex items-center gap-2 text-xs text-ink-500">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Paiement des formules Standard et Avancées via PI-SPI et Wave, en facturation mensuelle ou annuelle au choix.
      </p>
    </section>
  );
}
