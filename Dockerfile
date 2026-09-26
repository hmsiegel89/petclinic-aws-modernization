# Build stage: compile the WAR with Maven on JDK 17
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

# Runtime stage: Tomcat 10.1 on JRE 17
FROM tomcat:10.1-jre17-temurin
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/tomcat/webapps/*
COPY --from=build /build/target/petclinic.war /usr/local/tomcat/webapps/ROOT.war
ENV DB_URL=jdbc:postgresql://postgres:5432/petclinic \
    DB_USER=postgres \
    DB_PASSWORD=petclinic
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -fsS http://localhost:8080/health || exit 1
CMD ["catalina.sh", "run"]
