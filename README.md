---

## Requisitos

| Herramienta | Versión |
|---|---|
| Docker + Docker Compose | 29.x / 5.x |
| Node.js | 22 o superior |
| pnpm | 12 o superior |

Verificar:

```bash
docker --version
node --version
pnpm --version
```

Si no tienes pnpm: `npm install -g pnpm`

---

## Puesta en marcha

### 1. Instalar dependencias

Desde la raíz del proyecto:

```bash
pnpm install
```

### 2. Levantar los servicios de datos

```bash
docker compose -f docker-compose.dev.yml up -d
```

Levanta tres servicios:

| Servicio | Puerto | Función |
|---|---|---|
| PostgreSQL | 5432 | Base de datos |
| Redis | 6379 | Colas de trabajo |
| RustFS | 9000 / 9001 | Almacenamiento de video (compatible S3) |

Verificar que están sanos:

```bash
docker compose -f docker-compose.dev.yml ps
```

Los tres deben decir `healthy` o `Up`.

### 3. Aplicar migraciones

```bash
pnpm --filter @proctoring/api exec prisma migrate deploy
```

### 4. Cargar datos de prueba

```bash
pnpm --filter @proctoring/api db:seed
```

Crea 1 carrera, 3 asignaturas, 3 usuarios, 3 estudiantes, 9 pruebas y 4 categorías de incidentes.

### 5. Levantar la API

```bash
pnpm dev:api
```

Queda escuchando en `http://localhost:3000`.

---

## Credenciales de prueba

Todos los usuarios tienen la misma contraseña:

```
ProctoringICRF:D
```

| Email | Rol |
|---|---|
| `admin@icrf.cl` | ADMIN |
| `coordinador@icrf.cl` | COORDINADOR |
| `jefecarrera@icrf.cl` | COORDINADOR |

Tokens de estudiante (simulan lo que enviará Moodle):

```
MDL-TEST-001
MDL-TEST-002
MDL-TEST-003
```

---

## Endpoints

### Diagnóstico

```
GET /health              Servidor activo
GET /api/db-test         Conexión a la base de datos
```

### Panel (admin y coordinador)

```
POST /api/auth/login     Body: { email, password }  → devuelve JWT
GET  /api/auth/me        Header: Authorization: Bearer <jwt>
```

### Examen (estudiante)

```
POST /api/sesiones/acceso          Body: { token, ID_Prueba }
                                   → crea sesión, devuelve Token_Acceso
POST /api/sesiones/iniciar         Header: Authorization: Bearer <Token_Acceso>
POST /api/sesiones/consentimiento  Header: Authorization: Bearer <Token_Acceso>
                                   Body: { aceptado: boolean }
POST /api/sesiones/heartbeat       Header: Authorization: Bearer <Token_Acceso>
POST /api/sesiones/finalizar       Header: Authorization: Bearer <Token_Acceso>
```

**Nota sobre la autenticación:** son dos superficies distintas.

- El **panel** usa email y contraseña, y devuelve un JWT.
- El **examen** usa el token de Moodle en el body, y devuelve un `Token_Acceso` que viaja en el header `Authorization`.

---

## Probar con Postman

### Paso 1 — Login del panel

```
POST http://localhost:3000/api/auth/login
Body → raw → JSON:
{
  "email": "admin@icrf.cl",
  "password": "ProctoringICRF:D"
}
```

Copia el `token` de la respuesta.

### Paso 2 — Crear sesión de examen

Primero consulta qué pruebas existen:

```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U proctoring -d proctoring -c "SELECT \"ID_Prueba\", \"Nombre_Prueba\" FROM \"Prueba\" ORDER BY \"ID_Prueba\" LIMIT 5;"
```

Luego:

```
POST http://localhost:3000/api/sesiones/acceso
Body → raw → JSON:
{
  "token": "MDL-TEST-002",
  "ID_Prueba": 1
}
```

Copia el `Token_Acceso` de la respuesta.

### Paso 3 — Usar la sesión

En cada request, ve a la pestaña **Headers** y agrega:

| Key | Value |
|---|---|
| `Authorization` | `Bearer <Token_Acceso copiado>` |

```
POST http://localhost:3000/api/sesiones/iniciar
POST http://localhost:3000/api/sesiones/consentimiento   Body: { "aceptado": true }
POST http://localhost:3000/api/sesiones/heartbeat
POST http://localhost:3000/api/sesiones/finalizar
```

### Automatizar el token

En el paso 2, ve a la pestaña **Tests** y pega:

```javascript
const json = pm.response.json();
pm.collectionVariables.set('tokenSesion', json.Token_Acceso);
```

Luego en los pasos 3, el header queda:

```
Bearer {{tokenSesion}}
```

---

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Creado |
| 400 | Body mal formado o prueba inexistente |
| 401 | Token inválido, expirado o ausente |
| 403 | Sin permiso (no inscrito, sin consentimiento) |
| 409 | Conflicto (ya hay una sesión activa, sesión finalizada) |
| 500 | Error del servidor |

---

## Comandos útiles

```bash
# Ver logs del backend
pnpm dev:api

# Verificar tipos
pnpm --filter @proctoring/api typecheck

# Recargar la base con datos de prueba
pnpm --filter @proctoring/api db:seed

# Abrir Prisma Studio (visor de base de datos)
pnpm --filter @proctoring/api db:studio

# Consultar la base de datos
docker compose -f docker-compose.dev.yml exec postgres psql -U proctoring -d proctoring

# Detener servicios
docker compose -f docker-compose.dev.yml down

# Detener y BORRAR los datos
docker compose -f docker-compose.dev.yml down -v
```

---

## Estructura del proyecto

```
.
├── apps/
│   ├── api/                  Backend Node + Fastify
│   │   ├── prisma/
│   │   │   ├── schema.prisma     Modelo de datos
│   │   │   ├── migrations/       Migraciones SQL
│   │   │   └── seed.ts           Datos de prueba
│   │   └── src/
│   │       ├── index.ts          Servidor y registro de rutas
│   │       ├── lib/
│   │       │   ├── prisma.ts         Cliente de Prisma
│   │       │   ├── authSesion.ts     Autenticación del estudiante
│   │       │   └── proveedorToken.ts Validación del token (local o Moodle)
│   │       └── routes/
│   │           ├── auth.ts        Login del panel
│   │           └── sesiones.ts    Ciclo de vida del examen
│   ├── exam/                 Frontend del estudiante (pendiente)
│   ├── panel/                Frontend del panel (en desarrollo)
│   └── ai-service/           Workers de IA (pendiente)
├── packages/
│   ├── shared/               Tipos compartidos
│   └── ui/                   Componentes React compartidos
├── infra/                    Configuración de despliegue
├── docs/                     ADRs y spikes
├── docker-compose.dev.yml
└── pnpm-workspace.yaml
```

---

## Problemas frecuentes

### `ERR_PNPM_IGNORED_BUILDS`

Prisma y esbuild necesitan ejecutar código al instalarse. Agrega a `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  '@prisma/client': true
  '@prisma/engines': true
  prisma: true
  esbuild: true
```

Después:

```bash
rm -rf node_modules
pnpm install
```

### `The table "public.X" does not exist`

Falta aplicar una migración:

```bash
pnpm --filter @proctoring/api exec prisma migrate deploy
```

### `Unknown argument 'ID_Prueba'` o tabla no encontrada

Los IDs de las pruebas cambian cada vez que corres el seed. Consulta los actuales:

```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U proctoring -d proctoring -c "SELECT \"ID_Prueba\", \"Nombre_Prueba\" FROM \"Prueba\" ORDER BY \"ID_Prueba\" LIMIT 5;"
```

### `Credenciales inválidas` en el login

La contraseña es `ProctoringICRF:D` (con `D` mayúscula y `:` al final).

Si el seed y la contraseña cambió, vuelve a correrlo:

```bash
pnpm --filter @proctoring/api db:seed
```

### PostgreSQL reinicia en loop

Ocurrió con PostgreSQL 18, que cambió la ruta del volumen. En `docker-compose.dev.yml` el volumen debe montarse en `/var/lib/postgresql`, **no** en `/var/lib/postgresql/data`:

```yaml
volumes:
  - pgdata:/var/lib/postgresql
```

### Un estudiante ya tiene sesión activa (409)

Para reiniciar:

```bash
pnpm --filter @proctoring/api db:seed
```

### Cambié el schema y Prisma no lo toma

```bash
pnpm --filter @proctoring/api db:generate
```

---

## Notas de implementación

### Nombres de tablas en Prisma

Los modelos usan mayúsculas y guiones bajos (`Sesion_Examen`), por lo que el cliente de Prisma los expone con minúscula solo en la primera letra:

```typescript
prisma.sesion_Examen        // sí, con "E" mayúscula
prisma.revision_Incidente
prisma.regla_Puntaje
prisma.categoria_Incidente
```

Esto es intencionado: los nombres coinciden con la figura 7 del modelo de datos en `PC.md`.

### Proveedor de token

`apps/api/src/lib/proveedorToken.ts` tiene dos implementaciones que se eligen desde `.env`:

| `TOKEN_PROVEEDER` | Comportamiento |
|---|---|
| `local` | Busca el token en la tabla `Estudiante` |
| `moodle` | Valida el token contra la API de Moodle |

Mientras no tengamos el token real de Moodle, usamos `local`. Cuando esté disponible, cambia a `moodle` y completa `MOODLE_TOKEN_URL` y `MOODLE_API_KEY`.