import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recategorización de Jornales — SICA',
  description: 'Gestión de jornales, recategorizaciones e historial — RRHH SICA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
