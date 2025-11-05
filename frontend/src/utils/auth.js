// Fonction utilitaire pour vérifier si l'utilisateur est administrateur
export const isAdmin = (user) => {
  if (!user || !user.role) return false;
  // Vérifier différents formats possibles de rôle admin
  const role = user.role.toString().toLowerCase();
  return role === 'admin' || 
         role === 'administrateur' || 
         role.includes('admin') ||
         user.CodeRole === 'ADMIN' ||
         user.CodeRole === 'admin';
};

