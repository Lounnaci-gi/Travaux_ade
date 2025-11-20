import React, { useState, useEffect } from 'react';
import { getConfigurations, updateConfiguration } from '../services/api';
import Swal from 'sweetalert2';

const ParametresForm = ({ user }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    language: 'fr',
    autoSave: true
  });
  
  const [globalConfig, setGlobalConfig] = useState({
    TAUX_TVA_DEFAUT: '19.00'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Load global configurations
    loadGlobalConfigurations();
  }, []);

  const loadGlobalConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      const configs = await getConfigurations();
      
      // Convert array to object for easier access
      const configObject = {};
      configs.forEach(config => {
        configObject[config.Cle] = config.Valeur;
      });
      
      setGlobalConfig(configObject);
    } catch (err) {
      console.error('Erreur détaillée:', err);
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        
        if (err.response.status === 403) {
          setError('Accès refusé: Vous n\'avez pas les permissions nécessaires pour accéder aux configurations globales.');
        } else if (err.response.status === 401) {
          setError('Session expirée: Veuillez vous reconnecter.');
        } else {
          setError(`Erreur ${err.response.status}: ${err.response.data?.error || 'Erreur lors du chargement des configurations globales'}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Request data:', err.request);
        setError('Erreur réseau: Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
        setError(`Erreur: ${err.message || 'Erreur lors du chargement des configurations globales'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    // Save to localStorage
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
  };
  
  const handleGlobalConfigChange = (key, value) => {
    setGlobalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveGlobalConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Save each configuration
      for (const key in globalConfig) {
        await updateConfiguration(key, { Valeur: globalConfig[key] });
      }
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Configurations enregistrées avec succès',
        confirmButtonColor: '#3b82f6',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
      });
    } catch (err) {
      console.error('Erreur détaillée:', err);
      let errorMessage = 'Erreur lors de l\'enregistrement des configurations';
      
      if (err.response) {
        if (err.response.status === 403) {
          errorMessage = 'Accès refusé: Vous n\'avez pas les permissions nécessaires pour modifier les configurations globales.';
        } else if (err.response.status === 401) {
          errorMessage = 'Session expirée: Veuillez vous reconnecter.';
        } else {
          errorMessage = `Erreur ${err.response.status}: ${err.response.data?.error || 'Erreur lors de l\'enregistrement des configurations'}`;
        }
      } else if (err.request) {
        errorMessage = 'Erreur réseau: Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        errorMessage = `Erreur: ${err.message || 'Erreur lors de l\'enregistrement des configurations'}`;
      }
      
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: errorMessage,
        confirmButtonColor: '#ef4444',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  const isAdmin = user && user.role && (user.role.includes('ADMIN') || user.role.includes('admin') || user.role.includes('administrateur'));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="glass-card rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Paramètres</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Configurez vos préférences personnelles
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Theme Setting */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Apparence</h2>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Thème</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choisissez entre le mode clair ou sombre
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-lg ${settings.theme === 'light' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Clair
                </span>
                <button
                  onClick={() => handleChange('theme', settings.theme === 'light' ? 'dark' : 'light')}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors focus:outline-none"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`px-3 py-1 rounded-lg ${settings.theme === 'dark' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Sombre
                </span>
              </div>
            </div>
          </div>

          {/* Notifications Setting */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Notifications</h2>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Alertes et notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recevoir des notifications par email
                </p>
              </div>
              <button
                onClick={() => handleChange('notifications', !settings.notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.notifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Auto-save Setting */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Sauvegarde</h2>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Sauvegarde automatique</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sauvegarder automatiquement vos modifications
                </p>
              </div>
              <button
                onClick={() => handleChange('autoSave', !settings.autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.autoSave ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Language Setting */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Langue</h2>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Langue de l'interface</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Changer la langue de l'application
                </p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>

          {/* Global Configuration Settings - Only for Admin users */}
          {isAdmin && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Configuration Globale</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Taux TVA par défaut (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={globalConfig.TAUX_TVA_DEFAUT || ''}
                    onChange={(e) => handleGlobalConfigChange('TAUX_TVA_DEFAUT', e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Taux de TVA appliqué sur tous les articles
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Message for non-admin users */}
          {!isAdmin && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Configuration Globale</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Les paramètres de configuration globale ne sont accessibles qu'aux administrateurs.
                Votre rôle actuel est : <span className="font-semibold">{user?.role || 'Non défini'}</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          {isAdmin && (
            <button
              onClick={saveGlobalConfigurations}
              disabled={loading}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-300 font-medium disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer Configurations'}
            </button>
          )}
          <button
            onClick={() => {
              // Reload page to apply settings
              window.location.reload();
            }}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-300 font-medium"
          >
            Appliquer les changements
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParametresForm;