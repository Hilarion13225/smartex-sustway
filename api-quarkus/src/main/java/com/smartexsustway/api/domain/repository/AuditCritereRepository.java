package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AuditCritere;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AuditCritereRepository implements PanacheRepositoryBase<AuditCritere, UUID> {

    public List<AuditCritere> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by critere.code", auditId);
    }

    /**
     * Prend un verrou exclusif sur la ligne du critère, jusqu'au commit.
     *
     * <p>Traduit en {@code SELECT … FOR UPDATE}. C'est ce qui rend atomique
     * la séquence « vérifier qu'aucune analyse n'est en cours, puis en
     * réserver une » : sans lui, deux requêtes liraient toutes deux
     * « aucune analyse en cours » avant que l'une ou l'autre n'écrive, et
     * deux passes partiraient.
     *
     * <p><strong>Le verrou est porté par PostgreSQL, pas par la JVM.</strong>
     * C'est la condition pour qu'il tienne entre deux instances de
     * l'application : une variable Java, un {@code synchronized} ou un
     * cache local ne protégeraient que le processus qui les héberge.
     *
     * <p>Il se libère au commit — et aussi si la connexion tombe, ce qui
     * évite qu'un processus interrompu laisse le verrou <em>de base</em>
     * derrière lui. Le verrou <em>logique</em>, lui, est la ligne
     * {@code analyse_ia} en cours ; c'est un objet distinct, et le §
     * « processus interrompu » du rapport en traite.
     *
     * <p>Le verrou porte sur le critère <em>de mission</em>, jamais sur le
     * critère du référentiel : le même critère appartient à autant de
     * missions qu'il y a d'entreprises auditées, et les verrouiller
     * ensemble sérialiserait tous les clients.
     */
    public Optional<AuditCritere> verrouiller(UUID auditCritereId) {
        return find("id = ?1", auditCritereId)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }
}
