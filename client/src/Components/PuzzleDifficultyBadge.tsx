import React from 'react';
import { Difficulty } from './types';

interface PuzzleDifficultyBadgeProps {
  difficulty: Difficulty;
}

const PuzzleDifficultyBadge: React.FC<PuzzleDifficultyBadgeProps> = ({ difficulty }) => {
  const difficultyConfig = {
    easy: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Easy'
    },
    medium: {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      label: 'Medium'
    },
    hard: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      label: 'Hard'
    }
  };

  const config = difficultyConfig[difficulty];

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      role="status"
      aria-label={`Difficulty: ${config.label}`}
    >
      {config.label}
    </span>
  );
};

export default PuzzleDifficultyBadge;
