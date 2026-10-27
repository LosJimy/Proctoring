import { prisma } from "./prisma.js";
import type { Nivel_Riesgo, Sesion_Examen } from "@prisma/client";

/**
 * Umbrales de riesgo, en % del maximo posible de la prueba.
 */
export const UMBRAL_MEDIO = 25;
export const UMBRAL_ALTO = 60;
export const UMBRAL_CRITICO = 85;

export function calcularNivel(porcentaje: number): Nivel_Riesgo {
    if (porcentaje >= UMBRAL_CRITICO) return 'CRITICO';
    if (porcentaje >= UMBRAL_ALTO) return 'ALTO';
    if (porcentaje >= UMBRAL_MEDIO) return 'MEDIO';
    return 'BAJO';
}

// Devuelve las reglas de ptje act para una prueba
export async function reglasPuntaje(idPrueba: number) {
    return await prisma.categoria_Incidente.findMany({
        where: { Activo: true },
        include: { reglas: { where: { Activo: true } } },
    });
}

export interface CategoriaActiva {
    ID_Categoria: number;
    Nombre_Categoria: string;
    Puntaje: number;
    Puntaje_Tope: number;
    Minimo: number;
    Maximo: number;
}

/**
 * Categorias habilitadas para una prueba
 * cada una con sus regla de ptje
 */
export async function categoriasActivas(idPrueba: number): Promise<CategoriaActiva[]> {
    const prueba = await prisma.prueba.findUnique({
        where: { ID_Prueba: idPrueba },
        select: { Categorias_Activas: true },
    });

    let nombres: string[] = [];
    try {
        nombres = JSON.parse(prueba?.Categorias_Activas || '[]');
    } catch {
        nombres = [];
    }

    const categorias = await prisma.categoria_Incidente.findMany({
        where: { Nombre_Categoria: { in: nombres }, Activo: true },
        include: { reglas: { where: { Activo: true } } },
    });

    return categorias.map((c) => {
        const regla = c.reglas[0];
        return {
            ID_Categoria: c.ID_Categoria,
            Nombre_Categoria: c.Nombre_Categoria,
            Puntaje: regla?.Puntaje ?? 0,
            Puntaje_Tope: regla?.Puntaje_Tope ?? 0,
            Minimo: regla?.Minimo ?? 1,
            Maximo: regla?.Maximo ?? 50,
        };
    });
}

/**
 * Aporte de un incidente nueevo al puntaje de us categoria.
 * 
 * - n = cuantos incidentes lleva la categoria
 * - solo cuentan a partir del minimo ej: min 3 = las 2 prim no suman
 * - hasta maximo ocurrencias
 * - maximo abs por categoria (Puntaje_Tope)
 * - el aporte es la DIFERENCIA contra lo sumadio (asi la suam da el tope exacto)
 */
export async function calcularAporte(
    idSesion: number,
    idCategoria: number,
    categorias: CategoriaActiva[]
): Promise<{
    ok: boolean;
    codigo?: string;
    aporte: number;
    categoria?: CategoriaActiva
}> {
    const categoria = await prisma.categoria_Incidente.findUnique({
        where: { ID_Categoria: idCategoria },
        include: { reglas: { where: { Activo: true } } },
    });
    if (!categoria) return { ok: false, aporte: 0 };

    const regla = categoria.reglas[0];
    if (!regla) return { ok: false, aporte: 0 };

    const { Minimo, Maximo, Puntaje, Puntaje_Tope } = regla;

    const stats = await prisma.incidente.aggregate({
        _count: true,
        _sum: { Puntaje_Incidente: true },
        where: { ID_Sesion: idSesion, ID_Categoria: idCategoria },
    });

    const n = stats._count + 1; //total incidentes incluyendo el nuevo
    const sumaPrevia = stats._sum.Puntaje_Incidente ?? 0;

    // A partir del minimo, cada incidente suma puntaje. Hata m[aximo ocurrencias]
    const aplicables = Math.max(0, n - Minimo + 1);
    const ocurrencias = Math.min(aplicables, Maximo);
    const totalCategoria = Math.min(ocurrencias * Puntaje, Puntaje_Tope);

    return {
        ok: true,
        aporte: Math.max(0, totalCategoria - sumaPrevia),
        categoria: {
            ID_Categoria: categoria.ID_Categoria,
            Nombre_Categoria: categoria.Nombre_Categoria,
            Puntaje,
            Puntaje_Tope,
            Minimo,
            Maximo,
        },
    };
}

/**
 * Resumen de la sesion: total, maximo posible y nivel de riesgo
 *s
 */
export async function resumenSesion(
    idSesion: number,
    idPrueba: number
): Promise<{
    total: number;
    maximo: number;
    porcentaje: number;
    nivel: Nivel_Riesgo
}> {
    const [totalAgg, categorias] = await Promise.all([
        prisma.incidente.aggregate({
            _sum: { Puntaje_Incidente: true },
            where: { ID_Sesion: idSesion },
        }),
        categoriasActivas(idPrueba),
    ]);

    const total = totalAgg._sum.Puntaje_Incidente ?? 0;
    const maximo = categorias.reduce((s, c) => s + c.Puntaje_Tope, 0);
    const porcentaje = maximo > 0 ? (total / maximo) * 100 : 0;

    return { total, maximo, porcentaje, nivel: calcularNivel(porcentaje) };
}