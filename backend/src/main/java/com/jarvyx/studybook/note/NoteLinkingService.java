package com.jarvyx.studybook.note;

import com.jarvyx.studybook.study.StudyArgument;
import com.jarvyx.studybook.study.StudyArgumentRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Suggere automatiquement un lien entre une note fraichement terminee et un
 * argument d'etude personnelle du meme utilisateur, via un appel Gemini
 * comparant le contenu de la note aux titres des arguments existants.
 *
 * Best-effort : toute erreur (cle absente, API indisponible, reponse
 * inattendue) est avalee — une note ne doit jamais echouer a cause de ca.
 */
@Service
public class NoteLinkingService {

    private static final Logger log = LoggerFactory.getLogger(NoteLinkingService.class);
    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
    private static final int MAX_CONTENT_CHARS = 3000;

    private final NoteRepository noteRepository;
    private final StudyArgumentRepository argumentRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    public NoteLinkingService(
            NoteRepository noteRepository, StudyArgumentRepository argumentRepository, ObjectMapper objectMapper) {
        this.noteRepository = noteRepository;
        this.argumentRepository = argumentRepository;
        this.objectMapper = objectMapper;
    }

    public void suggestLinkIfRelevant(Note note) {
        try {
            if (apiKey == null || apiKey.isBlank() || note.getUserId() == null) {
                return;
            }
            String content = note.getNoteMarkdown() != null ? note.getNoteMarkdown() : note.getTranscript();
            if (content == null || content.isBlank()) {
                return;
            }
            List<StudyArgument> candidates = argumentRepository.findAllByUserId(note.getUserId());
            if (candidates.isEmpty()) {
                return;
            }
            findRelatedArgument(content, candidates).ifPresent(argumentId -> {
                note.suggestLink(argumentId);
                noteRepository.save(note);
            });
        } catch (Exception e) {
            log.warn("Détection de lien étude personnelle ignorée pour la note {} : {}", note.getId(), e.getMessage());
        }
    }

    private Optional<UUID> findRelatedArgument(String noteContent, List<StudyArgument> candidates) throws Exception {
        String candidateList = candidates.stream()
                .map(a -> a.getId() + ": " + a.getTitle())
                .collect(Collectors.joining("\n"));

        String prompt = """
                Voici le contenu d'une note d'étude :
                ---
                %s
                ---
                Voici une liste d'arguments d'étude personnelle (identifiant : titre) :
                %s

                Si cette note traite clairement du même sujet qu'un seul de ces arguments, \
                réponds uniquement avec son identifiant (l'UUID exact, rien d'autre autour). \
                Si aucun lien de sujet clair n'existe, réponds uniquement le mot AUCUN.
                """
                .formatted(truncate(noteContent), candidateList);

        String responseText = callGemini(prompt);
        String trimmed = responseText.strip();

        return candidates.stream()
                .map(StudyArgument::getId)
                .filter(id -> id.toString().equalsIgnoreCase(trimmed))
                .findFirst();
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

    private static String truncate(String text) {
        return text.length() <= MAX_CONTENT_CHARS ? text : text.substring(0, MAX_CONTENT_CHARS);
    }
}
