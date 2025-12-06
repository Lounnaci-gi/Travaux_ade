import React, { useState, useEffect, useRef } from 'react';
import { getDemandes, getDevisTypes, getArticles, getFamilles, createDevis, getTVADefault, getAgenceById, getCentreById, getNextDevisNumber } from '../services/api';
import { alertSuccess, alertError } from '../ui/alerts';
import { formatNumberWithThousands } from '../utils/numberFormat';
import { isPreviewAccessAllowed } from '../utils/previewAccess';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
// Fonction pour convertir les nombres en mots (en français)
const convertNumberToWords = (number) => {
  // Gérer les nombres avec décimales
  const integerPart = Math.floor(number);
  const decimalPart = Math.round((number - integerPart) * 100);
  
  if (integerPart === 0 && decimalPart === 0) return 'zéro';
  
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  
  const convertLessThanThousand = (num) => {
    let result = '';
    
    // Centaines
    const hundreds = Math.floor(num / 100);
    if (hundreds > 0) {
      if (hundreds === 1) {
        result += 'cent';
      } else {
        result += units[hundreds] + ' cent';
        if (num % 100 !== 0) result += ' ';
      }
    }
    
    // Dizaines et unités
    const remainder = num % 100;
    if (remainder === 0) return result.trim();
    
    if (remainder < 10) {
      if (result) result += ' ';
      result += units[remainder];
    } else if (remainder < 20) {
      if (result) result += ' ';
      result += teens[remainder - 10];
    } else {
      if (result) result += ' ';
      const tensDigit = Math.floor(remainder / 10);
      const unitsDigit = remainder % 10;
      
      if (tensDigit === 7 || tensDigit === 9) {
        // Soixante-dix et quatre-vingt-dix
        result += tens[tensDigit - 1];
        if (unitsDigit === 1) {
          result += ' et onze';
        } else {
          result += '-' + teens[unitsDigit];
        }
      } else if (tensDigit === 8 && unitsDigit === 0) {
        // Quatre-vingt
        result += 'quatre-vingts';
      } else {
        result += tens[tensDigit];
        if (unitsDigit > 0) {
          // Ajout d'un trait d'union entre la dizaine et l'unité
          if ((tensDigit >= 2 && tensDigit <= 6) || tensDigit === 8) {
            result += '-';
          } else {
            result += ' ';
          }
          result += units[unitsDigit];
        }
      }
    }
    
    return result.trim();
  };
  
  if (number < 0) return 'moins ' + convertNumberToWords(-number);
  
  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;
  
  let result = '';
  
  if (billions > 0) {
    if (billions === 1) {
      result += 'un milliard ';
    } else {
      result += convertLessThanThousand(billions) + ' milliards ';
    }
  }
  
  if (millions > 0) {
    if (millions === 1) {
      result += 'un million ';
    } else {
      result += convertLessThanThousand(millions) + ' millions ';
    }
  }
  
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mille ';
    } else {
      result += convertLessThanThousand(thousands) + ' mille ';
    }
  }
  
  if (remainder > 0) {
    result += convertLessThanThousand(remainder);
  }
  
  // Traiter la partie décimale correctement
  if (decimalPart > 0) {
    const decimalWords = convertLessThanThousand(decimalPart);
    
    if (integerPart > 0) {
      // S'il y a une partie entière, ajouter "dinars algériens et" puis les centimes
      result += ' dinars algériens et ' + decimalWords + ' centime' + (decimalPart > 1 ? 's' : '');
    } else {
      // S'il n'y a pas de partie entière, seulement les centimes
      result = decimalWords + ' centime' + (decimalPart > 1 ? 's' : '');
    }
  } else if (integerPart > 0) {
    // S'il y a une partie entière mais pas de décimale, ajouter "dinars algériens"
    result += ' dinars algériens';
  }  
  return result.trim() || 'zéro';
};

const DevisForm = ({ user }) => {
  const [globalTVA, setGlobalTVA] = useState('00');
  const [activeTab, setActiveTab] = useState('form');
  
  // Fonction pour générer le PDF de l'aperçu
  const generatePDF = () => {
    const input = document.getElementById('devis-preview');
    
    if (!input) {
      alertError('Erreur', 'Impossible de générer le PDF');
      return;
    }
    
    html2canvas(input, { 
      scale: 2,
      useCORS: true,
      logging: false
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const pageHeight = 297;  
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `devis_${devisCode || 'sans-code'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      alertSuccess('Succès', 'Le PDF a été généré avec succès');
    }).catch((error) => {
      console.error('Erreur lors de la génération du PDF:', error);
      alertError('Erreur', 'Impossible de générer le PDF');
    });
  };
  
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
  
  // Fonction pour obtenir le nom du type de devis à partir de l'ID
  const getDevisTypeName = (idTypeDevis) => {
    if (!idTypeDevis || !devisTypes || devisTypes.length === 0) return '';
    const type = devisTypes.find(t => t.IdTypeDevis === idTypeDevis);
    return type ? type.LibelleTypeDevis : '';
  };
  const [demandeSearch, setDemandeSearch] = useState('');
  const [filteredDemandes, setFilteredDemandes] = useState([]);
  const [showDemandeDropdown, setShowDemandeDropdown] = useState(false);
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
        
        // Check if both Fourniture and Pose prices are available
        const hasFourniture = selectedArticle.PrixFournitureHT !== undefined && selectedArticle.PrixFournitureHT !== null;
        const hasPose = selectedArticle.PrixPoseHT !== undefined && selectedArticle.PrixPoseHT !== null;
        
        // Set default price based on available prices
        if (hasFourniture && hasPose) {
          // Special case: both Fourniture and Pose available - default to BOTH
          updatedArticles[index].typePrix = 'BOTH';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT + selectedArticle.PrixPoseHT;
          // For TVA, we'll use the fourniture TVA as default
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
        } else if (hasFourniture) {
          updatedArticles[index].typePrix = 'FOURNITURE';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
        } else if (hasPose) {
          updatedArticles[index].typePrix = 'POSE';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
        } else if (selectedArticle.PrixServiceHT !== undefined && selectedArticle.PrixServiceHT !== null) {
          updatedArticles[index].typePrix = 'SERVICE';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixServiceHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAService || globalTVA;
        } else if (selectedArticle.PrixPrestationHT !== undefined && selectedArticle.PrixPrestationHT !== null) {
          updatedArticles[index].typePrix = 'PRESTATION';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPrestationHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPrestation || globalTVA;
        } else if (selectedArticle.PrixCautionnementHT !== undefined && selectedArticle.PrixCautionnementHT !== null) {
          updatedArticles[index].typePrix = 'CAUTIONNEMENT';
          updatedArticles[index].prixUnitaireHT = selectedArticle.PrixCautionnementHT;
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVACautionnement || globalTVA;
        } else {
          updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVA || globalTVA;
        }
      }
    }
    
    // If we're changing the typePrix, update the price and TVA
    if (field === 'typePrix') {
      const selectedArticle = availableArticles.find(a => a.IdArticle === updatedArticles[index].idArticle);
      if (selectedArticle) {
        // Check if both Fourniture and Pose prices are available
        const hasFourniture = selectedArticle.PrixFournitureHT !== undefined && selectedArticle.PrixFournitureHT !== null;
        const hasPose = selectedArticle.PrixPoseHT !== undefined && selectedArticle.PrixPoseHT !== null;
        
        switch (value) {
          case 'BOTH':
            if (hasFourniture && hasPose) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT + selectedArticle.PrixPoseHT;
              // For TVA, we'll use the fourniture TVA as default
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
            }
            break;
          case 'FOURNITURE':
            if (selectedArticle.PrixFournitureHT !== undefined && selectedArticle.PrixFournitureHT !== null) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixFournitureHT;
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
            }
            break;
          case 'POSE':
            if (selectedArticle.PrixPoseHT !== undefined && selectedArticle.PrixPoseHT !== null) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPoseHT;
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
            }
            break;
          case 'SERVICE':
            if (selectedArticle.PrixServiceHT !== undefined && selectedArticle.PrixServiceHT !== null) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixServiceHT;
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAService || globalTVA;
            }
            break;
          case 'PRESTATION':
            if (selectedArticle.PrixPrestationHT !== undefined && selectedArticle.PrixPrestationHT !== null) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixPrestationHT;
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVAPrestation || globalTVA;
            }
            break;
          case 'CAUTIONNEMENT':
            if (selectedArticle.PrixCautionnementHT !== undefined && selectedArticle.PrixCautionnementHT !== null) {
              updatedArticles[index].prixUnitaireHT = selectedArticle.PrixCautionnementHT;
              updatedArticles[index].tauxTVAApplique = selectedArticle.TauxTVACautionnement || globalTVA;
            }
            break;
          default:
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
      
      // Determine the best typePrix based on available prices
      let bestTypePrix = updatedArticles[index].typePrix || 'FOURNITURE';
      let prixUnitaireHT = '';
      let tauxTVAApplique = globalTVA;
      
      // Check available prices and select the most appropriate one
      const hasFourniture = selectedArticle.PrixFournitureHT !== undefined && selectedArticle.PrixFournitureHT !== null;
      const hasPose = selectedArticle.PrixPoseHT !== undefined && selectedArticle.PrixPoseHT !== null;
      
      if (hasFourniture && hasPose) {
        // Special case: both Fourniture and Pose available - use BOTH
        bestTypePrix = 'BOTH';
        prixUnitaireHT = selectedArticle.PrixFournitureHT + selectedArticle.PrixPoseHT;
        // For TVA, we'll use the fourniture TVA as default
        tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
      } else if (hasFourniture) {
        bestTypePrix = 'FOURNITURE';
        prixUnitaireHT = selectedArticle.PrixFournitureHT;
        tauxTVAApplique = selectedArticle.TauxTVAFourniture || globalTVA;
      } else if (hasPose) {
        bestTypePrix = 'POSE';
        prixUnitaireHT = selectedArticle.PrixPoseHT;
        tauxTVAApplique = selectedArticle.TauxTVAPose || globalTVA;
      } else if (selectedArticle.PrixServiceHT !== undefined && selectedArticle.PrixServiceHT !== null) {
        bestTypePrix = 'SERVICE';
        prixUnitaireHT = selectedArticle.PrixServiceHT;
        tauxTVAApplique = selectedArticle.TauxTVAService || globalTVA;
      } else if (selectedArticle.PrixPrestationHT !== undefined && selectedArticle.PrixPrestationHT !== null) {
        bestTypePrix = 'PRESTATION';
        prixUnitaireHT = selectedArticle.PrixPrestationHT;
        tauxTVAApplique = selectedArticle.TauxTVAPrestation || globalTVA;
      } else if (selectedArticle.PrixCautionnementHT !== undefined && selectedArticle.PrixCautionnementHT !== null) {
        bestTypePrix = 'CAUTIONNEMENT';
        prixUnitaireHT = selectedArticle.PrixCautionnementHT;
        tauxTVAApplique = selectedArticle.TauxTVACautionnement || globalTVA;
      }      
      updatedArticles[index] = {
        ...updatedArticles[index],
        idArticle: articleId,
        designation: selectedArticle.Designation,
        unite: selectedArticle.Unite,
        typePrix: bestTypePrix,
        prixUnitaireHT: prixUnitaireHT,
        tauxTVAApplique: tauxTVAApplique
      };
      
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
      if (!article.quantite || parseFloat(article.quantite) <= 0 || !/^\d+$/.test(article.quantite)) {
        setError(`Veuillez saisir une quantité entière valide à la ligne ${i + 1}`);
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
            <nav className="-mb-px flex space-x-4">
              <button
                onClick={() => setActiveTab('form')}
                className={`py-1 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'form'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Edition
              </button>
              <button
                onClick={() => {
                  if (isPreviewAccessAllowed(formData, demande)) {
                    setActiveTab('preview');
                  }
                }}
                className={`py-1 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : isPreviewAccessAllowed(formData, demande)
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    : 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                }`}
                title={!isPreviewAccessAllowed(formData, demande) ? "Veuillez sélectionner une demande et ajouter au moins un article pour accéder à l'aperçu" : ""}
              >
                Aperçu
              </button>
              {activeTab === 'preview' && isPreviewAccessAllowed(formData, demande) && (
                <button
                  onClick={generatePDF}
                  className="ml-auto inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Export PDF
                </button>
              )}
            </nav>
          </div>
          {/* Devis Code, Type de Demande, and Date Display - Same div */}
          {devisCode && demande && activeTab !== 'preview' && (
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
          {devisCode && !demande && activeTab !== 'preview' && (
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
          {!devisCode && demande && activeTab !== 'preview' && (
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
          {!devisCode && !demande && activeTab !== 'preview' && (
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
        {activeTab !== 'preview' && (
          <div className="w-80 space-y-3 text-right">
            {/* Numéro de Demande */}
            <div className="relative" ref={dropdownRef}>
              <label htmlFor="idDemande" className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 text-right">
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
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700 text-right">
                  Informations Client
                </h3>
                
                {/* Client Name */}
                <div className="mb-0.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 text-right">
                    Nom Complet
                  </label>
                  <p className="text-xs text-gray-900 dark:text-white font-medium text-right">
                    {demande.ClientNom} {demande.ClientPrenom}
                  </p>
                </div>
                
                
                {/* Client Residence Address */}
                <div className="mb-0.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 text-right">
                    Adresse de Résidence
                  </label>
                  <p className="text-xs text-gray-900 dark:text-white text-right">
                    {demande.AdresseResidence || 'Non spécifiée'}, {demande.CommuneResidence || 'Non spécifiée'}
                  </p>
                </div>
                
                {/* Client Contact Info - Telephone and Email */}
                {demande.ClientTelephone && (
                  <div className="mb-0.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 text-right">
                      Téléphone
                    </label>
                    <p className="text-xs text-gray-900 dark:text-white text-right">
                      {demande.ClientTelephone}
                    </p>
                  </div>
                )}
                
                {demande.ClientEmail && (
                  <div className="mb-0.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 text-right">
                      Email
                    </label>
                    <p className="text-xs text-gray-900 dark:text-white text-right">
                      {demande.ClientEmail}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Type de Devis - REMOVED AS PER USER REQUEST */}
          </div>
        )}
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
                            <div className="max-h-96 overflow-y-auto">
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
                            <option value="PRESTATION">Pr</option>
                            <option value="CAUTIONNEMENT">C</option>
                            <option value="SERVICE">S</option>
                          </select>
                        </div>
                        
                        {/* Quantité */}
                        <div className="col-span-1">
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={article.quantite}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Ne permettre que des nombres entiers
                                if (value === '' || /^\d+$/.test(value)) {
                                  handleArticleChange(index, 'quantite', value);
                                }
                              }}
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
                              {/* Currency symbol removed as per user request */}
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
        !isPreviewAccessAllowed(formData, demande) ? (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Accès refusé</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Veuillez sélectionner une demande et ajouter au moins un article pour accéder à l'aperçu.
              </p>
            </div>
          </div>
        ) : (
        <div id="devis-preview" className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6" style={{ fontFamily: 'Calibri, Arial, sans-serif', backgroundColor: '#f5f5f5', padding: '20px' }}>          <div className="container" style={{ maxWidth: '800px', margin: '0 auto', background: 'white', position: 'relative', overflow: 'hidden' }}>
            <div className="background-design" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(173, 216, 230, 0.3) 0%, rgba(135, 206, 250, 0.2) 50%, rgba(176, 224, 230, 0.3) 100%)', clipPath: 'polygon(0 0, 45% 0, 35% 100%, 0 100%)', zIndex: 0 }}></div>
            
            <div className="content" style={{ position: 'relative', zIndex: 1, padding: '40px' }}>
              <div className="header" style={{ position: 'relative' }}>
                <img src="/ade.png" alt="Logo ADE" style={{ position: 'absolute', top: '10px', right: '10px', height: '132px', opacity: 0.3, zIndex: -1 }} />
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e90ff', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'left' }}>DEVIS</h1>
                {/* Three-column layout for header information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', lineHeight: 1.6, color: '#555', marginBottom: '20px' }}>
                  {/* Left column - Enterprise information */}
                  <div style={{ width: '33%', textAlign: 'left' }}>
                    <p style={{ marginBottom: '3px' }}>{centreInfo?.NomCentre || 'ADE'}</p>
                    <p style={{ marginBottom: '3px' }}>{centreInfo?.AdresseUnite || ''}</p>
                    <p style={{ marginBottom: '3px' }}>{centreInfo?.CommuneUnite || ''}</p>
                    <p style={{ marginBottom: '3px' }}>{centreInfo?.TelephonePrincipal || ''}</p>
                    <p style={{ marginBottom: '3px' }}>{agenceInfo?.Email || ''}</p>
                  </div>
                  
                  {/* Middle column - Devis information */}
                  <div style={{ width: '33%', textAlign: 'left' }}>
                    <p style={{ marginBottom: '3px', fontWeight: 'bold', color: '#1e90ff' }}><strong>{devisCode || 'N/A'}</strong> </p>
                    {demande && (
                      <p style={{ marginBottom: '3px' }}><strong>Type de demande:</strong> {demande.TypeDemande || ''}</p>
                    )}
                    <p style={{ marginBottom: '3px' }}><strong>Date de création:</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                    {demande && (
                      <p style={{ marginBottom: '3px' }}><strong>Date d'expiration:</strong> {
                        (() => {
                          const baseDate = demande.DateDemande ? new Date(demande.DateDemande) : new Date();
                          const validUntil = new Date(baseDate);
                          validUntil.setDate(baseDate.getDate() + (demande.DelaiPaiementJours || 30));
                          return validUntil.toLocaleDateString('fr-FR');
                        })()
                      }</p>
                    )}
                  </div>
                  
                  {/* Right column - Client information */}
                  <div style={{ width: '33%', textAlign: 'left' }}>
                    {demande && (
                      <>                       
                        <p style={{ marginBottom: '3px' }}>{demande.ClientNom} {demande.ClientPrenom}</p>
                        <p style={{ marginBottom: '3px' }}>{demande.AdresseResidence}</p>
                        <p style={{ marginBottom: '3px' }}>{demande.CommuneResidence}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>              <div className="main-section" style={{ marginTop: '50px' }}>
                <div className="section-title" style={{ backgroundColor: '#d0e8f2', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', color: '#333', marginBottom: '15px' }}>
                  DESCRIPTION
                </div>
                
                {/* Articles Table with Family Grouping */}
                {formData.articles.filter(article => article.idArticle && article.designation).length > 0 && (
                  <div>
                    {(() => {
                      // Group articles by family for preview
                      // Filter out empty articles (those without designation or idArticle)
                      const validArticles = formData.articles.filter(article => 
                        article.idArticle && article.designation
                      );
                      
                      const groupedArticles = validArticles.reduce((acc, article, index) => {
                        // Find the article in availableArticles to get its family
                        const availableArticle = availableArticles.find(a => a.IdArticle === article.idArticle);
                        const family = availableArticle?.LibelleFamille || 'Sans famille';
                        
                        if (!acc[family]) {
                          acc[family] = [];
                        }
                        
                        acc[family].push({ article, index });
                        return acc;
                      }, {});
                      
                      // Get families in the order they appear in the devis
                      const familiesInOrder = [];
                      validArticles.forEach(article => {
                        const availableArticle = availableArticles.find(a => a.IdArticle === article.idArticle);
                        const family = availableArticle?.LibelleFamille || 'Sans famille';
                        if (!familiesInOrder.includes(family)) {
                          familiesInOrder.push(family);
                        }
                      });
                      
                      // Function to get Roman numeral for family index based on appearance order
                      const getFamilyRomanNumeral = (familyName) => {
                        const indexInOrder = familiesInOrder.indexOf(familyName);
                        if (indexInOrder !== -1) {
                          // Convert index to Roman numerals
                          const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                          return romanNumerals[indexInOrder] || '';
                        } else {
                          // For families not found, we won't show numbering
                          return '';
                        }
                      };
                      
                      // Use the order of appearance
                      const sortedFamilies = familiesInOrder;
                      
                      // Render articles grouped by family with family headers as separators
                      return (
                        <div>
                          {/* Global table header - shown only once */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                            <thead>
                              <tr>
                                <th style={{ backgroundColor: '#e6f3fa', padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #ccc', width: '35%' }}>ARTICLE</th>
                                <th style={{ backgroundColor: '#e6f3fa', padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #ccc', width: '10%' }}>UNITE</th>
                                <th style={{ backgroundColor: '#e6f3fa', padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #ccc', width: '10%' }}>QUANTITÉ</th>
                                <th style={{ backgroundColor: '#e6f3fa', padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #ccc', width: '20%' }}>PRIX UNITAIRE HT</th>
                                <th style={{ backgroundColor: '#e6f3fa', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #ccc', width: '25%' }}>MONTANT HT</th>                              </tr>                            </thead>
                            <tbody>
                              {sortedFamilies.map((family) => (
                                <React.Fragment key={family}>
                                  {/* Family Header */}
                                  <tr>
                                    <td colSpan="5" style={{ backgroundColor: '#d0e8f2', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', color: '#333', marginTop: '10px' }}>
                                      {getFamilyRomanNumeral(family)}{getFamilyRomanNumeral(family) ? ' - ': ''}{family}
                                    </td>
                                  </tr>                                  {/* Family Articles */}
                                  {groupedArticles[family].map(({ article, index }) => {
                                    const articleTotals = calculateArticleTotals(article);
                                    return (
                                      <tr key={index}>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>
                                          <div>{article.designation}</div>
                                          <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>
                                            {article.typePrix === 'FOURNITURE' && 'Fourniture'}
                                            {article.typePrix === 'POSE' && 'Pose'}
                                            {article.typePrix === 'BOTH' && 'Fourniture + Pose'}
                                            {article.typePrix === 'PRESTATION' && 'Prestation'}
                                            {article.typePrix === 'CAUTIONNEMENT' && 'Cautionnement'}
                                            {article.typePrix === 'SERVICE' && 'Service'}
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>{article.unite}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>{article.quantite}</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0' }}>{formatNumberWithThousands(parseFloat(article.prixUnitaireHT) || 0)} DZD</td>
                                        <td style={{ padding: '10px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{articleTotals.montantHT} DZD</td>                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Totals */}
                {formData.articles.filter(article => article.idArticle && article.designation).length > 0 && (
                  <div className="totals-section" style={{ marginTop: '20px', textAlign: 'left' }}>
                    <div className="total-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '12px' }}>
                      <div className="total-label" style={{ width: '150px', fontWeight: 'bold', textAlign: 'left', marginRight: '20px' }}>Total HT</div>
                      <div className="total-value" style={{ width: '120px', textAlign: 'right' }}>{totals.totalHT} DZD</div>
                    </div>
                    <div className="total-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', fontSize: '12px' }}>
                      <div className="total-label" style={{ width: '150px', fontWeight: 'bold', textAlign: 'left', marginRight: '20px' }}>TVA {globalTVA}%</div>
                      <div className="total-value" style={{ width: '120px', textAlign: 'right' }}>{totals.totalTVA} DZD</div>
                    </div>
                    <div className="total-row final-total" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #333', fontSize: '12px' }}>
                      <div className="total-label" style={{ width: '150px', fontWeight: 'bold', textAlign: 'left', marginRight: '20px', fontSize: '14px' }}>TOTAL TTC</div>
                      <div className="total-value" style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>{totals.totalTTC} DZD</div>
                    </div>
                  </div>
                )}              </div>

              {/* Total in words */}
              {formData.articles.filter(article => article.idArticle && article.designation).length > 0 && (
                <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '12px' }}>
                  <p>Arrêté ce présent devis à la somme de : <strong>{(() => {
                                      const totalNumeric = parseFloat(totals.totalTTC.replace(/\s/g, '').replace(',', '.'));
                                      return convertNumberToWords(totalNumeric);
                                    })()}</strong></p>                </div>
              )}              {/* Comment */}
              {formData.commentaire && (
                <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Commentaires:</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{formData.commentaire}</p>
                </div>
              )}

              <div className="footer" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="footer-info" style={{ fontSize: '10px', lineHeight: 1.6, color: '#666' }}>
                    <p style={{ marginBottom: '3px' }}><strong>Coordonnées bancaires:</strong></p>
                    <p style={{ marginBottom: '3px' }}>Banque: {centreInfo?.NomBanque || ''}</p>
                    <p style={{ marginBottom: '3px' }}>IBAN: {centreInfo?.NumerocompteBancaire || ''}</p>
                    <p style={{ marginBottom: '3px' }}>Compte postal: {centreInfo?.NumeroComptePostal || ''}</p>
                    <p style={{ marginTop: '10px', marginBottom: '3px' }}>N° Identifiant Fiscal: {centreInfo?.NumeroIdentifiantFiscal || ''}</p>
                    <p style={{ marginBottom: '3px' }}>N° Identification Statistique: {centreInfo?.NumeroIdentificationStatistique || ''}</p>
                    <p style={{ marginBottom: '3px' }}>N° Registre Commerce: {centreInfo?.NumeroRegistreCommerce || ''}</p>                  
                    <p style={{ marginBottom: '3px' }}>TVA: {globalTVA || ''}%</p>
                  </div>
                  <div>
                    <QRCodeCanvas 
                      value={`Client: ${demande?.ClientNom || ''} ${demande?.ClientPrenom || ''}\nType: ${getDevisTypeName(formData.idTypeDevis) || ''}\nMontant: ${totals.totalTTC || '0,00'} DZD\nDate: ${new Date().toLocaleDateString('fr-FR')}`} 
                      size={70} 
                      bgColor="transparent" 
                      fgColor="#000" 
                      level="L" 
                    />
                  </div>
                </div>
              </div>

              <div className="conditions" style={{ marginTop: '30px', backgroundColor: '#f9f9f9', padding: '15px', fontSize: '10px', lineHeight: 1.5, color: '#666' }}>
                <h3 style={{ fontSize: '11px', marginBottom: '8px', color: '#5a8c5a' }}>CONDITIONS DE PAIEMENT</h3>
                <p style={{ marginBottom: '3px' }}>Délai de paiement: 30 jours à réception de devis.</p>
                <p style={{ marginBottom: '3px' }}>Tout dépassement du délai de paiement entraînera la réévaluation du montant de la facture. Une majoration sera appliquée en fonction de l'évolution des prix ou de la TVA, formalisée par une facture rectificative ou un devis complémentaire soumis à acceptation.</p>
              </div>
            </div>
          </div>
        </div>
      )
    )}
    </div>
  );
};

export default DevisForm;

