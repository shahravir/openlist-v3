import { SyncStatus as SyncStatusType } from '../types';

interface SyncStatusProps {
  status: SyncStatusType;
}

export function SyncStatus({ status }: SyncStatusProps) {
  // Offline state - show offline icon
  if (!status.isOnline) {
    return (
      <div 
        className="flex items-center gap-1.5 text-amber-600" 
        title={`Offline${status.pendingChanges > 0 ? ` - ${status.pendingChanges} pending` : ''}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        {status.pendingChanges > 0 && (
          <span className="text-xs">({status.pendingChanges})</span>
        )}
        <span className="sr-only">Offline{status.pendingChanges > 0 ? ` - ${status.pendingChanges} pending changes` : ''}</span>
      </div>
    );
  }

  // Syncing state - show spinning sync icon
  if (status.isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-primary-600" title="Syncing...">
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">Syncing</span>
      </div>
    );
  }

  // Error state - show error icon with message on hover
  if (status.error) {
    return (
      <div className="flex items-center gap-1.5 text-red-600" title={`Sync error: ${status.error}`}>
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="sr-only">Sync error: {status.error}</span>
      </div>
    );
  }

  // Pending changes - show clock icon
  if (status.pendingChanges > 0) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500" title={`${status.pendingChanges} pending changes`}>
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs">({status.pendingChanges})</span>
        <span className="sr-only">{status.pendingChanges} pending changes</span>
      </div>
    );
  }

  // Synced state - show WhatsApp-style double check marks
  if (status.lastSyncTime) {
    const timeSinceSync = Math.floor((Date.now() - status.lastSyncTime) / 1000);
    const minutesAgo = Math.floor(timeSinceSync / 60);
    const timeText = minutesAgo < 1 ? 'Just synced' : `Synced ${minutesAgo}m ago`;
    
    return (
      <div className="flex items-center gap-0.5 text-green-600" title={timeText}>
        {/* WhatsApp-style double check mark */}
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <svg
          className="w-4 h-4 -ml-2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <span className="sr-only">{timeText}</span>
      </div>
    );
  }

  return null;
}

