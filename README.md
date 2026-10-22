# Recategorización de Jornales — SICA RRHH

App web (Next.js 14 standalone + SQLite) para gestionar la nómina de jornales, recategorizaciones, incrementos de adicionales e **historial congelado por empleado**, con login y roles (**Admin** / **RRHH**). Preparada para el servidor **SicaLab** siguiendo el estándar de Sistemas.

Subdominio destino: **`recategorizacion-jornales.sica`**

---

## Qué hace

- **Nómina**: listado con valor hora calculado, filtros (encargado/supervisor, departamento, categoría, estado), modo **con / sin incentivo y presentismo**, y detalle desplegable de la composición del valor hora.
- **ABM de empleados**: alta y baja **individual** (la baja es lógica: conserva el empleado y su historial), más **importación masiva** desde el Excel (`Detalle`).
- **Recategorización** e **incremento de ST Adic** por empleado, que quedan registrados en el historial.
- **Historial por empleado** (requisito clave): cada recategorización (categoría anterior → nueva + % congelado) e incremento (importe anterior → nuevo + % congelado) se guarda con los **valores vigentes al momento del cambio**. Una actualización general de básicos (gremio) **no altera** estos registros → el aumento individual nunca aparece en negativo por una suba general posterior.
- **Categorías**: edición de la escala categoría→básico (cada cambio del gremio queda registrado en su propio historial, separado de los individuales) y de los parámetros % del jornal.
- **Análisis de equidad** (solo Admin): dispersión del ST Adic, outliers, nivelación propuesta.
- **Usuarios y roles** (solo Admin): Admin (todo) y RRHH (nómina, categorías, historial).

Login propio por cookie de sesión (JWT HS256) + contraseñas con bcrypt.

---

## Estructura del repositorio

```
recategorizacion-jornales/
├── app/                     # código Next.js (se clona en /mnt/disco1/sicalab/recategorizacion-jornales/app/)
│   ├── Dockerfile           # multi-stage, imagen final sin toolchain
│   ├── .env.example         # variables (copiar a ../.env en el servidor)
│   ├── drizzle/             # migraciones SQL generadas
│   ├── scripts/             # migrate.mjs / seed.mjs
│   └── src/                 # app, api, db, lib, components
├── docker-compose.yml       # para PRUEBA LOCAL (standalone)
├── nginx/recategorizacion-jornales.conf   # bloque server de ejemplo
└── README.md
```

La persistencia vive en `data/` (bind mount `./data:/app/data`). La base es `data/recategorizacion-jornales.db` (SQLite, WAL). **La app migra y siembra sola en el primer arranque** (parámetros, categorías, 120 empleados y el usuario admin inicial).

---

## Checklist DEV (cumplido)

| # | Ítem | Estado |
|---|------|--------|
| 1 | Nombre kebab-case = subdominio | `recategorizacion-jornales` ✓ |
| 2 | `docker-compose.yml` con bloque de servicio | ✓ (+ bloque de producción abajo) |
| 3 | `Dockerfile` multi-stage, imagen final sin build tools | ✓ |
| 4 | `.env.example` con todas las variables, sin secretos | ✓ |
| 5 | Bind mount `./data:/app/data`, `DB_PATH` absoluta | ✓ |
| 6 | `npm run db:migrate:prod` sin interacción | ✓ (además auto-migra al arrancar) |
| 7 | Healthcheck `nc -z 127.0.0.1 3000` | ✓ |

El **ítem 8 (alta en el servidor)** lo hace el Administrador de Sistemas.

---

## Prueba local (donde haya Docker)

```bash
cd recategorizacion-jornales
cp app/.env.example app/.env     # completar SESSION_SECRET (openssl rand -base64 48)
mkdir -p data
docker compose up --build
# abrir http://localhost:3000  → login con ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD del .env
```

Sin Docker, para desarrollo:

```bash
cd app
npm install
cp .env.example .env            # DB_PATH=./data/recategorizacion-jornales.db para local
npm run build && npm start      # o: npm run dev
```

> Nota: esta app se construyó y verificó con `npm run build`. El test del **contenedor Docker** debe correrse donde haya Docker (servidor o máquina del admin): el contenedor arranca, auto-migra y auto-siembra.

---

## Pasos del Administrador de Sistemas (ítem 8)

1. **Carpetas**: `mkdir -p /mnt/disco1/sicalab/recategorizacion-jornales/data`
2. **Código**: clonar el repo en `/mnt/disco1/sicalab/recategorizacion-jornales/app`
3. **.env**: `cp app/.env.example ../.env` y completar `SESSION_SECRET` (y, si se desea, `ADMIN_*`).
4. **Bloque de servicio** en el compose central `/mnt/disco1/sicalab/docker-compose.yml`:

```yaml
  recategorizacion-jornales:
    build:
      context: ./recategorizacion-jornales/app
      dockerfile: Dockerfile
    container_name: sicalab-recategorizacion-jornales-1
    restart: unless-stopped
    env_file: ./recategorizacion-jornales/.env
    ports:
      - "PUERTO:3000"   # elegir un puerto libre: docker ps --format '{{.Names}}\t{{.Ports}}'
    volumes:
      - ./recategorizacion-jornales/data:/app/data
    networks:
      - sicalab_default
    healthcheck:
      test: ["CMD", "nc", "-z", "127.0.0.1", "3000"]
      interval: 30s
      retries: 3
```

5. **Levantar**: `cd /mnt/disco1/sicalab && docker compose up -d --build recategorizacion-jornales`
6. **Migración** (opcional; la app ya auto-migra): `docker exec -it sicalab-recategorizacion-jornales-1 npm run db:migrate:prod`
7. **Nginx**: agregar `nginx/recategorizacion-jornales.conf` a `nginx/nginx.conf` reemplazando `PUERTO` por el mismo puerto del compose → `nginx -t && nginx -s reload`
8. **DNS FortiGate**: registro A `recategorizacion-jornales` → `192.168.0.195` (zona `.sica`)

---

## Seguridad

- `SESSION_SECRET` obligatorio en producción (firma las sesiones). Generar uno aleatorio.
- `SESSION_SECRET` debe tener al menos 32 caracteres; en producción la app se niega a iniciar sesión si falta o es el valor de ejemplo.
- El admin inicial se siembra desde `.env` (`ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`). **Cambiar la contraseña al primer ingreso** (zona Usuarios).
- Contraseñas guardadas con bcrypt; nunca en texto plano.
- `app/src/db/seed-data.json` en el repo tiene **datos ficticios**. La nómina real (nombres, CUIL) vive en `app/src/db/seed-data.real.json`, que está en `.gitignore` y **nunca se sube**. En el servidor, antes del build: `cp app/src/db/seed-data.real.json app/src/db/seed-data.json`. El archivo real se copia al servidor con `scp` (no está en git). Como `seed-data.json` queda modificado localmente en el servidor, usar `git update-index --skip-worktree app/src/db/seed-data.json` para que el `git pull` no choque.
