import React from 'react';

export const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full h-screen bg-gray-800 text-white font-mono">{children}</div>;
};
