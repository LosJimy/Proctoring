import { prisma } from "./prisma.js";
import { publicarPanel } from "./redis.js";
import { calcularAporte, categoriasActivas, resumenSesion } from "./puntaje.js";

export interface PayloadIncidente {
    clave: string;
    categoria: number;
    inicio: number;
    duracion: number;
    probabilidad: number;
    metadata?: Record<string, unknown>;
}

export interface ResultadoRegistro {
    ok: boolean;
    codigo?: string;
    duplicado?: boolean;
    ID_Incidente?: number;
    aporte?: number;
    puntajeTotal?: number;
    nivel?: string;
    porcentaje?: number;
}

export async function registrarIncidente(
    sesion: { ID_Sesion: number; ID_Prueba: number },
    payload: PayloadIncidente
): Promise<ResultadoRegistro> {
    /**
     * 1. NoDuplicacion> si la calve ya existe, no se duplica
     * (pasa ucando el alumn se reconecta y reenvia lo no confirmado)
     */
    const existente = await prisma.incidente.findUnique({
        where: { Clave_Cliente: payload.clave },
    });

    if (existente) {
        const resumen = await resumenSesion(sesion.ID_Sesion, sesion.ID_Prueba);
        return {
            ok: true,
            duplicado: true,
            ID_Incidente: existente.ID_Incidente,
            aporte: 0,
            puntajeTotal: resumen.total,
            nivel: resumen.nivel,
            porcentaje: resumen.porcentaje,
        };
    }

    /**
     * 2. Validar que la categoria este activa en esta prueba + calcular aporte
     */
    const categorias = await categoriasActivas(sesion.ID_Prueba);
    const evaluacion = await calcularAporte(sesion.ID_Sesion, payload.categoria, categorias);

    if (!evaluacion.ok) {
        return { ok: false, codigo: evaluacion.codigo };
    }

    /**
     * 3. Guardar
     */
    const incidente = await prisma.incidente.create({
        data: {
            Clave_Cliente: payload.clave,
            Tiempo: new Date(payload.inicio),
            Duracion: payload.duracion,
            Probabilidad: payload.probabilidad,
            Metadatos: payload.metadata ? JSON.stringify(payload.metadata) : null,
            Puntaje_Incidente: evaluacion.aporte,
            ID_Categoria: payload.categoria,
            ID_Sesion: sesion.ID_Sesion,
        },
    });

    /**
     * 4. actualizar el riesgo de lasesion
     */
    const resumen = await resumenSesion(sesion.ID_Sesion, sesion.ID_Prueba);

    await prisma.sesion_Examen.update({
        where: { ID_Sesion: sesion.ID_Sesion },
        data: {
            Puntaje_Total: resumen.total,
            Nivel_Riesgo: resumen.nivel,
        },
    });

    /**
     * 5. Avisar al panel
     */
    await publicarPanel({
        tipo: 'incidente',
        ID_Sesion: sesion.ID_Sesion,
        ID_Incidente: incidente.ID_Incidente,
        categoria: evaluacion.categoria?.Nombre_Categoria,
        duracion: payload.duracion,
        probabilidad: payload.probabilidad,
        puntaje: evaluacion.aporte,
        puntajeTotal: resumen.total,
        riesgo: resumen.nivel,
        porcentaje: resumen.porcentaje,
        tiempo: incidente.Tiempo,
    });

    return {
        ok: true,
        duplicado: false,
        ID_Incidente: incidente.ID_Incidente,
        aporte: evaluacion.aporte,
        puntajeTotal: resumen.total,
        nivel: resumen.nivel,
        porcentaje: resumen.porcentaje,
    };
}