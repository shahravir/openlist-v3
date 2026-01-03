import { ReactNode } from 'react';
import { authService } from '../../services/auth';

interface AuthGuardProps {
  children: ReactNode;
  fallback: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  if (authService.isAuthenticated()) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}

