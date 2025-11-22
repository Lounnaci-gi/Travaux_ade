import React, { useEffect, useState } from 'react';
import { getClients } from '../services/api';

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadClients = async (search = '') => {
    try {
      setLoading(true);
      const data = await getClients(search);
      setClients(data);
    } catch (err) {
      // Error loading clients
      setError('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load all clients initially
    if (searchTerm === '') {
      loadClients();
      return;
    }
    
    // Apply debounce only when searching
    const delayDebounceFn = setTimeout(() => {
      loadClients(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handlePrint = (client) => {
    // Print functionality will be implemented here
  };

  const handleEdit = (client) => {
    // Edit functionality will be implemented here
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent">
            Liste des Clients
          </h1>
        </div>

        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-semibold dark:text-white text-gray-900">Rechercher des clients</h2>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 pl-10 w-full"
              />
              <svg 
                className="w-5 h-5 absolute left-3 top-2.5 dark:text-gray-400 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white text-gray-900">Clients</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
              {error}
            </div>
          ) : clients.length === 0 ? (
            <p className="dark:text-gray-400 text-gray-600">
              {searchTerm ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client enregistré.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Prénom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Adresse</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Téléphone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Date de création</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold dark:text-white text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.IdClient} className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-sm dark:text-white text-gray-900 font-mono">{client.IdClient}</td>
                      <td className="py-3 px-4 text-sm dark:text-white text-gray-900 font-semibold">{client.Nom || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{client.Prenom || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                        {client.AdresseResidence && client.CommuneResidence 
                          ? `${client.AdresseResidence}, ${client.CommuneResidence}`
                          : client.AdresseResidence || client.CommuneResidence || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{client.TelephonePrincipal || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">{client.Email || '—'}</td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300 text-gray-700">
                        {client.DateCreation 
                          ? new Date(client.DateCreation).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrint(client)}
                            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                            title="Imprimer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

export default ClientsList;