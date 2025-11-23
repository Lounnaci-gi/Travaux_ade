USE AquaConnect_DB;
GO

SET NOCOUNT ON;
GO

/**************************************************************
  Script COMPLET d'insertion des Familles et Articles
  Basé sur le tableau général fourni
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
-- FAMILLE 1 : TRAVAUX DE TERRASSEMENT & VOIRIE
-- ============================================

PRINT 'FAM-001 : Travaux de Terrassement & Voirie...';

INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-001', 'Travaux de Terrassement & Voirie', 'Travaux de terrassement et réfection de voirie', 1);

DECLARE @IdFam001 INT = SCOPE_IDENTITY();

INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif)
VALUES 
    (@IdFam001, 'ART-0000001', 'Excavation de la tranchée manuel', 'M³', 1),
    (@IdFam001, 'ART-0000002', 'Remblement de la tranchée manuel', 'M³', 1),
    (@IdFam001, 'ART-0000003', 'Démolition de la chaussée goudronnée, dallée ou trottoir', 'M²', 1),
    (@IdFam001, 'ART-0000004', 'Décapage de la chaussée', 'M²', 1),
    (@IdFam001, 'ART-0000005', 'Enlèvement de la bordure de trottoir', 'ML', 1),
    (@IdFam001, 'ART-0000006', 'Excavation de la tranchée en terrain meuble exécutée mécaniquement', 'M³', 1),
    (@IdFam001, 'ART-0000007', 'Remblaiement de la chaussée en utilisant les terres récupérées de pierres y compris compactage par couches successives de 20 cm', 'M³', 1),
    (@IdFam001, 'ART-0000008', 'Évacuation des terres excédentaires à la décharge publique, y compris chargement et déchargement', 'M³', 1),
    (@IdFam001, 'ART-0000009', 'Fourniture et pose d''un lit de sable fin, d''une épaisseur de 10 cm', 'M²', 1),
    (@IdFam001, 'ART-0000010', 'Remise en état de la chaussée goudronnée et trottoir, y compris toutes suggestions', 'M²', 1),
    (@IdFam001, 'ART-0000011', 'Réfection de la chaussée en pavé', 'M²', 1),
    (@IdFam001, 'ART-0000012', 'Réfection de la chaussée dallée ou bétonnée, y compris toutes suggestions', 'M²', 1),
    (@IdFam001, 'ART-0000013', 'Remise en état des bordures de trottoir', 'ML', 1);

-- Prix POSE uniquement (sauf ART-0000009 qui a Fourniture Inclus + Pose)
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000001', 2500.00),
    ('ART-0000002', 1200.00),
    ('ART-0000003', 1600.00),
    ('ART-0000004', 1500.00),
    ('ART-0000005', 1000.00),
    ('ART-0000006', 3000.00),
    ('ART-0000007', 1200.00),
    ('ART-0000008', 800.00),
    ('ART-0000009', 2900.00),
    ('ART-0000010', 2800.00),
    ('ART-0000011', 1200.00),
    ('ART-0000012', 1700.00),
    ('ART-0000013', 600.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

PRINT '  ✓ 13 articles + 13 prix insérés';

-- ============================================
-- FAMILLE 2 : CANALISATIONS (TUBES PEHD)
-- ============================================

PRINT 'FAM-002 : Canalisations (Tubes PEHD)...';

INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-002', 'Canalisations (Tubes PEHD)', 'Tubes PEHD PN10 et PN16', 1);

DECLARE @IdFam002 INT = SCOPE_IDENTITY();

-- Articles Tubes PEHD PN10
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000014', 'Tubes PEHD PN10 Ø20', 'ML', '20', 'PEHD', 1),
    (@IdFam002, 'ART-0000015', 'Tubes PEHD PN10 Ø25', 'ML', '25', 'PEHD', 1),
    (@IdFam002, 'ART-0000016', 'Tubes PEHD PN10 Ø32', 'ML', '32', 'PEHD', 1),
    (@IdFam002, 'ART-0000017', 'Tubes PEHD PN10 Ø40', 'ML', '40', 'PEHD', 1),
    (@IdFam002, 'ART-0000018', 'Tubes PEHD PN10 Ø50', 'ML', '50', 'PEHD', 1),
    (@IdFam002, 'ART-0000019', 'Tubes PEHD PN10 Ø63', 'ML', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000020', 'Tubes PEHD PN10 Ø75', 'ML', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000021', 'Tubes PEHD PN10 Ø90', 'ML', '90', 'PEHD', 1),
    (@IdFam002, 'ART-0000022', 'Tubes PEHD PN10 Ø110', 'ML', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000023', 'Tubes PEHD PN10 Ø125', 'ML', '125', 'PEHD', 1),
    (@IdFam002, 'ART-0000024', 'Tubes PEHD PN10 Ø160', 'ML', '160', 'PEHD', 1);

-- Articles Tubes PEHD PN16
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam002, 'ART-0000025', 'Tubes PEHD PN16 Ø20', 'ML', '20', 'PEHD', 1),
    (@IdFam002, 'ART-0000026', 'Tubes PEHD PN16 Ø25', 'ML', '25', 'PEHD', 1),
    (@IdFam002, 'ART-0000027', 'Tubes PEHD PN16 Ø32', 'ML', '32', 'PEHD', 1),
    (@IdFam002, 'ART-0000028', 'Tubes PEHD PN16 Ø40', 'ML', '40', 'PEHD', 1),
    (@IdFam002, 'ART-0000029', 'Tubes PEHD PN16 Ø50', 'ML', '50', 'PEHD', 1),
    (@IdFam002, 'ART-0000030', 'Tubes PEHD PN16 Ø63', 'ML', '63', 'PEHD', 1),
    (@IdFam002, 'ART-0000031', 'Tubes PEHD PN16 Ø75', 'ML', '75', 'PEHD', 1),
    (@IdFam002, 'ART-0000032', 'Tubes PEHD PN16 Ø90', 'ML', '90', 'PEHD', 1),
    (@IdFam002, 'ART-0000033', 'Tubes PEHD PN16 Ø110', 'ML', '110', 'PEHD', 1),
    (@IdFam002, 'ART-0000034', 'Tubes PEHD PN16 Ø125', 'ML', '125', 'PEHD', 1),
    (@IdFam002, 'ART-0000035', 'Tubes PEHD PN16 Ø160', 'ML', '160', 'PEHD', 1);

-- Prix FOURNITURE pour Tubes PEHD PN10
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000014', 112.00),
    ('ART-0000015', 154.00),
    ('ART-0000016', 203.00),
    ('ART-0000017', 308.00),
    ('ART-0000018', 476.00),
    ('ART-0000019', 756.00),
    ('ART-0000020', 1064.00),
    ('ART-0000021', 1526.00),
    ('ART-0000022', 2240.00),
    ('ART-0000023', 2324.00),
    ('ART-0000024', 3808.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Tubes PEHD PN10
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000014', 48.00),
    ('ART-0000015', 66.00),
    ('ART-0000016', 87.00),
    ('ART-0000017', 132.00),
    ('ART-0000018', 204.00),
    ('ART-0000019', 324.00),
    ('ART-0000020', 456.00),
    ('ART-0000021', 654.00),
    ('ART-0000022', 960.00),
    ('ART-0000023', 996.00),
    ('ART-0000024', 1632.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Tubes PEHD PN16
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000025', 128.80),
    ('ART-0000026', 182.00),
    ('ART-0000027', 294.00),
    ('ART-0000028', 448.00),
    ('ART-0000029', 700.00),
    ('ART-0000030', 1120.00),
    ('ART-0000031', 1526.00),
    ('ART-0000032', 2240.00),
    ('ART-0000033', 3234.00),
    ('ART-0000034', 3500.00),
    ('ART-0000035', 5600.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Tubes PEHD PN16
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000025', 55.20),
    ('ART-0000026', 78.00),
    ('ART-0000027', 126.00),
    ('ART-0000028', 192.00),
    ('ART-0000029', 300.00),
    ('ART-0000030', 480.00),
    ('ART-0000031', 654.00),
    ('ART-0000032', 960.00),
    ('ART-0000033', 1386.00),
    ('ART-0000034', 1500.00),
    ('ART-0000035', 2400.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

PRINT '  ✓ 22 articles + 44 prix insérés';

-- ============================================
-- FAMILLE 3 : PIÈCES SPÉCIALES
-- ============================================

PRINT 'FAM-003 : Pièces Spéciales...';

INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-003', 'Pièces Spéciales', 'Colliers, Robinets, Raccords', 1);

DECLARE @IdFam003 INT = SCOPE_IDENTITY();

-- Articles Colliers de Prise PEHD
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000036', 'Collier de Prise PEHD Ø 32 3/4" (25)', 'U', '32', 'PEHD', 1),
    (@IdFam003, 'ART-0000037', 'Collier de Prise PEHD Ø 40 3/4" (25)', 'U', '40', 'PEHD', 1),
    (@IdFam003, 'ART-0000038', 'Collier de Prise PEHD Ø 50 3/4" (25)', 'U', '50', 'PEHD', 1),
    (@IdFam003, 'ART-0000039', 'Collier de Prise PEHD Ø 63 1.1/2" (50)', 'U', '63', 'PEHD', 1),
    (@IdFam003, 'ART-0000040', 'Collier de Prise PEHD Ø 63 3/4" (25)', 'U', '63', 'PEHD', 1),
    (@IdFam003, 'ART-0000041', 'Collier de Prise PEHD Ø 75 3/4" (25)', 'U', '75', 'PEHD', 1),
    (@IdFam003, 'ART-0000042', 'Collier de Prise PEHD Ø 75 1/2" (50)', 'U', '75', 'PEHD', 1),
    (@IdFam003, 'ART-0000043', 'Collier de Prise PEHD Ø 110 3/4" (25)', 'U', '110', 'PEHD', 1),
    (@IdFam003, 'ART-0000044', 'Collier de Prise PEHD Ø 110 2" (63)', 'U', '110', 'PEHD', 1),
    (@IdFam003, 'ART-0000045', 'Collier de Prise PEHD Ø 160 1.1/2 (50)', 'U', '160', 'PEHD', 1),
    (@IdFam003, 'ART-0000046', 'Collier de Prise PEHD Ø 160 3/4" (25)', 'U', '160', 'PEHD', 1);

-- Articles Colliers de Prise Acier
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000047', 'Collier de Prise Acier Ø 40/33', 'U', '40/33', 'Acier', 1),
    (@IdFam003, 'ART-0000048', 'Collier de Prise Acier Ø 50/33', 'U', '50/33', 'Acier', 1),
    (@IdFam003, 'ART-0000049', 'Collier de Prise Acier Ø 63/33', 'U', '63/33', 'Acier', 1),
    (@IdFam003, 'ART-0000050', 'Collier de Prise Acier Ø 80/33', 'U', '80/33', 'Acier', 1),
    (@IdFam003, 'ART-0000051', 'Collier de Prise Acier Ø 100/20', 'U', '100/20', 'Acier', 1),
    (@IdFam003, 'ART-0000052', 'Collier de Prise Acier Ø 100/33', 'U', '100/33', 'Acier', 1),
    (@IdFam003, 'ART-0000053', 'Collier de Prise Acier Ø 150/40', 'U', '150/40', 'Acier', 1);

-- Articles Robinets d'Arrêt Inviolable
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES 
    (@IdFam003, 'ART-0000054', 'Robinet d''Arrêt Inviolable Ø15/21', 'U', '15/21', 1),
    (@IdFam003, 'ART-0000055', 'Robinet d''Arrêt Inviolable Ø15/21 coudé', 'U', '15/21', 1),
    (@IdFam003, 'ART-0000056', 'Robinet d''Arrêt Inviolable Ø20/27 coudé', 'U', '20/27', 1),
    (@IdFam003, 'ART-0000057', 'Robinet d''Arrêt Inviolable Ø20/27', 'U', '20/27', 1);

-- Articles Robinets d'Arrêt Standard
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES 
    (@IdFam003, 'ART-0000058', 'Robinet d''Arrêt (Standard) Ø20/27', 'U', '20/27', 1),
    (@IdFam003, 'ART-0000059', 'Robinet d''Arrêt (Standard) Ø33/42', 'U', '33/42', 1),
    (@IdFam003, 'ART-0000060', 'Robinet d''Arrêt (Standard) Ø40/49', 'U', '40/49', 1),
    (@IdFam003, 'ART-0000061', 'Robinet d''Arrêt (Standard) Ø50/60', 'U', '50/60', 1);

-- Articles Raccords Filetés PEHD
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000062', 'Raccords Filetés PEHD (S/R) Fileté Ø20X1/2" (20)', 'U', '20', 'PEHD', 1),
    (@IdFam003, 'ART-0000063', 'Raccords Filetés PEHD (S/R) Fileté Ø25X3/4" (25)', 'U', '25', 'PEHD', 1),
    (@IdFam003, 'ART-0000064', 'Raccords Filetés PEHD (S/R) Fileté Ø32X1" (32)', 'U', '32', 'PEHD', 1),
    (@IdFam003, 'ART-0000065', 'Raccords Filetés PEHD (S/R) Fileté Ø40X1.1/4" (40)', 'U', '40', 'PEHD', 1),
    (@IdFam003, 'ART-0000066', 'Raccords Filetés PEHD (S/R) Fileté Ø50X1.1/2" (50)', 'U', '50', 'PEHD', 1),
    (@IdFam003, 'ART-0000067', 'Raccords Filetés PEHD (S/R) Fileté Ø63X2.1/2" (63)', 'U', '63', 'PEHD', 1),
    (@IdFam003, 'ART-0000068', 'Raccords Filetés PEHD (S/R) Fileté Ø75X2.1/2" (75)', 'U', '75', 'PEHD', 1),
    (@IdFam003, 'ART-0000069', 'Raccords Filetés PEHD (S/R) Fileté Ø90X3" (90)', 'U', '90', 'PEHD', 1),
    (@IdFam003, 'ART-0000070', 'Raccords Filetés PEHD (S/R) Fileté Ø110X4" (110)', 'U', '110', 'PEHD', 1);

-- Articles Raccords à Bride PEHD
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000071', 'Raccords à Bride PEHD (S/R) Ø 40', 'U', '40', 'PEHD', 1),
    (@IdFam003, 'ART-0000072', 'Raccords à Bride PEHD (S/R) Ø 50', 'U', '50', 'PEHD', 1),
    (@IdFam003, 'ART-0000073', 'Raccords à Bride PEHD (S/R) Ø 63', 'U', '63', 'PEHD', 1),
    (@IdFam003, 'ART-0000074', 'Raccords à Bride PEHD (S/R) Ø 75', 'U', '75', 'PEHD', 1),
    (@IdFam003, 'ART-0000075', 'Raccords à Bride PEHD (S/R) Ø 90', 'U', '90', 'PEHD', 1),
    (@IdFam003, 'ART-0000076', 'Raccords à Bride PEHD (S/R) Ø 110', 'U', '110', 'PEHD', 1),
    (@IdFam003, 'ART-0000077', 'Raccords à Bride PEHD (S/R) Ø 125', 'U', '125', 'PEHD', 1);

-- Articles Raccords en PP
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000078', 'Raccords en PP (F/P) F/P Raccord en PP Ø25', 'U', '25', 'PP', 1),
    (@IdFam003, 'ART-0000079', 'Raccords en PP (F/P) F/P Raccord en PP Ø 32', 'U', '32', 'PP', 1),
    (@IdFam003, 'ART-0000080', 'Raccords en PP (F/P) F/P Raccord en PP Ø 40', 'U', '40', 'PP', 1);

-- Articles Autres pièces
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Matiere, Actif)
VALUES 
    (@IdFam003, 'ART-0000081', 'Collier de prise selle Te PE (63-90-110)/25 mm', 'U', '25', 'PE', 1),
    (@IdFam003, 'ART-0000082', 'Robinet de prise en charge Ø 25', 'U', '25', NULL, 1),
    (@IdFam003, 'ART-0000083', 'Coudes 25', 'U', '25', NULL, 1),
    (@IdFam003, 'ART-0000084', 'Coudes 32', 'U', '32', NULL, 1),
    (@IdFam003, 'ART-0000085', 'Coudes 40', 'U', '40', NULL, 1);

-- Prix FOURNITURE pour Colliers de Prise PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000036', 196.00),
    ('ART-0000037', 224.00),
    ('ART-0000038', 294.00),
    ('ART-0000039', 343.00),
    ('ART-0000040', 406.00),
    ('ART-0000041', 560.00),
    ('ART-0000042', 448.00),
    ('ART-0000043', 770.00),
    ('ART-0000044', 910.00),
    ('ART-0000045', 1365.00),
    ('ART-0000046', 1344.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix POSE pour Colliers de Prise PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000036', 84.00),
    ('ART-0000037', 96.00),
    ('ART-0000038', 126.00),
    ('ART-0000039', 147.00),
    ('ART-0000040', 174.00),
    ('ART-0000041', 240.00),
    ('ART-0000042', 192.00),
    ('ART-0000043', 330.00),
    ('ART-0000044', 390.00),
    ('ART-0000045', 585.00),
    ('ART-0000046', 576.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;

-- Prix FOURNITURE pour Colliers de Prise Acier
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
    ('ART-0000047', 1029.00),
    ('ART-0000048', 1204.00),
    ('ART-0000049', 1470.00),
('ART-0000050', 1960.00),
('ART-0000051', 2380.00),
('ART-0000052', 2394.00),
('ART-0000053', 3080.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Colliers de Prise Acier
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000047', 431.00),
('ART-0000048', 516.00),
('ART-0000049', 630.00),
('ART-0000050', 840.00),
('ART-0000051', 1020.00),
('ART-0000052', 1026.00),
('ART-0000053', 1320.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Robinets d'Arrêt Inviolable
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000054', 2369.80),
('ART-0000055', 2553.60),
('ART-0000056', 2923.20),
('ART-0000057', 3141.60)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Robinets d'Arrêt Inviolable
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000054', 1014.20),
('ART-0000055', 1094.40),
('ART-0000056', 1252.80),
('ART-0000057', 1346.40)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Robinets d'Arrêt Standard
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000058', 620.80),
('ART-0000059', 977.80),
('ART-0000060', 1722.60),
('ART-0000061', 4936.40)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Robinets d'Arrêt Standard
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000058', 483.20),
('ART-0000059', 3276.20),
('ART-0000060', 3595.40),
('ART-0000061', 2115.60)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Raccords Filetés PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000062', 105.00),
('ART-0000063', 119.00),
('ART-0000064', 196.00),
('ART-0000065', 245.00),
('ART-0000066', 350.00),
('ART-0000067', 504.00),
('ART-0000068', 896.00),
('ART-0000069', 1190.00),
('ART-0000070', 2660.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Raccords Filetés PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000062', 45.00),
('ART-0000063', 51.00),
('ART-0000064', 84.00),
('ART-0000065', 105.00),
('ART-0000066', 150.00),
('ART-0000067', 216.00),
('ART-0000068', 384.00),
('ART-0000069', 510.00),
('ART-0000070', 1140.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Raccords à Bride PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000071', 1330.00),
('ART-0000072', 970.00),
('ART-0000073', 1580.00),
('ART-0000074', 1840.00),
('ART-0000075', 2660.00),
('ART-0000076', 3080.00),
('ART-0000077', 4060.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Raccords à Bride PEHD
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000071', 570.00),
('ART-0000072', 630.00),
('ART-0000073', 820.00),
('ART-0000074', 960.00),
('ART-0000075', 1140.00),
('ART-0000076', 1320.00),
('ART-0000077', 1740.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Raccords en PP
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000078', 168.00),
('ART-0000079', 196.00),
('ART-0000080', 224.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Raccords en PP
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000078', 72.00),
('ART-0000079', 84.00),
('ART-0000080', 96.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix FOURNITURE pour Autres pièces
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000081', 7140.00),
('ART-0000082', 2310.00),
('ART-0000083', 168.00),
('ART-0000084', 420.00),
('ART-0000085', 546.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Autres pièces
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000081', 3060.00),
('ART-0000082', 990.00),
('ART-0000083', 72.00),
('ART-0000084', 180.00),
('ART-0000085', 234.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 50 articles + 100 prix insérés';
-- ============================================
-- FAMILLE 4 : PIÈCES DIVERS
-- ============================================
PRINT 'FAM-004 : Pièces Divers...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-004', 'Pièces Divers', 'Pièces diverses et accessoires', 1);
DECLARE @IdFam004 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif)
VALUES
(@IdFam004, 'ART-0000086', 'Tabernacle (plaque d''assise)', 'U', 1),
(@IdFam004, 'ART-0000087', 'Bouche à clé & socle en béton', 'U', 1),
(@IdFam004, 'ART-0000088', 'Porte de niche PM', 'U', 1),
(@IdFam004, 'ART-0000089', 'Porte de niche GM', 'U', 1),
(@IdFam004, 'ART-0000090', 'Coffret de comptage A.E.P (P/01 compteur)', 'U', 1),
(@IdFam004, 'ART-0000091', 'Grillage avertisseur (maille de signalisation)', 'ML', 1);
-- Prix FOURNITURE pour Pièces Divers
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000086', 1540.00),
('ART-0000087', 2100.00),
('ART-0000088', 11200.00),
('ART-0000089', 1680.00),
('ART-0000090', 3010.00),
('ART-0000091', 105.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Pièces Divers
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000086', 660.00),
('ART-0000087', 900.00),
('ART-0000088', 4800.00),
('ART-0000089', 720.00),
('ART-0000090', 1290.00),
('ART-0000091', 45.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 6 articles + 12 prix insérés';
-- ============================================
-- FAMILLE 5 : COMPTAGE
-- ============================================
PRINT 'FAM-005 : Comptage...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-005', 'Comptage', 'Compteurs d''eau', 1);
DECLARE @IdFam005 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES
(@IdFam005, 'ART-0000092', 'Compteur dn 15 mm', 'U', '15', 1),
(@IdFam005, 'ART-0000093', 'Compteur dn 20 mm', 'U', '20', 1),
(@IdFam005, 'ART-0000094', 'Compteur dn 30 mm', 'U', '30', 1),
(@IdFam005, 'ART-0000095', 'Compteur dn 40 mm', 'U', '40', 1);
-- Prix FOURNITURE pour Comptage
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', PrixFourniture, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000092', 4450.00),
('ART-0000093', 5000.00),
('ART-0000094', 13000.00),
('ART-0000095', 19000.00)
) AS Prix(CodeArticle, PrixFourniture)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
-- Prix POSE pour Comptage
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'POSE', PrixPose, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000092', 2500.00),
('ART-0000093', 2500.00),
('ART-0000094', 7800.00),
('ART-0000095', 15000.00)
) AS Prix(CodeArticle, PrixPose)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 4 articles + 8 prix insérés';
-- ============================================
-- FAMILLE 6 : CAUTIONNEMENT
-- ============================================
PRINT 'FAM-006 : Cautionnement...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-006', 'Cautionnement', 'Cautionnement pour Branchement de Chantier', 1);
DECLARE @IdFam006 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES
(@IdFam006, 'ART-0000096', 'Cautionnement pour Branchement de Chantier Ø15', 'Montant', '15', 1),
(@IdFam006, 'ART-0000097', 'Cautionnement pour Branchement de Chantier Ø20', 'Montant', '20', 1),
(@IdFam006, 'ART-0000098', 'Cautionnement pour Branchement de Chantier Ø30', 'Montant', '30', 1),
(@IdFam006, 'ART-0000099', 'Cautionnement pour Branchement de Chantier Ø40', 'Montant', '40', 1);
-- Prix FOURNITURE (par défaut) pour Cautionnement
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', MontantCaution, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000096', 100000.00),
('ART-0000097', 200000.00),
('ART-0000098', 300000.00),
('ART-0000099', 400000.00)
) AS Prix(CodeArticle, MontantCaution)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 4 articles + 4 prix insérés';
-- ============================================
-- FAMILLE 7 : ÉTALONNAGE
-- ============================================
PRINT 'FAM-007 : Étalonnage...';
INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif)
VALUES ('FAM-007', 'Étalonnage', 'Vérification de compteur eau', 1);
DECLARE @IdFam007 INT = SCOPE_IDENTITY();
INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Diametre, Actif)
VALUES
(@IdFam007, 'ART-0000100', 'Vérification de compteur eau Ø 15 à 20', 'Montant', '15-20', 1),
(@IdFam007, 'ART-0000101', 'Vérification de compteur eau Ø 30 à 40', 'Montant', '30-40', 1),
(@IdFam007, 'ART-0000102', 'Vérification de compteur eau Ø 50 à 100', 'Montant', '50-100', 1);
-- Prix FOURNITURE (par défaut) pour Étalonnage
INSERT INTO ArticlePrixHistorique (IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif, IdUtilisateurCreation)
SELECT IdArticle, 'FOURNITURE', MontantVerification, @TauxTVA, CAST(GETDATE() AS DATE), 1, @IdUtilisateur
FROM (VALUES
('ART-0000100', 1500.00),
('ART-0000101', 2500.00),
('ART-0000102', 4000.00)
) AS Prix(CodeArticle, MontantVerification)
INNER JOIN Article a ON a.CodeArticle = Prix.CodeArticle;
PRINT '  ✓ 3 articles + 3 prix insérés';
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
PRINT '';
PRINT 'Total : 102 articles + 192 prix';
PRINT '';
SET NOCOUNT OFF;
GO