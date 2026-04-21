import React from 'react';
import { EvaluationStatus } from './types';

interface PuzzleStatusBadgeProps {
  status: EvaluationStatus | null;
}

const PuzzleStatusBadge: React.FC<PuzzleStatusBadgeProps> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
        <svg className="h-3 w-3 text-neutral-500" fill="currentColor" viewBox="0 0 8 8">
          <circle cx="4" cy="4" r="3" />
        </svg>
        Not Started
      </span>
    );
  }

  const statusConfig = {
    solved: {
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-500',
      label: 'Completed',
      icon: (
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    },
    partial: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      label: 'In Progress',
      icon: (
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
      )
    },
    failed: {
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-500',
      label: 'Failed',
      icon: (
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
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