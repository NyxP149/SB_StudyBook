package com.jarvyx.studybook.folder.dto;

import com.jarvyx.studybook.folder.Folder;
import java.time.Instant;
import java.util.UUID;

public record FolderResponse(UUID id, String name, String color, UUID parentId, int depth, Instant createdAt) {

    public static FolderResponse from(Folder folder) {
        return new FolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getColor(),
                folder.getParentId(),
                folder.getDepth(),
                folder.getCreatedAt());
    }
}
