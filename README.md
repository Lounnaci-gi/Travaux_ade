# AquaConnect - Suivi des Travaux

Application web moderne pour le suivi des travaux de branchement AquaConnect.

## 🚀 Technologies

- **Frontend**: React avec Create React App
- **Backend**: Node.js / Express
- **Base de données**: SQL Server
- **CSS**: Tailwind CSS (style élégant, simple, interactif et futuriste)
- **API**: RESTful API avec Express

## 📁 Structure du Projet

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

## 🛠️ Installation

### Prérequis

- Node.js (v14 ou supérieur)
- SQL Server avec la base de données `AquaConnect_DB`
- npm ou yarn

### Configuration

1. **Créer le fichier `.env` à la racine du projet** (copier depuis `.env.example`):
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

## 🚀 Démarrage

### Backend

```bash
cd backend
npm start
```

Le serveur API démarre sur `http://localhost:5000`

### Frontend

```bash
cd frontend
npm start
```

L'application démarre sur `http://localhost:3000`

## 📊 Fonctionnalités

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

## 🎨 Style

L'interface utilise un design moderne et futuriste avec:
- Effets glassmorphism (verre dépoli)
- Dégradés de couleurs animés
- Transitions fluides
- Palette de couleurs bleu/violet
- Animations subtiles
- Design responsive

## 🔌 API Endpoints

- `GET /api/travaux` - Liste de tous les travaux
- `GET /api/travaux/:id` - Détails d'un travail
- `GET /api/travaux/:id/historique` - Historique d'un travail
- `GET /api/stats` - Statistiques globales
- `GET /api/health` - État du serveur

## 📝 Base de Données

La base de données est définie dans `bdd.sql` et contient:
- Tables pour la gestion hiérarchique (Unité, Centre, Agence)
- Tables clients et utilisateurs
- Tables demandes et devis
- Tables ordres d'exécution (OrdreExecution)
- Historique des travaux

## 🔒 Sécurité

- Variables d'environnement pour les informations sensibles
- CORS configuré pour le frontend
- Validation des entrées côté serveur

## 📄 Licence

ISC

