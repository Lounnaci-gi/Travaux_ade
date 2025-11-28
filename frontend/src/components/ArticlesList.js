import React, { useState, useEffect } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getArticles, getArticleById, createArticle, updateArticle, getArticleFamilles, createArticleFamille, createArticlePrixHistorique, getArticlePrixHistorique } from '../services/api';
import { isAdmin } from '../utils/auth';
import { getConfigurations } from '../services/api';

const ArticlesList = ({ user, onUnauthorized }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showFamilleModal, setShowFamilleModal] = useState(false);
  const [familleForm, setFamilleForm] = useState({
    LibelleFamille: '',
    Description: '',
  });
  const [globalTVA, setGlobalTVA] = useState('19.00'); // Default TVA rate
  const [submittingFamille, setSubmittingFamille] = useState(false);
  const [form, setForm] = useState({
    IdFamille: '',
    Designation: '',
    Description: '',
    Unite: '',
    Diametre: '',
    Matiere: '',
    Classe: '',
    Pression: '',
    Longueur: '',
    Largeur: '',
    Epaisseur: '',
    Couleur: '',
    Caracteristiques: '',
    // Article Prix Historique fields
    PrixFournitureHT: '',
    PrixPoseHT: '',
    DateDebutApplication: new Date().toISOString().split('T')[0],
    DateFinApplication: '',
  });
  const [matiereSearch, setMatiereSearch] = useState('');
  const [showMatiereDropdown, setShowMatiereDropdown] = useState(false);
  const [uniteSearch, setUniteSearch] = useState('');
  const [showUniteDropdown, setShowUniteDropdown] = useState(false);
  const [familleSearch, setFamilleSearch] = useState('');
  const [showFamilleDropdown, setShowFamilleDropdown] = useState(false);
  const [hoveredArticle, setHoveredArticle] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoveredArticleDetails, setHoveredArticleDetails] = useState(null);
  const [loadingHoverDetails, setLoadingHoverDetails] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hideTimeout, setHideTimeout] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Liste des unités de mesure prédéfinies
  const unitesMesure = [
    'U',           // Unité
    'ML',          // Mètre linéaire
    'M²',          // Mètre carré
    'M3',          // Mètre cube
    'CM',          // Centimètre
    'MM',          // Millimètre
    'KG',          // Kilogramme
    'Gramme',      // Gramme
    'Forfait',     // Forfait
    'Heure',       // Heure
    'Jour',        // Jour
    'Litre',       // Litre
    'Ton',         // Tonne
    'Baril',       // Baril
    'Paquet',      // Paquet
    'Carton',      // Carton
    'Boîte',       // Boîte
    'Sachet',      // Sachet
  ];

  // Liste des matières de plomberie
  const matieresPlomberie = [
    'Acier',
    'Acier galvanisé',
    'Acier inoxydable',
    'Acier noir',
    'Acier zingué',
    'Aluminium',
    'Béton',
    'Bronze',
    'Caoutchouc',
    'Céramique',
    'Composite',
    'Cuivre',
    'Fibre de verre',
    'Fonte',
    'Grès',
    'Inox',
    'Laiton',
    'Multicouche',
    'Nylon',
    'PEHD',
    'PEX',
    'Plastique',
    'Plomb',
    'Polybutylène',
    'Polyéthylène',
    'Polyéthylène basse densité',
    'Polyéthylène haute densité',
    'Polyéthylène réticulé',
    'Polyamide',
    'Polypropylène',
    'PVC',
    'Résine',
    'Silicone',
    'Téflon',
];
  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent gérer les articles.');
      }
    }
  }, [user, onUnauthorized]);

  // Fetch global TVA rate
  useEffect(() => {
    const fetchGlobalTVA = async () => {
      try {
        const configs = await getConfigurations();
        const tvaConfig = configs.find(config => config.Cle === 'TAUX_TVA_DEFAUT');
        if (tvaConfig) {
          setGlobalTVA(tvaConfig.Valeur);
        }
      } catch (error) {
        // Keep default TVA rate
      }
    };

    if (isAdmin(user)) {
      fetchGlobalTVA();
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [articlesList, famillesList] = await Promise.all([
          getArticles(),
          getArticleFamilles()
        ]);
        setArticles(articlesList || []);
        setFamilles(famillesList || []);
      } catch (e) {
        // Error loading data
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Fermer le dropdown matière quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMatiereDropdown && !event.target.closest('.matiere-dropdown-container')) {
        setShowMatiereDropdown(false);
        setMatiereSearch('');
      }
      if (showUniteDropdown && !event.target.closest('.unite-dropdown-container')) {
        setShowUniteDropdown(false);
        setUniteSearch('');
      }
      if (showFamilleDropdown && !event.target.closest('.famille-dropdown-container')) {
        setShowFamilleDropdown(false);
        setFamilleSearch('');
      }
    };

    if (showMatiereDropdown || showUniteDropdown || showFamilleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMatiereDropdown, showUniteDropdown, showFamilleDropdown]);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs peuvent gérer les articles.
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  // Filtrer les matières selon la recherche
  const filteredMatieres = matiereSearch
    ? matieresPlomberie.filter((matiere) =>
        matiere.toLowerCase().includes(matiereSearch.toLowerCase())
      )
    : matieresPlomberie;

  // Filtrer les unités selon la recherche
  const filteredUnites = uniteSearch
    ? unitesMesure.filter((unite) =>
        unite.toLowerCase().includes(uniteSearch.toLowerCase())
      )
    : unitesMesure;

  // Filtrer les familles selon la recherche
  const filteredFamilles = familleSearch
    ? familles.filter((famille) =>
        famille.LibelleFamille.toLowerCase().includes(familleSearch.toLowerCase())
      )
    : familles;

  // Gérer la sélection d'une matière
  const handleMatiereSelect = (matiere) => {
    setForm((prev) => ({ ...prev, Matiere: matiere }));
    setMatiereSearch('');
    setShowMatiereDropdown(false);
  };

  // Gérer la sélection d'une unité
  const handleUniteSelect = (unite) => {
    setForm((prev) => ({ ...prev, Unite: unite }));
    setUniteSearch('');
    setShowUniteDropdown(false);
  };

  // Filtrer les articles selon la recherche
  const filteredArticles = articles.filter(article => {
    const searchLower = searchTerm.toLowerCase();
    return (
      article.CodeArticle?.toLowerCase().includes(searchLower) ||
      article.Designation?.toLowerCase().includes(searchLower) ||
      article.LibelleFamille?.toLowerCase().includes(searchLower) ||
      article.Unite?.toLowerCase().includes(searchLower) ||
      (article.Description && article.Description.toLowerCase().includes(searchLower))
    );
  });

  // Gérer la sélection d'une famille
  const handleFamilleSelect = (familleId, libelleFamille) => {
    setForm((prev) => ({ ...prev, IdFamille: familleId }));
    setFamilleSearch(libelleFamille);
    setShowFamilleDropdown(false);
  };

  // Gérer le changement dans le champ de recherche matière
  const handleMatiereSearchChange = (e) => {
    const value = e.target.value;
    setMatiereSearch(value);
    setForm((prev) => ({ ...prev, Matiere: value }));
    setShowMatiereDropdown(true);
  };

  // Gérer le changement dans le champ de recherche unité
  const handleUniteSearchChange = (e) => {
    const value = e.target.value;
    setUniteSearch(value);
    setForm((prev) => ({ ...prev, Unite: value }));
    setShowUniteDropdown(true);
  };

  // Gérer le changement dans le champ de recherche famille
  const handleFamilleSearchChange = (e) => {
    const value = e.target.value;
    setFamilleSearch(value);
    setShowFamilleDropdown(true);
  };

  const resetForm = () => {
    setForm({
      IdFamille: '',
      Designation: '',
      Description: '',
      Unite: '',
      Diametre: '',
      Matiere: '',
      Classe: '',
      Pression: '',
      Longueur: '',
      Largeur: '',
      Epaisseur: '',
      Couleur: '',
      Caracteristiques: '',
      // Article Prix Historique fields
      PrixFournitureHT: '',
      PrixPoseHT: '',
      DateDebutApplication: new Date().toISOString().split('T')[0],
      DateFinApplication: '',
    });
    setEditingId(null);
    setError('');
    setSuccess('');
    setMatiereSearch('');
    setShowMatiereDropdown(false);
    setUniteSearch('');
    setShowUniteDropdown(false);
    setFamilleSearch('');
    setShowFamilleDropdown(false);
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const article = await getArticleById(id);
      const matiere = article.Matiere || '';
      const unite = article.Unite || '';
      
      // Charger l'historique des prix actifs
      let prixFournitureHT = '';
      let prixPoseHT = '';
      let dateDebutApplication = new Date().toISOString().split('T')[0];
      
      try {
        const prixHistorique = await getArticlePrixHistorique(id);
        if (prixHistorique && Array.isArray(prixHistorique)) {
          // Trouver les prix actifs pour Fourniture et Pose
          const prixFournitureActif = prixHistorique.find(
            p => p.TypePrix === 'FOURNITURE' && p.EstActif === true
          );
          const prixPoseActif = prixHistorique.find(
            p => p.TypePrix === 'POSE' && p.EstActif === true
          );
          
          if (prixFournitureActif) {
            prixFournitureHT = prixFournitureActif.PrixHT != null ? String(prixFournitureActif.PrixHT) : '';
          }
          if (prixPoseActif) {
            prixPoseHT = prixPoseActif.PrixHT != null ? String(prixPoseActif.PrixHT) : '';
          }
          
          // Utiliser la date de début la plus récente
          const dates = [prixFournitureActif?.DateDebutApplication, prixPoseActif?.DateDebutApplication]
            .filter(Boolean)
            .map(d => new Date(d));
          if (dates.length > 0) {
            dateDebutApplication = new Date(Math.max(...dates)).toISOString().split('T')[0];
          }
        }
      } catch (priceError) {
        // Error loading price history
      }
      
      // Trouver le libellé de la famille
      const famille = familles.find(f => f.IdFamille === article.IdFamille);
      const libelleFamille = famille ? famille.LibelleFamille : '';
      
      setForm({
        IdFamille: article.IdFamille ? String(article.IdFamille) : '',
        Designation: article.Designation || '',
        Description: article.Description || '',
        Unite: article.Unite || '',
        Diametre: article.Diametre || '',
        Matiere: article.Matiere || '',
        Classe: article.Classe || '',
        Pression: article.Pression || '',
        Longueur: article.Longueur != null ? String(article.Longueur) : '',
        Largeur: article.Largeur != null ? String(article.Largeur) : '',
        Epaisseur: article.Epaisseur != null ? String(article.Epaisseur) : '',
        Couleur: article.Couleur || '',
        Caracteristiques: article.Caracteristiques || '',
        // Article Prix Historique fields - charger les prix actifs
        PrixFournitureHT: prixFournitureHT,
        PrixPoseHT: prixPoseHT,
        DateDebutApplication: dateDebutApplication,
        DateFinApplication: '',
      });
      setMatiereSearch(matiere);
      setShowMatiereDropdown(false);
      setUniteSearch(unite);
      setShowUniteDropdown(false);
      setFamilleSearch(libelleFamille);
      setShowFamilleDropdown(false);
      setEditingId(id);
      setError('');
      setSuccess('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alertError('Erreur', 'Impossible de charger l\'article.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamille = async (e) => {
    e.preventDefault();
    if (!familleForm.LibelleFamille.trim()) {
      alertError('Erreur', 'Le libellé de la famille est requis.');
      return;
    }

    // Validation des longueurs
    if (familleForm.LibelleFamille.trim().length > 100) {
      alertError('Erreur', 'Le libellé ne doit pas dépasser 100 caractères.');
      return;
    }
    if (familleForm.Description && familleForm.Description.trim().length > 255) {
      alertError('Erreur', 'La description ne doit pas dépasser 255 caractères.');
      return;
    }

    try {
      setSubmittingFamille(true);
      const newFamille = await createArticleFamille({
        LibelleFamille: familleForm.LibelleFamille.trim(),
        Description: familleForm.Description?.trim() || null,
      });

      // Recharger la liste des familles
      const updatedFamilles = await getArticleFamilles();
      setFamilles(updatedFamilles || []);

      // Sélectionner automatiquement la nouvelle famille
      setForm((prev) => ({ ...prev, IdFamille: newFamille.IdFamille.toString() }));

      // Fermer le modal et réinitialiser le formulaire
      setShowFamilleModal(false);
      setFamilleForm({ LibelleFamille: '', Description: '' });
      alertSuccess('Succès', 'Famille d\'article créée avec succès.');
    } catch (e) {
      const message = e.response?.data?.error || 'Erreur lors de la création de la famille.';
      alertError('Erreur', message);
    } finally {
      setSubmittingFamille(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const action = editingId ? 'Modifier' : 'Créer';
    const confirmed = await confirmDialog('Confirmer', `${action} cet article ?`);
    if (!confirmed) return;
    try {
      setSubmitting(true);
      if (!form.IdFamille || !form.Designation || !form.Unite) {
        setError('Veuillez renseigner la Famille, la Désignation et l\'Unité.');
        setSubmitting(false);
        return;
      }

      // Validation des longueurs de champs
      const lengthConstraints = [
        { field: 'Designation', value: form.Designation, max: 200, label: 'Désignation' },
        { field: 'Description', value: form.Description, max: 500, label: 'Description' },
        { field: 'Unite', value: form.Unite, max: 50, label: 'Unité' },
        { field: 'Diametre', value: form.Diametre, max: 20, label: 'Diamètre' },
        { field: 'Matiere', value: form.Matiere, max: 50, label: 'Matière' },
        { field: 'Classe', value: form.Classe, max: 20, label: 'Classe' },
        { field: 'Pression', value: form.Pression, max: 20, label: 'Pression' },
        { field: 'Couleur', value: form.Couleur, max: 30, label: 'Couleur' },
        { field: 'Caracteristiques', value: form.Caracteristiques, max: 500, label: 'Caractéristiques' },
      ];

      for (const { value, max, label } of lengthConstraints) {
        if (value && typeof value === 'string' && value.trim().length > max) {
          const message = `Le champ ${label} ne doit pas dépasser ${max} caractères.`;
          setError(message);
          alertError('Erreur', message);
          setSubmitting(false);
          return;
        }
      }

      const trimValue = (val) => (val && typeof val === 'string' ? val.trim() : val) || null;
      const parseDecimal = (val) => {
        if (!val || val === '') return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      const payload = {
        IdFamille: parseInt(form.IdFamille),
        Designation: form.Designation.trim(),
        Description: trimValue(form.Description),
        Unite: form.Unite.trim(),
        Diametre: trimValue(form.Diametre),
        Matiere: trimValue(form.Matiere),
        Classe: trimValue(form.Classe),
        Pression: trimValue(form.Pression),
        Longueur: parseDecimal(form.Longueur),
        Largeur: parseDecimal(form.Largeur),
        Epaisseur: parseDecimal(form.Epaisseur),
        Couleur: trimValue(form.Couleur),
        Caracteristiques: trimValue(form.Caracteristiques),
        // Include price fields for ArticlePrixHistorique handling in backend
        PrixFournitureHT: form.PrixFournitureHT,
        PrixPoseHT: form.PrixPoseHT,
        DateDebutApplication: form.DateDebutApplication,
        DateFinApplication: form.DateFinApplication,
      };

      let articleResult;
      if (editingId) {
        articleResult = await updateArticle(editingId, payload);
        alertSuccess('Succès', 'Article modifié avec succès.');
      } else {
        articleResult = await createArticle(payload);
        alertSuccess('Succès', 'Article créé avec succès.');
        
        // Handle Article Prix Historique for fourniture if values are provided (only for new articles)
        if (form.PrixFournitureHT || form.PrixPoseHT) {
          try {
            const prixPayload = {
              TypePrix: 'FOURNITURE',
              PrixHT: parseDecimal(form.PrixFournitureHT),
              TauxTVA: parseDecimal(globalTVA) || 0,
              DateDebutApplication: form.DateDebutApplication || new Date().toISOString().split('T')[0],
              DateFinApplication: form.DateFinApplication || null,
              EstActif: true,
            };

            // Only create price history if PrixHT is provided
            if (prixPayload.PrixHT !== null) {
              const articleId = articleResult.IdArticle;
              await createArticlePrixHistorique(articleId, prixPayload);
            }
          } catch (priceError) {
            // Error creating price history for fourniture
            // We don't stop the main operation if price history fails
          }
        }

        // Handle Article Prix Historique for pose if values are provided (only for new articles)
        if (form.PrixFournitureHT || form.PrixPoseHT) {
          try {
            const prixPayload = {
              TypePrix: 'POSE',
              PrixHT: parseDecimal(form.PrixPoseHT),
              TauxTVA: parseDecimal(globalTVA) || 0,
              DateDebutApplication: form.DateDebutApplication || new Date().toISOString().split('T')[0],
              DateFinApplication: form.DateFinApplication || null,
              EstActif: true,
            };

            // Only create price history if PrixHT is provided
            if (prixPayload.PrixHT !== null) {
              const articleId = articleResult.IdArticle;
              await createArticlePrixHistorique(articleId, prixPayload);
            }
          } catch (priceError) {
            // Error creating price history for pose
            // We don't stop the main operation if price history fails
          }
        }
      }
      resetForm();
      const updatedArticles = await getArticles();
      setArticles(updatedArticles || []);
    } catch (e) {
      const message = e.response?.data?.error || `Erreur lors de la ${editingId ? 'modification' : 'création'} de l'article.`;
      setError(message);
      alertError('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
          Gestion des Articles
        </h1>

        {/* Formulaire de création/modification */}
        <div className="glass-card p-4 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1 dark:text-white text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {editingId ? 'Modifier un Article' : 'Créer un Nouvel Article'}
            </h2>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-3 p-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section: Informations principales */}
            <div>
              <h3 className="text-sm font-semibold mb-2 dark:text-white text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informations principales
              </h3>
              
              <div className="space-y-3">
                {/* Famille avec icône + */}
                <div className="flex gap-2 items-end relative famille-dropdown-container">
                  <div className="flex-1">
                    <label className="block text-xs font-medium dark:text-gray-300 text-gray-700 mb-1">
                      Famille d'Article <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={familleSearch}
                        onChange={handleFamilleSearchChange}
                        onFocus={() => {
                          setShowFamilleDropdown(true);
                          // Set the search value to the current selected family label
                          const selectedFamille = familles.find(f => f.IdFamille === parseInt(form.IdFamille));
                          setFamilleSearch(selectedFamille ? selectedFamille.LibelleFamille : '');
                        }}
                        placeholder="Rechercher..."
                        className="w-full px-3 py-1.5 pr-8 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                        required
                      />
                      <svg
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {showFamilleDropdown && (
                        <>
                          {filteredFamilles.length > 0 ? (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredFamilles.map((famille) => (
                                <button
                                  key={famille.IdFamille}
                                  type="button"
                                  onClick={() => handleFamilleSelect(String(famille.IdFamille), famille.LibelleFamille)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-500/20 dark:hover:bg-primary-500/20 dark:text-white text-gray-900 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {famille.LibelleFamille}
                                </button>
                              ))}
                            </div>
                          ) : (
                            familleSearch && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Aucune famille trouvée</p>
                              </div>
                            )
                          )}
                        </>
                      )}
                    </div>
                    {/* Hidden select to maintain form functionality */}
                    <select
                      name="IdFamille"
                      value={form.IdFamille}
                      onChange={handleChange}
                      className="hidden"
                      required
                    >
                      <option value="">Sélectionner une famille</option>
                      {familles.map((famille) => (
                        <option key={famille.IdFamille} value={famille.IdFamille}>
                          {famille.LibelleFamille}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFamilleModal(true)}
                    className="p-1.5 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 hover:border-primary-500/50 transition-all group"
                    title="Créer une nouvelle famille"
                  >
                    <svg className="w-4 h-4 text-primary-500 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Désignation */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-300 text-gray-700 mb-1">
                    Désignation <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="Designation"
                    value={form.Designation}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Ex: Tuyau, Raccord, Manchon, Coude..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                    required
                  />
                </div>

                {/* Unité */}
                <div className="max-w-xs relative unite-dropdown-container">
                  <label className="block text-xs font-medium dark:text-gray-300 text-gray-700 mb-1">
                    Unité <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.Unite}
                      onChange={handleUniteSearchChange}
                      onFocus={() => {
                        setShowUniteDropdown(true);
                        setUniteSearch(form.Unite);
                      }}
                      maxLength={50}
                      placeholder="Rechercher..."
                      className="w-full px-3 py-1.5 pr-8 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                      required
                    />
                    <svg
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {showUniteDropdown && (
                      <>
                        {filteredUnites.length > 0 ? (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredUnites.map((unite) => (
                              <button
                                key={unite}
                                type="button"
                                onClick={() => handleUniteSelect(unite)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-500/20 dark:hover:bg-primary-500/20 dark:text-white text-gray-900 transition-colors first:rounded-t-lg last:rounded-b-lg"
                              >
                                {unite}
                              </button>
                            ))}
                          </div>
                        ) : (
                          uniteSearch && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Aucune unité trouvée</p>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-300 text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="Description"
                    value={form.Description}
                    onChange={handleChange}
                    maxLength={500}
                    rows={2}
                    placeholder="Description détaillée de l'article..."
                    className="w-full px-3 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Variantes (optionnel) */}
            <div className="border-t dark:border-white/10 border-gray-200/50 pt-3">
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Spécifications Techniques <span className="text-xs font-normal text-gray-400">(optionnel)</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Diamètre
                  </label>
                  <input
                    name="Diametre"
                    value={form.Diametre}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="DN15"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                  
                <div className="relative matiere-dropdown-container">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Matière
                  </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.Matiere}
                        onChange={handleMatiereSearchChange}
                        onFocus={() => {
                          setShowMatiereDropdown(true);
                          setMatiereSearch(form.Matiere);
                        }}
                        maxLength={50}
                        placeholder="Rechercher..."
                        className="w-full px-3 py-2 pr-8 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                      />
                      <svg
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {showMatiereDropdown && (
                        <>
                          {filteredMatieres.length > 0 ? (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredMatieres.map((matiere) => (
                                <button
                                  key={matiere}
                                  type="button"
                                  onClick={() => handleMatiereSelect(matiere)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-500/20 dark:hover:bg-primary-500/20 dark:text-white text-gray-900 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {matiere}
                                </button>
                              ))}
                            </div>
                          ) : (
                            matiereSearch && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Aucune matière trouvée</p>
                              </div>
                            )
                          )}
                        </>
                      )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Classe
                  </label>
                  <input
                    name="Classe"
                    value={form.Classe}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="C6"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Pression
                  </label>
                  <input
                    name="Pression"
                    value={form.Pression}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="PN10"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Longueur
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Longueur"
                    value={form.Longueur}
                    onChange={handleChange}
                    placeholder="m"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Largeur
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Largeur"
                    value={form.Largeur}
                    onChange={handleChange}
                    placeholder="cm"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Épaisseur
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Epaisseur"
                    value={form.Epaisseur}
                    onChange={handleChange}
                    placeholder="mm"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Couleur
                  </label>
                  <input
                    name="Couleur"
                    value={form.Couleur}
                    onChange={handleChange}
                    maxLength={30}
                    placeholder="Bleu"
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Caractéristiques
                  </label>
                  <textarea
                    name="Caracteristiques"
                    value={form.Caracteristiques}
                    onChange={handleChange}
                    maxLength={500}
                    rows={2}
                    placeholder="Informations complémentaires..."
                    className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Prix */}
            <div className="border-t dark:border-white/10 border-gray-200/50 pt-3">
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Historique des Prix <span className="text-xs font-normal text-gray-400">(optionnel)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Prix HT Fourniture */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Prix HT Fourniture
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="PrixFournitureHT"
                    value={form.PrixFournitureHT}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                {/* Prix HT Pose */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Prix HT Pose
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="PrixPoseHT"
                    value={form.PrixPoseHT}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                {/* Date Début Application */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Date Début Application
                  </label>
                  <input
                    type="date"
                    name="DateDebutApplication"
                    value={form.DateDebutApplication}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                
                {/* Taux TVA */}
                <div>
                  <label className="block text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">
                    Taux TVA utilisé
                  </label>
                  <div className="w-full px-2 py-1.5 text-sm rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 flex items-center">
                    <span className="font-bold text-primary-500">{globalTVA}%</span>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {editingId 
                  ? "Modifier ces informations créera un nouvel historique des prix pour l'article." 
                  : "Ces informations seront enregistrées comme l'historique des prix de l'article."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t dark:border-white/10 border-gray-200/50">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-1.5 text-sm bg-gray-500/80 hover:bg-gray-500 text-white rounded-lg font-medium shadow-lg transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-sm bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium shadow-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 118-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    En cours...
                  </>
                ) : (
                  <>
                    {editingId ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Modifier
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Créer
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Modal de création de famille */}
        {showFamilleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold dark:text-white text-gray-900">
                  Créer une Nouvelle Famille d'Article
                </h3>
                <button
                  onClick={() => {
                    setShowFamilleModal(false);
                    setFamilleForm({ LibelleFamille: '', Description: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Le code famille sera généré automatiquement au format FAM-XXX.
              </p>
              <form onSubmit={handleCreateFamille} className="space-y-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Libellé Famille *
                  </label>
                  <input
                    type="text"
                    value={familleForm.LibelleFamille}
                    onChange={(e) => setFamilleForm({ ...familleForm, LibelleFamille: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={familleForm.Description}
                    onChange={(e) => setFamilleForm({ ...familleForm, Description: e.target.value })}
                    maxLength={255}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submittingFamille}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submittingFamille ? 'Création...' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFamilleModal(false);
                      setFamilleForm({ LibelleFamille: '', Description: '' });
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liste des articles */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-xl font-semibold mb-4 md:mb-0 dark:text-white text-gray-900">
              Liste des Articles
            </h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm w-64"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto relative">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-white/10 border-gray-200 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900 rounded-tl-lg">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Désignation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Famille</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Unité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Prix HT</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Date Application</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900 rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">Aucun article trouvé</p>
                          <p className="text-sm mt-1">Aucun article ne correspond à votre recherche</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => (
                      <tr
                        key={article.IdArticle}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b dark:border-white/10 border-gray-200 transition-colors"
                        onMouseEnter={(e) => {
                          // Do nothing on hover - card should not appear
                          e.stopPropagation();
                        }}
                        onMouseLeave={() => {
                          // Do nothing on leave
                        }}
                      >
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-mono">
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                            {article.CodeArticle}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-medium">
                          {article.Designation}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                            {article.LibelleFamille || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.Unite}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          <div className="space-y-1">
                            {article.PrixFournitureHT != null && (
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">F:</span>
                                <span className="font-semibold">{parseFloat(article.PrixFournitureHT).toFixed(2)}</span>
                              </div>
                            )}
                            {article.PrixPoseHT != null && (
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">P:</span>
                                <span className="font-semibold">{parseFloat(article.PrixPoseHT).toFixed(2)}</span>
                              </div>
                            )}
                            {article.PrixFournitureHT == null && article.PrixPoseHT == null && (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.DateDebutFourniture || article.DateDebutPose 
                            ? new Date(article.DateDebutFourniture || article.DateDebutPose).toLocaleDateString('fr-FR') 
                            : '—'}
                        </td>
                        <td className="py-3 px-4 actions-cell">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(article.IdArticle)}
                              className="text-primary-500 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-500/10 transition-colors"
                              title="Modifier"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Show the hover card when clicking the eye icon
                                try {
                                  // Get button position before async call
                                  const buttonRect = e.currentTarget.getBoundingClientRect();
                                  const viewportWidth = window.innerWidth;
                                  const viewportHeight = window.innerHeight;
                                  
                                  console.log('Loading article details for ID:', article.IdArticle);
                                  // Validate the article ID
                                  if (!article.IdArticle) {
                                    throw new Error('ID d\'article invalide');
                                  }
                                  
                                  // Load article details
                                  setLoadingHoverDetails(true);
                                  const details = await getArticleById(article.IdArticle);
                                  console.log('Article details loaded:', details);
                                  setHoveredArticleDetails(details);
                                  
                                  // Position the card near the button
                                  const cardWidth = 320;
                                  const cardHeight = 400;
                                  
                                  let x = buttonRect.right + 10;
                                  let y = buttonRect.top + window.scrollY;
                                  
                                  if (x + cardWidth > viewportWidth - 10) {
                                    x = buttonRect.left - cardWidth - 10;
                                    if (x < 10) {
                                      x = Math.max(10, viewportWidth - cardWidth - 10);
                                    }
                                  }
                                  
                                  if (y + cardHeight > viewportHeight - 10) {
                                    y = Math.max(10, viewportHeight - cardHeight - 10);
                                  }
                                  
                                  if (y < 10) {
                                    y = 10;
                                  }
                                  
                                  const finalX = Math.max(10, x);
                                  const finalY = Math.max(10, y);
                                  
                                  setHoverPosition({ x: finalX, y: finalY });
                                  setHoveredArticle(article);
                                  setShowHoverCard(true);
                                } catch (error) {
                                  // Error loading article details
                                  setHoveredArticleDetails(null);
                                  console.error('Error loading article details:', error);
                                  const errorMessage = error.response?.data?.error || error.message || 'Impossible de charger les détails de l\'article.';
                                  alertError('Erreur', errorMessage);
                                } finally {
                                  setLoadingHoverDetails(false);
                                }
                              }}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-500/10 transition-colors view-details-btn"
                              title="Voir détails"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Carte d'information au survol */}
        {hoveredArticle && showHoverCard && hoverPosition.x > 0 && hoverPosition.y > 0 && (
          <div
            className="fixed z-[9999] p-4 shadow-2xl border-2 dark:border-white/30 border-gray-400 rounded-lg max-w-sm w-80 pointer-events-auto bg-white dark:bg-gray-800 backdrop-blur-xl"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'block',
              visibility: 'visible',
              opacity: 1,
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              // Annuler le timeout de fermeture quand on entre dans la carte
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                setHideTimeout(null);
              }
              setShowHoverCard(true);
            }}
            onMouseLeave={() => {
              // Fermer la carte quand on la quitte
              const timeout = setTimeout(() => {
                setShowHoverCard(false);
                setHoveredArticle(null);
                setHoveredArticleDetails(null);
              }, 300);
              setHideTimeout(timeout);
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b dark:border-white/10 border-gray-200 pb-2">
                <h3 className="text-lg font-semibold dark:text-white text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {hoveredArticle.Designation}
                </h3>
              </div>
              
              {loadingHoverDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : hoveredArticleDetails ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Code:</span>
                    <span className="dark:text-gray-400 text-gray-600 font-mono">{hoveredArticleDetails.CodeArticle}</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Famille:</span>
                    <span className="dark:text-gray-400 text-gray-600">{hoveredArticleDetails.LibelleFamille || '—'}</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Unité:</span>
                    <span className="dark:text-gray-400 text-gray-600">{hoveredArticleDetails.Unite}</span>
                  </div>
                  
                  {/* Display prices */}
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Prix:</span>
                    <div className="space-y-1">
                      {hoveredArticleDetails.PrixFournitureHT != null && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">F:</span>
                          <span className="font-semibold">{parseFloat(hoveredArticleDetails.PrixFournitureHT).toFixed(2)}</span>
                        </div>
                      )}
                      {hoveredArticleDetails.PrixPoseHT != null && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">P:</span>
                          <span className="font-semibold">{parseFloat(hoveredArticleDetails.PrixPoseHT).toFixed(2)}</span>
                        </div>
                      )}
                      {hoveredArticleDetails.PrixFournitureHT == null && hoveredArticleDetails.PrixPoseHT == null && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  
                  {hoveredArticleDetails.Description && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Description:</span>
                      <span className="dark:text-gray-400 text-gray-600">{hoveredArticleDetails.Description}</span>
                    </div>
                  )}
                  
                  {(hoveredArticleDetails.Diametre || hoveredArticleDetails.Matiere || hoveredArticleDetails.Classe || hoveredArticleDetails.Pression) && (
                    <div className="pt-2 border-t dark:border-white/10 border-gray-200">
                      <div className="text-xs font-semibold dark:text-gray-400 text-gray-500 mb-1.5">Variantes:</div>
                      <div className="space-y-1">
                        {hoveredArticleDetails.Diametre && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-primary-500/20 text-primary-400">Diamètre: {hoveredArticleDetails.Diametre}</span>
                          </div>
                        )}
                        {hoveredArticleDetails.Matiere && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Matière: {hoveredArticleDetails.Matiere}</span>
                          </div>
                        )}
                        {hoveredArticleDetails.Classe && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Classe: {hoveredArticleDetails.Classe}</span>
                          </div>
                        )}
                        {hoveredArticleDetails.Pression && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">Pression: {hoveredArticleDetails.Pression}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(hoveredArticleDetails.Longueur || hoveredArticleDetails.Largeur || hoveredArticleDetails.Epaisseur || hoveredArticleDetails.Couleur) && (
                    <div className="pt-2 border-t dark:border-white/10 border-gray-200">
                      <div className="text-xs font-semibold dark:text-gray-400 text-gray-500 mb-1.5">Dimensions:</div>
                      <div className="space-y-1 text-xs dark:text-gray-400 text-gray-600">
                        {hoveredArticleDetails.Longueur && <div>Longueur: {hoveredArticleDetails.Longueur}</div>}
                        {hoveredArticleDetails.Largeur && <div>Largeur: {hoveredArticleDetails.Largeur}</div>}
                        {hoveredArticleDetails.Epaisseur && <div>Épaisseur: {hoveredArticleDetails.Epaisseur}</div>}
                        {hoveredArticleDetails.Couleur && <div>Couleur: {hoveredArticleDetails.Couleur}</div>}
                      </div>
                    </div>
                  )}
                  
                  {hoveredArticleDetails.Caracteristiques && (
                    <div className="pt-2 border-t dark:border-white/10 border-gray-200">
                      <div className="text-xs font-semibold dark:text-gray-400 text-gray-500 mb-1">Caractéristiques:</div>
                      <p className="text-xs dark:text-gray-400 text-gray-600 line-clamp-3">{hoveredArticleDetails.Caracteristiques}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Code:</span>
                    <span className="dark:text-gray-400 text-gray-600 font-mono">{hoveredArticle.CodeArticle}</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Famille:</span>
                    <span className="dark:text-gray-400 text-gray-600">{hoveredArticle.LibelleFamille || '—'}</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Unité:</span>
                    <span className="dark:text-gray-400 text-gray-600">{hoveredArticle.Unite}</span>
                  </div>
                  
                  {/* Display prices */}
                  <div className="flex items-start gap-2">
                    <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Prix:</span>
                    <div className="space-y-1">
                      {hoveredArticle.PrixFournitureHT != null && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">F:</span>
                          <span className="font-semibold">{parseFloat(hoveredArticle.PrixFournitureHT).toFixed(2)}</span>
                        </div>
                      )}
                      {hoveredArticle.PrixPoseHT != null && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">P:</span>
                          <span className="font-semibold">{parseFloat(hoveredArticle.PrixPoseHT).toFixed(2)}</span>
                        </div>
                      )}
                      {hoveredArticle.PrixFournitureHT == null && hoveredArticle.PrixPoseHT == null && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  
                  {hoveredArticle.Description && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium dark:text-gray-300 text-gray-700 min-w-[100px]">Description:</span>
                      <span className="dark:text-gray-400 text-gray-600">{hoveredArticle.Description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlesList;

