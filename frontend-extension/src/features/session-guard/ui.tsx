/**
 * Session Guard Feature
 * Wrapper that listens for session revocation (Netflix model)
 */
import { type ReactNode, useEffect } from 'react';
import { useSessionGuard } from './model';

interface SessionGuardProps {
  children: ReactNode;
  onSessionRevoked?: () => void;
}

export function SessionGuard({ children, onSessionRevoked }: SessionGuardProps) {
  const { isSessionValid, checkSession } = useSessionGuard();

  useEffect(() => {
    // Check session periodically
    const interval = setInterval(checkSession, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [checkSession]);

  useEffect(() => {
    if (!isSessionValid && onSessionRevoked) {
      onSessionRevoked();
    }
  }, [isSessionValid, onSessionRevoked]);

  return <>{children}</>;
}
