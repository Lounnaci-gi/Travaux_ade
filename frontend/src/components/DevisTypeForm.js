import React, { useState, useEffect } from 'react';
import { getDevisTypes, createDevisType, updateDevisType } from '../services/api';

const DevisTypeForm = ({ user, onUnauthorized }) => {
  const [devisTypes, setDevisTypes] = useState([]);
  const [formData, setFormData] = useState({
    LibelleTypeDevis: '',
    ValidationChefServiceTechnicoCommercialRequise: false,
    ValidationChefCentreRequise: false,
    ValidationChefAgenceRequise: false,
    Actif: true
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDevisTypes();
  }, []);

  const loadDevisTypes = async () => {
    try {
      const data = await getDevisTypes();
      setDevisTypes(data);
    } catch (err) {
      console.error('Erreur lors du chargement des types de devis:', err);
      setError('Erreur lors du chargement des types de devis');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!formData.LibelleTypeDevis.trim()) {
        throw new Error('Le libellé du type de devis est requis');
      }
      
      if (editingId) {
        // Update existing type
        await updateDevisType(editingId, formData);
        setSuccess('Type de devis mis à jour avec succès!');
      } else {
        // Create new type
        await createDevisType(formData);
        setSuccess('Type de devis créé avec succès!');
      }
      
      // Reset form and reload data
      setFormData({
        LibelleTypeDevis: '',
        ValidationChefServiceTechnicoCommercialRequise: false,
        ValidationChefCentreRequise: false,
        ValidationChefAgenceRequise: false,
        Actif: true
      });
      setEditingId(null);
      loadDevisTypes();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du type de devis:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement du type de devis');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type) => {
    setFormData({
      LibelleTypeDevis: type.LibelleTypeDevis,
      ValidationChefServiceTechnicoCommercialRequise: type.ValidationChefServiceTechnicoCommercialRequise,
      ValidationChefCentreRequise: type.ValidationChefCentreRequise,
      ValidationChefAgenceRequise: type.ValidationChefAgenceRequise,
      Actif: type.Actif
    });
    setEditingId(type.IdTypeDevis);
  };

  const handleCancelEdit = () => {
    setFormData({
      LibelleTypeDevis: '',
      ValidationChefServiceTechnicoCommercialRequise: false,
      ValidationChefCentreRequise: false,
      ValidationChefAgenceRequise: false,
      Actif: true
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce type de devis?')) {
      try {
        // TODO: Implement delete API call
        console.log('Delete devis type with ID:', id);
        setSuccess('Type de devis supprimé avec succès!');
        loadDevisTypes();
      } catch (err) {
        console.error('Erreur lors de la suppression du type de devis:', err);
        setError('Erreur lors de la suppression du type de devis');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Types de Devis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérer les types de devis et leurs validations requises
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-center text-red-700 dark:text-red-300">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-center text-green-700 dark:text-green-300">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingId ? 'Modifier un Type de Devis' : 'Créer un Type de Devis'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="LibelleTypeDevis" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Libellé du Type de Devis *
            </label>
            <input
              type="text"
              id="LibelleTypeDevis"
              name="LibelleTypeDevis"
              value={formData.LibelleTypeDevis}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Devis Standard, Devis Urgent..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ValidationChefServiceTechnicoCommercialRequise"
                name="ValidationChefServiceTechnicoCommercialRequise"
                checked={formData.ValidationChefServiceTechnicoCommercialRequise}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ValidationChefServiceTechnicoCommercialRequise" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Validation Chef Service Technico-Commercial requise
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ValidationChefCentreRequise"
                name="ValidationChefCentreRequise"
                checked={formData.ValidationChefCentreRequise}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ValidationChefCentreRequise" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Validation Chef de Centre requise
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ValidationChefAgenceRequise"
                name="ValidationChefAgenceRequise"
                checked={formData.ValidationChefAgenceRequise}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ValidationChefAgenceRequise" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Validation Chef d'Agence requise
              </label>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="Actif"
              name="Actif"
              checked={formData.Actif}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="Actif" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Actif
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingId ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                editingId ? 'Mettre à jour' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Types de Devis Existant</h2>
        
        {devisTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium">Aucun type de devis</h3>
            <p className="mt-1 text-sm">
              Commencez par créer un nouveau type de devis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Libellé
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Validations Requises
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {devisTypes.map((type) => (
                  <tr key={type.IdTypeDevis} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {type.LibelleTypeDevis}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col space-y-1">
                        {type.ValidationChefServiceTechnicoCommercialRequise && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
                            Chef Service TC
                          </span>
                        )}
                        {type.ValidationChefCentreRequise && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300">
                            Chef de Centre
                          </span>
                        )}
                        {type.ValidationChefAgenceRequise && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300">
                            Chef d'Agence
                          </span>
                        )}
                        {!type.ValidationChefServiceTechnicoCommercialRequise && 
                         !type.ValidationChefCentreRequise && 
                         !type.ValidationChefAgenceRequise && (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Aucune validation requise</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        type.Actif 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
                      }`}>
                        {type.Actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(type.IdTypeDevis)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevisTypeForm;