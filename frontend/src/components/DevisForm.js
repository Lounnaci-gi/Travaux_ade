import React, { useState, useEffect, useRef } from 'react';
import { getDemandes, getDevisTypes, getArticles, createDevis } from '../services/api';
import { alertSuccess, alertError } from '../ui/alerts';

const DevisForm = ({ user }) => {
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
        tauxTVAApplique: '',
        unite: ''
      }
    ]
  });

  const [demandes, setDemandes] = useState([]);
  const [devisTypes, setDevisTypes] = useState([]);
  const [availableArticles, setAvailableArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demande, setDemande] = useState(null);
  const [demandeSearch, setDemandeSearch] = useState('');
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [showDemandeDropdown, setShowDemandeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [demandesList, typesList, articlesList] = await Promise.all([
          getDemandes(),
          getDevisTypes(),
          getArticles()
        ]);
        setDemandes(demandesList || []);
        setDevisTypes(typesList || []);
        setAvailableArticles(articlesList || []);
        
        // Set default type if only one available
        if (typesList && typesList.length === 1) {
          setFormData(prev => ({
            ...prev,
            idTypeDevis: typesList[0].IdTypeDevis
          }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
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
      }
    }
    
    setFormData(prev => ({
      ...prev,
      articles: updatedArticles
    }));
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
      
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));
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
          tauxTVAApplique: '',
          unite: ''
        }
      ]
    }));
  };

  const removeArticle = (index) => {
    if (formData.articles.length > 1) {
      const updatedArticles = [...formData.articles];
      updatedArticles.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        articles: updatedArticles
      }));
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
          tauxTVAApplique: parseFloat(article.tauxTVAApplique)
        }))
      };
      
      await createDevis(devisData);
      setSuccess('Devis créé avec succès');
      alertSuccess('Succès', 'Devis créé avec succès');
      
      // Reset form
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
            tauxTVAApplique: '',
            unite: ''
          }
        ]
      });
      setDemande(null);
      setDemandeSearch('');
    } catch (err) {
      console.error('Erreur lors de la création du devis:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du devis');
      alertError('Erreur', err.response?.data?.message || 'Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
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
          setArticleSearch(prev => ({ ...prev, [index]: '' }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Créer un Devis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Créer un nouveau devis pour une demande de travaux
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Devis Information */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations du Devis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Rechercher une demande..."
                  autoComplete="off"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                {showDemandeDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ zIndex: 9999 }}>
                    {filteredDemandes.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto">
                        {filteredDemandes.map((d) => (
                          <li
                            key={d.IdDemande}
                            className="px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer text-gray-900 dark:text-white"
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
            
            {demande && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Ajouter un commentaire (optionnel)"
              />
            </div>
          </div>
          
          {/* Articles Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white">Articles</h3>
              <button
                type="button"
                onClick={addArticle}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajouter un article
              </button>
            </div>

            {formData.articles.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Article
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantité
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Prix Unitaire HT
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        TVA (%)
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Montant HT
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Montant TVA
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Montant TTC
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.articles.map((article, index) => {
                      const articleTotals = calculateArticleTotals(article);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="relative" ref={el => articleDropdownRefs.current[index] = el}>
                              {/* Searchable input for articles */}
                              <input
                                type="text"
                                value={article.designation || (article.idArticle ? availableArticles.find(a => a.IdArticle === article.idArticle)?.Designation || '' : '')}
                                onChange={(e) => {
                                  handleArticleChange(index, 'designation', e.target.value);
                                  setShowArticleDropdown(prev => ({ ...prev, [index]: true }));
                                }}
                                onFocus={() => setShowArticleDropdown(prev => ({ ...prev, [index]: true }))}
                                placeholder="Rechercher un article..."
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                              
                              {showArticleDropdown[index] && (
                                <div className="fixed mt-1 w-[500px] bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ zIndex: 9999, position: 'fixed' }}>
                                  <ul className="max-h-96 overflow-y-auto">
                                    {availableArticles
                                      .filter(art => 
                                        !article.designation || 
                                        art.Designation.toLowerCase().includes(article.designation.toLowerCase()) ||
                                        art.CodeArticle.toLowerCase().includes(article.designation.toLowerCase())
                                      )
                                      .map((art) => (
                                        <li
                                          key={art.IdArticle}
                                          className="px-4 py-3 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer text-gray-900 dark:text-white"
                                          onClick={() => {
                                            handleArticleSelect(index, art.IdArticle);
                                            setShowArticleDropdown(prev => ({ ...prev, [index]: false }));
                                          }}
                                        >
                                          <div className="font-medium text-base">{art.Designation}</div>
                                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-500 dark:text-gray-400">Code:</span>
                                              <span className="font-medium">{art.CodeArticle}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500 dark:text-gray-400">Unité:</span>
                                              <span className="font-medium">{art.Unite}</span>
                                            </div>
                                            {art.Diametre && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Diamètre:</span>
                                                <span className="font-medium">{art.Diametre}</span>
                                              </div>
                                            )}
                                            {art.Pression && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Pression:</span>
                                                <span className="font-medium">{art.Pression}</span>
                                              </div>
                                            )}
                                            {art.Couleur && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Couleur:</span>
                                                <span className="font-medium">{art.Couleur}</span>
                                              </div>
                                            )}
                                            {art.Matiere && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Matière:</span>
                                                <span className="font-medium">{art.Matiere}</span>
                                              </div>
                                            )}
                                            {art.Classe && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Classe:</span>
                                                <span className="font-medium">{art.Classe}</span>
                                              </div>
                                            )}
                                            {art.Longueur && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Longueur:</span>
                                                <span className="font-medium">{art.Longueur}</span>
                                              </div>
                                            )}
                                            {art.Largeur && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Largeur:</span>
                                                <span className="font-medium">{art.Largeur}</span>
                                              </div>
                                            )}
                                            {art.Epaisseur && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Épaisseur:</span>
                                                <span className="font-medium">{art.Epaisseur}</span>
                                              </div>
                                            )}
                                            {art.Caracteristiques && (
                                              <div className="col-span-2 flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Caractéristiques:</span>
                                                <span className="font-medium">{art.Caracteristiques}</span>
                                              </div>
                                            )}
                                            {art.PrixUnitaireHT !== undefined && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">Prix HT:</span>
                                                <span className="font-medium">{art.PrixUnitaireHT?.toFixed(2)} DZD</span>
                                              </div>
                                            )}
                                            {art.TauxTVA !== undefined && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">TVA:</span>
                                                <span className="font-medium">{art.TauxTVA?.toFixed(2)}%</span>
                                              </div>
                                            )}
                                          </div>
                                        </li>
                                      ))
                                    }
                                    {availableArticles
                                      .filter(art => 
                                        !article.designation || 
                                        art.Designation.toLowerCase().includes(article.designation.toLowerCase()) ||
                                        art.CodeArticle.toLowerCase().includes(article.designation.toLowerCase())
                                      )
                                      .length === 0 && (
                                        <li className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                          Aucun article trouvé
                                        </li>
                                      )
                                    }
                                  </ul>
                                </div>
                              )}
                              
                              {/* Hidden input to store the selected article ID */}
                              <input
                                type="hidden"
                                value={article.idArticle || ''}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={article.quantite}
                                onChange={(e) => handleArticleChange(index, 'quantite', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {article.unite}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={article.prixUnitaireHT}
                              onChange={(e) => handleArticleChange(index, 'prixUnitaireHT', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={article.tauxTVAApplique}
                              onChange={(e) => handleArticleChange(index, 'tauxTVAApplique', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {articleTotals.montantHT}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {articleTotals.montantTVA}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {articleTotals.montantTTC}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <button
                              type="button"
                              onClick={() => removeArticle(index)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td colSpan="4" className="px-4 py-2 text-sm font-medium text-right text-gray-900 dark:text-white">
                        Total
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        {totals.totalHT}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        {totals.totalTVA}
                      </td>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white">
                        {totals.totalTTC}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
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