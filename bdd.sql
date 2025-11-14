-- ====================================================================
-- AquaConnect_DB - Script complet réécrit (Version 4.0)
-- - Table Role supprimée et fusionnée dans Utilisateur
-- - Création ordonnée des tables, contraintes et indexes
-- ====================================================================

/* 1) Créer la base si nécessaire */
IF DB_ID(N'AquaConnect_DB') IS NULL
BEGIN
    CREATE DATABASE AquaConnect_DB;
END;
GO

USE AquaConnect_DB;
GO

/**************************************************************
  2) Supprimer les contraintes FK et objets existants
**************************************************************/

DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += 'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + '].[' + OBJECT_NAME(parent_object_id)
            + '] DROP CONSTRAINT [' + name + '];' + CHAR(13)
FROM sys.foreign_keys;
IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO

/**************************************************************
  3) Supprimer les tables si elles existent
**************************************************************/

IF OBJECT_ID('dbo.OrdreExecutionHistorique', 'U') IS NOT NULL DROP TABLE dbo.OrdreExecutionHistorique;
IF OBJECT_ID('dbo.OrdreExecution', 'U') IS NOT NULL DROP TABLE dbo.OrdreExecution;
IF OBJECT_ID('dbo.OrdreExecutionStatut', 'U') IS NOT NULL DROP TABLE dbo.OrdreExecutionStatut;

IF OBJECT_ID('dbo.PaiementDevis', 'U') IS NOT NULL DROP TABLE dbo.PaiementDevis;
IF OBJECT_ID('dbo.ModePaiement', 'U') IS NOT NULL DROP TABLE dbo.ModePaiement;

IF OBJECT_ID('dbo.DevisArticle', 'U') IS NOT NULL DROP TABLE dbo.DevisArticle;
IF OBJECT_ID('dbo.Devis', 'U') IS NOT NULL DROP TABLE dbo.Devis;
IF OBJECT_ID('dbo.TypeDevis', 'U') IS NOT NULL DROP TABLE dbo.TypeDevis;

IF OBJECT_ID('dbo.ArticlePrixHistorique', 'U') IS NOT NULL DROP TABLE dbo.ArticlePrixHistorique;
IF OBJECT_ID('dbo.Article', 'U') IS NOT NULL DROP TABLE dbo.Article;
IF OBJECT_ID('dbo.ArticleFamille', 'U') IS NOT NULL DROP TABLE dbo.ArticleFamille;

IF OBJECT_ID('dbo.DemandeWorkflowHistorique', 'U') IS NOT NULL DROP TABLE dbo.DemandeWorkflowHistorique;
IF OBJECT_ID('dbo.DemandeTravaux', 'U') IS NOT NULL DROP TABLE dbo.DemandeTravaux;

IF OBJECT_ID('dbo.DemandeStatut', 'U') IS NOT NULL DROP TABLE dbo.DemandeStatut;
IF OBJECT_ID('dbo.DemandeType', 'U') IS NOT NULL DROP TABLE dbo.DemandeType;

IF OBJECT_ID('dbo.Utilisateur', 'U') IS NOT NULL DROP TABLE dbo.Utilisateur;

IF OBJECT_ID('dbo.Client', 'U') IS NOT NULL DROP TABLE dbo.Client;
IF OBJECT_ID('dbo.ClientType', 'U') IS NOT NULL DROP TABLE dbo.ClientType;

IF OBJECT_ID('dbo.AgenceCommerciale', 'U') IS NOT NULL DROP TABLE dbo.AgenceCommerciale;
IF OBJECT_ID('dbo.Centre', 'U') IS NOT NULL DROP TABLE dbo.Centre;
IF OBJECT_ID('dbo.Unite', 'U') IS NOT NULL DROP TABLE dbo.Unite;
GO

/**************************************************************
  4) Création des tables
**************************************************************/

-- 4.1 Unité
CREATE TABLE Unite (
    IdUnite INT IDENTITY(1,1) PRIMARY KEY,
    CodeUnite NVARCHAR(20) NOT NULL UNIQUE,
    NomUnite NVARCHAR(100) NOT NULL,
    Adresse NVARCHAR(200),
    Commune NVARCHAR(60),
    CodePostal NVARCHAR(6),
    TelephonePrincipal NVARCHAR(15),
    TelephoneSecondaire NVARCHAR(15),
    Fax NVARCHAR(15),
    Email NVARCHAR(100),
    SiteWeb NVARCHAR(100),
    NumeroIdentifiantFiscal NVARCHAR(50),
    NumeroIdentificationStatistique NVARCHAR(50),
    NumeroRegistreCommerce NVARCHAR(50),
    NomBanque NVARCHAR(100),
    NumerocompteBancaire NVARCHAR(50),
    NumeroComptePostal NVARCHAR(50),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME
);
GO

-- 4.2 Centre
CREATE TABLE Centre (
    IdCentre INT IDENTITY(1,1) PRIMARY KEY,
    IdUnite INT NOT NULL,
    CodeCentre NVARCHAR(20) NOT NULL UNIQUE,
    NomCentre NVARCHAR(100) NOT NULL,
    PrefixeCentre NVARCHAR(5) NOT NULL,
    Adresse NVARCHAR(200) NOT NULL,
    Commune NVARCHAR(60) NOT NULL,
    CodePostal NVARCHAR(10) NOT NULL,
    TelephonePrincipal NVARCHAR(15) NOT NULL,
    TelephoneSecondaire NVARCHAR(15) DEFAULT NULL,
    Fax NVARCHAR(15) DEFAULT NULL,
    Email NVARCHAR(100) DEFAULT NULL,
    NomBanque NVARCHAR(100) DEFAULT NULL,
    NumerocompteBancaire NVARCHAR(50) DEFAULT NULL,
    NumeroComptePostal NVARCHAR(50) DEFAULT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_Centre_Unite FOREIGN KEY (IdUnite) REFERENCES Unite(IdUnite)
);
GO

-- 4.3 AgenceCommerciale
CREATE TABLE AgenceCommerciale (
    IdAgence INT IDENTITY(1,1) PRIMARY KEY,
    IdCentre INT NOT NULL,
    CodeAgence NVARCHAR(20) NOT NULL UNIQUE,
    NomAgence NVARCHAR(100) NOT NULL,
    Adresse NVARCHAR(200),
    Commune NVARCHAR(60),
    CodePostal NVARCHAR(10),
    TelephonePrincipal NVARCHAR(15),
    TelephoneSecondaire NVARCHAR(15),
    Fax NVARCHAR(15),
    Email NVARCHAR(100),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_AgenceCommerciale_Centre FOREIGN KEY (IdCentre) REFERENCES Centre(IdCentre)
);
GO

-- 4.4 ClientType
CREATE TABLE ClientType (
    IdClientType INT IDENTITY(1,1) PRIMARY KEY,
    CodeType NVARCHAR(20) NOT NULL UNIQUE,
    LibelleType NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 4.5 Client
CREATE TABLE Client (
    IdClient INT IDENTITY(1,1) PRIMARY KEY,
    IdClientType INT NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100),
    AdresseResidence NVARCHAR(200) NOT NULL,
    CommuneResidence NVARCHAR(100) NOT NULL,
    CodePostalResidence NVARCHAR(10) NOT NULL,
    AdresseBranchement NVARCHAR(200) DEFAULT NULL,
    CommuneBranchement NVARCHAR(100) DEFAULT NULL,
    CodePostalBranchement NVARCHAR(10) DEFAULT NULL,
    TelephonePrincipal NVARCHAR(20) DEFAULT NULL,
    TelephoneSecondaire NVARCHAR(20) DEFAULT NULL,
    Fax NVARCHAR(20) DEFAULT NULL,
    Email NVARCHAR(100) DEFAULT NULL,
    TypeBranchement NVARCHAR(50),
    NumeroPieceIdentite NVARCHAR(50) DEFAULT NULL,
    PieceDelivrePar NVARCHAR(100) DEFAULT NULL,
    DateDelivrancePiece DATE DEFAULT NULL,
    StatutOccupation NVARCHAR(20) NOT NULL CHECK (StatutOccupation IN ('PROPRIETAIRE', 'LOCATAIRE', 'MANDATAIRE')),
    DiametreBranchement NVARCHAR(20) DEFAULT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_Client_ClientType FOREIGN KEY (IdClientType) REFERENCES ClientType(IdClientType)
);
GO

-- 4.6 Utilisateur (avec Role intégré)
CREATE TABLE Utilisateur (
    IdUtilisateur INT IDENTITY(1,1) PRIMARY KEY,
    Role NVARCHAR(100) NOT NULL CHECK (
        Role IN (
            'ADMINISTRATEUR',
            'CHEF_CENTRE',
            'CHEF_AGENCE_COMMERCIALE',
            'CHEF_SERVICE_JURIDIQUE',
            'CHEF_SECTION_RELATIONS_CLIENTELE',
            'CHEF_SERVICE_TECHNICO_COMMERCIAL',
            'UTILISATEUR_STANDARD'
        )
    ) DEFAULT 'UTILISATEUR_STANDARD',
    IdUnite INT NULL,
    IdCentre INT NULL,
    IdAgence INT NULL,
    Matricule NVARCHAR(50) NOT NULL UNIQUE,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Telephone NVARCHAR(10),
    MotDePasse NVARCHAR(255) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    DerniereConnexion DATETIME,
    CONSTRAINT FK_Utilisateur_Unite FOREIGN KEY (IdUnite) REFERENCES Unite(IdUnite),
    CONSTRAINT FK_Utilisateur_Centre FOREIGN KEY (IdCentre) REFERENCES Centre(IdCentre),
    CONSTRAINT FK_Utilisateur_AgenceCommerciale FOREIGN KEY (IdAgence) REFERENCES AgenceCommerciale(IdAgence)
);
GO

-- 4.7 DemandeType
CREATE TABLE DemandeType (
    IdDemandeType INT IDENTITY(1,1) PRIMARY KEY,
    CodeType NVARCHAR(50) NOT NULL UNIQUE,
    LibelleType NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    ValidationChefSectionRelationClienteleRequise BIT NOT NULL DEFAULT 0,
    ValidationJuridiqueRequise BIT NOT NULL DEFAULT 0,
    ValidationChefAgenceRequise BIT NOT NULL DEFAULT 0,
    ValidationChefCentreRequise BIT NOT NULL DEFAULT 0,
    ValidationOE_ChefSectionRelationClienteleRequise BIT NOT NULL DEFAULT 0,
    ValidationOE_ChefAgenceRequise BIT NOT NULL DEFAULT 0,
    ValidationOE_ChefCentreRequise BIT NOT NULL DEFAULT 0,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 4.8 DemandeStatut
CREATE TABLE DemandeStatut (
    IdStatut INT IDENTITY(1,1) PRIMARY KEY,
    CodeStatut NVARCHAR(50) NOT NULL UNIQUE,
    LibelleStatut NVARCHAR(100) NOT NULL,
    OrdreStatut INT NOT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 4.9 DemandeTravaux
CREATE TABLE DemandeTravaux (
    IdDemande INT IDENTITY(1,1) PRIMARY KEY,
    NumeroDemande NVARCHAR(50) NOT NULL UNIQUE,
    IdAgence INT NOT NULL,
    IdClient INT NOT NULL,
    IdDemandeType INT NOT NULL,
    IdStatut INT NOT NULL,
    IdUtilisateurCreation INT NOT NULL,
    DateDemande DATETIME NOT NULL DEFAULT GETDATE(),
    DateValidationChefSectionRelationClientele DATETIME NULL,
    IdUtilisateurValidationChefSectionRelationClientele INT NULL,
    DateValidationJuridique DATETIME NULL,
    IdUtilisateurValidationJuridique INT NULL,
    DateValidationChefAgence DATETIME NULL,
    IdUtilisateurValidationChefAgence INT NULL,
    DateValidationChefCentre DATETIME NULL,
    IdUtilisateurValidationChefCentre INT NULL,
    Commentaire NVARCHAR(MAX) DEFAULT NULL,
    DelaiPaiementJours INT DEFAULT 30,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_DemandeTravaux_AgenceCommerciale FOREIGN KEY (IdAgence) REFERENCES AgenceCommerciale(IdAgence),
    CONSTRAINT FK_DemandeTravaux_Client FOREIGN KEY (IdClient) REFERENCES Client(IdClient),
    CONSTRAINT FK_DemandeTravaux_DemandeType FOREIGN KEY (IdDemandeType) REFERENCES DemandeType(IdDemandeType),
    CONSTRAINT FK_DemandeTravaux_DemandeStatut FOREIGN KEY (IdStatut) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeTravaux_Utilisateur FOREIGN KEY (IdUtilisateurCreation) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_DemandeTravaux_UtilisateurValidChefSectionRC FOREIGN KEY (IdUtilisateurValidationChefSectionRelationClientele) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_DemandeTravaux_UtilisateurValidJuridique FOREIGN KEY (IdUtilisateurValidationJuridique) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_DemandeTravaux_UtilisateurValidChefAgence FOREIGN KEY (IdUtilisateurValidationChefAgence) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_DemandeTravaux_UtilisateurValidChefCentre FOREIGN KEY (IdUtilisateurValidationChefCentre) REFERENCES Utilisateur(IdUtilisateur)
);
GO

-- 4.10 DemandeWorkflowHistorique
CREATE TABLE DemandeWorkflowHistorique (
    IdHistorique INT IDENTITY(1,1) PRIMARY KEY,
    IdDemande INT NOT NULL,
    IdStatutPrecedent INT NULL,
    IdStatutNouveau INT NOT NULL,
    IdUtilisateur INT NOT NULL,
    DateAction DATETIME NOT NULL DEFAULT GETDATE(),
    Commentaire NVARCHAR(MAX),
    TypeAction NVARCHAR(50) NOT NULL CHECK (TypeAction IN ('CREATION', 'VALIDATION', 'REJET', 'MODIFICATION', 'CLOTURE')),
    CONSTRAINT FK_DemandeWorkflowHistorique_Demande FOREIGN KEY (IdDemande) REFERENCES DemandeTravaux(IdDemande),
    CONSTRAINT FK_DemandeWorkflowHistorique_StatutPrecedent FOREIGN KEY (IdStatutPrecedent) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeWorkflowHistorique_StatutNouveau FOREIGN KEY (IdStatutNouveau) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeWorkflowHistorique_Utilisateur FOREIGN KEY (IdUtilisateur) REFERENCES Utilisateur(IdUtilisateur)
);
GO

-- 4.11 ArticleFamille
CREATE TABLE ArticleFamille (
    IdFamille INT IDENTITY(1,1) PRIMARY KEY,
    CodeFamille NVARCHAR(20) NOT NULL UNIQUE,
    LibelleFamille NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 4.12 Article
CREATE TABLE Article (
    IdArticle INT IDENTITY(1,1) PRIMARY KEY,
    IdFamille INT NOT NULL,
    CodeArticle NVARCHAR(50) NOT NULL UNIQUE,
    Designation NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    Unite NVARCHAR(50) NOT NULL,
    Diametre NVARCHAR(50) NULL,
    Matiere NVARCHAR(50) NULL,
    Classe NVARCHAR(20) NULL,
    Pression NVARCHAR(20) NULL,
    Longueur DECIMAL(10,2) NULL,
    Largeur DECIMAL(10,2) NULL,
    Epaisseur DECIMAL(10,2) NULL,
    Couleur NVARCHAR(30) NULL,
    Caracteristiques NVARCHAR(500) NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_Article_ArticleFamille FOREIGN KEY (IdFamille) REFERENCES ArticleFamille(IdFamille)
);
GO

-- 4.13 ArticlePrixHistorique
CREATE TABLE ArticlePrixHistorique (
    IdPrixHistorique INT IDENTITY(1,1) PRIMARY KEY,
    IdArticle INT NOT NULL,
    PrixHT DECIMAL(18, 2) NOT NULL CHECK (PrixHT >= 0),
    TauxTVA DECIMAL(5, 2) NOT NULL CHECK (TauxTVA >= 0 AND TauxTVA <= 100),
    DateDebutApplication DATE NOT NULL,
    DateFinApplication DATE NULL,
    EstActif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    IdUtilisateurCreation INT NOT NULL,
    CONSTRAINT FK_ArticlePrixHistorique_Article FOREIGN KEY (IdArticle) REFERENCES Article(IdArticle),
    CONSTRAINT FK_ArticlePrixHistorique_Utilisateur FOREIGN KEY (IdUtilisateurCreation) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT CK_ArticlePrixHistorique_Dates CHECK (DateFinApplication IS NULL OR DateFinApplication >= DateDebutApplication)
);
GO

-- 4.14 TypeDevis
CREATE TABLE TypeDevis (
    IdTypeDevis INT IDENTITY(1,1) PRIMARY KEY,
    CodeTypeDevis NVARCHAR(20) NOT NULL UNIQUE,
    LibelleTypeDevis NVARCHAR(100) NOT NULL,
    ValidationChefServiceTechnicoCommercialRequise BIT NOT NULL DEFAULT 0,
    ValidationChefCentreRequise BIT NOT NULL DEFAULT 0,
    ValidationChefAgenceRequise BIT NOT NULL DEFAULT 0,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 4.15 Devis
CREATE TABLE Devis (
    IdDevis INT IDENTITY(1,1) PRIMARY KEY,
    NumeroDevis NVARCHAR(50) NOT NULL UNIQUE,
    IdDemande INT NOT NULL,
    IdTypeDevis INT NOT NULL,
    IdDevisParent INT NULL,
    IdUtilisateurCreation INT NOT NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateValidationChefServiceTechnicoCommercial DATETIME NULL,
    IdUtilisateurValidationChefServiceTechnicoCommercial INT NULL,
    DateValidationChefCentre DATETIME NULL,
    IdUtilisateurValidationChefCentre INT NULL,
    DateValidationChefAgence DATETIME NULL,
    IdUtilisateurValidationChefAgence INT NULL,
    MontantTotalHT DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalHT >= 0),
    MontantTotalTVA DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalTVA >= 0),
    MontantTotalTTC DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalTTC >= 0),
    EstValide BIT NOT NULL DEFAULT 0,
    EstComplementaire BIT NOT NULL DEFAULT 0,
    Commentaire NVARCHAR(MAX),
    DateModification DATETIME,
    CONSTRAINT FK_Devis_DemandeTravaux FOREIGN KEY (IdDemande) REFERENCES DemandeTravaux(IdDemande),
    CONSTRAINT FK_Devis_TypeDevis FOREIGN KEY (IdTypeDevis) REFERENCES TypeDevis(IdTypeDevis),
    CONSTRAINT FK_Devis_DevisParent FOREIGN KEY (IdDevisParent) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_Devis_UtilisateurCreation FOREIGN KEY (IdUtilisateurCreation) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_Devis_UtilisateurValidChefServiceTC FOREIGN KEY (IdUtilisateurValidationChefServiceTechnicoCommercial) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_Devis_UtilisateurValidChefCentre FOREIGN KEY (IdUtilisateurValidationChefCentre) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_Devis_UtilisateurValidChefAgence FOREIGN KEY (IdUtilisateurValidationChefAgence) REFERENCES Utilisateur(IdUtilisateur)
);
GO

-- 4.16 DevisArticle
CREATE TABLE DevisArticle (
    IdDevisArticle INT IDENTITY(1,1) PRIMARY KEY,
    IdDevis INT NOT NULL,
    IdArticle INT NOT NULL,
    Designation NVARCHAR(200) NOT NULL,
    Unite NVARCHAR(50) NOT NULL,
    Quantite DECIMAL(18, 3) NOT NULL CHECK (Quantite > 0),
    PrixUnitaireHT DECIMAL(18, 2) NOT NULL CHECK (PrixUnitaireHT >= 0),
    TauxTVAApplique DECIMAL(5, 2) NOT NULL CHECK (TauxTVAApplique >= 0 AND TauxTVAApplique <= 100),
    MontantHT AS (Quantite * PrixUnitaireHT) PERSISTED,
    MontantTVA AS (ROUND((Quantite * PrixUnitaireHT) * (TauxTVAApplique / 100.0), 2)) PERSISTED,
    MontantTTC AS (ROUND((Quantite * PrixUnitaireHT) * (1 + TauxTVAApplique / 100.0), 2)) PERSISTED,
    Remarque NVARCHAR(500),
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_DevisArticle_Devis FOREIGN KEY (IdDevis) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_DevisArticle_Article FOREIGN KEY (IdArticle) REFERENCES Article(IdArticle)
);
GO

-- 4.17 ModePaiement
CREATE TABLE ModePaiement (
    IdModePaiement INT IDENTITY(1,1) PRIMARY KEY,
    CodeMode NVARCHAR(20) NOT NULL UNIQUE,
    LibelleMode NVARCHAR(100) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1
);
GO

-- 4.18 PaiementDevis
CREATE TABLE PaiementDevis (
    IdPaiement INT IDENTITY(1,1) PRIMARY KEY,
    IdDevis INT NOT NULL,
    IdModePaiement INT NOT NULL,
    NumeroPaiement NVARCHAR(50) NOT NULL UNIQUE,
    MontantPaye DECIMAL(18, 2) NOT NULL CHECK (MontantPaye > 0),
    DatePaiement DATETIME NOT NULL,
    DateEcheance DATETIME NOT NULL,
    Reference NVARCHAR(100),
    Commentaire NVARCHAR(500),
    IdUtilisateurEnregistrement INT NOT NULL,
    DateEnregistrement DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_PaiementDevis_Devis FOREIGN KEY (IdDevis) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_PaiementDevis_ModePaiement FOREIGN KEY (IdModePaiement) REFERENCES ModePaiement(IdModePaiement),
    CONSTRAINT FK_PaiementDevis_Utilisateur FOREIGN KEY (IdUtilisateurEnregistrement) REFERENCES Utilisateur(IdUtilisateur)
);
GO

-- 4.19 OrdreExecutionStatut
CREATE TABLE OrdreExecutionStatut (
    IdOrdreStatut INT IDENTITY(1,1) PRIMARY KEY,
    CodeStatut NVARCHAR(50) NOT NULL UNIQUE,
    LibelleStatut NVARCHAR(100) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1
);
GO

-- 4.20 OrdreExecution
CREATE TABLE OrdreExecution (
    IdOrdre INT IDENTITY(1,1) PRIMARY KEY,
    NumeroOrdre NVARCHAR(50) NOT NULL UNIQUE,
    IdDemande INT NOT NULL,
    IdDevis INT NOT NULL,
    IdOrdreStatut INT NOT NULL,
    IdUtilisateurEmission INT NOT NULL,
    DateEmission DATETIME NOT NULL DEFAULT GETDATE(),
    DateValidationChefSectionRelationClientele DATETIME NULL,
    IdUtilisateurValidationChefSectionRelationClientele INT NULL,
    DateValidationChefAgence DATETIME NULL,
    IdUtilisateurValidationChefAgence INT NULL,
    DateValidationChefCentre DATETIME NULL,
    IdUtilisateurValidationChefCentre INT NULL,
    DateDebutExecution DATETIME NULL,
    DateFinExecution DATETIME NULL,
    Instructions NVARCHAR(MAX),
    Commentaire NVARCHAR(MAX),
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_OrdreExecution_DemandeTravaux FOREIGN KEY (IdDemande) REFERENCES DemandeTravaux(IdDemande),
    CONSTRAINT FK_OrdreExecution_Devis FOREIGN KEY (IdDevis) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_OrdreExecution_OrdreExecutionStatut FOREIGN KEY (IdOrdreStatut) REFERENCES OrdreExecutionStatut(IdOrdreStatut),
    CONSTRAINT FK_OrdreExecution_UtilisateurEmission FOREIGN KEY (IdUtilisateurEmission) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_OrdreExecution_UtilisateurValidChefSectionRC FOREIGN KEY (IdUtilisateurValidationChefSectionRelationClientele) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_OrdreExecution_UtilisateurValidChefAgence FOREIGN KEY (IdUtilisateurValidationChefAgence) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_OrdreExecution_UtilisateurValidChefCentre FOREIGN KEY (IdUtilisateurValidationChefCentre) REFERENCES Utilisateur(IdUtilisateur)
);
GO

-- 4.21 OrdreExecutionHistorique
CREATE TABLE OrdreExecutionHistorique (
    IdHistorique INT IDENTITY(1,1) PRIMARY KEY,
    IdOrdre INT NOT NULL,
    IdStatutPrecedent INT NULL,
    IdStatutNouveau INT NOT NULL,
    IdUtilisateur INT NOT NULL,
    DateAction DATETIME NOT NULL DEFAULT GETDATE(),
    Commentaire NVARCHAR(MAX),
    TypeAction NVARCHAR(50) NOT NULL CHECK (TypeAction IN ('EMISSION', 'VALIDATION', 'REJET', 'EXECUTION', 'ANNULATION')),
    CONSTRAINT FK_OrdreExecutionHistorique_Ordre FOREIGN KEY (IdOrdre) REFERENCES OrdreExecution(IdOrdre),
    CONSTRAINT FK_OrdreExecutionHistorique_StatutPrecedent FOREIGN KEY (IdStatutPrecedent) REFERENCES OrdreExecutionStatut(IdOrdreStatut),
    CONSTRAINT FK_OrdreExecutionHistorique_StatutNouveau FOREIGN KEY (IdStatutNouveau) REFERENCES OrdreExecutionStatut(IdOrdreStatut),
    CONSTRAINT FK_OrdreExecutionHistorique_Utilisateur FOREIGN KEY (IdUtilisateur) REFERENCES Utilisateur(IdUtilisateur)
);
GO

/**************************************************************
  5) Indexes
**************************************************************/

-- Index Unite
CREATE INDEX IX_Unite_CodeUnite ON Unite(CodeUnite);
CREATE INDEX IX_Unite_Actif ON Unite(Actif);

-- Index Centre
CREATE INDEX IX_Centre_Unite ON Centre(IdUnite);
CREATE INDEX IX_Centre_CodeCentre ON Centre(CodeCentre);
CREATE INDEX IX_Centre_Actif ON Centre(Actif);

-- Index AgenceCommerciale
CREATE INDEX IX_AgenceCommerciale_Centre ON AgenceCommerciale(IdCentre);
CREATE INDEX IX_AgenceCommerciale_CodeAgence ON AgenceCommerciale(CodeAgence);
CREATE INDEX IX_AgenceCommerciale_Actif ON AgenceCommerciale(Actif);

-- Index ClientType
CREATE INDEX IX_ClientType_CodeType ON ClientType(CodeType);
CREATE INDEX IX_ClientType_Actif ON ClientType(Actif);

-- Index Client
CREATE INDEX IX_Client_ClientType ON Client(IdClientType);
CREATE INDEX IX_Client_Nom ON Client(Nom, Prenom);
CREATE INDEX IX_Client_Telephone ON Client(TelephonePrincipal);
CREATE INDEX IX_Client_NumPiece ON Client(NumeroPieceIdentite);
CREATE INDEX IX_Client_Actif ON Client(Actif);

-- Index Utilisateur
CREATE INDEX IX_Utilisateur_Role ON Utilisateur(Role);
CREATE INDEX IX_Utilisateur_Unite ON Utilisateur(IdUnite);
CREATE INDEX IX_Utilisateur_Centre ON Utilisateur(IdCentre);
CREATE INDEX IX_Utilisateur_Agence ON Utilisateur(IdAgence);
CREATE INDEX IX_Utilisateur_Email ON Utilisateur(Email);
CREATE INDEX IX_Utilisateur_Matricule ON Utilisateur(Matricule);
CREATE INDEX IX_Utilisateur_Actif ON Utilisateur(Actif);

-- Index DemandeType
CREATE INDEX IX_DemandeType_CodeType ON DemandeType(CodeType);
CREATE INDEX IX_DemandeType_Actif ON DemandeType(Actif);

-- Index DemandeStatut
CREATE INDEX IX_DemandeStatut_CodeStatut ON DemandeStatut(CodeStatut);
CREATE INDEX IX_DemandeStatut_OrdreStatut ON DemandeStatut(OrdreStatut);
CREATE INDEX IX_DemandeStatut_Actif ON DemandeStatut(Actif);

-- Index DemandeTravaux
CREATE INDEX IX_DemandeTravaux_Agence ON DemandeTravaux(IdAgence);
CREATE INDEX IX_DemandeTravaux_Client ON DemandeTravaux(IdClient);
CREATE INDEX IX_DemandeTravaux_Type ON DemandeTravaux(IdDemandeType);
CREATE INDEX IX_DemandeTravaux_Statut ON DemandeTravaux(IdStatut);
CREATE INDEX IX_DemandeTravaux_Utilisateur ON DemandeTravaux(IdUtilisateurCreation);
CREATE INDEX IX_DemandeTravaux_DateDemande ON DemandeTravaux(DateDemande DESC);
CREATE INDEX IX_DemandeTravaux_NumeroDemande ON DemandeTravaux(NumeroDemande);
CREATE INDEX IX_DemandeTravaux_Actif ON DemandeTravaux(Actif);

-- Index DemandeWorkflowHistorique
CREATE INDEX IX_DemandeWorkflowHistorique_Demande ON DemandeWorkflowHistorique(IdDemande);
CREATE INDEX IX_DemandeWorkflowHistorique_StatutPrecedent ON DemandeWorkflowHistorique(IdStatutPrecedent);
CREATE INDEX IX_DemandeWorkflowHistorique_StatutNouveau ON DemandeWorkflowHistorique(IdStatutNouveau);
CREATE INDEX IX_DemandeWorkflowHistorique_Utilisateur ON DemandeWorkflowHistorique(IdUtilisateur);
CREATE INDEX IX_DemandeWorkflowHistorique_DateAction ON DemandeWorkflowHistorique(DateAction DESC);
CREATE INDEX IX_DemandeWorkflowHistorique_TypeAction ON DemandeWorkflowHistorique(TypeAction);

-- Index ArticleFamille
CREATE INDEX IX_ArticleFamille_CodeFamille ON ArticleFamille(CodeFamille);
CREATE INDEX IX_ArticleFamille_Actif ON ArticleFamille(Actif);

-- Index Article
CREATE INDEX IX_Article_Famille ON Article(IdFamille);
CREATE INDEX IX_Article_CodeArticle ON Article(CodeArticle);
CREATE INDEX IX_Article_Actif ON Article(Actif);
CREATE INDEX IX_Article_Unite ON Article(Unite);
CREATE INDEX IX_Article_Designation ON Article(Designation);

-- Index ArticlePrixHistorique
CREATE INDEX IX_ArticlePrixHistorique_Article ON ArticlePrixHistorique(IdArticle);
CREATE INDEX IX_ArticlePrixHistorique_Article_Actif ON ArticlePrixHistorique(IdArticle, EstActif, DateDebutApplication DESC);
CREATE INDEX IX_ArticlePrixHistorique_Dates ON ArticlePrixHistorique(DateDebutApplication, DateFinApplication);
CREATE INDEX IX_ArticlePrixHistorique_EstActif ON ArticlePrixHistorique(EstActif);
CREATE INDEX IX_ArticlePrixHistorique_Utilisateur ON ArticlePrixHistorique(IdUtilisateurCreation);

-- Index TypeDevis
CREATE INDEX IX_TypeDevis_CodeTypeDevis ON TypeDevis(CodeTypeDevis);
CREATE INDEX IX_TypeDevis_Actif ON TypeDevis(Actif);

-- Index Devis
CREATE INDEX IX_Devis_Demande ON Devis(IdDemande);
CREATE INDEX IX_Devis_TypeDevis ON Devis(IdTypeDevis);
CREATE INDEX IX_Devis_DevisParent ON Devis(IdDevisParent);
CREATE INDEX IX_Devis_UtilisateurCreation ON Devis(IdUtilisateurCreation);
CREATE INDEX IX_Devis_DateCreation ON Devis(DateCreation DESC);
CREATE INDEX IX_Devis_NumeroDevis ON Devis(NumeroDevis);
CREATE INDEX IX_Devis_EstValide ON Devis(EstValide);
CREATE INDEX IX_Devis_EstComplementaire ON Devis(EstComplementaire);

-- Index DevisArticle
CREATE INDEX IX_DevisArticle_Devis ON DevisArticle(IdDevis);
CREATE INDEX IX_DevisArticle_Article ON DevisArticle(IdArticle);

-- Index ModePaiement
CREATE INDEX IX_ModePaiement_CodeMode ON ModePaiement(CodeMode);
CREATE INDEX IX_ModePaiement_Actif ON ModePaiement(Actif);

-- Index PaiementDevis
CREATE INDEX IX_PaiementDevis_Devis ON PaiementDevis(IdDevis);
CREATE INDEX IX_PaiementDevis_ModePaiement ON PaiementDevis(IdModePaiement);
CREATE INDEX IX_PaiementDevis_DatePaiement ON PaiementDevis(DatePaiement DESC);
CREATE INDEX IX_PaiementDevis_DateEcheance ON PaiementDevis(DateEcheance);
CREATE INDEX IX_PaiementDevis_NumeroPaiement ON PaiementDevis(NumeroPaiement);
CREATE INDEX IX_PaiementDevis_Utilisateur ON PaiementDevis(IdUtilisateurEnregistrement);

-- Index OrdreExecutionStatut
CREATE INDEX IX_OrdreExecutionStatut_CodeStatut ON OrdreExecutionStatut(CodeStatut);
CREATE INDEX IX_OrdreExecutionStatut_Actif ON OrdreExecutionStatut(Actif);

-- Index OrdreExecution
CREATE INDEX IX_OrdreExecution_Demande ON OrdreExecution(IdDemande);
CREATE INDEX IX_OrdreExecution_Devis ON OrdreExecution(IdDevis);
CREATE INDEX IX_OrdreExecution_Statut ON OrdreExecution(IdOrdreStatut);
CREATE INDEX IX_OrdreExecution_UtilisateurEmission ON OrdreExecution(IdUtilisateurEmission);
CREATE INDEX IX_OrdreExecution_DateEmission ON OrdreExecution(DateEmission DESC);
CREATE INDEX IX_OrdreExecution_NumeroOrdre ON OrdreExecution(NumeroOrdre);
CREATE INDEX IX_OrdreExecution_DateDebutExecution ON OrdreExecution(DateDebutExecution);
CREATE INDEX IX_OrdreExecution_DateFinExecution ON OrdreExecution(DateFinExecution);

-- Index OrdreExecutionHistorique
CREATE INDEX IX_OrdreExecutionHistorique_Ordre ON OrdreExecutionHistorique(IdOrdre);
CREATE INDEX IX_OrdreExecutionHistorique_StatutPrecedent ON OrdreExecutionHistorique(IdStatutPrecedent);
CREATE INDEX IX_OrdreExecutionHistorique_StatutNouveau ON OrdreExecutionHistorique(IdStatutNouveau);
CREATE INDEX IX_OrdreExecutionHistorique_Utilisateur ON OrdreExecutionHistorique(IdUtilisateur);
CREATE INDEX IX_OrdreExecutionHistorique_DateAction ON OrdreExecutionHistorique(DateAction DESC);
CREATE INDEX IX_OrdreExecutionHistorique_TypeAction ON OrdreExecutionHistorique(TypeAction);
GO

PRINT '========================================';
PRINT 'AquaConnect_DB v4.0 - Création terminée';
PRINT '========================================';
PRINT 'Tables créées : 21';
PRINT 'Table Role supprimée et fusionnée dans Utilisateur';
PRINT 'Contraintes FK : Toutes créées';
PRINT 'Index : Tous créés';
PRINT '========================================'