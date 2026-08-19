import { KeyRound, ShieldCheck, Smartphone, UserPlus, Users } from 'lucide-react';
import { ENTREPRISES, UTILISATEURS } from '../data/mock';
import { PERMISSIONS_LIBELLE, PERMISSIONS_PAR_ROLE, ROLE_DESCRIPTION, ROLE_LIBELLE, ROLES } from '../auth/permissions';
import { formaterDateHeure } from '../lib/export';
import { Alerte, Badge, Card, CardHeader, PageTitre, Tableau } from '../components/ui';
export default function Utilisateurs() {
  return <>
      <PageTitre icone={Users} titre="Utilisateurs et rôles" description="Gestion des comptes, des rôles et de l’authentification à double facteur, optionnelle par SMS ou application d’authentification." actions={<button type="button" className="btn-primary">
            <UserPlus className="h-4 w-4" aria-hidden />
            Inviter un utilisateur
          </button>} />

      <Card className="mb-6">
        <CardHeader titre="Comptes" icone={Users} />
        <Tableau entetes={['Utilisateur', 'Email', 'Rôle', 'Entreprise', 'Formule', '2FA', 'Dernière connexion']}>
          {UTILISATEURS.map(utilisateur => <tr key={utilisateur.id}>
              <td className="td font-medium">{utilisateur.nom}</td>
              <td className="td">{utilisateur.email}</td>
              <td className="td">
                <Badge ton={utilisateur.role === 'SUPER_ADMIN' ? 'violet' : 'bleu'}>{ROLE_LIBELLE[utilisateur.role]}</Badge>
              </td>
              <td className="td">{ENTREPRISES.find(e => e.id === utilisateur.entrepriseId)?.raisonSociale ?? 'Smartex Expertises'}</td>
              <td className="td">
                <Badge ton={utilisateur.plan === 'AVANCEES' ? 'vert' : utilisateur.plan === 'STANDARD' ? 'bleu' : 'neutre'}>
                  {utilisateur.plan}
                </Badge>
              </td>
              <td className="td">
                <span className="inline-flex items-center gap-1 text-xs">
                  {utilisateur.deuxFA === 'APP' ? <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      Application
                    </> : utilisateur.deuxFA === 'SMS' ? <>
                      <Smartphone className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                      SMS
                    </> : <>
                      <KeyRound className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                      Désactivée
                    </>}
                </span>
              </td>
              <td className="td whitespace-nowrap">{formaterDateHeure(utilisateur.derniereConnexion)}</td>
            </tr>)}
        </Tableau>
      </Card>

      <div className="mb-6">
        <Alerte>
          Les droits effectifs résultent du croisement entre le rôle et la formule souscrite : un responsable
          d’entreprise en formule Free conserve son rôle mais perd toute action de création, modification ou suppression.
        </Alerte>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {ROLES.map(role => <Card key={role} className="p-5">
            <h2 className="text-sm font-semibold">{ROLE_LIBELLE[role]}</h2>
            <p className="mt-1 text-sm text-ink-500">{ROLE_DESCRIPTION[role]}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {PERMISSIONS_PAR_ROLE[role].map(permission => <li key={permission}>
                  <Badge>{PERMISSIONS_LIBELLE[permission]}</Badge>
                </li>)}
              {PERMISSIONS_PAR_ROLE[role].length === 0 ? <li className="text-xs text-ink-400">Consultation seule</li> : null}
            </ul>
          </Card>)}
      </div>
    </>;
}
