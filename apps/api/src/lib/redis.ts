import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const CANAL_PANEL = 'palen:notificaciones';
export const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
    console.error('[redis] error:', err.message);
});

export async function publicarPanel(mesaje: unkown): Promise<void> {
    await redis.publish(CANAL_PANEL, JSON.stringify(mensaje));
}