import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getDemandeTypes, createDemandeType } from '../services/api';

const DemandeTypeForm = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    LibelleType: '',
    Description: '',
    ValidationJuridiqueRequise: false,
    ValidationChefAgenceRequise: false,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.LibelleType) {
      setError('Libellé est requis');
      return;
    }
    
    // Demander confirmation avant de créer
    const confirmed = await confirmDialog(
      'Confirmer la création',
      'Êtes-vous sûr de vouloir créer ce type de travaux ?'
    );
    
    if (!confirmed) {
      return; // L'utilisateur a annulé
    }
    
    try {
      setSubmitting(true);
      const created = await createDemandeType(form);
      setSuccess(`Type créé: ${created.LibelleType}`);
      alertSuccess('Succès', `Type créé: ${created.LibelleType}`);
      setForm({ LibelleType: '', Description: '', ValidationJuridiqueRequise: false, ValidationChefAgenceRequise: false });
      await load();
    } catch (e) {
      const msg = e.response?.data?.error || 'Erreur lors de la création du type';
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Libellé *</label>
              <input name="LibelleType" value={form.LibelleType} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Ex: Branchement nouveau" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Description</label>
              <input name="Description" value={form.Description} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" placeholder="Description optionnelle" />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                <input type="checkbox" name="ValidationJuridiqueRequise" checked={form.ValidationJuridiqueRequise} onChange={handleChange} className="accent-blue-500" />
                Validation Juridique requise
              </label>
              <label className="inline-flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                <input type="checkbox" name="ValidationChefAgenceRequise" checked={form.ValidationChefAgenceRequise} onChange={handleChange} className="accent-purple-500" />
                Validation Chef d'agence requise
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg disabled:opacity-50">
              {submitting ? 'Création...' : 'Créer le type'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {types.map((t) => (
                <div key={t.IdDemandeType} className="glass-effect rounded-lg p-4 border dark:border-white/10 border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="dark:text-white text-gray-900 font-semibold">{t.LibelleType}</p>
                      <p className="text-xs dark:text-gray-400 text-gray-600">Code: {t.CodeType}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandeTypeForm;


