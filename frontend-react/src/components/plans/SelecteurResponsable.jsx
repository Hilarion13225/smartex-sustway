import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/apiClient';

/**
 * Choix d'un responsable parmi les membres de l'entreprise.
 *
 * L'API refuse toute affectation vers un utilisateur qui n'est pas rattaché à
 * l'entreprise de la mission (403) : proposer une liste plus large produirait
 * des refus incompréhensibles. La source est donc `…/responsables-affectables`,
 * et rien d'autre — jamais une saisie libre d'identifiant, qui contournerait
 * le sens même de cette garde.
 *
 * Cette route ne porte que des identités : ni rôle, ni statut, ni courriel.
 * Elle renseigne, elle n'autorise pas — le serveur revérifie le rattachement
 * au moment de l'écriture, quelle que soit la liste reçue ici.
 */
export default function SelecteurResponsable({
  entrepriseId,
  valeur,
  onChange,
  desactive = false,
  libelle = 'Responsable',
  id = 'responsable',
}) {
  const [membres, setMembres] = useState(null);
  const [indisponible, setIndisponible] = useState(null);

  useEffect(() => {
    let annule = false;
    api
      .get(`/api/v1/entreprises/${entrepriseId}/responsables-affectables`)
      .then((liste) => {
        if (!annule) {
          setMembres(liste ?? []);
          setIndisponible(null);
        }
      })
      .catch((err) => {
        if (annule) return;
        setMembres([]);
        setIndisponible(
          err instanceof ApiError && err.statut === 403
            ? "Votre rôle ne permet pas d’affecter une action."
            : "La liste des responsables n’a pas pu être chargée."
        );
      });
    return () => {
      annule = true;
    };
  }, [entrepriseId]);

  if (indisponible) {
    return (
      <div>
        <span className="label">{libelle}</span>
        <p className="text-xs italic text-ink-500">{indisponible}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="label" htmlFor={id}>
        {libelle}
      </label>
      <select
        id={id}
        className="input"
        disabled={desactive || membres === null}
        value={valeur ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{membres === null ? 'Chargement…' : 'Non affectée'}</option>
        {(membres ?? []).map((m) => (
          <option key={m.utilisateurId} value={m.utilisateurId}>
            {m.nomComplet}
          </option>
        ))}
      </select>
    </div>
  );
}
