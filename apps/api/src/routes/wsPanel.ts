import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redis, CANAL_PANEL } from '../lib/redis.js';

const TIMEOUT_AUTH_MS = 5000;

interface WSMinimo {
    send(datos: string): void;
    close(codigo?: number, motivo?: string): void;
    on(evento: string, cb: (...args: any[]) => void): void;
}

function enviar(ws: WSMinimo, mensaje: unknown): void {
    try {
        ws.send(JSON.stringify(mensaje));
    } catch {
        // lo ignora
    }
}

export async function wsPanelRoutes(app: FastifyInstance) {
    /**
     * Conexion dedicada a Redis
     * modo suscirber no puede ejcutar otros comandos
     * por eso no se puede usar la de publicar
     */
    const suscriptor = redis.duplicate();
    suscriptor.on('error', (err) => app.log.error({ err: err.message }, 'redis suscriptor'));

    try {
        await suscriptor.subscribe(CANAL_PANEL);
    } catch (err) {
        app.log.error({ err }, 'no se pudo suscribir a Redis');
    }

    const clientes = new Set<WSMinimo>();

    suscriptor.on('message', (canal, mensaje) => {
        for (const c of clientes) {
            try {
                c.send(mensaje);
            } catch {
                clientes.delete(c);
            }
        }
    });

    app.get('/ws/panel', { websocket: true }, (socket, req) => {
        const ws = socket as unknown as WSMinimo;
        let autenticado = false;

        const timeoutAuth = setTimeout(() => {
            if (!autenticado) {
                enviar(ws, { tipo: 'error', codigo: 'NO_AUTH' });
                try {
                    ws.close(4001, 'timeout auth');
                } catch {
                    //ignorar
                }
            }
        }, TIMEOUT_AUTH_MS);

        ws.on('message', async (datos: Buffer) => {
            if (autenticado) return;

            let msg: { tipo?: string; token?: string };
            try {
                msg = JSON.parse(datos.toString());
            } catch {
                enviar(ws, { tipo: 'error', codigo: 'JSON_INVALIDO' });
                return;
            }

            if (msg?.tipo !== 'auth' || typeof msg.token !== 'string') {
                enviar(ws, { tipo: 'error', codigo: 'MENSAJE_INVALIDO' });
                return;
            }

            try {
                const payload = req.jwtVerify<{ sub: number }>(msg.token);
                const usuario = await prisma.usuario.findUnique({
                    where: { ID_Usuario: payload.sub },
                });

                if (!usuario || !usuario.Activo) {
                    enviar(ws, { tipo: 'error', codigo: 'NO_AUTORIZADO' });
                    ws.close(4001, 'no autorizado');
                    return;
                }

                autenticado = true;
                clearTimeout(timeoutAuth);
                clientes.add(ws);

                enviar(ws, {
                    tipo: 'auth_ok',
                    rol: usuario.Rol,
                    nombre: usuario.Nombre,
                });
            } catch {
                enviar(ws, { tipo: 'error', codigo: 'NO_AUTORIZADO' });
                try {
                    ws.close(4001, 'no autorizado');
                } catch {
                    // ignora
                }
            }
        });

        ws.on('close', () => {
            clientes.delete(ws);
            clearTimeout(timeoutAuth);
        });

        ws.on('error', () => {
            clientes.delete(ws);
            clearTimeout(timeoutAuth);
        });
    });
}

