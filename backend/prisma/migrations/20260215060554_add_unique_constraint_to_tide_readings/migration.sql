/*
  Warnings:

  - A unique constraint covering the columns `[stationId,timestamp]` on the table `TideReading` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TideReading_stationId_timestamp_key" ON "TideReading"("stationId", "timestamp");
