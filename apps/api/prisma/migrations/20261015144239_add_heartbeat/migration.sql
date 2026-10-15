-- CreateTable
CREATE TABLE "Heartbeat" (
    "ID_Heartbeat" SERIAL NOT NULL,
    "Fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IP" TEXT,
    "ID_Sesion" INTEGER NOT NULL,

    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("ID_Heartbeat")
);

-- CreateIndex
CREATE INDEX "Heartbeat_ID_Sesion_Fecha_idx" ON "Heartbeat"("ID_Sesion", "Fecha");

-- AddForeignKey
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_ID_Sesion_fkey" FOREIGN KEY ("ID_Sesion") REFERENCES "Sesion_Examen"("ID_Sesion") ON DELETE CASCADE ON UPDATE CASCADE;
