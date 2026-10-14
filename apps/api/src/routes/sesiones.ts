import type { FastifyInstance } from "fastify";
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from "../lib/prisma.js";
import { EstudianteIdentificado, obtenerProveedor } from "../lib/proveedorToken.js";

export async function sesionesRoutes(app: FastifyInstance) {
    /*
    ==============================
    POST /api/sesiones/acceso
    estudiante entra con token moodle
    ==============================
    */
    app.post('/api/sesiones/acceso', async (req, reply) => {
        const schema = z.object({
            token: z.string().min(1),
            ID_Prueba: z.number().int().positive(),
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Datos invalidos' });
        }

        const { token, ID_Prueba } = parsed.data;

        //1. Verificar identeidad del estudiante;
        let estudiante: EstudianteIdentificado;
        try {
            estudiante = await obtenerProveedor().verificar(token);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : 'ERROR_DESCONOCIDO';
            if (mensaje === 'TOKEN_INVALIDO') {
                return reply.status(401).send({ error: 'TOKEN_INVALIDO' });
            }
            return reply.status(500).send({ error: 'ERRor verificando token' });
        }

        //2. Verificar que la prueba existe y est[a activa]
        const prueba = await prisma.prueba.findUnique({
            where: { ID_Prueba },
            include: { asignatura: true },
        });
        if (!prueba || !prueba.Activa) {
            return reply.status(400).send({ error: 'Prueba no encontrada' });
        }

        //3. Revisar que el alumno est[a en la asignatura]
        const inscripcion = await prisma.estudiante_Asignatura.findUnique({
            where: {
                ID_Estudiante_ID_Asignatura: {
                    ID_Estudiante: estudiante.ID_Estudiante,
                    ID_Asignatura: prueba.ID_Asignatura,
                },
            },
        });

        if (!inscripcion) {
            return reply.status(403).send({ error: 'No esta inscrito en la asignatura' });
        }

        //4. verificar que no haya sesi[on activa]
        const sesionActiva = await prisma.sesion_Examen.findFirst({
            where: {
                ID_Estudiante: estudiante.ID_Estudiante,
                ID_Prueba,
                Estado: { in: ['PENDING', 'INICIADA'] },
            },
        });
        if (sesionActiva) {
            return reply.status(409).send({
                error: 'Ya hay una sesion activa para esta prueba',
                ID_Sesion: sesionActiva.ID_Sesion,
            });
        }

        //5. Crear la sesi[on]
        const tokenAcceso = crypto.randomBytes(32).toString('hex');

        const sesion = await prisma.sesion_Examen.create({
            data: {
                Token_Acceso: tokenAcceso,
                Token_Expira: new Date(Date.now() + 1000 * 86400),
                Estado: 'PENDING',
                IP: req.ip,
                User_Agent: req.headers['user-agent'] || null,
                ID_Prueba,
                ID_Estudiante: estudiante.ID_Estudiante,
            },
        });

        //6. Marcar el consentimiento si ya lo hab[ia aceptado antes]
        const consentimientoPrevio = estudiante.Consentimiento ? { aceptado: true, fecha: estudiante.Consentimiento_Fecha } : null;
        return reply.status(201).send({
            ID_Sesion: sesion.ID_Sesion,
            Token_Acceso: sesion.Token_Acceso,
            estudiante: {
                nombre: estudiante.Nombre,
            },
            prueba: {
                nombre: prueba.Nombre_Prueba,
                duracion_min: prueba.Duracion_Min,
                asignatura: prueba.asignatura.Nombre_Asignatura,
                streams: JSON.parse(prueba.Streams_Para_Grabar),
                categorias: JSON.parse(prueba.Categorias_Activas),
            },
            consentimiento_previo: consentimientoPrevio,
        });
    });
}