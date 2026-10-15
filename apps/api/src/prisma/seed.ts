import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Limpiando datos existentes');
    await prisma.revision_Incidente.deleteMany();
    await prisma.incidente.deleteMany();
    await prisma.grabacion.deleteMany();
    await prisma.sesion_Examen.deleteMany();
    await prisma.prueba.deleteMany();
    await prisma.estudiante_Asignatura.deleteMany();
    await prisma.estudiante.deleteMany();
    await prisma.asignatura.deleteMany();
    await prisma.carrera_Asignatura.deleteMany();
    await prisma.carrera.deleteMany();
    await prisma.auditoriaAcceso.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.regla_Puntaje.deleteMany();
    await prisma.categoria_Incidente.deleteMany();


    // ==========================
    // CARRERA
    // ==========================

    console.log('Creando carrera');
    const carrera = await prisma.carrera.create({
        data: {
            Nombre_Carrera: 'Licenciatura en Estudios Teologicos en Dialogo con las Culturas',
        },
    });

    // =========================
    // USUAIROS
    // =======================

    console.log('Creando Usuarios');
    const passwordHash = await bcrypt.hash('ProctoringICRF:D', 10);

    await prisma.usuario.create({
        data: {
            Nombre: 'Administrador TI',
            Email: 'admin@icrf.cl',
            Password_Hash: passwordHash,
            Rol: 'ADMIN',
        },
    });

    await prisma.usuario.create({
        data: {
            Nombre: 'Coordinador Pedagógico',
            Email: 'coordinador@icrf.cl',
            Password_Hash: passwordHash,
            Rol: 'COORDINADOR',
        },
    });

    await prisma.usuario.create({
        data: {
            Nombre: 'Jefa de Carrera',
            Email: 'jefecarrera@icrf.cl',
            Password_Hash: passwordHash,
            Rol: 'COORDINADOR',
        },
    });

    // ==+================
    // ASignatureas
    // ===================

    console.log('Creando asignaturas');
    const asignaturas = [];

    for (const nombre of ['Iniciación Bíblica', 'Antiguo Testamento', 'Nuevo Testamento']) {
        const asignatura = await prisma.asignatura.create({
            data: {
                Nombre_Asignatura: nombre,
                Anio_Semestre: '2026_2',
                carrera_asignaturas: {
                    create: { ID_Carrera: carrera.ID_Carrera },
                },
            },
        });
        asignaturas.push(asignatura);
    }

    // ===========
    // ESTUDIANTES
    // =============

    console.log('Creando estudiantes');
    const estudiantes = [];

    for (let i = 1; i <= 3; i++) {
        const estudiante = await prisma.estudiante.create({
            data: {
                Nombre: `Estudiante Prueba ${String(i).padStart(3, '0')}`,
                RUT: `9999999${i}-0`,
                Token_Moodle: `MDL-TEST-${String(i).padStart(3, '0')}`,
                Consentimiento: false,
                ID_Carrera: carrera.ID_Carrera,
            },
        });
        estudiantes.push(estudiante);
    }

    console.log('Asignando estudiantes a las 3 asignaturas');
    for (const estudiante of estudiantes) {
        for (const asignatura of asignaturas) {
            await prisma.estudiante_Asignatura.create({
                data: {
                    ID_Estudiante: estudiante.ID_Estudiante,
                    ID_Asignatura: asignatura.ID_Asignatura,
                },
            });
        }
    }

    // ========================
    // CATOGORIAS DE INCIDENTES
    // ========================

    console.log('→ Creando categorías de incidentes');
    const categorias = [
        {
            nombre: 'Microfono',
            descripcion: 'Microfono desactivado, silenciado o con falla de audio',
            puntaje: 1,
            tope: 10,
        },
        {
            nombre: 'Camara',
            descripcion: 'Camara desactivada, tapada u obstruida',
            puntaje: 2,
            tope: 20,
        },
        {
            nombre: 'Combinacion de teclas prohibidas',
            descripcion: 'Intento de usar Ctrl+C, Ctrl+V, Ctrl+A, F12 u otras teclas bloqueadas',
            puntaje: 3,
            tope: 30,
        },
        {
            nombre: 'Cambio de ventana',
            descripcion: 'El estudiante salio de la ventana o pestana del examen',
            puntaje: 14,
            tope: 56,
        },
    ];

    for (const cat of categorias) {
        await prisma.categoria_Incidente.create({
            data: {
                Nombre_Categoria: cat.nombre,
                Descripcion: cat.descripcion,
                reglas: {
                    create: {
                        Puntaje: cat.puntaje,
                        Puntaje_Tope: cat.tope,
                        Minimo: 1,
                        Maximo: cat.tope,
                    },
                },
            },
        });
    }

    // ==============================
    // PRUEBAS (3 por asignatura) 
    // ==============================

    console.log('→ Creando pruebas');
    const streams = JSON.stringify(['CAMARA', 'PANTALLA']);
    const categoriasActivas = JSON.stringify(categorias.map((c) => c.nombre));

    let dias = 0;
    for (const asignatura of asignaturas) {
        for (const nombre of ['Evaluación 1', 'Evaluación 2', 'Evaluación 3']) {
            dias += 14;
            const fecha = new Date('2026-08-10T00:00:00Z');
            fecha.setUTCDate(fecha.getUTCDate() + dias);

            await prisma.prueba.create({
                data: {
                    Nombre_Prueba: `${nombre} - ${asignatura.Nombre_Asignatura}`,
                    Fecha: fecha,
                    Duracion_Min: 90,
                    Requiere_Proctoring: true,
                    Streams_Para_Grabar: streams,
                    Categorias_Activas: categoriasActivas,
                    ID_Asignatura: asignatura.ID_Asignatura,
                },
            });
        }
    }
    /*
        * PRUEBA EN CURSO (para poder probar el examen en cualquier momento)
        */
    const ahora = new Date();
    await prisma.prueba.create({
        data: {
            Nombre_Prueba: 'Evaluacion en curso - Iniciacion Biblica',
            Fecha: new Date(ahora.getTime() - 10 * 60 * 1000), // empezó hace 10 minutos
            Duracion_Min: 90,
            Requiere_Proctoring: true,
            Streams_Para_Grabar: JSON.stringify(['CAMARA', 'PANTALLA']),
            Categorias_Activas: JSON.stringify(categorias.map((c) => c.nombre)),
            ID_Asignatura: asignaturas[0]!.ID_Asignatura,
        },
    });

    await prisma.$executeRaw`ALTER SEQUENCE "Prueba_ID_Prueba_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE "Estudiante_ID_Estudiante_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE "Sesion_Examen_ID_Sesion_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE "Usuario_ID_Usuario_seq" RESTART WITH 1`;
    // =============
    // RESUMEN
    // =============

    console.log('\n✓ Seed completado\n─────────────────────────────');
    console.log(`  Carreras:      ${await prisma.carrera.count()}`);
    console.log(`  Asignaturas:   ${await prisma.asignatura.count()}`);
    console.log(`  Usuarios:      ${await prisma.usuario.count()}`);
    console.log(`  Estudiantes:   ${await prisma.estudiante.count()}`);
    console.log(`  Inscripciones: ${await prisma.estudiante_Asignatura.count()}`);
    console.log(`  Pruebas:       ${await prisma.prueba.count()}`);
    console.log(`  Categorías:    ${await prisma.categoria_Incidente.count()}`);
    console.log('\n  Contraseña de todos: Proctoring2026!\n');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();
        process.exit(1);
    });


