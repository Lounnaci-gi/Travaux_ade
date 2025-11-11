import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getDemandeTypes, createDemandeType, updateDemandeType } from '../services/api';

const DemandeTypeForm = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    LibelleType: '',
    Description: '',
    ValidationChefSectionRelationClienteleRequise: false,
    ValidationJuridiqueRequise: false,
    ValidationChefAgenceRequise: false,
    ValidationChefCentreRequise: false,
    ValidationOE_ChefSectionRelationClienteleRequise: false,
    ValidationOE_ChefAgenceRequise: false,
    ValidationOE_ChefCentreRequise: false,
    Actif: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await getDemandeTypes();
      setTypes(data);
    } catch (e) {
      setError('Erreur lors du chargement des types de travaux');
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

  const resetForm = () => {
    setForm({ 
      LibelleType: '', 
      Description: '', 
      ValidationChefSectionRelationClienteleRequise: false,
      ValidationJuridiqueRequise: false, 
      ValidationChefAgenceRequise: false, 
      ValidationChefCentreRequise: false,
      ValidationOE_ChefSectionRelationClienteleRequise: false,
      ValidationOE_ChefAgenceRequise: false,
      ValidationOE_ChefCentreRequise: false,
      Actif: true
    });
    setEditingId(null);
  };

  const handleEdit = (type) => {
    setForm({
      LibelleType: type.LibelleType || '',
      Description: type.Description || '',
      ValidationChefSectionRelationClienteleRequise: type.ValidationChefSectionRelationClienteleRequise || false,
      ValidationJuridiqueRequise: type.ValidationJuridiqueRequise || false,
      ValidationChefAgenceRequise: type.ValidationChefAgenceRequise || false,
      ValidationChefCentreRequise: type.ValidationChefCentreRequise || false,
      ValidationOE_ChefSectionRelationClienteleRequise: type.ValidationOE_ChefSectionRelationClienteleRequise || false,
      ValidationOE_ChefAgenceRequise: type.ValidationOE_ChefAgenceRequise || false,
      ValidationOE_ChefCentreRequise: type.ValidationOE_ChefCentreRequise || false,
      Actif: type.Actif !== false,
    });
    setEditingId(type.IdDemandeType);
    setError('');
    setSuccess('');
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
      if (isEditing) {
        const updated = await updateDemandeType(editingId, form);
        setSuccess(`Type modifié: ${updated.LibelleType}`);
        alertSuccess('Succès', `Type modifié: ${updated.LibelleType}`);
      } else {
        const created = await createDemandeType(form);
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Types de Travaux
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et lister les types de travaux (DemandeType)</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 mb-6">
          {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm">{success}</div>}
          
          {editingId && (
            <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 text-sm flex items-center justify-between">
              <span>Mode édition - Modification du type ID: {editingId}</span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1 rounded bg-blue-500/30 hover:bg-blue-500/40 text-sm"
              >
                Annuler
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Libellé *</label>
              <input name="LibelleType" value={form.LibelleType} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Ex: Branchement nouveau" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Description</label>
              <input name="Description" value={form.Description} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Description optionnelle" />
            </div>
            <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
              <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Validations requises pour la Demande</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationChefSectionRelationClienteleRequise" checked={form.ValidationChefSectionRelationClienteleRequise} onChange={handleChange} className="accent-cyan-500" />
                  Validation Chef Section Relation Clientèle
                </label>
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationJuridiqueRequise" checked={form.ValidationJuridiqueRequise} onChange={handleChange} className="accent-blue-500" />
                  Validation Juridique
                </label>
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationChefAgenceRequise" checked={form.ValidationChefAgenceRequise} onChange={handleChange} className="accent-purple-500" />
                  Validation Chef d'agence
                </label>
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationChefCentreRequise" checked={form.ValidationChefCentreRequise} onChange={handleChange} className="accent-green-500" />
                  Validation Chef de centre
                </label>
              </div>
            </div>

            <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
              <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Validations requises pour l'Ordre d'Exécution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationOE_ChefSectionRelationClienteleRequise" checked={form.ValidationOE_ChefSectionRelationClienteleRequise} onChange={handleChange} className="accent-cyan-500" />
                  Validation OE - Chef Section Relation Clientèle
                </label>
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationOE_ChefAgenceRequise" checked={form.ValidationOE_ChefAgenceRequise} onChange={handleChange} className="accent-purple-500" />
                  Validation OE - Chef d'agence
                </label>
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="ValidationOE_ChefCentreRequise" checked={form.ValidationOE_ChefCentreRequise} onChange={handleChange} className="accent-green-500" />
                  Validation OE - Chef de centre
                </label>
              </div>
            </div>

            {editingId && (
              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                  <input type="checkbox" name="Actif" checked={form.Actif} onChange={handleChange} className="accent-green-500" />
                  Actif
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">Désactiver ce type pour le masquer des listes</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 rounded-lg bg-gray-500 text-white font-semibold shadow-lg hover:opacity-90"
              >
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg disabled:opacity-50">
              {submitting 
                ? (editingId ? 'Modification...' : 'Création...') 
                : (editingId ? 'Modifier le type' : 'Créer le type')
              }
            </button>
          </div>
        </form>

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
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{t.Description || '—'}</td>
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


