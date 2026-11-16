import type { FastifyInstance } from "fastify";
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authSesion } from "../lib/authSesion.js";
import { putObjet, storageKey } from "../lib/storage.js";

/**
 * Retenci[on por defecto de la evidencia, en d[ias]]
 */
const DIAS_RETENCION = Number(process.env.RETENCION_DIAS || 50);

const CAMPOS = z.object({
    tipoStream: z.enum(['CAMARA', 'PANTALLA']),
    indiceChunk: z.coerce.number().int().min(0),
    timestamp: z.coerce.number().int().positive(),
});

export async function evidenciaRoutes(app: FastifyInstance) {
    /**
     * POST /api/evidencia/chunk
     * (resive chunk de video de 5 seg y lo almacena en storage)
     */
    app.post('/api/evidencia/chunk', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        if (sesion.Estado !== 'INICIADA') {
            return reply.status(409).send({
                error: 'La sesion no esta iniciada',
                Estado: sesion.Estado,
            });
        }

        //Leer el multipart: 1archivo+camposdetexto
        let archivo: Buffer | null = null;
        const campos: Record<string, string> = {};

        for await (const parte of req.parts()) {
            if (parte.type === 'file') {
                archivo = await parte.toBuffer();
            } else {
                campos[parte.fieldname] = String(parte.value);
            }
        }

        const parsed = CAMPOS.safeParse(campos);
        if (!parsed.success) {
            return reply.status(400).send({
                error: 'Campos invalidos',
                detalle: parsed.error.flatten().fieldErrors,
            });
        }

        if (!archivo || archivo.length === 0) {
            return reply.status(400).send({ error: 'Falta el archivo de video' });
        }

        const { tipoStream, indiceChunk, timestamp } = parsed.data;
        const key = storageKey(sesion.ID_Sesion, tipoStream, indiceChunk);
        const hash = crypto.createHash('sha256').update(archivo).digest('hex');

        //Subir al storage (sobrrescribe si yua existe)
        await putObjet(key, archivo);

        const Eliminacion = new Date(Date.now() + DIAS_RETENCION * 86400_000);

        //Registrar el chunk (upsert: reenvios sobrescribem)
        const grabacion = await prisma.grabacion.upsert({
            where: {
                ID_Sesion_Tipo_Stream_Indice_Chunk: {
                    ID_Sesion: sesion.ID_Sesion,
                    Tipo_Stream: tipoStream,
                    Indice_Chunk: indiceChunk,
                },
            },
            create: {
                Tipo_Stream: tipoStream,
                Indice_Chunk: indiceChunk,
                Timestamp: new Date(timestamp),
                Ruta_Video: key,
                Hash_Sha256: hash,
                Fecha_Eliminacion_Programada: Eliminacion,
                ID_Sesion: sesion.ID_Sesion,
            },
            update: {
                Timestamp: new Date(timestamp),
                Hash_Sha256: hash,
                Fecha_Eliminacion_Programada: Eliminacion,
                Estado_Eliminacion: 'PENDIENTE',
                Eliminado_En: null,
            },
        });

        return reply.status(201).send({
            ID_Grabacion: grabacion.ID_Grabacion,
            Ruta_Video: grabacion.Ruta_Video,
            tipoStream,
            indiceChunk,
            bytes: archivo.length,
        });
    });
}