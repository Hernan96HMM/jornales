import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getSecretKey } from './secret';

export const SESSION_COOKIE = 'rj_session';
export type Rol = 'admin' | 'rrhh';
export type SessionUser = { id: number; email: string; nombre: string; rol: Rol };

export async function signToken(u: SessionUser): Promise<string> {
  return new SignJWT({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      id: Number(payload.id),
      email: String(payload.email),
      nombre: String(payload.nombre),
      rol: payload.rol === 'admin' ? 'admin' : 'rrhh',
    };
  } catch {
    return null;
  }
}

export async function createSession(u: SessionUser): Promise<void> {
  const token = await signToken(u);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 60 * 60 * 12,
  });
}

export function destroySession(): void {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
