# Restrictions Chef de Centre - Documentation

## Date de mise à jour
2025-11-14

## Modifications implémentées

### 1. Restriction de création d'utilisateurs pour Chef de Centre

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

### 2. Limitation de la longueur du champ Téléphone

#### Règle métier
Le champ téléphone accepte un maximum de **10 caractères**.

#### Implémentation

**Fichier modifié :** `frontend/src/components/UtilisateurForm.js`

##### A. Formulaire de création
```javascript
<input
  name="Telephone"
  value={form.Telephone}
  onChange={handleChange}
  placeholder="0123456789"
  maxLength={10}  // ✅ Ajouté
  className="w-full px-4 py-3 rounded-lg ..."
/>
```

##### B. Formulaire de modification (modal)
```javascript
<input
  name="Telephone"
  value={form.Telephone}
  onChange={handleChange}
  maxLength={10}  // ✅ Ajouté
  className="w-full px-4 py-3 rounded-lg ..."
/>
```

## Comportement attendu

### Pour un Chef de Centre

#### Lors de la création d'un utilisateur :
1. ✅ Les champs Unité et Centre sont automatiquement remplis et verrouillés
2. ✅ Seules les agences de son centre sont disponibles dans la liste déroulante
3. ✅ Si l'utilisateur tente de soumettre sans sélectionner son centre, une erreur s'affiche
4. ✅ Un message informatif explique la restriction

#### Lors de la modification d'un utilisateur :
1. ✅ Les champs Unité et Centre sont verrouillés s'ils correspondent au centre du Chef de Centre
2. ✅ Si l'utilisateur tente de modifier un utilisateur d'un autre centre, une erreur s'affiche
3. ✅ La modification n'est autorisée que pour les utilisateurs du même centre ou de ses agences

### Pour le champ Téléphone

#### Dans tous les formulaires :
1. ✅ La saisie est limitée à 10 caractères maximum
2. ✅ L'utilisateur ne peut pas saisir plus de 10 caractères
3. ✅ La limitation s'applique au formulaire de création ET de modification

## Tests recommandés

### Test 1 : Création d'utilisateur par Chef de Centre
1. Se connecter en tant que Chef de Centre
2. Accéder au formulaire de création d'utilisateur
3. Vérifier que Unité et Centre sont pré-remplis et désactivés
4. Sélectionner une agence de son centre → ✅ Devrait fonctionner
5. Tenter de créer sans centre → ❌ Devrait afficher une erreur

### Test 2 : Modification d'utilisateur par Chef de Centre
1. Se connecter en tant que Chef de Centre
2. Tenter de modifier un utilisateur de son centre → ✅ Devrait fonctionner
3. Tenter de modifier un utilisateur d'un autre centre → ❌ Devrait afficher une erreur

### Test 3 : Champ Téléphone
1. Accéder au formulaire de création
2. Saisir un numéro de téléphone de 10 caractères → ✅ Devrait accepter
3. Tenter de saisir un 11ème caractère → ❌ Devrait bloquer la saisie
4. Vérifier le même comportement dans le formulaire de modification

## Fichiers modifiés

- ✅ `frontend/src/components/UtilisateurForm.js`
  - Ajout de validation dans `handleSubmit()`
  - Ajout de validation dans `handleUpdate()`
  - Ajout de `maxLength={10}` sur les champs Téléphone (création et modification)
  - Ajout d'un message informatif pour Chef de Centre

## Notes techniques

- La validation est effectuée côté **frontend** (React)
- La logique de restriction utilise `isChefCentreUser` défini comme : `isChefCentre(user)`
- Le centre de l'utilisateur connecté est accessible via `user.idCentre`
- La comparaison utilise `String()` pour éviter les problèmes de type (number vs string)

## Évolutions futures possibles

1. Ajouter la même validation côté **backend** pour plus de sécurité
2. Ajouter un format de validation pour le téléphone (ex: format international)
3. Afficher uniquement les utilisateurs du centre du Chef de Centre dans la liste
4. Limiter les rôles disponibles pour un Chef de Centre (éviter qu'il crée des ADMINISTRATEUR)

---

**Dernière mise à jour :** 2025-11-14  
**Auteur :** Système AquaConnect  
**Version :** 1.0
