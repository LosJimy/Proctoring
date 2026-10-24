import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './routes/auth.js';
import { sesionesRoutes } from './routes/sesiones.js';
import { evidenciaRoutes } from './routes/evidencia.js';
import { ensureBucket } from './lib/storage.js';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { wsSesionRoutes } from './routes/wsSesion.js';
import { wsPanelRoutes } from './routes/wsPanel.js';

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

await app.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
});

await app.register(websocket, {
    options: { maxPayload: 65536 }, //64KB max por msg
});

await app.register(evidenciaRoutes);
await app.register(wsSesionRoutes);
await app.register(wsPanelRoutes);
await ensureBucket();

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