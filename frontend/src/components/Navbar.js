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
  const userDisplayName = formatUserDisplayName(user);
  const { theme, toggleTheme, isDark } = useTheme();
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
        console.error('Erreur lors du chargement des notifications:', error);
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
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
    },
    demandes: {
      label: 'Demandes',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      submenu: [
        { id: 'demandes-list', label: 'Liste des Demandes' },
        { id: 'demandes-types', label: 'Types de Travaux' },
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
    <nav ref={menuRef} className="solid-effect border-b dark:border-slate-600 border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg">
              <img src="/ade.png" alt="ADE Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient">
                AquaConnect
              </h1>
              <p className="text-[10px] dark:text-gray-400 text-gray-600">Gestion des Branchements</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="hidden md:flex items-center gap-1.5">
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
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 text-sm ${
                      isActive
                        ? 'btn-primary'
                        : 'solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900'
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                    {menuId !== 'administration' && <span>{item.label}</span>}
                    {item.submenu && (
                      <svg
                        className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
                    <div className="absolute top-full left-0 mt-1.5 w-48 solid-card p-1.5 animate-fadeIn">
                      {item.submenu
                        .filter((submenu) => !submenu.adminOnly || isAdmin(user) || (isChefCentre && submenu.id === 'utilisateurs-create'))
                        .map((submenu) => (
                        <button
                          key={submenu.id}
                          onClick={() => handleSubmenuClick(submenu.id)}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1.5 text-sm"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                          {submenu.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="hidden md:flex items-center gap-2">
            {/* Notification Icon */}
            {pendingCount > 0 && (
              <button
                onClick={() => setCurrentView('demandes-list')}
                className="relative p-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 transition-all duration-300"
                title={`${pendingCount} demande(s) en attente de validation`}
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              </button>
            )}
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
                  className="p-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 transition-all duration-300 group relative"
              title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                // Sun icon for light mode
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for dark mode
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 transition-all text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                    {user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:flex items-center gap-1 text-xs font-medium dark:text-gray-300 text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
                    </svg>
                    <span>{userDisplayName || 'Profil'}</span>
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 solid-card p-1.5 animate-fadeIn">
                    <div className="px-3 py-2 border-b dark:border-slate-600 border-gray-200 mb-1">
                      <p className="text-sm font-semibold dark:text-white text-gray-900">{user.prenom} {user.nom}</p>
                      <p className="text-xs dark:text-gray-400 text-gray-600">{user.email}</p>
                      <p className="text-xs dark:text-gray-400 text-gray-600 mt-1">{user.role}</p>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-500/20 dark:hover:bg-red-500/20 dark:text-gray-300 dark:hover:text-red-400 text-gray-700 hover:text-red-600 transition-colors duration-200 flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Notification Icon Mobile */}
            {pendingCount > 0 && (
              <button
                onClick={() => setCurrentView('demandes-list')}
                className="relative p-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 transition-all duration-300"
                title={`${pendingCount} demande(s) en attente de validation`}
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              </button>
            )}
            
            {/* Theme Toggle Mobile */}
            <button
              onClick={toggleTheme}
                  className="p-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 text-gray-700 hover:text-gray-900 transition-all duration-300"
              title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setOpenMenu(openMenu === 'mobile' ? null : 'mobile')}
                  className="p-1.5 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 text-gray-700 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {openMenu === 'mobile' && (
          <div className="md:hidden mt-3 pb-3 space-y-1.5">
            {/* User Info Mobile */}
            {user && (
              <div className="px-3 py-2 mb-2 solid-effect rounded-lg border-b dark:border-slate-600 border-gray-200">
                <p className="text-sm font-semibold dark:text-white text-gray-900">{user.prenom} {user.nom}</p>
                <p className="text-xs dark:text-gray-400 text-gray-600">{user.email}</p>
                <p className="text-xs dark:text-gray-400 text-gray-600 mt-1">{user.role}</p>
              </div>
            )}
            
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
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-sm ${
                      isActive
                        ? 'btn-primary'
                        : 'solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-300 text-gray-700 hover:text-gray-900'
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                    {menuId !== 'administration' && <span className="flex-1">{item.label}</span>}
                    {item.submenu && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {item.submenu && isActive && (
                    <div className="mt-1.5 ml-6 space-y-1">
                      {item.submenu
                        .filter((submenu) => !submenu.adminOnly || isAdmin(user) || (isChefCentre && submenu.id === 'utilisateurs-create'))
                        .map((submenu) => (
                        <button
                          key={submenu.id}
                          onClick={() => handleSubmenuClick(submenu.id)}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-gray-400 dark:hover:text-white text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1.5 text-xs"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                          {submenu.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Logout Mobile */}
            {user && (
              <>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg solid-effect hover:bg-red-500/20 dark:hover:bg-red-500/20 dark:text-gray-300 dark:hover:text-red-400 text-gray-700 hover:text-red-600 transition-colors duration-200 flex items-center gap-2 text-sm mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Déconnexion
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;