import React, { useState, useEffect, useCallback } from 'react';
import { getDevis } from '../services/api';

const DevisDetail = ({ devisId, onBack }) => {
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDevis = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDevis(devisId);
      setDevis(data);
    } catch (err) {
      console.error('Erreur lors du chargement du devis:', err);
      setError('Erreur lors du chargement du devis');
    } finally {
      setLoading(false);
    }
  }, [devisId]);

  useEffect(() => {
    loadDevis();
  }, [loadDevis]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </button>
        </div>
        <div className="glass-card p-6">
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </button>
        </div>
        <div className="glass-card p-6">
          <div className="text-gray-600 dark:text-gray-400">Devis non trouvé</div>
        </div>
      </div>
    );
  }

  // Function to get type label from Remarque field
  const getTypeLabel = (remarque) => {
    switch (remarque) {
      case 'FOURNITURE':
        return 'Fourniture';
      case 'POSE':
        return 'Pose';
      case 'BOTH':
        return 'Les deux';
      default:
        return remarque || 'Non spécifié';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour
        </button>
      </div>

      <div className="space-y-6">
        {/* Devis Header */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devis #{devis.NumeroDevis}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Créé le {new Date(devis.DateCreation).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                devis.EstValide 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
              }`}>
                {devis.EstValide ? 'Validé' : 'En attente'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type de Devis</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{devis.LibelleTypeDevis}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Demande Associée</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{devis.NumeroDemande}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {devis.Client}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {devis.AdresseResidence}, {devis.CommuneResidence}
              </p>
            </div>
          </div>
          
          {devis.Commentaire && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Commentaire</h3>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{devis.Commentaire}</p>
            </div>
          )}
        </div>

        {/* Articles */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Articles</h2>
          
          {devis.articles && devis.articles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Désignation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Prix Unitaire HT
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      TVA (%)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Montant HT
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Montant TVA
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Montant TTC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {devis.articles.map((article) => (
                    <tr key={article.IdDevisArticle}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {article.Designation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getTypeLabel(article.Remarque)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {article.Quantite} {article.Unite}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {article.PrixUnitaireHT?.toFixed(2)} DZD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {article.TauxTVAApplique?.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {article.MontantHT?.toFixed(2)} DZD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {article.MontantTVA?.toFixed(2)} DZD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {article.MontantTTC?.toFixed(2)} DZD
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan="5" className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {devis.MontantTotalHT?.toFixed(2)} DZD
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {devis.MontantTotalTVA?.toFixed(2)} DZD
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      {devis.MontantTotalTTC?.toFixed(2)} DZD
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Aucun article trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevisDetail;