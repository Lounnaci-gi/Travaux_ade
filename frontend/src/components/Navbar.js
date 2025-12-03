import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { isAdmin } from '../utils/auth';
import { getPendingDemandesCount } from '../services/api';

const MAX_USER_LABEL_LENGTH = 14;

const formatUserDisplayName = (user) => {
  if (!user) {
    return '';
  }

  const prenom = user.prenom?.trim() || '';
  const nomInitial = user.nom?.trim()?.[0]?.toUpperCase() || '';

  let baseLabel = '';
  if (prenom && nomInitial) {
    baseLabel = `${prenom} ${nomInitial}.`;
  } else if (prenom) {
    baseLabel = prenom;
  } else if (user.nom) {
    baseLabel = user.nom.trim();
  }

  if (baseLabel.length > MAX_USER_LABEL_LENGTH) {
    return `${baseLabel.slice(0, MAX_USER_LABEL_LENGTH - 1)}…`;
  }

  return baseLabel;
};

const Navbar = ({ currentView, setCurrentView, onLogout, user }) => {
  const isChefCentre = !!(user && user.codeRole && (user.codeRole.toLowerCase().includes('chef') && user.codeRole.toLowerCase().includes('centre')));
  // eslint-disable-next-line no-unused-vars
  const userDisplayName = formatUserDisplayName(user);
  const { toggleTheme, isDark } = useTheme();
  const [openMenu, setOpenMenu] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const menuRef = useRef(null);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
        setShowUserMenu(false);
      }
    };

    if (openMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu, showUserMenu]);

  // Charger et rafraîchir le nombre de demandes non validées
  useEffect(() => {
    if (!user) return;

    const loadPendingCount = async () => {
      try {
        const data = await getPendingDemandesCount();
        setPendingCount(data.count || 0);
      } catch (error) {
        // Error loading notifications
        setPendingCount(0);
      }
    };

    // Charger immédiatement
    loadPendingCount();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadPendingCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const menuItems = {
    dashboard: {
      label: 'Tableau de bord',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    travaux: {
      label: 'Travaux',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      submenu: [
        { id: 'demandes-types', label: 'Types de Travaux' },
      ],
    },    demandes: {
      label: 'Demandes',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      submenu: [
        { id: 'demandes-list', label: 'Liste des Demandes' },
        { id: 'demandes-statuts', label: 'Statuts' },
        { id: 'demandes-create', label: 'Nouvelle Demande' },
      ],
    },
    devis: {
      label: 'Devis',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      submenu: [
        { id: 'devis-list', label: 'Liste des Devis' },
        { id: 'devis-types', label: 'Types de Devis' },
        { id: 'devis-create', label: 'Créer un Devis' },
      ],
    },
    clients: {
      label: 'Clients',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      submenu: [
        { id: 'clients-list', label: 'Liste des Clients' },
        { id: 'clients-types', label: 'Types de Clients' },
        { id: 'clients-create', label: 'Nouveau Client' },
      ],
    },
    paiements: {
      label: 'Paiements',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      submenu: [
        { id: 'paiements-list', label: 'Liste des Paiements' },
        { id: 'paiements-modes', label: 'Modes de Paiement' },
        { id: 'paiements-enregistrer', label: 'Enregistrer Paiement' },
      ],
    },
    articles: {
      label: 'Articles',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      submenu: [
        { id: 'articles-list', label: 'Liste des Articles' },
        { id: 'articles-familles', label: 'Familles d\'Articles' },
        { id: 'articles-prix', label: 'Historique des Prix' },
      ],
    },
    administration: {
      label: 'Administration',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      submenu: [
        { id: 'utilisateurs-create', label: 'Utilisateur', adminOnly: true },
        { id: 'unites-create', label: 'Unité', adminOnly: true },
        { id: 'centres-create', label: 'Centre', adminOnly: true },
        { id: 'agences-create', label: 'Agence', adminOnly: true },
        { id: 'parametres', label: 'Paramètres', adminOnly: true },
      ],
    },
  };

  const handleMenuClick = (menuId) => {
    if (menuItems[menuId]?.submenu) {
      setOpenMenu(openMenu === menuId ? null : menuId);
    } else {
      setCurrentView(menuId);
      setOpenMenu(null);
    }
  };

  const handleSubmenuClick = (submenuId) => {
    setCurrentView(submenuId);
    setOpenMenu(null);
  };

  return (
    <nav ref={menuRef} className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm dark:shadow-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-1 rounded-md">
                <img src="/ade.png" alt="ADE Logo" className="h-7 w-7 object-contain" />
              </div>
              <div className="ml-2 hidden md:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  AquaConnect
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-0.5">
            {Object.keys(menuItems)
              .filter((menuId) => {
                // Afficher Administration pour admin ou chef de centre
                if (menuId === 'administration' && !(isAdmin(user) || isChefCentre)) {
                  return false;
                }
                return true;
              })
              .map((menuId) => {
              const item = menuItems[menuId];
              const isActive = currentView === menuId || currentView?.startsWith(menuId);
              const isOpen = openMenu === menuId;

              return (
                <div key={menuId} className="relative">
                  <button
                    onClick={() => handleMenuClick(menuId)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.icon}
                    </span>
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.submenu && (
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Submenu */}
                  {item.submenu && isOpen && (
                    <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        {item.submenu
                          .filter((submenu) => !submenu.adminOnly || isAdmin(user) || (isChefCentre && submenu.id === 'utilisateurs-create'))
                          .map((submenu) => (
                          <button
                            key={submenu.id}
                            onClick={() => handleSubmenuClick(submenu.id)}
                            className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white"
                          >
                            {submenu.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center">
            {/* Notification Icon */}
            {pendingCount > 0 && (
              <button
                onClick={() => setCurrentView('demandes-list')}
                className="relative p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                title={`${pendingCount} demande(s) en attente de validation`}
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 ml-1"
              title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                // Sun icon for light mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for dark mode
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User Menu */}
            {user && (
              <div className="ml-1.5 relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                    {user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{user.prenom} {user.nom}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.role}</p>
                      </div>
                      <button
                        onClick={onLogout}
                        className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Déconnexion
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center ml-1.5">
              <button
                onClick={() => setOpenMenu(openMenu === 'mobile' ? null : 'mobile')}
                className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {openMenu === 'mobile' && (
        <div className="md:hidden border-t border-gray-200 dark:border-slate-700 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {Object.keys(menuItems)
              .filter((menuId) => {
                // Afficher Administration pour admin ou chef de centre
                if (menuId === 'administration' && !(isAdmin(user) || isChefCentre)) {
                  return false;
                }
                return true;
              })
              .map((menuId) => {
              const item = menuItems[menuId];
              const isActive = currentView === menuId || currentView?.startsWith(menuId);

              return (
                <div key={menuId}>
                  <button
                    onClick={() => handleMenuClick(menuId)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-sm font-medium flex items-center justify-between ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`mr-2 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.submenu && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {item.submenu && isActive && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.submenu
                        .filter((submenu) => !submenu.adminOnly || isAdmin(user) || (isChefCentre && submenu.id === 'utilisateurs-create'))
                        .map((submenu) => (
                        <button
                          key={submenu.id}
                          onClick={() => handleSubmenuClick(submenu.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          {submenu.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* User Info Mobile */}
            {user && (
              <div className="pt-3 mt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center px-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="ml-2 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.prenom} {user.nom}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="mt-2 w-full flex items-center px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="truncate">Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;