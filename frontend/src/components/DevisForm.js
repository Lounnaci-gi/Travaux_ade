import React, { useState, useEffect, useRef } from 'react';
import { getDemandes, getDevisTypes, getArticles, getFamilles, createDevis, getTVADefault, getAgenceById, getCentreById, getNextDevisNumber } from '../services/api';
import { alertSuccess, alertError } from '../ui/alerts';
import { formatNumberWithThousands } from '../utils/numberFormat';

const DevisForm = ({ user }) => {
  const [globalTVA, setGlobalTVA] = useState('00');
  const [activeTab, setActiveTab] = useState('form');
  
  // State for center and agency information
  const [centreInfo, setCentreInfo] = useState(null);
  const [agenceInfo, setAgenceInfo] = useState(null);
  
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
  const [showDescription, setShowDescription] = useState(false);
  const [devisCode, setDevisCode] = useState(''); // New state for devis code
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
    
    // Generate devis code when demande is selected
    generateDevisCode(selectedDemande);
    
    // Fetch agency and center information
    fetchAgenceAndCentreInfo(selectedDemande.IdAgence);
  };

  // New function to fetch agency and center information
  const fetchAgenceAndCentreInfo = async (idAgence) => {
    try {
      // Fetch agency information
      const agenceData = await getAgenceById(idAgence);
      setAgenceInfo(agenceData);
      
      // Fetch center information using the center ID from agency data
      if (agenceData && agenceData.IdCentre) {
        const centreData = await getCentreById(agenceData.IdCentre);

        setCentreInfo(centreData);
      }
    } catch (error) {
      console.error('Error fetching agency or center information:', error);
    }
  };
  
  // New function to generate devis code
  const generateDevisCode = async (selectedDemande) => {
    try {
      // Get the next devis number from the backend
      const result = await getNextDevisNumber(selectedDemande.IdDemande);
      setDevisCode(result.nextDevisNumber);
    } catch (error) {
      console.error('Error generating devis code:', error);
      setDevisCode(''); // Clear the code if there's an error
    }
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
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
        } else if (updatedArticles[index].typePrix === 'POSE' && selectedArticle.PrixPoseHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
        } else if (updatedArticles[index].typePrix === 'BOTH') {
          // For BOTH, we'll use fourniture price as default
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT || selectedArticle.PrixPoseHT || '';
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || selectedArticle.TauxTVAPose || globalTVA;
        } else {
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVA || globalTVA;
        }
      }
    }
    
    // If we're changing the typePrix, update the price and TVA
    if (field === 'typePrix') {
      const selectedArticle = availableArticles.find(a => a.IdArticle === updatedArticles[index].idArticle);
      if (selectedArticle) {
        if (value === 'FOURNITURE' && selectedArticle.PrixFournitureHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
        } else if (value === 'POSE' && selectedArticle.PrixPoseHT) {
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
        } else if (value === 'BOTH') {
          // For BOTH, we'll sum the prices
          const fourniturePrice = parseFloat(selectedArticle.PrixFournitureHT) || 0;
          const posePrice = parseFloat(selectedArticle.PrixPoseHT) || 0;
          updatedArticles[index].prixUnitaireHT = (fourniturePrice + posePrice).toString();
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || selectedArticle.TauxTVAPose || globalTVA;
        } else {
          updatedArticles[index].prixUnitaireHT = '';
          updatedArticles[index].tauxTVAApplique = globalTVA;
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
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
      } else if (updatedArticles[index].typePrix === 'POSE' && selectedArticle.PrixPoseHT) {
        updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
      } else if (updatedArticles[index].typePrix === 'BOTH') {
        // For BOTH, we'll sum the prices
        const fourniturePrice = parseFloat(selectedArticle.PrixFournitureHT) || 0;
        const posePrice = parseFloat(selectedArticle.PrixPoseHT) || 0;
        updatedArticles[index].prixUnitaireHT = (fourniturePrice + posePrice).toString();
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || selectedArticle.TauxTVAPose || globalTVA;
      } else {
        // Set TVA if available, otherwise use global TVA
        updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVA || globalTVA;
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
      montantHT: formatNumberWithThousands(montantHT),
      montantTVA: formatNumberWithThousands(montantTVA),
      montantTTC: formatNumberWithThousands(montantTTC),
      // Raw values for calculation purposes
      rawMontantHT: montantHT,
      rawMontantTVA: montantTVA,
      rawMontantTTC: montantTTC
    };
  };

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;
    
    formData.articles.forEach(article => {
      const totals = calculateArticleTotals(article);
      totalHT += totals.rawMontantHT;
      totalTVA += totals.rawMontantTVA;
    });
    
    const totalTTC = totalHT + totalTVA;
    
    return {
      totalHT: formatNumberWithThousands(totalHT),
      totalTVA: formatNumberWithThousands(totalTVA),
      totalTTC: formatNumberWithThousands(totalTTC)
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
    
    // Check for duplicate articles in the same quote
    const articleIds = formData.articles.map(article => article.idArticle);
    const uniqueArticleIds = [...new Set(articleIds)];
    if (articleIds.length !== uniqueArticleIds.length) {
      setError('Un même article ne peut pas être ajouté plusieurs fois dans un devis. Veuillez supprimer les doublons.');
      return;
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
          
          {/* Tabs for Form and Preview */}
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('form')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'form'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Formulaire
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Aperçu
              </button>
            </nav>
          </div>
          {/* Devis Code, Type de Demande, and Date Display - Same div */}
          {devisCode && demande && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Code Devis: <span className="font-mono font-bold text-base text-primary-600 dark:text-primary-400">{devisCode}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Type de Demande: <span className="font-bold text-gray-900 dark:text-white">{demande.TypeDemande}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Date: <span className="font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Valable jusqu'au : <span className="font-bold text-gray-900 dark:text-white">
                  {(() => {
                    const baseDate = demande.DateDemande ? new Date(demande.DateDemande) : new Date();
                    const validUntil = new Date(baseDate);
                    validUntil.setDate(baseDate.getDate() + (demande.DelaiPaiementJours || 30));
                    return validUntil.toLocaleDateString('fr-FR');
                  })()}
                </span>
              </p>
            </div>
          )}
          {/* Show Code Devis and Date if no demande selected */}
          {devisCode && !demande && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Code Devis: <span className="font-mono font-bold text-base text-primary-600 dark:text-primary-400">{devisCode}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Date: <span className="font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Valable jusqu'au : <span className="font-bold text-gray-900 dark:text-white">
                  {(() => {
                    const baseDate = new Date();
                    const validUntil = new Date(baseDate);
                    validUntil.setDate(baseDate.getDate() + 30);
                    return validUntil.toLocaleDateString('fr-FR');
                  })()}
                </span>
              </p>
            </div>
          )}
          {/* Show Type de Demande and Date if no devis code but demande selected */}
          {!devisCode && demande && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Type de Demande: <span className="font-bold text-gray-900 dark:text-white">{demande.TypeDemande}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Date: <span className="font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Valable jusqu'au : <span className="font-bold text-gray-900 dark:text-white">
                  {(() => {
                    const baseDate = demande?.DateDemande ? new Date(demande.DateDemande) : new Date();
                    const validUntil = new Date(baseDate);
                    validUntil.setDate(baseDate.getDate() + (demande.DelaiPaiementJours || 30));
                    return validUntil.toLocaleDateString('fr-FR');
                  })()}
                </span>
              </p>
            </div>
          )}
          {/* Show only Date if neither devis code nor demande selected */}
          {!devisCode && !demande && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                En date du <span className="font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0">
                Valable jusqu'au : <span className="font-bold text-gray-900 dark:text-white">
                  {(() => {
                    const baseDate = new Date();
                    const validUntil = new Date(baseDate);
                    validUntil.setDate(baseDate.getDate() + 30);
                    return validUntil.toLocaleDateString('fr-FR');
                  })()}
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Sélecteurs en haut à droite - Numéro de Demande, Client, Type de Demande */}
        <div className="w-80 space-y-3">
          {/* Numéro de Demande */}
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="idDemande" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
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
          
          {/* Client Information in a bordered div on the right */}
          {demande && (
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700">
                Informations Client
              </h3>
              
              {/* Client Name */}
              <div className="mb-0.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0">
                  Nom Complet
                </label>
                <p className="text-xs text-gray-900 dark:text-white font-medium">
                  {demande.ClientNom} {demande.ClientPrenom}
                </p>
              </div>
              
              {/* Objet */}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Objet: 
                </p>
              </div>
              
              {/* Logo placed between Informations Organisation and Informations Client */}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Logo: 
                </p>
              </div>
              
              {/* Client Residence Address */}
              <div className="mb-0.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0">
                  Adresse de Résidence
                </label>
                <p className="text-xs text-gray-900 dark:text-white">
                  {demande.AdresseResidence || 'Non spécifiée'}, {demande.CommuneResidence || 'Non spécifiée'}
                </p>
              </div>
              
              {/* Client Contact Info - Telephone and Email */}
              {demande.ClientTelephone && (
                <div className="mb-0.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0">
                    Téléphone
                  </label>
                  <p className="text-xs text-gray-900 dark:text-white">
                    {demande.ClientTelephone}
                  </p>
                </div>
              )}
              
              {demande.ClientEmail && (
                <div className="mb-0.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0">
                    Email
                  </label>
                  <p className="text-xs text-gray-900 dark:text-white">
                    {demande.ClientEmail}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Type de Devis - REMOVED AS PER USER REQUEST */}
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

      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Articles Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Articles</h3>
          </div>

          {/* Articles Container - Maximum width */}
          <div className="space-y-2 w-full" style={{ position: 'relative' }}>
            {/* Articles Table Header - Consistent column alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full hidden lg:grid bg-gray-100 dark:bg-gray-700 p-2 rounded-md mb-2">
              <div className="lg:col-span-5">
                <div className="flex flex-wrap gap-1 items-start text-xs font-bold text-gray-700 dark:text-gray-300">
                  <div className="flex-1 min-w-[100px]">Désignation</div>
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="grid grid-cols-8 gap-1 items-start text-xs font-bold text-gray-700 dark:text-gray-300">
                  <div className="col-span-1 text-center">Type</div>
                  <div className="col-span-1 text-center">Qté</div>
                  <div className="col-span-1 text-center">PU.HT</div>
                  <div className="col-span-1 text-center">TVA%</div>
                  <div className="col-span-1 text-center">HT</div>
                  <div className="col-span-1 text-center">TVA</div>
                  <div className="col-span-1 text-center">TTC</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>
              </div>
            </div>
            {formData.articles.map((article, index) => {
              const articleTotals = calculateArticleTotals(article);
              // Check if this article is a duplicate
              const isDuplicate = formData.articles.filter(a => a.idArticle === article.idArticle).length > 1 && article.idArticle;
              return (
                <div key={index} className={`glass-card p-2 rounded-md w-full ${isDuplicate ? 'border-2 border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`} style={{ position: 'relative', zIndex: formData.articles.length - index }}>
                  {isDuplicate && (
                    <div className="text-red-600 dark:text-red-400 text-xs font-medium mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Article en double - veuillez le supprimer
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full">
                    {/* Article Search - Reduced width */}
                    <div className="lg:col-span-5 relative" ref={el => articleDropdownRefs.current[index] = el} style={{ zIndex: 100, position: 'relative' }}>
                      <div className="relative">
                        <input
                          type="text"
                          value={articleSearch[index] || ''}
                          onChange={(e) => {
                            setArticleSearch(prev => ({ ...prev, [index]: e.target.value }));
                            setShowArticleDropdown(prev => ({ ...prev, [index]: true }));
                          }}
                          onFocus={() => setShowArticleDropdown(prev => ({ ...prev, [index]: true }))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                          placeholder="Rechercher un article... *"
                          autoComplete="off"
                        />
                        
                        {/* Dropdown - Full width and no scrollbars */}
                        {showArticleDropdown[index] && (
                          <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow rounded overflow-hidden border border-gray-200 dark:border-gray-700 z-50" style={{ zIndex: 9999, position: 'absolute', transform: 'translateZ(0)' }}>
                            <div className="max-h-48 overflow-y-auto">
                              {(() => {
                                const filteredArts = availableArticles.filter(art => {
                                  if (!articleSearch[index]) return true;
                                  
                                  // Split search query into keywords (words separated by spaces)
                                  const keywords = articleSearch[index].toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
                                  
                                  // If no keywords, show all articles
                                  if (keywords.length === 0) return true;
                                  
                                  // Create a search string with all relevant article fields
                                  const searchString = [
                                    art.Designation || '',
                                    art.CodeArticle || '',
                                    art.LibelleFamille || '',
                                    art.Unite || ''
                                  ].join(' ').toLowerCase();
                                  
                                  // Check if all keywords are present in the search string (order doesn't matter)
                                  return keywords.every(keyword => 
                                    searchString.includes(keyword)
                                  );
                                });
                                
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                                                F: {formatNumberWithThousands(art.PrixFournitureHT)}
                                              </div>
                                            )}
                                            {art.PrixPoseHT && (
                                              <div className="text-purple-600 dark:text-purple-400 text-xs">
                                                P: {formatNumberWithThousands(art.PrixPoseHT)}
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
                    
                    {/* Article Details - Takes remaining space with consistent column alignment */}
                    <div className="lg:col-span-7">
                      <div className="grid grid-cols-8 gap-1 items-start">
                        {/* Type de Prix */}
                        <div className="col-span-1">
                          <select
                            value={article.typePrix || 'FOURNITURE'}
                            onChange={(e) => handleArticleChange(index, 'typePrix', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-center"
                            title="Type"
                          >
                            <option value="FOURNITURE">F</option>
                            <option value="POSE">P</option>
                            <option value="BOTH">F+P</option>
                          </select>
                        </div>
                        
                        {/* Quantité */}
                        <div className="col-span-1">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={article.quantite}
                              onChange={(e) => handleArticleChange(index, 'quantite', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-center"
                              placeholder="Qté"
                            />
                            {article.unite && (
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                                {article.unite}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Prix Unitaire */}
                        <div className="col-span-1">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={article.prixUnitaireHT}
                              onChange={(e) => handleArticleChange(index, 'prixUnitaireHT', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-center"
                              placeholder="Prix HT"
                              readOnly
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                              DZD
                            </div>
                          </div>
                        </div>
                        
                        {/* TVA */}
                        <div className="flex-1 min-w-[70px]">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={article.tauxTVAApplique}
                              onChange={(e) => handleArticleChange(index, 'tauxTVAApplique', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-center"
                              placeholder="TVA"
                              readOnly
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                              %
                            </div>
                          </div>
                        </div>
                        
                        {/* HT Total */}
                        <div className="flex-1 min-w-[70px] p-1 rounded text-center" title="HT">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white text-center">{articleTotals.montantHT}</div>
                        </div>
                        
                        {/* TVA Total */}
                        <div className="flex-1 min-w-[70px] p-1 rounded text-center" title="TVA">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white text-center">{articleTotals.montantTVA}</div>
                        </div>
                        
                        {/* TTC */}
                        <div className="flex-1 min-w-[70px] p-1 rounded text-center" title="TTC">
                          <div className="text-xs font-bold text-gray-900 dark:text-white text-center">{articleTotals.montantTTC}</div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => clearAndRemoveArticle(index)}
                            className="px-2 py-1 bg-red-100 dark:bg-red-900/50 border border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 text-xs rounded"
                            title="Supprimer"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={addArticle}
                            className="px-2 py-1 bg-green-100 dark:bg-green-900/50 border border-gray-300 dark:border-gray-600 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 text-xs rounded"
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
        
        {/* Totaux en bas à droite */}
        {formData.articles.length > 0 && (
          <div className="mt-3 flex justify-end">
            <div className="w-80 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800 shadow-md">
              <div className="space-y-1">
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total HT</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">{totals.totalHT} DZD</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total TVA</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">{totals.totalTVA} DZD</span>
                </div>
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-2 rounded-md flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Total TTC</span>
                  <span className="text-lg font-bold text-white">{totals.totalTTC} DZD</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Annuler
          </button>
          <div className="relative group">
            <button
              type="submit"
              disabled={loading || !formData.idDemande}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                !formData.idDemande 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700'
              } ${loading ? 'disabled:opacity-50' : ''}`}
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
            {!formData.idDemande && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10">
                Veuillez sélectionner une demande
              </div>
            )}
          </div>
        </div>
      </form>
      )}
      
      {/* Preview Tab Content */}
      {activeTab === 'preview' && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Aperçu du Devis</h2>
          </div>
          
          {/* Devis Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                {/* Center and Agency Information */}
                {(centreInfo || agenceInfo) && (
                  <div className="mt-4 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                      Informations Organisation
                    </h3>
                    <div className="space-y-0.5">
                      {centreInfo && centreInfo.NomUnite && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Unité: <span className="font-medium">{centreInfo.NomUnite}</span>
                          </p>
                          {(centreInfo.AdresseUnite || centreInfo.CommuneUnite) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {centreInfo.AdresseUnite}{centreInfo.AdresseUnite && centreInfo.CommuneUnite ? ', ' : ''}{centreInfo.CommuneUnite}
                            </p>
                          )}
                        </div>
                      )}


                      {centreInfo && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Centre: <span className="font-medium">{centreInfo.NomCentre}</span>
                          </p>
                          {centreInfo.TelephonePrincipal && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Téléphone Centre: <span className="font-medium">{centreInfo.TelephonePrincipal}</span>
                            </p>
                          )}
                        </div>
                      )}
                      {agenceInfo && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Agence commerciale: <span className="font-medium">{agenceInfo.NomAgence}</span>
                          </p>
                          {agenceInfo.TelephonePrincipal && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Téléphone Agence: <span className="font-medium">{agenceInfo.TelephonePrincipal}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Objet */}
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Objet: 
                  </p>
                </div>
              </div>
              
              {/* Logo placed between Informations Organisation and Informations Client */}
              <div className="flex items-center justify-center">
                <img src="/ade.png" alt="Logo" className="w-16 h-16 object-contain" />
              </div>
              
              {demande && (
                <div>
                  {/* Code devis and Date d'émission in a separate div */}
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800 shadow-sm text-left mb-4 w-96">
                    {devisCode && (
                      <p className="text-lg font-mono text-primary-600 dark:text-primary-400 mt-0">N° {devisCode}</p>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-0">
                      Date d'émission: {new Date().toLocaleDateString('fr-FR')}
                    </p>
                    {demande && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-0">
                        Valable jusqu'au : {
                          (() => {
                            const baseDate = demande.DateDemande ? new Date(demande.DateDemande) : new Date();
                            const validUntil = new Date(baseDate);
                            validUntil.setDate(baseDate.getDate() + (demande.DelaiPaiementJours || 30));
                            return validUntil.toLocaleDateString('fr-FR');
                          })()
                        }
                      </p>
                    )}
                  </div>
                  
                  {/* Client Information */}
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800 shadow-sm text-left w-96">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5 pb-1 border-b border-gray-200 dark:border-gray-700">
                      Informations Client
                    </h3>
                    <p className="font-semibold text-gray-900 dark:text-white text-base">{demande.ClientNom} {demande.ClientPrenom}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{demande.AdresseResidence}, {demande.CommuneResidence}</p>
                    {demande.ClientTelephone && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Tél: {demande.ClientTelephone}</p>
                    )}
                    {demande.ClientEmail && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Email: {demande.ClientEmail}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            

          </div>
          
          {/* Articles Table */}
          {formData.articles.length > 0 && (
            <div className="mb-8">
              {(() => {
                // Group articles by family for preview
                const groupedArticles = formData.articles.reduce((acc, article, index) => {
                  // Find the article in availableArticles to get its family
                  const availableArticle = availableArticles.find(a => a.IdArticle === article.idArticle);
                  const family = availableArticle?.LibelleFamille || 'Sans famille';
                  
                  if (!acc[family]) {
                    acc[family] = [];
                  }
                  
                  acc[family].push({ article, index });
                  return acc;
                }, {});
                
                // Sort families alphabetically
                const sortedFamilies = Object.keys(groupedArticles).sort();
                
                return sortedFamilies.map(family => (
                  <div key={family} className="mb-6">
                    {/* Family Header */}
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md mb-2">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">{family}</h4>
                    </div>
                    
                    {/* Articles in this family with consistent column alignment */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-4/12">Désignation</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">Qté</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">Unité</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">PU HT</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">P.TVA</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-3/12">Total HT</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {groupedArticles[family].map(({ article, index }) => {
                            const articleTotals = calculateArticleTotals(article);
                            return (
                              <tr key={index}>
                                <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-white w-4/12">
                                  <div className="font-medium">{article.designation}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {article.typePrix === 'FOURNITURE' && 'Fourniture'}
                                    {article.typePrix === 'POSE' && 'Pose'}
                                    {article.typePrix === 'BOTH' && 'Fourniture + Pose'}
                                  </div>
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white w-1/12">
                                  {article.quantite}
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white w-1/12">
                                  {article.unite || '-'}
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white w-1/12">
                                  {formatNumberWithThousands(parseFloat(article.prixUnitaireHT) || 0)}
                                </td>
                                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white w-1/12">
                                  {formatNumberWithThousands(((parseFloat(article.prixUnitaireHT) || 0) * (parseFloat(article.tauxTVAApplique) || 0) / 100))}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium w-3/12">
                                  {articleTotals.montantHT}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          
          {/* Totals */}
          {formData.articles.length > 0 && (
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-end">
                <div className="w-80 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Total HT:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalHT} DZD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Total TVA:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalTVA} DZD</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">Total TTC:</span>
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{totals.totalTTC} DZD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Comment */}
          {formData.commentaire && (
            <div className="mt-8">
              <div className="border-l-4 border-primary-500 pl-4 py-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Commentaires:</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{formData.commentaire}</p>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ce devis est établi en double exemplaire, l'un restant chez le client, l'autre chez le prestataire.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Toute modification de ce devis devra faire l'objet d'un avenant écrit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevisForm;