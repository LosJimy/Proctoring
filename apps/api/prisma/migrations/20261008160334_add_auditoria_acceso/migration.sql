/*
  Warnings:

  - The values [DOCENTE] on the enum `Rol` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Profesor_Asignatura` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Rol_new" AS ENUM ('ADMIN', 'COORDINADOR');
ALTER TABLE "Usuario" ALTER COLUMN "Rol" TYPE "Rol_new" USING ("Rol"::text::"Rol_new");
ALTER TYPE "Rol" RENAME TO "Rol_old";
ALTER TYPE "Rol_new" RENAME TO "Rol";
DROP TYPE "public"."Rol_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Profesor_Asignatura" DROP CONSTRAINT "Profesor_Asignatura_ID_Asignatura_fkey";

-- DropForeignKey
ALTER TABLE "Profesor_Asignatura" DROP CONSTRAINT "Profesor_Asignatura_ID_Profesor_fkey";

-- DropTable
DROP TABLE "Profesor_Asignatura";

-- CreateTable
CREATE TABLE "AuditoriaAcceso" (
    "ID_Auditoria" SERIAL NOT NULL,
    "ID_Usuario" INTEGER NOT NULL,
    "ID_Grabacion" INTEGER NOT NULL,
    "Accion" TEXT NOT NULL,
    "IP" TEXT NOT NULL,
    "User_Agent" TEXT,
    "Fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaAcceso_pkey" PRIMARY KEY ("ID_Auditoria")
);

-- CreateIndex
CREATE INDEX "AuditoriaAcceso_ID_Usuario_Fecha_idx" ON "AuditoriaAcceso"("ID_Usuario", "Fecha");

-- CreateIndex
CREATE INDEX "AuditoriaAcceso_ID_Grabacion_idx" ON "AuditoriaAcceso"("ID_Grabacion");

-- AddForeignKey
ALTER TABLE "AuditoriaAcceso" ADD CONSTRAINT "AuditoriaAcceso_ID_Usuario_fkey" FOREIGN KEY ("ID_Usuario") REFERENCES "Usuario"("ID_Usuario") ON DELETE CASCADE ON UPDATE CASCADE;
