// Load environment variables from .env file (contains DATABASE_URL)
import "dotenv/config";

// Prisma imports for database operations
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; // Prisma 7 requires an adapter for PostgreSQL
import { Pool } from "pg"; // PostgreSQL connection pool

// Node.js modules for file system and path operations
import * as fs from "fs";
import * as path from "path";

// Log the database URL to verify it's loaded correctly (useful for debugging)
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Create a PostgreSQL connection pool using the DATABASE_URL from .env
// The pool manages multiple connections to the database efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Wrap the pool with Prisma's PostgreSQL adapter
// Prisma 7 requires this adapter to communicate with PostgreSQL
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with the adapter
// This gives us type-safe database access through Prisma's ORM
const prisma = new PrismaClient({ adapter });

// Build the path to the tide_stations.json config file
// __dirname is the current script's directory (backend/scripts)
const stationsPath = path.join(__dirname, "../config/tide_stations.json");

// Read the JSON file synchronously and parse it into a JavaScript array
// This array contains all the tide stations we want to sync to the database
const stationsData = fs.readFileSync(stationsPath, "utf-8");
const stations = JSON.parse(stationsData);

/**
 * Main function to sync tide stations from the JSON config file to the database
 * Uses upsert to either insert new stations or update existing ones
 */
async function syncStations() {
  // Loop through each station in the JSON file
  for (const station of stations) {
    // Upsert: Update if exists (based on name), create if doesn't exist
    // This ensures the database stays in sync with the JSON config
    await prisma.station.upsert({
      where: { name: station.name }, // Find station by unique name
      update: {
        // If station exists, update these fields
        apiUrl: station.apiUrl,
        latitude: station.latitude,
        longitude: station.longitude,
      },
      create: {
        // If station doesn't exist, create with these fields
        name: station.name,
        apiUrl: station.apiUrl,
        latitude: station.latitude,
        longitude: station.longitude,
      },
    });
    console.log(`Synced station: ${station.name}`);
  }

  // Clean up: disconnect Prisma and close the PostgreSQL connection pool
  await prisma.$disconnect();
  await pool.end();
}

// Execute the sync function and handle any errors
syncStations().catch((e) => {
  console.error("Error syncing stations:", e);
  // Ensure connections are closed even if an error occurs
  prisma.$disconnect();
  pool.end();
});
