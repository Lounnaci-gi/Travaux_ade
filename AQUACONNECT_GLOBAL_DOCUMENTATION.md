# AquaConnect - Global Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Installation and Setup](#installation-and-setup)
3. [User Management](#user-management)
4. [Technical Implementation Details](#technical-implementation-details)
5. [Troubleshooting](#troubleshooting)
6. [Theme Guidelines](#theme-guidelines)

---

## Project Overview

Application web moderne pour le suivi des travaux de branchement AquaConnect.

### Technologies
- **Frontend**: React avec Create React App
- **Backend**: Node.js / Express
- **Base de données**: SQL Server
- **CSS**: Tailwind CSS (style élégant, simple, interactif et futuriste)
- **API**: RESTful API avec Express

### Structure du Projet
```
Travaux_Eau/
├── frontend/          # Application React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── StatsCard.js
│   │   │   ├── TravauxCard.js
│   │   │   ├── TravauxList.js
│   │   │   └── TravauxDetail.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/           # API Express
│   ├── server.js
│   └── package.json
├── bdd.sql           # Script SQL de la base de données
└── .env              # Variables d'environnement (à créer)
```

### Fonctionnalités
- **Dashboard**: Vue d'ensemble avec statistiques des travaux
  - Total des travaux
  - Travaux en cours
  - Travaux terminés
  - Travaux en attente
- **Liste des Travaux**: 
  - Affichage de tous les ordres d'exécution
  - Recherche par numéro, client ou demande
  - Filtrage par statut
  - Cartes interactives avec effets glassmorphism
- **Détail d'un Travail**:
  - Informations complètes de l'ordre d'exécution
  - Historique des actions
  - Dates importantes
  - Instructions et commentaires

### Style
L'interface utilise un design moderne et futuriste avec:
- Effets glassmorphism (verre dépoli)
- Dégradés de couleurs animés
- Transitions fluides
- Palette de couleurs bleu/violet
- Animations subtiles
- Design responsive

### API Endpoints
- `GET /api/travaux` - Liste de tous les travaux
- `GET /api/travaux/:id` - Détails d'un travail
- `GET /api/travaux/:id/historique` - Historique d'un travail
- `GET /api/stats` - Statistiques globales
- `GET /api/health` - État du serveur

### Base de Données
La base de données est définie dans `bdd.sql` et contient:
- Tables pour la gestion hiérarchique (Unité, Centre, Agence)
- Tables clients et utilisateurs
- Tables demandes et devis
- Tables ordres d'exécution (OrdreExecution)
- Historique des travaux

---

## Installation and Setup

### Prérequis
- Node.js (v14 ou supérieur)
- SQL Server avec la base de données `AquaConnect_DB`
- npm ou yarn

### Configuration
1. **Créer le fichier `.env` à la racine du projet**:
```env
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=AquaConnect_DB
DB_USER=sa
DB_PASSWORD=VotreMotDePasse
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

2. **Installer les dépendances du backend**:
```bash
cd backend
npm install
```

3. **Installer les dépendances du frontend**:
```bash
cd frontend
npm install
```

### Démarrage
#### Backend
```bash
cd backend
npm start
```
Le serveur API démarre sur `http://localhost:5000`

#### Frontend
```bash
cd frontend
npm start
```
L'application démarre sur `http://localhost:3000`

### Création d'un Utilisateur Administrateur

#### Informations de Connexion
Après avoir exécuté le script `insert_admin.sql`, vous pouvez vous connecter avec :

##### Identifiants par défaut
- **Email** : `admin`
- **Matricule** : `ADMIN001`
- **Mot de passe** : `admin123`

#### Instructions
1. Ouvrez **SQL Server Management Studio (SSMS)**
2. Connectez-vous à votre serveur SQL Server
3. Ouvrez le fichier `insert_admin.sql`
4. Exécutez le script (F5 ou bouton "Exécuter")

⚠️ **Sécurité IMPORTANTE**
**CHANGEZ LE MOT DE PASSE IMMÉDIATEMENT après la première connexion !**

---

## User Management

### Rôles disponibles
1. ADMINISTRATEUR - Accès total au système
2. CHEF_CENTRE - Gestion d'un centre
3. CHEF_AGENCE_COMMERCIALE - Gestion d'une agence
4. CHEF_SERVICE_JURIDIQUE - Validation juridique
5. CHEF_SECTION_RELATIONS_CLIENTELE - Relations client
6. CHEF_SERVICE_TECHNICO_COMMERCIAL - Service technique
7. UTILISATEUR_STANDARD - Utilisateur standard

### Création via l'interface
1. Connectez-vous avec un compte **ADMINISTRATEUR**
2. Menu **Administration** → **Utilisateur**
3. Remplissez le formulaire:
   - ✅ Sélectionnez un **Rôle** dans la liste déroulante
   - ✅ Remplissez **Nom**, **Prénom**, **Email**
   - ✅ Définissez un **Mot de passe** (min. 6 caractères)
   - ⚠️ Le **Matricule** sera généré automatiquement (UTI-XXXX)
4. Cliquez sur **Créer l'Utilisateur**

### CONTRAINTES D'UNICITÉ
Le système applique automatiquement ces règles:
- **1 seul ADMINISTRATEUR** dans tout le système
- **1 seul CHEF_CENTRE** par centre
- **1 seul CHEF_AGENCE_COMMERCIALE** par agence
- **1 seul CHEF_SERVICE_JURIDIQUE** par centre
- **1 seul CHEF_SECTION_RELATIONS_CLIENTELE** par agence
- **1 seul CHEF_SERVICE_TECHNICO_COMMERCIAL** par centre

---

## Technical Implementation Details

### Migration: Suppression de la table Role
Après les modifications (Suppression table Role)

#### MODIFICATIONS EFFECTUÉES
Votre projet a été adapté pour fonctionner SANS la table `Role`. Le champ `Role` est maintenant directement dans la table `Utilisateur`.

##### Fichiers modifiés:
1. ✅ `backend/server.js` - Routes adaptées
2. ✅ `frontend/src/components/UtilisateurForm.js` - Formulaire adapté

#### Rôles disponibles (prédéfinis):
1. ADMINISTRATEUR
2. CHEF_CENTRE
3. CHEF_AGENCE_COMMERCIALE
4. CHEF_SERVICE_JURIDIQUE
5. CHEF_SECTION_RELATIONS_CLIENTELE
6. CHEF_SERVICE_TECHNICO_COMMERCIAL
7. UTILISATEUR_STANDARD

### Restrictions Chef de Centre
#### Règle métier
Un utilisateur ayant le rôle **CHEF_CENTRE** peut uniquement créer des utilisateurs pour :
- Son propre centre
- Les agences affectées à son centre

#### Implémentation
**Fichier modifié :** `frontend/src/components/UtilisateurForm.js`

##### A. Validation lors de la création (handleSubmit)
```javascript
// Validation pour Chef de Centre: peut créer uniquement pour son centre ou agences de son centre
if (isChefCentreUser) {
  if (!form.IdCentre || String(form.IdCentre) !== String(user.idCentre)) {
    setError('En tant que Chef de Centre, vous pouvez uniquement créer des utilisateurs pour votre centre ou ses agences');
    return;
  }
}
```

##### B. Validation lors de la modification (handleUpdate)
```javascript
// Validation pour Chef de Centre: peut modifier uniquement pour son centre ou agences de son centre
if (isChefCentreUser) {
  if (!form.IdCentre || String(form.IdCentre) !== String(user.idCentre)) {
    setError('En tant que Chef de Centre, vous pouvez uniquement modifier des utilisateurs de votre centre ou ses agences');
    return;
  }
}
```

##### C. Message d'information pour l'utilisateur
Un message informatif a été ajouté dans le formulaire pour les Chefs de Centre :
```javascript
{isChefCentreUser && (
  <p className="mt-2">
    <strong>Note :</strong> En tant que Chef de Centre, vous pouvez créer des utilisateurs 
    uniquement pour votre centre ou pour les agences affectées à votre centre.
  </p>
)}
```

##### D. Restrictions au niveau de l'interface
- Le champ **Unité** est désactivé et pré-rempli avec l'unité du centre du Chef de Centre
- Le champ **Centre** est désactivé et pré-rempli avec le centre du Chef de Centre
- Le champ **Agence** permet de sélectionner uniquement les agences appartenant au centre du Chef de Centre

### Session Expiration Implementation
This document explains how the session expiration feature has been implemented to ensure users must reconnect after each server restart for security purposes.

#### Backend Implementation
The backend server already had a mechanism in place to detect server restarts and invalidate sessions:

1. **Server Boot Time Tracking**: The server captures the startup time in the `SERVER_BOOT_TIME` constant:
   ```javascript
   const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);
   ```

2. **Token Validation**: The verifyToken middleware checks if a token was issued before the server started:
   ```javascript
   if (decoded.iat && decoded.iat < SERVER_BOOT_TIME) {
     return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
   }
   ```

#### Frontend Implementation
The frontend was modified to properly handle the "Session expirée" error and redirect users to the login page:

1. **API Interceptor Update**: The response interceptor in api.js was updated to detect session expiration errors:
   ```javascript
   // Si l'erreur est une erreur 401 avec le message "Session expirée", 
   // déconnecter l'utilisateur et le rediriger vers la page de login
   if (error.response && error.response.status === 401) {
     const message = error.response.data?.error || '';
     if (message.includes('Session expirée')) {
       // Supprimer les données de session
       localStorage.removeItem('token');
       localStorage.removeItem('user');
       
       // Rediriger vers la page de login
       if (typeof window !== 'undefined') {
         window.location.href = '/'; // Redirige vers la racine qui affichera le login
       }
     }
   }
   ```

### CORRECTION - Express Import Missing
#### Problème rencontré
Lors de la modification d'utilisateurs, les erreurs suivantes apparaissaient :
```
:5000/api/auth/verify:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:5000/api/utilisateurs/2:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

#### Cause racine
Le module `express` n'était pas importé au début du fichier `backend/server.js`.

La ligne suivante était manquante :
```javascript
const express = require('express');
```

#### Solution appliquée
**Fichier modifié :** `i:\Travaux_ade\backend\server.js`
**Ligne 1 :** Ajout de l'importation du module Express

```javascript
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
```

### CORRECTION - SQL Comment Syntax Error
#### Problème rencontré
Lors de la modification d'un utilisateur, l'erreur suivante s'est produite :
```
RequestError: Incorrect syntax near '/'.
  number: 102,
  lineNumber: 12,
  state: 1,
  class: 15
```

#### Cause racine
Le problème était causé par l'utilisation de **commentaires JavaScript (`//`)** à l'intérieur d'une **requête SQL**.

**Code problématique :**
```javascript
const userInfo = await pool.request()
  .input('id', sql.Int, id)
  .query(`
    SELECT 
      u.IdUtilisateur,
      u.Matricule,
      u.Nom,
      u.Prenom,
      u.Email,
      u.Telephone,
      u.Actif,
      u.DateCreation,
      u.DateModification,
      u.Role,  // Changé: plus de JOIN avec Role  ❌ ERREUR ICI
      u.IdUnite,
      // ... rest of query
  `);
```

#### Solution appliquée
**Fichier modifié :** `i:\Travaux_ade\backend\server.js`
**Ligne ~2148 :** Suppression du commentaire JavaScript dans la requête SQL

```javascript
// ✅ CORRIGÉ
const userInfo = await pool.request()
  .input('id', sql.Int, id)
  .query(`
    SELECT 
      u.IdUtilisateur,
      u.Matricule,
      u.Nom,
      u.Prenom,
      u.Email,
      u.Telephone,
      u.Actif,
      u.DateCreation,
      u.DateModification,
      u.Role,  -- Commentaire supprimé
      u.IdUnite,
      un.NomUnite,
      u.IdCentre,
      c.NomCentre,
      u.IdAgence,
      a.NomAgence
    FROM Utilisateur u
    LEFT JOIN Unite un ON u.IdUnite = un.IdUnite
    LEFT JOIN Centre c ON u.IdCentre = c.IdCentre
    LEFT JOIN AgenceCommerciale a ON u.IdAgence = a.IdAgence
    WHERE u.IdUtilisateur = @id
  `);
```

---

## Troubleshooting

### 🔴 Erreur: Échec de l'ouverture de session de l'utilisateur 'sa'
Cette erreur indique un problème d'authentification avec SQL Server. Voici les solutions possibles:

#### Solution 1: Vérifier le fichier .env
Assurez-vous que le fichier `.env` est créé à la racine du projet (pas dans le dossier `backend`) et contient:
```env
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=AquaConnect_DB
DB_USER=sa
DB_PASSWORD=VotreVraiMotDePasse
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
PORT=5000
```

⚠️ **Important**: 
- Remplacez `VotreVraiMotDePasse` par le vrai mot de passe de SQL Server
- Pas d'espaces autour du signe `=`
- Pas de guillemets autour des valeurs

#### Solution 2: Activer l'authentification SQL Server
1. Ouvrez **SQL Server Management Studio (SSMS)**
2. Connectez-vous avec l'authentification Windows
3. Clic droit sur le serveur → **Propriétés**
4. Allez dans l'onglet **Sécurité**
5. Sélectionnez **Mode d'authentification SQL Server et Windows**
6. Cliquez sur **OK**
7. Redémarrez le service SQL Server

#### Solution 3: Réinitialiser le mot de passe de 'sa'
1. Dans SSMS, connectez-vous
2. Développez **Sécurité** → **Connexions**
3. Clic droit sur **sa** → **Propriétés**
4. Allez dans l'onglet **Général**
5. Entrez un nouveau mot de passe et confirmez-le
6. Allez dans l'onglet **État**
7. Vérifiez que la connexion est **Activée**
8. Cliquez sur **OK**

#### Solution 4: Vérifier que SQL Server est démarré
1. Appuyez sur `Windows + R`
2. Tapez `services.msc` et appuyez sur Entrée
3. Recherchez **SQL Server (MSSQLSERVER)** ou **SQL Server (SQLEXPRESS)**
4. Vérifiez que le statut est **En cours d'exécution**
5. Si non, cliquez droit → **Démarrer**

#### Solution 5: Vérifier le nom du serveur
Dans le fichier `.env`, vérifiez `DB_SERVER`:
- Pour SQL Server Express: utilisez `localhost\\SQLEXPRESS` ou `VOTRE_PC\\SQLEXPRESS`
- Pour SQL Server Standard: utilisez `localhost` ou `VOTRE_PC`

#### Solution 6: Tester la connexion avec SSMS
Si vous ne pouvez pas vous connecter avec SSMS, le problème vient de SQL Server lui-même:
1. Vérifiez que TCP/IP est activé dans la Configuration SQL Server Network
2. Vérifiez que le port 1433 est ouvert dans le pare-feu Windows

#### Solution 7: Utiliser un autre utilisateur
Créez un nouvel utilisateur SQL Server:
1. Dans SSMS: **Sécurité** → **Connexions** → **Nouvelle connexion**
2. Choisissez **Authentification SQL Server**
3. Entrez un nom d'utilisateur et un mot de passe
4. Sélectionnez la base de données par défaut: `AquaConnect_DB`
5. Dans **Rôles serveur**, cochez `sysadmin` ou `db_owner`
6. Mettez à jour votre fichier `.env` avec le nouveau nom d'utilisateur et mot de passe

#### Solution 8: Vérifier que la base de données existe
Assurez-vous que la base de données `AquaConnect_DB` existe:
1. Dans SSMS, vérifiez sous **Bases de données**
2. Si elle n'existe pas, exécutez le script `bdd.sql` pour la créer

### 🔴 Erreur: Timeout de connexion
#### Solutions:
1. Vérifiez que SQL Server est démarré (Solution 4)
2. Vérifiez que le port est correct dans `.env`
3. Vérifiez que le pare-feu autorise le port 1433
4. Vérifiez que le nom du serveur est correct

### 🔴 Erreur: Base de données introuvable
#### Solutions:
1. Vérifiez que la base de données `AquaConnect_DB` existe
2. Exécutez le script `bdd.sql` pour créer la base de données
3. Vérifiez l'orthographe dans `.env` (DB_DATABASE)

### 📝 Vérification rapide
Exécutez cette commande dans PowerShell pour tester la connexion:
```powershell
sqlcmd -S localhost -U sa -P VotreMotDePasse -Q "SELECT @@VERSION"
```

Si cette commande fonctionne, votre configuration SQL Server est correcte et le problème vient de l'application Node.js.

---

## Theme Guidelines

This document outlines the theme system and styling conventions used throughout the AquaConnect application.

### Color Palette
#### Primary Colors
- Primary 500: `#0ea5e9` (Sky Blue)
- Accent 500: `#d946ef` (Fuchsia)

#### Semantic Colors
- Success: `#10b981` (Emerald)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

### Typography
The application uses the Poppins font family for all text elements.

### Component Classes
#### Glass Effects
- `.glass-effect`: Base glass effect with backdrop blur
- `.glass-card`: Glass card with rounded corners and shadow

#### Buttons
- `.btn-primary`: Primary action button with gradient
- `.btn-secondary`: Secondary action button
- `.btn-success`: Success action button
- `.btn-warning`: Warning action button
- `.btn-error`: Error action button

#### Inputs
- `.input-field`: Standard input field with glass effect

#### Text
- `.text-gradient`: Text with primary to accent gradient
- `.text-gradient-reverse`: Text with accent to primary gradient

### Responsive Design
The application uses Tailwind's responsive breakpoints:
- Mobile: Default styles
- Tablet: `md:` prefix
- Desktop: `lg:` prefix
- Large Desktop: `xl:` prefix

### Dark Mode
Dark mode is implemented using the `dark` class on the root element. All components should have both light and dark variants.

### Animation Classes
- `.animate-fadeIn`: Fade in animation
- `.animate-blob`: Floating blob animation
- `.animation-delay-2000`: 2 second animation delay
- `.animation-delay-4000`: 4 second animation delay

### Usage Examples
#### Card Component
```html
<div class="glass-card p-6">
  <h2 class="text-gradient">Card Title</h2>
  <p>Card content</p>
</div>
```

#### Primary Button
```html
<button class="btn-primary py-2 px-4">
  Click Me
</button>
```

#### Input Field
```html
<input class="input-field py-2 px-4" placeholder="Enter text" />
```