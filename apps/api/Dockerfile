# Multi-stage build: compile with the JDK, run on the (smaller) JRE.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache dependencies in their own layer -- only re-downloads when pom.xml changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src ./src
RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/api-*.jar app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
