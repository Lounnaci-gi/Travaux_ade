import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TravauxList from './components/TravauxList';
import DemandeForm from './components/DemandeForm';
import DemandeTypeForm from './components/DemandeTypeForm';
import ClientTypeForm from './components/ClientTypeForm';
import CentreForm from './components/CentreForm';
import AgenceForm from './components/AgenceForm';
import UniteForm from './components/UniteForm';
import UtilisateurForm from './components/UtilisateurForm';
import RoleForm from './components/RoleForm';
import ArticlesList from './components/ArticlesList';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté et valider le token
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        // Pas de token ou utilisateur, nettoyer et afficher le login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      try {
        // Vérifier la validité du token avec le serveur
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/verify`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          // Token valide, restaurer l'utilisateur
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Token invalide ou expiré, nettoyer et forcer le login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
        // En cas d'erreur, nettoyer et forcer le login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'travaux':
        return <TravauxList />;
      case 'demandes-types':
        return <DemandeTypeForm />;
      case 'demandes-create':
        return <DemandeForm onCreated={() => setCurrentView('dashboard')} />;
      case 'clients-types':
        return <ClientTypeForm />;
      case 'unites-create':
        return <UniteForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'centres-create':
        return <CentreForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'agences-create':
        return <AgenceForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'utilisateurs-create':
        return <UtilisateurForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'roles-create':
        return <RoleForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'articles-list':
        return <ArticlesList user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      default:
        // Placeholder pour les autres vues
        return (
          <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="glass-card p-8 text-center max-w-md">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <p className="text-gray-400">
                Cette fonctionnalité sera disponible prochainement.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        {/* Navigation */}
        <Navbar currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} user={user} />

        {/* Main Content */}
        <main>
          {renderView()}
        </main>

        {/* Footer */}
        <footer className="mt-auto py-6 text-center dark:text-gray-400 text-gray-600 text-sm">
          <p>© 2025 AquaConnect - Système de Gestion des Branchements</p>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;
