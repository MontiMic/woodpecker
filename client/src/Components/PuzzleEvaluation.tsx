import { EvaluationStatus } from "./types";

interface PuzzleEvaluationProps {
    isLoggedIn: boolean;
    selectedEvaluation: EvaluationStatus | null;
    onEvaluationChange: (evaluation: EvaluationStatus | null) => void;
}

export default function PuzzleEvaluation({
    isLoggedIn,
    selectedEvaluation,
    onEvaluationChange
}: PuzzleEvaluationProps) {
    const handleEvaluationSelect = (selectedValue: EvaluationStatus) => {
        onEvaluationChange(selectedValue);
    };

    if (!isLoggedIn) {
        return null;
    }

    const evaluations: { value: EvaluationStatus; label: string }[] = [
        { value: 'failed', label: 'Failed' },
        { value: 'partial', label: 'Partial' },
        { value: 'solved', label: 'Solved' }
    ];

    return (
        <div className="flex gap-2">
            {evaluations.map((option) => {
                const isSelected = selectedEvaluation === option.value;
                
                return (
                    <button
                        key={option.value}
                        onClick={() => handleEvaluationSelect(option.value)}
                        className={`flex-1 px-4 py-2 font-bold rounded-xl transition-all duration-200 
                                  shadow-md hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm
                                  border-b-4 ${isSelected 
                                    ? 'border-gray-800 scale-105 shadow-lg text-neutral-900' 
                                    : 'border-gray-700 hover:border-gray-800 text-neutral-300 hover:text-white'
                                  }
                                  hover:brightness-110 active:brightness-95 relative z-10`}
                        style={{ backgroundColor: 'var(--black-cell-color)' }}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}