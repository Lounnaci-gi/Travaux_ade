import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTravaux = async () => {
  const response = await api.get('/travaux');
  return response.data;
};

export const getTravauxById = async (id) => {
  const response = await api.get(`/travaux/${id}`);
  return response.data;
};

export const getTravauxHistorique = async (id) => {
  const response = await api.get(`/travaux/${id}/historique`);
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

// Referentiels pour formulaire Demande
export const getClients = async (search = '') => {
  const response = await api.get('/clients', {
    params: { search }
  });
  return response.data;
};

export const getClientById = async (id) => {
  const response = await api.get(`/clients/${id}`);
  return response.data;
};

export const getClientTypes = async () => {
  const response = await api.get('/clients/types');
  return response.data;
};

export const createClientType = async (payload) => {
  const response = await api.post('/clients/types', payload);
  return response.data;
};

export const updateClientType = async (id, payload) => {
  const response = await api.put(`/clients/types/${id}`, payload);
  return response.data;
};

export const createClient = async (payload) => {
  const response = await api.post('/clients', payload);
  return response.data;
};

// Hiérarchie géographique
export const getUnites = async () => {
  const response = await api.get('/unites');
  return response.data;
};

export const getUniteById = async (id) => {
  const response = await api.get(`/unites/${id}`);
  return response.data;
};

export const createUnite = async (payload) => {
  const response = await api.post('/unites', payload);
  return response.data;
};

export const updateUnite = async (id, payload) => {
  const response = await api.put(`/unites/${id}`, payload);
  return response.data;
};

export const getCentres = async () => {
  const response = await api.get('/centres');
  return response.data;
};

export const getCentreById = async (id) => {
  const response = await api.get(`/centres/${id}`);
  return response.data;
};

export const createCentre = async (payload) => {
  const response = await api.post('/centres', payload);
  return response.data;
};

export const updateCentre = async (id, payload) => {
  const response = await api.put(`/centres/${id}`, payload);
  return response.data;
};

export const getAgences = async () => {
  const response = await api.get('/agences');
  return response.data;
};

export const getAgenceById = async (id) => {
  const response = await api.get(`/agences/${id}`);
  return response.data;
};

export const createAgence = async (payload) => {
  const response = await api.post('/agences', payload);
  return response.data;
};

export const updateAgence = async (id, payload) => {
  const response = await api.put(`/agences/${id}`, payload);
  return response.data;
};

// Utilisateurs et rôles
export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

export const createRole = async (payload) => {
  const response = await api.post('/roles', payload);
  return response.data;
};

export const updateRole = async (id, payload) => {
  const response = await api.put(`/roles/${id}`, payload);
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};

export const getUtilisateurs = async () => {
  const response = await api.get('/utilisateurs');
  return response.data;
};

export const createUtilisateur = async (payload) => {
  const response = await api.post('/utilisateurs', payload);
  return response.data;
};

export const updateUtilisateur = async (id, payload) => {
  const response = await api.put(`/utilisateurs/${id}`, payload);
  return response.data;
};

export const deleteUtilisateur = async (id) => {
  const response = await api.delete(`/utilisateurs/${id}`);
  return response.data;
};

export const getDemandeTypes = async () => {
  const response = await api.get('/demandes/types');
  return response.data;
};

export const createDemandeType = async (payload) => {
  const response = await api.post('/demandes/types', payload);
  return response.data;
};

export const updateDemandeType = async (id, payload) => {
  const response = await api.put(`/demandes/types/${id}`, payload);
  return response.data;
};

export const getDemandeTypesDiagnostic = async () => {
  const response = await api.get('/demandes/types/diagnostic');
  return response.data;
};

export const testDemandeTypesAuthorizations = async () => {
  const response = await api.get('/demandes/types/test-authorizations');
  return response.data;
};

export const createDemande = async (payload) => {
  const response = await api.post('/demandes', payload);
  return response.data;
};

export const getDemandes = async () => {
  const response = await api.get('/demandes');
  return response.data;
};

export const getPendingDemandesCount = async () => {
  const response = await api.get('/demandes/pending-count');
  return response.data;
};

export const validateDemande = async (demandeId, typeValidation) => {
  const response = await api.post(`/demandes/${demandeId}/validate`, { typeValidation });
  return response.data;
};

export const getDemande = async (id) => {
  const response = await api.get(`/demandes/${id}`);
  return response.data;
};

// Authentication
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
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
      console.error('Logout error:', error);
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

// Interceptor pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ne jamais rediriger vers le login en cas d'erreur
    // Les erreurs doivent être gérées par les composants qui les appellent
    // L'utilisateur reste sur la page actuelle
    return Promise.reject(error);
  }
);

// Articles
export const getArticles = async () => {
  const response = await api.get('/articles');
  return response.data;
};

export const getArticleById = async (id) => {
  const response = await api.get(`/articles/${id}`);
  return response.data;
};

export const createArticle = async (payload) => {
  const response = await api.post('/articles', payload);
  return response.data;
};

export const updateArticle = async (id, payload) => {
  const response = await api.put(`/articles/${id}`, payload);
  return response.data;
};

export const getArticleFamilles = async () => {
  const response = await api.get('/articles/familles');
  return response.data;
};

export const createArticleFamille = async (payload) => {
  const response = await api.post('/articles/familles', payload);
  return response.data;
};

export default api;