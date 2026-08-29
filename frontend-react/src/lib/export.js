/** Export CSV côté navigateur (décision actée : export CSV en plus du PDF). */
export function exporterCsv(nomFichier, entetes, lignes) {
  const echapper = valeur => {
    const texte = String(valeur).replace(/"/g, '""');
    return /[";\n]/.test(texte) ? `"${texte}"` : texte;
  };
  const contenu = [entetes, ...lignes].map(ligne => ligne.map(echapper).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${contenu}`], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Génération du rapport PDF simulée par la boîte d'impression du navigateur. */
export function imprimerRapport() {
  window.print();
}
export function formaterMontant(montant) {
  return `${montant.toLocaleString('fr-FR')} €`;
}
export function formaterDate(iso) {
  if (!iso || iso === '—') return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
export function formaterDateHeure(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
