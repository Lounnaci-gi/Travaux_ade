import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getRoles, getUnites, getCentres, getAgences, createUtilisateur, getUtilisateurs, updateUtilisateur, deleteUtilisateur } from '../services/api';
import { isAdmin, isChefCentre, canModifyUser, canDeleteUser } from '../utils/auth';

const UtilisateurForm = ({ user, onUnauthorized }) => {
  const [roles, setRoles] = useState([]);
  const [unites, setUnites] = useState([]);
  const [centres, setCentres] = useState([]);
  const [agences, setAgences] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({
    Role: '',  // Changé de IdRole à Role
    IdUnite: '',
    IdCentre: '',
    IdAgence: '',
    Nom: '',
    Prenom: '',
    Email: '',
    Telephone: '',
    MotDePasse: '',
    ConfirmationMotDePasse: '',
    Actif: true,
  });

  const isChefCentreUser = isChefCentre(user);

  useEffect(() => {
    if (!isAdmin(user) && !isChefCentreUser) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des utilisateurs.');
      }
    }
  }, [user, onUnauthorized, isChefCentreUser]);

  useEffect(() => {
    if (!isAdmin(user) && !isChefCentreUser) return;
    const load = async () => {
      try {
        setLoading(true);
        const [rolesList, unitesList, centresList, agencesList, utilisateursList] = await Promise.all([
          getRoles(),
          getUnites(),
          getCentres(),
          getAgences(),
          getUtilisateurs()
        ]);
        setRoles(rolesList || []);
        setUnites(unitesList || []);
        setCentres(centresList || []);
        setAgences(agencesList || []);
        setUtilisateurs(utilisateursList || []);

        // Si chef de centre, pré-remplir et verrouiller centre (et l'unité associée)
        if (isChefCentreUser && user?.idCentre) {
          const centreObj = (centresList || []).find((c) => c.IdCentre === Number(user.idCentre));
          setForm((prev) => ({
            ...prev,
            IdCentre: String(user.idCentre),
            IdUnite: centreObj ? String(centreObj.IdUnite) : prev.IdUnite,
          }));
        }
      } catch (e) {
        console.error('Error loading data:', e);
        // More detailed error message
        if (e.response) {
          // Server responded with error status
          setError(`Erreur serveur (${e.response.status}): ${e.response.data?.error || 'Erreur inconnue'}`);
        } else if (e.request) {
          // Request was made but no response received
          setError('Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
        } else {
          // Something else happened
          setError(`Erreur: ${e.message || 'Erreur inconnue lors du chargement des données'}`);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isChefCentreUser]);

  if (!isAdmin(user) && !isChefCentreUser) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs ou chefs de centre autorisés peuvent créer des utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
    setSuccess('');
  };

  // Function to check if a role requires center assignment
  const isRoleRequiringCenter = (role) => {
    if (!role) return false;
    const roleStr = role.toString().toLowerCase();
    return (
      (roleStr.includes('chef') && roleStr.includes('centre')) ||
      roleStr.includes('juridique') || roleStr.includes('jurid') ||
      (roleStr.includes('technico') && roleStr.includes('commercial'))
    );
  };

  // Function to check if a role requires agency assignment
  const isRoleRequiringAgency = (role) => {
    if (!role) return false;
    const roleStr = role.toString().toLowerCase();
    return (
      roleStr.includes('agence') && !roleStr.includes('centre') &&
      !roleStr.includes('juridique') && !roleStr.includes('jurid') &&
      !(roleStr.includes('technico') && roleStr.includes('commercial'))
    );
  };

  // Filtrer les centres selon l'unité sélectionnée
  const centresByUnite = form.IdUnite
    ? centres.filter((c) => c.IdUnite === Number(form.IdUnite))
    : centres;
  const filteredCentres = isChefCentreUser && user?.idCentre
    ? centresByUnite.filter((c) => c.IdCentre === Number(user.idCentre))
    : centresByUnite;

  // Filtrer les agences selon le centre sélectionné
  const filteredAgences = form.IdCentre
    ? agences.filter((a) => a.IdCentre === Number(form.IdCentre))
    : [];

  // Determine if center selection should be disabled
  const shouldDisableCenterSelection = () => {
    // If user is Chef de Centre, they can only assign to their own center
    if (isChefCentreUser) return true;
    
    // If role requires center assignment, center selection should be enabled
    if (isRoleRequiringCenter(form.Role)) return false;
    
    // For other roles, follow normal logic
    return !form.IdUnite || isChefCentreUser;
  };

  // Determine if agency selection should be disabled
  const shouldDisableAgencySelection = () => {
    // If role requires center assignment, agency should be disabled
    if (isRoleRequiringCenter(form.Role)) return true;
    
    // If role requires agency assignment, agency selection should be enabled when center is selected
    if (isRoleRequiringAgency(form.Role)) return !form.IdCentre;
    
    // For other roles, follow normal logic
    return !form.IdCentre;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const required = ['Role', 'Nom', 'Prenom', 'Email', 'MotDePasse'];
    const missing = required.filter((f) => !form[f]);
    if (missing.length) {
      setError(`Veuillez remplir tous les champs obligatoires: ${missing.join(', ')}`);
      return;
    }

    if (form.MotDePasse !== form.ConfirmationMotDePasse) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (form.MotDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Validation pour Chef de Centre: peut créer uniquement pour son centre ou agences de son centre
    if (isChefCentreUser) {
      if (!form.IdCentre || String(form.IdCentre) !== String(user.idCentre)) {
        setError('En tant que Chef de Centre, vous pouvez uniquement créer des utilisateurs pour votre centre ou ses agences');
        return;
      }
    }

    // Validation spécifique pour les rôles qui nécessitent un centre
    if (isRoleRequiringCenter(form.Role)) {
      if (!form.IdCentre) {
        setError('Ce rôle doit être associé à un centre');
        return;
      }
    }

    // Validation spécifique pour les rôles qui nécessitent une agence
    if (isRoleRequiringAgency(form.Role)) {
      if (!form.IdAgence) {
        setError('Ce rôle doit être associé à une agence');
        return;
      }
    }

    const confirmed = await confirmDialog('Confirmer', 'Créer cet utilisateur ?');
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const payload = {
        Role: form.Role,  // Changé de IdRole à Role
        IdUnite: form.IdUnite ? Number(form.IdUnite) : null,
        IdCentre: form.IdCentre ? Number(form.IdCentre) : null,
        IdAgence: form.IdAgence ? Number(form.IdAgence) : null,
        Nom: form.Nom.trim(),
        Prenom: form.Prenom.trim(),
        Email: form.Email.trim(),
        Telephone: form.Telephone || null,
        MotDePasse: form.MotDePasse,
        Actif: form.Actif,
      };

      const created = await createUtilisateur(payload);
      alertSuccess('Succès', `Utilisateur créé: ${created.Matricule}`);
      setSuccess('Utilisateur créé avec succès');
      setForm({
        Role: '',  // Changé de IdRole à Role
        IdUnite: '',
        IdCentre: '',
        IdAgence: '',
        Nom: '',
        Prenom: '',
        Email: '',
        Telephone: '',
        MotDePasse: '',
        ConfirmationMotDePasse: '',
        Actif: true,
      });
      
      // Recharger la liste
      const utilisateursList = await getUtilisateurs();
      setUtilisateurs(utilisateursList || []);
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la création de l\'utilisateur';
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (utilisateur) => {
    setEditingUser(utilisateur);
    setForm({
      Role: utilisateur.Role || '',  // Changé de IdRole à Role
      IdUnite: utilisateur.IdUnite ? String(utilisateur.IdUnite) : '',
      IdCentre: utilisateur.IdCentre ? String(utilisateur.IdCentre) : '',
      IdAgence: utilisateur.IdAgence ? String(utilisateur.IdAgence) : '',
      Nom: utilisateur.Nom,
      Prenom: utilisateur.Prenom,
      Email: utilisateur.Email,
      Telephone: utilisateur.Telephone || '',
      MotDePasse: '',
      ConfirmationMotDePasse: '',
      Actif: utilisateur.Actif,
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingUser) return;

    // Validation
    const required = ['Role', 'Nom', 'Prenom', 'Email'];
    const missing = required.filter((f) => !form[f]);
    if (missing.length) {
      setError(`Veuillez remplir tous les champs obligatoires: ${missing.join(', ')}`);
      return;
    }

    if (form.MotDePasse && form.MotDePasse !== form.ConfirmationMotDePasse) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (form.MotDePasse && form.MotDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Validation pour Chef de Centre: peut modifier uniquement pour son centre ou agences de son centre
    if (isChefCentreUser) {
      if (!form.IdCentre || String(form.IdCentre) !== String(user.idCentre)) {
        setError('En tant que Chef de Centre, vous pouvez uniquement modifier des utilisateurs de votre centre ou ses agences');
        return;
      }
    }

    // Validation spécifique pour les rôles qui nécessitent un centre
    if (isRoleRequiringCenter(form.Role)) {
      if (!form.IdCentre) {
        setError('Ce rôle doit être associé à un centre');
        return;
      }
    }

    // Validation spécifique pour les rôles qui nécessitent une agence
    if (isRoleRequiringAgency(form.Role)) {
      if (!form.IdAgence) {
        setError('Ce rôle doit être associé à une agence');
        return;
      }
    }

    const confirmed = await confirmDialog('Confirmer', 'Modifier cet utilisateur ?');
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const payload = {
        Role: form.Role,  // Changé de IdRole à Role
        IdUnite: form.IdUnite ? Number(form.IdUnite) : null,
        IdCentre: form.IdCentre ? Number(form.IdCentre) : null,
        IdAgence: form.IdAgence ? Number(form.IdAgence) : null,
        Nom: form.Nom.trim(),
        Prenom: form.Prenom.trim(),
        Email: form.Email.trim(),
        Telephone: form.Telephone || null,
        Actif: form.Actif,
      };

      // Ajouter le mot de passe seulement s'il est fourni
      if (form.MotDePasse) {
        payload.MotDePasse = form.MotDePasse;
      }

      await updateUtilisateur(editingUser.IdUtilisateur, payload);
      alertSuccess('Succès', 'Utilisateur modifié avec succès');
      setSuccess('Utilisateur modifié avec succès');
      setShowEditModal(false);
      setEditingUser(null);
      
      // Recharger la liste
      const utilisateursList = await getUtilisateurs();
      setUtilisateurs(utilisateursList || []);
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la modification de l\'utilisateur';
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (utilisateur) => {
    const confirmed = await confirmDialog(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'utilisateur ${utilisateur.Nom} ${utilisateur.Prenom} (${utilisateur.Matricule}) ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    try {
      await deleteUtilisateur(utilisateur.IdUtilisateur);
      alertSuccess('Succès', 'Utilisateur supprimé avec succès');
      
      // Recharger la liste
      const utilisateursList = await getUtilisateurs();
      setUtilisateurs(utilisateursList || []);
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la suppression de l\'utilisateur';
      alertError('Erreur', msg);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="container-obat">
        <div className="mb-8 text-center">
          <h1 className="section-title text-gradient mb-2">
            Gestion des Utilisateurs
          </h1>
          <p className="section-subtitle">Créer et gérer les utilisateurs</p>
        </div>

        {/* Formulaire de création */}
        <div className="solid-card mb-8">
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 border-gray-200/50 pb-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Créer un nouvel Utilisateur
              </h2>
              <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                Remplissez les informations ci-dessous pour créer un nouveau compte utilisateur
              </p>
            </div>
            <div className="hidden md:block">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 border border-primary-500/30">
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne de gauche - Informations personnelles */}
              <div className="space-y-6">
                {/* Informations personnelles */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary-500/10">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white text-gray-900">Informations personnelles</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                          Nom <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="Nom"
                          value={form.Nom}
                          onChange={handleChange}
                          placeholder="Dupont"
                          className="w-full px-3 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                          Prénom <span className="text-red-400">*</span>
                        </label>
                        <input
                          name="Prenom"
                          value={form.Prenom}
                          onChange={handleChange}
                          placeholder="Jean"
                          className="w-full px-3 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="Email"
                          value={form.Email}
                          onChange={handleChange}
                          placeholder="jean.dupont@exemple.com"
                          className="w-full pl-10 pr-4 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                        Téléphone
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          name="Telephone"
                          value={form.Telephone}
                          onChange={handleChange}
                          placeholder="0123456789"
                          maxLength={10}
                          className="w-full pl-10 pr-4 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Rôle et Affectation */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white text-gray-900">Rôle et affectation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                        Rôle <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <select
                          name="Role"
                          value={form.Role}
                          onChange={handleChange}
                          className="select-field w-full pl-10 pr-4 py-2"
                          required
                        >
                          <option value="">Sélectionner un rôle</option>
                          {roles.map((r) => (
                            <option key={r.CodeRole} value={r.CodeRole} className="dark:bg-slate-800 bg-white">
                              {r.LibelleRole}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Unité</label>
                        <select
                          name="IdUnite"
                          value={form.IdUnite}
                          onChange={(e) => {
                            handleChange(e);
                            setForm((prev) => ({
                              ...prev,
                              IdUnite: e.target.value,
                              IdCentre: '',
                              IdAgence: '',
                            }));
                          }}
                          className="select-field w-full px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isChefCentreUser}
                        >
                          <option value="">Aucune</option>
                          {(isChefCentreUser ? unites.filter((u) => String(u.IdUnite) === String(form.IdUnite)) : unites).map((u) => (
                            <option key={u.IdUnite} value={u.IdUnite} className="dark:bg-slate-800 bg-white">
                              {u.CodeUnite} - {u.NomUnite}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Centre</label>
                        <select
                          name="IdCentre"
                          value={form.IdCentre}
                          onChange={(e) => {
                            handleChange(e);
                            setForm((prev) => ({
                              ...prev,
                              IdCentre: e.target.value,
                              IdAgence: isRoleRequiringCenter(form.Role) ? '' : prev.IdAgence,
                            }));
                          }}
                          className="select-field w-full px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={shouldDisableCenterSelection()}
                        >
                          <option value="">Aucun</option>
                          {filteredCentres.map((c) => (
                            <option key={c.IdCentre} value={c.IdCentre} className="dark:bg-slate-800 bg-white">
                              {c.CodeCentre} - {c.NomCentre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Agence</label>
                        <select
                          name="IdAgence"
                          value={form.IdAgence}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={shouldDisableAgencySelection()}
                        >
                          <option value="">Aucune</option>
                          {filteredAgences.map((a) => (
                            <option key={a.IdAgence} value={a.IdAgence} className="dark:bg-slate-800 bg-white">
                              {a.CodeAgence} - {a.NomAgence}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Colonne de droite - Sécurité et statut */}
              <div className="space-y-6">
                {/* Sécurité */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white text-gray-900">Sécurité</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                        Mot de passe <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          name="MotDePasse"
                          value={form.MotDePasse}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          required
                          minLength={6}
                        />
                      </div>
                      <p className="mt-1 text-xs dark:text-gray-400 text-gray-600">Minimum 6 caractères</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                        Confirmation <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          name="ConfirmationMotDePasse"
                          value={form.ConfirmationMotDePasse}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2 rounded-lg dark:bg-slate-700/50 bg-white border dark:border-slate-600/50 border-gray-300 dark:text-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Statut du compte */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white text-gray-900">Statut du compte</h3>
                  </div>
                  
                  <div className="p-4 rounded-lg dark:bg-slate-700/30 bg-gray-50 border dark:border-slate-600/30 border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="Actif"
                        checked={form.Actif}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-medium dark:text-white text-gray-900">Compte actif</span>
                        <p className="text-xs dark:text-gray-400 text-gray-600">L'utilisateur pourra se connecter immédiatement</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Boutons d'action */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForm({
                      Role: '',
                      IdUnite: '',
                      IdCentre: '',
                      IdAgence: '',
                      Nom: '',
                      Prenom: '',
                      Email: '',
                      Telephone: '',
                      MotDePasse: '',
                      ConfirmationMotDePasse: '',
                      Actif: true,
                    })}
                    className="btn btn-secondary"
                  >
                    Réinitialiser
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Créer l'Utilisateur
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Liste des utilisateurs */}
        <div className="solid-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Liste des Utilisateurs</h2>
              <p className="text-sm dark:text-gray-400 text-gray-600">{utilisateurs.length} utilisateur(s) enregistré(s)</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  // Reset form to refresh data
                  setForm({
                    Role: '',
                    IdUnite: '',
                    IdCentre: '',
                    IdAgence: '',
                    Nom: '',
                    Prenom: '',
                    Email: '',
                    Telephone: '',
                    MotDePasse: '',
                    ConfirmationMotDePasse: '',
                    Actif: true,
                  });
                }}
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualiser
              </button>
            </div>
          </div>
          
          {utilisateurs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg mb-2">Aucun utilisateur enregistré</p>
              <p className="text-sm">Commencez par créer un nouvel utilisateur</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10 dark:border-white/10 border-gray-200/50">
              <table className="w-full min-w-full">
                <thead className="bg-white/5 dark:bg-white/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Matricule</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Nom complet</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Rôle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Affectation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateurs.map((utilisateur) => {
                    const canModify = canModifyUser(user, utilisateur);
                    const canDelete = canDeleteUser(user, utilisateur);
                    return (
                      <tr key={utilisateur.IdUtilisateur} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-medium">{utilisateur.Matricule}</td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          <div>
                            <div className="font-medium">{utilisateur.Nom} {utilisateur.Prenom}</div>
                            <div className="text-xs dark:text-gray-400 text-gray-500">{utilisateur.Telephone || '—'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.Email}</td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                            {utilisateur.Role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          <div className="space-y-1">
                            {utilisateur.NomUnite && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>🏢</span>
                                <span>{utilisateur.NomUnite}</span>
                              </div>
                            )}
                            {utilisateur.NomCentre && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>📍</span>
                                <span>{utilisateur.NomCentre}</span>
                              </div>
                            )}
                            {utilisateur.NomAgence && (
                              <div className="flex items-center gap-1 text-xs">
                                <span>🏪</span>
                                <span>{utilisateur.NomAgence}</span>
                              </div>
                            )}
                            {!utilisateur.NomUnite && !utilisateur.NomCentre && !utilisateur.NomAgence && (
                              <span className="text-xs dark:text-gray-400 text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {utilisateur.Actif ? (
                            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-400"></span>
                              Actif
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-400"></span>
                              Inactif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            {canModify && (
                              <button
                                onClick={() => handleEdit(utilisateur)}
                                className="p-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 transition-colors"
                                title="Modifier"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(utilisateur)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                title="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            {!canModify && !canDelete && (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de modification */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900">
                Modifier l'utilisateur: {editingUser.Matricule}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm mb-4">{error}</div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm mb-4">{success}</div>
            )}

            <form onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne de gauche - Informations personnelles et rôle */}
                <div className="space-y-6">
                  <div className="mb-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                    <p className="text-sm text-primary-300 dark:text-primary-400">
                      <strong>Note:</strong> Laissez le champ mot de passe vide si vous ne souhaitez pas le modifier.
                    </p>
                  </div>
                  
                  {/* Informations personnelles */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary-500/10">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white text-gray-900">Informations personnelles</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom *</label>
                          <input
                            name="Nom"
                            value={form.Nom}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Prénom *</label>
                          <input
                            name="Prenom"
                            value={form.Prenom}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          name="Email"
                          value={form.Email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone</label>
                        <input
                          name="Telephone"
                          value={form.Telephone}
                          onChange={handleChange}
                          maxLength={10}
                          className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Rôle et Affectation */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white text-gray-900">Rôle et affectation</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Rôle *</label>
                        <select
                          name="Role"
                          value={form.Role}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                          required
                          disabled={!isAdmin(user) && isChefCentreUser}
                        >
                          <option value="">Sélectionner un rôle</option>
                          {roles.map((r) => (
                            <option key={r.CodeRole} value={r.CodeRole} className="text-black">
                              {r.LibelleRole}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Unité</label>
                          <select
                            name="IdUnite"
                            value={form.IdUnite}
                            onChange={(e) => {
                              handleChange(e);
                              setForm((prev) => ({
                                ...prev,
                                IdUnite: e.target.value,
                                IdCentre: '',
                                IdAgence: '',
                              }));
                            }}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            disabled={isChefCentreUser}
                          >
                            <option value="">Aucune</option>
                            {(isChefCentreUser ? unites.filter((u) => String(u.IdUnite) === String(form.IdUnite)) : unites).map((u) => (
                              <option key={u.IdUnite} value={u.IdUnite} className="text-black">
                                {u.CodeUnite} - {u.NomUnite}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Centre</label>
                          <select
                            name="IdCentre"
                            value={form.IdCentre}
                            onChange={(e) => {
                              handleChange(e);
                              setForm((prev) => ({
                                ...prev,
                                IdCentre: e.target.value,
                                IdAgence: '',
                              }));
                            }}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            disabled={!form.IdUnite || isChefCentreUser}
                          >
                            <option value="">Aucun</option>
                            {filteredCentres.map((c) => (
                              <option key={c.IdCentre} value={c.IdCentre} className="text-black">
                                {c.CodeCentre} - {c.NomCentre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Agence</label>
                          <select
                            name="IdAgence"
                            value={form.IdAgence}
                            onChange={handleChange}
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            disabled={!form.IdCentre}
                          >
                            <option value="">Aucune</option>
                            {filteredAgences.map((a) => (
                              <option key={a.IdAgence} value={a.IdAgence} className="text-black">
                                {a.CodeAgence} - {a.NomAgence}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30 text-sm dark:text-primary-300 text-primary-600">
                        {isRoleRequiringCenter(form.Role) && (
                          <p><strong>Note:</strong> Le rôle sélectionné doit être affecté à un centre.</p>
                        )}
                        {isRoleRequiringAgency(form.Role) && (
                          <p><strong>Note:</strong> Le rôle sélectionné doit être affecté à une agence.</p>
                        )}
                        {isChefCentreUser && (
                          <p><strong>Note:</strong> En tant que Chef de Centre, vous pouvez uniquement modifier des utilisateurs de votre centre.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Colonne de droite - Sécurité et statut */}
                <div className="space-y-6">
                  {/* Sécurité */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white text-gray-900">Sécurité</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nouveau mot de passe (optionnel)</label>
                        <input
                          type="password"
                          name="MotDePasse"
                          value={form.MotDePasse}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Confirmation mot de passe</label>
                        <input
                          type="password"
                          name="ConfirmationMotDePasse"
                          value={form.ConfirmationMotDePasse}
                          onChange={handleChange}
                          className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Statut du compte */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white text-gray-900">Statut du compte</h3>
                    </div>
                    
                    <div className="p-4 rounded-lg dark:bg-slate-700/30 bg-gray-50 border dark:border-slate-600/30 border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="Actif"
                          checked={form.Actif}
                          onChange={handleChange}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-medium dark:text-white text-gray-900">Compte actif</span>
                          <p className="text-xs dark:text-gray-400 text-gray-600">L'utilisateur pourra se connecter immédiatement</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                        setError('');
                        setSuccess('');
                      }}
                      className="btn btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Enregistrer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilisateurForm;

