import React, { useState, useEffect } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getUnites, getUniteById, createUnite, updateUnite } from '../services/api';
import { isAdmin } from '../utils/auth';

const MIN_SUBSTRING_MATCH_LENGTH = 4;

const normalizeName = (value = '') => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const UniteForm = ({ user, onUnauthorized }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unites, setUnites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    NomUnite: '',
    Adresse: '',
    Commune: '',
    CodePostal: '',
    TelephonePrincipal: '',
    TelephoneSecondaire: '',
    Fax: '',
    Email: '',
    SiteWeb: '',
    NumeroIdentifiantFiscal: '',
    NumeroIdentificationStatistique: '',
    NumeroRegistreCommerce: '',
    NomBanque: '',
    NumerocompteBancaire: '',
    NumeroComptePostal: '',
  });

  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des unités.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const loadUnites = async () => {
      try {
        setLoading(true);
        const list = await getUnites();
        setUnites(list || []);
      } catch (e) {
        console.error('Erreur lors du chargement des unités:', e);
      } finally {
        setLoading(false);
      }
    };
    loadUnites();
  }, [user]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs peuvent créer des unités.
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
      NomUnite: '', Adresse: '', Commune: '', CodePostal: '',
      TelephonePrincipal: '', TelephoneSecondaire: '', Fax: '', Email: '',
      SiteWeb: '', NumeroIdentifiantFiscal: '', NumeroIdentificationStatistique: '',
      NumeroRegistreCommerce: '', NomBanque: '', NumerocompteBancaire: '', NumeroComptePostal: '',
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
    const confirmed = await confirmDialog('Confirmer', `${action} cette unité ?`);
    if (!confirmed) return;
    try {
      setSubmitting(true);
      if (!form.NomUnite) {
        setError('Veuillez renseigner le Nom de l\'Unité.');
        setSubmitting(false);
        return;
      }

      const normalizedTarget = normalizeName(form.NomUnite);
      if (normalizedTarget && normalizedTarget.length >= MIN_SUBSTRING_MATCH_LENGTH) {
        const duplicate = unites.find((unite) => {
          if (editingId && unite.IdUnite === editingId) {
            return false;
          }
          const normalizedExisting = normalizeName(unite.NomUnite || '');
          if (!normalizedExisting) {
            return false;
          }
          if (normalizedExisting === normalizedTarget) {
            return true;
          }
          if (
            normalizedExisting.length >= MIN_SUBSTRING_MATCH_LENGTH &&
            (normalizedExisting.includes(normalizedTarget) || normalizedTarget.includes(normalizedExisting))
          ) {
            return true;
          }
          return false;
        });

        if (duplicate) {
          const message = 'Une unité avec un nom similaire existe déjà.';
          setError(message);
          alertError('Erreur', message);
          setSubmitting(false);
          return;
        }
      }

      const lengthConstraints = [
        { field: 'TelephonePrincipal', label: 'Téléphone Principal', max: 10 },
        { field: 'TelephoneSecondaire', label: 'Téléphone Secondaire', max: 10 },
        { field: 'NumeroIdentifiantFiscal', label: 'N° Identifiant Fiscal', max: 18 },
        { field: 'NumeroIdentificationStatistique', label: 'N° Identification Statistique', max: 15 },
        { field: 'NumeroRegistreCommerce', label: 'N° Registre de Commerce', max: 15 },
        { field: 'NumerocompteBancaire', label: 'N° Compte Bancaire', max: 20 },
        { field: 'NumeroComptePostal', label: 'N° Compte Postal', max: 11 },
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
        NomUnite: form.NomUnite.trim(),
        Adresse: trimValue(form.Adresse) || null,
        Commune: trimValue(form.Commune) || null,
        CodePostal: trimValue(form.CodePostal) || null,
        TelephonePrincipal: trimValue(form.TelephonePrincipal) || null,
        TelephoneSecondaire: trimValue(form.TelephoneSecondaire) || null,
        Fax: trimValue(form.Fax) || null,
        Email: trimValue(form.Email) || null,
        SiteWeb: trimValue(form.SiteWeb) || null,
        NumeroIdentifiantFiscal: trimValue(form.NumeroIdentifiantFiscal) || null,
        NumeroIdentificationStatistique: trimValue(form.NumeroIdentificationStatistique) || null,
        NumeroRegistreCommerce: trimValue(form.NumeroRegistreCommerce) || null,
        NomBanque: trimValue(form.NomBanque) || null,
        NumerocompteBancaire: trimValue(form.NumerocompteBancaire) || null,
        NumeroComptePostal: trimValue(form.NumeroComptePostal) || null,
      };
      
      let result;
      if (editingId) {
        result = await updateUnite(editingId, payload);
        alertSuccess('Succès', `Unité modifiée: ${result.CodeUnite}`);
        setSuccess('Unité modifiée avec succès');
      } else {
        result = await createUnite(payload);
        alertSuccess('Succès', `Unité créée: ${result.CodeUnite}`);
        setSuccess('Unité créée avec succès');
      }
      
      resetForm();
      // Recharger la liste
      const list = await getUnites();
      setUnites(list || []);
    } catch (e) {
      const msg = e.response?.data?.error || `Erreur lors de ${editingId ? 'la modification' : 'la création'} de l'unité`;
      alertError('Erreur', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const unite = await getUniteById(id);
      setForm({
        NomUnite: unite.NomUnite || '',
        Adresse: unite.Adresse || '',
        Commune: unite.Commune || '',
        CodePostal: unite.CodePostal || '',
        TelephonePrincipal: unite.TelephonePrincipal || '',
        TelephoneSecondaire: unite.TelephoneSecondaire || '',
        Fax: unite.Fax || '',
        Email: unite.Email || '',
        SiteWeb: unite.SiteWeb || '',
        NumeroIdentifiantFiscal: unite.NumeroIdentifiantFiscal || '',
        NumeroIdentificationStatistique: unite.NumeroIdentificationStatistique || '',
        NumeroRegistreCommerce: unite.NumeroRegistreCommerce || '',
        NomBanque: unite.NomBanque || '',
        NumerocompteBancaire: unite.NumerocompteBancaire || '',
        NumeroComptePostal: unite.NumeroComptePostal || '',
      });
      setEditingId(id);
      setError('');
      setSuccess('');
      // Scroll to form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alertError('Erreur', 'Impossible de charger les données de l\'unité');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (unite) => {
    const confirmed = await confirmDialog('Confirmer la suppression', `Êtes-vous sûr de vouloir supprimer l'unité ${unite.CodeUnite} ?`);
    if (!confirmed) return;
    alertError('Info', 'Fonctionnalité de suppression à venir');
  };

  const handlePrint = (unite) => {
    window.print();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Gestion des Unités
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et gérer les unités</p>
        </div>

        {/* Formulaire de création */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">
              {editingId ? 'Modifier l\'Unité' : 'Créer une nouvelle Unité'}
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
                <strong>Note:</strong> Les champs marqués d'un <span className="text-red-400">*</span> sont obligatoires. Le code unité sera généré automatiquement.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Informations générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom Unité <span className="text-red-400">*</span></label>
                    <input name="NomUnite" value={form.NomUnite} onChange={handleChange} placeholder="Ex: Direction Régionale Nord" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Adresse</label>
                    <input name="Adresse" value={form.Adresse} onChange={handleChange} placeholder="Ex: 123 Avenue principale, Zone industrielle" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Commune</label>
                    <input name="Commune" value={form.Commune} onChange={handleChange} placeholder="Ex: Casablanca" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Code Postal</label>
                    <input name="CodePostal" value={form.CodePostal} onChange={handleChange} maxLength={5} placeholder="Ex: 20000" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Coordonnées</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone Principal</label>
                    <input name="TelephonePrincipal" value={form.TelephonePrincipal} onChange={handleChange} maxLength={10} placeholder="Ex: 0522123456" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
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
                    <input type="email" name="Email" value={form.Email} onChange={handleChange} placeholder="Ex: contact@example.ma" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Site Web</label>
                    <input name="SiteWeb" value={form.SiteWeb} onChange={handleChange} placeholder="Ex: https://www.example.ma" className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Informations financières et légales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">N° Identifiant Fiscal</label>
                    <input name="NumeroIdentifiantFiscal" value={form.NumeroIdentifiantFiscal} onChange={handleChange} maxLength={18} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">N° Identification Statistique</label>
                    <input name="NumeroIdentificationStatistique" value={form.NumeroIdentificationStatistique} onChange={handleChange} maxLength={15} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">N° Registre de Commerce</label>
                    <input name="NumeroRegistreCommerce" value={form.NumeroRegistreCommerce} onChange={handleChange} maxLength={15} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
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
                    <input name="NumeroComptePostal" value={form.NumeroComptePostal} onChange={handleChange} maxLength={11} className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50">
                {submitting ? 'Enregistrement...' : editingId ? 'Modifier l\'Unité' : 'Créer l\'Unité'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des unités */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Liste des Unités</h2>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : unites.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Aucune unité enregistrée</p>
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
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Principal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Tél. Secondaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Fax</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Site Web</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">N° Compte Bancaire</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">N° Compte Postal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unites.map((unite) => (
                    <tr key={unite.IdUnite} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.CodeUnite}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.NomUnite}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.Adresse || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.Commune || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.TelephonePrincipal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.TelephoneSecondaire || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.Fax || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.Email || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.SiteWeb || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.NumerocompteBancaire || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{unite.NumeroComptePostal || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(unite.IdUnite)}
                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handlePrint(unite)}
                            className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                            title="Imprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(unite)}
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

export default UniteForm;
