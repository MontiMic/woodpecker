import React from 'react';
import { Difficulty } from './types';

interface PuzzleDifficultyBadgeProps {
  difficulty: Difficulty;
}

const PuzzleDifficultyBadge: React.FC<PuzzleDifficultyBadgeProps> = ({ difficulty }) => {
  const difficultyConfig = {
    easy: {
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      dotColor: 'bg-emerald-400',
      label: 'Easy'
    },
    medium: {
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      dotColor: 'bg-amber-400',
      label: 'Medium'
    },
    hard: {
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      dotColor: 'bg-rose-400',
      label: 'Hard'
    }
  };

  const config = difficultyConfig[difficulty];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      role="status"
      aria-label={`Difficulty: ${config.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  );
};

export default PuzzleDifficultyBadge;
