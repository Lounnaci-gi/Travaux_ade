# 🚀 GUIDE DE DÉMARRAGE - AquaConnect

## Après les modifications (Suppression table Role)

---

## ✅ MODIFICATIONS EFFECTUÉES

Votre projet a été adapté pour fonctionner SANS la table `Role`. Le champ `Role` est maintenant directement dans la table `Utilisateur`.

### Fichiers modifiés:
1. ✅ `backend/server.js` - Routes adaptées
2. ✅ `frontend/src/components/UtilisateurForm.js` - Formulaire adapté

---

## 📋 ÉTAPES DE DÉMARRAGE

### 1. Vérifier la base de données

Assurez-vous que votre base de données est à jour avec le nouveau schéma (fichier `bdd.sql`):

```sql
-- La table Utilisateur doit avoir le champ Role (NVARCHAR(100))
-- La table Role ne doit PAS exister
```

### 2. Démarrer le Backend

```powershell
cd i:\Travaux_ade\backend
npm start
```

**Attendu:**
```
✅ Connexion à la base de données réussie
✅ Test de connexion réussi
🚀 Serveur démarré sur le port 5000
```

### 3. Démarrer le Frontend

Dans un nouveau terminal:

```powershell
cd i:\Travaux_ade\frontend
npm start
```

**Attendu:**
- Le navigateur s'ouvre sur `http://localhost:3000`
- Page de connexion affichée

---

## 🔐 CONNEXION

### Compte Admin par défaut

Vérifiez dans votre fichier `insert_admin.sql` les identifiants de l'administrateur.

**Format typique:**
- Email: `admin@aquaconnect.com`
- Mot de passe: (selon votre configuration)

---

## 👥 CRÉATION D'UTILISATEURS

### Rôles disponibles (prédéfinis):

1. **ADMINISTRATEUR** - Accès total au système
2. **CHEF_CENTRE** - Gestion d'un centre
3. **CHEF_AGENCE_COMMERCIALE** - Gestion d'une agence
4. **CHEF_SERVICE_JURIDIQUE** - Validation juridique
5. **CHEF_SECTION_RELATIONS_CLIENTELE** - Relations client
6. **CHEF_SERVICE_TECHNICO_COMMERCIAL** - Service technique
7. **UTILISATEUR_STANDARD** - Utilisateur standard

### Création via l'interface

1. Connectez-vous avec un compte **ADMINISTRATEUR**
2. Menu **Administration** → **Utilisateur**
3. Remplissez le formulaire:
   - ✅ Sélectionnez un **Rôle** dans la liste déroulante
   - ✅ Remplissez **Nom**, **Prénom**, **Email**
   - ✅ Définissez un **Mot de passe** (min. 6 caractères)
   - ⚠️ Le **Matricule** sera généré automatiquement (UTI-XXXX)
4. Cliquez sur **Créer l'Utilisateur**

---

## ⚠️ CONTRAINTES D'UNICITÉ

Le système applique automatiquement ces règles:

- **1 seul ADMINISTRATEUR** dans tout le système
- **1 seul CHEF_CENTRE** par centre
- **1 seul CHEF_AGENCE_COMMERCIALE** par agence
- **1 seul CHEF_SERVICE_JURIDIQUE** par centre
- **1 seul CHEF_SECTION_RELATIONS_CLIENTELE** par agence
- **1 seul CHEF_SERVICE_TECHNICO_COMMERCIAL** par centre

Si vous essayez de violer ces règles, vous obtiendrez une erreur explicite.

---

## 🔧 DÉPANNAGE

### Erreur: "Connexion à la base de données"

**Vérifiez votre fichier `.env`:**
```env
DB_SERVER=DESKTOP-U36I23V\SQLEXPRESS
DB_USER=lounnaci
DB_PASSWORD=hyhwarez
DB_DATABASE=AquaConnect_DB
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Erreur: "Rôle invalide"

Le rôle fourni n'existe pas dans la liste prédéfinie. Utilisez uniquement les 7 rôles listés ci-dessus.

### Erreur: "Il ne peut y avoir qu'un seul..."

Vous essayez de créer un deuxième utilisateur avec un rôle unique. Vérifiez les contraintes d'unicité ci-dessus.

### L'utilisateur ne peut pas se connecter

1. Vérifiez que le compte est **Actif** (case cochée lors de la création)
2. Vérifiez l'email ET le matricule (les deux peuvent servir d'identifiant)
3. Le mot de passe est sensible à la casse

---

## 📊 STRUCTURE DES DONNÉES

### Exemple de création d'utilisateur (JSON)

```json
{
  "Role": "CHEF_CENTRE",
  "Nom": "Dupont",
  "Prenom": "Jean",
  "Email": "jean.dupont@aquaconnect.com",
  "Telephone": "0123456789",
  "MotDePasse": "motdepasse123",
  "IdUnite": 1,
  "IdCentre": 1,
  "IdAgence": null,
  "Actif": true
}
```

### Réponse du serveur

```json
{
  "IdUtilisateur": 5,
  "Matricule": "UTI-0005",
  "Nom": "Dupont",
  "Prenom": "Jean",
  "Email": "jean.dupont@aquaconnect.com",
  "Role": "CHEF_CENTRE",
  "NomUnite": "Unité Principale",
  "NomCentre": "Centre Nord",
  "Actif": true
}
```

---

## 📱 NAVIGATION

### Menu Principal (une fois connecté)

- **Dashboard** - Vue d'ensemble
- **Travaux** - Liste des travaux
- **Demandes** - Gestion des demandes
  - Liste des Demandes
  - Types de Travaux
  - Nouvelle Demande
- **Articles** - Gestion des articles
- **Administration** (Admin/Chef Centre uniquement)
  - **Utilisateur** - Créer/Modifier utilisateurs
  - Unité, Centre, Agence
  - Rôle (consultation uniquement)

---

## 🎯 TESTS RECOMMANDÉS

### Test 1: Connexion Admin
- [ ] Se connecter avec le compte admin
- [ ] Vérifier l'accès au menu Administration

### Test 2: Création Utilisateur
- [ ] Créer un utilisateur CHEF_CENTRE
- [ ] Vérifier que le matricule est généré (UTI-XXXX)
- [ ] Se déconnecter et se reconnecter avec le nouveau compte

### Test 3: Contraintes
- [ ] Essayer de créer un 2ème admin (doit échouer)
- [ ] Essayer de créer un 2ème chef du même centre (doit échouer)

### Test 4: Modification
- [ ] Modifier un utilisateur existant
- [ ] Changer son rôle
- [ ] Vérifier que les permissions changent

---

## 📞 SUPPORT

### Fichiers de documentation créés:

1. `CORRECTIONS_EFFECTUEES.md` - Détails techniques des modifications
2. `MIGRATION_NOTES.md` - Notes de migration
3. `GUIDE_DEMARRAGE.md` - Ce fichier

### Logs serveur

Le serveur affiche des logs détaillés dans la console. En cas d'erreur, consultez:
- Les messages d'erreur dans la console backend
- Les messages d'alerte dans l'interface (SweetAlert2)

---

## ✅ CHECKLIST FINALE

- [ ] Base de données créée avec `bdd.sql`
- [ ] Admin inséré avec `insert_admin.sql`
- [ ] Unités/Centres/Agences insérés avec `insert_unite_centre_agence.sql`
- [ ] Backend démarré sans erreur
- [ ] Frontend démarré sans erreur
- [ ] Connexion admin réussie
- [ ] Création d'un utilisateur test réussie

---

**Bon développement ! 🚀**
