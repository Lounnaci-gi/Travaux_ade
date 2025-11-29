import React from 'react';

const StatsCard = ({ title, value, icon, color, delay = 0 }) => {
  // Determine card type based on color
  const getCardClass = () => {
    if (color.includes('primary')) return 'obat-card-primary';
    if (color.includes('green')) return 'obat-card-success';
    if (color.includes('yellow')) return 'obat-card-warning';
    if (color.includes('purple')) return 'obat-card';
    if (color.includes('red')) return 'obat-card-error';
    return 'obat-card';
  };
  
  return (
    <div
      className={`${getCardClass()} hover-lift hover-shadow transition-all duration-300 transform hover:-translate-y-1`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gradient">
            {value}
          </p>
          <p className="dark:text-gray-300 text-gray-700 text-sm mt-1">{title}</p>
        </div>
      </div>
      <div className="h-1 w-full dark:bg-gray-700 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color}`}
          style={{ width: '100%' }}
        ></div>
      </div>
    </div>
  );
};

export default StatsCard;