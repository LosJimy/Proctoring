import { prisma } from "./prisma.js";

export type EstudianteIdentificado = {
    ID_Estudiante: number;
    Nombre: string;
    Token_Moodle: string;
    Consentimiento: boolean;
    Consentimiento_Fecha: Date | null;
};

export interface ProveedorToken {
    verificar(token: string): Promise<EstudianteIdentificado>;
}

/* ==================================
TEMPORAL BORRAR DSP: token de nuestra base,
lo usaremso hasta que sepamos como funka el 
de moodle y nos entreguen su API
=====================================*/
export class ProveedorLocal implements ProveedorToken {
    async verificar(token: string): Promise<EstudianteIdentificado> {
        const estudiante = await prisma.estudiante.findUnique({
            where: { Token_Moodle: token },
            select: {
                ID_Estudiante: true,
                Nombre: true,
                Token_Moodle: true,
                Consentimiento: true,
                Consentimiento_Fecha: true,
            },
        });

        if (!estudiante) {
            throw new Error("TOKEN_INVALIDO");
        }

        return estudiante;
    }
}

/* ==================================
TEMPORAL BORRAR DSP: token de nuestra base,
lo usaremso hasta que sepamos como funka el 
de moodle y nos entreguen su API
=====================================*/
export class ProveedorMoodle implements ProveedorToken {
    private readonly url = process.env.MOODLE_TOKEN_URL || '';
    private readonly apiKey = process.env.MOODLE_API_KEY || '';

    async verificar(token: string): Promise<EstudianteIdentificado> {
        if (!this.url) {
            throw new Error("MOODLE_NO_CONFIGURADO");
        }

        const response = await fetch(`${this.url}?token=${encodeURIComponent(token)}`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                Accept: `application/json`,
            },
        });

        if (!response.ok) {
            throw new Error("TOKEN_INVALIDO");
        }

        const data = (await response.json()) as {
            user_id: string;
            fullname?: string;
        };

        //Moodle confirma la identidad / nosotros guardamos identdada

        const estudiante = await prisma.estudiante.findUnique({
            where: { Token_Moodle: data.user_id },
            select: {
                ID_Estudiante: true,
                Nombre: true,
                Token_Moodle: true,
                Consentimiento: true,
                Consentimiento_Fecha: true,
            },
        });

        if (!estudiante) {
            throw new Error("ESTUDIANTE_NO_REGISTRADO");
        }
        return estudiante;
    }
}

/*==============================
MODIFICAR `local` por `moodle` y
funcionar[ia con el moodle]
================================*/
export function obtenerProveedor(): ProveedorToken {
    const tipo = process.env.TOKEN_PROVEEDER || 'local';

    if (tipo === 'moodle') {
        return new ProveedorMoodle();
    }

    return new ProveedorLocal();
}