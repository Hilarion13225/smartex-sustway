package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Question;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class QuestionRepository implements PanacheRepositoryBase<Question, UUID> {

    public List<Question> parCritere(UUID critereId) {
        return list("critere.id = ?1 order by ordre", critereId);
    }
}
