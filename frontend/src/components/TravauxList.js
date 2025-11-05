import React, { useState, useEffect } from 'react';
import { getTravaux } from '../services/api';
import TravauxCard from './TravauxCard';
import TravauxDetail from './TravauxDetail';

const TravauxList = () => {
  const [travaux, setTravaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTravaux, setSelectedTravaux] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTravaux();
  }, []);

  const loadTravaux = async () => {
    try {
      setLoading(true);
      const data = await getTravaux();
      setTravaux(data);
    } catch (error) {
      console.error('Erreur lors du chargement des travaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTravaux = travaux.filter((travail) => {
    const matchesSearch =
      travail.NumeroOrdre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      travail.Client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      travail.NumeroDemande?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || travail.CodeStatut === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (selectedTravaux) {
    return (
      <TravauxDetail
        travail={selectedTravaux}
        onBack={() => setSelectedTravaux(null)}
      />
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Suivi des Travaux
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Gestion des ordres d'exécution AquaConnect</p>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher par numéro, client ou demande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="EMIS">Émis</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 dark:text-gray-400 text-gray-600">
              {filteredTravaux.length} travail{filteredTravaux.length !== 1 ? 'aux' : ''} trouvé{filteredTravaux.length !== 1 ? 's' : ''}
            </div>

            {/* Travaux Grid */}
            {filteredTravaux.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <p className="dark:text-gray-400 text-gray-600 text-lg">Aucun travail trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTravaux.map((travail, index) => (
                  <TravauxCard
                    key={travail.IdOrdre}
                    travail={travail}
                    onClick={() => setSelectedTravaux(travail)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TravauxList;

