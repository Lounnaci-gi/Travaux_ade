import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TravauxList from './components/TravauxList';
import DemandeList from './components/DemandeList';
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
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  
  // Refs for tracking idle time
  const idleTimer = useRef(null);
  const idleWarningTimer = useRef(null);
  const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  const WARNING_TIME = 60 * 1000; // 1 minute warning before logout

  // Function to reset the idle timer
  const resetIdleTimer = () => {
    // Clear existing timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    
    // Hide warning if it was shown
    setShowIdleWarning(false);
    
    // Set new timer for logout
    idleTimer.current = setTimeout(() => {
      // Show warning 1 minute before actual logout
      setShowIdleWarning(true);
      
      // Set timer for actual logout
      idleWarningTimer.current = setTimeout(() => {
        handleLogout();
      }, WARNING_TIME);
    }, IDLE_TIMEOUT - WARNING_TIME);
  };

  // Function to handle user activity
  const handleUserActivity = () => {
    if (isAuthenticated) {
      resetIdleTimer();
    }
  };

  useEffect(() => {
    // Add event listeners for user activity
    if (isAuthenticated) {
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keypress', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);
      
      // Start the idle timer
      resetIdleTimer();
    }

    // Cleanup function
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [isAuthenticated]);

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
    // Clear timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setShowIdleWarning(false);
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
      case 'demandes-list':
        return <DemandeList user={user} />;
      case 'demandes-types':
        return <DemandeTypeForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'demandes-create':
        return <DemandeForm user={user} onCreated={() => setCurrentView('demandes-list')} />;
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
        {/* Idle warning modal */}
        {showIdleWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="glass-card p-6 max-w-md mx-4">
              <h3 className="text-xl font-bold mb-2 text-yellow-400">Inactivité détectée</h3>
              <p className="mb-4 dark:text-gray-300 text-gray-700">
                Vous allez être déconnecté automatiquement dans 1 minute pour des raisons de sécurité.
                Bougez votre souris ou appuyez sur une touche pour annuler.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-yellow-500 h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        )}
        
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
