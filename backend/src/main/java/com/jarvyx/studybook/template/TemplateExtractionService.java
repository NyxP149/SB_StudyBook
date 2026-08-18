package com.jarvyx.studybook.template;

import com.jarvyx.studybook.template.dto.TemplateSectionDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Identifie les grandes sections d'une note deja redigee (via Gemini) pour
 * pre-remplir un NoteTemplate reutilisable — remplace l'ancienne extraction
 * par regex sur les titres markdown (#/##/###), qui ratait toute note ne
 * suivant pas cette convention.
 *
 * Contrairement a NoteLinkingService/EncouragementService, cet appel n'est
 * pas "best-effort silencieux" : une echec ici doit remonter au frontend,
 * qui retombe alors sur l'extraction locale par regex plutot que sur un
 * resultat vide.
 */
@Service
public class TemplateExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TemplateExtractionService.class);
    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    private static final int MAX_CONTENT_CHARS = 6000;
    private static final int MAX_SECTIONS = 8;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    public TemplateExtractionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<TemplateSectionDto> extract(String noteMarkdown) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new TemplateExtractionException("Extraction par IA indisponible (clé Gemini absente).");
        }
        try {
            String responseText = callGemini(buildPrompt(noteMarkdown));
            List<TemplateSectionDto> sections = parseSections(responseText);
            if (sections.isEmpty()) {
                throw new TemplateExtractionException("Aucune section identifiée par l'IA.");
            }
            return sections;
        } catch (TemplateExtractionException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Extraction de sections par IA échouée : {}", e.getMessage());
            throw new TemplateExtractionException("Extraction par IA échouée : " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String noteMarkdown) {
        return """
                Voici le contenu markdown d'une note d'étude déjà rédigée et structurée en plusieurs parties :
                ---
                %s
                ---

                Identifie les grandes parties/sections de cette note (thème, résumé, versets cités, perles \
                spirituelles, applications personnelles, ou toute autre structuration propre à cette note — \
                qu'elle utilise des titres markdown # ## ### ou non).

                Réponds UNIQUEMENT avec un tableau JSON, sans aucun texte autour ni bloc de code, de la forme :
                [{"title": "Nom court de la section", "instructions": "Instruction générique décrivant ce que \
                cette section doit contenir, réutilisable pour un futur discours similaire (une phrase, sans \
                référence au contenu précis de cette note)."}]

                Ne dépasse pas %d sections. N'invente aucune information : base-toi uniquement sur la structure \
                réellement présente dans la note.
                """
                .formatted(truncate(noteMarkdown), MAX_SECTIONS);
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

    private List<TemplateSectionDto> parseSections(String responseText) {
        String cleaned = responseText.strip();
        if (cleaned.startsWith("```")) {
            int firstNewline = cleaned.indexOf('\n');
            int lastFence = cleaned.lastIndexOf("```");
            if (firstNewline != -1 && lastFence > firstNewline) {
                cleaned = cleaned.substring(firstNewline + 1, lastFence).strip();
            }
        }

        JsonNode arrayNode = objectMapper.readTree(cleaned);
        List<TemplateSectionDto> sections = new ArrayList<>();
        if (!arrayNode.isArray()) {
            return sections;
        }
        for (JsonNode node : arrayNode) {
            String title = node.path("title").asString("").strip();
            String instructions = node.path("instructions").asString("").strip();
            if (!title.isEmpty() && !instructions.isEmpty()) {
                sections.add(new TemplateSectionDto(title, instructions));
            }
            if (sections.size() >= MAX_SECTIONS) {
                break;
            }
        }
        return sections;
    }

    private static String truncate(String text) {
        return text.length() <= MAX_CONTENT_CHARS ? text : text.substring(0, MAX_CONTENT_CHARS);
    }
}
