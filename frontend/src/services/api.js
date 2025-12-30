import axios from 'axios';
import { alertError } from '../ui/alerts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor pour gérer les erreurs de réseau
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si l'erreur est une erreur réseau (serveur non joignable)
    if (!error.response && error.code !== 'ECONNABORTED') {
      alertError(
        'Serveur non joignable',
        'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet ou réessayer plus tard.'
      );
    }
    
    // Si l'erreur est une erreur 401 avec le message "Session expirée", 
    // déconnecter l'utilisateur et le rediriger vers la page de login
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.error || '';
      if (message.includes('Session expirée')) {
        // Supprimer les données de session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Rediriger vers la page de login
        if (typeof window !== 'undefined') {
          window.location.href = '/'; // Redirige vers la racine qui affichera le login
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const getTravaux = async () => {
  try {
    const response = await api.get('/travaux');
    return response.data;
  } catch (error) {
    console.error('Error fetching travaux:', error);
    throw error;
  }
};

export const getTravauxById = async (id) => {
  try {
    const response = await api.get(`/travaux/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching travaux with id ${id}:`, error);
    throw error;
  }
};

export const getTravauxHistorique = async (id) => {
  try {
    const response = await api.get(`/travaux/${id}/historique`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching travaux historique for id ${id}:`, error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// Referentiels pour formulaire Demande
export const getClients = async (search = '') => {
  try {
    const response = await api.get('/clients', {
      params: { search }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const getClientById = async (id) => {
  try {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching client with id ${id}:`, error);
    throw error;
  }
};

export const getClientTypes = async () => {
  try {
    const response = await api.get('/clients/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching client types:', error);
    throw error;
  }
};

export const createClientType = async (payload) => {
  try {
    const response = await api.post('/clients/types', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating client type:', error);
    throw error;
  }
};

export const updateClientType = async (id, payload) => {
  try {
    const response = await api.put(`/clients/types/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating client type with id ${id}:`, error);
    throw error;
  }
};

export const createClient = async (payload) => {
  try {
    const response = await api.post('/clients', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

// Hiérarchie géographique
export const getUnites = async () => {
  try {
    const response = await api.get('/unites');
    return response.data;
  } catch (error) {
    console.error('Error fetching unites:', error);
    throw error;
  }
};

export const getUniteById = async (id) => {
  try {
    const response = await api.get(`/unites/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching unite with id ${id}:`, error);
    throw error;
  }
};

export const createUnite = async (payload) => {
  try {
    const response = await api.post('/unites', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating unite:', error);
    throw error;
  }
};

export const updateUnite = async (id, payload) => {
  try {
    const response = await api.put(`/unites/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating unite with id ${id}:`, error);
    throw error;
  }
};

export const getCentres = async () => {
  try {
    const response = await api.get('/centres');
    return response.data;
  } catch (error) {
    console.error('Error fetching centres:', error);
    throw error;
  }
};

export const getCentreById = async (id) => {
  try {
    const response = await api.get(`/centres/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching centre with id ${id}:`, error);
    throw error;
  }
};

export const createCentre = async (payload) => {
  try {
    const response = await api.post('/centres', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating centre:', error);
    throw error;
  }
};

export const updateCentre = async (id, payload) => {
  try {
    const response = await api.put(`/centres/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating centre with id ${id}:`, error);
    throw error;
  }
};

export const getAgences = async () => {
  try {
    const response = await api.get('/agences');
    return response.data;
  } catch (error) {
    console.error('Error fetching agences:', error);
    throw error;
  }
};

export const getAgenceById = async (id) => {
  try {
    const response = await api.get(`/agences/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agence with id ${id}:`, error);
    throw error;
  }
};

export const createAgence = async (payload) => {
  try {
    const response = await api.post('/agences', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating agence:', error);
    throw error;
  }
};

export const updateAgence = async (id, payload) => {
  try {
    const response = await api.put(`/agences/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating agence with id ${id}:`, error);
    throw error;
  }
};

// Utilisateurs et rôles
export const getRoles = async () => {
  try {
    const response = await api.get('/roles');
    return response.data;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

export const createRole = async (payload) => {
  try {
    const response = await api.post('/roles', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

export const updateRole = async (id, payload) => {
  try {
    const response = await api.put(`/roles/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating role with id ${id}:`, error);
    throw error;
  }
};

export const deleteRole = async (id) => {
  try {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting role with id ${id}:`, error);
    throw error;
  }
};

export const getUtilisateurs = async () => {
  try {
    const response = await api.get('/utilisateurs');
    return response.data;
  } catch (error) {
    console.error('Error fetching utilisateurs:', error);
    throw error;
  }
};

export const createUtilisateur = async (payload) => {
  try {
    const response = await api.post('/utilisateurs', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating utilisateur:', error);
    throw error;
  }
};

export const updateUtilisateur = async (id, payload) => {
  try {
    const response = await api.put(`/utilisateurs/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating utilisateur with id ${id}:`, error);
    throw error;
  }
};

export const deleteUtilisateur = async (id) => {
  try {
    const response = await api.delete(`/utilisateurs/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting utilisateur with id ${id}:`, error);
    throw error;
  }
};

export const getDemandeTypes = async () => {
  try {
    const response = await api.get('/demandes/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching demande types:', error);
    throw error;
  }
};

export const createDemandeType = async (payload) => {
  try {
    const response = await api.post('/demandes/types', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating demande type:', error);
    throw error;
  }
};

export const updateDemandeType = async (id, payload) => {
  try {
    const response = await api.put(`/demandes/types/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating demande type with id ${id}:`, error);
    throw error;
  }
};

export const getDemandeTypesDiagnostic = async () => {
  try {
    const response = await api.get('/demandes/types/diagnostic');
    return response.data;
  } catch (error) {
    console.error('Error fetching demande types diagnostic:', error);
    throw error;
  }
};

export const testDemandeTypesAuthorizations = async () => {
  try {
    const response = await api.get('/demandes/types/test-authorizations');
    return response.data;
  } catch (error) {
    console.error('Error testing demande types authorizations:', error);
    throw error;
  }
};

export const createDemande = async (payload) => {
  try {
    const response = await api.post('/demandes', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating demande:', error);
    throw error;
  }
};

export const getDemandes = async () => {
  try {
    const response = await api.get('/demandes');
    return response.data;
  } catch (error) {
    console.error('Error fetching demandes:', error);
    throw error;
  }
};

export const getPendingDemandesCount = async () => {
  try {
    const response = await api.get('/demandes/pending-count');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending demandes count:', error);
    throw error;
  }
};

// Configuration Globale
export const getConfigurations = async () => {
  try {
    const response = await api.get('/configurations');
    return response.data;
  } catch (error) {
    console.error('Error fetching configurations:', error);
    throw error;
  }
};

export const getConfigurationByKey = async (key) => {
  try {
    const response = await api.get(`/configurations/${key}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching configuration with key ${key}:`, error);
    throw error;
  }
};

export const getTVADefault = async () => {
  try {
    const response = await api.get('/configurations/public/tva');
    return response.data;
  } catch (error) {
    console.error('Error fetching TVA default:', error);
    throw error;
  }
};

export const updateConfiguration = async (key, payload) => {
  try {
    const response = await api.put(`/configurations/${key}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating configuration with key ${key}:`, error);
    throw error;
  }
};

export const validateDemande = async (demandeId, typeValidation) => {
  try {
    const response = await api.post(`/demandes/${demandeId}/validate`, { typeValidation });
    return response.data;
  } catch (error) {
    console.error(`Error validating demande with id ${demandeId}:`, error);
    throw error;
  }
};

export const getDemande = async (id) => {
  try {
    const response = await api.get(`/demandes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching demande with id ${id}:`, error);
    throw error;
  }
};

// Authentication
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const verifyToken = async () => {
  try {
    const response = await api.post('/auth/verify-token');
    return response.data;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
};

export const logout = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await api.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Logout error
    }
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Interceptor pour ajouter le token à toutes les requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getDevis = async (id) => {
  try {
    const response = await api.get(`/devis/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching devis with id ${id}:`, error);
    throw error;
  }
};

export const getDevisList = async () => {
  try {
    const response = await api.get('/devis');
    return response.data;
  } catch (error) {
    console.error('Error fetching devis list:', error);
    throw error;
  }
};

export const createDevis = async (payload) => {
  try {
    const response = await api.post('/devis', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating devis:', error);
    throw error;
  }
};

export const updateDevis = async (id, payload) => {
  try {
    const response = await api.put(`/devis/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating devis with id ${id}:`, error);
    throw error;
  }
};

export const deleteDevis = async (id) => {
  try {
    const response = await api.delete(`/devis/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting devis with id ${id}:`, error);
    throw error;
  }
};

export const getDevisTypes = async () => {
  try {
    const response = await api.get('/devis/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching devis types:', error);
    throw error;
  }
};

export const createDevisType = async (payload) => {
  try {
    const response = await api.post('/devis/types', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating devis type:', error);
    throw error;
  }
};

export const updateDevisType = async (id, payload) => {
  try {
    const response = await api.put(`/devis/types/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating devis type with id ${id}:`, error);
    throw error;
  }
};

export const deleteDevisType = async (id) => {
  try {
    const response = await api.delete(`/devis/types/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting devis type with id ${id}:`, error);
    throw error;
  }
};

export const getNextDevisNumber = async (idDemande) => {
  try {
    const response = await api.get(`/devis/next-number/${idDemande}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching next devis number for demande id ${idDemande}:`, error);
    throw error;
  }
};

export const validateDevis = async (devisId, typeValidation) => {
  try {
    const response = await api.post(`/devis/${devisId}/validate`, { typeValidation });
    return response.data;
  } catch (error) {
    console.error(`Error validating devis with id ${devisId}:`, error);
    throw error;
  }
};

// Articles
export const getArticles = async () => {
  try {
    const response = await api.get('/articles');
    return response.data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};

export const getFamilles = async () => {
  try {
    const response = await api.get('/familles');
    return response.data;
  } catch (error) {
    console.error('Error fetching families:', error);
    throw error;
  }
};

export const getArticleById = async (id) => {
  try {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching article with id ${id}:`, error);
    throw error;
  }
};

export const createArticle = async (payload) => {
  try {
    const response = await api.post('/articles', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating article:', error);
    throw error;
  }
};

// Simplified article creation with price (for immediate creation in devis form)
export const createArticleWithPrice = async (payload) => {
  try {
    const response = await api.post('/articles/with-price', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating article with price:', error);
    throw error;
  }
};

export const updateArticle = async (id, payload) => {
  try {
    const response = await api.put(`/articles/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating article with id ${id}:`, error);
    throw error;
  }
};

export const getArticleFamilles = async () => {
  try {
    const response = await api.get('/articles/familles');
    return response.data;
  } catch (error) {
    console.error('Error fetching article families:', error);
    throw error;
  }
};

export const createArticleFamille = async (payload) => {
  try {
    const response = await api.post('/articles/familles', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating article family:', error);
    throw error;
  }
};

// Article Prix Historique
export const getArticlePrixHistorique = async (id) => {
  try {
    const response = await api.get(`/articles/${id}/prix-historique`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching article price history for id ${id}:`, error);
    throw error;
  }
};

export const createArticlePrixHistorique = async (id, payload) => {
  try {
    const response = await api.post(`/articles/${id}/prix-historique`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error creating article price history for id ${id}:`, error);
    throw error;
  }
};

export const updateArticlePrixHistorique = async (id, payload) => {
  try {
    const response = await api.put(`/articles/prix-historique/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error(`Error updating article price history with id ${id}:`, error);
    throw error;
  }
};

export const deleteArticlePrixHistorique = async (id) => {
  try {
    const response = await api.delete(`/articles/prix-historique/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting article price history with id ${id}:`, error);
    throw error;
  }
};

export default api;