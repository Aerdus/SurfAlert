/**
 * Tide API Module
 * Functions to fetch, parse, and store tide data from CKAN API
 */

import { fetchJson } from "../utils/http";
import { CkanResponse, CkanTideRecord } from "../types/ckan";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Parsed tide reading ready for database storage
 */
export interface ParsedTideReading {
  stationId: number;
  timestamp: Date;
  tide: number;
}

/**
 * Build the CKAN API URL for a resource
 * @param resourceId - The CKAN resource ID (from station config)
 * @param limit - Number of records to fetch per request (default: 100)
 * @param offset - Starting position for pagination (default: 0)
 */
export function buildCkanUrl(
  resourceId: string,
  limit: number = 100,
  offset: number = 0,
): string {
  const baseUrl = "https://www.data.qld.gov.au/api/3/action/datastore_search";
  return `${baseUrl}?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
}

/**
 * Parse date and time strings into a JavaScript Date object
 * @param dateStr - Date in DD/MM/YYYY format
 * @param timeStr - Time in HH:MM format (24-hour)
 * @returns JavaScript Date object
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
  // Split the date: "01/01/2026" -> ["01", "01", "2026"]
  const [day, month, year] = dateStr.split("/");

  // Split the time: "14:30" -> ["14", "30"]
  const [hours, minutes] = timeStr.split(":");

  // Create Date object (month is 0-indexed in JavaScript!)
  // new Date(year, monthIndex, day, hours, minutes)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1, // January is 0, December is 11
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
  );

  return date;
}

/**
 * Transform a CKAN tide record into a parsed reading for database storage
 * @param record - Raw record from CKAN API
 * @param stationId - Database ID of the station
 */
export function transformTideRecord(
  record: CkanTideRecord,
  stationId: number,
): ParsedTideReading {
  return {
    stationId,
    timestamp: parseDateTime(record.Date, record.Time),
    tide: parseFloat(record.Reading),
  };
}

/**
 * Fetch tide readings from CKAN API
 * @param resourceId - The CKAN resource ID
 * @param limit - Number of records to fetch
 * @param offset - Starting position
 */
export async function fetchTideReadings(
  resourceId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<CkanResponse> {
  const url = buildCkanUrl(resourceId, limit, offset);
  return await fetchJson<CkanResponse>(url);
}

/**
 * Store tide readings in the database using UPSERT
 * Updates the tide value if the record exists, inserts if new
 * @param prisma - Prisma client instance
 * @param readings - Array of parsed tide readings
 */
export async function storeTideReadings(
  prisma: PrismaClient,
  readings: ParsedTideReading[],
): Promise<{ processed: number; inserted: number; updated: number }> {
  let processed = 0;
  let inserted = 0;
  let updated = 0;

  for (const reading of readings) {
    // Check if record already exists
    const existing = await prisma.tideReading.findUnique({
      where: {
        stationId_timestamp: {
          stationId: reading.stationId,
          timestamp: reading.timestamp,
        },
      },
    });

    // Use upsert: update if exists, create if doesn't
    await prisma.tideReading.upsert({
      where: {
        stationId_timestamp: {
          stationId: reading.stationId,
          timestamp: reading.timestamp,
        },
      },
      // If record exists, update the tide reading
      update: {
        tide: reading.tide,
      },
      // If record doesn't exist, create it
      create: reading,
    });

    // Track whether this was an insert or update
    if (existing) {
      updated++;
    } else {
      inserted++;
    }
    processed++;
  }

  return { processed, inserted, updated };
}

/**
 * Delete tide readings older than a specified date
 * @param prisma - Prisma client instance
 * @param beforeDate - Delete all readings before this date
 */
export async function deleteOldReadings(
  prisma: PrismaClient,
  beforeDate: Date,
): Promise<number> {
  const result = await prisma.tideReading.deleteMany({
    where: {
      timestamp: {
        lt: beforeDate,
      },
    },
  });

  console.log(
    `Deleted ${result.count} old readings (before ${beforeDate.toISOString()})`,
  );
  return result.count;
}

/**
 * Filter tide records to only include those within a date range
 * @param records - Array of CKAN tide records
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 */
export function filterRecordsByDateRange(
  records: CkanTideRecord[],
  startDate: Date,
  endDate: Date,
): CkanTideRecord[] {
  return records.filter((record) => {
    const recordDate = parseDateTime(record.Date, record.Time);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

/**
 * Calculate date range for tide data storage
 * @param daysToStore - Number of days to store including today (default: 7)
 * @returns Object with date boundaries
 *   - startDate: Start of today (00:00:00)
 *   - endDate: End of the last day in range (23:59:59)
 *   - deleteBeforeDate: Start of today (00:00:00) - anything before this gets deleted
 */
export function calculateDateRange(daysToStore: number = 7): {
  startDate: Date;
  endDate: Date;
  deleteBeforeDate: Date;
} {
  const now = new Date();

  // Start of today (00:00:00)
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // End of the last day in range (23:59:59.999)
  // If daysToStore = 7, this is 6 days from today (today + 6 = 7 days total)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (daysToStore - 1));
  endDate.setHours(23, 59, 59, 999);

  // Delete everything before start of TODAY (00:00:00)
  // This removes all of yesterday and anything older
  const deleteBeforeDate = new Date(startDate);

  return { startDate, endDate, deleteBeforeDate };
}

/**
 * Initialize Prisma client with PostgreSQL adapter
 * @param databaseUrl - PostgreSQL connection string
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
