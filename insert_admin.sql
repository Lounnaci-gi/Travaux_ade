-- ============================================================================
-- Script d'insertion d'un utilisateur administrateur
-- AquaConnect - Système de Gestion des Branchements (Version 4.0)
-- Note: Table Role supprimée, rôle intégré directement dans Utilisateur
-- ============================================================================
USE AquaConnect_DB;
GO

-- ============================================================================
-- CRÉATION DE L'UTILISATEUR ADMINISTRATEUR
-- ============================================================================

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
        'admin123',                 -- Mot de passe par défaut (À CHANGER en production!)
        NULL,                       -- Pas d'unité spécifique (accès global)
        NULL,                       -- Pas de centre spécifique
        NULL,                       -- Pas d'agence spécifique
        1,                          -- Actif
        GETDATE()                   -- Date création
    );
    
    PRINT '============================================================================';
    PRINT '✅ Utilisateur Administrateur créé avec succès!';
    PRINT '============================================================================';
    PRINT '📧 Email      : admin';
    PRINT '🔑 Matricule  : UTI-0001';
    PRINT '🔒 Mot de passe : admin123';
    PRINT '👤 Rôle       : ADMINISTRATEUR';
    PRINT '📱 Téléphone  : 0665847684';
    PRINT '';
    PRINT '⚠️  IMPORTANT: Changez le mot de passe après la première connexion!';
    PRINT '============================================================================';
END
ELSE
BEGIN
    PRINT '============================================================================';
    PRINT 'ℹ️  Utilisateur Administrateur existe déjà';
    PRINT '============================================================================';
    PRINT '📧 Email      : admin';
    PRINT '🔑 Matricule  : UTI-0001';
    PRINT '============================================================================';
END
GO

-- ============================================================================
-- VÉRIFICATION - Affichage de l'utilisateur créé
-- ============================================================================
PRINT '';
PRINT '============================================================================';
PRINT 'VÉRIFICATION - Informations de l''utilisateur Administrateur';
PRINT '============================================================================';

SELECT 
    u.IdUtilisateur,
    u.Matricule,
    u.Nom + ' ' + u.Prenom as NomComplet,
    u.Email,
    u.Telephone,
    u.Role,
    -- Libellé lisible du rôle
    CASE u.Role
        WHEN 'ADMINISTRATEUR' THEN 'Administrateur Système'
        WHEN 'CHEF_CENTRE' THEN 'Chef de Centre'
        WHEN 'CHEF_AGENCE_COMMERCIALE' THEN 'Chef d''Agence Commerciale'
        WHEN 'CHEF_SERVICE_JURIDIQUE' THEN 'Chef de Service Juridique'
        WHEN 'CHEF_SECTION_RELATIONS_CLIENTELE' THEN 'Chef de Section Relations Clientèle'
        WHEN 'CHEF_SERVICE_TECHNICO_COMMERCIAL' THEN 'Chef de Service Technico-Commercial'
        WHEN 'UTILISATEUR_STANDARD' THEN 'Utilisateur Standard'
    END AS LibelleRole,
    u.IdUnite,
    u.IdCentre,
    u.IdAgence,
    u.Actif,
    u.DateCreation,
    u.DateModification,
    u.DerniereConnexion
FROM Utilisateur u
WHERE u.Email = 'admin' OR u.Matricule = 'UTI-0001';
GO

PRINT '';
PRINT '============================================================================';
PRINT '✅ Utilisateur Administrateur prêt à être utilisé!';
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