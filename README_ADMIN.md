# Création d'un Utilisateur Administrateur

## 📋 Informations de Connexion

Après avoir exécuté le script `insert_admin.sql`, vous pouvez vous connecter avec :

### Identifiants par défaut

- **Email** : `admin`
- **Matricule** : `ADMIN001`
- **Mot de passe** : `admin123`

## 🚀 Instructions

### Étape 1 : Exécuter le script SQL

1. Ouvrez **SQL Server Management Studio (SSMS)**
2. Connectez-vous à votre serveur SQL Server
3. Ouvrez le fichier `insert_admin.sql`
4. Exécutez le script (F5 ou bouton "Exécuter")

### Étape 2 : Vérifier la création

Le script affichera les informations de l'utilisateur créé dans la fenêtre de résultats.

### Étape 3 : Se connecter à l'application

1. Démarrez le frontend : `cd frontend && npm start`
2. Accédez à `http://localhost:3000`
3. Connectez-vous avec :
   - **Email** : `admin@aquaconnect.local` (ou **Matricule** : `ADMIN001`)
   - **Mot de passe** : `Admin@123`

## ⚠️ Sécurité IMPORTANTE

**CHANGEZ LE MOT DE PASSE IMMÉDIATEMENT après la première connexion !**

Le mot de passe par défaut est stocké en clair dans la base de données. Pour la production :

1. Utilisez un système de hashage (bcrypt) pour les mots de passe
2. Changez le mot de passe par défaut
3. Ne partagez pas les identifiants

## 🔧 Modifier le mot de passe

Pour changer le mot de passe directement en SQL :

```sql
USE AquaConnect_DB;
GO

UPDATE Utilisateur 
SET MotDePasse = 'VotreNouveauMotDePasse'
WHERE Email = 'admin@aquaconnect.local';
GO
```

## 📝 Créer d'autres utilisateurs

Vous pouvez créer d'autres utilisateurs en modifiant le script `insert_admin.sql` ou en créant un nouveau script similaire.

### Exemple de création d'utilisateur standard :

```sql
USE AquaConnect_DB;
GO

-- Récupérer l'ID d'un rôle (par exemple, AGENT)
DECLARE @IdRole INT;
SELECT @IdRole = IdRole FROM Role WHERE CodeRole = 'AGENT';

-- Si le rôle n'existe pas, créez-le d'abord
-- INSERT INTO Role (CodeRole, LibelleRole, Description, Actif)
-- VALUES ('AGENT', 'Agent', 'Agent commercial', 1);

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
    @IdRole,
    'AGENT001',
    'Doe',
    'John',
    'john.doe@aquaconnect.local',
    '+221 XX XXX XX XX',
    'MotDePasse123',
    1,
    GETDATE()
);
GO
```

## 🔑 Rôles disponibles

Le script crée automatiquement le rôle **ADMIN** s'il n'existe pas. Vous pouvez créer d'autres rôles selon vos besoins :

- **ADMIN** : Administrateur système (pleins pouvoirs)
- **AGENT** : Agent commercial
- **CHEF_AGENCE** : Chef d'agence
- **CHEF_CENTRE** : Chef de centre
- **JURIDIQUE** : Service juridique
- etc.

## ✅ Vérification

Pour vérifier que l'utilisateur a été créé correctement :

```sql
SELECT 
    u.Matricule,
    u.Nom + ' ' + u.Prenom as NomComplet,
    u.Email,
    r.LibelleRole as Role,
    u.Actif
FROM Utilisateur u
INNER JOIN Role r ON u.IdRole = r.IdRole
WHERE u.Matricule = 'ADMIN001';
```

