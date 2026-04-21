import React from 'react';
import { EvaluationStatus } from './types';

interface PuzzleStatusBadgeProps {
  status: EvaluationStatus | null;
}

const PuzzleStatusBadge: React.FC<PuzzleStatusBadgeProps> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <svg className="mr-1.5 h-2 w-2 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
          <circle cx="4" cy="4" r="3" />
        </svg>
        Unattempted
      </span>
    );
  }

  const statusConfig = {
    solved: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-400',
      label: 'Solved',
      icon: (
        <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    },
    partial: {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-400',
      label: 'Partial',
      icon: (
        <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
      )
    },
    failed: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      iconColor: 'text-red-400',
      label: 'Failed',
      icon: (
        <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const config = statusConfig[status];

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span className={config.iconColor}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
};

export default PuzzleStatusBadge;