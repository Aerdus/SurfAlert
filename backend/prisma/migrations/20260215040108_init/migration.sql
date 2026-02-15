-- CreateTable
CREATE TABLE "Station" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TideReading" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tide" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TideReading_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TideReading" ADD CONSTRAINT "TideReading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
