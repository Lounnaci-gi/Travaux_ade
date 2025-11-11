import React, { useState, useEffect } from 'react';
import { getDemandes } from '../services/api';
import { alertError } from '../ui/alerts';

const DemandeList = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const data = await getDemandes();
      setDemandes(data);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      alertError('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les statuts uniques pour le filtre
  const statutsUniques = [...new Set(demandes.map(d => d.CodeStatut))].filter(Boolean);
  // Obtenir les types uniques pour le filtre
  const typesUniques = [...new Set(demandes.map(d => d.TypeDemande))].filter(Boolean);

  const filteredDemandes = demandes.filter((demande) => {
    const matchesSearch =
      demande.NumeroDemande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.ClientNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.ClientPrenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.NomAgence?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.TypeDemande?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatut = filterStatut === 'all' || demande.CodeStatut === filterStatut;
    const matchesType = filterType === 'all' || demande.TypeDemande === filterType;

    return matchesSearch && matchesStatut && matchesType;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatutBadgeClass = (codeStatut) => {
    const classes = {
      'EN_ATTENTE': 'bg-yellow-500/20 text-yellow-400',
      'EN_COURS': 'bg-blue-500/20 text-blue-400',
      'VALIDE': 'bg-green-500/20 text-green-400',
      'REJETE': 'bg-red-500/20 text-red-400',
      'TERMINE': 'bg-purple-500/20 text-purple-400',
    };
    return classes[codeStatut] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Liste des Demandes
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Gestion des demandes de travaux AquaConnect</p>
        </div>

        {/* Filtres et recherche */}
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Numéro, client, agence..."
                className="w-full px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
              />
            </div>

            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Statut
              </label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
              >
                <option value="all">Tous les statuts</option>
                {statutsUniques.map((statut) => (
                  <option key={statut} value={statut}>
                    {demandes.find(d => d.CodeStatut === statut)?.Statut || statut}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par type */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Type de demande
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
              >
                <option value="all">Tous les types</option>
                {typesUniques.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des demandes */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Numéro
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Date
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Client
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Agence
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Type
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Statut
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Créateur
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold dark:text-gray-300 text-gray-700">
                    Délai (jours)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDemandes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-400">
                      {demandes.length === 0
                        ? 'Aucune demande enregistrée'
                        : 'Aucune demande ne correspond aux critères de recherche'}
                    </td>
                  </tr>
                ) : (
                  filteredDemandes.map((demande) => (
                    <tr
                      key={demande.IdDemande}
                      className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono font-semibold dark:text-blue-400 text-blue-600">
                          {demande.NumeroDemande}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm dark:text-gray-300 text-gray-700">
                        {formatDate(demande.DateDemande)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm dark:text-gray-300 text-gray-700">
                          <div className="font-semibold">
                            {demande.ClientNom} {demande.ClientPrenom}
                          </div>
                          {demande.ClientTelephone && (
                            <div className="text-xs text-gray-400 mt-1">
                              {demande.ClientTelephone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm dark:text-gray-300 text-gray-700">
                        {demande.NomAgence}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm dark:text-gray-300 text-gray-700">
                          {demande.TypeDemande}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatutBadgeClass(
                            demande.CodeStatut
                          )}`}
                        >
                          {demande.Statut}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm dark:text-gray-300 text-gray-700">
                        {demande.Createur}
                      </td>
                      <td className="py-4 px-6 text-sm dark:text-gray-300 text-gray-700">
                        {demande.DelaiPaiementJours || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Résumé */}
          <div className="px-6 py-4 border-t border-white/10 dark:border-white/10 border-gray-200/50 bg-white/5 dark:bg-white/5">
            <div className="flex justify-between items-center text-sm">
              <span className="dark:text-gray-400 text-gray-600">
                Total: <strong className="dark:text-white text-gray-900">{filteredDemandes.length}</strong> demande(s)
                {filteredDemandes.length !== demandes.length && (
                  <span className="ml-2">
                    (sur {demandes.length} au total)
                  </span>
                )}
              </span>
              <button
                onClick={loadDemandes}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandeList;

