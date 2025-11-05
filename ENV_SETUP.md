# Configuration des Variables d'Environnement

## Fichier `.env` à créer à la racine du projet

Créez un fichier `.env` à la racine du projet avec le contenu suivant:

```env
# SQL Server Database Configuration
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=AquaConnect_DB
DB_USER=sa
DB_PASSWORD=VotreMotDePasse123
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Authentification Windows (optionnel)
# Si vous utilisez l'authentification Windows, définissez cette variable à true
# et ne définissez pas DB_USER et DB_PASSWORD
# DB_USE_WINDOWS_AUTH=false

# Backend Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret Key (changez cette clé en production!)
JWT_SECRET=votre-cle-secrete-jwt-changez-en-production

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Fichier `.env` pour le frontend

Dans le dossier `frontend`, créez un fichier `.env` avec:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Notes importantes

1. **DB_SERVER**: Adresse de votre serveur SQL Server (ex: `localhost` ou `192.168.1.100`)
2. **DB_PORT**: Port SQL Server (par défaut: `1433`)
3. **DB_DATABASE**: Nom de votre base de données (doit être `AquaConnect_DB`)
4. **DB_USER**: Nom d'utilisateur SQL Server (par défaut: `sa`)
5. **DB_PASSWORD**: Mot de passe SQL Server
6. **DB_ENCRYPT**: Active le chiffrement (généralement `true` pour SQL Server moderne)
7. **DB_TRUST_SERVER_CERTIFICATE**: Accepte les certificats auto-signés (`true` pour développement)
8. **DB_USE_WINDOWS_AUTH**: Utilise l'authentification Windows au lieu de SQL Server (`true` ou `false`, par défaut `false`)
9. **JWT_SECRET**: Clé secrète pour signer les tokens JWT (changez en production!)

## Authentification Windows

Si vous préférez utiliser l'authentification Windows (Integrated Security), définissez:
```env
DB_USE_WINDOWS_AUTH=true
```
Dans ce cas, vous n'avez pas besoin de définir `DB_USER` et `DB_PASSWORD`.

## Sécurité

⚠️ **Important**: Ne commitez jamais le fichier `.env` dans le dépôt Git. Il est déjà dans `.gitignore`.

## Vérification

Après avoir créé le fichier `.env`, redémarrez le serveur backend pour que les modifications prennent effet.

