import { useMemo, useState } from 'react';
import { CheckCheck, FolderTree, Layers } from 'lucide-react';
import CarteProposition from './CarteProposition';
import { Alerte, Barre, Card, CardHeader, Vide } from '../../ui';
import {
  messageErreur,
  rejeterElement,
  validerElement,
  validerEnLot,
} from '../../../lib/importReferentiel';

/**
 * Étapes trois et quatre : parcourir ce que l'IA propose, puis trancher.
 *
 * L'arborescence est reconstruite à partir de la liste plate rendue par
 * l'API — chaque élément y porte déjà son domaine, son sous-domaine et son
 * critère. Un appel suffit donc à bâtir la page ; aller chercher la hiérarchie
 * critère par critère ferait des dizaines de requêtes pour le même résultat.
 *
 * Vérifier et valider ne sont pas séparés en deux écrans : on tranche là où
 * l'on lit. Les découper obligerait à retrouver, dans un second écran, ce
 * qu'on venait d'examiner dans le premier.
 */
function regrouper(elements) {
  const domaines = new Map();

  for (const element of elements) {
    const cleDomaine = element.domaineCode ?? '—';
    if (!domaines.has(cleDomaine)) {
      domaines.set(cleDomaine, {
        code: element.domaineCode,
        libelle: element.domaineLibelle,
        criteres: new Map(),
      });
    }
    const domaine = domaines.get(cleDomaine);

    const cleCritere = element.critereId ?? element.critereCode ?? '—';
    if (!domaine.criteres.has(cleCritere)) {
      domaine.criteres.set(cleCritere, {
        code: element.critereCode,
        libelle: element.critereLibelle,
        sousDomaineCode: element.sousDomaineCode,
        sousDomaineLibelle: element.sousDomaineLibelle,
        elements: [],
      });
    }
    domaine.criteres.get(cleCritere).elements.push(element);
  }

  return [...domaines.values()].map((domaine) => ({
    ...domaine,
    criteres: [...domaine.criteres.values()],
  }));
}

export default function RelectureBrouillon({ brouillon, importId, surChangement }) {
  const [selection, setSelection] = useState(() => new Set());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const arbre = useMemo(() => regrouper(brouillon.elementsAValider), [brouillon.elementsAValider]);

  const traites = brouillon.elementsValides + brouillon.elementsRejetes;
  const total = brouillon.elementsImportesTotal;
  const avancement = total > 0 ? Math.round((traites / total) * 100) : 0;

  async function agir(operation, messageEchec) {
    setErreur(null);
    setEnCours(true);
    try {
      await operation();
      setSelection(new Set());
      await surChangement();
    } catch (err) {
      setErreur(messageErreur(err, messageEchec));
    } finally {
      setEnCours(false);
    }
  }

  function basculer(id, coche) {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (coche) suivante.add(id);
      else suivante.delete(id);
      return suivante;
    });
  }

  /**
   * Le lot ne porte que la validation : aucun endpoint de rejet groupé
   * n'existe côté serveur, et en simuler un par une boucle d'appels
   * perdrait l'atomicité — un échec à mi-parcours laisserait une partie
   * écartée sans que l'écran sache laquelle.
   */
  function validerSelection() {
    const elements = brouillon.elementsAValider
      .filter((element) => selection.has(element.id))
      .map((element) => ({ nature: element.nature, id: element.id }));

    return agir(
      () => validerEnLot(importId, elements),
      'La validation groupée a échoué. Aucun élément n’a été validé.'
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <CardHeader
          titre="Relire les propositions"
          icone={FolderTree}
          sousTitre="Chaque élément doit être accepté ou écarté. Une décision est définitive."
          action={
            selection.size > 0 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={validerSelection}
                disabled={enCours}
              >
                <CheckCheck className="h-4 w-4" aria-hidden />
                Valider {selection.size} élément{selection.size > 1 ? 's' : ''}
              </button>
            ) : null
          }
        />

        <div className="mt-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
            <span>
              <strong className="text-ink-900 tabular-nums">{traites}</strong> sur{' '}
              <span className="tabular-nums">{total}</span> propositions traitées
            </span>
            <span className="tabular-nums">
              {brouillon.elementsValides} validée{brouillon.elementsValides > 1 ? 's' : ''} ·{' '}
              {brouillon.elementsRejetes} écartée{brouillon.elementsRejetes > 1 ? 's' : ''}
            </span>
          </div>
          <Barre valeur={avancement} />
        </div>
      </Card>

      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {brouillon.doublonsDetectes?.length > 0 ? (
        <Alerte ton="ambre">
          {brouillon.doublonsDetectes.length} doublon
          {brouillon.doublonsDetectes.length > 1 ? 's' : ''} repéré
          {brouillon.doublonsDetectes.length > 1 ? 's' : ''} pendant l’extraction, écarté
          {brouillon.doublonsDetectes.length > 1 ? 's' : ''} du brouillon :{' '}
          {brouillon.doublonsDetectes.map((doublon) => doublon.code).join(', ')}. Rien n’a été
          supprimé du référentiel — vérifiez si ces codes doivent être ajoutés à la main.
        </Alerte>
      ) : null}

      {arbre.length === 0 ? (
        <Vide message="Toutes les propositions ont été traitées." />
      ) : (
        arbre.map((domaine) => (
          <Card key={domaine.code ?? 'sans-domaine'} className="p-5">
            <CardHeader
              titre={`${domaine.code ?? '—'} · ${domaine.libelle ?? 'Domaine'}`}
              icone={Layers}
            />

            <div className="mt-4 space-y-5">
              {domaine.criteres.map((critere) => (
                <section key={critere.code ?? 'sans-critere'}>
                  <div className="mb-2 border-l-2 border-ink-200 pl-3">
                    {critere.sousDomaineCode ? (
                      <p className="text-xs uppercase tracking-wide text-ink-400">
                        {critere.sousDomaineCode} · {critere.sousDomaineLibelle}
                      </p>
                    ) : null}
                    <p className="text-sm font-medium text-ink-900">
                      <span className="font-mono text-xs text-ink-500">{critere.code}</span>{' '}
                      {critere.libelle}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {critere.elements.map((element) => (
                      <CarteProposition
                        key={element.id}
                        element={element}
                        enCours={enCours}
                        selectionnee={selection.has(element.id)}
                        surSelection={(coche) => basculer(element.id, coche)}
                        surValider={() =>
                          agir(
                            () =>
                              validerElement(element.nature, element.id, brouillon.versionId),
                            'La validation a échoué.'
                          )
                        }
                        surRejeter={(motif) =>
                          agir(
                            () =>
                              rejeterElement(
                                element.nature,
                                element.id,
                                brouillon.versionId,
                                motif
                              ),
                            'Le rejet a échoué.'
                          )
                        }
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
