-- ============================================================================
-- Script SQL Server - Système de Gestion des Branchements AquaConnect
-- Version 2.0 - Avec gestion des variantes d'articles et informations bancaires
-- ============================================================================

IF DB_ID(N'AquaConnect_DB') IS NULL
BEGIN
    CREATE DATABASE AquaConnect_DB;
END;
GO

USE AquaConnect_DB;
GO

/*******************************************************
  SUPPRESSION DES OBJETS EXISTANTS DANS L'ORDRE CORRECT
*******************************************************/

-- 1. Vues
IF OBJECT_ID('dbo.V_ArticleDetaille', 'V') IS NOT NULL DROP VIEW dbo.V_ArticleDetaille;

-- 2. Fonctions
IF OBJECT_ID('dbo.fn_GenererCodeArticle', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_GenererCodeArticle;

-- 3. Tables dépendantes de 3e ou 4e niveau (Historiques, Articles de devis)
IF OBJECT_ID('dbo.PaiementDevis') IS NOT NULL DROP TABLE dbo.PaiementDevis;
IF OBJECT_ID('dbo.OrdreExecutionHistorique') IS NOT NULL DROP TABLE dbo.OrdreExecutionHistorique;
IF OBJECT_ID('dbo.DemandeWorkflowHistorique') IS NOT NULL DROP TABLE dbo.DemandeWorkflowHistorique;
IF OBJECT_ID('dbo.DevisArticle') IS NOT NULL DROP TABLE dbo.DevisArticle;
IF OBJECT_ID('dbo.ArticlePrixHistorique') IS NOT NULL DROP TABLE dbo.ArticlePrixHistorique;

-- 4. Tables dépendantes de 2e niveau (Ordres, Devis, Demandes)
IF OBJECT_ID('dbo.OrdreExecution') IS NOT NULL DROP TABLE dbo.OrdreExecution;
IF OBJECT_ID('dbo.Devis') IS NOT NULL DROP TABLE dbo.Devis;
IF OBJECT_ID('dbo.DemandeBranchement') IS NOT NULL DROP TABLE dbo.DemandeBranchement;
IF OBJECT_ID('dbo.Client') IS NOT NULL DROP TABLE dbo.Client;
IF OBJECT_ID('dbo.Utilisateur') IS NOT NULL DROP TABLE dbo.Utilisateur;
IF OBJECT_ID('dbo.Article') IS NOT NULL DROP TABLE dbo.Article;

-- 5. Tables dépendantes de 1er niveau
IF OBJECT_ID('dbo.AgenceCommerciale') IS NOT NULL DROP TABLE dbo.AgenceCommerciale;
IF OBJECT_ID('dbo.Centre') IS NOT NULL DROP TABLE dbo.Centre;
IF OBJECT_ID('dbo.Unite') IS NOT NULL DROP TABLE dbo.Unite;
IF OBJECT_ID('dbo.Role') IS NOT NULL DROP TABLE dbo.Role;
IF OBJECT_ID('dbo.ClientType') IS NOT NULL DROP TABLE dbo.ClientType;
IF OBJECT_ID('dbo.DemandeType') IS NOT NULL DROP TABLE dbo.DemandeType;
IF OBJECT_ID('dbo.DemandeStatut') IS NOT NULL DROP TABLE dbo.DemandeStatut;
IF OBJECT_ID('dbo.ArticleFamille') IS NOT NULL DROP TABLE dbo.ArticleFamille;
IF OBJECT_ID('dbo.ModePaiement') IS NOT NULL DROP TABLE dbo.ModePaiement;
IF OBJECT_ID('dbo.OrdreExecutionStatut') IS NOT NULL DROP TABLE dbo.OrdreExecutionStatut;
IF OBJECT_ID('dbo.TypeDevis') IS NOT NULL DROP TABLE dbo.TypeDevis;

GO

-- ============================================================================
-- 1. HIÉRARCHIE GÉOGRAPHIQUE
-- ============================================================================

CREATE TABLE Unite (
    IdUnite INT IDENTITY(1,1) PRIMARY KEY,
    CodeUnite NVARCHAR(20) NOT NULL UNIQUE,
    NomUnite NVARCHAR(100) NOT NULL,
    Adresse NVARCHAR(200),
    Commune NVARCHAR(60),
    CodePostal NVARCHAR(6),  
    TelephonePrincipal NVARCHAR(10),
    TelephoneSecondaire NVARCHAR(10),    
    Fax NVARCHAR(10),
    Email NVARCHAR(100),
    SiteWeb NVARCHAR(100),
    NumeroIdentifiantFiscal NVARCHAR(18),
    NumeroIdentificationStatistique NVARCHAR(15),
    NumeroRegistreCommerce NVARCHAR(15),
    NomBanque NVARCHAR(100),
    NumerocompteBancaire NVARCHAR(20),
    NumeroComptePostal NVARCHAR(11),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME
);

CREATE TABLE Centre (
    IdCentre INT IDENTITY(1,1) PRIMARY KEY,
    IdUnite INT NOT NULL,
    CodeCentre NVARCHAR(20) NOT NULL UNIQUE,
    NomCentre NVARCHAR(100) NOT NULL,
    PrefixeCentre NVARCHAR(5) NOT NULL,
    Adresse NVARCHAR(200) NOT NULL,
    Commune NVARCHAR(60) NOT NULL,
    CodePostal NVARCHAR(5) NOT NULL,
    TelephonePrincipal NVARCHAR(10) NOT NULL,
    TelephoneSecondaire NVARCHAR(10) DEFAULT NULL,
    Fax NVARCHAR(10) DEFAULT NULL,   
    Email NVARCHAR(100) DEFAULT NULL,
    NomBanque NVARCHAR(100) DEFAULT NULL,
    NumerocompteBancaire NVARCHAR(20) DEFAULT NULL,
    NumeroComptePostal NVARCHAR(20) DEFAULT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_Centre_Unite FOREIGN KEY (IdUnite) REFERENCES Unite(IdUnite)
);

CREATE TABLE AgenceCommerciale (
    IdAgence INT IDENTITY(1,1) PRIMARY KEY,
    IdCentre INT NOT NULL,
    CodeAgence NVARCHAR(20) NOT NULL UNIQUE,
    NomAgence NVARCHAR(100) NOT NULL,
    Adresse NVARCHAR(200),
    Commune NVARCHAR(60),
    CodePostal NVARCHAR(5),
    TelephonePrincipal NVARCHAR(10),
    TelephoneSecondaire NVARCHAR(10),
    Fax NVARCHAR(10),
    Email NVARCHAR(100),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_AgenceCommerciale_Centre FOREIGN KEY (IdCentre) REFERENCES Centre(IdCentre)
);

-- ============================================================================
-- 2. TYPES DE CLIENTS
-- ============================================================================

CREATE TABLE ClientType (
    IdClientType INT IDENTITY(1,1) PRIMARY KEY,
    CodeType NVARCHAR(20) NOT NULL UNIQUE,
    LibelleType NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);

-- ============================================================================
-- 3. CLIENTS
-- ============================================================================

CREATE TABLE Client (
    IdClient INT IDENTITY(1,1) PRIMARY KEY,
    IdClientType INT NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100),
    AdresseResidence NVARCHAR(200) NOT NULL,
    CommuneResidence NVARCHAR(100) NOT NULL,
    CodePostalResidence NVARCHAR(5) NOT NULL,
    AdresseBranchement NVARCHAR(200) DEFAULT NULL,
    CommuneBranchement NVARCHAR(100) DEFAULT NULL,
    CodePostalBranchement NVARCHAR(5) DEFAULT NULL,
    TelephonePrincipal NVARCHAR(10) DEFAULT NULL,
    TelephoneSecondaire NVARCHAR(10) DEFAULT NULL,
    Fax NVARCHAR(10) DEFAULT NULL,
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

-- ============================================================================
-- 4. UTILISATEURS ET RÔLES
-- ============================================================================

CREATE TABLE Role (
    IdRole INT IDENTITY(1,1) PRIMARY KEY,
    CodeRole NVARCHAR(50) NOT NULL UNIQUE,
    LibelleRole NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Utilisateur (
    IdUtilisateur INT IDENTITY(1,1) PRIMARY KEY,
    IdRole INT NOT NULL,
    IdUnite INT NULL,
    IdCentre INT NULL,
    IdAgence INT NULL,
    Matricule NVARCHAR(20) NOT NULL UNIQUE,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Telephone NVARCHAR(20),
    MotDePasse NVARCHAR(255) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    DerniereConnexion DATETIME,
    CONSTRAINT FK_Utilisateur_Role FOREIGN KEY (IdRole) REFERENCES Role(IdRole),
    CONSTRAINT FK_Utilisateur_Unite FOREIGN KEY (IdUnite) REFERENCES Unite(IdUnite),
    CONSTRAINT FK_Utilisateur_Centre FOREIGN KEY (IdCentre) REFERENCES Centre(IdCentre),
    CONSTRAINT FK_Utilisateur_AgenceCommerciale FOREIGN KEY (IdAgence) REFERENCES AgenceCommerciale(IdAgence)
);

-- ============================================================================
-- 5. TYPES DE DEMANDES ET STATUTS
-- ============================================================================

CREATE TABLE DemandeType (
    IdDemandeType INT IDENTITY(1,1) PRIMARY KEY,
    CodeType NVARCHAR(50) NOT NULL UNIQUE,
    LibelleType NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    ValidationJuridiqueRequise BIT NOT NULL DEFAULT 0,
    ValidationChefAgenceRequise BIT NOT NULL DEFAULT 0,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE DemandeStatut (
    IdStatut INT IDENTITY(1,1) PRIMARY KEY,
    CodeStatut NVARCHAR(50) NOT NULL UNIQUE,
    LibelleStatut NVARCHAR(100) NOT NULL,
    OrdreStatut INT NOT NULL,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);

-- ============================================================================
-- 6. DEMANDES
-- ============================================================================

CREATE TABLE DemandeBranchement (
    IdDemande INT IDENTITY(1,1) PRIMARY KEY,
    NumeroDemande NVARCHAR(50) NOT NULL UNIQUE,
    IdAgence INT NOT NULL,
    IdClient INT NOT NULL,
    IdDemandeType INT NOT NULL,
    IdStatut INT NOT NULL,
    IdUtilisateurCreation INT NOT NULL,
    DateDemande DATETIME NOT NULL DEFAULT GETDATE(),
    DateValidationJuridique DATETIME NULL,
    DateValidationChefAgence DATETIME NULL,
    Commentaire NVARCHAR(MAX) DEFAULT NULL,
    DelaiPaiementJours INT DEFAULT 30,
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_DemandeBranchement_AgenceCommerciale FOREIGN KEY (IdAgence) REFERENCES AgenceCommerciale(IdAgence),
    CONSTRAINT FK_DemandeBranchement_Client FOREIGN KEY (IdClient) REFERENCES Client(IdClient),
    CONSTRAINT FK_DemandeBranchement_DemandeType FOREIGN KEY (IdDemandeType) REFERENCES DemandeType(IdDemandeType),
    CONSTRAINT FK_DemandeBranchement_DemandeStatut FOREIGN KEY (IdStatut) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeBranchement_Utilisateur FOREIGN KEY (IdUtilisateurCreation) REFERENCES Utilisateur(IdUtilisateur)
);

-- ============================================================================
-- 7. HISTORIQUE DES VALIDATIONS
-- ============================================================================

CREATE TABLE DemandeWorkflowHistorique (
    IdHistorique INT IDENTITY(1,1) PRIMARY KEY,
    IdDemande INT NOT NULL,
    IdStatutPrecedent INT NULL,
    IdStatutNouveau INT NOT NULL,
    IdUtilisateur INT NOT NULL,
    DateAction DATETIME NOT NULL DEFAULT GETDATE(),
    Commentaire NVARCHAR(MAX),
    TypeAction NVARCHAR(50) NOT NULL CHECK (TypeAction IN ('CREATION', 'VALIDATION', 'REJET', 'MODIFICATION', 'CLOTURE')),
    CONSTRAINT FK_DemandeWorkflowHistorique_Demande FOREIGN KEY (IdDemande) REFERENCES DemandeBranchement(IdDemande),
    CONSTRAINT FK_DemandeWorkflowHistorique_StatutPrecedent FOREIGN KEY (IdStatutPrecedent) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeWorkflowHistorique_StatutNouveau FOREIGN KEY (IdStatutNouveau) REFERENCES DemandeStatut(IdStatut),
    CONSTRAINT FK_DemandeWorkflowHistorique_Utilisateur FOREIGN KEY (IdUtilisateur) REFERENCES Utilisateur(IdUtilisateur)
);

-- ============================================================================
-- 8. ARTICLES ET FAMILLES (AVEC VARIANTES)
-- ============================================================================

CREATE TABLE ArticleFamille (
    IdFamille INT IDENTITY(1,1) PRIMARY KEY,
    CodeFamille NVARCHAR(20) NOT NULL UNIQUE,
    LibelleFamille NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE Article (
    IdArticle INT IDENTITY(1,1) PRIMARY KEY,
    IdFamille INT NOT NULL,
    CodeArticle NVARCHAR(50) NOT NULL UNIQUE,
    Designation NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    Unite NVARCHAR(50) NOT NULL, -- Ex: Pièce, Mètre linéaire (ML), Mètre cube (M3), Unité (U), Forfait, Heure, Jour, etc.
    
    -- NOUVELLES COLONNES POUR LES VARIANTES (NULL si non applicable)
    Diametre NVARCHAR(20) NULL,           -- Ex: 40mm, 63mm, DN50
    Matiere NVARCHAR(50) NULL,            -- Ex: PVC, PEHD, Fonte, Laiton, Béton
    Classe NVARCHAR(20) NULL,             -- Ex: C6, C10, PN10, PN16, Classe B
    Pression NVARCHAR(20) NULL,           -- Ex: PN10, PN16
    Longueur DECIMAL(10,2) NULL,          -- En cm ou m
    Largeur DECIMAL(10,2) NULL,           -- En cm
    Epaisseur DECIMAL(10,2) NULL,         -- En mm ou cm
    Couleur NVARCHAR(30) NULL,            -- Ex: Bleu, Vert, Rouge
    Caracteristiques NVARCHAR(500) NULL,  -- Infos complémentaires texte libre
    
    Actif BIT NOT NULL DEFAULT 1,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateModification DATETIME,
    CONSTRAINT FK_Article_ArticleFamille FOREIGN KEY (IdFamille) REFERENCES ArticleFamille(IdFamille)
);

-- ============================================================================
-- 9. HISTORIQUE DES PRIX ET TVA
-- ============================================================================

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

-- ============================================================================
-- 10. DEVIS
-- ============================================================================

CREATE TABLE TypeDevis (
    IdTypeDevis INT IDENTITY(1,1) PRIMARY KEY,
    CodeTypeDevis NVARCHAR(20) NOT NULL UNIQUE,
    LibelleTypeDevis NVARCHAR(100) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1
);

CREATE TABLE Devis (
    IdDevis INT IDENTITY(1,1) PRIMARY KEY,
    NumeroDevis NVARCHAR(50) NOT NULL UNIQUE,
    IdDemande INT NOT NULL,
    IdTypeDevis INT NOT NULL,
    IdDevisParent INT NULL,
    IdUtilisateurCreation INT NOT NULL,
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    DateValidation DATETIME NULL,
    IdUtilisateurValidation INT NULL,
    MontantTotalHT DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalHT >= 0),
    MontantTotalTVA DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalTVA >= 0),
    MontantTotalTTC DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (MontantTotalTTC >= 0),
    EstValide BIT NOT NULL DEFAULT 0,
    EstComplementaire BIT NOT NULL DEFAULT 0,
    Commentaire NVARCHAR(MAX),
    DateModification DATETIME,
    CONSTRAINT FK_Devis_DemandeBranchement FOREIGN KEY (IdDemande) REFERENCES DemandeBranchement(IdDemande),
    CONSTRAINT FK_Devis_TypeDevis FOREIGN KEY (IdTypeDevis) REFERENCES TypeDevis(IdTypeDevis),
    CONSTRAINT FK_Devis_DevisParent FOREIGN KEY (IdDevisParent) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_Devis_UtilisateurCreation FOREIGN KEY (IdUtilisateurCreation) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_Devis_UtilisateurValidation FOREIGN KEY (IdUtilisateurValidation) REFERENCES Utilisateur(IdUtilisateur)
);

CREATE TABLE DevisArticle (
    IdDevisArticle INT IDENTITY(1,1) PRIMARY KEY,
    IdDevis INT NOT NULL,
    IdArticle INT NOT NULL,
    Designation NVARCHAR(200) NOT NULL, -- Copie de la désignation au moment du devis
    Unite NVARCHAR(50) NOT NULL, -- Copie de l'unité au moment du devis (Pièce, ML, M3, U, etc.)
    Quantite DECIMAL(18, 3) NOT NULL CHECK (Quantite > 0), -- Ex: 2 (pièces), 3.5 (ML), 5.25 (M3)
    PrixUnitaireHT DECIMAL(18, 2) NOT NULL CHECK (PrixUnitaireHT >= 0),
    TauxTVAApplique DECIMAL(5, 2) NOT NULL CHECK (TauxTVAApplique >= 0 AND TauxTVAApplique <= 100),
    MontantHT DECIMAL(18, 2) NOT NULL CHECK (MontantHT >= 0),
    MontantTVA DECIMAL(18, 2) NOT NULL CHECK (MontantTVA >= 0),
    MontantTTC DECIMAL(18, 2) NOT NULL CHECK (MontantTTC >= 0),
    Remarque NVARCHAR(500),
    DateCreation DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_DevisArticle_Devis FOREIGN KEY (IdDevis) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_DevisArticle_Article FOREIGN KEY (IdArticle) REFERENCES Article(IdArticle)
);

-- ============================================================================
-- 11. PAIEMENT
-- ============================================================================

CREATE TABLE ModePaiement (
    IdModePaiement INT IDENTITY(1,1) PRIMARY KEY,
    CodeMode NVARCHAR(20) NOT NULL UNIQUE,
    LibelleMode NVARCHAR(100) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1
);

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

-- ============================================================================
-- 12. ORDRE D'EXÉCUTION
-- ============================================================================

CREATE TABLE OrdreExecutionStatut (
    IdOrdreStatut INT IDENTITY(1,1) PRIMARY KEY,
    CodeStatut NVARCHAR(50) NOT NULL UNIQUE,
    LibelleStatut NVARCHAR(100) NOT NULL,
    Actif BIT NOT NULL DEFAULT 1
);

CREATE TABLE OrdreExecution (
    IdOrdre INT IDENTITY(1,1) PRIMARY KEY,
    NumeroOrdre NVARCHAR(50) NOT NULL UNIQUE,
    IdDemande INT NOT NULL,
    IdDevis INT NOT NULL,
    IdOrdreStatut INT NOT NULL,
    IdUtilisateurEmission INT NOT NULL,
    DateEmission DATETIME NOT NULL DEFAULT GETDATE(),
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
    CONSTRAINT FK_OrdreExecution_DemandeBranchement FOREIGN KEY (IdDemande) REFERENCES DemandeBranchement(IdDemande),
    CONSTRAINT FK_OrdreExecution_Devis FOREIGN KEY (IdDevis) REFERENCES Devis(IdDevis),
    CONSTRAINT FK_OrdreExecution_OrdreExecutionStatut FOREIGN KEY (IdOrdreStatut) REFERENCES OrdreExecutionStatut(IdOrdreStatut),
    CONSTRAINT FK_OrdreExecution_UtilisateurEmission FOREIGN KEY (IdUtilisateurEmission) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_OrdreExecution_UtilisateurValidChefAgence FOREIGN KEY (IdUtilisateurValidationChefAgence) REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT FK_OrdreExecution_UtilisateurValidChefCentre FOREIGN KEY (IdUtilisateurValidationChefCentre) REFERENCES Utilisateur(IdUtilisateur)
);

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

-- ============================================================================
-- CRÉATION DES INDEX POUR OPTIMISATION DES PERFORMANCES
-- ============================================================================

-- Index sur la hiérarchie géographique
CREATE INDEX IX_Centre_Unite ON Centre(IdUnite);
CREATE INDEX IX_AgenceCommerciale_Centre ON AgenceCommerciale(IdCentre);

-- Index sur les clients
CREATE INDEX IX_Client_ClientType ON Client(IdClientType);
CREATE INDEX IX_Client_Nom ON Client(Nom, Prenom);
CREATE INDEX IX_Client_Telephone ON Client(TelephonePrincipal);
CREATE INDEX IX_Client_NumPiece ON Client(NumeroPieceIdentite);

-- Index sur les utilisateurs
CREATE INDEX IX_Utilisateur_Role ON Utilisateur(IdRole);
CREATE INDEX IX_Utilisateur_Unite ON Utilisateur(IdUnite);
CREATE INDEX IX_Utilisateur_Centre ON Utilisateur(IdCentre);
CREATE INDEX IX_Utilisateur_Agence ON Utilisateur(IdAgence);
CREATE INDEX IX_Utilisateur_Email ON Utilisateur(Email);
CREATE INDEX IX_Utilisateur_Matricule ON Utilisateur(Matricule);

-- Index sur les demandes
CREATE INDEX IX_DemandeBranchement_Agence ON DemandeBranchement(IdAgence);
CREATE INDEX IX_DemandeBranchement_Client ON DemandeBranchement(IdClient);
CREATE INDEX IX_DemandeBranchement_Type ON DemandeBranchement(IdDemandeType);
CREATE INDEX IX_DemandeBranchement_Statut ON DemandeBranchement(IdStatut);
CREATE INDEX IX_DemandeBranchement_Utilisateur ON DemandeBranchement(IdUtilisateurCreation);
CREATE INDEX IX_DemandeBranchement_DateDemande ON DemandeBranchement(DateDemande DESC);
CREATE INDEX IX_DemandeBranchement_NumeroDemande ON DemandeBranchement(NumeroDemande);

-- Index sur l'historique des demandes
CREATE INDEX IX_DemandeWorkflowHistorique_Demande ON DemandeWorkflowHistorique(IdDemande);
CREATE INDEX IX_DemandeWorkflowHistorique_Utilisateur ON DemandeWorkflowHistorique(IdUtilisateur);
CREATE INDEX IX_DemandeWorkflowHistorique_DateAction ON DemandeWorkflowHistorique(DateAction DESC);

-- Index sur les articles
CREATE INDEX IX_Article_Famille ON Article(IdFamille);
CREATE INDEX IX_Article_CodeArticle ON Article(CodeArticle);
CREATE INDEX IX_Article_Actif ON Article(Actif);

-- NOUVEAUX INDEX POUR LES VARIANTES D'ARTICLES
CREATE INDEX IX_Article_FamilleDiametre ON Article(IdFamille, Diametre) WHERE Actif = 1 AND Diametre IS NOT NULL;
CREATE INDEX IX_Article_FamilleMatiere ON Article(IdFamille, Matiere) WHERE Actif = 1 AND Matiere IS NOT NULL;
CREATE INDEX IX_Article_FamilleClasse ON Article(IdFamille, Classe) WHERE Actif = 1 AND Classe IS NOT NULL;

-- Index sur l'historique des prix
CREATE INDEX IX_ArticlePrixHistorique_Article ON ArticlePrixHistorique(IdArticle);
CREATE INDEX IX_ArticlePrixHistorique_Article_Actif ON ArticlePrixHistorique(IdArticle, EstActif, DateDebutApplication DESC);
CREATE INDEX IX_ArticlePrixHistorique_Dates ON ArticlePrixHistorique(DateDebutApplication, DateFinApplication);

-- Index sur les devis
CREATE INDEX IX_Devis_Demande ON Devis(IdDemande);
CREATE INDEX IX_Devis_TypeDevis ON Devis(IdTypeDevis);
CREATE INDEX IX_Devis_UtilisateurCreation ON Devis(IdUtilisateurCreation);
CREATE INDEX IX_Devis_DateCreation ON Devis(DateCreation DESC);
CREATE INDEX IX_Devis_NumeroDevis ON Devis(NumeroDevis);
CREATE INDEX IX_Devis_EstValide ON Devis(EstValide);

-- Index sur les articles de devis
CREATE INDEX IX_DevisArticle_Devis ON DevisArticle(IdDevis);
CREATE INDEX IX_DevisArticle_Article ON DevisArticle(IdArticle);