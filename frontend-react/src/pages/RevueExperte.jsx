import { useState } from 'react';
import { CheckCircle2, MessageSquareQuote, ShieldCheck, ThumbsUp } from 'lucide-react';
import { AUDITS, ENTREPRISES, EVALUATIONS } from '../data/mock';
import { CRITICITE_LIBELLE, criticiteEffective, critereParId } from '../data/referentiel';
import { NIVEAUX_ENGAGEMENT, SEUIL_CONFIANCE_IA, formaterPourcent, niveauEngagement } from '../lib/scoring';
import { Alerte, Badge, Barre, Card, CardHeader, PageTitre, StatCard, Vide } from '../components/ui';
import { CRITICITE_TON } from '../lib/libelles';
export default function RevueExperte() {
  const [traitees, setTraitees] = useState({});
  const file = EVALUATIONS.filter(e => e.statut === 'FILE_REVUE');
  return <>
      <PageTitre icone={ShieldCheck} titre="File de revue experte" description={`Formule Avancées : tout critère dont la confiance IA est inférieure à ${formaterPourcent(SEUIL_CONFIANCE_IA)} est soumis à un expert RSE avant d’alimenter la note finale.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icone={ShieldCheck} ton="ambre" libelle="Critères en attente" valeur={String(file.length - Object.keys(traitees).length)} />
        <StatCard icone={CheckCircle2} ton="vert" libelle="Traités dans cette session" valeur={String(Object.keys(traitees).length)} />
        <StatCard icone={ThumbsUp} ton="bleu" libelle="Seuil de confiance" valeur={formaterPourcent(SEUIL_CONFIANCE_IA)} detail="Décision actée, section 13" />
      </div>

      <div className="my-5">
        <Alerte>
          L’expert peut confirmer la note dérivée par l’IA ou la corriger. La décision est tracée dans le journal d’audit
          avec la version du référentiel utilisée.
        </Alerte>
      </div>

      {file.length === 0 ? <Card>
          <Vide message="Aucun critère en file de revue." />
        </Card> : <div className="space-y-4">
          {file.slice(0, 20).map(evaluation => {
        const critere = critereParId(evaluation.critereId);
        const audit = AUDITS.find(a => a.id === evaluation.auditId);
        const entreprise = ENTREPRISES.find(e => e.id === audit?.entrepriseId);
        const niveauIa = niveauEngagement(evaluation.probabilite);
        const noteRetenue = traitees[evaluation.id];
        const criticite = criticiteEffective(critere, entreprise?.secteur);
        return <Card key={evaluation.id}>
                <CardHeader titre={`${critere.code} — ${critere.libelle}`} sousTitre={`${audit?.reference} · ${entreprise?.raisonSociale} · secteur ${entreprise?.secteur}`} action={noteRetenue ? <Badge ton="vert" icone={CheckCircle2}>
                        Validé au niveau {noteRetenue}
                      </Badge> : <Badge ton="ambre">Confiance IA {formaterPourcent(evaluation.confianceIa)}</Badge>} />
                <div className="grid gap-5 p-5 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <p className="flex items-start gap-2 text-sm text-ink-700">
                      <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                      {evaluation.justification}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="label">Probabilité de conformité</p>
                        <div className="flex items-center gap-2">
                          <Barre valeur={evaluation.probabilite * 100} ton={evaluation.probabilite < 0.5 ? 'rouge' : 'ambre'} />
                          <span className="text-sm font-medium">{formaterPourcent(evaluation.probabilite)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="label">Confiance du modèle</p>
                        <div className="flex items-center gap-2">
                          <Barre valeur={evaluation.confianceIa * 100} ton="ambre" />
                          <span className="text-sm font-medium">{formaterPourcent(evaluation.confianceIa)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-ink-500">
                      Criticité du critère :{' '}
                      <span className="font-medium">
                        <Badge ton={CRITICITE_TON[criticite]}>{CRITICITE_LIBELLE[criticite]}</Badge>
                      </span>{' '}
                      — utilisée uniquement pour la priorité des non-conformités, jamais pour le score.
                    </p>
                  </div>

                  <div className="rounded-xl border border-ink-200 p-4">
                    <p className="text-sm font-medium">Décision de l’expert</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Proposition IA : niveau {niveauIa} — {NIVEAUX_ENGAGEMENT[niveauIa]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map(niveau => <button key={niveau} type="button" className={noteRetenue === niveau ? 'btn-primary px-3' : 'btn-secondary px-3'} onClick={() => setTraitees({
                  ...traitees,
                  [evaluation.id]: niveau
                })}>
                          {niveau}
                        </button>)}
                    </div>
                    <button type="button" className="btn-secondary mt-3 w-full" onClick={() => setTraitees({
                ...traitees,
                [evaluation.id]: niveauIa
              })}>
                      <ThumbsUp className="h-4 w-4" aria-hidden />
                      Confirmer la proposition IA
                    </button>
                  </div>
                </div>
              </Card>;
      })}
        </div>}
    </>;
}
