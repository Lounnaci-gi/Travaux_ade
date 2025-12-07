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
        Role: form.Role,
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
      Role: utilisateur.Role || '',
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
        Role: form.Role,
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

        {/* Formulaire de création - Style OBAT */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Créer un nouvel Utilisateur
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Remplissez les informations ci-dessous pour créer un nouveau compte utilisateur
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                  </div>
                </div>
              )}
              {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    Informations personnelles
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="Nom"
                      value={form.Nom}
                      onChange={handleChange}
                      placeholder="Dupont"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="Prenom"
                      value={form.Prenom}
                      onChange={handleChange}
                      placeholder="Jean"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="Email"
                      value={form.Email}
                      onChange={handleChange}
                      placeholder="jean.dupont@exemple.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Téléphone
                    </label>
                    <input
                      name="Telephone"
                      value={form.Telephone}
                      onChange={handleChange}
                      placeholder="0123456789"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Informations système */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    Informations système
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rôle <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="Role"
                      value={form.Role}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">Sélectionner un rôle</option>
                      {roles.map((r) => (
                        <option key={r.CodeRole} value={r.CodeRole} className="dark:bg-gray-700">
                          {r.LibelleRole}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unité
                    </label>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isChefCentreUser}
                    >
                      <option value="">Aucune</option>
                      {(isChefCentreUser ? unites.filter((u) => String(u.IdUnite) === String(form.IdUnite)) : unites).map((u) => (
                        <option key={u.IdUnite} value={u.IdUnite} className="dark:bg-gray-700">
                          {u.CodeUnite} - {u.NomUnite}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Centre
                    </label>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={shouldDisableCenterSelection()}
                    >
                      <option value="">Aucun</option>
                      {filteredCentres.map((c) => (
                        <option key={c.IdCentre} value={c.IdCentre} className="dark:bg-gray-700">
                          {c.CodeCentre} - {c.NomCentre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Agence
                    </label>
                    <select
                      name="IdAgence"
                      value={form.IdAgence}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={shouldDisableAgencySelection()}
                    >
                      <option value="">Aucune</option>
                      {filteredAgences.map((a) => (
                        <option key={a.IdAgence} value={a.IdAgence} className="dark:bg-gray-700">
                          {a.CodeAgence} - {a.NomAgence}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="MotDePasse"
                      value={form.MotDePasse}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                      minLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 6 caractères</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirmation du mot de passe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="ConfirmationMotDePasse"
                      value={form.ConfirmationMotDePasse}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="Actif"
                      checked={form.Actif}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Compte actif
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement...
                    </div>
                  ) : (
                    'Créer l\'Utilisateur'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <div className="mt-10 max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Liste des Utilisateurs</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{utilisateurs.length} utilisateur(s) enregistré(s)</p>
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
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualiser
                </button>
              </div>
            </div>
            
            {utilisateurs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun utilisateur</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Commencez par créer un nouvel utilisateur.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Matricule</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nom complet</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rôle</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Affectation</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {utilisateurs.map((utilisateur) => {
                      const canModify = canModifyUser(user, utilisateur);
                      const canDelete = canDeleteUser(user, utilisateur);
                      return (
                        <tr key={utilisateur.IdUtilisateur} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{utilisateur.Matricule}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{utilisateur.Nom} {utilisateur.Prenom}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{utilisateur.Telephone || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{utilisateur.Email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {utilisateur.Role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                                <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {utilisateur.Actif ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Actif
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Inactif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {canModify && (
                                <button
                                  onClick={() => handleEdit(utilisateur)}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                                  title="Modifier"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(utilisateur)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Supprimer"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Modal de modification */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Modifier l'utilisateur: {editingUser.Matricule}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="m-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                </div>
              </div>
            )}
            {success && (
              <div className="m-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdate} className="p-6">
              <div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Laissez le champ mot de passe vide si vous ne souhaitez pas le modifier.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    Informations personnelles
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                    <input
                      name="Nom"
                      value={form.Nom}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
                    <input
                      name="Prenom"
                      value={form.Prenom}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                    <input
                      type="email"
                      name="Email"
                      value={form.Email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                    <input
                      name="Telephone"
                      value={form.Telephone}
                      onChange={handleChange}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Informations système */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    Informations système
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôle *</label>
                    <select
                      name="Role"
                      value={form.Role}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                      disabled={!isAdmin(user) && isChefCentreUser}
                    >
                      <option value="">Sélectionner un rôle</option>
                      {roles.map((r) => (
                        <option key={r.CodeRole} value={r.CodeRole} className="dark:bg-gray-700">
                          {r.LibelleRole}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unité</label>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isChefCentreUser}
                    >
                      <option value="">Aucune</option>
                      {(isChefCentreUser ? unites.filter((u) => String(u.IdUnite) === String(form.IdUnite)) : unites).map((u) => (
                        <option key={u.IdUnite} value={u.IdUnite} className="dark:bg-gray-700">
                          {u.CodeUnite} - {u.NomUnite}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centre</label>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!form.IdUnite || isChefCentreUser}
                    >
                      <option value="">Aucun</option>
                      {filteredCentres.map((c) => (
                        <option key={c.IdCentre} value={c.IdCentre} className="dark:bg-gray-700">
                          {c.CodeCentre} - {c.NomCentre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agence</label>
                    <select
                      name="IdAgence"
                      value={form.IdAgence}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!form.IdCentre}
                    >
                      <option value="">Aucune</option>
                      {filteredAgences.map((a) => (
                        <option key={a.IdAgence} value={a.IdAgence} className="dark:bg-gray-700">
                          {a.CodeAgence} - {a.NomAgence}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau mot de passe (optionnel)</label>
                    <input
                      type="password"
                      name="MotDePasse"
                      value={form.MotDePasse}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmation du mot de passe</label>
                    <input
                      type="password"
                      name="ConfirmationMotDePasse"
                      value={form.ConfirmationMotDePasse}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="Actif"
                      checked={form.Actif}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Compte actif
                    </label>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    {isRoleRequiringCenter(form.Role) && (
                      <p className="text-sm text-blue-700 dark:text-blue-300"><strong>Note:</strong> Le rôle sélectionné doit être affecté à un centre.</p>
                    )}
                    {isRoleRequiringAgency(form.Role) && (
                      <p className="text-sm text-blue-700 dark:text-blue-300"><strong>Note:</strong> Le rôle sélectionné doit être affecté à une agence.</p>
                    )}
                    {isChefCentreUser && (
                      <p className="text-sm text-blue-700 dark:text-blue-300"><strong>Note:</strong> En tant que Chef de Centre, vous pouvez uniquement modifier des utilisateurs de votre centre.</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement...
                    </div>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilisateurForm;