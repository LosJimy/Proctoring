import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { presignedURL, objectExist } from "../lib/storage.js";

export async function evidenciaPanelRoutes(app: FastifyInstance) {
    app.get('/api/evidencia/url/:idGrabacion', async (req, reply) => {
        //1. validar que el usuario este auth
        try {
            await req.jwtVerify();
        } catch {
            return reply.status(401).send({ error: 'No auth' });
        }

        const ususarioJWT = req.user as { sub: number };
        const { idGrabacion } = req.params as { idGrabacion: string };
        const { accion = 'visualizar' } = req.query as { accion?: string };

        const idGrabNum = parseInt(idGrabacion, 10);
        if (isNaN(idGrabNum)) {
            return reply.status(400).send({ error: 'ID de grabacion invalido' });
        }

        try {
            //2. buscar grabacion en db para obtener ruta (ruta_video)
            const grabacion = await prisma.grabacion.findUnique({
                where: { ID_Grabacion: idGrabNum },
            });

            if (!grabacion) {
                return reply.status(404).send({
                    error: 'Grabacion no encontrada'
                });
            }

            //3. verificar si el arch realmente existe en rust/minIO
            const existe = await objectExist(grabacion.Ruta_Video);
            if (!existe) {
                return reply.status(404).send({ error: 'El archivo no existe en el almacenamiento' });
            }

            //4. Generar la URL firmada (valida por 5 min = 300 seg)
            const urlFirmada = await presignedURL(grabacion.Ruta_Video, 300);

            //5. registrar la auditoria de acceso obligatoria 21.719
            const ipCliente = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
            const userAgent = req.headers['user-agent'] || null;

            await prisma.auditoriaAcceso.create({
                data: {
                    ID_Usuario: ususarioJWT.sub,
                    ID_Grabacion: idGrabNum,
                    Accion: accion,
                    IP: ipCliente,
                    User_Agent: userAgent,
                },
            });

            //6. Retornar la URL firmada al panel
            return reply.send({
                url: urlFirmada,
                expiraEnSegundos: 300,
            });
        } catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Error interno al generar URL de evidencia' });
        }
    });
}