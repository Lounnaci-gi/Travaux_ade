USE AquaConnect_DB;
GO

SET NOCOUNT ON;
GO

/**************************************************************
  Script COMPLET d'insertion des Familles et Articles
  (Sans prix d'achat - Fourniture par défaut si non spécifié)
**************************************************************/

PRINT '========================================';
PRINT 'INSERTION GLOBALE - TOUTES LES FAMILLES';
PRINT '========================================';
PRINT '';

-- Récupération du Taux TVA et Utilisateur
DECLARE @TauxTVA DECIMAL(5,2) = (SELECT CAST(Valeur AS DECIMAL(5,2)) FROM ConfigurationGlobale WHERE Cle = 'TAUX_TVA_DEFAUT');
DECLARE @IdUtilisateur INT = (SELECT TOP 1 IdUtilisateur FROM Utilisateur ORDER BY IdUtilisateur);

PRINT 'Taux TVA appliqué : ' + CAST(@TauxTVA AS VARCHAR) + '%';
PRINT 'Utilisateur : ' + CAST(@IdUtilisateur AS VARCHAR);
PRINT '';

-- ============================================
-- FAMILLE 1 : TRAVAUX DE TERRASSEMENT
-- ============================================

PRINT 'FAM-001 : Travaux de Terrassement...';

INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-001', 'Travaux de Terrassement', 'Réfection de Voirie', 1);

DECLARE @IdFam001 INT = SCOPE_IDENTITY();

INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif)
VALUES 
    (@IdFam001, 'ART-0000001', 'Démolition de la chaussée goudronnée, dallée ou trottoir', 'M²', 1),
    (@IdFam001, 'ART-0000002', 'Décapage de la chaussée', 'M²', 1),
    (@IdFam001, 'ART-0000003', 'Enlèvement de la bordure de trottoir', 'ML', 1),
    (@IdFam001, 'ART-0000004', 'Excavation de la tranchée en terrain meuble exécutée manuellement', 'M³', 1),
    (@IdFam001, 'ART-0000005', 'Excavation de la tranchée en terrain meuble exécutée mécaniquement', 'M³', 1),
    (@IdFam001, 'ART-0000006', 'Remblaiement de la chaussée en utilisant les terres récupérées de pierres y compris compactage par couches successives de 20 cm', 'M³', 1),
    (@IdFam001, 'ART-0000007', 'Évacuation des terres excédentaires à la décharge publique, y compris chargement et déchargement', 'M³', 1),
    (@IdFam001, 'ART-0000008', 'Fourniture et pose d''un lit de sable fin, d''une épaisseur de 10 cm', 'M²', 1),
    (@IdFam001, 'ART-0000009', 'Remblai en état de la chaussée goudronnée et trottoir, y compris toutes suggestions', 'M²', 1),
    (@IdFam001, 'ART-0000010', 'Réfection de la chaussée en pavé', 'M²', 1),
    (@IdFam001, 'ART-0000011', 'Réfection de la chaussée dallée ou bétonnée, y compris toutes suggestions', 'M²', 1),
    (@IdFam001, 'ART-0000012', 'Remise en état des bordures de trottoir', 'ML', 1);

-- Prix FOURNITURE (par défaut car pas de distinction)
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixHT, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000001', 1600.00),
    ('ART-0000002', 1500.00),
    ('ART-0000003', 1000.00),
    ('ART-0000004', 2500.00),
    ('ART-0000005', 3000.00),
    ('ART-0000006', 1200.00),
    ('ART-0000007', 800.00),
    ('ART-0000008', 2900.00),
    ('ART-0000009', 2800.00),
    ('ART-0000010', 1200.00),
    ('ART-0000011', 1700.00),
    ('ART-0000012', 600.00)
) AS Prix(CodeArticle, PrixHT)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

PRINT '  ✓ 12 articles + 12 prix insérés';

-- ============================================
-- FAMILLE 2 : CANALISATIONS ET PIÈCES SPÉCIALES
-- ============================================

PRINT 'FAM-002 : Canalisations et Pièces Spéciales...';

INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-002', 'Canalisations et Pièces Spéciales', 'Canalisations PEHD et accessoires', 1);

DECLARE @IdFam002 INT = SCOPE_IDENTITY();

-- Articles Canalisations PEHD PN10
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000013', 'Canalisation PEHD PN10 Ø20', 'ML', '20', 'PEHD', 1),
    (@IdFam002, 'ART-0000014', 'Canalisation PEHD PN10 Ø25', 'ML', '25', 'PEHD', 1),
    (@IdFam002, 'ART-0000015', 'Canalisation PEHD PN10 Ø32', 'ML', '32', 'PEHD', 1),
    (@IdFam002, 'ART-0000016', 'Canalisation PEHD PN10 Ø40', 'ML', '40', 'PEHD', 1),
    (@IdFam002, 'ART-0000017', 'Canalisation PEHD PN10 Ø50', 'ML', '50', 'PEHD', 1),
    (@IdFam002, 'ART-0000018', 'Canalisation PEHD PN10 Ø63', 'ML', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000019', 'Canalisation PEHD PN10 Ø75', 'ML', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000020', 'Canalisation PEHD PN10 Ø90', 'ML', '90', 'PEHD', 1),
    (@IdFam002, 'ART-0000021', 'Canalisation PEHD PN10 Ø110', 'ML', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000022', 'Canalisation PEHD PN10 Ø125', 'ML', '125', 'PEHD', 1),
    (@IdFam002, 'ART-0000023', 'Canalisation PEHD PN10 Ø160', 'ML', '160', 'PEHD', 1);

-- Articles Canalisations PEHD PN16
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000024', 'Canalisation PEHD PN16 Ø20', 'ML', '20', 'PEHD', 1),
    (@IdFam002, 'ART-0000025', 'Canalisation PEHD PN16 Ø25', 'ML', '25', 'PEHD', 1),
    (@IdFam002, 'ART-0000026', 'Canalisation PEHD PN16 Ø32', 'ML', '32', 'PEHD', 1),
    (@IdFam002, 'ART-0000027', 'Canalisation PEHD PN16 Ø40', 'ML', '40', 'PEHD', 1),
    (@IdFam002, 'ART-0000028', 'Canalisation PEHD PN16 Ø50', 'ML', '50', 'PEHD', 1),
    (@IdFam002, 'ART-0000029', 'Canalisation PEHD PN16 Ø63', 'ML', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000030', 'Canalisation PEHD PN16 Ø75', 'ML', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000031', 'Canalisation PEHD PN16 Ø90', 'ML', '90', 'PEHD', 1),
    (@IdFam002, 'ART-0000032', 'Canalisation PEHD PN16 Ø110', 'ML', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000033', 'Canalisation PEHD PN16 Ø125', 'ML', '125', 'PEHD', 1),
    (@IdFam002, 'ART-0000034', 'Canalisation PEHD PN16 Ø160', 'ML', '160', 'PEHD', 1);

-- Articles Coudes PEHD
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000035', 'Coude PEHD Ø32 3/4" (25)', 'U', '32', 'PEHD', 1),
    (@IdFam002, 'ART-0000036', 'Coude PEHD Ø40 3/4" (25)', 'U', '40', 'PEHD', 1),
    (@IdFam002, 'ART-0000037', 'Coude PEHD Ø50 3/4" (25)', 'U', '50', 'PEHD', 1),
    (@IdFam002, 'ART-0000038', 'Coude PEHD Ø63 1.1/2" (50)', 'U', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000039', 'Coude PEHD Ø63 3/4" (25)', 'U', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000040', 'Coude PEHD Ø75 3/4" (25)', 'U', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000041', 'Coude PEHD Ø75 1/2" (50)', 'U', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000042', 'Coude PEHD Ø110 3/4" (25)', 'U', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000043', 'Coude PEHD Ø110 2" (63)', 'U', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000044', 'Coude PEHD Ø160 1.1/2" (50)', 'U', '160', 'PEHD', 1),
    (@IdFam002, 'ART-0000045', 'Coude PEHD Ø160 3/4" (25)', 'U', '160', 'PEHD', 1);

-- Articles Tés PEHD
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000046', 'Té PEHD Ø40/33', 'U', '40/33', 'PEHD', 1),
    (@IdFam002, 'ART-0000047', 'Té PEHD Ø50/33', 'U', '50/33', 'PEHD', 1),
    (@IdFam002, 'ART-0000048', 'Té PEHD Ø63/33', 'U', '63/33', 'PEHD', 1),
    (@IdFam002, 'ART-0000049', 'Té PEHD Ø80/33', 'U', '80/33', 'PEHD', 1),
    (@IdFam002, 'ART-0000050', 'Té PEHD Ø100/20', 'U', '100/20', 'PEHD', 1),
    (@IdFam002, 'ART-0000051', 'Té PEHD Ø100/33', 'U', '100/33', 'PEHD', 1),
    (@IdFam002, 'ART-0000052', 'Té PEHD Ø150/40', 'U', '150/40', 'PEHD', 1);

-- Articles Robinets d'arrêt INVIOLABLE
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES 
    (@IdFam002, 'ART-0000053', 'Robinet d''arrêt INVIOLABLE Ø15/21', 'U', '15/21', 1),
    (@IdFam002, 'ART-0000054', 'Robinet d''arrêt INVIOLABLE Ø15/21 coudé', 'U', '15/21', 1),
    (@IdFam002, 'ART-0000055', 'Robinet d''arrêt INVIOLABLE Ø20/27 coudé', 'U', '20/27', 1),
    (@IdFam002, 'ART-0000056', 'Robinet d''arrêt INVIOLABLE Ø20/27', 'U', '20/27', 1);

-- Articles Robinets d'arrêt standard
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES 
    (@IdFam002, 'ART-0000057', 'Robinet d''arrêt Ø20/27', 'U', '20/27', 1),
    (@IdFam002, 'ART-0000058', 'Robinet d''arrêt Ø33/42', 'U', '33/42', 1),
    (@IdFam002, 'ART-0000059', 'Robinet d''arrêt Ø40/49', 'U', '40/49', 1),
    (@IdFam002, 'ART-0000060', 'Robinet d''arrêt Ø50/60', 'U', '50/60', 1);

-- Articles Divers
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif)
VALUES 
    (@IdFam002, 'ART-0000061', 'Tabernacle (plaque d''assise)', 'U', 1),
    (@IdFam002, 'ART-0000062', 'Bouche à clé & socle en béton', 'U', 1),
    (@IdFam002, 'ART-0000063', 'Porte de niche PM', 'U', 1),
    (@IdFam002, 'ART-0000064', 'Porte de niche GM', 'U', 1),
    (@IdFam002, 'ART-0000065', 'Coffret de comptage A.E.P (P/01 compteur)', 'U', 1),
    (@IdFam002, 'ART-0000066', 'Grillage avertisseur (maille de signalisation)', 'ML', 1);

-- Prix FOURNITURE pour Canalisations PEHD PN10
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000013', 112.00),
    ('ART-0000014', 154.00),
    ('ART-0000015', 203.00),
    ('ART-0000016', 308.00),
    ('ART-0000017', 476.00),
    ('ART-0000018', 756.00),
    ('ART-0000019', 1064.00),
    ('ART-0000020', 1526.00),
    ('ART-0000021', 2240.00),
    ('ART-0000022', 2324.00),
    ('ART-0000023', 3808.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Canalisations PEHD PN10
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000013', 160.00),
    ('ART-0000014', 220.00),
    ('ART-0000015', 290.00),
    ('ART-0000016', 440.00),
    ('ART-0000017', 680.00),
    ('ART-0000018', 1080.00),
    ('ART-0000019', 1520.00),
    ('ART-0000020', 2180.00),
    ('ART-0000021', 3200.00),
    ('ART-0000022', 3320.00),
    ('ART-0000023', 5440.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Canalisations PEHD PN16
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000024', 128.80),
    ('ART-0000025', 182.00),
    ('ART-0000026', 294.00),
    ('ART-0000027', 448.00),
    ('ART-0000028', 700.00),
    ('ART-0000029', 1120.00),
    ('ART-0000030', 1526.00),
    ('ART-0000031', 2240.00),
    ('ART-0000032', 3234.00),
    ('ART-0000033', 3500.00),
    ('ART-0000034', 5600.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Canalisations PEHD PN16
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000024', 184.00),
    ('ART-0000025', 260.00),
    ('ART-0000026', 420.00),
    ('ART-0000027', 640.00),
    ('ART-0000028', 1000.00),
    ('ART-0000029', 1600.00),
    ('ART-0000030', 2180.00),
    ('ART-0000031', 3200.00),
    ('ART-0000032', 4620.00),
    ('ART-0000033', 5000.00),
    ('ART-0000034', 8000.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Coudes PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000035', 196.00),
    ('ART-0000036', 224.00),
    ('ART-0000037', 294.00),
    ('ART-0000038', 343.00),
    ('ART-0000039', 406.00),
    ('ART-0000040', 560.00),
    ('ART-0000041', 448.00),
    ('ART-0000042', 770.00),
    ('ART-0000043', 910.00),
    ('ART-0000044', 1365.00),
    ('ART-0000045', 1344.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Coudes PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000035', 280.00),
    ('ART-0000036', 320.00),
    ('ART-0000037', 420.00),
    ('ART-0000038', 490.00),
    ('ART-0000039', 580.00),
    ('ART-0000040', 800.00),
    ('ART-0000041', 640.00),
    ('ART-0000042', 1100.00),
    ('ART-0000043', 1300.00),
    ('ART-0000044', 1950.00),
    ('ART-0000045', 1920.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Tés PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000046', 1029.00),
    ('ART-0000047', 1204.00),
    ('ART-0000048', 1470.00),
    ('ART-0000049', 1960.00),
    ('ART-0000050', 2380.00),
    ('ART-0000051', 2394.00),
    ('ART-0000052', 3080.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Tés PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000046', 1460.00),
    ('ART-0000047', 1720.00),
    ('ART-0000048', 2100.00),
    ('ART-0000049', 2800.00),
    ('ART-0000050', 3400.00),
    ('ART-0000051', 3420.00),
    ('ART-0000052', 4400.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Robinets d'arrêt INVIOLABLE
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000053', 2369.80),
    ('ART-0000054', 2553.60),
    ('ART-0000055', 2923.20),
    ('ART-0000056', 3141.60)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Robinets d'arrêt INVIOLABLE
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000053', 3384.00),
    ('ART-0000054', 3648.00),
    ('ART-0000055', 4176.00),
    ('ART-0000056', 4488.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Robinets d'arrêt standard
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000057', 620.80),
    ('ART-0000058', 977.80),
    ('ART-0000059', 1722.60),
    ('ART-0000060', 4936.40)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Robinets d'arrêt standard
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000057', 1104.00),
    ('ART-0000058', 4254.00),
    ('ART-0000059', 5318.00),
    ('ART-0000060', 7052.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Divers
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000061', 1540.00),
    ('ART-0000062', 2100.00),
    ('ART-0000063', 11200.00),
    ('ART-0000064', 1680.00),
    ('ART-0000065', 3010.00),
    ('ART-0000066', 105.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Divers
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000061', 2200.00),
('ART-0000062', 3000.00),
('ART-0000063', 16000.00),
('ART-0000064', 2400.00),
('ART-0000065', 4300.00),
('ART-0000066', 150.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 54 articles + 108 prix insérés';
-- ============================================
-- FAMILLE 3 : PRESTATIONS DE SERVICE
-- ============================================
PRINT 'FAM-003 : Prestations de Service...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-003', 'Prestations de Service', 'Prestations de service pour compteurs', 1);
DECLARE @IdFam003 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES
(@IdFam003, 'ART-0000067', 'Compteur dn 15 mm', 'U', '15', 1),
(@IdFam003, 'ART-0000068', 'Compteur dn 20 mm', 'U', '20', 1),
(@IdFam003, 'ART-0000069', 'Compteur dn 30 mm', 'U', '30', 1),
(@IdFam003, 'ART-0000070', 'Compteur dn 40 mm', 'U', '40', 1);
-- Prix FOURNITURE (Fourniture & Pose)
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniturePose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000067', 6950.00),
('ART-0000068', 7500.00),
('ART-0000069', 20800.00),
('ART-0000070', 34000.00)
) AS Prix(CodeArticle, PrixFourniturePose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE (Frais de Pose)
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000067', 2500.00),
('ART-0000068', 2500.00),
('ART-0000069', 7800.00),
('ART-0000070', 15000.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 4 articles + 8 prix insérés';
-- ============================================
-- FAMILLE 4 : CAUTIONNEMENT
-- ============================================
PRINT 'FAM-004 : Cautionnement pour Branchement de Chantier...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-004', 'Cautionnement pour Branchement de Chantier', 'Montants de caution pour branchements de chantier', 1);
DECLARE @IdFam004 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES
(@IdFam004, 'ART-0000071', 'Cautionnement pour Branchement de Chantier Ø15', 'U', '15', 1),
(@IdFam004, 'ART-0000072', 'Cautionnement pour Branchement de Chantier Ø20', 'U', '20', 1),
(@IdFam004, 'ART-0000073', 'Cautionnement pour Branchement de Chantier Ø30', 'U', '30', 1),
(@IdFam004, 'ART-0000074', 'Cautionnement pour Branchement de Chantier Ø40', 'U', '40', 1);
-- Prix FOURNITURE (par défaut)
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', MontantCaution, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000071', 100000.00),
('ART-0000072', 200000.00),
('ART-0000073', 300000.00),
('ART-0000074', 400000.00)
) AS Prix(CodeArticle, MontantCaution)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 4 articles + 4 prix insérés';
-- ============================================
-- RAPPORT FINAL
-- ============================================
PRINT '';
PRINT '========================================';
PRINT 'RÉSUMÉ FINAL';
PRINT '========================================';
SELECT
af.CodeFamille AS 'Code Famille',
af.LibelleFamille AS 'Libellé',
COUNT(DISTINCT a.IdArticle) AS 'Articles',
COUNT(aph.IdPrixHistorique) AS 'Prix'
FROM ArticleFamille af
LEFT JOIN Article a ON af.IdFamille = a.IdFamille
LEFT JOIN ArticlePrixHistorique aph ON a.IdArticle = aph.IdArticle
GROUP BY af.CodeFamille, af.LibelleFamille
ORDER BY af.CodeFamille;
PRINT '';
PRINT '========================================';
PRINT '✓ INSERTION GLOBALE TERMINÉE !';
PRINT '========================================';
SET NOCOUNT OFF;
GO