FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM node:24-bookworm-slim AS node-runtime
FROM eclipse-temurin:25-jre
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=build /workspace/target/profile-backend-0.1.0-SNAPSHOT.jar /app/app.jar
RUN mkdir -p /app/ui
RUN mkdir -p /var/lib/profile/media && chown -R 10001:10001 /app /var/lib/profile
USER 10001:10001
WORKDIR /app
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","/app/app.jar"]
