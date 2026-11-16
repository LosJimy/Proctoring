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

    /**
     * GET /api/sesiones/:idSesion/incidentes
     * para consultar todos los incidentes registrados de una sesion
     */
    app.get('/api/sesiones/:idSesion/incidentes', { preHandler: authSesion }, async (req, reply) => {
        const schema = z.object({
            idSesion: z.string().transform((val) => parseInt(val, 10)),
        });

        const parsed = schema.safeParse(req.params);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'ID de sesion invalido' });
        }

        const { idSesion } = parsed.data;

        try {
            //buscar todos los insidentes
            const incidentes = await prisma.incidente.findMany({
                where: { ID_Sesion: idSesion },
                include: {
                    categoria: true, //para traer nombre_categoria
                },
                orderBy: {
                    Tiempo: 'asc', //ordenado del mas antiguo al mas reciente
                },
            });

            return reply.status(200).send(incidentes);
        } catch (err) {
            app.log.error(err);
            return reply.status(500).send({
                error: 'Error al obtener los incidentes de la sesion'
            });
        }
    });

    /**
     * GET /api/sesiones/resumen-incidentes
     * Entrega resumen de incidentes y ptje de confianza acumulado
     */
    app.get('/api/sesiones/resumen-incidentes', { preHandler: authSesion }, async (req, reply) => {
        const sesion = req.sesion!;

        // el front puede enviar su propia config
        const querySchema = z.object({
            umbralMaximo: z.string().optional().transform(val => val ? parseInt(val, 10) : 20), //por defecto 20 pts = copia (modificar dsp)
        });

        const parsedQuery = querySchema.safeParse(req.query);
        const umbralMaximo = parsedQuery.success ? parsedQuery.data.umbralMaximo : 20;

        try {
            const incidentes = await prisma.incidente.findMany({
                where: { ID_Sesion: sesion.ID_Sesion },
                include: { categoria: true },
                orderBy: { Tiempo: 'asc' },
            });

            let puntajeTotalPenalizacion = 0;
            const conteoPorCategoria: Record<string, number> = {};

            incidentes.forEach((inc) => {
                //si el incidente trae ptje personalizado lo usa sino el default
                puntajeTotalPenalizacion += inc.Puntaje_Incidente || 1;
                const nombreCat = inc.categoria?.Nombre_Categoria || 'Desconocido';
                conteoPorCategoria[nombreCat] = (conteoPorCategoria[nombreCat] || 0);
            });

            // calcular % de prob. de copia entre 0% y 100%
            let porcentajeCopia = Math.round((puntajeTotalPenalizacion / umbralMaximo) * 100);
            if (porcentajeCopia > 100) porcentajeCopia = 100;
            if (porcentajeCopia < 0) porcentajeCopia = 0;

            //semaforo dinamico
            let nivelAlerta = 'VERDE';
            if (porcentajeCopia > 30) nivelAlerta = 'AMARILLO';
            if (porcentajeCopia > 70) nivelAlerta = 'ROJO';

            return {
                idSesion: sesion.ID_Sesion,
                estadoSesion: sesion.Estado,
                totalIncidentes: incidentes.length,
                puntajeTotalPenalizacion,
                porcentajeCopia,
                nivelAlerta,
                conteoPorCategoria,
                incidentesDetallados: incidentes,
            };
        } catch (err) {
            req.log.error(err);
            return reply.status(500).send({
                error: 'Error al generar resument de los incidentes'
            });
        }
    });
}