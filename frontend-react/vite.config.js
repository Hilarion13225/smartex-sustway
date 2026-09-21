import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * L'API est atteinte par un proxy plutôt que par une adresse absolue.
 *
 * Le navigateur appelle `/api/...` sur l'origine de la page ; Vite relaie vers
 * l'API. Deux conséquences : plus d'adresse IP en dur à corriger à chaque
 * renouvellement du bail DHCP, et plus de CORS du tout puisque les requêtes
 * partent de la même origine — ce qui rend le test depuis un téléphone aussi
 * simple que depuis le poste.
 *
 * La cible reste configurable par SMARTEX_API_PROXY pour le cas où l'API ne
 * tourne pas sur la machine du serveur de développement.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    /*
     * Détection des changements de fichiers par scrutation, dans le conteneur
     * seulement.
     *
     * Les volumes montés depuis Windows vers un conteneur Linux ne
     * transmettent pas les événements `inotify` : Vite ne voit alors jamais
     * un fichier modifié, et sert indéfiniment l'état qu'il avait au
     * démarrage. Le symptôme trompe, parce que le fichier est bien à jour
     * dans le conteneur — c'est Vite qui ne l'a pas relu. Constaté ici : des
     * routes ajoutées restaient introuvables une heure après, alors que
     * `docker exec grep` les trouvait dans le fichier servi.
     *
     * La scrutation coûte du temps processeur en continu, elle est donc
     * conditionnée à une variable d'environnement que seul Docker Compose
     * pose : un `npm run dev` natif, où `inotify` fonctionne, garde le
     * comportement par défaut.
     */
    watch:
      process.env.SMARTEX_WATCH_POLLING === '1'
        ? { usePolling: true, interval: 300 }
        : undefined,
    proxy: {
      '/api': {
        target: process.env.SMARTEX_API_PROXY || 'http://localhost:8090',
        changeOrigin: true,
        configure: (proxy) => {
          // L'en-tête Origin du navigateur est retiré avant de relayer. Pour
          // le navigateur la requête est same-origin ; la transmettre ferait
          // voir à l'API une requête croisée venant de l'adresse du poste ou
          // du téléphone, qu'elle refuserait en 403 faute de figurer dans sa
          // liste CORS — ce qui rendait le proxy inutilisable hors localhost.
          proxy.on('proxyReq', (requete) => requete.removeHeader('origin'));
        },
      },
    },
  },
});
