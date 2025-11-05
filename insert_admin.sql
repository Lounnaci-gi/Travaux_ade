-- ============================================================================
-- Script d'insertion d'un utilisateur administrateur
-- AquaConnect - Système de Gestion des Branchements
-- ============================================================================

USE AquaConnect_DB;
GO

-- ============================================================================
-- 1. CRÉATION DU RÔLE ADMINISTRATEUR (si n'existe pas)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM Role WHERE CodeRole = 'ADMIN')
BEGIN
    INSERT INTO Role (CodeRole, LibelleRole, Description, Actif)
    VALUES ('ADMIN', 'Administrateur', 'Administrateur système avec tous les droits', 1);
    PRINT '✅ Rôle Administrateur créé';
END
ELSE
BEGIN
    PRINT 'ℹ️  Rôle Administrateur existe déjà';
END
GO

-- ============================================================================
-- 2. CRÉATION DE L'UTILISATEUR ADMINISTRATEUR
-- ============================================================================

-- Vérifier si l'utilisateur existe déjà
IF NOT EXISTS (SELECT * FROM Utilisateur WHERE Email = 'admin@aquaconnect.local' OR Matricule = 'ADMIN001')
BEGIN
    DECLARE @IdRoleAdmin INT;
    SELECT @IdRoleAdmin = IdRole FROM Role WHERE CodeRole = 'ADMIN';
    
    INSERT INTO Utilisateur (
        IdRole,
        Matricule,
        Nom,
        Prenom,
        Email,
        Telephone,
        MotDePasse,
        Actif,
        DateCreation
    )
    VALUES (
        @IdRoleAdmin,
        'ADMIN001',
        'Administrateur',
        'Système',
        'admin',
        '+221 XX XXX XX XX',
        'admin123',  -- Mot de passe par défaut (À CHANGER en production!)
        1,
        GETDATE()
    );
    
    PRINT '✅ Utilisateur Administrateur créé avec succès!';
    PRINT '📧 Email: admin';
    PRINT '🔑 Matricule: ADMIN001';
    PRINT '🔒 Mot de passe: admin123';
    PRINT '';
    PRINT '⚠️  IMPORTANT: Changez le mot de passe après la première connexion!';
END
ELSE
BEGIN
    PRINT 'ℹ️  Utilisateur Administrateur existe déjà';
    PRINT '📧 Email: admin@aquaconnect.local';
    PRINT '🔑 Matricule: ADMIN001';
END
GO

-- ============================================================================
-- 3. VÉRIFICATION
-- ============================================================================

SELECT 
    u.IdUtilisateur,
    u.Matricule,
    u.Nom + ' ' + u.Prenom as NomComplet,
    u.Email,
    u.Telephone,
    r.LibelleRole as Role,
    r.CodeRole,
    u.Actif,
    u.DateCreation,
    u.DerniereConnexion
FROM Utilisateur u
INNER JOIN Role r ON u.IdRole = r.IdRole
WHERE u.Email = 'admin@aquaconnect.local' OR u.Matricule = 'ADMIN001';
GO

PRINT '============================================================================';
PRINT 'Utilisateur Administrateur prêt à être utilisé!';
PRINT '============================================================================';
GO



