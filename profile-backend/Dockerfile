FROM eclipse-temurin:25.0.3_9-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:25.0.3_9-jre
COPY --from=build /workspace/target/profile-backend.jar /app/app.jar
RUN mkdir -p /var/lib/profile/media && chown -R 10001:10001 /app /var/lib/profile
USER 10001:10001
WORKDIR /app
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","/app/app.jar"]
