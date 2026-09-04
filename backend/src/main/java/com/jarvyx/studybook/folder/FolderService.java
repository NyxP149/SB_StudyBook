package com.jarvyx.studybook.folder;

import com.jarvyx.studybook.folder.dto.FolderRequest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FolderService {

    // Cf. reponse utilisateur : "max 10 niveaux d'imbrication" (racine = niveau 1).
    private static final int MAX_DEPTH = 10;

    private final FolderRepository repository;

    public FolderService(FolderRepository repository) {
        this.repository = repository;
    }

    public Folder create(UUID userId, FolderRequest request) {
        Folder folder = new Folder(request.name(), request.color());
        folder.setUserId(userId);
        applyParent(userId, folder, request.parentId());
        return repository.save(folder);
    }

    @Transactional
    public Folder update(UUID userId, UUID id, FolderRequest request) {
        Folder folder = getOrThrow(userId, id);
        folder.setName(request.name());
        folder.setColor(request.color());
        if (!Objects.equals(folder.getParentId(), request.parentId())) {
            moveWithDescendants(userId, folder, request.parentId());
        }
        return repository.save(folder);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        getOrThrow(userId, id);
        List<Folder> descendants = getDescendants(userId, id);
        for (int i = descendants.size() - 1; i >= 0; i--) {
            repository.deleteById(descendants.get(i).getId());
        }
        repository.deleteById(id);
    }

    public List<Folder> listAll(UUID userId) {
        return repository.findAllByUserIdOrderByNameAsc(userId);
    }

    public Folder getOrThrow(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Dossier introuvable : " + id));
    }

    private void applyParent(UUID userId, Folder folder, UUID parentId) {
        if (parentId == null) {
            folder.setParentId(null);
            folder.setDepth(1);
            return;
        }
        Folder parent = getOrThrow(userId, parentId);
        int depth = parent.getDepth() + 1;
        if (depth > MAX_DEPTH) {
            throw new IllegalArgumentException(
                    "Profondeur maximale de dossiers imbriqués atteinte (" + MAX_DEPTH + " niveaux)");
        }
        folder.setParentId(parentId);
        folder.setDepth(depth);
    }

    private void moveWithDescendants(UUID userId, Folder folder, UUID newParentId) {
        if (newParentId != null && newParentId.equals(folder.getId())) {
            throw new IllegalArgumentException("Un dossier ne peut pas être son propre parent");
        }
        List<Folder> descendants = getDescendants(userId, folder.getId());
        if (newParentId != null && descendants.stream().anyMatch(d -> d.getId().equals(newParentId))) {
            throw new IllegalArgumentException(
                    "Impossible de déplacer un dossier dans l'un de ses propres sous-dossiers");
        }
        int subtreeHeight = descendants.stream().mapToInt(d -> d.getDepth() - folder.getDepth()).max().orElse(0);
        int previousDepth = folder.getDepth();
        applyParent(userId, folder, newParentId);
        if (folder.getDepth() + subtreeHeight > MAX_DEPTH) {
            throw new IllegalArgumentException(
                    "Profondeur maximale de dossiers imbriqués atteinte (" + MAX_DEPTH + " niveaux)");
        }
        int delta = folder.getDepth() - previousDepth;
        if (delta != 0) {
            for (Folder descendant : descendants) {
                descendant.setDepth(descendant.getDepth() + delta);
                repository.save(descendant);
            }
        }
    }

    private List<Folder> getDescendants(UUID userId, UUID folderId) {
        List<Folder> result = new ArrayList<>();
        Deque<UUID> queue = new ArrayDeque<>();
        queue.add(folderId);
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            for (Folder child : repository.findAllByUserIdAndParentIdOrderByNameAsc(userId, current)) {
                result.add(child);
                queue.add(child.getId());
            }
        }
        return result;
    }
}
