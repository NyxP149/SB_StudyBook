package com.jarvyx.studybook.study;

import com.jarvyx.studybook.study.dto.StudyArgumentCompletionResponse;
import com.jarvyx.studybook.study.dto.StudyArgumentRequest;
import com.jarvyx.studybook.study.dto.StudyArgumentResponse;
import com.jarvyx.studybook.study.dto.StudyUpcomingResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudyArgumentService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final int UPCOMING_WINDOW_DAYS = 7;

    private final StudyArgumentRepository argumentRepository;
    private final StudyProgramRepository programRepository;
    private final StudyImageRepository imageRepository;
    private final StudyArgumentNoteRepository argumentNoteRepository;
    private final EncouragementService encouragementService;

    public StudyArgumentService(
            StudyArgumentRepository argumentRepository,
            StudyProgramRepository programRepository,
            StudyImageRepository imageRepository,
            StudyArgumentNoteRepository argumentNoteRepository,
            EncouragementService encouragementService) {
        this.argumentRepository = argumentRepository;
        this.programRepository = programRepository;
        this.imageRepository = imageRepository;
        this.argumentNoteRepository = argumentNoteRepository;
        this.encouragementService = encouragementService;
    }

    public StudyArgument create(UUID userId, UUID programId, StudyArgumentRequest request) {
        requireOwnedProgram(userId, programId);
        StudyArgument argument = new StudyArgument(programId, request.title(), request.scheduledDate());
        argument.setUserId(userId);
        argument.setContent(request.content());
        return argumentRepository.save(argument);
    }

    public List<StudyArgument> createBulk(UUID userId, UUID programId, List<StudyArgumentRequest> requests) {
        requireOwnedProgram(userId, programId);
        List<StudyArgument> arguments = requests.stream()
                .map(request -> {
                    StudyArgument argument = new StudyArgument(programId, request.title(), request.scheduledDate());
                    argument.setUserId(userId);
                    argument.setContent(request.content());
                    return argument;
                })
                .toList();
        return argumentRepository.saveAll(arguments);
    }

    public StudyArgumentCompletionResponse complete(UUID userId, UUID id) {
        StudyArgument argument = getOrThrow(userId, id);
        argument.setCompleted(true);
        argumentRepository.save(argument);

        List<StudyArgument> siblings = argumentRepository.findAllByProgramIdOrderByScheduledDateAsc(argument.getProgramId());
        int totalCount = siblings.size();
        int completedCount = (int) siblings.stream().filter(StudyArgument::isCompleted).count();
        String message = encouragementService.generate(
                argument.getTitle(), programName(argument.getProgramId()), completedCount, totalCount);

        return new StudyArgumentCompletionResponse(
                StudyArgumentResponse.from(argument), message, completedCount, totalCount);
    }

    public StudyArgument update(UUID userId, UUID id, StudyArgumentRequest request) {
        StudyArgument argument = getOrThrow(userId, id);
        argument.edit(request.title(), request.scheduledDate(), request.content(), request.completed());
        return argumentRepository.save(argument);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        getOrThrow(userId, id);
        imageRepository.deleteAllByArgumentId(id);
        argumentNoteRepository.deleteAllByArgumentId(id);
        argumentRepository.deleteById(id);
    }

    public List<StudyArgument> listByProgram(UUID userId, UUID programId) {
        requireOwnedProgram(userId, programId);
        return argumentRepository.findAllByProgramIdOrderByScheduledDateAsc(programId);
    }

    public StudyArgument getOrThrow(UUID userId, UUID id) {
        return argumentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Argument introuvable : " + id));
    }

    public List<StudyUpcomingResponse> upcoming(UUID userId) {
        LocalDate cutoff = LocalDate.now().plusDays(UPCOMING_WINDOW_DAYS);
        List<StudyArgument> due = argumentRepository
                .findAllByUserIdAndCompletedFalseAndScheduledDateLessThanEqualOrderByScheduledDateAsc(userId, cutoff);

        Map<UUID, String> programNames = new HashMap<>();
        LocalDate today = LocalDate.now();
        return due.stream()
                .map(arg -> new StudyUpcomingResponse(
                        arg.getId(),
                        arg.getProgramId(),
                        programNames.computeIfAbsent(arg.getProgramId(), this::programName),
                        arg.getTitle(),
                        arg.getScheduledDate(),
                        arg.getScheduledDate().isBefore(today)))
                .toList();
    }

    private String programName(UUID programId) {
        return programRepository.findById(programId).map(StudyProgram::getName).orElse("");
    }

    public StudyImage uploadImage(UUID userId, UUID argumentId, MultipartFile file) {
        StudyArgument argument = getOrThrow(userId, argumentId);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier image est vide ou manquant.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image trop volumineuse (max 5 Mo).");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Le fichier doit être une image.");
        }
        try {
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
            StudyImage image = new StudyImage(argument.getId(), filename, contentType, file.getBytes());
            image.setUserId(userId);
            return imageRepository.save(image);
        } catch (IOException e) {
            throw new IllegalArgumentException("Impossible de lire l'image reçue : " + e.getMessage(), e);
        }
    }

    public List<StudyImage> listImages(UUID userId, UUID argumentId) {
        getOrThrow(userId, argumentId);
        return imageRepository.findAllByArgumentIdOrderByCreatedAtAsc(argumentId);
    }

    public StudyImage getImageOrThrow(UUID userId, UUID imageId) {
        return imageRepository.findByIdAndUserId(imageId, userId)
                .orElseThrow(() -> new NoSuchElementException("Image introuvable : " + imageId));
    }

    public void deleteImage(UUID userId, UUID imageId) {
        getImageOrThrow(userId, imageId);
        imageRepository.deleteById(imageId);
    }

    public StudyArgumentNote createNote(UUID userId, UUID argumentId, String content) {
        StudyArgument argument = getOrThrow(userId, argumentId);
        StudyArgumentNote note = new StudyArgumentNote(argument.getId(), content);
        note.setUserId(userId);
        return argumentNoteRepository.save(note);
    }

    public List<StudyArgumentNote> listNotes(UUID userId, UUID argumentId) {
        getOrThrow(userId, argumentId);
        return argumentNoteRepository.findAllByArgumentIdOrderByCreatedAtAsc(argumentId);
    }

    public StudyArgumentNote updateNote(UUID userId, UUID noteId, String content) {
        StudyArgumentNote note = getNoteOrThrow(userId, noteId);
        note.edit(content);
        return argumentNoteRepository.save(note);
    }

    public StudyArgumentNote getNoteOrThrow(UUID userId, UUID noteId) {
        return argumentNoteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new NoSuchElementException("Note introuvable : " + noteId));
    }

    public void deleteNote(UUID userId, UUID noteId) {
        getNoteOrThrow(userId, noteId);
        argumentNoteRepository.deleteById(noteId);
    }

    private void requireOwnedProgram(UUID userId, UUID programId) {
        if (programRepository.findByIdAndUserId(programId, userId).isEmpty()) {
            throw new NoSuchElementException("Programme introuvable : " + programId);
        }
    }
}
