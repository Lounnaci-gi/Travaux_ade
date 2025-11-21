import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

const TravauxCard = ({ travail, onClick }) => {
  const getStatusColor = (codeStatut) => {
    const colors = {
      'EMIS': 'bg-primary-600',
      'EN_COURS': 'bg-warning',
      'TERMINE': 'bg-success',
      'ANNULE': 'bg-error',
    };
    return colors[codeStatut] || 'bg-secondary-600';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: fr });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div
      onClick={onClick}
      className="solid-card cursor-pointer transform transition-all duration-300 hover:-translate-y-1 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold dark:text-white text-gray-900 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {travail.NumeroOrdre}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(travail.CodeStatut)} text-white`}>
              {travail.Statut}
            </span>
          </div>
          <p className="dark:text-gray-300 text-gray-700 text-sm mb-1">
            <span className="font-semibold">Client:</span> {travail.Client}
          </p>
          <p className="dark:text-gray-400 text-gray-600 text-xs">
            <span className="font-semibold">Téléphone:</span> {travail.TelephoneClient || 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-slate-600 border-gray-200">
        <div>
          <p className="text-xs dark:text-gray-400 text-gray-600 mb-1">Date d'émission</p>
          <p className="text-sm font-semibold dark:text-white text-gray-900">{formatDate(travail.DateEmission)}</p>
        </div>
        <div>
          <p className="text-xs dark:text-gray-400 text-gray-600 mb-1">Date début</p>
          <p className="text-sm font-semibold dark:text-white text-gray-900">{formatDate(travail.DateDebutExecution)}</p>
        </div>
        {travail.MontantTotalTTC && (
          <div className="col-span-2">
            <p className="text-xs dark:text-gray-400 text-gray-600 mb-1">Montant TTC</p>
            <p className="text-lg font-bold text-gradient">
              {parseFloat(travail.MontantTotalTTC).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </p>
          </div>
        )}
      </div>

      {travail.Commentaire && (
        <div className="mt-4 pt-4 border-t dark:border-slate-600 border-gray-200">
          <p className="text-xs dark:text-gray-400 text-gray-600 mb-1">Commentaire</p>
          <p className="text-sm dark:text-gray-300 text-gray-700 line-clamp-2">{travail.Commentaire}</p>
        </div>
      )}
    </div>
  );
};

export default TravauxCard;