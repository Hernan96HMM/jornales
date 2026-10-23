'use client';
import { useState } from 'react';
import { useUser } from '@/components/UserContext';
import type { Rol } from '@/lib/session';

type Step = { ico: string; titulo: string; roles?: Rol[]; cuerpo: React.ReactNode };

const STEPS: Step[] = [
  {
    ico: '👋', titulo: 'Bienvenido/a',
    cuerpo: (<>
      <p>Esta aplicación gestiona la <b>nómina de jornales</b>, las <b>recategorizaciones</b>, los <b>incrementos de adicionales</b> y el <b>historial</b> de cada empleado.</p>
      <p>Usá el <b>menú lateral</b> para moverte entre secciones. Este tutorial te muestra, paso a paso, cómo usar cada una.</p>
    </>),
  },
  {
    ico: '👥', titulo: 'Nómina',
    cuerpo: (<>
      <p>Es el listado del personal con su <b>valor hora</b> calculado.</p>
      <ul>
        <li>Usá los <b>filtros</b> (buscar, encargado, departamento, categoría, estado).</li>
        <li>Con <b>Modo valor hora</b> elegís mostrarlo con o sin incentivo y presentismo.</li>
        <li>Hacé clic en el <b>▸</b> (o en el Valor Hora) para ver la <b>composición</b> del jornal: básico, ST ACC, ST Adic, incentivo, presentismo, antigüedad.</li>
      </ul>
    </>),
  },
  {
    ico: '↑', titulo: 'Recategorizar e Incrementar', roles: ['admin', 'rrhh'],
    cuerpo: (<>
      <p>En cada empleado tenés dos acciones directas:</p>
      <ul>
        <li><b>↑ Categoría</b>: cambia la categoría (y el básico). Queda en el historial con el % de aumento.</li>
        <li><b>＋ Adicional</b>: modifica el ST Adic. Queda registrado con importe anterior → nuevo.</li>
      </ul>
      <p>Cada cambio se guarda con los valores <b>congelados del momento</b>: no se altera si después sube el básico del gremio.</p>
    </>),
  },
  {
    ico: '📝', titulo: 'Solicitar un cambio',
    cuerpo: (<>
      <p>Con <b>📝 Solicitar</b> (en la Nómina) creás una <b>solicitud formal</b> de modificación:</p>
      <ul>
        <li>Marcás el <b>motivo</b> (nuevas responsabilidades, nuevo puesto, tarea superior).</li>
        <li>Escribís el <b>detalle / por qué</b> del cambio.</li>
        <li>Proponés una <b>nueva categoría</b> y/o un <b>nuevo adicional</b>.</li>
      </ul>
      <p>La solicitud pasa a <b>doble validación</b> antes de aplicarse.</p>
    </>),
  },
  {
    ico: '✓', titulo: 'Validar solicitudes', roles: ['admin', 'rrhh', 'gerencia'],
    cuerpo: (<>
      <p>En <b>Solicitudes</b> se controla el flujo:</p>
      <ul>
        <li>Validan <b>RR.HH.</b> y <b>Gerencia de Producción</b>.</li>
        <li>Cuando <b>ambos aprueban</b>, el cambio <b>se aplica solo</b> y queda en el historial.</li>
        <li>Con <b>🖨 Ver / PDF</b> abrís el documento imprimible (formulario SICA con las firmas).</li>
      </ul>
    </>),
  },
  {
    ico: '📄', titulo: 'Informe por Encargado', roles: ['admin', 'rrhh', 'gerencia'],
    cuerpo: (<>
      <p>Elegí un <b>encargado</b> y vas a ver, en modo lectura, cómo está <b>categorizada su gente</b>.</p>
      <p>Con <b>🖨 Imprimir / Guardar PDF</b> obtenés el informe para revisarlo o entregarlo.</p>
    </>),
  },
  {
    ico: '🗂️', titulo: 'Historial por empleado',
    cuerpo: (<>
      <p>El botón <b>Historial</b> (en cada empleado) muestra todos sus cambios anteriores.</p>
      <p>Los <b>porcentajes e importes quedan congelados</b> a la fecha de cada cambio: una suba general de básicos <b>no</b> los modifica.</p>
    </>),
  },
  {
    ico: '🏷️', titulo: 'Categorías (escala del gremio)', roles: ['admin', 'rrhh'],
    cuerpo: (<>
      <p>Cuando el gremio actualiza los valores, cargá el <b>nuevo básico</b> de cada categoría acá.</p>
      <p>Afecta el valor hora de todos, pero <b>no altera</b> los incrementos individuales ya registrados. Cada cambio queda en su propio historial.</p>
    </>),
  },
  {
    ico: '📊', titulo: 'Análisis de equidad', roles: ['admin'],
    cuerpo: (<p>Muestra la <b>dispersión del ST Adic</b> por categoría, desvíos y una propuesta de nivelación. Sirve para revisar la equidad interna.</p>),
  },
  {
    ico: '🔑', titulo: 'Usuarios y roles', roles: ['admin'],
    cuerpo: (<>
      <p>Creá usuarios y asigná su rol:</p>
      <ul>
        <li><b>Admin</b>: acceso total.</li>
        <li><b>RRHH</b>: nómina, categorías y validación de RR.HH.</li>
        <li><b>Gerencia</b>: validación de Producción e informes.</li>
      </ul>
      <p>Recordá <b>cambiar la contraseña</b> inicial del administrador.</p>
    </>),
  },
  {
    ico: '✅', titulo: '¡Listo!',
    cuerpo: (<p>Ya conocés las secciones principales. Podés volver a abrir este tutorial cuando quieras con el botón <b>❓ Ayuda</b>, abajo a la derecha.</p>),
  },
];

export default function Help() {
  const user = useUser();
  const steps = STEPS.filter((s) => !s.roles || s.roles.includes(user.rol));
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const total = steps.length;
  const step = steps[Math.min(i, total - 1)];

  function abrir() { setI(0); setOpen(true); }

  return (
    <>
      <button className="help-fab" onClick={abrir} title="Ayuda / Tutorial">❓ Ayuda</button>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
            <h3><span style={{ fontSize: 18, marginRight: 8 }}>{step.ico}</span>{step.titulo}
              <span style={{ float: 'right', fontSize: 12, fontWeight: 400, opacity: .85 }}>Paso {i + 1} de {total}</span>
            </h3>
            <div className="body help-body">{step.cuerpo}</div>
            <div className="help-dots">
              {steps.map((_, k) => <span key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}
            </div>
            <div className="foot">
              <button onClick={() => setOpen(false)}>Cerrar</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>← Anterior</button>
              {i < total - 1
                ? <button className="btn-primary" onClick={() => setI((v) => Math.min(total - 1, v + 1))}>Siguiente →</button>
                : <button className="btn-ok" onClick={() => setOpen(false)}>Entendido</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
