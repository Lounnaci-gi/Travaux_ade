import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getCentres, getAgences, getAgenceById, createAgence, updateAgence } from '../services/api';
import { isAdmin } from '../utils/auth';

const AgenceForm = ({ user, onUnauthorized }) => {
  const [centres, setCentres] = useState([]);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    IdCentre: '',
    NomAgence: '',
    Adresse: '',
    Commune: '',
    CodePostal: '',
    TelephonePrincipal: '',
    TelephoneSecondaire: '',
    Fax: '',
    Email: '',
  });

  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des agences.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const load = async () => {
      try {
        setLoading(true);
        const [centresList, agencesList] = await Promise.all([
          getCentres(),
          getAgences()
        ]);
        setCentres(centresList || []);
        setAgences(agencesList || []);
      } catch (e) {
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs peuvent créer des agences.
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

  const resetForm = () => {
    setForm({
      IdCentre: '', NomAgence: '', Adresse: '', Commune: '', CodePostal: '',
      TelephonePrincipal: '', TelephoneSecondaire: '', Fax: '', Email: '',
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const action = editingId ? 'Modifier' : 'Créer';
    const confirmed = await confirmDialog('Confirmer', `${action} cette agence ?`);
    if (!confirmed) return;
    try {
      setSubmitting(true);
      if (!form.IdCentre || !form.NomAgence) {
        setError('Veuillez sélectionner le Centre et renseigner le Nom de l\'Agence.');
        setSubmitting(false);
        return;
      }

      const lengthConstraints = [
        { field: 'NomAgence', label: 'Nom Agence', max: 100 },
        { field: 'Adresse', label: 'Adresse', max: 200 },
        { field: 'Commune', label: 'Commune', max: 60 },
        { field: 'CodePostal', label: 'Code Postal', max: 5 },
        { field: 'TelephonePrincipal', label: 'Téléphone Principal', max: 10 },
        { field: 'TelephoneSecondaire', label: 'Téléphone Secondaire', max: 10 },
        { field: 'Fax', label: 'Fax', max: 10 },
        { field: 'Email', label: 'Email', max: 100 },
      ];

      for (const { field, label, max } of lengthConstraints) {
        const value = typeof form[field] === 'string' ? form[field].trim() : form[field];
        if (value && value.length > max) {
          setError(`Le champ ${label} ne doit pas dépasser ${max} caractères.`);
          setSubmitting(false);
          return;
        }
      }

      const trimValue = (value) => (typeof value === 'string' ? value.trim() : value);

      const payload = {
        IdCentre: Number(form.IdCentre),
        NomAgence: form.NomAgence.trim(),
        Adresse: trimValue(form.Adresse) || null,
        Commune: trimValue(form.Commune) || null,
        CodePostal: trimValue(form.CodePostal) || null,
        TelephonePrincipal: trimValue(form.TelephonePrincipal) || null,
        TelephoneSecondaire: trimValue(form.TelephoneSecondaire) || null,
        Fax: trimValue(form.Fax) || null,
        Email: trimValue(form.Email) || null,
      };
      
      let result;
      if (editingId) {
        result = await updateAgence(editingId, payload);
        alertSuccess('Succès', `Agence modifiée: ${result.CodeAgence}`);
        setSuccess('Agence modifiée avec succès');
      } else {
        result = await createAgence(payload);
        alertSuccess('Succès', `Agence créée: ${result.CodeAgence}`);
        setSuccess('Agence créée avec succès');
      }
      
      resetForm();
      // Recharger la liste
      const agencesList = await getAgences();
      setAgences(agencesList || []);
    } catch (e) {
      const msg = e.response?.data?.error || `Erreur lors de ${editingId ? 'la modification' : 'la création'} de l'agence`;
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const agence = await getAgenceById(id);
      setForm({
        IdCentre: String(agence.IdCentre || ''),
        NomAgence: agence.NomAgence || '',
        Adresse: agence.Adresse || '',
        Commune: agence.Commune || '',
        CodePostal: agence.CodePostal || '',
        TelephonePrincipal: agence.TelephonePrincipal || '',
        TelephoneSecondaire: agence.TelephoneSecondaire || '',
        Fax: agence.Fax || '',
        Email: agence.Email || '',
      });
      setEditingId(id);
      setError('');
      setSuccess('');
      // Scroll to form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alertError('Erreur', 'Impossible de charger les données de l\'agence');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (agence) => {
    const confirmed = await confirmDialog('Confirmer la suppression', `Êtes-vous sûr de vouloir supprimer l'agence ${agence.CodeAgence} ?`);
    if (!confirmed) return;
    alertError('Info', 'Fonctionnalité de suppression à venir');
  };

  const handlePrint = (agence) => {
    window.print();
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
            Gestion des Agences Commerciales
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et gérer les agences commerciales</p>
        </div>

        {/* Formulaire de création */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">
              {editingId ? 'Modifier l\'Agence' : 'Créer une nouvelle Agence'}
            </h2>
            {editingId && (
              <button
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
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Centre *</label>
                  <select name="IdCentre" value={form.IdCentre} onChange={handleChange} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required>
                    <option value="">Sélectionner</option>
                    {centres.map((c) => (
                      <option key={c.IdCentre} value={c.IdCentre} className="text-black">{c.CodeCentre} - {c.NomCentre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom Agence *</label>
                  <input name="NomAgence" value={form.NomAgence} onChange={handleChange} maxLength={100} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Adresse</label>
                  <input name="Adresse" value={form.Adresse} onChange={handleChange} maxLength={200} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Commune</label>
                  <input name="Commune" value={form.Commune} onChange={handleChange} maxLength={60} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Code Postal</label>
                  <input name="CodePostal" value={form.CodePostal} onChange={handleChange} maxLength={5} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Coordonnées</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone Principal</label>
                    <input name="TelephonePrincipal" value={form.TelephonePrincipal} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone Secondaire</label>
                    <input name="TelephoneSecondaire" value={form.TelephoneSecondaire} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Fax</label>
                    <input name="Fax" value={form.Fax} onChange={handleChange} maxLength={10} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Email</label>
                    <input type="email" name="Email" value={form.Email} onChange={handleChange} maxLength={100} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50">
                {submitting ? 'Enregistrement...' : editingId ? 'Modifier l\'Agence' : 'Créer l\'Agence'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des agences */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Liste des Agences</h2>
          {agences.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Aucune agence enregistrée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Adresse</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Commune</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code Postal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Principal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Secondaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Fax</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agences.map((agence) => (
                    <tr key={agence.IdAgence} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.CodeAgence}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.NomAgence}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.Adresse || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.Commune || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.CodePostal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.TelephonePrincipal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.TelephoneSecondaire || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.Fax || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{agence.Email || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(agence.IdAgence)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handlePrint(agence)}
                            className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                            title="Imprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(agence)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
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

export default AgenceForm;
