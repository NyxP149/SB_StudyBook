package com.jarvyx.studybook.study;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Genere un court message d'encouragement quand l'utilisateur termine un
 * argument d'etude personnelle, via Gemini.
 *
 * Best-effort : toute erreur (cle absente, API indisponible, reponse
 * inattendue) retombe sur un message generique — marquer un argument comme
 * termine ne doit jamais echouer a cause de ca.
 */
@Service
public class EncouragementService {

    private static final Logger log = LoggerFactory.getLogger(EncouragementService.class);
    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    private static final String FALLBACK_MESSAGE = "Bravo, encore une étape franchie — continue sur ta lancée !";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    public EncouragementService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String generate(String argumentTitle, String programName, int completedCount, int totalCount) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                return FALLBACK_MESSAGE;
            }
            String prompt =
                    """
                    Un utilisateur vient de terminer l'étape d'étude personnelle « %s » dans son programme « %s ».
                    Progression actuelle : %d étape(s) sur %d terminée(s).

                    Écris un court message d'encouragement chaleureux et sincère (une seule phrase, en français, \
                    sans guillemets ni emoji) pour féliciter sa régularité dans son étude.
                    """
                            .formatted(argumentTitle, programName, completedCount, totalCount);
            String responseText = callGemini(prompt).strip();
            return responseText.isEmpty() ? FALLBACK_MESSAGE : responseText;
        } catch (Exception e) {
            log.warn("Génération du message d'encouragement ignorée : {}", e.getMessage());
            return FALLBACK_MESSAGE;
        }
    }

    private String callGemini(String prompt) throws Exception {
        Map<String, Object> body =
                Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        String json = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?key=" + apiKey))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Gemini a répondu " + response.statusCode() + " : " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
        return textNode.isMissingNode() ? "" : textNode.asString("");
    }
}
