# Build context is the repository root (see render.yaml: dockerContext: .)
# because this image also needs the sibling prototype/ directory.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY backend/pom.xml .
RUN mvn -q -B dependency:go-offline
COPY backend/src src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY prototype/ prototype/
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir -r prototype/requirements.txt

COPY --from=build /build/target/*.jar app.jar

ENV STUDYBOOK_PIPELINE_PYTHON_EXECUTABLE=/app/.venv/bin/python \
    STUDYBOOK_PIPELINE_SCRIPT_PATH=/app/prototype/main.py \
    STUDYBOOK_PIPELINE_UPLOAD_DIR=/app/data/uploads \
    STUDYBOOK_PIPELINE_OUTPUT_DIR=/app/data/output

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
