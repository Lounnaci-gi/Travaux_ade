/**
 * Utilitaires pour la gestion des rôles et autorisations
 */

// Liste des rôles disponibles dans le système
export const AVAILABLE_ROLES = [
  'ADMINISTRATEUR',
  'CHEF_CENTRE',
  'CHEF_AGENCE_COMMERCIALE',
  'CHEF_SERVICE_JURIDIQUE',
  'CHEF_SECTION_RELATIONS_CLIENTELE',
  'CHEF_SERVICE_TECHNICO_COMMERCIAL',
  'UTILISATEUR_STANDARD'
];

/**
 * Normalise un rôle pour la comparaison
 * - Convertit en majuscules
 * - Remplace les espaces et tirets par des underscores
 * - Supprime les underscores multiples
 * - Supprime les underscores en début/fin
 */
export const normalizeRole = (role) => {
  if (!role) return '';
  return String(role)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')           // Espaces -> underscores
    .replace(/-/g, '_')             // Tirets -> underscores
    .replace(/_+/g, '_')            // Multiples underscores -> un seul
    .replace(/^_+|_+$/g, '');       // Enlever underscores en début/fin
};

/**
 * Vérifie si deux rôles correspondent
 * Utilise plusieurs stratégies de comparaison pour être robuste
 */
export const rolesMatch = (role1, role2) => {
  if (!role1 || !role2) return false;
  
  const normalized1 = normalizeRole(role1);
  const normalized2 = normalizeRole(role2);
  
  // 1. Comparaison exacte après normalisation
  if (normalized1 === normalized2) {
    return true;
  }
  
  // 2. Comparaison par mots-clés (si au moins 2 mots correspondent)
  const words1 = normalized1.split('_').filter(w => w.length > 2);
  const words2 = normalized2.split('_').filter(w => w.length > 2);
  
  if (words1.length >= 2 && words2.length >= 2) {
    const matchingWords = words1.filter(word => words2.includes(word));
    if (matchingWords.length >= 2) {
      return true;
    }
  }
  
  // 3. Comparaison partielle (pour les chaînes longues)
  if (normalized1.length >= 10 && normalized2.length >= 10) {
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Vérifie si un utilisateur peut créer un type de demande
 * @param {Object} user - L'utilisateur avec son rôle
 * @param {Object} demandeType - Le type de demande avec sa Description
 * @returns {boolean} - true si l'utilisateur peut créer ce type
 */
export const canUserCreateDemandeType = (user, demandeType) => {
  // Si pas d'utilisateur, refuser
  if (!user) {
    return false;
  }
  
  // Récupérer le rôle de l'utilisateur
  const userRoleRaw = user.role || user.codeRole || user.Role || user.CodeRole;
  if (!userRoleRaw) {
    // Si pas de rôle, permettre par défaut (pour éviter de bloquer tous les types)
    return true;
  }
  
  const userRole = normalizeRole(userRoleRaw);
  
  // Si l'utilisateur est admin, il peut tout créer
  if (userRole === 'ADMINISTRATEUR' || userRole.includes('ADMIN')) {
    return true;
  }
  
  // Parser la Description pour extraire les rôles autorisés
  let rolesAutorises = [];
  if (demandeType.Description) {
    try {
      const parsed = JSON.parse(demandeType.Description);
      rolesAutorises = parsed.r || parsed.roles || [];
    } catch (e) {
      // Si ce n'est pas du JSON, c'est une description simple (tous les rôles autorisés)
      rolesAutorises = [];
    }
  }
  
  // Si aucun rôle n'est spécifié, tous les utilisateurs peuvent créer
  if (rolesAutorises.length === 0) {
    return true;
  }
  
  // Vérifier si le rôle de l'utilisateur est dans la liste des rôles autorisés
  return rolesAutorises.some(roleAutorise => {
    // Si c'est un nombre (ID de rôle), on ne peut pas le comparer
    if (typeof roleAutorise === 'number') {
      return false;
    }
    
    // Si c'est une string, utiliser la fonction de comparaison
    if (typeof roleAutorise === 'string') {
      return rolesMatch(userRole, roleAutorise);
    }
    
    return false;
  });
};

/**
 * Normalise les rôles dans un tableau (convertit les IDs en codes de rôles)
 * @param {Array} roles - Tableau de rôles (peut contenir des IDs ou des codes)
 * @param {Array} availableRoles - Liste des rôles disponibles avec leurs codes
 * @returns {Array} - Tableau de codes de rôles normalisés
 */
export const normalizeRolesArray = (roles, availableRoles = []) => {
  if (!Array.isArray(roles)) return [];
  
  return roles.map(role => {
    // Si c'est un nombre (ID), essayer de trouver le code correspondant
    if (typeof role === 'number') {
      const roleObj = availableRoles.find(r => r.IdRole === role || r.id === role);
      return roleObj ? (roleObj.CodeRole || roleObj.codeRole) : String(role);
    }
    
    // Si c'est une string, normaliser
    if (typeof role === 'string') {
      return normalizeRole(role);
    }
    
    return String(role);
  }).filter(Boolean); // Enlever les valeurs vides
};

/**
 * Valide qu'un rôle existe dans la liste des rôles disponibles
 */
export const isValidRole = (role) => {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return AVAILABLE_ROLES.some(availableRole => rolesMatch(normalized, availableRole));
};

