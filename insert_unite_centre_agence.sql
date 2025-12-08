-- ============================================================================
-- Script d'insertion des données initiales - AquaConnect Algérie
-- Contenu:
--   - 3 Unités Territoriales
--   - 8 Centres
--   - 25 Agences Commerciales
--   - 1 Utilisateur Administrateur
-- ============================================================================

USE AquaConnect_DB;
GO

-- ============================================================================
-- 1. INSERTION DES 3 UNITÉS PRINCIPALES
-- ============================================================================

PRINT '============================================================================';
PRINT 'DÉBUT DES INSERTIONS - DONNÉES DE BASE';
PRINT '============================================================================';
PRINT '';

INSERT INTO Unite (CodeUnite, NomUnite, Adresse, Commune, CodePostal, TelephonePrincipal, TelephoneSecondaire, Fax, Email, SiteWeb, 
                   NumeroIdentifiantFiscal, NumeroIdentificationStatistique, NumeroRegistreCommerce, NomBanque, NumerocompteBancaire, NumeroComptePostal, Actif)
VALUES 
-- UNITÉ 1: ALGER
('UN-ALG', 'Unité Territoriale d''Alger', '15 Rue Didouche Mourad', 'Alger Centre', '16000', 
 '0213456789', '0213456790', '0213456791', 'unite.alger@aquaconnect.dz', 'www.aquaconnect-alger.dz',
 '001616000123456789', '161600012345678', '16001234567B16', 'BNA - Banque Nationale d''Algérie', '00200016123456789012', '40012345678', 1),

-- UNITÉ 2: ORAN
('UN-ORA', 'Unité Territoriale d''Oran', 'Boulevard de la Soummam', 'Oran Centre', '31000',
 '0413456789', '0413456790', '0413456791', 'unite.oran@aquaconnect.dz', 'www.aquaconnect-oran.dz',
 '003131000123456789', '311000012345678', '31001234567B31', 'BEA - Banque Extérieure d''Algérie', '00200031123456789012', '40087654321', 1),

-- UNITÉ 3: CONSTANTINE
('UN-CST', 'Unité Territoriale de Constantine', 'Avenue Aouati Mostefa', 'Constantine Centre', '25000',
 '0313456789', '0313456790', '0313456791', 'unite.constantine@aquaconnect.dz', 'www.aquaconnect-constantine.dz',
 '002525000123456789', '251000012345678', '25001234567B25', 'CPA - Crédit Populaire d''Algérie', '00200025123456789012', '40011223344', 1);

-- Vérification
IF @@ROWCOUNT = 3
    PRINT '✅ 3 UNITÉS insérées avec succès!'
ELSE
    PRINT '❌ ERREUR: Les Unités n''ont pas été insérées correctement!';
GO

-- ============================================================================
-- 2. INSERTION DES 8 CENTRES (Répartis sur les 3 unités)
-- ============================================================================

DECLARE @IdUniteAlger INT, @IdUniteOran INT, @IdUniteConstantine INT;

SELECT @IdUniteAlger = IdUnite FROM Unite WHERE CodeUnite = 'UN-ALG';
SELECT @IdUniteOran = IdUnite FROM Unite WHERE CodeUnite = 'UN-ORA';
SELECT @IdUniteConstantine = IdUnite FROM Unite WHERE CodeUnite = 'UN-CST';

-- Vérification que les Unités existent
IF @IdUniteAlger IS NULL OR @IdUniteOran IS NULL OR @IdUniteConstantine IS NULL
BEGIN
    PRINT '❌ ERREUR: Les Unités n''ont pas été trouvées! Arrêt du script.';
    RETURN;
END

INSERT INTO Centre (IdUnite, CodeCentre, NomCentre, PrefixeCentre, Adresse, Commune, CodePostal, 
                    TelephonePrincipal, TelephoneSecondaire, Fax, Email, NomBanque, NumerocompteBancaire, NumeroComptePostal, Actif)
VALUES 
-- CENTRES UNITÉ ALGER (3 centres)
(@IdUniteAlger, 'CTR-ALC', 'Centre Alger Centre', 'ALC', 'Rue Larbi Ben M''hidi', 'Alger Centre', '16000', 
 '0213567890', '0213567891', '0213567892', 'centre.alger@aquaconnect.dz', 'BNA', '00200016223456789012', '40012345679', 1),

(@IdUniteAlger, 'CTR-BIR', 'Centre Birtouta', 'BIR', 'Route Nationale N°1', 'Birtouta', '16400',
 '0213678901', '0213678902', '0213678903', 'centre.birtouta@aquaconnect.dz', 'BADR', '00200016323456789012', '40012345680', 1),

(@IdUniteAlger, 'CTR-BLD', 'Centre Blida', 'BLD', 'Boulevard Larbi Tebessi', 'Blida', '09000',
 '0253456789', '0253456790', '0253456791', 'centre.blida@aquaconnect.dz', 'CPA', '00200009123456789012', '40012345681', 1),

-- CENTRES UNITÉ ORAN (3 centres)
(@IdUniteOran, 'CTR-ORC', 'Centre Oran Centre', 'ORC', 'Rue du 1er Novembre', 'Oran', '31000',
 '0413567890', '0413567891', '0413567892', 'centre.oran@aquaconnect.dz', 'BEA', '00200031223456789012', '40087654322', 1),

(@IdUniteOran, 'CTR-ESS', 'Centre Es-Senia', 'ESS', 'Route de l''Aéroport', 'Es Senia', '31100',
 '0413678901', '0413678902', '0413678903', 'centre.essenia@aquaconnect.dz', 'BDL', '00200031323456789012', '40087654323', 1),

(@IdUniteOran, 'CTR-MOS', 'Centre Mostaganem', 'MOS', 'Boulevard Benabdelmalek Ramdane', 'Mostaganem', '27000',
 '0453456789', '0453456790', '0453456791', 'centre.mostaganem@aquaconnect.dz', 'CNEP', '00200027123456789012', '40087654324', 1),

-- CENTRES UNITÉ CONSTANTINE (2 centres)
(@IdUniteConstantine, 'CTR-CSC', 'Centre Constantine Centre', 'CSC', 'Boulevard Zighoud Youcef', 'Constantine', '25000',
 '0313567890', '0313567891', '0313567892', 'centre.constantine@aquaconnect.dz', 'CPA', '00200025223456789012', '40011223345', 1),

(@IdUniteConstantine, 'CTR-ANN', 'Centre Annaba', 'ANN', 'Cours de la Révolution', 'Annaba', '23000',
 '0383456789', '0383456790', '0383456791', 'centre.annaba@aquaconnect.dz', 'BNA', '00200023123456789012', '40011223346', 1);

-- Vérification
IF @@ROWCOUNT = 8
    PRINT '✅ 8 CENTRES insérés avec succès!'
ELSE
    PRINT '❌ ERREUR: Les Centres n''ont pas été insérés correctement!';
GO

-- ============================================================================
-- 3. INSERTION DES 25 AGENCES COMMERCIALES
-- ============================================================================

DECLARE @IdCentreALC INT, @IdCentreBIR INT, @IdCentreBLD INT,
        @IdCentreORC INT, @IdCentreESS INT, @IdCentreMOS INT,
        @IdCentreCSC INT, @IdCentreANN INT;

SELECT @IdCentreALC = IdCentre FROM Centre WHERE CodeCentre = 'CTR-ALC';
SELECT @IdCentreBIR = IdCentre FROM Centre WHERE CodeCentre = 'CTR-BIR';
SELECT @IdCentreBLD = IdCentre FROM Centre WHERE CodeCentre = 'CTR-BLD';
SELECT @IdCentreORC = IdCentre FROM Centre WHERE CodeCentre = 'CTR-ORC';
SELECT @IdCentreESS = IdCentre FROM Centre WHERE CodeCentre = 'CTR-ESS';
SELECT @IdCentreMOS = IdCentre FROM Centre WHERE CodeCentre = 'CTR-MOS';
SELECT @IdCentreCSC = IdCentre FROM Centre WHERE CodeCentre = 'CTR-CSC';
SELECT @IdCentreANN = IdCentre FROM Centre WHERE CodeCentre = 'CTR-ANN';

-- Vérification que les Centres existent
IF @IdCentreALC IS NULL OR @IdCentreBIR IS NULL OR @IdCentreBLD IS NULL OR
   @IdCentreORC IS NULL OR @IdCentreESS IS NULL OR @IdCentreMOS IS NULL OR
   @IdCentreCSC IS NULL OR @IdCentreANN IS NULL
BEGIN
    PRINT '❌ ERREUR: Les Centres n''ont pas été trouvés! Arrêt du script.';
    RETURN;
END

INSERT INTO AgenceCommerciale (IdCentre, CodeAgence, NomAgence, Adresse, Commune, CodePostal, 
                                TelephonePrincipal, TelephoneSecondaire, Fax, Email, Actif)
VALUES 
-- AGENCES DU CENTRE ALGER CENTRE (4 agences)
(@IdCentreALC, 'AG-BAB', 'Agence Bab El Oued', '25 Rue Tripoli', 'Bab El Oued', '16030',
 '0213789012', '0213789013', '0213789014', 'agence.babeloued@aquaconnect.dz', 1),

(@IdCentreALC, 'AG-HYD', 'Agence Hydra', 'Rue des Frères Bouadou', 'Hydra', '16035',
 '0213890123', '0213890124', '0213890125', 'agence.hydra@aquaconnect.dz', 1),

(@IdCentreALC, 'AG-KOU', 'Agence Kouba', 'Rue Ali Khoja', 'Kouba', '16050',
 '0213901234', '0213901235', '0213901236', 'agence.kouba@aquaconnect.dz', 1),

(@IdCentreALC, 'AG-CHE', 'Agence Chéraga', 'Centre Commercial Ardis', 'Chéraga', '16004',
 '0213012345', '0213012346', '0213012347', 'agence.cheraga@aquaconnect.dz', 1),

-- AGENCES DU CENTRE BIRTOUTA (3 agences)
(@IdCentreBIR, 'AG-ZER', 'Agence Zéralda', 'Route Nationale N°11', 'Zéralda', '16113',
 '0213123456', '0213123457', '0213123458', 'agence.zeralda@aquaconnect.dz', 1),

(@IdCentreBIR, 'AG-STF', 'Agence Staouéli', 'Rue Principale', 'Staouéli', '16112',
 '0213234567', '0213234568', '0213234569', 'agence.staoueli@aquaconnect.dz', 1),

(@IdCentreBIR, 'AG-DRA', 'Agence Draria', 'Cité 5 Juillet', 'Draria', '16093',
 '0213345678', '0213345679', '0213345680', 'agence.draria@aquaconnect.dz', 1),

-- AGENCES DU CENTRE BLIDA (3 agences)
(@IdCentreBLD, 'AG-BCT', 'Agence Blida Centre', 'Place du 1er Novembre', 'Blida', '09000',
 '0253567890', '0253567891', '0253567892', 'agence.blidacentre@aquaconnect.dz', 1),

(@IdCentreBLD, 'AG-BOU', 'Agence Bouinan', 'Rue de la Liberté', 'Bouinan', '09100',
 '0253678901', '0253678902', '0253678903', 'agence.bouinan@aquaconnect.dz', 1),

(@IdCentreBLD, 'AG-BOF', 'Agence Boufarik', 'Boulevard Abane Ramdane', 'Boufarik', '09055',
 '0253789012', '0253789013', '0253789014', 'agence.boufarik@aquaconnect.dz', 1),

-- AGENCES DU CENTRE ORAN CENTRE (4 agences)
(@IdCentreORC, 'AG-SID', 'Agence Sidi El Houari', 'Place du 1er Novembre', 'Sidi El Houari', '31000',
 '0413789012', '0413789013', '0413789014', 'agence.sidihouari@aquaconnect.dz', 1),

(@IdCentreORC, 'AG-HAM', 'Agence Hai Miramar', 'Boulevard de la Soummam', 'Oran', '31000',
 '0413890123', '0413890124', '0413890125', 'agence.miramar@aquaconnect.dz', 1),

(@IdCentreORC, 'AG-MED', 'Agence Médina Jdida', 'Rue Larbi Ben M''hidi', 'Médina Jdida', '31010',
 '0413901234', '0413901235', '0413901236', 'agence.medinajdida@aquaconnect.dz', 1),

(@IdCentreORC, 'AG-BIR', 'Agence Bir El Djir', 'Route Nationale N°2', 'Bir El Djir', '31130',
 '0414012345', '0414012346', '0414012347', 'agence.bireldjir@aquaconnect.dz', 1),

-- AGENCES DU CENTRE ES-SENIA (2 agences)
(@IdCentreESS, 'AG-ESN', 'Agence Es Senia', 'Centre Ville', 'Es Senia', '31100',
 '0413123456', '0413123457', '0413123458', 'agence.essenia@aquaconnect.dz', 1),

(@IdCentreESS, 'AG-ARZ', 'Agence Arzew', 'Boulevard Maritime', 'Arzew', '31200',
 '0413234567', '0413234568', '0413234569', 'agence.arzew@aquaconnect.dz', 1),

-- AGENCES DU CENTRE MOSTAGANEM (3 agences)
(@IdCentreMOS, 'AG-MST', 'Agence Mostaganem Centre', 'Place de la République', 'Mostaganem', '27000',
 '0453567890', '0453567891', '0453567892', 'agence.mostaganem@aquaconnect.dz', 1),

(@IdCentreMOS, 'AG-TIG', 'Agence Tigditt', 'Rue du Port', 'Tigditt', '27001',
 '0453678901', '0453678902', '0453678903', 'agence.tigditt@aquaconnect.dz', 1),

(@IdCentreMOS, 'AG-REL', 'Agence Relizane', 'Avenue de l''Indépendance', 'Relizane', '48000',
 '0463456789', '0463456790', '0463456791', 'agence.relizane@aquaconnect.dz', 1),

-- AGENCES DU CENTRE CONSTANTINE CENTRE (3 agences)
(@IdCentreCSC, 'AG-CNT', 'Agence Constantine Centre', 'Place des Martyrs', 'Constantine', '25000',
 '0313789012', '0313789013', '0313789014', 'agence.constantinecentre@aquaconnect.dz', 1),

(@IdCentreCSC, 'AG-ELK', 'Agence El Khroub', 'Boulevard Souidani Boudjemaa', 'El Khroub', '25100',
 '0313890123', '0313890124', '0313890125', 'agence.elkhroub@aquaconnect.dz', 1),

(@IdCentreCSC, 'AG-HAD', 'Agence Hamma Bouziane', 'Rue du 8 Mai 1945', 'Hamma Bouziane', '25200',
 '0313901234', '0313901235', '0313901236', 'agence.hammabouziane@aquaconnect.dz', 1),

-- AGENCES DU CENTRE ANNABA (3 agences)
(@IdCentreANN, 'AG-ANC', 'Agence Annaba Centre', 'Cours de la Révolution', 'Annaba', '23000',
 '0383567890', '0383567891', '0383567892', 'agence.annabacentre@aquaconnect.dz', 1),

(@IdCentreANN, 'AG-SER', 'Agence Seraïdi', 'Route de Seraïdi', 'Seraïdi', '23100',
 '0383678901', '0383678902', '0383678903', 'agence.seraidi@aquaconnect.dz', 1),

(@IdCentreANN, 'AG-TAR', 'Agence El Taref', 'Boulevard de l''ALN', 'El Taref', '36000',
 '0383789012', '0383789013', '0383789014', 'agence.eltaref@aquaconnect.dz', 1);

-- Vérification
IF @@ROWCOUNT = 25
    PRINT '✅ 25 AGENCES COMMERCIALES insérées avec succès!'
ELSE
    PRINT '❌ ERREUR: Les Agences n''ont pas été insérées correctement!';
GO

-- ============================================================================
-- 4. CRÉATION DE L'UTILISATEUR ADMINISTRATEUR
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'CRÉATION DE L''UTILISATEUR ADMINISTRATEUR';
PRINT '============================================================================';

-- Vérifier si l'utilisateur existe déjà
IF NOT EXISTS (SELECT * FROM Utilisateur WHERE Email = 'admin' OR Matricule = 'UTI-0001')
BEGIN
    INSERT INTO Utilisateur (
        Role,
        Matricule,
        Nom,
        Prenom,
        Email,
        Telephone,
        MotDePasse,
        IdUnite,
        IdCentre,
        IdAgence,
        Actif,
        DateCreation
    )
    VALUES (
        'ADMINISTRATEUR',           -- Rôle directement dans la table
        'UTI-0001',                 -- Matricule
        'Administrateur',           -- Nom
        'Système',                  -- Prénom
        'admin',                    -- Email
        '0665847684',               -- Téléphone
        '$2b$12$G44avdH1DVW.RxLug515SuCco9kK7MKqWLrQ94oCoeq9EbxjaShc.',                 -- Mot de passe par défaut (À CHANGER en production!)
        NULL,                       -- Pas d'unité spécifique (accès global)
        NULL,                       -- Pas de centre spécifique
        NULL,                       -- Pas d'agence spécifique
        1,                          -- Actif
        GETDATE()                   -- Date création
    );
    
    PRINT '✅ Utilisateur Administrateur créé avec succès!';
    PRINT '';
    PRINT '📧 Email        : admin';
    PRINT '🔑 Matricule    : UTI-0001';
    PRINT '🔒 Mot de passe : admin123';
    PRINT '👤 Rôle         : ADMINISTRATEUR';
    PRINT '📱 Téléphone    : 0665847684';
    PRINT '';
    PRINT '⚠️  IMPORTANT: Changez le mot de passe après la première connexion!';
END
ELSE
BEGIN
    PRINT 'ℹ️  Utilisateur Administrateur existe déjà';
    PRINT '📧 Email      : admin';
    PRINT '🔑 Matricule  : UTI-0001';
END
GO

-- ============================================================================
-- 5. VÉRIFICATION DES DONNÉES INSÉRÉES
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'RÉSUMÉ DES INSERTIONS';
PRINT '============================================================================';

DECLARE @NbUnites INT, @NbCentres INT, @NbAgences INT, @NbUtilisateurs INT;

SELECT @NbUnites = COUNT(*) FROM Unite WHERE Actif = 1;
SELECT @NbCentres = COUNT(*) FROM Centre WHERE Actif = 1;
SELECT @NbAgences = COUNT(*) FROM AgenceCommerciale WHERE Actif = 1;
SELECT @NbUtilisateurs = COUNT(*) FROM Utilisateur WHERE Actif = 1;

PRINT '📊 Nombre d''Unités insérées       : ' + CAST(@NbUnites AS NVARCHAR);
PRINT '📊 Nombre de Centres insérés      : ' + CAST(@NbCentres AS NVARCHAR);
PRINT '📊 Nombre d''Agences insérées      : ' + CAST(@NbAgences AS NVARCHAR);
PRINT '📊 Nombre d''Utilisateurs créés    : ' + CAST(@NbUtilisateurs AS NVARCHAR);
PRINT '============================================================================';
PRINT '';

-- Détail par Unité
PRINT 'DÉTAIL PAR UNITÉ:';
PRINT '============================================================================';

SELECT 
    u.CodeUnite AS [Code Unité],
    u.NomUnite AS [Nom Unité],
    COUNT(DISTINCT c.IdCentre) AS [Nb Centres],
    COUNT(a.IdAgence) AS [Nb Agences]
FROM Unite u
LEFT JOIN Centre c ON u.IdUnite = c.IdUnite
LEFT JOIN AgenceCommerciale a ON c.IdCentre = a.IdCentre
WHERE u.Actif = 1
GROUP BY u.CodeUnite, u.NomUnite
ORDER BY u.CodeUnite;

GO

-- Vérification de l'utilisateur administrateur
PRINT '';
PRINT '============================================================================';
PRINT 'INFORMATIONS DE L''UTILISATEUR ADMINISTRATEUR';
PRINT '============================================================================';

SELECT 
    u.IdUtilisateur AS [ID],
    u.Matricule,
    u.Nom + ' ' + u.Prenom AS [Nom Complet],
    u.Email,
    u.Telephone AS [Téléphone],
    u.Role AS [Rôle],
    CASE u.Role
        WHEN 'ADMINISTRATEUR' THEN 'Administrateur Système'
        WHEN 'CHEF_CENTRE' THEN 'Chef de Centre'
        WHEN 'CHEF_AGENCE_COMMERCIALE' THEN 'Chef d''Agence Commerciale'
        WHEN 'CHEF_SERVICE_JURIDIQUE' THEN 'Chef de Service Juridique'
        WHEN 'CHEF_SECTION_RELATIONS_CLIENTELE' THEN 'Chef de Section Relations Clientèle'
        WHEN 'CHEF_SERVICE_TECHNICO_COMMERCIAL' THEN 'Chef de Service Technico-Commercial'
        WHEN 'UTILISATEUR_STANDARD' THEN 'Utilisateur Standard'
    END AS [Libellé Rôle],
    CASE WHEN u.Actif = 1 THEN 'Oui' ELSE 'Non' END AS [Actif],
    u.DateCreation AS [Date Création]
FROM Utilisateur u
WHERE u.Email = 'admin' OR u.Matricule = 'UTI-0001';

GO

PRINT '';
PRINT '============================================================================';
PRINT '✅ INSERTION DE TOUTES LES DONNÉES TERMINÉE AVEC SUCCÈS!';
PRINT '============================================================================';
PRINT '';
PRINT '📝 Liste des rôles disponibles dans le système:';
PRINT '   1. ADMINISTRATEUR';
PRINT '   2. CHEF_CENTRE';
PRINT '   3. CHEF_AGENCE_COMMERCIALE';
PRINT '   4. CHEF_SERVICE_JURIDIQUE';
PRINT '   5. CHEF_SECTION_RELATIONS_CLIENTELE';
PRINT '   6. CHEF_SERVICE_TECHNICO_COMMERCIAL';
PRINT '   7. UTILISATEUR_STANDARD';
PRINT '============================================================================';
GO