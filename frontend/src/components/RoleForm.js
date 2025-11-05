import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getRoles, createRole } from '../services/api';
import { isAdmin } from '../utils/auth';

const RoleForm = ({ user, onUnauthorized }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    CodeRole: '',
    LibelleRole: '',
    Description: '',
    Actif: true,
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const required = ['CodeRole', 'LibelleRole'];
    const missing = required.filter((f) => !form[f]);
    if (missing.length) {
      setError(`Veuillez remplir tous les champs obligatoires: ${missing.join(', ')}`);
      return;
    }

    // Validation du format du code (lettres, chiffres, underscore, tiret)
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!codeRegex.test(form.CodeRole)) {
      setError('Le code du rôle ne peut contenir que des lettres, chiffres, tirets et underscores');
      return;
    }

    const confirmed = await confirmDialog('Confirmer', 'Créer ce rôle ?');
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const payload = {
        CodeRole: form.CodeRole.trim().toUpperCase(),
        LibelleRole: form.LibelleRole.trim(),
        Description: form.Description.trim() || null,
        Actif: form.Actif,
      };

      const created = await createRole(payload);
      alertSuccess('Succès', `Rôle créé: ${created.CodeRole}`);
      setSuccess('Rôle créé avec succès');
      setForm({
        CodeRole: '',
        LibelleRole: '',
        Description: '',
        Actif: true,
      });
      
      // Recharger la liste
      const rolesList = await getRoles();
      setRoles(rolesList || []);
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la création du rôle';
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
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Créer un nouveau Rôle</h2>
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
                {submitting ? 'Enregistrement...' : 'Créer le Rôle'}
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

