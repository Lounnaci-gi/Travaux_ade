# Migration: Suppression de la table Role

## Modifications effectuées

### Backend (server.js)

1. **Route LOGIN** ✅ - Modifiée pour utiliser `u.Role` au lieu de `r.CodeRole`
2. **Route STATS** ✅ - Modifiée pour utiliser `u.Role`
3. **Route ROLES** ✅ - Modifiée pour retourner des r\u00f4les pr\u00e9d\u00e9finis en dur
4. **Création/Modification/Suppression de r\u00f4les** ✅ - D\u00e9sactiv\u00e9es (r\u00f4les en dur)
5. **validateUniquenessConstraints** ✅ - Modifi\u00e9e pour utiliser le champ Role directement
6. **Liste des utilisateurs** ✅ - Modifi\u00e9e pour enlever le JOIN avec Role
7. **Cr\u00e9ation d'utilisateur** ✅ - Modifi\u00e9e pour utiliser Role au lieu de IdRole

### Modifications restantes \u00e0 faire manuellement:

#### Dans server.js, cherchez et remplacez:

1. Ligne ~2035: `IdRole,` → `Role,`
2. Ligne ~2048: `const required = ['IdRole',` → `const required = ['Role',`
3. Ligne ~2101: `const uniquenessValidation = await validateUniquenessConstraints(IdRole,` → `const uniquenessValidation = await validateUniquenessConstraints(Role,`
4. Ligne ~2110: `updateRequest.input('IdRole', sql.Int, IdRole);` → `updateRequest.input('Role', sql.NVarChar(100), Role);`
5. Ligne ~2127: `updateFields.push('IdRole = @IdRole');` → `updateFields.push('Role = @Role');`
6. Ligne ~2145-2155: Remplacez la requ\u00eate SELECT pour enlever le JOIN avec Role:
```sql
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
  u.Role,
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
```

### Frontend - \u00c0 modifier

#### components/UtilisateurForm.js
- Remplacer `idRole` par `role`
- Changer le select pour afficher les r\u00f4les pr\u00e9d\u00e9finis
- Utiliser `Role` au lieu de `IdRole`

#### utils/auth.js
- Déjà compatible, utilise `codeRole` et `role`

## R\u00f4les disponibles (en dur)

1. ADMINISTRATEUR
2. CHEF_CENTRE
3. CHEF_AGENCE_COMMERCIALE
4. CHEF_SERVICE_JURIDIQUE
5. CHEF_SECTION_RELATIONS_CLIENTELE
6. CHEF_SERVICE_TECHNICO_COMMERCIAL
7. UTILISATEUR_STANDARD

## Validation des donn\u00e9es

Le backend valide maintenant que le `Role` fourni fait partie de la liste `AVAILABLE_ROLES`.
