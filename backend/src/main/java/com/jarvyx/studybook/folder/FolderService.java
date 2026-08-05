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

    public Folder create(FolderRequest request) {
        return repository.save(new Folder(request.name(), request.color()));
    }

    public Folder update(UUID id, FolderRequest request) {
        Folder folder = getOrThrow(id);
        folder.setName(request.name());
        folder.setColor(request.color());
        return repository.save(folder);
    }

    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Dossier introuvable : " + id);
        }
        repository.deleteById(id);
    }

    public List<Folder> listAll() {
        return repository.findAllByOrderByNameAsc();
    }

    public Folder getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Dossier introuvable : " + id));
    }
}
