// Fonction utilitaire pour vérifier si l'utilisateur est administrateur
export const isAdmin = (user) => {
  if (!user || !user.role) return false;
  // Vérifier différents formats possibles de rôle admin
  const role = user.role.toString().toLowerCase();
  return role === 'admin' || 
         role === 'administrateur' || 
         role.includes('admin') ||
         user.CodeRole === 'ADMIN' ||
         user.CodeRole === 'admin' ||
         user.codeRole === 'ADMIN' ||
         user.codeRole === 'admin';
};

// Fonction utilitaire pour vérifier si l'utilisateur est chef de centre
export const isChefCentre = (user) => {
  if (!user || !user.codeRole) return false;
  const codeRole = user.codeRole.toString().toLowerCase();
  return codeRole.includes('chef') && codeRole.includes('centre');
};

// Fonction pour vérifier si l'utilisateur est chef service juridique
export const isChefServiceJuridique = (user) => {
  if (!user || !user.codeRole) return false;
  const codeRole = user.codeRole.toString().toLowerCase();
  return codeRole.includes('chef') && (codeRole.includes('juridique') || codeRole.includes('jurid'));
};

// Fonction pour vérifier si l'utilisateur est chef d'agence commerciale
export const isChefAgenceCommerciale = (user) => {
  if (!user || !user.codeRole) return false;
  const codeRole = user.codeRole.toString().toLowerCase();
  return codeRole.includes('chef') && codeRole.includes('agence') && codeRole.includes('commerciale');
};

// Fonction pour vérifier si l'utilisateur peut consulter les demandes pour validation
export const canViewDemandesForValidation = (user) => {
  if (!user) return false;
  return isAdmin(user) || isChefServiceJuridique(user) || isChefAgenceCommerciale(user);
};

// Fonction pour vérifier si l'utilisateur peut modifier/supprimer un autre utilisateur
export const canModifyUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  
  // Admin peut modifier n'importe quel utilisateur
  if (isAdmin(currentUser)) return true;
  
  // Chef de centre peut modifier seulement les utilisateurs de son centre
  if (isChefCentre(currentUser)) {
    return currentUser.idCentre && targetUser.IdCentre && 
           Number(currentUser.idCentre) === Number(targetUser.IdCentre);
  }
  
  // Autres utilisateurs peuvent modifier seulement leurs propres informations
  return Number(currentUser.id) === Number(targetUser.IdUtilisateur);
};

// Fonction pour vérifier si l'utilisateur peut supprimer un autre utilisateur
export const canDeleteUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  
  // Admin peut supprimer n'importe quel utilisateur
  if (isAdmin(currentUser)) return true;
  
  // Chef de centre peut supprimer seulement les utilisateurs de son centre
  if (isChefCentre(currentUser)) {
    return currentUser.idCentre && targetUser.IdCentre && 
           Number(currentUser.idCentre) === Number(targetUser.IdCentre);
  }
  
  // Autres utilisateurs ne peuvent pas supprimer de compte (même le leur)
  return false;
};

