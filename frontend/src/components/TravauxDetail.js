import React, { useState, useEffect, useCallback } from 'react';
import { getTravauxHistorique } from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

const TravauxDetail = ({ travail, onBack }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistorique = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTravauxHistorique(travail.IdOrdre);
      setHistorique(data);
    } catch (error) {
      // Error loading history
    } finally {
      setLoading(false);
    }
  }, [travail.IdOrdre]);

  useEffect(() => {
    loadHistorique();
  }, [loadHistorique]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (codeStatut) => {
    const colors = {
      'EMIS': 'bg-blue-500',
      'EN_COURS': 'bg-yellow-500',
      'TERMINE': 'bg-green-500',
      'ANNULE': 'bg-red-500',
    };
    return colors[codeStatut] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 rounded-lg solid-effect hover:bg-gray-100 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à la liste
        </button>

        {/* Header */}
        <div className="solid-card mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gradient">
                {travail.NumeroOrdre}
              </h1>
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(travail.CodeStatut)} text-white flex items-center gap-1`}>
                <svg className="w-2 h-2 fill-current" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="4"/>
                </svg>
                {travail.Statut}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Client</p>
              <p className="dark:text-white text-gray-900 font-semibold">{travail.Client}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Téléphone</p>
              <p className="dark:text-white text-gray-900 font-semibold">{travail.TelephoneClient || 'N/A'}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Numéro de demande</p>
              <p className="dark:text-white text-gray-900 font-semibold">{travail.NumeroDemande}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Numéro de devis</p>
              <p className="dark:text-white text-gray-900 font-semibold">{travail.NumeroDevis}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Date d'émission</p>
              <p className="dark:text-white text-gray-900 font-semibold">{formatDate(travail.DateEmission)}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Date de début</p>
              <p className="dark:text-white text-gray-900 font-semibold">{formatDate(travail.DateDebutExecution)}</p>
            </div>
            <div>
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Date de fin</p>
              <p className="dark:text-white text-gray-900 font-semibold">{formatDate(travail.DateFinExecution)}</p>
            </div>
            {travail.MontantTotalTTC && (
              <div>
                <p className="dark:text-gray-400 text-gray-600 text-sm mb-1">Montant TTC</p>
                <p className="text-2xl font-bold text-gradient">
                  {parseFloat(travail.MontantTotalTTC).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </p>
              </div>
            )}
          </div>

          {travail.Instructions && (
            <div className="mt-6 pt-6 border-t dark:border-slate-600 border-gray-200">
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-2">Instructions</p>
              <p className="dark:text-white text-gray-900">{travail.Instructions}</p>
            </div>
          )}

          {travail.Commentaire && (
            <div className="mt-4">
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-2">Commentaire</p>
              <p className="dark:text-white text-gray-900">{travail.Commentaire}</p>
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="solid-card">
          <h2 className="text-2xl font-bold mb-6 text-gradient">
            Historique
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : historique.length === 0 ? (
            <p className="dark:text-gray-400 text-gray-600 text-center py-8">Aucun historique disponible</p>
          ) : (
            <div className="space-y-4">
              {historique.map((item, index) => (
                <div key={item.IdHistorique} className="border-l-4 border-primary-600 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="dark:text-white text-gray-900 font-semibold">{item.TypeAction}</p>
                      <p className="dark:text-gray-400 text-gray-600 text-sm">
                        {item.StatutPrecedent && `${item.StatutPrecedent} → `}
                        {item.StatutNouveau}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="dark:text-gray-400 text-gray-600 text-sm">{formatDate(item.DateAction)}</p>
                      <p className="dark:text-gray-500 text-gray-500 text-xs">{item.Utilisateur}</p>
                    </div>
                  </div>
                  {item.Commentaire && (
                    <p className="dark:text-gray-300 text-gray-700 text-sm mt-2">{item.Commentaire}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravauxDetail;