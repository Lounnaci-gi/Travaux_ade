// Fonction utilitaire pour vérifier si l'accès à l'aperçu est autorisé
export const isPreviewAccessAllowed = (formData, demande) => {
  // Vérifier si une demande est sélectionnée et s'il y a des articles
  const hasDemande = formData.idDemande && demande;
  const hasArticles = formData.articles.some(article => 
    article.idArticle && article.designation
  );
  
  return hasDemande && hasArticles;
};