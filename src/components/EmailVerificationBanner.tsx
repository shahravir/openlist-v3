import { useState } from 'react';
import { apiClient } from '../services/api';

interface EmailVerificationBannerProps {
  email: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError(null);
      await apiClient.resendVerification();
      setMessage('Verification email sent! Check your inbox.');
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send verification email');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Please verify your email address
            </p>
            <p className="text-sm text-blue-700 mt-1">
              We sent a verification link to <strong>{email}</strong>. Click the link to verify your account.
            </p>
            {message && (
              <p className="text-sm text-green-700 mt-2 font-medium">{message}</p>
            )}
            {error && (
              <p className="text-sm text-red-700 mt-2 font-medium">{error}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          aria-label="Resend verification email"
        >
          {isResending ? 'Sending...' : 'Resend Email'}
        </button>
      </div>
    </div>
  );
}
