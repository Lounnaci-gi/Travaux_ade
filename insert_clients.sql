SET NOCOUNT ON;

-- Table temporaire pour les noms algériens
DECLARE @Noms TABLE (Nom NVARCHAR(100));
INSERT INTO @Noms VALUES 
('Bouzid'), ('Amirat'), ('Zerrouki'), ('Benali'), ('Lakhdari'), ('Ouali'), ('Belkacem'), 
('Hadjadji'), ('Bouzidi'), ('Meziane'), ('Brahimi'), ('Djebbari'), ('Boumediene'), 
('Rezig'), ('Kessas'), ('Yahiaoui'), ('Taleb'), ('Guermah'), ('Benchegra'), ('Cherif'),
('Ait Ouarab'), ('Mansouri'), ('Boukhari'), ('Ziani'), ('Djebli'), ('Boussaha'), 
('Ouchene'), ('Laouar'), ('Ghalem'), ('Bouafia');

-- Table temporaire pour les prénoms algériens
DECLARE @Prenoms TABLE (Prenom NVARCHAR(100));
INSERT INTO @Prenoms VALUES 
('Ahmed'), ('Mohamed'), ('Karim'), ('Samir'), ('Nabil'), ('Yacine'), ('Rachid'), 
('Farid'), ('Sofiane'), ('Mehdi'), ('Amine'), ('Lyes'), ('Hakim'), ('Walid'), 
('Chahrazed'), ('Fatima'), ('Nadia'), ('Souad'), ('Imene'), ('Leila'), 
('Amel'), ('Salima'), ('Meriem'), ('Lina'), ('Omar'), ('Reda'), ('Tarik'), 
('Djamel'), ('Abdelkader'), ('Noureddine');

-- Table temporaire pour les communes et codes postaux algériens
DECLARE @Adresses TABLE (Commune NVARCHAR(100), CodePostal NVARCHAR(10));
INSERT INTO @Adresses VALUES
('Alger Centre', '16000'),
('Bab Ezzouar', '16046'),
('El Harrach', '16200'),
('Oran', '31000'),
('Constantine', '25000'),
('Annaba', '23000'),
('Tizi Ouzou', '15000'),
('Sétif', '19000'),
('Batna', '05000'),
('Béjaïa', '06000'),
('Blida', '09000'),
('Mostaganem', '27000'),
('Tlemcen', '13000'),
('Ouargla', '30000'),
('Skikda', '21000'),
('Biskra', '07000'),
('Tiaret', '14000'),
('Chlef', '02000'),
('Ghardaïa', '47000'),
('Sidi Bel Abbès', '22000');

DECLARE @i INT = 1;
DECLARE @Nom NVARCHAR(100), @Prenom NVARCHAR(100), @Commune NVARCHAR(100), @CodePostal NVARCHAR(10);
DECLARE @AdresseResidence NVARCHAR(200), @TelephonePrincipal NVARCHAR(20), @Email NVARCHAR(100);
DECLARE @IdClientType INT, @StatutOccupation NVARCHAR(20);
DECLARE @PieceIdentite NVARCHAR(50), @PieceDelivrePar NVARCHAR(100), @DateDelivrance DATE;

WHILE @i <= 30
BEGIN
    -- Sélection aléatoire
    SELECT TOP 1 @Nom = Nom FROM @Noms ORDER BY NEWID();
    SELECT TOP 1 @Prenom = Prenom FROM @Prenoms ORDER BY NEWID();
    SELECT TOP 1 @Commune = Commune, @CodePostal = CodePostal FROM @Adresses ORDER BY NEWID();
    
    SET @IdClientType = FLOOR(RAND() * 3) + 1; -- 1 à 3

    -- StatutOccupation aléatoire
    SELECT @StatutOccupation = CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'PROPRIETAIRE'
        WHEN 1 THEN 'LOCATAIRE'
        ELSE 'MANDATAIRE'
    END;

    -- Adresse de résidence
    SET @AdresseResidence = 'N° ' + CAST(FLOOR(RAND() * 100) + 1 AS NVARCHAR(10)) + ', Rue ' + 
        CASE FLOOR(RAND() * 5)
            WHEN 0 THEN 'de la Liberté'
            WHEN 1 THEN 'Mohamed Belouizdad'
            WHEN 2 THEN 'Larbi Ben M''Hidi'
            WHEN 3 THEN 'Ali Boumendjel'
            ELSE 'Colonel Amirouche'
        END;

    -- Téléphone au format algérien (05 ou 06 + 8 chiffres)
    DECLARE @Prefixe NVARCHAR(2) = CASE FLOOR(RAND() * 2) WHEN 0 THEN '05' ELSE '06' END;
    SET @TelephonePrincipal = @Prefixe + RIGHT('00000000' + CAST(CAST(RAND() * 100000000 AS INT) AS NVARCHAR(8)), 8);

    -- Email
    SET @Email = LOWER(@Prenom) + '.' + LOWER(@Nom) + '@example.dz';

    -- Pièce d'identité
    IF RAND() > 0.3
        SET @PieceIdentite = 'Carte Nationale';
    ELSE
        SET @PieceIdentite = 'Passeport';

    SET @PieceDelivrePar = 'Commune de ' + @Commune;
    SET @DateDelivrance = DATEADD(DAY, -FLOOR(RAND() * 1825), GETDATE()); -- entre 0 et 5 ans

    -- Insertion
    INSERT INTO Client (
        IdClientType, Nom, Prenom, AdresseResidence, CommuneResidence, CodePostalResidence,
        TelephonePrincipal, Email, StatutOccupation, NumeroPieceIdentite, PieceDelivrePar,
        DateDelivrancePiece, Actif, DateCreation
    )
    VALUES (
        @IdClientType, @Nom, @Prenom, @AdresseResidence, @Commune, @CodePostal,
        @TelephonePrincipal, @Email, @StatutOccupation, 'CN-' + RIGHT('00000000' + CAST(@i AS NVARCHAR(8)), 8),
        @PieceDelivrePar, @DateDelivrance, 1, GETDATE()
    );

    SET @i = @i + 1;
END;

PRINT '30 clients algériens insérés avec succès.';