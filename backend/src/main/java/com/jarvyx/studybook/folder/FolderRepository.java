package com.jarvyx.studybook.folder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface FolderRepository extends JpaRepository<Folder, UUID> {

    List<Folder> findAllByUserIdOrderByNameAsc(UUID userId);

    List<Folder> findAllByUserIdAndParentIdOrderByNameAsc(UUID userId, UUID parentId);

    Optional<Folder> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("update Folder f set f.userId = :userId where f.userId is null")
    void claimOrphaned(UUID userId);
}
