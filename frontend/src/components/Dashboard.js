import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
import StatsCard from './StatsCard';

const Dashboard = () => {
  const [stats, setStats] = useState({
    TotalTravaux: 0,
    TravauxEnCours: 0,
    TravauxTermines: 0,
    TravauxEnAttente: 0,
    DemandesEnAttenteParType: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Travaux',
      value: stats.TotalTravaux || 0,
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-blue-500',
      delay: 0,
    },
    {
      title: 'En Cours',
      value: stats.TravauxEnCours || 0,
      icon: (
        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-500',
      delay: 100,
    },
    {
      title: 'Terminés',
      value: stats.TravauxTermines || 0,
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500',
      delay: 200,
    },
    {
      title: 'En Attente',
      value: stats.TravauxEnAttente || 0,
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-500',
      delay: 300,
    },
  ];

  // Calculer le total des demandes en attente
  const totalDemandesEnAttente = stats.DemandesEnAttenteParType?.reduce((sum, item) => sum + (item.Nombre || 0), 0) || 0;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gradient">
          Tableau de Bord
        </h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((card, index) => {
                // Carte spéciale pour "En Attente" avec détails par type
                if (card.title === 'En Attente') {
                  return (
                    <div
                      key={index}
                      className="glass-card p-6 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2"
                      style={{ animationDelay: `${card.delay}ms` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${card.color} bg-opacity-20 backdrop-blur-sm`}>
                          {card.icon}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gradient">
                            {card.value}
                          </p>
                          <p className="dark:text-gray-300 text-gray-700 text-sm mt-1">{card.title}</p>
                        </div>
                      </div>
                      <div className="h-1 w-full dark:bg-gray-700 bg-gray-300 rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full ${card.color} animate-pulse`}
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                      {stats.DemandesEnAttenteParType && stats.DemandesEnAttenteParType.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {stats.DemandesEnAttenteParType.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10"
                            >
                              <span className="text-xs dark:text-gray-300 text-gray-700 truncate flex-1 mr-2">
                                {item.TypeDemande || 'Non spécifié'}
                              </span>
                              <span className="text-sm font-bold text-gradient-reverse whitespace-nowrap">
                                {String(item.Nombre || 0).padStart(2, '0')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 text-xs py-2">
                          Aucune demande
                        </p>
                      )}
                    </div>
                  );
                }
                // Autres cartes normales
                return <StatsCard key={index} {...card} />;
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;