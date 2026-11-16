/*
  Warnings:

  - A unique constraint covering the columns `[Clave_Cliente]` on the table `Incidente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Clave_Cliente` to the `Incidente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Incidente" ADD COLUMN     "Clave_Cliente" TEXT NOT NULL,
ADD COLUMN     "Recibido_En" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Incidente_Clave_Cliente_key" ON "Incidente"("Clave_Cliente");
