-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'COORDINADOR', 'DOCENTE');

-- CreateEnum
CREATE TYPE "Estado_Sesion" AS ENUM ('PENDING', 'INICIADA', 'FINALIZADA', 'ABANDONADA', 'DEGRADADA');

-- CreateEnum
CREATE TYPE "Tipo_Stream" AS ENUM ('CAMARA', 'PANTALLA');

-- CreateEnum
CREATE TYPE "Veredicto" AS ENUM ('PENDIENTE_REVISION', 'CONFIRMADO', 'FALSO_POSITIVO', 'DUDOSO');

-- CreateEnum
CREATE TYPE "Nivel_Riesgo" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "Estado_Eliminacion" AS ENUM ('PENDIENTE', 'PROGRAMADA', 'ELIMINADA', 'FALLO');

-- CreateTable
CREATE TABLE "Usuario" (
    "ID_Usuario" SERIAL NOT NULL,
    "Nombre" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Password_Hash" TEXT NOT NULL,
    "Rol" "Rol" NOT NULL,
    "Activo" BOOLEAN NOT NULL DEFAULT true,
    "Creado_En" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("ID_Usuario")
);

-- CreateTable
CREATE TABLE "Carrera" (
    "ID_Carrera" SERIAL NOT NULL,
    "Nombre_Carrera" TEXT NOT NULL,

    CONSTRAINT "Carrera_pkey" PRIMARY KEY ("ID_Carrera")
);

-- CreateTable
CREATE TABLE "Carrera_Asignatura" (
    "ID_Carrera" INTEGER NOT NULL,
    "ID_Asignatura" INTEGER NOT NULL,

    CONSTRAINT "Carrera_Asignatura_pkey" PRIMARY KEY ("ID_Carrera","ID_Asignatura")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "ID_Asignatura" SERIAL NOT NULL,
    "Nombre_Asignatura" TEXT NOT NULL,
    "Anio_Semestre" TEXT NOT NULL,

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("ID_Asignatura")
);

-- CreateTable
CREATE TABLE "Profesor_Asignatura" (
    "ID_Profesor" INTEGER NOT NULL,
    "ID_Asignatura" INTEGER NOT NULL,

    CONSTRAINT "Profesor_Asignatura_pkey" PRIMARY KEY ("ID_Profesor","ID_Asignatura")
);

-- CreateTable
CREATE TABLE "Estudiante" (
    "ID_Estudiante" SERIAL NOT NULL,
    "Nombre" TEXT NOT NULL,
    "RUT" TEXT,
    "Token_Moodle" TEXT NOT NULL,
    "Consentimiento" BOOLEAN NOT NULL DEFAULT false,
    "Consentimiento_Fecha" TIMESTAMP(3),
    "ID_Carrera" INTEGER NOT NULL,

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("ID_Estudiante")
);

-- CreateTable
CREATE TABLE "Estudiante_Asignatura" (
    "ID_Estudiante" INTEGER NOT NULL,
    "ID_Asignatura" INTEGER NOT NULL,

    CONSTRAINT "Estudiante_Asignatura_pkey" PRIMARY KEY ("ID_Estudiante","ID_Asignatura")
);

-- CreateTable
CREATE TABLE "Prueba" (
    "ID_Prueba" SERIAL NOT NULL,
    "Nombre_Prueba" TEXT NOT NULL,
    "Fecha" TIMESTAMP(3) NOT NULL,
    "Duracion_Min" INTEGER NOT NULL,
    "Requiere_Proctoring" BOOLEAN NOT NULL DEFAULT true,
    "Activa" BOOLEAN NOT NULL DEFAULT true,
    "Streams_Para_Grabar" TEXT NOT NULL DEFAULT '["CAMARA","PANTALLA"]',
    "Categorias_Activas" TEXT NOT NULL DEFAULT '[]',
    "ID_Asignatura" INTEGER NOT NULL,

    CONSTRAINT "Prueba_pkey" PRIMARY KEY ("ID_Prueba")
);

-- CreateTable
CREATE TABLE "Sesion_Examen" (
    "ID_Sesion" SERIAL NOT NULL,
    "Token_Acceso" TEXT NOT NULL,
    "Token_Expira" TIMESTAMP(3) NOT NULL,
    "Hora_Inicio" TIMESTAMP(3),
    "Hora_Fin" TIMESTAMP(3),
    "Duracion_Real" INTEGER,
    "Estado" "Estado_Sesion" NOT NULL DEFAULT 'PENDING',
    "Nivel_Riesgo" "Nivel_Riesgo" NOT NULL DEFAULT 'BAJO',
    "Puntaje_Total" INTEGER NOT NULL DEFAULT 0,
    "IP" TEXT,
    "User_Agent" TEXT,
    "ID_Prueba" INTEGER NOT NULL,
    "ID_Estudiante" INTEGER NOT NULL,

    CONSTRAINT "Sesion_Examen_pkey" PRIMARY KEY ("ID_Sesion")
);

-- CreateTable
CREATE TABLE "Revision_Incidente" (
    "ID_Revision" SERIAL NOT NULL,
    "Veredicto" "Veredicto" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "Fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ID_Incidente" INTEGER NOT NULL,

    CONSTRAINT "Revision_Incidente_pkey" PRIMARY KEY ("ID_Revision")
);

-- CreateTable
CREATE TABLE "Grabacion" (
    "ID_Grabacion" SERIAL NOT NULL,
    "Tipo_Stream" "Tipo_Stream" NOT NULL,
    "Indice_Chunk" INTEGER NOT NULL,
    "Ruta_Video" TEXT NOT NULL,
    "Hash_Sha256" TEXT,
    "Fecha_Eliminacion_Programada" TIMESTAMP(3),
    "Estado_Eliminacion" "Estado_Eliminacion" NOT NULL DEFAULT 'PENDIENTE',
    "Eliminado_En" TIMESTAMP(3),
    "ID_Sesion" INTEGER NOT NULL,

    CONSTRAINT "Grabacion_pkey" PRIMARY KEY ("ID_Grabacion")
);

-- CreateTable
CREATE TABLE "Incidente" (
    "ID_Incidente" SERIAL NOT NULL,
    "Descripcion" TEXT,
    "Tiempo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Duracion" DOUBLE PRECISION NOT NULL,
    "Puntaje_Incidente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Probabilidad" DOUBLE PRECISION NOT NULL,
    "Metadatos" TEXT,
    "ID_Categoria" INTEGER NOT NULL,
    "ID_Sesion" INTEGER NOT NULL,

    CONSTRAINT "Incidente_pkey" PRIMARY KEY ("ID_Incidente")
);

-- CreateTable
CREATE TABLE "Categoria_Incidente" (
    "ID_Categoria" SERIAL NOT NULL,
    "Nombre_Categoria" TEXT NOT NULL,
    "Descripcion" TEXT,
    "Activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_Incidente_pkey" PRIMARY KEY ("ID_Categoria")
);

-- CreateTable
CREATE TABLE "Regla_Puntaje" (
    "ID_Regla_Puntaje" SERIAL NOT NULL,
    "Puntaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Puntaje_Tope" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Minimo" INTEGER NOT NULL DEFAULT 1,
    "Maximo" INTEGER NOT NULL DEFAULT 50,
    "Activo" BOOLEAN NOT NULL DEFAULT true,
    "Actualizado_En" TIMESTAMP(3) NOT NULL,
    "ID_Categoria" INTEGER NOT NULL,

    CONSTRAINT "Regla_Puntaje_pkey" PRIMARY KEY ("ID_Regla_Puntaje")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_Email_key" ON "Usuario"("Email");

-- CreateIndex
CREATE INDEX "Profesor_Asignatura_ID_Asignatura_idx" ON "Profesor_Asignatura"("ID_Asignatura");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_Token_Moodle_key" ON "Estudiante"("Token_Moodle");

-- CreateIndex
CREATE INDEX "Estudiante_Asignatura_ID_Asignatura_idx" ON "Estudiante_Asignatura"("ID_Asignatura");

-- CreateIndex
CREATE INDEX "Prueba_ID_Asignatura_idx" ON "Prueba"("ID_Asignatura");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_Examen_Token_Acceso_key" ON "Sesion_Examen"("Token_Acceso");

-- CreateIndex
CREATE INDEX "Revision_Incidente_ID_Incidente_idx" ON "Revision_Incidente"("ID_Incidente");

-- CreateIndex
CREATE UNIQUE INDEX "Grabacion_Ruta_Video_key" ON "Grabacion"("Ruta_Video");

-- CreateIndex
CREATE INDEX "Grabacion_ID_Sesion_Tipo_Stream_Indice_Chunk_idx" ON "Grabacion"("ID_Sesion", "Tipo_Stream", "Indice_Chunk");

-- CreateIndex
CREATE INDEX "Grabacion_Fecha_Eliminacion_Programada_idx" ON "Grabacion"("Fecha_Eliminacion_Programada");

-- CreateIndex
CREATE INDEX "Grabacion_Hash_Sha256_idx" ON "Grabacion"("Hash_Sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Grabacion_ID_Sesion_Tipo_Stream_Indice_Chunk_key" ON "Grabacion"("ID_Sesion", "Tipo_Stream", "Indice_Chunk");

-- CreateIndex
CREATE INDEX "Incidente_ID_Sesion_Tiempo_idx" ON "Incidente"("ID_Sesion", "Tiempo");

-- CreateIndex
CREATE INDEX "Incidente_ID_Categoria_idx" ON "Incidente"("ID_Categoria");

-- CreateIndex
CREATE INDEX "Incidente_Tiempo_idx" ON "Incidente"("Tiempo");

-- CreateIndex
CREATE UNIQUE INDEX "Regla_Puntaje_ID_Categoria_key" ON "Regla_Puntaje"("ID_Categoria");

-- AddForeignKey
ALTER TABLE "Carrera_Asignatura" ADD CONSTRAINT "Carrera_Asignatura_ID_Carrera_fkey" FOREIGN KEY ("ID_Carrera") REFERENCES "Carrera"("ID_Carrera") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrera_Asignatura" ADD CONSTRAINT "Carrera_Asignatura_ID_Asignatura_fkey" FOREIGN KEY ("ID_Asignatura") REFERENCES "Asignatura"("ID_Asignatura") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesor_Asignatura" ADD CONSTRAINT "Profesor_Asignatura_ID_Profesor_fkey" FOREIGN KEY ("ID_Profesor") REFERENCES "Usuario"("ID_Usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesor_Asignatura" ADD CONSTRAINT "Profesor_Asignatura_ID_Asignatura_fkey" FOREIGN KEY ("ID_Asignatura") REFERENCES "Asignatura"("ID_Asignatura") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudiante" ADD CONSTRAINT "Estudiante_ID_Carrera_fkey" FOREIGN KEY ("ID_Carrera") REFERENCES "Carrera"("ID_Carrera") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudiante_Asignatura" ADD CONSTRAINT "Estudiante_Asignatura_ID_Estudiante_fkey" FOREIGN KEY ("ID_Estudiante") REFERENCES "Estudiante"("ID_Estudiante") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudiante_Asignatura" ADD CONSTRAINT "Estudiante_Asignatura_ID_Asignatura_fkey" FOREIGN KEY ("ID_Asignatura") REFERENCES "Asignatura"("ID_Asignatura") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prueba" ADD CONSTRAINT "Prueba_ID_Asignatura_fkey" FOREIGN KEY ("ID_Asignatura") REFERENCES "Asignatura"("ID_Asignatura") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion_Examen" ADD CONSTRAINT "Sesion_Examen_ID_Prueba_fkey" FOREIGN KEY ("ID_Prueba") REFERENCES "Prueba"("ID_Prueba") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion_Examen" ADD CONSTRAINT "Sesion_Examen_ID_Estudiante_fkey" FOREIGN KEY ("ID_Estudiante") REFERENCES "Estudiante"("ID_Estudiante") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision_Incidente" ADD CONSTRAINT "Revision_Incidente_ID_Incidente_fkey" FOREIGN KEY ("ID_Incidente") REFERENCES "Incidente"("ID_Incidente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grabacion" ADD CONSTRAINT "Grabacion_ID_Sesion_fkey" FOREIGN KEY ("ID_Sesion") REFERENCES "Sesion_Examen"("ID_Sesion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_ID_Categoria_fkey" FOREIGN KEY ("ID_Categoria") REFERENCES "Categoria_Incidente"("ID_Categoria") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidente" ADD CONSTRAINT "Incidente_ID_Sesion_fkey" FOREIGN KEY ("ID_Sesion") REFERENCES "Sesion_Examen"("ID_Sesion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regla_Puntaje" ADD CONSTRAINT "Regla_Puntaje_ID_Categoria_fkey" FOREIGN KEY ("ID_Categoria") REFERENCES "Categoria_Incidente"("ID_Categoria") ON DELETE CASCADE ON UPDATE CASCADE;
