package com.jarvyx.studybook.folder;

import com.jarvyx.studybook.folder.dto.FolderRequest;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FolderService {

    private final FolderRepository repository;

    public FolderService(FolderRepository repository) {
        this.repository = repository;
    }

    public Folder create(UUID userId, FolderRequest request) {
        Folder folder = new Folder(request.name(), request.color());
        folder.setUserId(userId);
        return repository.save(folder);
    }

    public Folder update(UUID userId, UUID id, FolderRequest request) {
        Folder folder = getOrThrow(userId, id);
        folder.setName(request.name());
        folder.setColor(request.color());
        return repository.save(folder);
    }

    public void delete(UUID userId, UUID id) {
        getOrThrow(userId, id);
        repository.deleteById(id);
    }

    public List<Folder> listAll(UUID userId) {
        return repository.findAllByUserIdOrderByNameAsc(userId);
    }

    public Folder getOrThrow(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Dossier introuvable : " + id));
    }
}
