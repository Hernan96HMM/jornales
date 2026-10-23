'use client';
import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/session';

const Ctx = createContext<SessionUser | null>(null);

export function UserProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useUser(): SessionUser {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUser fuera de UserProvider');
  return u;
}
