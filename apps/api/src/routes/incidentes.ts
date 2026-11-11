import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authSesion } from "../lib/authSesion.js";

export async function incidentesRoutes(app: FastifyInstance) {
    /**
     * POST /api/sesiones/incidente
     * Permite que e lplugin del moodle reporte una alerta o trampa detectada
     */
    app.post('/api/sesiones/incidente', { preHandler: authSesion }, async (req, reply) => {
        const schema = z.object({
            idCategoria: z.number().int().positive(),
            descripcion: z.string().optional(),
            duracion: z.number().optional().default(0),
            puntajeIncidente: z.number().optional().default(1),
            probabilidad: z.number().optional().default(1.0),
            claveCliente: z.string().optional(), //identeificador del usuario, enviado por el front 
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Datos de incidente invalidos', detalles: parsed.error.format() });
        }

        const { idCategoria, descripcion, duracion, puntajeIncidente, probabilidad, claveCliente } = parsed.data;
        const sesion = req.sesion!; //obtenido por authSesion

        try {
            //generar clave unica si el cliente no manda
            const keyUnica = claveCliente || `inc_${sesion.ID_Sesion}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            //Guardar incidente en DB
            const nuevoIncidente = await prisma.incidente.create({
                data: {
                    Clave_Cliente: keyUnica,
                    ID_Sesion: sesion.ID_Sesion,
                    ID_Categoria: idCategoria,
                    Descripcion: descripcion || 'Incidente detectado por navegador',
                    Duracion: duracion,
                    Puntaje_Incidente: puntajeIncidente,
                    Probabilidad: probabilidad,
                    Tiempo: new Date(),
                },
            });

            return reply.status(201).send({
                mensaje: 'Incidente registrado correctamente',
                idIncidente: nuevoIncidente.ID_Incidente,
            });
        } catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Error al registrar el incidente' })
        }
    });
}