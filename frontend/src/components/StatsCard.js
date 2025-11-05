import React from 'react';

const StatsCard = ({ title, value, icon, color, delay = 0 }) => {
  return (
    <div
      className="glass-card p-6 transform transition-all duration-500 hover:scale-105 hover:-translate-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20 backdrop-blur-sm`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {value}
          </p>
          <p className="dark:text-gray-300 text-gray-700 text-sm mt-1">{title}</p>
        </div>
      </div>
      <div className="h-1 w-full dark:bg-gray-700 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} animate-pulse`}
          style={{ width: '100%' }}
        ></div>
      </div>
    </div>
  );
};

export default StatsCard;

