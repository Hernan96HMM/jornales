CREATE TABLE `categoria_historial` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`fecha` text NOT NULL,
	`basico_anterior` real NOT NULL,
	`basico_nuevo` real NOT NULL,
	`pct` real NOT NULL,
	`usuario_id` integer,
	`usuario_nombre` text,
	`nota` text
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`basico` real NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`);--> statement-breakpoint
CREATE TABLE `empleados` (
	`leg` integer PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`cuil` text DEFAULT '' NOT NULL,
	`depto` text DEFAULT '' NOT NULL,
	`supervisor` text DEFAULT '' NOT NULL,
	`categoria_id` integer,
	`st_adic` real DEFAULT 0 NOT NULL,
	`antig` real DEFAULT 0 NOT NULL,
	`ingreso` text DEFAULT '' NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`baja_fecha` text,
	`baja_motivo` text,
	`creado` text NOT NULL,
	`actualizado` text NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `historial` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleado_leg` integer NOT NULL,
	`fecha` text NOT NULL,
	`tipo` text NOT NULL,
	`cat_anterior` text,
	`cat_nueva` text,
	`basico_anterior` real,
	`basico_nuevo` real,
	`adicional_nombre` text,
	`importe_anterior` real,
	`importe_nuevo` real,
	`pct` real,
	`valor_hora_anterior` real,
	`valor_hora_nuevo` real,
	`usuario_id` integer,
	`usuario_nombre` text,
	`nota` text,
	FOREIGN KEY (`empleado_leg`) REFERENCES `empleados`(`leg`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `parametros` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` real NOT NULL,
	`etiqueta` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `propuestas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleado_leg` integer NOT NULL,
	`tipo` text NOT NULL,
	`categoria_propuesta_id` integer,
	`adic_propuesto` real,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`nota` text,
	`usuario_id` integer,
	`usuario_nombre` text,
	`creado` text NOT NULL,
	`actualizado` text NOT NULL,
	FOREIGN KEY (`empleado_leg`) REFERENCES `empleados`(`leg`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`nombre` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text DEFAULT 'rrhh' NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`creado` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);