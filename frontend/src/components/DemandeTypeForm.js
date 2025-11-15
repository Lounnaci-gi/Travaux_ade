import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getDemandeTypes, createDemandeType, updateDemandeType, getRoles, getDemandeTypesDiagnostic, testDemandeTypesAuthorizations } from '../services/api';
import { isAdmin, isChefCentre } from '../utils/auth';

const DemandeTypeForm = ({ user, onUnauthorized }) => {
  const [types, setTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    roles: false,
    validationsDemande: false,
    validationsOE: false,
  });
  const [form, setForm] = useState({
    LibelleType: '',
    Description: '',
    RolesAutorises: [], // Liste des codes de rôles autorisés (strings)
    ValidationChefSectionRelationClienteleRequise: false,
    ValidationJuridiqueRequise: false,
    ValidationChefAgenceRequise: false,
    ValidationChefCentreRequise: false,
    ValidationOE_ChefSectionRelationClienteleRequise: false,
    ValidationOE_ChefAgenceRequise: false,
    ValidationOE_ChefCentreRequise: false,
    Actif: true,
  });
  // Stockage des validations supplémentaires (rôles sans champ BDD)
  const [validationsDemandeExtra, setValidationsDemandeExtra] = useState({}); // { CodeRole: boolean }
  const [validationsOEExtra, setValidationsOEExtra] = useState({}); // { CodeRole: boolean }
  // État pour l'autocomplétion du libellé
  const [libelleSuggestions, setLibelleSuggestions] = useState([]);
  const [showLibelleSuggestions, setShowLibelleSuggestions] = useState(false);
  const [libelleSearchTerm, setLibelleSearchTerm] = useState('');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filtrer les rôles pour exclure l'Admin
  const getRolesWithoutAdmin = () => {
    return roles.filter(role => 
      role.CodeRole?.toUpperCase() !== 'ADMINISTRATEUR' && 
      role.CodeRole?.toUpperCase() !== 'ADMIN'
    );
  };

  // Mapping des rôles vers les champs de validation pour la Demande
  const getValidationFieldForDemande = (codeRole) => {
    const mapping = {
      'CHEF_SECTION_RELATIONS_CLIENTELE': 'ValidationChefSectionRelationClienteleRequise',
      'CHEF_SERVICE_JURIDIQUE': 'ValidationJuridiqueRequise',
      'CHEF_AGENCE_COMMERCIALE': 'ValidationChefAgenceRequise',
      'CHEF_CENTRE': 'ValidationChefCentreRequise',
    };
    return mapping[codeRole?.toUpperCase()];
  };

  // Mapping des rôles vers les champs de validation pour l'Ordre d'Exécution
  const getValidationFieldForOE = (codeRole) => {
    const mapping = {
      'CHEF_SECTION_RELATIONS_CLIENTELE': 'ValidationOE_ChefSectionRelationClienteleRequise',
      'CHEF_AGENCE_COMMERCIALE': 'ValidationOE_ChefAgenceRequise',
      'CHEF_CENTRE': 'ValidationOE_ChefCentreRequise',
    };
    return mapping[codeRole?.toUpperCase()];
  };

  // Vérifier si un rôle peut valider une demande
  const canRoleValidateDemande = (codeRole) => {
    return ['CHEF_SECTION_RELATIONS_CLIENTELE', 'CHEF_SERVICE_JURIDIQUE', 'CHEF_AGENCE_COMMERCIALE', 'CHEF_CENTRE'].includes(codeRole?.toUpperCase());
  };

  // Vérifier si un rôle peut valider un ordre d'exécution
  const canRoleValidateOE = (codeRole) => {
    return ['CHEF_SECTION_RELATIONS_CLIENTELE', 'CHEF_AGENCE_COMMERCIALE', 'CHEF_CENTRE'].includes(codeRole?.toUpperCase());
  };

  // Handler pour les validations de demande par rôle
  const handleValidationDemandeChange = (codeRole, checked) => {
    const fieldName = getValidationFieldForDemande(codeRole);
    if (fieldName) {
      // Rôle avec champ BDD
      setForm(prev => ({ ...prev, [fieldName]: checked }));
    } else {
      // Rôle sans champ BDD, stocker dans l'état extra
      setValidationsDemandeExtra(prev => ({
        ...prev,
        [codeRole?.toUpperCase()]: checked
      }));
    }
  };

  // Handler pour les validations d'ordre d'exécution par rôle
  const handleValidationOEChange = (codeRole, checked) => {
    const fieldName = getValidationFieldForOE(codeRole);
    if (fieldName) {
      // Rôle avec champ BDD
      setForm(prev => ({ ...prev, [fieldName]: checked }));
    } else {
      // Rôle sans champ BDD, stocker dans l'état extra
      setValidationsOEExtra(prev => ({
        ...prev,
        [codeRole?.toUpperCase()]: checked
      }));
    }
  };

  // Obtenir la valeur de validation pour une demande
  const getValidationDemandeValue = (codeRole) => {
    const fieldName = getValidationFieldForDemande(codeRole);
    if (fieldName) {
      return form[fieldName];
    }
    // Si pas de champ BDD, utiliser le stockage extra
    return validationsDemandeExtra[codeRole?.toUpperCase()] || false;
  };

  // Obtenir la valeur de validation pour un ordre d'exécution
  const getValidationOEValue = (codeRole) => {
    const fieldName = getValidationFieldForOE(codeRole);
    if (fieldName) {
      return form[fieldName];
    }
    // Si pas de champ BDD, utiliser le stockage extra
    return validationsOEExtra[codeRole?.toUpperCase()] || false;
  };

  // Fonction pour parser la Description (format JSON ou texte simple)
  const parseDescription = (desc) => {
    if (!desc) return { description: '', roles: [], validationsDemande: {}, validationsOE: {} };
    try {
      const parsed = JSON.parse(desc);
      return {
        description: parsed.d || parsed.description || '',
        roles: parsed.r || parsed.roles || [],
        validationsDemande: parsed.vd || parsed.validationsDemande || {},
        validationsOE: parsed.vo || parsed.validationsOE || {}
      };
    } catch {
      // Si ce n'est pas du JSON, c'est une description simple
      return { description: desc, roles: [], validationsDemande: {}, validationsOE: {} };
    }
  };

  // Fonction pour formater la Description avec les rôles et validations
  const formatDescription = (description, roles, validationsDemande = {}, validationsOE = {}) => {
    const hasRoles = roles && roles.length > 0;
    const hasValidationsDemande = Object.keys(validationsDemande).length > 0;
    const hasValidationsOE = Object.keys(validationsOE).length > 0;
    
    if (!description && !hasRoles && !hasValidationsDemande && !hasValidationsOE) return null;
    if (!hasRoles && !hasValidationsDemande && !hasValidationsOE) return description;
    
    return JSON.stringify({ 
      d: description || '', 
      r: roles || [],
      vd: validationsDemande,
      vo: validationsOE
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      const [data, rolesData] = await Promise.all([
        getDemandeTypes(),
        getRoles()
      ]);
      setTypes(data);
      setRoles(rolesData || []);
    } catch (e) {
      setError('Erreur lors du chargement des types de travaux');
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnostic = async () => {
    try {
      setLoadingDiagnostic(true);
      const data = await getDemandeTypesDiagnostic();
      setDiagnostic(data);
      setShowDiagnostic(true);
    } catch (e) {
      console.error('Erreur lors du chargement du diagnostic:', e);
      alertError('Erreur', 'Impossible de charger le diagnostic des types de travaux');
    } finally {
      setLoadingDiagnostic(false);
    }
  };

  const loadTestAuthorizations = async () => {
    try {
      setLoadingTest(true);
      const data = await testDemandeTypesAuthorizations();
      setTestResults(data);
      setShowTest(true);
    } catch (e) {
      console.error('Erreur lors du test des autorisations:', e);
      alertError('Erreur', 'Impossible de tester les autorisations');
    } finally {
      setLoadingTest(false);
    }
  };

  useEffect(() => {
    // Vérifier que seul l'admin et le chef de centre peuvent accéder
    if (!isAdmin(user) && !isChefCentre(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs et les chefs de centre peuvent gérer les types de travaux.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (isAdmin(user) || isChefCentre(user)) {
      load();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
    setSuccess('');
    
    // Gestion de l'autocomplétion pour le libellé
    if (name === 'LibelleType') {
      setLibelleSearchTerm(value);
      if (value.length > 0) {
        // Filtrer les libellés existants (exclure celui en cours d'édition)
        const filtered = types
          .filter(t => t.IdDemandeType !== editingId && t.LibelleType && t.LibelleType.toLowerCase().includes(value.toLowerCase()))
          .map(t => t.LibelleType)
          .filter((libelle, index, self) => self.indexOf(libelle) === index) // Supprimer les doublons
          .slice(0, 5); // Limiter à 5 suggestions
        setLibelleSuggestions(filtered);
        setShowLibelleSuggestions(filtered.length > 0);
      } else {
        setLibelleSuggestions([]);
        setShowLibelleSuggestions(false);
      }
    }
  };

  const handleLibelleSelect = (libelle) => {
    setForm(prev => ({ ...prev, LibelleType: libelle }));
    setLibelleSearchTerm(libelle);
    setShowLibelleSuggestions(false);
    setLibelleSuggestions([]);
  };

  const handleRoleChange = (roleCode, checked) => {
    setForm((prev) => {
      const roles = checked
        ? [...prev.RolesAutorises, roleCode]
        : prev.RolesAutorises.filter(code => code !== roleCode);
      return { ...prev, RolesAutorises: roles };
    });
  };

  const resetForm = () => {
    setForm({ 
      LibelleType: '', 
      Description: '', 
      RolesAutorises: [],
      ValidationChefSectionRelationClienteleRequise: false,
      ValidationJuridiqueRequise: false, 
      ValidationChefAgenceRequise: false, 
      ValidationChefCentreRequise: false,
      ValidationOE_ChefSectionRelationClienteleRequise: false,
      ValidationOE_ChefAgenceRequise: false,
      ValidationOE_ChefCentreRequise: false,
      Actif: true
    });
    setValidationsDemandeExtra({});
    setValidationsOEExtra({});
    setLibelleSearchTerm('');
    setLibelleSuggestions([]);
    setShowLibelleSuggestions(false);
    setEditingId(null);
    setExpandedSections({
      roles: false,
      validationsDemande: false,
      validationsOE: false,
    });
  };

  const handleEdit = (type) => {
    console.log('handleEdit - Type sélectionné:', type);
    
    const parsed = parseDescription(type.Description);
    console.log('handleEdit - Description parsée:', parsed);
    
    // Extraire les rôles autorisés et s'assurer qu'ils sont des strings
    let rolesAutorises = parsed.roles || [];
    // Convertir les nombres en strings si nécessaire (pour compatibilité avec les anciens formats)
    rolesAutorises = rolesAutorises.map(role => {
      if (typeof role === 'number') {
        // Si c'est un nombre, essayer de trouver le code de rôle correspondant
        const roleObj = roles.find(r => r.IdRole === role);
        return roleObj ? roleObj.CodeRole : String(role);
      }
      return String(role); // S'assurer que c'est une string
    });
    console.log('handleEdit - Rôles autorisés (normalisés):', rolesAutorises);
    
    const validationsDemandeExtra = parsed.validationsDemande || {};
    const validationsOEExtra = parsed.validationsOE || {};
    
    // Fonction helper pour convertir les valeurs BIT (0/1, true/false, etc.) en booléen
    const toBoolean = (value) => {
      if (value === true || value === 1 || value === '1' || value === 'true') return true;
      if (value === false || value === 0 || value === '0' || value === 'false') return false;
      return Boolean(value);
    };
    
    // Charger les validations depuis les champs BDD
    const validationChefSectionRC = toBoolean(type.ValidationChefSectionRelationClienteleRequise);
    const validationJuridique = toBoolean(type.ValidationJuridiqueRequise);
    const validationChefAgence = toBoolean(type.ValidationChefAgenceRequise);
    const validationChefCentre = toBoolean(type.ValidationChefCentreRequise);
    const validationOE_ChefSectionRC = toBoolean(type.ValidationOE_ChefSectionRelationClienteleRequise);
    const validationOE_ChefAgence = toBoolean(type.ValidationOE_ChefAgenceRequise);
    const validationOE_ChefCentre = toBoolean(type.ValidationOE_ChefCentreRequise);
    const isActive = toBoolean(type.Actif);
    
    const hasValidationsDemande = validationChefSectionRC || 
                                   validationJuridique || 
                                   validationChefAgence || 
                                   validationChefCentre ||
                                   Object.keys(validationsDemandeExtra).length > 0;
    const hasValidationsOE = validationOE_ChefSectionRC || 
                             validationOE_ChefAgence || 
                             validationOE_ChefCentre ||
                             Object.keys(validationsOEExtra).length > 0;
    
    console.log('handleEdit - Validations chargées:', {
      validationChefSectionRC,
      validationJuridique,
      validationChefAgence,
      validationChefCentre,
      validationOE_ChefSectionRC,
      validationOE_ChefAgence,
      validationOE_ChefCentre,
      isActive,
      validationsDemandeExtra,
      validationsOEExtra
    });
    
    setForm({
      LibelleType: type.LibelleType || '',
      Description: parsed.description || '',
      RolesAutorises: rolesAutorises,
      ValidationChefSectionRelationClienteleRequise: validationChefSectionRC,
      ValidationJuridiqueRequise: validationJuridique,
      ValidationChefAgenceRequise: validationChefAgence,
      ValidationChefCentreRequise: validationChefCentre,
      ValidationOE_ChefSectionRelationClienteleRequise: validationOE_ChefSectionRC,
      ValidationOE_ChefAgenceRequise: validationOE_ChefAgence,
      ValidationOE_ChefCentreRequise: validationOE_ChefCentre,
      Actif: isActive,
    });
    
    setValidationsDemandeExtra(validationsDemandeExtra);
    setValidationsOEExtra(validationsOEExtra);
    setLibelleSearchTerm(type.LibelleType || '');
    setLibelleSuggestions([]);
    setShowLibelleSuggestions(false);
    
    // Ouvrir automatiquement les sections qui ont des valeurs
    setExpandedSections({
      roles: rolesAutorises.length > 0,
      validationsDemande: hasValidationsDemande,
      validationsOE: hasValidationsOE,
    });
    
    setEditingId(type.IdDemandeType);
    setError('');
    setSuccess('');
    
    console.log('handleEdit - Formulaire chargé avec succès');
    
    // Scroll vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.LibelleType) {
      setError('Libellé est requis');
      return;
    }
    
    const isEditing = editingId !== null;
    const confirmed = await confirmDialog(
      isEditing ? 'Confirmer la modification' : 'Confirmer la création',
      isEditing 
        ? 'Êtes-vous sûr de vouloir modifier ce type de travaux ?'
        : 'Êtes-vous sûr de vouloir créer ce type de travaux ?'
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      setSubmitting(true);
      // Formater la description avec les rôles autorisés et les validations supplémentaires
      const descriptionFormatted = formatDescription(
        form.Description, 
        form.RolesAutorises,
        validationsDemandeExtra,
        validationsOEExtra
      );
      const formData = {
        ...form,
        Description: descriptionFormatted
      };
      
      if (isEditing) {
        const updated = await updateDemandeType(editingId, formData);
        setSuccess(`Type modifié: ${updated.LibelleType}`);
        alertSuccess('Succès', `Type modifié: ${updated.LibelleType}`);
      } else {
        const created = await createDemandeType(formData);
        setSuccess(`Type créé: ${created.LibelleType}`);
        alertSuccess('Succès', `Type créé: ${created.LibelleType}`);
      }
      resetForm();
      await load();
    } catch (e) {
      console.error('Erreur complète:', e);
      console.error('Response:', e.response);
      let msg = 'Erreur inconnue';
      if (e.response?.status === 404) {
        msg = 'Route non trouvée. Veuillez redémarrer le serveur backend.';
      } else if (e.response?.status === 401) {
        msg = 'Session expirée. Veuillez vous reconnecter.';
        // Rediriger vers la page de login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else if (e.response?.data?.error) {
        msg = e.response.data.error;
      } else if (isEditing) {
        msg = 'Erreur lors de la modification du type';
      } else {
        msg = 'Erreur lors de la création du type';
      }
      setError(msg);
      alertError('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Si l'utilisateur n'est pas admin ni chef de centre, ne rien afficher
  if (!isAdmin(user) && !isChefCentre(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-900">Accès refusé</h2>
          <p className="dark:text-gray-400 text-gray-600">Seuls les administrateurs et les chefs de centre peuvent gérer les types de travaux.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Types de Travaux
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et lister les types de travaux (DemandeType)</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6">
          {/* Messages d'alerte */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}
          
          {/* Bannière d'édition */}
          {editingId && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div>
                  <span className="text-blue-300 font-semibold">Mode édition</span>
                  <span className="text-blue-400/70 text-sm ml-2">ID: {editingId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Section: Informations de base */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informations de base
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                  Libellé <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input 
                    name="LibelleType" 
                    value={form.LibelleType} 
                    onChange={handleChange}
                    onFocus={() => {
                      if (form.LibelleType.length > 0 && libelleSuggestions.length > 0) {
                        setShowLibelleSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Délai pour permettre le clic sur une suggestion
                      setTimeout(() => setShowLibelleSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-2.5 pr-10 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" 
                    placeholder="Ex: Branchement nouveau" 
                    required
                    autoComplete="off"
                  />
                  {form.LibelleType && (
                    <svg 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  {showLibelleSuggestions && libelleSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-white/10 border-gray-200">
                        Suggestions basées sur les types existants
                      </div>
                      {libelleSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleLibelleSelect(suggestion)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors flex items-center gap-2 group"
                        >
                          <svg 
                            className="w-4 h-4 text-gray-400 group-hover:text-blue-500" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm dark:text-gray-300 text-gray-700 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {suggestion}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {libelleSuggestions.length > 0 && form.LibelleType && (
                  <p className="mt-1 text-xs text-gray-400">
                    {libelleSuggestions.length} suggestion{libelleSuggestions.length > 1 ? 's' : ''} trouvée{libelleSuggestions.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                  Statut
                </label>
                {editingId ? (
                  <label className="flex items-center gap-3 h-full px-4 py-2.5 rounded-lg dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 cursor-pointer hover:bg-white/10 transition-colors">
                    <input 
                      type="checkbox" 
                      name="Actif" 
                      checked={form.Actif} 
                      onChange={handleChange} 
                      className="w-5 h-5 accent-green-500 cursor-pointer" 
                    />
                    <div>
                      <span className="text-sm font-medium dark:text-gray-300 text-gray-700">
                        {form.Actif ? 'Actif' : 'Inactif'}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {form.Actif ? 'Visible dans les listes' : 'Masqué des listes'}
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center h-full px-4 py-2.5 rounded-lg dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200">
                    <span className="text-sm text-gray-400">Défini lors de l'édition</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                Description
              </label>
              <textarea 
                name="Description" 
                value={form.Description} 
                onChange={handleChange} 
                rows="3"
                className="w-full px-4 py-2.5 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none" 
                placeholder="Description optionnelle du type de travaux"
              />
            </div>
          </div>

          {/* Section: Rôles autorisés (repliable) */}
          <div className="mb-6 border-t dark:border-white/10 border-gray-200/50 pt-6">
            <button
              type="button"
              onClick={() => toggleSection('roles')}
              className="w-full flex items-center justify-between text-left mb-4 group"
            >
              <h3 className="text-lg font-semibold dark:text-white text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Rôles autorisés
                {form.RolesAutorises.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                    {form.RolesAutorises.length} sélectionné{form.RolesAutorises.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.roles ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.roles && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Sélectionnez les rôles autorisés à créer ce type de demande. Si aucun rôle n'est sélectionné, tous les utilisateurs peuvent créer ce type. <span className="text-purple-400 font-medium">L'Administrateur a une autorisation globale et n'apparaît pas dans cette liste.</span>
                </p>
                {(() => {
                  const rolesWithoutAdmin = getRolesWithoutAdmin();
                  return rolesWithoutAdmin.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rolesWithoutAdmin.map((role) => (
                        <label 
                          key={role.CodeRole} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            form.RolesAutorises.includes(role.CodeRole)
                              ? 'bg-purple-500/20 border-purple-500/50 dark:bg-purple-500/10'
                              : 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={form.RolesAutorises.includes(role.CodeRole)}
                            onChange={(e) => handleRoleChange(role.CodeRole, e.target.checked)}
                            className="w-5 h-5 accent-purple-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium dark:text-gray-300 text-gray-700 block">
                              {role.LibelleRole}
                            </span>
                            <span className="text-xs text-gray-400">{role.CodeRole}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun rôle disponible</p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section: Validations Demande (repliable) */}
          <div className="mb-6 border-t dark:border-white/10 border-gray-200/50 pt-6">
            <button
              type="button"
              onClick={() => toggleSection('validationsDemande')}
              className="w-full flex items-center justify-between text-left mb-4 group"
            >
              <h3 className="text-lg font-semibold dark:text-white text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validations requises - Demande
                {(() => {
                  const rolesWithoutAdmin = getRolesWithoutAdmin();
                  const count = rolesWithoutAdmin.filter(role => getValidationDemandeValue(role.CodeRole)).length;
                  return count > 0 ? (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                      {count} validation{count > 1 ? 's' : ''}
                    </span>
                  ) : null;
                })()}
              </h3>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.validationsDemande ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.validationsDemande && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Sélectionnez les rôles qui doivent valider ce type de demande. <span className="text-cyan-400 font-medium">L'Administrateur a une autorisation globale et n'apparaît pas dans cette liste.</span>
                </p>
                {(() => {
                  const rolesWithoutAdmin = getRolesWithoutAdmin();
                  const colors = ['cyan', 'blue', 'purple', 'green', 'orange', 'pink', 'indigo', 'teal'];
                  
                  // Mapping des couleurs par code de rôle
                  const getColorClasses = (codeRole, isChecked, index) => {
                    const colorMap = {
                      'CHEF_SECTION_RELATIONS_CLIENTELE': {
                        checked: 'bg-cyan-500/20 border-cyan-500/50 dark:bg-cyan-500/10',
                        accent: 'accent-cyan-500'
                      },
                      'CHEF_SERVICE_JURIDIQUE': {
                        checked: 'bg-blue-500/20 border-blue-500/50 dark:bg-blue-500/10',
                        accent: 'accent-blue-500'
                      },
                      'CHEF_AGENCE_COMMERCIALE': {
                        checked: 'bg-purple-500/20 border-purple-500/50 dark:bg-purple-500/10',
                        accent: 'accent-purple-500'
                      },
                      'CHEF_CENTRE': {
                        checked: 'bg-green-500/20 border-green-500/50 dark:bg-green-500/10',
                        accent: 'accent-green-500'
                      },
                      'CHEF_SERVICE_TECHNICO_COMMERCIAL': {
                        checked: 'bg-orange-500/20 border-orange-500/50 dark:bg-orange-500/10',
                        accent: 'accent-orange-500'
                      },
                      'UTILISATEUR_STANDARD': {
                        checked: 'bg-pink-500/20 border-pink-500/50 dark:bg-pink-500/10',
                        accent: 'accent-pink-500'
                      }
                    };
                    const mappedColors = colorMap[codeRole?.toUpperCase()];
                    if (mappedColors) {
                      return {
                        container: isChecked ? mappedColors.checked : 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 hover:bg-white/10',
                        checkbox: mappedColors.accent
                      };
                    }
                    // Pour les autres rôles, utiliser une couleur par défaut
                    return {
                      container: isChecked ? 'bg-indigo-500/20 border-indigo-500/50 dark:bg-indigo-500/10' : 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 hover:bg-white/10',
                      checkbox: 'accent-indigo-500'
                    };
                  };
                  
                  return rolesWithoutAdmin.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rolesWithoutAdmin.map((role, index) => {
                        const isChecked = getValidationDemandeValue(role.CodeRole);
                        const colorClasses = getColorClasses(role.CodeRole, isChecked, index);
                        return (
                          <label 
                            key={role.IdRole}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${colorClasses.container}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => handleValidationDemandeChange(role.CodeRole, e.target.checked)} 
                              className={`w-5 h-5 ${colorClasses.checkbox} cursor-pointer`}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium dark:text-gray-300 text-gray-700 block">
                                {role.LibelleRole}
                              </span>
                              <span className="text-xs text-gray-400">Validation pour la demande</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Aucun rôle disponible pour la validation des demandes
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section: Validations Ordre d'Exécution (repliable) */}
          <div className="mb-6 border-t dark:border-white/10 border-gray-200/50 pt-6">
            <button
              type="button"
              onClick={() => toggleSection('validationsOE')}
              className="w-full flex items-center justify-between text-left mb-4 group"
            >
              <h3 className="text-lg font-semibold dark:text-white text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Validations requises - Ordre d'Exécution
                {(() => {
                  const rolesWithoutAdmin = getRolesWithoutAdmin();
                  const count = rolesWithoutAdmin.filter(role => getValidationOEValue(role.CodeRole)).length;
                  return count > 0 ? (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      {count} validation{count > 1 ? 's' : ''}
                    </span>
                  ) : null;
                })()}
              </h3>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.validationsOE ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.validationsOE && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Sélectionnez les rôles qui doivent valider l'ordre d'exécution. <span className="text-green-400 font-medium">L'Administrateur a une autorisation globale et n'apparaît pas dans cette liste.</span>
                </p>
                {(() => {
                  const rolesWithoutAdmin = getRolesWithoutAdmin();
                  const colors = ['cyan', 'blue', 'purple', 'green', 'orange', 'pink', 'indigo', 'teal'];
                  
                  // Mapping des couleurs par code de rôle pour OE
                  const getColorClassesOE = (codeRole, isChecked, index) => {
                    const colorMap = {
                      'CHEF_SECTION_RELATIONS_CLIENTELE': {
                        checked: 'bg-cyan-500/20 border-cyan-500/50 dark:bg-cyan-500/10',
                        accent: 'accent-cyan-500'
                      },
                      'CHEF_AGENCE_COMMERCIALE': {
                        checked: 'bg-purple-500/20 border-purple-500/50 dark:bg-purple-500/10',
                        accent: 'accent-purple-500'
                      },
                      'CHEF_CENTRE': {
                        checked: 'bg-green-500/20 border-green-500/50 dark:bg-green-500/10',
                        accent: 'accent-green-500'
                      },
                      'CHEF_SERVICE_JURIDIQUE': {
                        checked: 'bg-blue-500/20 border-blue-500/50 dark:bg-blue-500/10',
                        accent: 'accent-blue-500'
                      },
                      'CHEF_SERVICE_TECHNICO_COMMERCIAL': {
                        checked: 'bg-orange-500/20 border-orange-500/50 dark:bg-orange-500/10',
                        accent: 'accent-orange-500'
                      },
                      'UTILISATEUR_STANDARD': {
                        checked: 'bg-pink-500/20 border-pink-500/50 dark:bg-pink-500/10',
                        accent: 'accent-pink-500'
                      }
                    };
                    const mappedColors = colorMap[codeRole?.toUpperCase()];
                    if (mappedColors) {
                      return {
                        container: isChecked ? mappedColors.checked : 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 hover:bg-white/10',
                        checkbox: mappedColors.accent
                      };
                    }
                    // Pour les autres rôles, utiliser une couleur par défaut
                    return {
                      container: isChecked ? 'bg-indigo-500/20 border-indigo-500/50 dark:bg-indigo-500/10' : 'dark:bg-white/5 bg-gray-50 dark:border-white/10 border-gray-200 hover:bg-white/10',
                      checkbox: 'accent-indigo-500'
                    };
                  };
                  
                  return rolesWithoutAdmin.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rolesWithoutAdmin.map((role, index) => {
                        const isChecked = getValidationOEValue(role.CodeRole);
                        const colorClasses = getColorClassesOE(role.CodeRole, isChecked, index);
                        return (
                          <label 
                            key={role.IdRole}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${colorClasses.container}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => handleValidationOEChange(role.CodeRole, e.target.checked)} 
                              className={`w-5 h-5 ${colorClasses.checkbox} cursor-pointer`}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium dark:text-gray-300 text-gray-700 block">
                                {role.LibelleRole}
                              </span>
                              <span className="text-xs text-gray-400">Validation pour l'ordre d'exécution</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Aucun rôle disponible pour la validation des ordres d'exécution
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-white/10 border-gray-200/50">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2.5 rounded-lg bg-gray-500/80 hover:bg-gray-500 text-white font-medium shadow-lg transition-colors"
              >
                Annuler
              </button>
            )}
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingId ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  {editingId ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Modifier le type
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Créer le type
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Section Diagnostic */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">Diagnostic des autorisations</h2>
            <div className="flex gap-2">
              <button
                onClick={loadTestAuthorizations}
                disabled={loadingTest}
                className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingTest ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Test...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Tester tous les utilisateurs
                  </>
                )}
              </button>
              <button
                onClick={loadDiagnostic}
                disabled={loadingDiagnostic}
                className="px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingDiagnostic ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Chargement...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Vérifier les types
                  </>
                )}
              </button>
            </div>
          </div>
          
          {showTest && testResults && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-sm text-blue-300">
                  <strong>Test effectué le:</strong> {new Date(testResults.dateTest).toLocaleString('fr-FR')}
                </div>
                <div className="text-sm text-blue-300 mt-1">
                  <strong>Utilisateurs testés:</strong> {testResults.totalUsers} | <strong>Types testés:</strong> {testResults.totalTypes}
                </div>
              </div>
              
              <div className="space-y-3">
                {testResults.results.map((userResult) => (
                  <div key={userResult.userId} className="p-4 rounded-lg border dark:border-white/10 border-gray-200/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white">{userResult.userName}</div>
                        <div className="text-sm text-gray-400">{userResult.userEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Rôle: <span className="font-mono">{userResult.userRole}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">{userResult.totalAccessible}</div>
                        <div className="text-xs text-gray-400">accessibles</div>
                        {userResult.totalInaccessible > 0 && (
                          <>
                            <div className="text-lg font-bold text-red-400 mt-1">{userResult.totalInaccessible}</div>
                            <div className="text-xs text-gray-400">inaccessibles</div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {userResult.inaccessibleTypes.length > 0 && (
                      <div className="mt-3 pt-3 border-t dark:border-white/10 border-gray-200/50">
                        <div className="text-sm font-medium text-red-400 mb-2">Types inaccessibles:</div>
                        <div className="space-y-1">
                          {userResult.inaccessibleTypes.map((type) => (
                            <div key={type.id} className="text-xs text-red-300">
                              • {type.libelle} ({type.code})
                              {type.rolesAutorises && type.rolesAutorises.length > 0 && (
                                <span className="text-red-400/70 ml-2">
                                  [Rôles requis: {type.rolesAutorises.join(', ')}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {showDiagnostic && diagnostic && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/50">
                  <div className="text-2xl font-bold text-blue-400">{diagnostic.totalTypes}</div>
                  <div className="text-sm text-gray-400">Total types</div>
                </div>
                <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50">
                  <div className="text-2xl font-bold text-green-400">{diagnostic.typesActifs}</div>
                  <div className="text-sm text-gray-400">Types actifs</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/50">
                  <div className="text-2xl font-bold text-purple-400">{diagnostic.typesAvecRoles}</div>
                  <div className="text-sm text-gray-400">Avec restrictions</div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                  <div className="text-2xl font-bold text-red-400">{diagnostic.typesAvecProblemes.length}</div>
                  <div className="text-sm text-gray-400">Avec problèmes</div>
                </div>
              </div>

              {diagnostic.typesAvecProblemes.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <h3 className="text-lg font-semibold text-red-400 mb-3">Types avec problèmes</h3>
                  <div className="space-y-2">
                    {diagnostic.typesAvecProblemes.map((type) => (
                      <div key={type.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div className="font-medium text-red-300">{type.libelle} ({type.code})</div>
                        <div className="text-sm text-red-400/80 mt-1">
                          <div>Problème: {type.probleme}</div>
                          <div className="mt-1">Rôles invalides: {JSON.stringify(type.rolesInvalides)}</div>
                          <button
                            onClick={() => {
                              const typeToEdit = types.find(t => t.IdDemandeType === type.id);
                              if (typeToEdit) {
                                handleEdit(typeToEdit);
                                setShowDiagnostic(false);
                              }
                            }}
                            className="mt-2 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs"
                          >
                            Corriger ce type
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnostic.recommandations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {diagnostic.recommandations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        rec.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                          : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                      }`}
                    >
                      <div className="font-medium">{rec.message}</div>
                      <div className="text-sm mt-1 opacity-80">{rec.action}</div>
                    </div>
                  ))}
                </div>
              )}

              {diagnostic.rolesUtilises.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Rôles utilisés</h3>
                  <div className="flex flex-wrap gap-2">
                    {diagnostic.rolesUtilises.map((role, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-300 text-xs">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white text-gray-900">Types existants</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : types.length === 0 ? (
            <p className="dark:text-gray-400 text-gray-600">Aucun type de travaux.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Libellé</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Rôles autorisés</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Validations requises</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.IdDemandeType} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-mono">{t.CodeType}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-semibold">{t.LibelleType}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                        {(() => {
                          const parsed = parseDescription(t.Description);
                          return parsed.description || '—';
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {(() => {
                          const parsed = parseDescription(t.Description);
                          const rolesAutorises = parsed.roles || [];
                          if (rolesAutorises.length === 0) {
                            return <span className="text-gray-400 text-xs">Tous les rôles</span>;
                          }
                          // Trouver les noms des rôles
                          const roleNames = rolesAutorises.map(roleCode => {
                            const role = roles.find(r => r.CodeRole === roleCode);
                            return role ? role.LibelleRole : roleCode;
                          });
                          return (
                            <div className="flex flex-wrap gap-1">
                              {roleNames.map((name, idx) => (
                                <span key={idx} className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                                  {name}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-semibold text-gray-400">Demande:</span>
                            {t.ValidationChefSectionRelationClienteleRequise && (
                              <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">Chef Section RC</span>
                            )}
                            {t.ValidationJuridiqueRequise && (
                              <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">Juridique</span>
                            )}
                            {t.ValidationChefAgenceRequise && (
                              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">Chef Agence</span>
                            )}
                            {t.ValidationChefCentreRequise && (
                              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Chef Centre</span>
                            )}
                            {!t.ValidationChefSectionRelationClienteleRequise && !t.ValidationJuridiqueRequise && !t.ValidationChefAgenceRequise && !t.ValidationChefCentreRequise && (
                              <span className="text-gray-400 text-xs">Aucune</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-semibold text-gray-400">Ordre Exécution:</span>
                            {t.ValidationOE_ChefSectionRelationClienteleRequise && (
                              <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">OE - Chef Section RC</span>
                            )}
                            {t.ValidationOE_ChefAgenceRequise && (
                              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">OE - Chef Agence</span>
                            )}
                            {t.ValidationOE_ChefCentreRequise && (
                              <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">OE - Chef Centre</span>
                            )}
                            {!t.ValidationOE_ChefSectionRelationClienteleRequise && !t.ValidationOE_ChefAgenceRequise && !t.ValidationOE_ChefCentreRequise && (
                              <span className="text-gray-400 text-xs">Aucune</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {t.Actif ? (
                          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Actif</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">Inactif</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                          title="Modifier"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
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
    </div>
  );
};

export default DemandeTypeForm;


