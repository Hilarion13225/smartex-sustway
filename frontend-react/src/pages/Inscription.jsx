import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, CreditCard, KeyRound, Mail, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { FORMULES, formuleParCle } from '../data/formules';
import { SECTEURS } from '../data/referentiel';
import { PAYS } from '../data/mock';
import { formaterMontant } from '../lib/export';
import { Alerte, Badge } from '../components/ui';
const ETAPES = ['Formule', 'Informations', 'Vérification', 'Confirmation'];
export default function Inscription() {
  const [parametres] = useSearchParams();
  const navigate = useNavigate();
  const [etape, setEtape] = useState(parametres.get('formule') ? 1 : 0);
  const [plan, setPlan] = useState(parametres.get('formule') ?? 'STANDARD');
  const [periodicite, setPeriodicite] = useState('ANNUELLE');
  const [paiement, setPaiement] = useState('PI_SPI');
  const [deuxFa, setDeuxFa] = useState('SMS');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [formulaire, setFormulaire] = useState({
    raisonSociale: '',
    identifiantLegal: '',
    secteur: SECTEURS[0],
    pays: 'CI',
    taille: 'PME',
    nom: '',
    email: ''
  });
  const formule = formuleParCle(plan);
  const montant = periodicite === 'ANNUELLE' ? formule.prixAnnuel : formule.prixMensuel;
  return <div className="min-h-full bg-ink-50 py-10">
      <div className="mx-auto max-w-3xl px-5">
        <Link to="/" className="btn-ghost mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à l’accueil
        </Link>

        <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {ETAPES.map((libelle, index) => <li key={libelle} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index <= etape ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
                {index + 1}
              </span>
              <span className={index <= etape ? 'font-medium text-ink-900' : 'text-ink-500'}>{libelle}</span>
              {index < ETAPES.length - 1 ? <span className="mx-1 h-px w-6 bg-ink-200" /> : null}
            </li>)}
        </ol>

        <div className="card p-6">
          {etape === 0 ? <div>
              <h1 className="text-lg font-semibold">Choix de la formule</h1>
              <p className="mt-1 text-sm text-ink-500">
                La formule est choisie avant la création du compte et détermine immédiatement les fonctionnalités actives.
              </p>
              <div className="mt-5 space-y-3">
                {FORMULES.map(option => <label key={option.cle} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${plan === option.cle ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'}`}>
                    <input type="radio" name="formule" className="mt-1 accent-brand-600" checked={plan === option.cle} onChange={() => setPlan(option.cle)} />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{option.nom}</span>
                        <span className="text-sm text-ink-600">
                          {option.prixMensuel === 0 ? 'Gratuit' : `${formaterMontant(option.prixMensuel)} / mois`}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-ink-500">{option.accroche}</span>
                      <span className="mt-1 block text-xs text-ink-400">{option.pipeline}</span>
                    </span>
                  </label>)}
              </div>
            </div> : null}

          {etape === 1 ? <div>
              <h1 className="text-lg font-semibold">Informations de l’entreprise et du compte</h1>
              <p className="mt-1 text-sm text-ink-500">
                Ces informations composent dynamiquement le questionnaire d’audit (secteur, taille, statut).
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="raisonSociale">
                    Raison sociale
                  </label>
                  <input id="raisonSociale" className="input" placeholder="Ivoire Agro Industries" value={formulaire.raisonSociale} onChange={e => setFormulaire({
                ...formulaire,
                raisonSociale: e.target.value
              })} />
                </div>
                <div>
                  <label className="label" htmlFor="identifiant">
                    Identifiant légal
                  </label>
                  <input id="identifiant" className="input" placeholder="CI-2011-B-4471" value={formulaire.identifiantLegal} onChange={e => setFormulaire({
                ...formulaire,
                identifiantLegal: e.target.value
              })} />
                </div>
                <div>
                  <label className="label" htmlFor="secteur">
                    Secteur d’activité (liste CGECI)
                  </label>
                  <select id="secteur" className="input" value={formulaire.secteur} onChange={e => setFormulaire({
                ...formulaire,
                secteur: e.target.value
              })}>
                    {SECTEURS.map(secteur => <option key={secteur}>{secteur}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="pays">
                    Pays du siège
                  </label>
                  <select id="pays" className="input" value={formulaire.pays} onChange={e => setFormulaire({
                ...formulaire,
                pays: e.target.value
              })}>
                    {PAYS.map(pays => <option key={pays.code2} value={pays.code2}>
                        {pays.nom} ({pays.code3})
                      </option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="taille">
                    Taille
                  </label>
                  <select id="taille" className="input" value={formulaire.taille} onChange={e => setFormulaire({
                ...formulaire,
                taille: e.target.value
              })}>
                    <option value="PME">PME</option>
                    <option value="ETI">ETI</option>
                    <option value="GRANDE_ENTREPRISE">Grande entreprise</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="nom">
                    Nom du responsable
                  </label>
                  <input id="nom" className="input" placeholder="Kouassi Yao" value={formulaire.nom} onChange={e => setFormulaire({
                ...formulaire,
                nom: e.target.value
              })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="email">
                    Adresse email professionnelle
                  </label>
                  <input id="email" type="email" className="input" placeholder="responsable@entreprise.ci" value={formulaire.email} onChange={e => setFormulaire({
                ...formulaire,
                email: e.target.value
              })} />
                </div>
              </div>

              {plan !== 'FREE' ? <div className="mt-6 rounded-xl border border-ink-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4 text-brand-600" aria-hidden />
                    Paiement de la formule {formule.nom}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="label">Périodicité</span>
                      <div className="flex gap-2">
                        {['MENSUELLE', 'ANNUELLE'].map(option => <button key={option} type="button" className={periodicite === option ? 'btn-primary flex-1' : 'btn-secondary flex-1'} onClick={() => setPeriodicite(option)}>
                            {option === 'MENSUELLE' ? 'Mensuelle' : 'Annuelle'}
                          </button>)}
                      </div>
                    </div>
                    <div>
                      <span className="label">Moyen de paiement</span>
                      <div className="flex gap-2">
                        <button type="button" className={paiement === 'PI_SPI' ? 'btn-primary flex-1' : 'btn-secondary flex-1'} onClick={() => setPaiement('PI_SPI')}>
                          <Wallet className="h-4 w-4" aria-hidden />
                          PI-SPI
                        </button>
                        <button type="button" className={paiement === 'WAVE' ? 'btn-primary flex-1' : 'btn-secondary flex-1'} onClick={() => setPaiement('WAVE')}>
                          <Smartphone className="h-4 w-4" aria-hidden />
                          Wave
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink-600">
                    Montant à régler : <span className="font-semibold text-ink-900">{formaterMontant(montant)}</span>
                  </p>
                </div> : <Alerte ton="ambre">
                  En formule Free, aucune action de création, modification ou suppression n’est autorisée : le compte
                  donne accès à des contenus de démonstration et au changement de formule.
                </Alerte>}
            </div> : null}

          {etape === 2 ? <div>
              <h1 className="text-lg font-semibold">Vérification de l’adresse email</h1>
              <p className="mt-1 text-sm text-ink-500">
                Le compte n’est activé qu’après vérification de l’email. La double authentification reste optionnelle,
                quelle que soit la formule.
              </p>
              <div className="mt-5 rounded-xl border border-ink-200 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-brand-600" aria-hidden />
                  Code envoyé à {formulaire.email || 'votre adresse email'}
                </p>
                <input className="input mt-3 max-w-xs tracking-[0.4em]" placeholder="000000" maxLength={6} value={codeSaisi} onChange={e => setCodeSaisi(e.target.value.replace(/\D/g, ''))} />
                <p className="mt-2 text-xs text-ink-500">Démonstration : saisissez six chiffres quelconques.</p>
              </div>

              <div className="mt-5">
                <span className="label">Double authentification (optionnelle)</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[{
                cle: 'AUCUNE',
                libelle: 'Sans 2FA',
                icone: KeyRound
              }, {
                cle: 'SMS',
                libelle: 'Code par SMS',
                icone: Smartphone
              }, {
                cle: 'APP',
                libelle: 'Application d’authentification',
                icone: ShieldCheck
              }].map(option => <button key={option.cle} type="button" className={deuxFa === option.cle ? 'btn-primary' : 'btn-secondary'} onClick={() => setDeuxFa(option.cle)}>
                      <option.icone className="h-4 w-4" aria-hidden />
                      {option.libelle}
                    </button>)}
                </div>
              </div>
            </div> : null}

          {etape === 3 ? <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-brand-600" aria-hidden />
                <div>
                  <h1 className="text-lg font-semibold">Compte créé</h1>
                  <p className="text-sm text-ink-500">
                    Deux communications distinctes ont été envoyées : la confirmation de création, puis les identifiants
                    d’accès.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-ink-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-brand-600" aria-hidden />
                    Email 1 — Confirmation de la création du compte
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {formulaire.raisonSociale || 'Votre entreprise'} est enregistrée en formule {formule.nom}, 2FA{' '}
                    {deuxFa === 'AUCUNE' ? 'désactivée' : deuxFa === 'SMS' ? 'par SMS' : 'par application'}.
                  </p>
                </div>
                <div className="rounded-xl border border-ink-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-brand-600" aria-hidden />
                    Email 2 — Identifiants d’accès à la plateforme
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    Identifiant : {formulaire.email || 'responsable@entreprise.ci'} — mot de passe provisoire à modifier à
                    la première connexion.
                  </p>
                </div>
                {plan !== 'FREE' ? <div className="rounded-xl border border-ink-200 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-brand-600" aria-hidden />
                      Abonnement provisionné
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      Formule {formule.nom}, facturation {periodicite === 'ANNUELLE' ? 'annuelle' : 'mensuelle'} de{' '}
                      {formaterMontant(montant)} via {paiement === 'PI_SPI' ? 'PI-SPI' : 'Wave'}.
                    </p>
                  </div> : null}
              </div>

              <Badge ton="vert" icone={CheckCircle2}>
                Compte activé
              </Badge>
            </div> : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button type="button" className="btn-secondary" disabled={etape === 0} onClick={() => setEtape(valeur => Math.max(0, valeur - 1))}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Précédent
            </button>
            {etape < 3 ? <button type="button" className="btn-primary" disabled={etape === 2 && codeSaisi.length < 6} onClick={() => setEtape(valeur => valeur + 1)}>
                {etape === 2 ? 'Activer le compte' : 'Continuer'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button> : <button type="button" className="btn-primary" onClick={() => navigate('/connexion')}>
                Se connecter
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>}
          </div>
        </div>
      </div>
    </div>;
}
