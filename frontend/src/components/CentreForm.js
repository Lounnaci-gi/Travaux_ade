import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getUnites, getCentres, getCentreById, createCentre, updateCentre } from '../services/api';
import { isAdmin } from '../utils/auth';

const CentreForm = ({ user, onUnauthorized }) => {
  const [unites, setUnites] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    IdUnite: '',
    NomCentre: '',
    PrefixeCentre: '',
    Adresse: '',
    Commune: '',
    CodePostal: '',
    TelephonePrincipal: '',
    TelephoneSecondaire: '',
    Fax: '',
    Email: '',
    NomBanque: '',
    NumerocompteBancaire: '',
    NumeroComptePostal: '',
  });

  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des centres.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const load = async () => {
      try {
        setLoading(true);
        const [unitesList, centresList] = await Promise.all([
          getUnites(),
          getCentres()
        ]);
        setUnites(unitesList || []);
        setCentres(centresList || []);
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
            Seuls les administrateurs peuvent créer des centres.
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
      IdUnite: '', NomCentre: '', PrefixeCentre: '', Adresse: '', Commune: '', CodePostal: '',
      TelephonePrincipal: '', TelephoneSecondaire: '', Fax: '', Email: '',
      NomBanque: '', NumerocompteBancaire: '', NumeroComptePostal: '',
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
    const confirmed = await confirmDialog('Confirmer', `${action} ce centre ?`);
    if (!confirmed) return;
    try {
      setSubmitting(true);
      const required = ['IdUnite', 'NomCentre', 'PrefixeCentre', 'Adresse', 'Commune', 'CodePostal', 'TelephonePrincipal'];
      const missing = required.filter((f) => !form[f]);
      if (missing.length) {
        setError('Veuillez remplir tous les champs obligatoires.');
        setSubmitting(false);
        return;
      }

      const lengthConstraints = [
        { field: 'NomCentre', label: 'Nom Centre', max: 100 },
        { field: 'PrefixeCentre', label: 'Préfixe Centre', max: 5 },
        { field: 'Adresse', label: 'Adresse', max: 200 },
        { field: 'Commune', label: 'Commune', max: 60 },
        { field: 'CodePostal', label: 'Code Postal', max: 5 },
        { field: 'TelephonePrincipal', label: 'Téléphone Principal', max: 10 },
        { field: 'TelephoneSecondaire', label: 'Téléphone Secondaire', max: 10 },
        { field: 'Fax', label: 'Fax', max: 10 },
        { field: 'Email', label: 'Email', max: 100 },
        { field: 'NumerocompteBancaire', label: 'N° Compte Bancaire', max: 20 },
        { field: 'NumeroComptePostal', label: 'N° Compte Postal', max: 20 },
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
        IdUnite: Number(form.IdUnite),
        NomCentre: form.NomCentre.trim(),
        PrefixeCentre: form.PrefixeCentre.trim(),
        Adresse: form.Adresse.trim(),
        Commune: form.Commune.trim(),
        CodePostal: form.CodePostal.trim(),
        TelephonePrincipal: form.TelephonePrincipal.trim(),
        TelephoneSecondaire: trimValue(form.TelephoneSecondaire) || null,
        Fax: trimValue(form.Fax) || null,
        Email: trimValue(form.Email) || null,
        NomBanque: trimValue(form.NomBanque) || null,
        NumerocompteBancaire: trimValue(form.NumerocompteBancaire) || null,
        NumeroComptePostal: trimValue(form.NumeroComptePostal) || null,
      };
      
      let result;
      if (editingId) {
        result = await updateCentre(editingId, payload);
        alertSuccess('Succès', `Centre modifié: ${result.CodeCentre}`);
        setSuccess('Centre modifié avec succès');
      } else {
        result = await createCentre(payload);
        alertSuccess('Succès', `Centre créé: ${result.CodeCentre}`);
        setSuccess('Centre créé avec succès');
      }
      
      resetForm();
      // Recharger la liste
      const centresList = await getCentres();
      setCentres(centresList || []);
    } catch (e) {
      const msg = e.response?.data?.error || `Erreur lors de ${editingId ? 'la modification' : 'la création'} du centre`;
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const centre = await getCentreById(id);
      setForm({
        IdUnite: String(centre.IdUnite || ''),
        NomCentre: centre.NomCentre || '',
        PrefixeCentre: centre.PrefixeCentre || '',
        Adresse: centre.Adresse || '',
        Commune: centre.Commune || '',
        CodePostal: centre.CodePostal || '',
        TelephonePrincipal: centre.TelephonePrincipal || '',
        TelephoneSecondaire: centre.TelephoneSecondaire || '',
        Fax: centre.Fax || '',
        Email: centre.Email || '',
        NomBanque: centre.NomBanque || '',
        NumerocompteBancaire: centre.NumerocompteBancaire || '',
        NumeroComptePostal: centre.NumeroComptePostal || '',
      });
      setEditingId(id);
      setError('');
      setSuccess('');
      // Scroll to form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alertError('Erreur', 'Impossible de charger les données du centre');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (centre) => {
    const confirmed = await confirmDialog('Confirmer la suppression', `Êtes-vous sûr de vouloir supprimer le centre ${centre.CodeCentre} ?`);
    if (!confirmed) return;
    alertError('Info', 'Fonctionnalité de suppression à venir');
  };

  const handlePrint = (centre) => {
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
            Gestion des Centres
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et gérer les centres</p>
        </div>

        {/* Formulaire de création */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">
              {editingId ? 'Modifier le Centre' : 'Créer un nouveau Centre'}
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

            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300 dark:text-blue-400">
                <strong>Note:</strong> Les champs marqués d'un <span className="text-red-400">*</span> sont obligatoires. Le code centre sera généré automatiquement.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Informations générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Unité <span className="text-red-400">*</span></label>
                  <select name="IdUnite" value={form.IdUnite} onChange={handleChange} className="select-field w-full px-4 py-3" required>
                    <option value="">Sélectionner une unité</option>
                    {unites.map((u) => (
                      <option key={u.IdUnite} value={u.IdUnite} className="text-black">{u.CodeUnite} - {u.NomUnite}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom Centre <span className="text-red-400">*</span></label>
                  <input name="NomCentre" value={form.NomCentre} onChange={handleChange} maxLength={100} placeholder="Ex: Centre Casablanca" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Préfixe Centre <span className="text-red-400">*</span></label>
                  <input name="PrefixeCentre" value={form.PrefixeCentre} onChange={handleChange} maxLength={5} placeholder="Ex: CAS" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Adresse <span className="text-red-400">*</span></label>
                  <input name="Adresse" value={form.Adresse} onChange={handleChange} maxLength={200} placeholder="Ex: 123 Avenue principale" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Commune <span className="text-red-400">*</span></label>
                  <input name="Commune" value={form.Commune} onChange={handleChange} maxLength={60} placeholder="Ex: Casablanca" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Code Postal <span className="text-red-400">*</span></label>
                  <input name="CodePostal" value={form.CodePostal} onChange={handleChange} maxLength={5} placeholder="Ex: 20000" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone Principal <span className="text-red-400">*</span></label>
                  <input name="TelephonePrincipal" value={form.TelephonePrincipal} onChange={handleChange} maxLength={10} placeholder="Ex: 0522123456" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                </div>
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Coordonnées</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone Secondaire</label>
                    <input name="TelephoneSecondaire" value={form.TelephoneSecondaire} onChange={handleChange} maxLength={10} placeholder="Ex: 0666123456" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Fax</label>
                    <input name="Fax" value={form.Fax} onChange={handleChange} maxLength={10} placeholder="Ex: 0522123457" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Email</label>
                    <input type="email" name="Email" value={form.Email} onChange={handleChange} maxLength={100} placeholder="Ex: contact@centre.ma" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Informations bancaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom de la Banque</label>
                    <input name="NomBanque" value={form.NomBanque} onChange={handleChange} maxLength={100} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">N° Compte Bancaire</label>
                    <input name="NumerocompteBancaire" value={form.NumerocompteBancaire} onChange={handleChange} maxLength={20} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">N° Compte Postal</label>
                    <input name="NumeroComptePostal" value={form.NumeroComptePostal} onChange={handleChange} maxLength={20} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50">
                {submitting ? 'Enregistrement...' : editingId ? 'Modifier le Centre' : 'Créer le Centre'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des centres */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Liste des Centres</h2>
          {centres.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Aucun centre enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Préfixe</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Unité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Adresse</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Commune</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code Postal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Principal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Secondaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Fax</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">N° Compte Bancaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">N° Compte Postal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {centres.map((centre) => (
                    <tr key={centre.IdCentre} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.CodeCentre}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.NomCentre}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.PrefixeCentre || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.NomUnite || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.Adresse || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.Commune || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.CodePostal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.TelephonePrincipal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.TelephoneSecondaire || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.Fax || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.Email || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.NumerocompteBancaire || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{centre.NumeroComptePostal || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(centre.IdCentre)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handlePrint(centre)}
                            className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                            title="Imprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(centre)}
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

export default CentreForm;
