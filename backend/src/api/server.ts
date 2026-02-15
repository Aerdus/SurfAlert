/**
 * Express REST API Server (API-Only)
 * Serves tide data from PostgreSQL database
 * Frontend runs separately
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createPrismaClient } from "../utils/tideApi";
import { fetchAllTideData, FetchResult } from "../scripts/fetchTideData";

const app = express();
const PORT = process.env.PORT || 3001; // API runs on port 3001

// Middleware
app.use(cors()); // Allow requests from frontend (different port/origin)
app.use(express.json());

// Initialize Prisma
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set!");
}
const prisma = createPrismaClient(process.env.DATABASE_URL);

/**
 * GET /api/stations
 * Returns all stations with their tide readings
 */
app.get("/api/stations", async (req, res) => {
  try {
    const stations = await prisma.station.findMany({
      include: {
        tideReadings: {
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json(stations);
  } catch (error) {
    console.error("Error fetching stations:", error);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

/**
 * GET /api/stations/:id
 * Returns a specific station by ID
 */
app.get("/api/stations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const station = await prisma.station.findUnique({
      where: { id },
    });

    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }

    res.json(station);
  } catch (error) {
    console.error("Error fetching station:", error);
    res.status(500).json({ error: "Failed to fetch station" });
  }
});

/**
 * GET /api/stations/:id/tide-readings
 * Returns tide readings for a specific station
 *
 * FUTURE: Add /api/stations/:id/wind-readings
 * FUTURE: Add /api/stations/:id/wave-readings
 */
app.get("/api/stations/:id/tide-readings", async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);

    const tides = await prisma.tideReading.findMany({
      where: { stationId },
      orderBy: { timestamp: "asc" },
    });

    res.json(tides);
  } catch (error) {
    console.error("Error fetching tide readings:", error);
    res.status(500).json({ error: "Failed to fetch tide readings" });
  }
});

/**
 * GET /api/stats
 * Returns database statistics
 */
app.get("/api/stats", async (req, res) => {
  try {
    const stationCount = await prisma.station.count();
    const tideCount = await prisma.tideReading.count();

    const oldestReading = await prisma.tideReading.findFirst({
      orderBy: { timestamp: "asc" },
    });

    const newestReading = await prisma.tideReading.findFirst({
      orderBy: { timestamp: "desc" },
    });

    res.json({
      totalStations: stationCount,
      totalReadings: tideCount,
      // FUTURE: Add windReadings, waveReadings counts here
      oldestReading: oldestReading?.timestamp,
      newestReading: newestReading?.timestamp,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * POST /api/fetch/tide
 * Manually trigger tide data fetch for all stations
 * Returns fetch results
 */
app.post("/api/fetch/tide", async (req, res) => {
  try {
    console.log(" Manual tide data fetch triggered via API");
    const result = await fetchAllTideData(prisma);

    if (result.success) {
      res.json({
        success: true,
        message: "Tide data fetch completed successfully",
        stats: {
          dataType: result.dataType,
          deleted: result.deleted,
          inserted: result.inserted,
          updated: result.updated,
          totalProcessed: result.totalProcessed,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Tide data fetch failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error triggering tide fetch: ", error);
    res.status(500).json({
      success: false,
      error: "Failed to trigger tide data fetch",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(` Surf Alert API running on http://localhost:${PORT}`);
  console.log(` Endpoints available:`);
  console.log(`   GET http://localhost:${PORT}/api/stations`);
  console.log(`   GET http://localhost:${PORT}/api/stations/:id/tide-readings`);
  console.log(`   GET http://localhost:${PORT}/api/stats`);
  console.log(`   POST http://localhost:${PORT}/api/fetch-tide-data`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});
