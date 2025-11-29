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
      // Error loading statistics
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Travaux',
      value: stats.TotalTravaux || 0,
      icon: (
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-primary-600',
      delay: 0,
    },
    {
      title: 'En Cours',
      value: stats.TravauxEnCours || 0,
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-600',
      delay: 100,
    },
    {
      title: 'Terminés',
      value: stats.TravauxTermines || 0,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-600',
      delay: 200,
    },
    {
      title: 'En Attente',
      value: stats.TravauxEnAttente || 0,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-600',
      delay: 300,
    },
  ];

  return (
    <div className="app-main">
      <div className="container-obat">
        <div className="section-header">
          <h1 className="section-title text-gradient">
            Tableau de Bord
          </h1>
          <p className="section-subtitle">Vue d'ensemble de vos activités</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((card, index) => {
                // Carte spéciale pour "En Attente" avec détails par type
                if (card.title === 'En Attente') {
                  return (
                    <div
                      key={index}
                      className="obat-card-primary transform transition-all duration-500 hover:-translate-y-1"
                      style={{ animationDelay: `${card.delay}ms` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${card.color} bg-opacity-20`}>
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
                          className={`h-full ${card.color}`}
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                      {stats.DemandesEnAttenteParType && stats.DemandesEnAttenteParType.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {stats.DemandesEnAttenteParType.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-slate-600"
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

            {/* Additional Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="obat-card">
                  <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">Actions Rapides</h2>
                  <div className="space-y-3">
                    <button className="w-full btn btn-primary flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Nouvelle Demande
                    </button>
                    <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Créer un Devis
                    </button>
                    <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Ajouter un Client
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="obat-card mt-6">
                  <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">Activité Récente</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white text-gray-900">Nouveau travail créé</p>
                        <p className="text-xs dark:text-gray-400 text-gray-600">Il y a 2 heures</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white text-gray-900">Devis approuvé</p>
                        <p className="text-xs dark:text-gray-400 text-gray-600">Il y a 1 jour</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white text-gray-900">Nouvelle demande en attente</p>
                        <p className="text-xs dark:text-gray-400 text-gray-600">Il y a 3 jours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts/Graphs Section */}
              <div className="lg:col-span-2">
                <div className="obat-card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white text-gray-900">Performance Mensuelle</h2>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary">Mois</button>
                      <button className="btn btn-sm btn-secondary">Trimestre</button>
                      <button className="btn btn-sm btn-secondary">Année</button>
                    </div>
                  </div>
                  
                  {/* Chart Placeholder */}
                  <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-600">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">Graphique des performances</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Les données s'afficheront ici</p>
                    </div>
                  </div>
                  
                  {/* Stats Summary */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                      <p className="text-2xl font-bold text-primary-600">85%</p>
                      <p className="text-sm dark:text-gray-400 text-gray-600">Taux de réussite</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                      <p className="text-2xl font-bold text-green-600">24h</p>
                      <p className="text-sm dark:text-gray-400 text-gray-600">Temps moyen</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                      <p className="text-2xl font-bold text-amber-600">98%</p>
                      <p className="text-sm dark:text-gray-400 text-gray-600">Satisfaction client</p>
                    </div>
                  </div>
                </div>

                {/* Upcoming Tasks */}
                <div className="obat-card mt-6">
                  <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">Tâches à Venir</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-500/10">
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium dark:text-white text-gray-900">Inspection mensuelle</p>
                          <p className="text-sm dark:text-gray-400 text-gray-600">Zone A - Bâtiment 12</p>
                        </div>
                      </div>
                      <span className="text-sm dark:text-gray-400 text-gray-600">3 jours</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium dark:text-white text-gray-900">Maintenance préventive</p>
                          <p className="text-sm dark:text-gray-400 text-gray-600">Zone C - Bâtiment 7</p>
                        </div>
                      </div>
                      <span className="text-sm dark:text-gray-400 text-gray-600">1 semaine</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;