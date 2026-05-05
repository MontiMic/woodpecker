import { useState } from 'react';
import { loginUser, registerUser } from './utils/apiUtils';
import { getBurnoutSession } from './utils/burnoutApi';

interface LoginPageProps {
    onBack: () => void;
    onLoginSuccess: (username: string, options?: { redirectToPuzzleId?: number }) => void;
}

type FormMode = 'login' | 'register';

export default function LoginPage({ onBack, onLoginSuccess }: LoginPageProps) {
    const [mode, setMode] = useState<FormMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Basic validation
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }
        
        if (mode === 'register') {
            // Registration validation
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            
            if (password.length < 6) {
                setError('Password must be at least 6 characters long');
                return;
            }
            
            setIsLoading(true);
            
            try {
                const result = await registerUser(username.trim(), password);
                
                if (result.success && result.username) {
                    console.log('Registration successful, token stored');
                    onLoginSuccess(result.username);
                    onBack();
                } else {
                    setError(result.error || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                setError('Network error. Please check if the server is running.');
            } finally {
                setIsLoading(false);
            }
            
            return;
        }
        
        setIsLoading(true);

        try {
            const result = await loginUser(username.trim(), password.trim());

            if (result.success && result.username) {
                console.log('Login successful, token stored');

                let redirectToPuzzleId: number | undefined;

                try {
                    const sessionResult = await getBurnoutSession();
                    const session = sessionResult.success ? sessionResult.session : undefined;

                    if (session?.isActive && session.puzzlePool.length > 0) {
                        const currentPuzzleId = session.puzzlePool[session.currentPuzzleIndex];

                        if (
                            Number.isInteger(session.currentPuzzleIndex) &&
                            session.currentPuzzleIndex >= 0 &&
                            session.currentPuzzleIndex < session.puzzlePool.length &&
                            typeof currentPuzzleId === 'number'
                        ) {
                            redirectToPuzzleId = currentPuzzleId;
                        }
                    }
                } catch (burnoutError) {
                    console.error('Burnout session resume check failed:', burnoutError);
                }

                onLoginSuccess(result.username, { redirectToPuzzleId });
                onBack();
            } else {
                setError(result.error || 'Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error. Please check if the server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
    };

    const toggleMode = () => {
        const newMode = mode === 'login' ? 'register' : 'login';
        setMode(newMode);
        resetForm();
    };

    return (
        <div className="min-h-screen bg-black-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <button 
                    onClick={onBack}
                    className="mb-6 text-neutral-300 hover:text-white font-medium transition-colors duration-200
                              flex items-center gap-2 hover:gap-3"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Puzzle
                </button>
                
                <div 
                    className="rounded-2xl p-8 shadow-2xl border-2 border-white/10"
                    style={{ backgroundColor: 'var(--white-cell-color)' }}
                >
                    <h1 className="text-3xl font-bold text-neutral-800 text-center mb-2">
                        {mode === 'login' ? 'Login' : 'Register'}
                    </h1>
                    
                    <p className="text-neutral-600 text-center mb-6">
                        {mode === 'login' 
                            ? 'Login to save your puzzle progress'
                            : 'Create a new account to save your progress'}
                    </p>
                    
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username" className="block text-neutral-700 font-medium mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/90 border border-white/20 text-neutral-800 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                         transition-all duration-200"
                                placeholder="Enter your username"
                                disabled={isLoading}
                                required
                                autoComplete="username"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="password" className="block text-neutral-700 font-medium mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/90 border border-white/20 text-neutral-800 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                         transition-all duration-200"
                                placeholder={mode === 'login' ? 'Enter your password' : 'Choose a password'}
                                disabled={isLoading}
                                required
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                        </div>
                        
                        {mode === 'register' && (
                            <div>
                                <label htmlFor="confirmPassword" className="block text-neutral-700 font-medium mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/90 border border-white/20 text-neutral-800 
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                             transition-all duration-200"
                                    placeholder="Confirm your password"
                                    disabled={isLoading}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        )}
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-4 text-black font-bold rounded-xl transition-all duration-200 
                                      shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] active:shadow-md
                                      border-b-4 border-gray-700 hover:border-gray-800
                                      hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--black-cell-color)' }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {mode === 'login' ? 'Authenticating...' : 'Creating account...'}
                                </span>
                            ) : mode === 'login' ? 'Login' : 'Register'}
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={toggleMode}
                                className="text-neutral-600 hover:text-neutral-800 font-medium transition-colors duration-200"
                            >
                                {mode === 'login' 
                                    ? "Don't have an account? Register here" 
                                    : 'Already have an account? Login here'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}