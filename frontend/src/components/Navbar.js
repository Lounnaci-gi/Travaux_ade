import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { isAdmin } from '../utils/auth';

const Navbar = ({ currentView, setCurrentView, onLogout, user }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [openMenu, setOpenMenu] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
        { id: 'admin-users', label: 'Utilisateurs', adminOnly: true },
        { id: 'utilisateurs-create', label: 'Créer un Utilisateur', adminOnly: true },
        { id: 'admin-roles', label: 'Rôles', adminOnly: true },
        { id: 'roles-create', label: 'Créer un Rôle', adminOnly: true },
        { id: 'admin-hierarchie', label: 'Hiérarchie (Unité/Centre/Agence)', adminOnly: true },
        { id: 'unites-create', label: 'Créer une Unité', adminOnly: true },
        { id: 'centres-create', label: 'Créer un Centre', adminOnly: true },
        { id: 'agences-create', label: 'Créer une Agence', adminOnly: true },
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
    <nav ref={menuRef} className="glass-effect border-b border-white/20 dark:border-white/20 border-gray-200/50 sticky top-0 z-50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 animate-pulse">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AquaConnect
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 text-gray-600">Gestion des Branchements</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="hidden md:flex items-center gap-1.5">
            {Object.keys(menuItems)
              .filter((menuId) => {
                // Masquer le menu Administration si l'utilisateur n'est pas admin
                if (menuId === 'administration' && !isAdmin(user)) {
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
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                        : 'glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
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
                    <div className="absolute top-full left-0 mt-1.5 w-48 glass-card p-1.5 animate-fadeIn">
                      {item.submenu
                        .filter((submenu) => !submenu.adminOnly || isAdmin(user))
                        .map((submenu) => (
                        <button
                          key={submenu.id}
                          onClick={() => handleSubmenuClick(submenu.id)}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-1.5 text-sm"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
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
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
                  className="p-1.5 rounded-lg glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group relative"
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:block">
                    {user.prenom} {user.nom}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 glass-card p-1.5 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-white/10 dark:border-white/10 border-gray-200/50 mb-1">
                      <p className="text-sm font-semibold text-white dark:text-white text-gray-900">{user.prenom} {user.nom}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400 text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400 text-gray-600 mt-1">{user.role}</p>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-red-400 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2 text-sm"
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
            {/* Theme Toggle Mobile */}
            <button
              onClick={toggleTheme}
                  className="p-1.5 rounded-lg glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300"
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
                  className="p-1.5 rounded-lg glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
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
              <div className="px-3 py-2 mb-2 glass-effect rounded-lg border-b border-white/10 dark:border-white/10 border-gray-200/50">
                <p className="text-sm font-semibold text-white dark:text-white text-gray-900">{user.prenom} {user.nom}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 text-gray-600 mt-1">{user.role}</p>
              </div>
            )}
            
            {Object.keys(menuItems)
              .filter((menuId) => {
                // Masquer le menu Administration si l'utilisateur n'est pas admin
                if (menuId === 'administration' && !isAdmin(user)) {
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
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'glass-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.submenu && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {item.submenu && isActive && (
                    <div className="mt-1.5 ml-6 space-y-1">
                      {item.submenu
                        .filter((submenu) => !submenu.adminOnly || isAdmin(user))
                        .map((submenu) => (
                        <button
                          key={submenu.id}
                          onClick={() => handleSubmenuClick(submenu.id)}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-400 dark:hover:text-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-1.5 text-xs"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
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
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2 rounded-lg glass-effect hover:bg-red-500/20 dark:hover:bg-red-500/20 dark:text-gray-300 dark:hover:text-red-400 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2 text-sm mt-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Déconnexion
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

