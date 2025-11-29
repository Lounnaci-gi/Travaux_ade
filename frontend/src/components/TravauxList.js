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
      // Error loading travaux
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
    <div className="app-main">
      <div className="container-obat">
        {/* Header */}
        <div className="section-header mb-8">
          <h1 className="section-title text-gradient">
            Suivi des Travaux
          </h1>
          <p className="section-subtitle">Gestion des ordres d'exécution AquaConnect</p>
        </div>

        {/* Filters */}
        <div className="solid-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="form-group mb-0">
                <input
                  type="text"
                  placeholder="Rechercher par numéro, client ou demande..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
            <div>
              <div className="form-group mb-0">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="select-field w-full px-4 py-2"
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
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 dark:text-gray-400 text-gray-600">
              {filteredTravaux.length} travail{filteredTravaux.length !== 1 ? 'aux' : ''} trouvé{filteredTravaux.length !== 1 ? 's' : ''}
            </div>

            {/* Travaux Grid */}
            {filteredTravaux.length === 0 ? (
              <div className="solid-card p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="dark:text-gray-400 text-gray-600 text-lg">Aucun travail trouvé</p>
                </div>
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