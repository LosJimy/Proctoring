import type { FastifyInstance } from "fastify";
import type { Sesion_Examen } from "@prisma/client";
import { z } from 'zod';
import { prisma } from "../lib/prisma.js";
import { registrarIncidente } from "../lib/incidentes.js";

const TIMEOUT_AUTH_MS = 5000;
const MAX_BYTES = 64 * 1024;
const MAX_MENSJAES_POR_SEGUNDO = 20;

const ORIGENES_PERMITIDOS = (process.env.WS_ORIGENS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Tipo minimo del socket. Evita importar tipos de 'ws' 
 * (dependencia transittiva).
 */
interface WSMinimo {
    send(datos: string): void;
    close(codigo?: number, motivo?: string): void;
    on(evento: string, cb: (...args: any[]) => void): void;
}

/**
 * Sockets abiertos por sesion, para poder cerrarlos al finalizar el examen
 */
const socketsPorSesion = new Map<number, Set<WSMinimo>>();

export function cerrarSocketsSesion(idSesion: number): void {
    const set = socketsPorSesion.get(idSesion);
    if (!set) return;
    for (const ws of set) {
        try {
            ws.send(JSON.stringify({ tipo: 'sesion_cerrada', motivo: 'examen_finalizado' }));
            ws.close(1000, 'sesion finalizada');
        } catch {
            // Ignorar x1
        }
    }
    socketsPorSesion.delete(idSesion);
}

const MENSAJE = z.discriminatedUnion('tipo', [
    z.object({
        tipo: z.literal('auth'),
        token: z.string().min(10),
    }),
    z.object({
        tipo: z.literal('incidente'),
        clave: z.string().uuid(),
        categoria: z.coerce.number().int().positive(),
        inicio: z.coerce.number().int().positive(),
        duracion: z.coerce.number().min(0).default(0),
        probabilidad: z.coerce.number().min(0).max(1).default(1),
    }),
]);

function enviar(ws: WSMinimo, mensaje: unknown): void {
    try {
        ws.send(JSON.stringify(mensaje));
    } catch {
        // ignorar x2 
    }
}

function cerrarConError(ws: WSMinimo, codigo: string): void {
    enviar(ws, { tipo: 'error', codigo });
    try {
        ws.close(4001, codigo);
    } catch {
        // ignorar x3
    }
}

export async function wsSesionRoutes(app: FastifyInstance) {
    app.get('/ws/sesion/:id', { websocket: true }, (socket, req) => {
        const ws = socket as unknown as WSMinimo;
        const idSesionParam = Number(String(req.params.id));

        //Oirgne permitido (evita que otra pag se conecte)
        const origin = req.headers.origin;
        if (origin && !ORIGENES_PERMITIDOS.includes(origin)) {
            try {
                ws.close(4003, 'origin no permitido')
            } catch {
                // ignorar x3
            }
            return;
        }

        let sesion: Sesion_Examen | null = null;
        let autenticado = false;
        const pendientes: string[] = [];

        let contador = 0;
        let ventana = Date.now();

        const timeoutAuth = setTimeout(() => {
            if (!autenticado) cerrarConError(ws, 'NO_AUTORIZADO');
        }, TIMEOUT_AUTH_MS);

        ws.on('message', (datos: Buffer) => {
            if (datos.length > MAX_BYTES) {
                enviar(ws, { tipo: 'error', codigo: 'MENSAJE_MUY_GRANDE' });
                try {
                    ws.close(4009, 'mensaje muy grande');
                } catch {
                    //ignorar x4
                }
                return;
            }

            const ahora = Date.now();
            if (ahora - ventana >= 1000) {
                ventana = ahora;
                contador = 0;
            }
            contador += 1;
            if (contador > MAX_MENSJAES_POR_SEGUNDO) {
                enviar(ws, { tipo: 'error', codigo: 'DEMASIADOS_MENSAJES' });
                try {
                    ws.close(4008, 'rate limit');
                } catch {
                    //ignorar x5
                }
                return;
            }

            const texto = datos.toString();

            let crudo: unknown;
            try {
                crudo = JSON.parse(texto);
            } catch {
                enviar(ws, { tipo: 'error', codigo: 'JSON_INVALIDO' });
                return;
            }

            const parsed = MENSAJE.safeParse(crudo);
            if (!parsed.success) {
                enviar(ws, {
                    tipo: 'error',
                    codigo: 'MENSAJE_INVALIDO',
                    detalle: parsed.error.flatten().fieldErrors,
                });
                return;
            }

            if (parsed.data.tipo === 'auth') {
                if (!autenticado) void autenticar(parsed.data.token);
                return;
            }

            if (!autenticado) {
                pendientes.push(texto);
                return;
            }

            void procesar(parsed.data);
        });

        ws.on('close', () => {
            clearTimeout(timeoutAuth);
            if (sesion) socketsPorSesion.get(sesion.ID_Sesion)?.delete(ws);
        });

        ws.on('error', () => {
            clearTimeout(timeoutAuth);
            if (sesion) socketsPorSesion.get(sesion.ID_Sesion)?.delete(ws);
        });

        ws.on('error', () => {
            clearTimeout(timeoutAuth);
            if (sesion) socketsPorSesion.get(sesion.ID_Sesion)?.delete(ws);
        });

        // Autenticacion por header 
        // pal wscat / postman
        const header = req.headers.authorization;
        if (header?.startsWith('Bearer ')) {
            void autenticar(header.slice(7));
        }

        async function autenticar(token: string): Promise<void> {
            try {
                const encontrada = await prisma.sesion_Examen.findUnique({
                    where: { Token_Acceso: token },
                });

                if (!encontrada) return cerrarConError(ws, 'TOKEN_INVALIDO');
                if (new Date() > encontrada.Token_Expira) return cerrarConError(ws, 'TOKEN_EXPIRADO');
                if (encontrada.ID_Sesion !== idSesionParam) return cerrarConError(ws, 'SESION_NO_COINCIDE');

                sesion = encontrada;
                autenticado = true;
                clearTimeout(timeoutAuth);

                if (!socketsPorSesion.has(encontrada.ID_Sesion)) {
                    socketsPorSesion.set(encontrada.ID_Sesion, new Set());
                }
                socketsPorSesion.get(encontrada.ID_Sesion)?.add(ws);

                enviar(ws, {
                    tipo: 'auth_ok',
                    ID_Sesion: encontrada.ID_Sesion,
                    estado: encontrada.Estado,
                });

                //Procesar lo que llego antes del auth
                while (pendientes.length > 0) {
                    const texto = pendientes.shift();
                    if (!texto) break;
                    try {
                        const p = MENSAJE.safeParse(JSON.parse(texto));
                        if (p.success && p.data.tipo === 'incidente') void procesar(p.data);
                    } catch {
                        //ignorar x ?
                    }
                }
            } catch (err) {
                app.log.error({ err }, 'ws: error autenticadndo');
                cerrarConError(ws, 'ERROR_INTERNO');
            }
        }

        async function procesar(payload: {
            clave: string;
            categoria: number;
            inicio: number;
            duracion: number;
            probabilidad: number;
            metadata?: Record<string, unknown>;
        }): Promise<void> {
            if (!sesion) return;
            if (sesion.Estado !== 'INICIADA') {
                enviar(ws, { tipo: 'error', codigo: 'SESION_NO_INICIADA', clave: payload.clave });
                return;
            }

            const resultado = await registrarIncidente({
                ID_Sesion: sesion.ID_Sesion,
                ID_Prueba: sesion.ID_Prueba
            }, payload);

            if (!resultado.ok) {
                enviar(ws, { tipo: 'error', codigo: resultado.codigo, clave: payload.clave });
                return;
            }

            enviar(ws, {
                tipo: 'ack',
                clave: payload.clave,
                ID_Incidente: resultado.ID_Incidente,
                duplicado: resultado.duplicado,
                puntaje: resultado.aporte,
                puntajeTotal: resultado.puntajeTotal,
                riesgo: resultado.nivel,
            });
        };
    });
}