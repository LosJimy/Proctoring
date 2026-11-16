import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from '../lib/prisma.js'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
    app.post('/api/auth/login', async (req, reply) => {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Datps invalidos' });
        }
        const { email, password } = parsed.data;

        const usuario = await prisma.usuario.findUnique({
            where: { Email: email.toLowerCase() },
        });

        if (!usuario || !usuario.Activo) {
            return reply.status(401).send({ error: "Credenciales Invalidas" });
        }

        const passwordValido = await bcrypt.compare(password, usuario.Password_Hash);
        if (!passwordValido) {
            return reply.status(401).send({ error: "Credenciales inv[alidas" });
        }

        const token = app.jwt.sign({
            sub: usuario.ID_Usuario,
            email: usuario.Email,
            nombre: usuario.Nombre,
            rol: usuario.Rol,
        },
            { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });

        return {
            token,
            usuario: {
                id: usuario.ID_Usuario,
                nombre: usuario.Nombre,
                email: usuario.Email,
                rol: usuario.Rol,
            },
        };
    });

    app.get('/api/auth/me', {
        preHandler: async (req, reply) => {
            try {
                await req.jwtVerify();
            } catch {
                return reply.status(401).send({ error: "No auth" });
            }
        },
    }, async (req) => {
        return req.user;
    });
}