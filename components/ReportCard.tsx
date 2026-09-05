import React from 'react';

interface ReportCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'danger' | 'success';
}

const ReportCard: React.FC<ReportCardProps> = ({ title, icon, children, className = '', variant = 'default' }) => {
  let borderClass = 'border-l-4 border-indigo-500';
  let headerClass = 'text-gray-800';

  if (variant === 'danger') {
    borderClass = 'border-l-4 border-red-500';
    headerClass = 'text-red-700';
  } else if (variant === 'success') {
    borderClass = 'border-l-4 border-green-500';
    headerClass = 'text-green-700';
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${borderClass} ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h3 className={`font-bold text-lg uppercase tracking-wider ${headerClass}`}>{title}</h3>
      </div>
      <div className="text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
};

export default ReportCard;