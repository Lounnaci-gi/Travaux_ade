import React, { useState, useEffect } from 'react';
import { getTravauxHistorique } from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

const TravauxDetail = ({ travail, onBack }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorique();
  }, [travail.IdOrdre]);

  const loadHistorique = async () => {
    try {
      setLoading(true);
      const data = await getTravauxHistorique(travail.IdOrdre);
      setHistorique(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoading(false);
    }
  };

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
          className="mb-6 px-4 py-2 rounded-lg glass-effect hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à la liste
        </button>

        {/* Header */}
        <div className="glass-card p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {travail.NumeroOrdre}
              </h1>
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(travail.CodeStatut)} text-white`}>
                {travail.Statut}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Client</p>
              <p className="text-white font-semibold">{travail.Client}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Téléphone</p>
              <p className="text-white font-semibold">{travail.TelephoneClient || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Numéro de demande</p>
              <p className="text-white font-semibold">{travail.NumeroDemande}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Numéro de devis</p>
              <p className="text-white font-semibold">{travail.NumeroDevis}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Date d'émission</p>
              <p className="text-white font-semibold">{formatDate(travail.DateEmission)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Date de début</p>
              <p className="text-white font-semibold">{formatDate(travail.DateDebutExecution)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Date de fin</p>
              <p className="text-white font-semibold">{formatDate(travail.DateFinExecution)}</p>
            </div>
            {travail.MontantTotalTTC && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Montant TTC</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {parseFloat(travail.MontantTotalTTC).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </p>
              </div>
            )}
          </div>

          {travail.Instructions && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-2">Instructions</p>
              <p className="text-white">{travail.Instructions}</p>
            </div>
          )}

          {travail.Commentaire && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Commentaire</p>
              <p className="text-white">{travail.Commentaire}</p>
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Historique
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : historique.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun historique disponible</p>
          ) : (
            <div className="space-y-4">
              {historique.map((item, index) => (
                <div key={item.IdHistorique} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold">{item.TypeAction}</p>
                      <p className="text-gray-400 text-sm">
                        {item.StatutPrecedent && `${item.StatutPrecedent} → `}
                        {item.StatutNouveau}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">{formatDate(item.DateAction)}</p>
                      <p className="text-gray-500 text-xs">{item.Utilisateur}</p>
                    </div>
                  </div>
                  {item.Commentaire && (
                    <p className="text-gray-300 text-sm mt-2">{item.Commentaire}</p>
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

