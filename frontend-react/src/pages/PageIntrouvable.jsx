import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import Revele from '../components/Revele';
import { Card, PageTitre } from '../components/ui';
import { useApiAuth } from '../auth/useApiAuth';

/**
 * Adresse inconnue *à l'intérieur* de l'espace de travail.
 *
 * Jusqu'ici toute URL non reconnue — un lien devenu obsolète, un identifiant
 * mal recopié, une faute de frappe — renvoyait à la vitrine publique : on
 * croyait avoir été déconnecté. La page reste donc dans le Layout, avec la
 * navigation habituelle, et propose les deux points de reprise sûrs :
 * l'organisation courante quand l'URL en désigne une, et le tableau de bord.
 *
 * La route attrape-tout ne porte aucun paramètre : l'organisation est donc
 * relue dans le chemin, puis confrontée aux organisations réellement
 * accessibles. Aucun appel supplémentaire à l'API, et aucun lien proposé vers
 * une organisation que l'on ne pourrait pas ouvrir.
 */
export default function PageIntrouvable() {
  const { pathname } = useLocation();
  const { entreprises } = useApiAuth();

  const segment = pathname.replace(/^\/app\/?/, '').split('/')[0];
  const entreprise = entreprises.find((e) => e.id === segment);

  return (
    <>
      <PageTitre
        icone={Compass}
        titre="Page introuvable"
        description="Cette adresse ne correspond à aucune page de l’espace de travail. Le lien est peut-être obsolète, ou l’identifiant incomplet."
      />

      <Revele>
        <Card>
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm text-ink-600">
              Adresse demandée :{' '}
              <span className="break-all font-mono text-xs text-ink-500">{pathname}</span>
            </p>
            <p className="text-sm text-ink-600">
              Vous êtes toujours connecté — rien n’a été perdu. Reprenez depuis l’un de ces points :
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/app" className="btn-primary">
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Tableau de bord
              </Link>
              {entreprise ? (
                <Link to={`/app/${entreprise.id}`} className="btn-secondary">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Revenir à {entreprise.raisonSociale}
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      </Revele>
    </>
  );
}
