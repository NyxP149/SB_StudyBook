package com.jarvyx.studybook.folder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color;

    // null = dossier racine ; sinon id d'un autre Folder du meme utilisateur.
    private UUID parentId;

    // Profondeur dans l'arbre (racine = 1), maintenue a jour par FolderService
    // pour eviter de reparcourir la chaine de parents a chaque lecture.
    // columnDefinition avec DEFAULT : ddl-auto=update ajoute cette colonne sur
    // une table Postgres deja peuplee (prod), une simple NOT NULL sans defaut
    // echouerait sur les lignes existantes.
    @Column(nullable = false, columnDefinition = "integer default 1")
    private int depth = 1;

    @Column(nullable = false)
    private Instant createdAt;

    public Folder(String name, String color) {
        this.name = name;
        this.color = color;
        this.createdAt = Instant.now();
    }
}
