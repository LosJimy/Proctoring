# ICRF Proctoring — Backend

Sistema de proctoring (monitoreo de exámenes en línea) desarrollado para la UCN, integrado con Moodle Campus Virtual y diseñado bajo los estándares de la Ley 21.719.

---

## Requisitos

| Herramienta | Versión |
|---|---|
| Docker + Docker Compose | 29.x / 5.x |
| Node.js | 22 o superior |
| pnpm | 12 o superior |

Verificar herramientas instaladas:
```bash
docker --version
node --version
pnpm --version
```

# PUESTA EN MARCHA

## 1. Instalar dependencias: desde la raíz

    pnpm install

## 2. Levantar los servicios de infraestructura (Docker)

    docker compose -f docker-compose.dev.yml up -d

### Levanta tres servicios esenciales:
 * PostgreSQL (Puerto 5432): Base de datos relacional
 * Redis (Puerto 6379): Broker de mensajes para WebSockets y notificaciones en tiempo real del panel.
 * RustFS/MinIO (Puerto 9000/9001): Almacenamiento de video compatible con S3

### Verifica que estén corriendo correctamente:
    docker compose -f docker-compose.dev.yml ps

## 3. Aplicar migraciones de Base de Datos
    pnpm --filter @proctoring/api exec prisma migrate deploy

## 4. Cargar datos de prueba (Seed)
    pnpm --filter @proctoring/api db:seed
* Esto inicializa el entorno con carreras, asignaturas, usuarios administradores y estudiantes de prueba (MDL-TEST-001 al 003).

## 5. Ejecutar la API en modo desarrollo
    pnpm dev: api
* El servidor backend quedará escuchando en http://localhost:3000.

# Credenciales y Accesos
## Panel de Administración (Coordinadores/Profesores/Admins)
* Todos los usuarios del panel comparten la misma contraseña por defecto en el seed:
    Password: ProctoringICRF:D

Email               | ROL
 ================================
admin@icrf.cl       | ADMIN
coordinador@icrf.cl | COORDINADOR
jefecarrera@icrf.cl | COORDINADOR

## Estudiantes (Simulación de Moodle)
### Tokens de acceso simulados que envía el plugin de Moodle:
*   MDL-TEST-001
*   MDL-TEST-002
*   MDL-TEST-003

# Endpoints del Backend
## Diagnóstico
    GET /health         \Comprueba que el servidor está activo.
    GET /api/db-test    \Verifica la conectividad con PostgreSQL.

## Autenticación del Panel
    POST /api/auth/login    \Recibe {email, password} y retorna un JWT.
    GET /api/auth/me        \Requiere header "Authorization: Bearer <jwt>" para obtener datos del usuario autenticado.

## Ciclo de Vida del Examen (Estudiante)
    POST /api/sesiones/acceso           \Recibe {email, password} y retorna un JWT
    POST /api/sesiones/iniciar          \Header: Authorization: Bearer <Token_Acceso>. Cambia el estado de la sesion a INICIADA
    POST /api/sesiones/consentimiento   \Header: Authorization: Bearer <Token_Acceso> | Body: {"aceptado": true}.
    POST /api/sesiones/heartbeat        \Header: Authorization: Bearer <Token_Acceso>. Cierra la sesion y calcula el puntaje final de riesgo.

## Envio de Evidencia de Video (Chunks)
    POST /api/evidencia/chunk   \Header: Authorization: Bearer <Token_Acceso> | Envia mediante multipart/form-data:
*   tipoStream: CAMARA o PANTALLA
*   indiceChunk: Entero secuencial (desde 0)
*   timestamp: Momento epoch en miliseg
*   archivo: Archivo de video formato video/webm (fragmento de 5 seg)

# Comunicacion en Tiempo Real (WebSockets)
## 1. WebSocket del estudiante

* URL: ws://localhost:3000/ws/sesion/{id_sesion}
* Primer mensaje obligatorio (dentro de los primeros 5 segundos de conexion):

```
JSON
{
    "tipo": "auth",
    "token": "<TOKEN_ACCESO_OBTENIDO_EN_ACCESO>"
}
```
* Respuesta esperada:
```
JSON
{
    "tipo": "auth_ok",
    "ID_Sesion":X,
    "estado": "PENDING"
}
```

## 2. WebSocket del Panel de Monitoreo

* URL: ws://localhost:3000/ws/panel
* Primer mensaje obligatorio

```
JSON
{
    "tipo": "auth",
    "token": "<JWT_DEL_LOGIN_ADMIN>"
}
```
* Respuesta esperada:
```
JSON
{
    "tipo": "auth_ok",
    "rol": "ADMIN",
    "nombre": "Administrador..."
}
```

# Guia rapida de pruebas con cURL y PostgreSQL
Si necesitas limpiar sesiones previas o ajustar la ventana de tiempo de una prueba para poder hacer pruebas locales en Postman o cURL, utiliza los sig comandos:

## Limpiar sesiones e incidentes previos (evitar conflictos 409)
    docker compose -f docker-compose.dev.yml exec postgres psql -U proctoring -d proctoring -c "DELETE FROM \"Incidente\"; DELETE FROM \"Sesion_Examen\";"

## Asegurar que la prueba este dentro de la ventana de tiempo activa
    docker compose -f docker-compose.dev.yml exec postgres psql -U proctoring -d proctoring -c "UPDATE \"Prueba\" SET \"Fecha\" = NOW() - INTERVAL '10 minutes' WHERE \"ID_Prueba\" = 10;"

## Obtener acceso de estuadiante por consola
    curl -s -X POST http://localhost:3000/api/sesiones/acceso \
    -H "Content-Type: application/json" \
    -d '{"token":"MDL-TEST-003","ID_Prueba":10}'

## Solucion de Problemas Frecuentes
* Error 409 al crear sesion:
Ya existe una sesion activa para esa combinacion de estudiante y prueba. Ejecuta el comando de limpieza de Sesion_Examen indicado arriba.

* Error de conexion en WebSockets (cierre abrupto 1006/4001):
Asegurate de enviar msg JSON de autenticacion ({"tipo": "auth", "token": "..."}) inmediatamente al abrir la conexion, antes de que transcurran 5 seg.

* PostgresQL en bucle de reinicio:
Asegurate de que en tu docker-compose.dev.yml el volumen de la base de datos apunte exactamente a /var/lib/postgresql y no a un subdirectorio /data.

```
YAML
volumes:
    -pgdata:/var/lib/postgresql
```

