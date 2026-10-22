/** Clave HS256 para firmar/verificar la cookie de sesión. En producción exige un secreto real. */
export function getSecretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  const invalido = !s || s.startsWith('CAMBIAR') || s.length < 32;
  if (invalido) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth] SESSION_SECRET no configurado o inseguro (mínimo 32 caracteres). Generar con: openssl rand -base64 48');
    }
    return new TextEncoder().encode('dev-insecure-secret-change-me');
  }
  return new TextEncoder().encode(s);
}
