import crypto from 'node:crypto';
import type { Sesion_Examen, Usuario } from '@prisma/client';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from './prisma.js';

declare module 'fastify' {
    interface FastifyRequest {
        sesion?: Sesion_Examen;
        usuario?: Usuario;
    }
}

/*
* Extrae el token del header Authorization y carga la sesion
*/
export async function authSesion(
    req: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply
) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Falta el token de sesion' });
    }

    const token = header.slice(7);

    const sesion = await prisma.sesion_Examen.findUnique({
        where: { Token_Acceso: token },
    });

    if (!sesion) {
        return reply.status(401).send({ error: 'Token de sesion invalido' });
    }
    if (new Date() > sesion.Token_Expira) {
        return reply.status(401).send({ error: 'Token de sesion expirado' });
    }

    req.sesion = sesion;
}

/*
* Extracci[on del token del header y carga de usuario (admin/cordinador)]
*/
export async function authUsuario(
    req: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply
) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ error: 'No autenticado' });
    }

    const payload = req.user as { sub: number };
    const usuario = await prisma.usuario.findUnique({
        where: { ID_Usuario: payload.sub },
    });

    if (!usuario || !usuario.Activo) {
        return reply.status(401).send({ error: 'Usuario no valido' });
    }

    req.usuario = usuario;
}