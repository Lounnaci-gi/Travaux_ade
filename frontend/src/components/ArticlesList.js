import React, { useState, useEffect } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getArticles, getArticleById, createArticle, updateArticle, getArticleFamilles, createArticleFamille } from '../services/api';
import { isAdmin } from '../utils/auth';

const ArticlesList = ({ user, onUnauthorized }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showFamilleModal, setShowFamilleModal] = useState(false);
  const [familleForm, setFamilleForm] = useState({
    LibelleFamille: '',
    Description: '',
  });
  const [submittingFamille, setSubmittingFamille] = useState(false);
  const [form, setForm] = useState({
    IdFamille: '',
    Designation: '',
    Description: '',
    Unite: '',
    Diametre: '',
    Matiere: '',
    Classe: '',
    Pression: '',
    Longueur: '',
    Largeur: '',
    Epaisseur: '',
    Couleur: '',
    Caracteristiques: '',
  });

  // Liste des unités de mesure prédéfinies
  const unitesMesure = [
    'U',           // Unité
    'ML',          // Mètre linéaire
    'M²',          // Mètre carré
    'M3',          // Mètre cube
    'Cm',          // Centimètre
    'mm',          // Millimètre
    'KG',          // Kilogramme
    'Gramme',      // Gramme
    'Pièce',       // Pièce
    'Forfait',     // Forfait
    'Heure',       // Heure
    'Jour',        // Jour
    'Litre',       // Litre
    'Mètre',       // Mètre
    'Ton',         // Tonne
    'Baril',       // Baril
    'Paquet',      // Paquet
    'Carton',      // Carton
    'Boîte',       // Boîte
    'Sachet',      // Sachet
  ];

  useEffect(() => {
    if (!isAdmin(user)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent gérer les articles.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [articlesList, famillesList] = await Promise.all([
          getArticles(),
          getArticleFamilles()
        ]);
        setArticles(articlesList || []);
        setFamilles(famillesList || []);
      } catch (e) {
        console.error('Erreur lors du chargement des données:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Accès refusé
          </h2>
          <p className="text-gray-400">
            Seuls les administrateurs peuvent gérer les articles.
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
      IdFamille: '',
      Designation: '',
      Description: '',
      Unite: '',
      Diametre: '',
      Matiere: '',
      Classe: '',
      Pression: '',
      Longueur: '',
      Largeur: '',
      Epaisseur: '',
      Couleur: '',
      Caracteristiques: '',
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const article = await getArticleById(id);
      setForm({
        IdFamille: article.IdFamille ? String(article.IdFamille) : '',
        Designation: article.Designation || '',
        Description: article.Description || '',
        Unite: article.Unite || '',
        Diametre: article.Diametre || '',
        Matiere: article.Matiere || '',
        Classe: article.Classe || '',
        Pression: article.Pression || '',
        Longueur: article.Longueur != null ? String(article.Longueur) : '',
        Largeur: article.Largeur != null ? String(article.Largeur) : '',
        Epaisseur: article.Epaisseur != null ? String(article.Epaisseur) : '',
        Couleur: article.Couleur || '',
        Caracteristiques: article.Caracteristiques || '',
      });
      setEditingId(id);
      setError('');
      setSuccess('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alertError('Erreur', 'Impossible de charger l\'article.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamille = async (e) => {
    e.preventDefault();
    if (!familleForm.LibelleFamille.trim()) {
      alertError('Erreur', 'Le libellé de la famille est requis.');
      return;
    }

    // Validation des longueurs
    if (familleForm.LibelleFamille.trim().length > 100) {
      alertError('Erreur', 'Le libellé ne doit pas dépasser 100 caractères.');
      return;
    }
    if (familleForm.Description && familleForm.Description.trim().length > 255) {
      alertError('Erreur', 'La description ne doit pas dépasser 255 caractères.');
      return;
    }

    try {
      setSubmittingFamille(true);
      const newFamille = await createArticleFamille({
        LibelleFamille: familleForm.LibelleFamille.trim(),
        Description: familleForm.Description?.trim() || null,
      });

      // Recharger la liste des familles
      const updatedFamilles = await getArticleFamilles();
      setFamilles(updatedFamilles || []);

      // Sélectionner automatiquement la nouvelle famille
      setForm((prev) => ({ ...prev, IdFamille: newFamille.IdFamille.toString() }));

      // Fermer le modal et réinitialiser le formulaire
      setShowFamilleModal(false);
      setFamilleForm({ LibelleFamille: '', Description: '' });
      alertSuccess('Succès', 'Famille d\'article créée avec succès.');
    } catch (e) {
      const message = e.response?.data?.error || 'Erreur lors de la création de la famille.';
      alertError('Erreur', message);
    } finally {
      setSubmittingFamille(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const action = editingId ? 'Modifier' : 'Créer';
    const confirmed = await confirmDialog('Confirmer', `${action} cet article ?`);
    if (!confirmed) return;
    try {
      setSubmitting(true);
      if (!form.IdFamille || !form.Designation || !form.Unite) {
        setError('Veuillez renseigner la Famille, la Désignation et l\'Unité.');
        setSubmitting(false);
        return;
      }

      // Validation des longueurs de champs
      const lengthConstraints = [
        { field: 'Designation', value: form.Designation, max: 200, label: 'Désignation' },
        { field: 'Description', value: form.Description, max: 500, label: 'Description' },
        { field: 'Unite', value: form.Unite, max: 50, label: 'Unité' },
        { field: 'Diametre', value: form.Diametre, max: 20, label: 'Diamètre' },
        { field: 'Matiere', value: form.Matiere, max: 50, label: 'Matière' },
        { field: 'Classe', value: form.Classe, max: 20, label: 'Classe' },
        { field: 'Pression', value: form.Pression, max: 20, label: 'Pression' },
        { field: 'Couleur', value: form.Couleur, max: 30, label: 'Couleur' },
        { field: 'Caracteristiques', value: form.Caracteristiques, max: 500, label: 'Caractéristiques' },
      ];

      for (const { field, value, max, label } of lengthConstraints) {
        if (value && typeof value === 'string' && value.trim().length > max) {
          const message = `Le champ ${label} ne doit pas dépasser ${max} caractères.`;
          setError(message);
          alertError('Erreur', message);
          setSubmitting(false);
          return;
        }
      }

      const trimValue = (val) => (val && typeof val === 'string' ? val.trim() : val) || null;
      const parseDecimal = (val) => {
        if (!val || val === '') return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      const payload = {
        IdFamille: parseInt(form.IdFamille),
        Designation: form.Designation.trim(),
        Description: trimValue(form.Description),
        Unite: form.Unite.trim(),
        Diametre: trimValue(form.Diametre),
        Matiere: trimValue(form.Matiere),
        Classe: trimValue(form.Classe),
        Pression: trimValue(form.Pression),
        Longueur: parseDecimal(form.Longueur),
        Largeur: parseDecimal(form.Largeur),
        Epaisseur: parseDecimal(form.Epaisseur),
        Couleur: trimValue(form.Couleur),
        Caracteristiques: trimValue(form.Caracteristiques),
      };

      if (editingId) {
        await updateArticle(editingId, payload);
        alertSuccess('Succès', 'Article modifié avec succès.');
      } else {
        await createArticle(payload);
        alertSuccess('Succès', 'Article créé avec succès.');
      }

      resetForm();
      const updatedArticles = await getArticles();
      setArticles(updatedArticles || []);
    } catch (e) {
      const message = e.response?.data?.error || `Erreur lors de la ${editingId ? 'modification' : 'création'} de l'article.`;
      setError(message);
      alertError('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Gestion des Articles
        </h1>

        {/* Formulaire de création/modification */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white text-gray-900">
            {editingId ? 'Modifier un Article' : 'Créer un Nouvel Article'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Le code article sera généré automatiquement au format <strong>ART-XXXXXXX</strong> (7 chiffres).
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm dark:text-gray-300 text-gray-700">
                    Famille d'Article *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFamilleModal(true)}
                    className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    title="Créer une nouvelle famille"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nouvelle famille
                  </button>
                </div>
                <select
                  name="IdFamille"
                  value={form.IdFamille}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  required
                >
                  <option value="">Sélectionner une famille</option>
                  {familles.map((famille) => (
                    <option key={famille.IdFamille} value={famille.IdFamille}>
                      {famille.LibelleFamille}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                  Unité *
                </label>
                <select
                  name="Unite"
                  value={form.Unite}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  required
                >
                  <option value="">Sélectionner une unité</option>
                  {unitesMesure.map((unite) => (
                    <option key={unite} value={unite}>
                      {unite}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                Désignation *
              </label>
              <input
                name="Designation"
                value={form.Designation}
                onChange={handleChange}
                maxLength={200}
                placeholder="Ex: Tuyau PVC DN63, Compteur d'eau, Réducteur de pression"
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="Description"
                value={form.Description}
                onChange={handleChange}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
              />
            </div>

            <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
              <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">
                Variantes (optionnel)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Diamètre
                  </label>
                  <input
                    name="Diametre"
                    value={form.Diametre}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Ex: 40mm, 63mm, DN50"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Matière
                  </label>
                  <input
                    name="Matiere"
                    value={form.Matiere}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder="Ex: PVC, PEHD, Fonte, Laiton, Béton"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Classe
                  </label>
                  <input
                    name="Classe"
                    value={form.Classe}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Ex: C6, C10, PN10, PN16, Classe B"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Pression
                  </label>
                  <input
                    name="Pression"
                    value={form.Pression}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Ex: PN10, PN16"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Longueur (cm ou m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Longueur"
                    value={form.Longueur}
                    onChange={handleChange}
                    placeholder="Ex: 100.5"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Largeur (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Largeur"
                    value={form.Largeur}
                    onChange={handleChange}
                    placeholder="Ex: 50.2"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Épaisseur (mm ou cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="Epaisseur"
                    value={form.Epaisseur}
                    onChange={handleChange}
                    placeholder="Ex: 2.5"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Couleur
                  </label>
                  <input
                    name="Couleur"
                    value={form.Couleur}
                    onChange={handleChange}
                    maxLength={30}
                    placeholder="Ex: Bleu, Vert, Rouge"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                  Caractéristiques
                </label>
                <textarea
                  name="Caracteristiques"
                  value={form.Caracteristiques}
                  onChange={handleChange}
                  maxLength={500}
                  rows={3}
                  placeholder="Informations complémentaires texte libre"
                  className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'En cours...' : editingId ? 'Modifier' : 'Créer'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Modal de création de famille */}
        {showFamilleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold dark:text-white text-gray-900">
                  Créer une Nouvelle Famille d'Article
                </h3>
                <button
                  onClick={() => {
                    setShowFamilleModal(false);
                    setFamilleForm({ LibelleFamille: '', Description: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Le code famille sera généré automatiquement au format FAM-XXX.
              </p>
              <form onSubmit={handleCreateFamille} className="space-y-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Libellé Famille *
                  </label>
                  <input
                    type="text"
                    value={familleForm.LibelleFamille}
                    onChange={(e) => setFamilleForm({ ...familleForm, LibelleFamille: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={familleForm.Description}
                    onChange={(e) => setFamilleForm({ ...familleForm, Description: e.target.value })}
                    maxLength={255}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submittingFamille}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submittingFamille ? 'Création...' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFamilleModal(false);
                      setFamilleForm({ LibelleFamille: '', Description: '' });
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liste des articles */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white text-gray-900">
            Liste des Articles
          </h2>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-white/10 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Désignation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Famille</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Unité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">
                        Aucun article trouvé
                      </td>
                    </tr>
                  ) : (
                    articles.map((article) => (
                      <tr
                        key={article.IdArticle}
                        className="border-b dark:border-white/5 border-gray-100 hover:dark:bg-white/5 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700 font-mono">
                          {article.CodeArticle}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.Designation}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.LibelleFamille || '—'}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.Unite}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                          {article.Description || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleEdit(article.IdArticle)}
                            className="text-blue-500 hover:text-blue-600 mr-3"
                            title="Modifier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticlesList;

