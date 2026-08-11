package com.jarvyx.studybook.study;

import com.jarvyx.studybook.study.dto.StudyProgramRequest;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyProgramService {

    private final StudyProgramRepository programRepository;
    private final StudyArgumentRepository argumentRepository;
    private final StudyImageRepository imageRepository;

    public StudyProgramService(
            StudyProgramRepository programRepository,
            StudyArgumentRepository argumentRepository,
            StudyImageRepository imageRepository) {
        this.programRepository = programRepository;
        this.argumentRepository = argumentRepository;
        this.imageRepository = imageRepository;
    }

    public StudyProgram create(UUID userId, StudyProgramRequest request) {
        StudyProgram program = new StudyProgram(request.name(), request.frequency());
        program.setUserId(userId);
        return programRepository.save(program);
    }

    public StudyProgram update(UUID userId, UUID id, StudyProgramRequest request) {
        StudyProgram program = getOrThrow(userId, id);
        program.setName(request.name());
        program.setFrequency(request.frequency());
        return programRepository.save(program);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        getOrThrow(userId, id);
        for (StudyArgument argument : argumentRepository.findAllByProgramIdOrderByScheduledDateAsc(id)) {
            imageRepository.deleteAllByArgumentId(argument.getId());
        }
        argumentRepository.deleteAllByProgramId(id);
        programRepository.deleteById(id);
    }

    public List<StudyProgram> listAll(UUID userId) {
        return programRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    public StudyProgram getOrThrow(UUID userId, UUID id) {
        return programRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Programme introuvable : " + id));
    }
}
