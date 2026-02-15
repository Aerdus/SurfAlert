/**
 * Fetch Tide Data Script
 *
 * This script:
 * 1. Loads all tide stations from the database
 * 2. Deletes old data (before today at 00:00:00)
 * 3. Fetches fresh tide data from CKAN API for each station
 * 4. Filters to only store the next 7 days
 * 5. Uses UPSERT to handle prediction updates
 * 6. Reports statistics on what was fetched, inserted, updated, and deleted
 *
 * Run with: npx ts-node src/scripts/fetchTideData.ts
 */

// Load environment variables from .env file
import "dotenv/config";

// Import our custom modules
import {
  createPrismaClient,
  calculateDateRange,
  deleteOldReadings,
  fetchTideReadings,
  filterRecordsByDateRange,
  transformTideRecord,
  storeTideReadings,
} from "../utils/tideApi";

// Prisma type for Station
import { Station } from "@prisma/client";

// Result interface for fetch operations
export interface FetchResult {
  success: boolean;
  dataType: string; // "TIDE" | "WAVE" | "WIND"
  deleted: number;
  inserted: number;
  updated: number;
  totalProcessed: number;
  error?: string;
}

/**
 * Extract the resource ID from a CKAN dataset URL
 * Example: "https://www.data.qld.gov.au/dataset/.../resource/1542ee15-6f50-414f-bc15-66732f1f7eae"
 * Returns: "1542ee15-6f50-414f-bc15-66732f1f7eae"
 */
function extractResourceId(apiUrl: string): string {
  const match = apiUrl.match(/resource\/([a-f0-9-]+)/);
  if (!match) {
    throw new Error(`Could not extract resource ID from URL: ${apiUrl}`);
  }
  return match[1];
}

/**
 * Process tide data for a single station
 */
async function processStation(
  station: Station,
  prisma: any,
  startDate: Date,
  endDate: Date,
  daysToStore: number,
) {
  console.log(`\n Processing station: ${station.name}`);
  console.log(`   API URL: ${station.apiUrl}`);

  try {
    // Extract the resource ID from the station's API URL
    const resourceId = extractResourceId(station.apiUrl);
    console.log(`   Resource ID: ${resourceId}`);

    // Calculate offset: API data starts from 01/01/2026
    // We need to skip to approximately today's date
    const apiStartDate = new Date(2026, 0, 1); // January 1, 2026
    const daysSinceStart = Math.floor(
      (startDate.getTime() - apiStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const recordsPerDay = 144; // 6 per hour × 24 hours
    const offset = Math.max(0, daysSinceStart * recordsPerDay);

    // Calculate how many records we need to fetch
    // With 10-minute intervals, 7 days = 7 * 24 * 6 = 1,008 records
    const recordsNeeded = daysToStore * recordsPerDay;

    console.log(
      `   Calculated offset: ${offset} records (${daysSinceStart} days from API start)`,
    );
    console.log(
      `   Fetching ${recordsNeeded} records (${daysToStore} days)...`,
    );

    // Fetch data from CKAN API starting from the calculated offset
    const response = await fetchTideReadings(resourceId, recordsNeeded, offset);

    console.log(
      `    Fetched ${response.result.records.length} records from API`,
    );

    // Filter records to only those within our 7-day window
    const filteredRecords = filterRecordsByDateRange(
      response.result.records,
      startDate,
      endDate,
    );

    console.log(
      `    Filtered to ${filteredRecords.length} records within date range`,
    );

    if (filteredRecords.length === 0) {
      console.log(`     No records in date range, skipping...`);
      return { processed: 0, inserted: 0, updated: 0 };
    }

    // Transform API records into database format
    const parsedReadings = filteredRecords.map((record) =>
      transformTideRecord(record, station.id),
    );

    // Store in database using UPSERT (insert new, update existing)
    const stats = await storeTideReadings(prisma, parsedReadings);

    console.log(
      `    Stored: ${stats.inserted} inserted, ${stats.updated} updated`,
    );

    return stats;
  } catch (error) {
    console.error(`    Error processing ${station.name}:`, error);
    throw error;
  }
}

/**
 * Main function - Fetch all tide data for all stations
 * Can be called by API or run as a script
 */
export async function fetchAllTideData(prisma: any): Promise<FetchResult> {
  console.log(" Starting Tide Data Fetch Script");
  console.log("=".repeat(60));

  try {
    // Configuration: How many days of data to store
    const DAYS_TO_STORE = 7;

    // Calculate date range for data retention
    const { startDate, endDate, deleteBeforeDate } =
      calculateDateRange(DAYS_TO_STORE);

    console.log(`\n Date Range Configuration:`);
    console.log(`   Days to store: ${DAYS_TO_STORE}`);
    console.log(`   Start date: ${startDate.toISOString()}`);
    console.log(`   End date: ${endDate.toISOString()}`);
    console.log(`   Delete before: ${deleteBeforeDate.toISOString()}`);

    // Step 1: Delete old data
    console.log(`\n  Deleting old tide readings...`);
    const deletedCount = await deleteOldReadings(prisma, deleteBeforeDate);
    console.log(`    Deleted ${deletedCount} old readings`);

    // Step 2: Fetch all stations from database
    console.log(`\n Loading tide stations from database...`);
    const stations = await prisma.station.findMany();
    console.log(`   Found ${stations.length} stations`);

    if (stations.length === 0) {
      console.log(`     No stations found! Run syncTideStations.ts first.`);
      return {
        success: false,
        dataType: "TIDE",
        deleted: deletedCount,
        inserted: 0,
        updated: 0,
        totalProcessed: 0,
        error: "No stations found in database",
      };
    }

    // Step 3: Process each station
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const station of stations) {
      const stats = await processStation(
        station,
        prisma,
        startDate,
        endDate,
        DAYS_TO_STORE,
      );
      totalProcessed += stats.processed;
      totalInserted += stats.inserted;
      totalUpdated += stats.updated;
    }

    // Step 4: Report final statistics
    console.log(`\n${"=".repeat(60)}`);
    console.log(` Tide Data Fetch Complete!`);
    console.log(`\n Final Statistics:`);
    console.log(`   Stations processed: ${stations.length}`);
    console.log(`   Old readings deleted: ${deletedCount}`);
    console.log(`   Total readings processed: ${totalProcessed}`);
    console.log(`   New readings inserted: ${totalInserted}`);
    console.log(`   Existing readings updated: ${totalUpdated}`);
    console.log(`${"=".repeat(60)}\n`);

    // Return success result
    return {
      success: true,
      dataType: "TIDE",
      deleted: deletedCount,
      inserted: totalInserted,
      updated: totalUpdated,
      totalProcessed,
    };
  } catch (error) {
    console.error("\n Fatal error:", error);

    // Return error result
    return {
      success: false,
      dataType: "TIDE",
      deleted: 0,
      inserted: 0,
      updated: 0,
      totalProcessed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Only run if this file is executed directly (not imported)
// This allows the API to import and call fetchAllTideData() without auto-executing
if (require.main === module) {
  (async () => {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error(" DATABASE_URL environment variable is not set!");
      process.exit(1);
    }

    // Create Prisma client
    const prisma = createPrismaClient(process.env.DATABASE_URL);

    try {
      const result = await fetchAllTideData(prisma);

      if (!result.success) {
        console.error(" Fetch failed:", result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error("Script failed:", error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
      console.log("🔌 Disconnected from database");
    }
  })();
}
