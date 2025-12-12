import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TravauxList from './components/TravauxList';
import DemandeList from './components/DemandeList';
import DemandeForm from './components/DemandeForm';
import DemandeTypeForm from './components/DemandeTypeForm';
import ClientTypeForm from './components/ClientTypeForm';
import ClientsList from './components/ClientsList';
import CentreForm from './components/CentreForm';
import AgenceForm from './components/AgenceForm';
import UniteForm from './components/UniteForm';
import UtilisateurForm from './components/UtilisateurForm';
import RoleForm from './components/RoleForm';
import ArticlesList from './components/ArticlesList';
import DevisForm from './components/DevisForm';
import DevisList from './components/DevisList';
import DevisTypeForm from './components/DevisTypeForm';
import ParametresForm from './components/ParametresForm';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Refs for tracking idle time
  const idleTimer = useRef(null);
  const idleWarningTimer = useRef(null);
  const tokenCheckInterval = useRef(null);
  const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  const WARNING_TIME = 60 * 1000; // 1 minute warning before logout
  const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Function to check token validity
  const checkTokenValidity = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleLogout();
      return;
    }

    try {
      const response = await fetch(process.env.REACT_APP_API_URL || 'http://localhost:5000/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.valid) {
        handleLogout();
      }
    } catch (error) {
      // En cas d'erreur de vérification, déconnecter l'utilisateur
      handleLogout();
    }
  }, []);

  const handleLogout = React.useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    if (tokenCheckInterval.current) clearInterval(tokenCheckInterval.current);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setShowIdleWarning(false);
  }, []);

  // Reset idle timers on user activity
  const resetIdleTimer = React.useCallback(() => {
    // Masquer l'avertissement lorsque l'utilisateur est actif
    setShowIdleWarning(false);
    
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    
    idleTimer.current = setTimeout(() => {
      idleWarningTimer.current = setTimeout(() => {
        handleLogout();
        setShowIdleWarning(false);
      }, WARNING_TIME);
      setShowIdleWarning(true);
    }, IDLE_TIMEOUT);
  }, [handleLogout, IDLE_TIMEOUT, WARNING_TIME]);

  // Set up event listeners for user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
      if (tokenCheckInterval.current) clearInterval(tokenCheckInterval.current);
    };
  }, [resetIdleTimer]);

  // Check for existing authentication on app load and set up token validation interval
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Démarrer la vérification périodique du token
        tokenCheckInterval.current = setInterval(checkTokenValidity, TOKEN_CHECK_INTERVAL);
      } catch (e) {
        // Error parsing user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    // Always set loading to false after checking
    setLoading(false);
    
    return () => {
      if (tokenCheckInterval.current) clearInterval(tokenCheckInterval.current);
    };
  }, [checkTokenValidity]);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowIdleWarning(false);
    resetIdleTimer();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
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
        return <DemandeForm user={user} onCreated={() => setCurrentView('demandes-list')} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'clients-list':
        return <ClientsList />;
      case 'clients-types':
        return <ClientTypeForm user={user} />;
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
      case 'devis-list':
        return <DevisList user={user} />;
      case 'devis-types':
        return <DevisTypeForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'devis-create':
        return <DevisForm user={user} onUnauthorized={() => setCurrentView('dashboard')} />;
      case 'parametres':
        return <ParametresForm user={user} />;
      default:
        // Placeholder pour les autres vues
        return (
          <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 dark:text-white text-gray-900">Page non trouvée</h2>
              <p className="dark:text-gray-400 text-gray-600">Cette page n'est pas encore disponible.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ThemeProvider>
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${showIdleWarning ? 'bg-red-900/20' : ''}`}>
        <Navbar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          onLogout={handleLogout} 
          user={user} 
        />
        
        {showIdleWarning && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/90 backdrop-blur-sm p-4 text-center text-white font-semibold">
            <p>Votre session va expirer dans 1 minute pour des raisons de sécurité. Bougez votre souris ou appuyez sur une touche pour continuer.</p>
          </div>
        )}
        
        <main className="flex-grow pt-16">
          {renderView()}
        </main>
        
        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-links">
              <a href="/documentation" className="footer-link hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Documentation</a>
              <a href="/support" className="footer-link hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Support</a>
              <a href="/contact" className="footer-link hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contact</a>
            </div>
            <div className="footer-copyright">
              &copy; {new Date().getFullYear()} AquaConnect. Tous droits réservés.
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;