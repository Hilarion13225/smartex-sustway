import { Link } from 'react-router-dom';
import { ExternalLink, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { SMARTEX } from '../config/smartex';

const COLONNES = [
  {
    titre: 'Plateforme',
    liens: [
      { vers: '/services', libelle: 'Services' },
      { vers: '/formules', libelle: 'Formules' },
      { vers: '/faq', libelle: 'Questions fréquentes' },
    ],
  },
  {
    titre: 'Smartex Expertises',
    liens: [
      { vers: '/a-propos', libelle: 'À propos de nous' },
      { vers: '/contact', libelle: 'Nous contacter' },
      { vers: '/mentions-legales', libelle: 'Mentions légales' },
    ],
  },
  {
    titre: 'Accès',
    liens: [
      { vers: '/connexion', libelle: 'Se connecter' },
      { vers: '/inscription', libelle: 'Créer un compte' },
    ],
  },
];

/** Pied de page de la vitrine publique. */
export default function PiedPublic() {
  return (
    // Pied de page volontairement toujours sombre, couleurs figées plutôt
    // que les variables --ink-* (réactives au thème) qui l'auraient rendu
    // clair en mode sombre.
    <footer className="relative overflow-hidden border-t border-[#eceef2]/10 bg-[#1f2533] text-[#aeb7c8]">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl motion-safe:animate-respiration"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[90rem] px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo taille="md" variante="clair" />
            <p className="mt-1.5 text-xs text-[#8290a9]">{SMARTEX.accroche}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#8290a9]">
              {SMARTEX.produit} est la plateforme d’évaluation RSE éditée par {SMARTEX.editeur}. {SMARTEX.baseline}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400" aria-hidden />
                <a className="transition-colors hover:text-white" href={`mailto:${SMARTEX.email}`}>
                  {SMARTEX.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-400" aria-hidden />
                <a className="transition-colors hover:text-white" href={`tel:${SMARTEX.telephone.replace(/\s/g, '')}`}>
                  {SMARTEX.telephone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" aria-hidden />
                {SMARTEX.adresse}
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-brand-400" aria-hidden />
                <a
                  className="transition-colors hover:text-white"
                  href={SMARTEX.linkedin}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {SMARTEX.editeur} sur LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {COLONNES.map((colonne) => (
            <div key={colonne.titre}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white">{colonne.titre}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {colonne.liens.map((lien) => (
                  <li key={lien.vers}>
                    <Link
                      to={lien.vers}
                      className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-white"
                    >
                      {lien.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#8290a9]">
          <p>
            © {new Date().getFullYear()} {SMARTEX.editeur} — Tous droits réservés.
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-400" aria-hidden />
            Chiffrement au repos et en transit, isolation multi-tenant, conformité RGPD.
          </p>
        </div>
      </div>
    </footer>
  );
}
