import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { GmailStatus } from '../types';

interface GmailIntegrationProps {
  onStatusChange?: (status: GmailStatus) => void;
  onShowToast?: (message: string) => void;
}

export function GmailIntegration({ onStatusChange, onShowToast }: GmailIntegrationProps) {
  const [status, setStatus] = useState<GmailStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Gmail connection status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const gmailStatus = await apiClient.getGmailStatus();
      setStatus(gmailStatus);
      onStatusChange?.(gmailStatus);
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
      setError('Failed to load Gmail status');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OAuth connection
  const handleConnect = () => {
    try {
      const oauthUrl = apiClient.getGmailOAuthUrl();
      // Open OAuth in new window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        oauthUrl,
        'Gmail OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`
      );

      // Listen for OAuth completion message
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'gmail-oauth-success') {
          onShowToast?.('Gmail connected successfully');
          fetchStatus();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'gmail-oauth-error') {
          onShowToast?.('Failed to connect Gmail. Please try again.');
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('Failed to initiate Gmail OAuth:', err);
      onShowToast?.('Failed to open Gmail connection dialog');
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      await apiClient.disconnectGmail();
      setStatus({ connected: false });
      onStatusChange?.({ connected: false });
      onShowToast?.('Gmail disconnected successfully');
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
      setError('Failed to disconnect Gmail');
      onShowToast?.('Failed to disconnect Gmail. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        {/* Gmail Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
            <path
              d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
              fill="#EA4335"
            />
          </svg>
        </div>

        {/* Status Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900">Gmail</h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                status.connected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status.connected ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
              {status.connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {status.connected && status.email && (
            <p className="text-sm text-gray-600 truncate" title={status.email}>
              {status.email}
            </p>
          )}

          {!status.connected && (
            <p className="text-sm text-gray-600">
              Connect your Gmail account to sync emails with your todos
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-1" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!status.connected ? (
          <button
            onClick={handleConnect}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 touch-manipulation"
            aria-label="Connect Gmail account"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Connect Gmail</span>
          </button>
        ) : (
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={disconnecting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 touch-manipulation"
            aria-label="Disconnect Gmail account"
          >
            {disconnecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Disconnect</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
            onClick={() => !disconnecting && setShowConfirmDialog(false)}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-dialog-title"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3
                id="disconnect-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                Disconnect Gmail?
              </h3>
              
              <p className="text-sm text-gray-600">
                Are you sure you want to disconnect your Gmail account? You will need to reconnect to sync emails.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 touch-manipulation"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
