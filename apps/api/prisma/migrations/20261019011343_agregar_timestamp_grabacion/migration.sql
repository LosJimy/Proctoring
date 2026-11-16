/*
  Warnings:

  - Added the required column `Timestamp` to the `Grabacion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Grabacion" ADD COLUMN     "Timestamp" TIMESTAMP(3) NOT NULL;
