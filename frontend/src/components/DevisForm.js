import React, { useState, useEffect, useRef } from 'react';
import { getDemandes, getDevisTypes, getArticles, getFamilles, createDevis, getTVADefault } from '../services/api';
import { alertSuccess, alertError } from '../ui/alerts';

const DevisForm = ({ user }) => {
  const [globalTVA, setGlobalTVA] = useState('00');
  
  // Nouvelle structure : grouper par famille
  const [formData, setFormData] = useState({
    idDemande: '',
    idTypeDevis: '',
    commentaire: '',
    articles: [
      {
        idArticle: '',
        designation: '',
        quantite: '',
        prixUnitaireHT: '',
        tauxTVAApplique: '00',
        unite: '',
        typePrix: 'FOURNITURE'
      }
    ]
  });

  const [demandes, setDemandes] = useState([]);
  const [devisTypes, setDevisTypes] = useState([]);
  const [availableArticles, setAvailableArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demande, setDemande] = useState(null);
  const [demandeSearch, setDemandeSearch] = useState('');
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [showDemandeDropdown, setShowDemandeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Load global TVA rate from ConfigurationGlobale
  useEffect(() => {
    const loadGlobalTVA = async () => {
      try {
        const tvaConfig = await getTVADefault();
        if (tvaConfig && tvaConfig.Valeur) {
          setGlobalTVA(tvaConfig.Valeur);
          // Update existing articles with the loaded TVA rate
          setFormData(prev => ({
            ...prev,
            articles: prev.articles.map(article => ({
              ...article,
              tauxTVAApplique: article.tauxTVAApplique || tvaConfig.Valeur
            }))
          }));
        }
      } catch (err) {
        // Keep default TVA rate if error
        console.error('Erreur lors du chargement de la TVA:', err);
      }
    };
    loadGlobalTVA();
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [demandesList, typesList, articlesList, famillesList] = await Promise.all([
          getDemandes(),
          getDevisTypes(),
          getArticles(),
          getFamilles()
        ]);
        setDemandes(demandesList || []);
        setDevisTypes(typesList || []);
        setAvailableArticles(articlesList || []);
        setFamilles(famillesList || []);
        
        // Set default type if only one available
        if (typesList && typesList.length === 1) {
          setFormData(prev => ({
            ...prev,
            idTypeDevis: typesList[0].IdTypeDevis
          }));
        }
      } catch (err) {
        setError('Erreur lors du chargement des données');
      }
    };

    loadData();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDemandeDropdown(false);
        setDemandeSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter demandes based on search
  useEffect(() => {
    if (demandeSearch) {
      const filtered = demandes.filter(d => 
        d.NumeroDemande.toLowerCase().includes(demandeSearch.toLowerCase()) ||
        `${d.ClientNom} ${d.ClientPrenom}`.toLowerCase().includes(demandeSearch.toLowerCase())
      );
      setFilteredDemandes(filtered);
    } else {
      setFilteredDemandes(demandes);
    }
  }, [demandeSearch, demandes]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleDemandeSearchChange = (e) => {
    const value = e.target.value;
    setDemandeSearch(value);
    setFormData(prev => ({
      ...prev,
      idDemande: value
    }));
    setShowDemandeDropdown(true);
  };

  const handleDemandeSelect = (selectedDemande) => {
    setDemande(selectedDemande);
    setFormData(prev => ({
      ...prev,
      idDemande: selectedDemande.IdDemande
    }));
    setDemandeSearch('');
    setShowDemandeDropdown(false);
  };

  const handleArticleChange = (index, field, value) => {
    const updatedArticles = [...formData.articles];
    updatedArticles[index] = {
      ...updatedArticles[index],
      [field]: value
    };
    
    // If we're changing the article, update designation and unit
    if (field === 'idArticle') {
      const selectedArticle = availableArticles.find(a => a.IdArticle === value);
      if (selectedArticle) {
        updatedArticles[index].designation = selectedArticle.Designation;
        updatedArticles[index].unite = selectedArticle.Unite;
        // Set default price based on typePrix selection
        if (updatedArticles[index].typePrix === 'FOURNITURE' && selectedArticle.PrixFournitureHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
        } else if (updatedArticles[index].typePrix === 'POSE' && selectedArticle.PrixPoseHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
        } else if (updatedArticles[index].typePrix === 'BOTH') {
          // For BOTH, we'll use fourniture price as default
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT || selectedArticle.PrixPoseHT || '';
        }
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVA || globalTVA;
      }
    }
    
    // If we're changing the typePrix, update the price
    if (field === 'typePrix') {
      const selectedArticle = availableArticles.find(a => a.IdArticle === updatedArticles[index].idArticle);
      if (selectedArticle) {
        if (value === 'FOURNITURE' && selectedArticle.PrixFournitureHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
        } else if (value === 'POSE' && selectedArticle.PrixPoseHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
        } else if (value === 'BOTH') {
          // For BOTH, we'll sum the prices
          const fourniturePrice = parseFloat(selectedArticle.PrixFournitureHT) || 0;
          const posePrice = parseFloat(selectedArticle.PrixPoseHT) || 0;
          updatedArticles[index].prixUnitaireHT = (fourniturePrice + posePrice).toString();
        } else {
          updatedArticles[index].prixUnitaireHT = '';
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      articles: updatedArticles
    }));
    
    // Clear the search text when manually changing the designation
    if (field === 'designation') {
      setArticleSearch(prev => ({ ...prev, [index]: '' }));
    }
  };

  // New function to handle quick article addition
  // eslint-disable-next-line no-unused-vars
  const handleQuickAddArticle = (index, articleCode) => {
    // Find article by code
    const selectedArticle = availableArticles.find(a => a.CodeArticle === articleCode);
    if (selectedArticle) {
      handleArticleSelect(index, selectedArticle.IdArticle);
      setShowArticleDropdown(prev => ({ ...prev, [index]: false }));
    }
  };

  // New function to duplicate an article
  const duplicateArticle = (index) => {
    const articleToDuplicate = formData.articles[index];
    const duplicatedArticle = { ...articleToDuplicate };
    
    setFormData(prev => ({
      ...prev,
      articles: [
        ...prev.articles,
        duplicatedArticle
      ]
    }));
    
    // Initialize the article search state for the new index
    const newIndex = formData.articles.length;
    setArticleSearch(prev => ({ ...prev, [newIndex]: duplicatedArticle.designation }));
    setShowArticleDropdown(prev => ({ ...prev, [newIndex]: false }));
  };

  const handleArticleSelect = (index, articleId) => {
    const selectedArticle = availableArticles.find(a => a.IdArticle === articleId);
    if (selectedArticle) {
      const updatedArticles = [...formData.articles];
      updatedArticles[index] = {
        ...updatedArticles[index],
        idArticle: articleId,
        designation: selectedArticle.Designation,
        unite: selectedArticle.Unite
      };
      
      // Set price based on current typePrix selection
      if (updatedArticles[index].typePrix === 'FOURNITURE' && selectedArticle.PrixFournitureHT) {
        updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
      } else if (updatedArticles[index].typePrix === 'POSE' && selectedArticle.PrixPoseHT) {
        updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
      } else if (updatedArticles[index].typePrix === 'BOTH') {
        // For BOTH, we'll sum the prices
        const fourniturePrice = parseFloat(selectedArticle.PrixFournitureHT) || 0;
        const posePrice = parseFloat(selectedArticle.PrixPoseHT) || 0;
        updatedArticles[index].prixUnitaireHT = (fourniturePrice + posePrice).toString();
      }
      
      // Set TVA if available, otherwise use global TVA
      if (selectedArticle.TauxTVA) {
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVA.toString();
      } else {
        updatedArticles[index].tauxTVAApplique = globalTVA;
      }
      
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));
      
      // Update the search text to show the selected article's designation
      setArticleSearch(prev => ({ ...prev, [index]: selectedArticle.Designation }));
    }
  };

  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [
        ...prev.articles,
        {
          idArticle: '',
          designation: '',
          quantite: '',
          prixUnitaireHT: '',
          tauxTVAApplique: globalTVA,
          unite: '',
          typePrix: 'FOURNITURE' // Add this field - default to Fourniture
        }
      ]
    }));
    
    // Initialize the article search state for the new index
    const newIndex = formData.articles.length;
    setArticleSearch(prev => ({ ...prev, [newIndex]: '' }));
    setShowArticleDropdown(prev => ({ ...prev, [newIndex]: false }));
  };

  
  // New function to add multiple articles at once
  // eslint-disable-next-line no-unused-vars
  const addMultipleArticles = (count) => {
    const newArticles = Array(count).fill().map(() => ({
      idArticle: '',
      designation: '',
      quantite: '',
      prixUnitaireHT: '',
      tauxTVAApplique: globalTVA,
      unite: '',
      typePrix: 'FOURNITURE'
    }));
    
    setFormData(prev => ({
      ...prev,
      articles: [
        ...prev.articles,
        ...newArticles
      ]
    }));
    
    // Initialize the article search state for the new indices
    const startIndex = formData.articles.length;
    const newSearchState = { ...articleSearch };
    const newDropdownState = { ...showArticleDropdown };
    
    for (let i = 0; i < count; i++) {
      const newIndex = startIndex + i;
      newSearchState[newIndex] = '';
      newDropdownState[newIndex] = false;
    }
    
    setArticleSearch(newSearchState);
    setShowArticleDropdown(newDropdownState);
  };

  const clearAndRemoveArticle = (index) => {
    if (formData.articles.length > 1) {
      // First clear the article content
      const updatedArticles = [...formData.articles];
      updatedArticles[index] = {
        idArticle: '',
        designation: '',
        quantite: '',
        prixUnitaireHT: '',
        tauxTVAApplique: globalTVA,
        unite: '',
        typePrix: 'FOURNITURE'
      };
      
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));
      
      // Also clear the article search state for this index
      setArticleSearch(prev => ({
        ...prev,
        [index]: ''
      }));
      
      // Also close the dropdown for this index
      setShowArticleDropdown(prev => ({
        ...prev,
        [index]: false
      }));
      
      // Then remove the article after a short delay to allow UI to update
      setTimeout(() => {
        const finalArticles = [...formData.articles];
        finalArticles.splice(index, 1);
        setFormData(prev => ({
          ...prev,
          articles: finalArticles
        }));
        
        // Also remove the article search state for this index
        setArticleSearch(prev => {
          const newState = { ...prev };
          delete newState[index];
          return newState;
        });
        
        // Also remove the dropdown state for this index
        setShowArticleDropdown(prev => {
          const newState = { ...prev };
          delete newState[index];
          return newState;
        });
      }, 100);
    }
  };
  
  const removeArticle = (index) => {
    if (formData.articles.length > 1) {
      const updatedArticles = [...formData.articles];
      updatedArticles.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));
      
      // Also remove the article search state for this index
      setArticleSearch(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
      
      // Also remove the dropdown state for this index
      setShowArticleDropdown(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }
  };

  const calculateArticleTotals = (article) => {
    const quantite = parseFloat(article.quantite) || 0;
    const prixUnitaireHT = parseFloat(article.prixUnitaireHT) || 0;
    const tauxTVA = parseFloat(article.tauxTVAApplique) || 0;
    
    const montantHT = quantite * prixUnitaireHT;
    const montantTVA = montantHT * (tauxTVA / 100);
    const montantTTC = montantHT + montantTVA;
    
    return {
      montantHT: montantHT.toFixed(2),
      montantTVA: montantTVA.toFixed(2),
      montantTTC: montantTTC.toFixed(2)
    };
  };

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;
    
    formData.articles.forEach(article => {
      const totals = calculateArticleTotals(article);
      totalHT += parseFloat(totals.montantHT);
      totalTVA += parseFloat(totals.montantTVA);
    });
    
    const totalTTC = totalHT + totalTVA;
    
    return {
      totalHT: totalHT.toFixed(2),
      totalTVA: totalTVA.toFixed(2),
      totalTTC: totalTTC.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.idDemande) {
      setError('Veuillez sélectionner une demande');
      return;
    }
    
    if (!formData.idTypeDevis) {
      setError('Veuillez sélectionner un type de devis');
      return;
    }
    
    // Validate articles
    for (let i = 0; i < formData.articles.length; i++) {
      const article = formData.articles[i];
      if (!article.idArticle) {
        setError(`Veuillez sélectionner un article à la ligne ${i + 1}`);
        return;
      }
      if (!article.quantite || parseFloat(article.quantite) <= 0) {
        setError(`Veuillez saisir une quantité valide à la ligne ${i + 1}`);
        return;
      }
      if (!article.prixUnitaireHT || parseFloat(article.prixUnitaireHT) < 0) {
        setError(`Veuillez saisir un prix unitaire valide à la ligne ${i + 1}`);
        return;
      }
      if (parseFloat(article.tauxTVAApplique) < 0 || parseFloat(article.tauxTVAApplique) > 100) {
        setError(`Veuillez saisir un taux de TVA valide (0-100%) à la ligne ${i + 1}`);
        return;
      }
    }
    
    try {
      setLoading(true);
      const devisData = {
        idDemande: formData.idDemande,
        idTypeDevis: formData.idTypeDevis,
        commentaire: formData.commentaire,
        articles: formData.articles.map(article => ({
          idArticle: article.idArticle,
          quantite: parseFloat(article.quantite),
          prixUnitaireHT: parseFloat(article.prixUnitaireHT),
          tauxTVAApplique: parseFloat(article.tauxTVAApplique),
          typePrix: article.typePrix // Include the typePrix field
        }))
      };
      
      await createDevis(devisData);
      setSuccess('Devis créé avec succès');
      alertSuccess('Succès', 'Devis créé avec succès');
      
      // Reset form
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du devis');
      alertError('Erreur', err.response?.data?.message || 'Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      idDemande: '',
      idTypeDevis: formData.idTypeDevis, // Keep the same type
      commentaire: '',
      articles: [
        {
          idArticle: '',
          designation: '',
          quantite: '',
          prixUnitaireHT: '',
          tauxTVAApplique: globalTVA,
          unite: '',
          typePrix: 'FOURNITURE' // Add this field - default to Fourniture
        }
      ]
    });
    setDemande(null);
    setDemandeSearch('');
    setArticleSearch({});
    setShowArticleDropdown({});
  };

  const [articleSearch, setArticleSearch] = useState({});
  const [showArticleDropdown, setShowArticleDropdown] = useState({});
  const articleDropdownRefs = useRef({});

  // Handle click outside to close article dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.entries(articleDropdownRefs.current).forEach(([index, ref]) => {
        if (ref && !ref.contains(event.target)) {
          setShowArticleDropdown(prev => ({ ...prev, [index]: false }));
          // Only clear the search text if no article is selected for this index
          const articleId = formData.articles[parseInt(index)]?.idArticle;
          if (!articleId) {
            setArticleSearch(prev => ({ ...prev, [index]: '' }));
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formData.articles]);

  return (
    <div className="max-w-7xl mx-auto p-6 w-full">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Créer un Devis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créer un nouveau devis pour une demande de travaux
          </p>
        </div>
        
        {/* Sélecteurs en haut à droite */}
        <div className="w-80 space-y-3">
          {/* Numéro de Demande */}
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="idDemande" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numéro de Demande *
            </label>
            <div className="relative">
              <input
                type="text"
                id="idDemande"
                name="idDemande"
                value={demandeSearch}
                onChange={handleDemandeSearchChange}
                onFocus={() => setShowDemandeDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Rechercher une demande..."
                autoComplete="off"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {showDemandeDropdown && (
                <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ zIndex: 10000 }}>
                  {filteredDemandes.length > 0 ? (
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredDemandes.map((d) => (
                        <li
                          key={d.IdDemande}
                          className="px-4 py-2 hover:bg-primary-100 dark:hover:bg-primary-900 cursor-pointer text-gray-900 dark:text-white"
                          onClick={() => handleDemandeSelect(d)}
                        >
                          <div className="font-medium">{d.NumeroDemande}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {d.ClientNom} {d.ClientPrenom}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                      Aucune demande trouvée
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Type de Devis */}
          <div>
            <label htmlFor="idTypeDevis" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type de Devis *
            </label>
            <select
              id="idTypeDevis"
              name="idTypeDevis"
              value={formData.idTypeDevis}
              onChange={handleInputChange}
              required
              className="select-field w-full px-3 py-2"
            >
              <option value="">Sélectionner un type de devis</option>
              {devisTypes.map(type => (
                <option key={type.IdTypeDevis} value={type.IdTypeDevis}>
                  {type.LibelleTypeDevis}
                </option>
              ))}
            </select>
          </div>
        </div>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Devis Information */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations du Devis</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {demande && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Numéro de Demande
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {demande.NumeroDemande}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {demande.ClientNom} {demande.ClientPrenom}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type de Demande
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {demande.TypeDemande}
                  </p>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="commentaire" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commentaire
              </label>
              <textarea
                id="commentaire"
                name="commentaire"
                value={formData.commentaire}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Ajouter un commentaire (optionnel)"
              />
            </div>
          </div>
          
          {/* Articles Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Articles</h3>
            </div>

            {/* Articles Container - Maximum width */}
            <div className="space-y-3 w-full">
              {formData.articles.map((article, index) => {
                const articleTotals = calculateArticleTotals(article);
                return (
                  <div key={index} className="glass-card p-3 rounded-md w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full">
                      {/* Article Search - Reduced width */}
                      <div className="lg:col-span-5 relative" ref={el => articleDropdownRefs.current[index] = el}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Article *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={articleSearch[index] || ''}
                            onChange={(e) => {
                              setArticleSearch(prev => ({ ...prev, [index]: e.target.value }));
                              setShowArticleDropdown(prev => ({ ...prev, [index]: true }));
                            }}
                            onFocus={() => setShowArticleDropdown(prev => ({ ...prev, [index]: true }))}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="Rechercher un article..."
                            autoComplete="off"
                          />
                          
                          {/* Dropdown - Full width and no scrollbars */}
                          {showArticleDropdown[index] && (
                            <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow rounded overflow-hidden border border-gray-200 dark:border-gray-700 z-50">
                              <div className="max-h-48 overflow-y-auto">
                                {(() => {
                                  const filteredArts = availableArticles.filter(art => 
                                    !articleSearch[index] || 
                                    art.Designation.toLowerCase().includes(articleSearch[index].toLowerCase()) ||
                                    art.CodeArticle.toLowerCase().includes(articleSearch[index].toLowerCase()) ||
                                    (art.LibelleFamille && art.LibelleFamille.toLowerCase().includes(articleSearch[index].toLowerCase()))
                                  );
                                  
                                  // Group articles by family
                                  const groupedByFamily = filteredArts.reduce((acc, art) => {
                                    const familleKey = art.LibelleFamille || 'Sans famille';
                                    if (!acc[familleKey]) {
                                      acc[familleKey] = [];
                                    }
                                    acc[familleKey].push(art);
                                    return acc;
                                  }, {});
                                  
                                  const familyKeys = Object.keys(groupedByFamily).sort();
                                  
                                  if (familyKeys.length === 0) {
                                    return (
                                      <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                                        <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="mt-1 text-xs font-medium">Aucun article trouvé</h3>
                                      </div>
                                    );
                                  }
                                  
                                  return familyKeys.map(familleKey => (
                                    <div key={familleKey}>
                                      {/* Family Header */}
                                      <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 px-3 py-1.5 border-b border-primary-500 dark:border-primary-600">
                                        <h4 className="text-xs font-semibold text-white flex items-center">
                                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                          </svg>
                                          {familleKey}
                                          <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-white/20 text-white">
                                            {groupedByFamily[familleKey].length}
                                          </span>
                                        </h4>
                                      </div>
                                      {/* Family Articles */}
                                      {groupedByFamily[familleKey].map((art) => (
                                        <div
                                          key={art.IdArticle}
                                          className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm"
                                          onClick={() => {
                                            handleArticleSelect(index, art.IdArticle);
                                            setShowArticleDropdown(prev => ({ ...prev, [index]: false }));
                                          }}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <div className="font-medium text-gray-900 dark:text-white text-sm">{art.Designation}</div>
                                              <div className="flex items-center mt-0.5 space-x-2">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                  {art.CodeArticle}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {art.Unite}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex flex-col items-end space-y-0.5">
                                              {art.PrixFournitureHT && (
                                                <div className="text-green-600 dark:text-green-400 text-xs">
                                                  F: {parseFloat(art.PrixFournitureHT).toFixed(2)}
                                                </div>
                                              )}
                                              {art.PrixPoseHT && (
                                                <div className="text-purple-600 dark:text-purple-400 text-xs">
                                                  P: {parseFloat(art.PrixPoseHT).toFixed(2)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Hidden input to store the selected article ID */}
                        <input
                          type="hidden"
                          value={article.idArticle || ''}
                        />
                      </div>
                      
                      {/* Article Details - Takes remaining space */}
                      <div className="lg:col-span-7">
                        <div className="flex flex-wrap gap-1 items-start">
                          {/* Type de Prix */}
                          <div className="flex-1 min-w-[70px]">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Type
                            </label>
                            <select
                              value={article.typePrix || 'FOURNITURE'}
                              onChange={(e) => handleArticleChange(index, 'typePrix', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="FOURNITURE">F</option>
                              <option value="POSE">P</option>
                              <option value="BOTH">F+P</option>
                            </select>
                          </div>
                          
                          {/* Quantité */}
                          <div className="flex-1 min-w-[70px]">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qté
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={article.quantite}
                                onChange={(e) => handleArticleChange(index, 'quantite', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                              {article.unite && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                                  {article.unite}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Prix Unitaire */}
                          <div className="flex-1 min-w-[70px]">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Prix HT
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={article.prixUnitaireHT}
                                onChange={(e) => handleArticleChange(index, 'prixUnitaireHT', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                                DZD
                              </div>
                            </div>
                          </div>
                          
                          {/* TVA */}
                          <div className="flex-1 min-w-[70px]">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              TVA
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={article.tauxTVAApplique}
                                onChange={(e) => handleArticleChange(index, 'tauxTVAApplique', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                                %
                              </div>
                            </div>
                          </div>
                          
                          {/* HT Total */}
                          <div className="flex-1 min-w-[70px] bg-gray-50 dark:bg-gray-700 p-1 rounded text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">HT</div>
                            <div className="text-xs font-semibold text-gray-900 dark:text-white">{articleTotals.montantHT}</div>
                          </div>
                          
                          {/* TVA Total */}
                          <div className="flex-1 min-w-[70px] bg-gray-50 dark:bg-gray-700 p-1 rounded text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">TVA</div>
                            <div className="text-xs font-semibold text-gray-900 dark:text-white">{articleTotals.montantTVA}</div>
                          </div>
                          
                          {/* TTC */}
                          <div className="flex-1 min-w-[70px] p-1 rounded text-center">
                            <div className="text-xs text-primary-500">TTC</div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white">{articleTotals.montantTTC}</div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => clearAndRemoveArticle(index)}
                              className="px-2 py-1.5 bg-red-100 dark:bg-red-900/50 border border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 text-xs rounded"
                              title="Supprimer"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={addArticle}
                              className="px-2 py-1.5 bg-green-100 dark:bg-green-900/50 border border-gray-300 dark:border-gray-600 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 text-xs rounded"
                              title="Ajouter"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Empty State */}
            {formData.articles.length === 0 && (
              <div className="text-center py-6">
                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun article</h3>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={addArticle}
                    className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Form Summary */}
          {formData.articles.length > 0 && (
            <div className="mt-5 glass-card p-3 rounded-md">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total HT</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">{totals.totalHT} DZD</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total TVA</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">{totals.totalTVA} DZD</div>
                </div>
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-2 rounded">
                  <div className="text-xs text-primary-100">Total TTC</div>
                  <div className="text-base font-bold text-white">{totals.totalTTC} DZD</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Création en cours...
              </>
            ) : (
              'Créer le Devis'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DevisForm;