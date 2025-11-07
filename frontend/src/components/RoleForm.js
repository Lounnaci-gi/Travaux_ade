import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getRoles, createRole, updateRole, deleteRole } from '../services/api';
import { isAdmin } from '../utils/auth';

const RoleForm = ({ user, onUnauthorized }) => {
  const initialFormState = {
    CodeRole: '',
    LibelleRole: '',
    Description: '',
    Actif: true,
  };

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ ...initialFormState });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des rôles.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const loadRoles = async () => {
      try {
        setLoading(true);
        const rolesList = await getRoles();
        setRoles(rolesList || []);
      } catch (e) {
        setError('Erreur lors du chargement des rôles');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadRoles();
  }, [user]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs peuvent créer des rôles.
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

  const resetForm = () => {
    setForm({ ...initialFormState });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const codeValue = (form.CodeRole || '').trim();
    const labelValue = (form.LibelleRole || '').trim();

    if (!codeValue || !labelValue) {
      setError('Veuillez renseigner le code et le libellé du rôle.');
      return;
    }

    // Validation du format du code (lettres, chiffres, underscore, tiret)
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!codeRegex.test(codeValue)) {
      setError('Le code du rôle ne peut contenir que des lettres, chiffres, tirets et underscores');
      return;
    }

    const confirmMessage = editingId ? 'Modifier ce rôle ?' : 'Créer ce rôle ?';
    const confirmed = await confirmDialog('Confirmer', confirmMessage);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const descriptionValue = form.Description ? form.Description.trim() : '';
      const payload = {
        CodeRole: codeValue.toUpperCase(),
        LibelleRole: labelValue,
        Description: descriptionValue ? descriptionValue : null,
        Actif: !!form.Actif,
      };

      let result;
      if (editingId) {
        result = await updateRole(editingId, payload);
        alertSuccess('Succès', `Rôle modifié: ${result.CodeRole}`);
        setSuccess('Rôle modifié avec succès');
      } else {
        result = await createRole(payload);
        alertSuccess('Succès', `Rôle créé: ${result.CodeRole}`);
        setSuccess('Rôle créé avec succès');
      }

      resetForm();

      // Recharger la liste
      const rolesList = await getRoles();
      setRoles(rolesList || []);
    } catch (e) {
      const defaultMessage = editingId ? 'Erreur lors de la modification du rôle' : 'Erreur lors de la création du rôle';
      const msg = e.response?.data?.error || defaultMessage;
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (role) => {
    setForm({
      CodeRole: role.CodeRole || '',
      LibelleRole: role.LibelleRole || '',
      Description: role.Description || '',
      Actif: role.Actif ?? true,
    });
    setEditingId(role.IdRole);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (role) => {
    if ((role.CodeRole || '').toUpperCase() === 'ADMIN') {
      alertError('Action impossible', 'Le rôle ADMIN ne peut pas être supprimé.');
      return;
    }

    const confirmed = await confirmDialog('Confirmer la suppression', `Supprimer le rôle ${role.CodeRole} ?`);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await deleteRole(role.IdRole);
      alertSuccess('Succès', `Rôle supprimé: ${role.CodeRole}`);
      if (editingId === role.IdRole) {
        resetForm();
      }
      const rolesList = await getRoles();
      setRoles(rolesList || []);
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la suppression du rôle';
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Gestion des Rôles
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et gérer les rôles utilisateurs</p>
        </div>

        {/* Formulaire de création */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">
              {editingId ? 'Modifier le Rôle' : 'Créer un nouveau Rôle'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm mb-4">{error}</div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm mb-4">{success}</div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Code Rôle * <span className="text-xs text-gray-500">(ex: ADMIN, AGENT, CHEF_AGENCE)</span>
                  </label>
                  <input
                    name="CodeRole"
                    value={form.CodeRole}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 uppercase"
                    placeholder="ADMIN"
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lettres, chiffres, tirets et underscores uniquement</p>
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Libellé Rôle *</label>
                  <input
                    name="LibelleRole"
                    value={form.LibelleRole}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    placeholder="Administrateur"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Description</label>
                  <textarea
                    name="Description"
                    value={form.Description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    placeholder="Description du rôle et de ses permissions..."
                    rows={3}
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="Actif"
                    checked={form.Actif}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm dark:text-gray-300 text-gray-700">Rôle actif</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : editingId ? 'Modifier le Rôle' : 'Créer le Rôle'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des rôles */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Liste des Rôles</h2>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Aucun rôle enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Libellé</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.IdRole} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm font-medium dark:text-white text-gray-900">{role.CodeRole}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{role.LibelleRole}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{role.Description || '—'}</td>
                      <td className="py-3 px-4 text-sm">
                        {role.Actif ? (
                          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Actif</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">Inactif</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(role)}
                            disabled={submitting}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(role)}
                            disabled={submitting}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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

export default RoleForm;

