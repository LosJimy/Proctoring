import { Client } from "minio";

const S3_HOST = process.env.S3_HOST || 'localhost';
const S3_PORT = Number(process.env.S3_PORT || 9000);
const S3_USE_SSL = process.env.S3_USE_SSL === 'true';
export const S3_BUCKET = process.env.S3_BUCKET || 'proctoring-video';

let cliente: Client | null = null;

export function getClient(): Client {
    if (!cliente) {
        cliente = new Client({
            endPoint: S3_HOST,
            port: S3_PORT,
            useSSL: S3_USE_SSL,
            accessKey: process.env.S3_ACCESS_KEY || '',
            secretKey: process.env.S3_SECRET_KEY || '',
        });
    }
    return cliente;
}

/*
* Ruta del objeto en el storage.
* El ID de sesi[on da una carpeta por sesi[on, as[i los buckets no quedan planos.]]]
*/

export function storageKey(
    idSesion: number,
    tipoStream: string,
    indiceChunk: number
): string {
    return `sesiones/${idSesion}/${tipoStream}/${indiceChunk}.webm`;
}

/**
 * Crea el bucket si no existe. se llama al iniciar sv.
 */
export async function ensureBucket(): Promise<void> {
    const c = getClient();
    const existe = await c.bucketExists(S3_BUCKET);
    if (!existe) {
        await c.makeBucket(S3_BUCKET);
        console.log(`[storage] Buket creado: ${S3_BUCKET}`);
    }
}

export async function putObjet(
    key: string,
    data: Buffer,
    contentType = 'video/webm'
): Promise<void> {
    await getClient().putObject(S3_BUCKET, key, data, data.length, {
        'Content-Type': contentType,
    });
}

export async function objectExist(key: string): Promise<boolean> {
    try {
        await getClient().statObject(S3_BUCKET, key);
        return true;
    } catch {
        return false;
    }
}

export async function removeObject(key: string): Promise<void> {
    await getClient().removeObject(S3_BUCKET, key);
}

/**
 * URL temp para q el panel pueda reproducir el video
 */
export async function presignedURL(key: string, expirySeconds = 300): Promise<string> {
    return getClient().presignedGetObject(S3_BUCKET, key, expirySeconds);
}

