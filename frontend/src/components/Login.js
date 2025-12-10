import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Login = ({ onLogin }) => {
  const { toggleTheme, isDark } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockTimer, setLockTimer] = useState(null);

  const lockedUntil = lockTimer?.lockedUntil || null;

  useEffect(() => {
    if (!lockedUntil) {
      return undefined;
    }

    const tick = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockTimer(null);
      } else {
        setLockTimer((prev) => (prev ? { lockedUntil, remainingMs: remaining } : prev));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const formatRemainingTime = (ms) => {
    if (!ms || ms <= 0) {
      return '00:00';
    }
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockTimer) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(process.env.REACT_APP_API_URL || 'http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Sauvegarder le token et les infos utilisateur
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        if (response.status === 429) {
          const lockUntil = data.lockUntil || Date.now() + 15 * 60 * 1000;
          setLockTimer({ lockedUntil: lockUntil, remainingMs: lockUntil - Date.now() });
          setError('');
        } else {
          setError(data.error || 'Erreur de connexion');
        }
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      // Login error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {lockTimer && lockTimer.remainingMs > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="solid-card max-w-xs w-full mx-auto p-6 text-center space-y-4 animate-fadeIn shadow-2xl">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 via-purple-500 to-primary-500 shadow-lg shadow-red-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Connexion temporairement verrouillée</h2>
              <p className="text-sm dark:text-gray-300 text-gray-600">
                Trop de tentatives infructueuses ont été détectées. Veuillez patienter avant de réessayer.
              </p>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest dark:text-gray-400 text-gray-500">Temps restant</p>
              <div className="mt-2 text-4xl font-bold dark:text-white text-gray-900 tabular-nums">{formatRemainingTime(lockTimer.remainingMs)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg solid-effect hover:bg-white/10 dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group"
        title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-20 opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-20 opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-20 opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-auto">
        <div className="glass-card p-6 md:p-8 space-y-6">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 border border-primary-500/30">
                <img src="/ade.png" alt="ADE Logo" className="w-12 h-12 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                AquaConnect
              </h1>
              <p className="dark:text-gray-400 text-gray-600 mt-2 text-sm">Système de Gestion des Branchements</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium dark:text-gray-300 text-gray-700">
                Utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Identifiant utilisateur"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium dark:text-gray-300 text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 dark:text-gray-400 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center dark:text-gray-400 text-gray-500 dark:hover:text-white hover:text-gray-900 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.984 9.984 0 015.698-2.611m-5.698 2.611L12 12m-5.71-5.71L12 12m0 0l3.29 3.29M12 12l3.29-3.29m0 0a9.984 9.984 0 012.611-5.698m-2.611 5.698L12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-300"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm dark:text-gray-400 text-gray-600 pt-4 border-t dark:border-white/10 border-gray-200/50">
            <p>© {new Date().getFullYear()} AquaConnect - Tous droits réservés</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;