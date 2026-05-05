import { useState, useEffect } from 'react';

interface BurnoutTimerProps {
    endTime: string;
    onExpire?: () => void;
}

export default function BurnoutTimer({ endTime, onExpire }: BurnoutTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);
    const [isLowTime, setIsLowTime] = useState(false);

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                setIsExpired(true);
                if (onExpire) {
                    onExpire();
                }
                return;
            }

            // Calculate time units
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // Format the time string
            const parts: string[] = [];
            if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
            if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
            if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

            setTimeRemaining(parts.join(', ') + ' remaining');

            // Check if time is running low (less than 24 hours)
            const hoursRemaining = diff / (1000 * 60 * 60);
            setIsLowTime(hoursRemaining < 24);
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every minute
        const interval = setInterval(calculateTimeRemaining, 60000);

        return () => clearInterval(interval);
    }, [endTime, onExpire]);

    return (
        <div className="flex items-center gap-2">
            <svg
                className={`w-5 h-5 ${isExpired ? 'text-red-500' : isLowTime ? 'text-yellow-500' : 'text-green-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <span className={`font-medium ${isExpired ? 'text-red-500' : isLowTime ? 'text-yellow-500' : 'text-neutral-700'}`}>
                {timeRemaining}
            </span>
        </div>
    );
}

// Made with Bob
