import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './routes/auth.js';
import { sesionesRoutes } from './routes/sesiones.js';

const app = Fastify({ logger: true });

await app.register(cors, {
    origin: ['http://localhost:5173'],
});

await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret',
});

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

await app.register(authRoutes);

await app.register(sesionesRoutes);

app.get('/api/db-test', async () => {
    const count = await prisma.usuario.count();
    return { baseDatos: 'conectada', usuarios: count };
});

const start = async () => {
    try {
        await app.listen({ port: Number(process.env.API_PORT) || 3000, host: '0.0.0.0' });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});