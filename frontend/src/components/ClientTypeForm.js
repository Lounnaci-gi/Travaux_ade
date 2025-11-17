import React, { useEffect, useRef, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getClientTypes, createClientType, updateClientType } from '../services/api';
import { isAdmin } from '../utils/auth';

const ClientTypeForm = ({ user }) => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const formRef = useRef(null);
  const [form, setForm] = useState({
    LibelleType: '',
    Description: '',
    Actif: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await getClientTypes();
      setTypes(data);
    } catch (e) {
      console.error('ClientType load error:', e?.response?.data || e.message);
      setError('Erreur lors du chargement des types de clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
    setSuccess('');
  };

  const handleEdit = (type) => {
    setEditingId(type.IdClientType);
    setForm({
      LibelleType: type.LibelleType,
      Description: type.Description || '',
      Actif: type.Actif
    });
    setError('');
    setSuccess('');
    
    // Scroll smoothly to the form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      LibelleType: '',
      Description: '',
      Actif: true,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!form.LibelleType) {
      setError('Libellé est requis');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (editingId) {
        // Update existing type
        const updated = await updateClientType(editingId, form);
        setSuccess(`Type client mis à jour: ${updated.LibelleType}`);
        alertSuccess('Succès', `Type client mis à jour: ${updated.LibelleType}`);
      } else {
        // Create new type
        const confirmed = await confirmDialog(
          'Confirmer la création',
          'Êtes-vous sûr de vouloir créer ce type de client ?'
        );
        
        if (!confirmed) {
          setSubmitting(false);
          return; // L'utilisateur a annulé
        }
        
        const created = await createClientType(form);
        setSuccess(`Type client créé: ${created.LibelleType} (Code: ${created.CodeType})`);
        alertSuccess('Succès', `Type client créé: ${created.LibelleType}`);
      }
      
      setForm({ LibelleType: '', Description: '', Actif: true });
      setEditingId(null);
      await load();
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de l\'opération sur le type client';
      setError(msg);
      alertError('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter types based on search term
  const filteredTypes = types.filter(type => {
    const term = searchTerm.toLowerCase();
    return (
      type.CodeType.toLowerCase().includes(term) ||
      type.LibelleType.toLowerCase().includes(term) ||
      (type.Description && type.Description.toLowerCase().includes(term))
    );
  });

  // Si l'utilisateur n'est pas admin, ne rien afficher
  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-900">Accès refusé</h2>
          <p className="dark:text-gray-400 text-gray-600">Seuls les administrateurs peuvent créer des types de clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Types de Clients
          </h1>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="glass-card p-6 space-y-4 mb-6">
          {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm">{success}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Libellé *</label>
              <input name="LibelleType" value={form.LibelleType} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Ex: Particulier" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Description</label>
              <input name="Description" value={form.Description} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Description optionnelle" />
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                <input type="checkbox" name="Actif" checked={form.Actif} onChange={handleChange} className="accent-blue-500" />
                Actif
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-6 py-3 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 font-semibold transition-colors"
              >
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg disabled:opacity-50">
              {submitting ? (editingId ? 'Mise à jour...' : 'Création...') : (editingId ? 'Mettre à jour' : 'Créer le type')}
            </button>
          </div>
        </form>

        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">Types existants</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 pl-10 w-full md:w-64"
              />
              <svg 
                className="w-5 h-5 absolute left-3 top-2.5 dark:text-gray-400 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredTypes.length === 0 ? (
            <p className="dark:text-gray-400 text-gray-600">
              {searchTerm ? 'Aucun type de client ne correspond à votre recherche.' : 'Aucun type de client.'}
            </p>
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
                  {filteredTypes.map((t) => (
                    <tr key={t.IdClientType} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-mono">{t.CodeType}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-semibold">{t.LibelleType}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                        {t.Description || '—'}
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

export default ClientTypeForm;