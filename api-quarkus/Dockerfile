####
# Dockerfile multi-étapes pour usage avec docker-compose (build depuis les sources).
# Le Dockerfile "officiel" style Quarkus (build pré-effectué) est dans
# src/main/docker/Dockerfile.jvm — à utiliser en CI/CD (voir .github/workflows).
####
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src src
RUN mvn -B -DskipTests package

FROM registry.access.redhat.com/ubi9/openjdk-21-runtime:1.20
ENV LANGUAGE='en_US:en'
WORKDIR /deployments

COPY --from=build --chown=185 /build/target/quarkus-app/lib/ /deployments/lib/
COPY --from=build --chown=185 /build/target/quarkus-app/*.jar /deployments/
COPY --from=build --chown=185 /build/target/quarkus-app/app/ /deployments/app/
COPY --from=build --chown=185 /build/target/quarkus-app/quarkus/ /deployments/quarkus/

EXPOSE 8080
USER 185

# $PORT : certains hébergeurs (Render...) imposent leur propre port d'écoute via
# cette variable, connue seulement au lancement du conteneur — d'où la forme
# shell (ENV ne fait pas d'interpolation à l'exécution) ; repli sur 8080
# (valeur docker-compose locale) si absente.
ENTRYPOINT ["sh", "-c", "java -Dquarkus.http.host=0.0.0.0 -Dquarkus.http.port=${PORT:-8080} -jar /deployments/quarkus-run.jar"]
