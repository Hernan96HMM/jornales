import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

/* ===== Usuarios y roles ===== */
export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol', { enum: ['admin', 'rrhh', 'supervisor', 'gerencia'] }).notNull().default('rrhh'),
  // para rol 'supervisor': nombre tal como figura en la columna Supervisor del Excel (ve solo esa gente)
  supervisorRef: text('supervisor_ref'),
  activo: integer('activo').notNull().default(1),
  creado: text('creado').notNull(),
});

/* ===== Parámetros del jornal (editables: %) ===== */
export const parametros = sqliteTable('parametros', {
  clave: text('clave').primaryKey(), // stAcc, incentivo, presentismo, aCuenta
  valor: real('valor').notNull(),
  etiqueta: text('etiqueta').notNull().default(''),
});

/* ===== Categorías (la escala categoría -> básico; editable por el gremio) ===== */
export const categorias = sqliteTable('categorias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  basico: real('basico').notNull(),
  activo: integer('activo').notNull().default(1),
});

/* ===== Empleados (nómina) ===== */
export const empleados = sqliteTable('empleados', {
  leg: integer('leg').primaryKey(), // legajo
  nombre: text('nombre').notNull(),
  cuil: text('cuil').notNull().default(''),
  depto: text('depto').notNull().default(''),
  supervisor: text('supervisor').notNull().default(''),
  categoriaId: integer('categoria_id').references(() => categorias.id),
  stAdic: real('st_adic').notNull().default(0),
  antig: real('antig').notNull().default(0), // años (1%/año)
  ingreso: text('ingreso').notNull().default(''),
  activo: integer('activo').notNull().default(1),
  bajaFecha: text('baja_fecha'),
  bajaMotivo: text('baja_motivo'),
  creado: text('creado').notNull(),
  actualizado: text('actualizado').notNull(),
});

/* ===== Historial POR EMPLEADO (snapshots CONGELADOS) =====
   Cada registro guarda los valores vigentes AL MOMENTO del cambio.
   Una actualización general posterior de básicos NO modifica estos registros. */
export const historial = sqliteTable('historial', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoLeg: integer('empleado_leg').notNull().references(() => empleados.leg),
  fecha: text('fecha').notNull(), // ISO
  tipo: text('tipo', { enum: ['recategorizacion', 'incremento_adicional'] }).notNull(),
  // recategorización
  catAnterior: text('cat_anterior'),
  catNueva: text('cat_nueva'),
  basicoAnterior: real('basico_anterior'),
  basicoNuevo: real('basico_nuevo'),
  // incremento de adicional
  adicionalNombre: text('adicional_nombre'),
  importeAnterior: real('importe_anterior'),
  importeNuevo: real('importe_nuevo'),
  // común (congelado)
  pct: real('pct'),
  valorHoraAnterior: real('valor_hora_anterior'),
  valorHoraNuevo: real('valor_hora_nuevo'),
  usuarioId: integer('usuario_id'),
  usuarioNombre: text('usuario_nombre'),
  nota: text('nota'),
});

/* ===== Historial de cambios de la ESCALA (gremio) — separado de los individuales ===== */
export const categoriaHistorial = sqliteTable('categoria_historial', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoriaId: integer('categoria_id').notNull(),
  nombre: text('nombre').notNull(),
  fecha: text('fecha').notNull(),
  basicoAnterior: real('basico_anterior').notNull(),
  basicoNuevo: real('basico_nuevo').notNull(),
  pct: real('pct').notNull(),
  usuarioId: integer('usuario_id'),
  usuarioNombre: text('usuario_nombre'),
  nota: text('nota'),
});

/* ===== Propuestas (staging pendiente/aprobado/rechazado/aplicado) ===== */
export const propuestas = sqliteTable('propuestas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  empleadoLeg: integer('empleado_leg').notNull().references(() => empleados.leg),
  tipo: text('tipo', { enum: ['recategorizacion', 'incremento_adicional'] }).notNull(),
  categoriaPropuestaId: integer('categoria_propuesta_id'),
  adicPropuesto: real('adic_propuesto'),
  estado: text('estado', { enum: ['pendiente', 'aprobado', 'rechazado', 'aplicado'] }).notNull().default('pendiente'),
  nota: text('nota'),
  usuarioId: integer('usuario_id'),
  usuarioNombre: text('usuario_nombre'),
  creado: text('creado').notNull(),
  actualizado: text('actualizado').notNull(),
});

/* ===== Solicitudes de modificación (flujo supervisor → RRHH + Gerencia) ===== */
export const solicitudes = sqliteTable('solicitudes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero').notNull(),          // ej: SICA 05.26-001
  periodo: text('periodo').notNull(),         // ej: Mayo 2026
  empleadoLeg: integer('empleado_leg').notNull(),
  empleadoNombre: text('empleado_nombre').notNull(),
  tipo: text('tipo', { enum: ['recategorizacion', 'incremento_adicional', 'ambos'] }).notNull(),
  // motivo (checkboxes del formulario)
  motivoNuevasResp: integer('motivo_nuevas_resp').notNull().default(0),
  motivoNuevoPuesto: integer('motivo_nuevo_puesto').notNull().default(0),
  motivoTareaSuperior: integer('motivo_tarea_superior').notNull().default(0),
  detalle: text('detalle').notNull().default(''),   // "breve detalle de cuál/es" (el por qué)
  // snapshot al momento de la solicitud
  categoriaActualId: integer('categoria_actual_id'),
  categoriaActualNombre: text('categoria_actual_nombre'),
  basicoActual: real('basico_actual'),
  categoriaPropuestaId: integer('categoria_propuesta_id'),
  categoriaPropuestaNombre: text('categoria_propuesta_nombre'),
  basicoPropuesto: real('basico_propuesto'),
  adicActual: real('adic_actual'),
  adicPropuesto: real('adic_propuesto'),
  // doble validación
  estado: text('estado', { enum: ['pendiente', 'rechazada', 'aprobada', 'aplicada'] }).notNull().default('pendiente'),
  rrhhEstado: text('rrhh_estado', { enum: ['pendiente', 'aprobado', 'rechazado'] }).notNull().default('pendiente'),
  rrhhUsuario: text('rrhh_usuario'), rrhhFecha: text('rrhh_fecha'), rrhhNota: text('rrhh_nota'),
  gerenciaEstado: text('gerencia_estado', { enum: ['pendiente', 'aprobado', 'rechazado'] }).notNull().default('pendiente'),
  gerenciaUsuario: text('gerencia_usuario'), gerenciaFecha: text('gerencia_fecha'), gerenciaNota: text('gerencia_nota'),
  // origen y cierre
  creadoPorId: integer('creado_por_id'),
  creadoPorNombre: text('creado_por_nombre'),
  supervisorNombre: text('supervisor_nombre'),
  historialId: integer('historial_id'),      // link al registro de historial cuando se aplica
  creado: text('creado').notNull(),
  actualizado: text('actualizado').notNull(),
});

export type Empleado = typeof empleados.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type Historial = typeof historial.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Propuesta = typeof propuestas.$inferSelect;
export type Solicitud = typeof solicitudes.$inferSelect;
