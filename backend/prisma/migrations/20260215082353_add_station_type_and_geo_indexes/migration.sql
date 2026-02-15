-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stationType" TEXT NOT NULL DEFAULT 'TIDE';

-- CreateIndex
CREATE INDEX "Station_stationType_idx" ON "Station"("stationType");

-- CreateIndex
CREATE INDEX "Station_latitude_longitude_idx" ON "Station"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "TideReading_timestamp_idx" ON "TideReading"("timestamp");
