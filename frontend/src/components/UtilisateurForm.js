import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getRoles, getUnites, getCentres, getAgences, createUtilisateur, getUtilisateurs } from '../services/api';
import { isAdmin } from '../utils/auth';

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
  const [form, setForm] = useState({
    IdRole: '',
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

  const isChefCentre = !!(user && user.codeRole && (user.codeRole.toLowerCase().includes('chef') && user.codeRole.toLowerCase().includes('centre')))

  useEffect(() => {
    if (!isAdmin(user) && !isChefCentre) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        alertError('Accès refusé', 'Seuls les administrateurs peuvent créer des utilisateurs.');
      }
    }
  }, [user, onUnauthorized]);

  useEffect(() => {
    if (!isAdmin(user) && !isChefCentre) return;
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
        if (isChefCentre && user?.idCentre) {
          const centreObj = (centresList || []).find((c) => c.IdCentre === Number(user.idCentre));
          setForm((prev) => ({
            ...prev,
            IdCentre: String(user.idCentre),
            IdUnite: centreObj ? String(centreObj.IdUnite) : prev.IdUnite,
          }));
        }
      } catch (e) {
        setError('Erreur lors du chargement des données');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!isAdmin(user) && !isChefCentre) {
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

  // Filtrer les centres selon l'unité sélectionnée
  const centresByUnite = form.IdUnite
    ? centres.filter((c) => c.IdUnite === Number(form.IdUnite))
    : centres;
  const filteredCentres = isChefCentre && user?.idCentre
    ? centresByUnite.filter((c) => c.IdCentre === Number(user.idCentre))
    : centresByUnite;

  // Filtrer les agences selon le centre sélectionné
  const filteredAgences = form.IdCentre
    ? agences.filter((a) => a.IdCentre === Number(form.IdCentre))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const required = ['IdRole', 'Nom', 'Prenom', 'Email', 'MotDePasse'];
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

    const confirmed = await confirmDialog('Confirmer', 'Créer cet utilisateur ?');
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const payload = {
        IdRole: Number(form.IdRole),
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
        IdRole: '',
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
            Gestion des Utilisateurs
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Créer et gérer les utilisateurs</p>
        </div>

        {/* Formulaire de création */}
        <div className="glass-card p-6 space-y-6 mb-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Créer un nouvel Utilisateur</h2>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm mb-4">{error}</div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm mb-4">{success}</div>
            )}

            <div className="space-y-6">
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300 dark:text-blue-400">
                  <strong>Note:</strong> Le matricule sera généré automatiquement au format <strong>UTI-XXXX</strong> lors de la création.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Rôle *</label>
                  <select
                    name="IdRole"
                    value={form.IdRole}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                  >
                    <option value="">Sélectionner un rôle</option>
                    {roles.map((r) => (
                      <option key={r.IdRole} value={r.IdRole} className="text-black">
                        {r.LibelleRole} ({r.CodeRole})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Nom *</label>
                  <input
                    name="Nom"
                    value={form.Nom}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Prénom *</label>
                  <input
                    name="Prenom"
                    value={form.Prenom}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    name="Email"
                    value={form.Email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Téléphone</label>
                  <input
                    name="Telephone"
                    value={form.Telephone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Mot de passe *</label>
                  <input
                    type="password"
                    name="MotDePasse"
                    value={form.MotDePasse}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Confirmation mot de passe *</label>
                  <input
                    type="password"
                    name="ConfirmationMotDePasse"
                    value={form.ConfirmationMotDePasse}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Affectation hiérarchique</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Unité</label>
                    <select
                      name="IdUnite"
                      value={form.IdUnite}
                      onChange={(e) => {
                        handleChange(e);
                        // Réinitialiser centre et agence si l'unité change
                        setForm((prev) => ({
                          ...prev,
                          IdUnite: e.target.value,
                          IdCentre: '',
                          IdAgence: '',
                        }));
                      }}
                      className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                      disabled={isChefCentre}
                    >
                      <option value="">Aucune</option>
                    {(isChefCentre ? unites.filter((u) => String(u.IdUnite) === String(form.IdUnite)) : unites).map((u) => (
                        <option key={u.IdUnite} value={u.IdUnite} className="text-black">
                          {u.CodeUnite} - {u.NomUnite}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Centre</label>
                    <select
                      name="IdCentre"
                      value={form.IdCentre}
                      onChange={(e) => {
                        handleChange(e);
                        // Réinitialiser agence si le centre change
                        setForm((prev) => ({
                          ...prev,
                          IdCentre: e.target.value,
                          IdAgence: '',
                        }));
                      }}
                      className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                      disabled={!form.IdUnite || isChefCentre}
                    >
                      <option value="">Aucun</option>
                      {filteredCentres.map((c) => (
                        <option key={c.IdCentre} value={c.IdCentre} className="text-black">
                          {c.CodeCentre} - {c.NomCentre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Agence</label>
                    <select
                      name="IdAgence"
                      value={form.IdAgence}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                      disabled={!form.IdCentre}
                    >
                      <option value="">Aucune</option>
                      {filteredAgences.map((a) => (
                        <option key={a.IdAgence} value={a.IdAgence} className="text-black">
                          {a.CodeAgence} - {a.NomAgence}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <label className="ml-2 text-sm dark:text-gray-300 text-gray-700">Utilisateur actif</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : 'Créer l\'Utilisateur'}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des utilisateurs */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold dark:text-white text-gray-900 mb-4">Liste des Utilisateurs</h2>
          {utilisateurs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Aucun utilisateur enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Matricule</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Nom complet</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Rôle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Unité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Centre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Agence</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateurs.map((utilisateur) => (
                    <tr key={utilisateur.IdUtilisateur} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.Matricule}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.Nom} {utilisateur.Prenom}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.Email}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.LibelleRole}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.NomUnite || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.NomCentre || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{utilisateur.NomAgence || '—'}</td>
                      <td className="py-3 px-4 text-sm">
                        {utilisateur.Actif ? (
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

export default UtilisateurForm;

