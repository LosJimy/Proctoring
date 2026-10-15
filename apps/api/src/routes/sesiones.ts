import type { FastifyInstance } from "fastify";
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from "../lib/prisma.js";
import { EstudianteIdentificado, obtenerProveedor } from "../lib/proveedorToken.js";
import { authSesion } from "../lib/authSesion.js";

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
        const ahora = new Date();
        const inicioPermitido = new Date(prueba.Fecha);
        inicioPermitido.setMinutes(inicioPermitido.getMinutes() - 30);

        const finPermitido = new Date(prueba.Fecha);
        finPermitido.setMinutes(finPermitido.getMinutes() + prueba.Duracion_Min + 10);

        if (ahora < inicioPermitido) {
            return reply.status(403).send({
                error: 'El examen aun no comienza',
                abre: inicioPermitido.toISOString(),
            });
        }

        if (ahora > finPermitido) {
            return reply.status(403).send({ error: "El examen ya termino" });
        }

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

    /*
    * POST /api/sesiones/iniciar
    * Pending => Iniciada
    */
    app.post('/api/sesiones/iniciar', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        if (sesion.Estado === 'INICIADA') {
            return reply.status(409).send({ error: 'La sesi[on ya fue iniciada' });
        }

        if (sesion.Estado === 'FINALIZADA') {
            return reply.status(409).send({ error: 'La sesi[on ya fue finalizada' });
        }

        const prueba = await prisma.prueba.findUnique({
            where: { ID_Prueba: sesion.ID_Prueba },
        });

        const actualizada = await prisma.sesion_Examen.update({
            where: { ID_Sesion: sesion.ID_Sesion },
            data: {
                Estado: 'INICIADA',
                Hora_Inicio: new Date(),
            },
        });

        return {
            ID_Sesion: actualizada.ID_Sesion,
            Estado: actualizada.Estado,
            duracion_min: prueba?.Duracion_Min ?? 0,
            inicio: actualizada.Hora_Inicio,
        };
    });

    /*
    * POST /api/sesiones/consentimiento
    */
    app.post('/api/sesiones/consentimiento', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        const schema = z.object({
            aceptado: z.boolean(),
        });

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Datos invalidos' });
        }

        const { aceptado } = parsed.data;

        await prisma.estudiante.update({
            where: { ID_Estudiante: sesion.ID_Estudiante },
            data: {
                Consentimiento: aceptado,
                Consentimiento_Fecha: new Date(),
            },
        });

        if (!aceptado) {
            return reply.status(403).send({
                error: 'No puedes iniciar el examen sin consentir',
            });
        }

        return { Consentimiento: aceptado };
    });

    /*
    * Post /api/sesiones/heartbeat
    */
    app.post('/api/sesiones/heartbeat', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        if (sesion.Estado === 'FINALIZADA') {
            return reply.status(409).send({ error: "La sesion ya fue finalizada" });
        }

        await prisma.heartbeat.create({
            data: {
                ID_Sesion: sesion.ID_Sesion,
                IP: req.ip,
            },
        });

        return {
            ID_Sesion: sesion.ID_Sesion,
            Estado: sesion.Estado,
            ok: true,
        };
    });

    /*
    * POST /api/sesiones/finalizar
    */
    app.post('/api/sesiones/finalizar', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        if (sesion.Estado === 'FINALIZADA') {
            return reply.status(409).send({ error: 'La sesion ya fue finalizada' });
        }

        const horaFin = new Date();
        const duracionReal = sesion.Hora_Inicio
            ? Math.round((horaFin.getTime() - new Date(sesion.Hora_Inicio).getTime()) / 60000)
            : 0;

        const actualizada = await prisma.sesion_Examen.update({
            where: { ID_Sesion: sesion.ID_Sesion },
            data: {
                Estado: "FINALIZADA",
                Hora_Fin: horaFin,
                Duracion_Real: duracionReal,
            },
        });

        return {
            ID_Sesion: actualizada.ID_Sesion,
            Estado: actualizada.Estado,
            Duracion_Real: actualizada.Duracion_Real,
            Nivel_Riesgo: actualizada.Nivel_Riesgo,
        };
    });
}