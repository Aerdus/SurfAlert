# API Data Ingestion Project Plan

## Project Overview

A modular TypeScript backend to ingest, schedule, and store data from various APIs (starting with QLD Maritime Tide readings) into a PostgreSQL database. Designed for easy expansion and clear separation of concerns.

---

## Learning Style

- **Hands-on:** You (the user) will perform all coding and setup steps yourself.
- **Guided:** I will provide step-by-step instructions, explanations, and answer questions, but will not write or change code/files unless you explicitly request it.
- **Reference:** This document will be referenced throughout the project for consistency and clarity.

---

## Project Stages

### 1. Build the Database

- Install and set up PostgreSQL locally.
- Create a database and user.
- Use a migration tool (e.g., Prisma or TypeORM) to define tables:
  - `stations`: Info about each tide station (name, location, API endpoint, etc.).
  - `tide_readings`: Timestamped tide data linked to a station.

### 2. Connect to an API

- Create a module for each API (e.g., `noosa-heads`, `mooloolaba`).
- Each module fetches, parses, and stores its data.
- Use TypeScript interfaces for structure.

### 3. Create an API Schedule

- Use a scheduler (e.g., node-cron) to run data pulls at set intervals.
- Each API module registers its own schedule.
- Scheduler logs results and errors.

---

## Folder Structure Example

```
project-root/
│
├── database/
│   ├── migrations/
│   └── schema.prisma (or ormconfig.js, etc.)
│
├── src/
│   ├── apis/
│   │   ├── noosa-heads/
│   │   │   └── index.ts
│   │   └── mooloolaba/
│   │       └── index.ts
│   ├── scheduler/
│   │   └── index.ts
│   ├── utils/
│   │   └── http.ts
│   ├── config/
│   │   └── index.ts
│   └── index.ts
│
├── package.json
└── README.md
```

---

## Key Principles

- **Separation of Concerns:** Each folder/module has a single responsibility.
- **Extensibility:** Adding a new station = add a new folder/module, update config, done.
- **Reusability:** Shared code (like HTTP requests) lives in `utils/`.
- **Configurability:** All settings (API URLs, DB credentials) in `config/`.

---

## Progress Log

### Stage 1: Database Setup ✅ COMPLETED

- **2026-02-15:** Decided to use Docker for running the PostgreSQL database for local development. This ensures a clean, consistent, and easily resettable environment.
- **2026-02-15:** Successfully started a PostgreSQL Docker container (`surfalert-postgres`) with a new database (`surfalert_db`) and user (`surfalert_admin`).
- **2026-02-15:** Chose to build the backend (data ingestion/API) as a standalone service, separate from the frontend web app. This will make the codebase more modular, maintainable, and scalable.
- **2026-02-15:** Decided to organize the project with separate 'backend' and 'frontend' folders for clear separation of concerns and easier navigation for developers.
- **2026-02-15:** Installed Prisma in the backend folder, initialized it, and updated the .env file with the PostgreSQL database URL.
- **2026-02-15:** Decided on a two-table database schema: `stations` (for station metadata, including latitude/longitude) and `tide_readings` (for timestamped readings linked to stations). Will use a JSON config file for easy station management, but the database remains the source of truth.
- **2026-02-15:** Successfully connected Prisma to the Docker PostgreSQL instance and ran the initial migration to create the database tables.
- **2026-02-15:** Updated project structure to support multiple station types (tide, wind, wave) with separate config and sync scripts for each. Currently focusing on tide data; wind and wave data will be added later.
- **2026-02-15:** Fixed Prisma 7 compatibility issues - installed PostgreSQL adapter (`pg`, `@prisma/adapter-pg`) and updated PrismaClient initialization to use the adapter pattern required by Prisma 7.
- **2026-02-15:** Successfully ran `syncTideStations.ts` script to sync station metadata from JSON config to database.

### Stage 2: Connect to API 🚧 IN PROGRESS

- **2026-02-15:** Discovered that QLD Government uses CKAN (Comprehensive Knowledge Archive Network) API for tide data access.
- **2026-02-15:** Successfully tested the CKAN API endpoint using PowerShell and analyzed the response structure:
  - API returns data in paginated format with 52,560 total records per station
  - Each record contains: `Date` (DD/MM/YYYY string), `Time` (HH:MM string), `Reading` (tide height as string), `Ind` (indicator flag)
  - Readings are provided every 10 minutes
- **2026-02-15:** **DECISION**: Keep current database structure (DateTime + Float) rather than matching API format (separate Date/Time strings). Rationale: Proper semantic types enable efficient querying, indexing, aggregation, and future-proofing. The conversion cost (2 lines of code) is minimal compared to the benefits.
- **2026-02-15:** Created modular folder structure in `backend/src/`:
  - `types/` - TypeScript interfaces for API responses
  - `utils/` - Reusable HTTP utilities
  - `apis/` - API-specific modules (future: will be moved to `utils/` for tide-specific code)
  - `scripts/` - Executable scripts (moved `syncTideStations.ts` here)
- **2026-02-15:** **DECISION - Rolling Window Storage Strategy**:
  - Only store 7 days of data (today + 6 future days) - configurable parameter
  - Delete all data before today at 00:00:00 (no historical data retention)
  - Use UPSERT to handle prediction updates from QLD (station + timestamp is unique)
  - Focus: Keep database lean, fast, and always current
- **2026-02-15:** Added unique constraint to `TideReading` table: `@@unique([stationId, timestamp])` to enable UPSERT operations and prevent duplicate records.
- **2026-02-15:** Created TypeScript interfaces in `src/types/ckan.ts` to define CKAN API response structure.
- **2026-02-15:** Built reusable HTTP utility (`src/utils/http.ts`) using native fetch API with error handling.
- **2026-02-15:** Implemented tide API module (`src/utils/tideApi.ts`) with functions for:
  - Building CKAN URLs with pagination support
  - Parsing DD/MM/YYYY + HH:MM into DateTime (handling JavaScript's 0-indexed months)
  - Transforming API records into database format (String → Float conversion)
  - Fetching data from CKAN API
  - UPSERT storage (tracks inserts vs updates)
  - Deleting old readings before cutoff date
  - Filtering records by date range
  - Calculating date ranges with configurable retention period
  - Creating Prisma client with PostgreSQL adapter (Prisma 7 pattern)
- **2026-02-15:** **DECISION - Module System**: Fixed import paths by removing `.js` extensions to work with CommonJS module system and ts-node (project uses `module: "commonjs"` in tsconfig.json).
- **2026-02-15:** Built main fetch script (`src/scripts/fetchTideData.ts`) that orchestrates the complete data pipeline:
  - Loads all tide stations from database
  - Calculates 7-day rolling window date range
  - Deletes old data before fetching new
  - Calculates dynamic offset to skip to today's data in API (avoiding fetching all 52,560 records)
  - Fetches ~1,008 records per station (7 days at 10-minute intervals)
  - Filters records to exact date range
  - Transforms and stores using UPSERT
  - Reports comprehensive statistics (deleted, inserted, updated)
- **2026-02-15:** ✅ **Successfully fetched first batch of tide data**: 2,016 readings across 2 stations (Noosa Heads, Mooloolaba), covering 7 days (Feb 15-21, 2026).
- **2026-02-15:** Verified data integrity in PostgreSQL database:
  - Confirmed 2,016 total readings stored correctly
  - Validated 10-minute interval timestamps
  - Confirmed Float conversion (tide values stored as numbers, not strings)
  - Verified timezone handling: Database stores UTC, displays convert to AEST (Australia/Brisbane)
- **2026-02-15:** **Stage 2 Complete** ✅ - Successfully built end-to-end data ingestion pipeline from CKAN API to PostgreSQL database with rolling 7-day window storage.

### Stage 3: REST API & Frontend ✅ COMPLETE

- **2026-02-15:** **DECISION - Separate Backend/Frontend Architecture**: Chose Option B (separate projects) over Option A (Express serves everything) for better scalability and separation of concerns:
  - Backend API runs on port 3001 (API-only)
  - Frontend runs separately on port 3000 or as static file
  - Enables future upgrade to React/Next.js without changing backend
  - Uses CORS to handle cross-origin requests
- **2026-02-15:** Installed Express.js and required packages: `express`, `cors`, `@types/express`, `@types/cors`
- **2026-02-15:** Created RESTful API server (`src/api/server.ts`) with extensible design:
  - `GET /api/stations` - List all stations (works for all data types)
  - `GET /api/stations/:id` - Get specific station details
  - `GET /api/stations/:id/tide-readings` - Get tide readings for a station
  - `GET /api/stats` - Database statistics (total stations, total readings, date range)
  - `GET /api/health` - Health check endpoint
  - **Design Pattern**: Station-centric RESTful structure easily accommodates future wind/wave endpoints
  - Ready for: `/api/stations/:id/wind-readings`, `/api/stations/:id/wave-readings`
  - Implements CORS middleware for cross-origin requests
  - Graceful shutdown handler for clean Prisma disconnection
- **2026-02-15:** Created frontend HTML (`frontend/index.html`) with complete single-page application:
  - **Statistics Dashboard**: Real-time display of total stations, readings, and date range from `/api/stats`
  - **Station Filter**: Dynamic dropdown populated from `/api/stations` - filter by specific station or view all
  - **Tide Data Table**: Sortable display (newest first) of all readings with station ID, timestamp, and tide level
  - **Timezone Conversion**: Automatic UTC to AEST conversion for human-readable timestamps
  - **Modern UI**: Responsive gradient design with stat boxes, loading states, and error handling
  - **Client-side JavaScript**: Vanilla JS with fetch API - no framework dependencies
- **2026-02-15:** Fixed API response field names to match frontend expectations (`totalStations`, `totalReadings`, `oldestReading`, `newestReading`)
- **2026-02-15:** ✅ **Successfully tested complete system**: Backend API serving data on port 3001, frontend displaying 2,016 tide readings with station filtering, statistics dashboard showing database metrics, timezone conversion working correctly (UTC → AEST)
- **2026-02-15:** **Stage 3 Complete** ✅ - Full-stack application operational: RESTful backend API + interactive HTML frontend with real-time data visualization

### Stage 3.5: Schema Evolution & Future Planning 🏗️ COMPLETE

**Context**: Planning for multi-source data integration (tide stations, wave buoys, wind stations) with location-based queries for surf break forecasting.

**End Goal**: User selects a surf break on interactive map → System finds nearest tide station + wave buoy + wind station → Display combined forecast.

- **2026-02-15:** **Database Schema Migration** - Evolved Station table to support multiple data types:
  - Added `stationType` field with default "TIDE" (supports "TIDE" | "WAVE" | "WIND")
  - Added `createdAt` timestamp for audit trails
  - Renamed `readings` relation to `tideReadings` for specificity (prepares for `waveReadings`, `windReadings`)
  - Added database indexes: `@@index([stationType])` and `@@index([latitude, longitude])` for spatial query optimization
  - Migration applied: `20260215082353_add_station_type_and_geo_indexes`
- **2026-02-15:** Updated backend API to include `tideReadings` relation when fetching all stations
- **2026-02-15:** Regenerated Prisma Client to reflect schema changes (no TypeScript errors)

**Future Schema Additions (Ready for Implementation)**:

```prisma
model WaveReading {
  id        Int      @id @default(autoincrement())
  stationId Int
  timestamp DateTime
  height    Float    // meters
  period    Float?   // seconds
  direction Float?   // degrees
  station   Station  @relation(fields: [stationId], references: [id])

  @@unique([stationId, timestamp])
  @@index([timestamp])
}

model WindReading {
  id        Int      @id @default(autoincrement())
  stationId Int
  timestamp DateTime
  speed     Float    // km/h or m/s
  direction Float?   // degrees
  gust      Float?   // km/h or m/s
  station   Station  @relation(fields: [stationId], references: [id])

  @@unique([stationId, timestamp])
  @@index([timestamp])
}

model SurfBreak {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  latitude    Float
  longitude   Float
  description String?
  createdAt   DateTime @default(now())

  // Pre-calculated nearest stations (updated periodically)
  tideStationId Int?
  waveStationId Int?
  windStationId Int?

  @@index([latitude, longitude])
}
```

**Future API Endpoints (Planned)**:

- ✅ `POST /api/fetch/tide` - Manually trigger tide data fetch (COMPLETED)
- `POST /api/fetch/wave` - Manually trigger wave data fetch
- `POST /api/fetch/wind` - Manually trigger wind data fetch
- `POST /api/fetch/all` - Fetch all data types
- `GET /api/surf-breaks` - List all surf breaks
- `GET /api/surf-breaks/:id/forecast` - Get combined forecast (tide + wave + wind) for a break
- `GET /api/stations/:id/wave-readings` - Get wave buoy data
- `GET /api/stations/:id/wind-readings` - Get wind station data

**Location-Based Queries (To Be Implemented)**:

- **Distance Calculation**: Haversine formula to calculate distance between lat/long coordinates
- **Nearest Station Finder**: Given a surf break location, find nearest station of each type (tide/wave/wind)
- **Composite Forecast**: Combine data from multiple nearest stations to provide complete surf forecast

**Design Rationale**:

- **Extensible Schema**: Station table supports multiple data types without restructuring
- **Performance**: Spatial indexes optimize distance-based queries
- **Data Integrity**: Unique constraints prevent duplicates across all reading types
- **Scalability**: Separate tables for each reading type allows independent growth and query optimization

### Stage 4: Manual Triggers & Scheduling ✅ COMPLETE (Manual Triggers)

**Goal**: Build manual trigger system first (API + frontend button), then add automated scheduling later using the same code.

- **2026-02-15:** Refactored `fetchTideData.ts` into callable, exportable function:
  - Created `FetchResult` interface for standardized return values
  - Renamed `main()` to `fetchAllTideData()` - exportable and callable
  - Added proper return values (success/error cases)
  - Used `require.main === module` pattern - works as both script and importable module
  - Function can be called by API endpoints or scheduled tasks (same code!)
- **2026-02-15:** Added manual trigger API endpoint:
  - `POST /api/fetch/tide` - Triggers tide data fetch for all stations
  - Returns JSON with stats (deleted, inserted, updated, totalProcessed)
  - Handles errors gracefully with proper HTTP status codes
  - Fixed URL pattern to `/api/fetch/tide` for consistency
- **2026-02-15:** ✅ **Added frontend manual trigger button**:
  - Red "🌊 Fetch Tide Data" button in Tide Data card
  - Real-time status display showing fetch progress
  - Shows detailed results (deleted, inserted, updated counts)
  - Automatically refreshes data display after successful fetch
  - Error handling with user-friendly messages
  - Loading states prevent duplicate requests
- **2026-02-15:** ✅ **Successfully tested end-to-end**: Button triggers API → Fetches data from CKAN → Updates database → Displays results

**Future Automation**:

- Implement automated daily scheduling using node-cron (will call same `fetchAllTideData()` function)
- Add error notifications and monitoring
- Implement retry logic for failed API calls

---

## Design Decisions

### Database Schema

- **Multi-Type Station Support**: Station table includes `stationType` field ("TIDE" | "WAVE" | "WIND") to support different data sources in a unified schema
- **Location-Based Design**: Latitude and longitude fields with spatial indexes enable distance calculations for finding nearest stations to surf breaks
- **Normalized DateTime**: Store combined timestamp (not separate Date/Time strings) for efficient querying and indexing
- **Proper Data Types**: Use Float for tide readings (not strings) for calculations and aggregations
- **Transform on Import**: Convert API data formats during ingestion, store in semantic types
- **Unique Constraint**: `@@unique([stationId, timestamp])` on TideReading table enables UPSERT and prevents duplicates
- **Iterative Development**: Build tide API first, add wind/wave tables later when needed (YAGNI principle)
- **Timezone Handling**: Store all timestamps in UTC for consistency; convert to local time (AEST/Australia/Brisbane) for display in frontend

### Data Retention Strategy

- **Rolling 7-Day Window**: Store today + 6 future days (configurable via parameter)
- **Daily Cleanup**: Delete all readings before today at 00:00:00 (no historical data kept)
- **UPSERT Approach**: Update existing records if QLD modifies predictions, insert new records
- **Station + Timestamp Uniqueness**: Each station can only have one reading per timestamp
- **Rationale**: Keeps database lean, queries fast, and data always current

### API Integration

- **CKAN API Approach**: Use datastore_search endpoint with pagination support
- **Dynamic Offset Calculation**: Calculate days since API start date (Jan 1, 2026) to skip directly to current date data, avoiding fetching all 52,560 records (e.g., 45 days × 144 records/day = 6,480 offset)
- **Efficient Data Fetching**: Only fetch needed records (~1,008 for 7 days) instead of all historical data
- **Data Filtering**: Filter records by date range before processing to reduce database operations
- **Error Handling**: TBD - implement retry logic and error logging
- **Modular Design**: API-specific logic in separate modules for maintainability

### Code Architecture

- **Separation of Concerns**: HTTP utilities, type definitions, API logic, and scripts in separate files
- **Reusability**: Generic HTTP fetch function can be used for any JSON API
- **Type Safety**: TypeScript interfaces for all API responses and database models
- **Prisma 7 Pattern**: Use PostgreSQL adapter with connection pool for database access
- **API-First Architecture**: Backend RESTful API (port 3001) separate from frontend (future separate port)
  - **Rationale**: Enables future mobile apps, third-party integrations, and independent scaling
  - **Benefits**: Clear separation between data layer and presentation, supports multiple client types
  - **Extensibility**: API structure designed to easily add wind/wave endpoints alongside tide data

---

## Reference Links

- [Open Data QLD Maritime Tide Readings](https://www.msq.qld.gov.au/tides/open-data)
- [Noosa Heads Tide Data](https://www.data.qld.gov.au/dataset/noosa-head-tide-gauge-predicted-interval-data/resource/1542ee15-6f50-414f-bc15-66732f1f7eae)
- [Mooloolaba Tide Data](https://www.data.qld.gov.au/dataset/mooloolaba-tide-gauge-predicted-interval-data/resource/b0b2fb21-4fdc-4446-8423-114af3e07de4)

---

## Next Steps

### Stage 2: API Integration ✅ COMPLETED

1. ✅ **Create TypeScript Interfaces** (`src/types/ckan.ts`)
2. ✅ **Build HTTP Utility** (`src/utils/http.ts`)
3. ✅ **Create Tide API Module** (`src/utils/tideApi.ts`)
4. ✅ **Build Fetch Script** (`src/scripts/fetchTideData.ts`)
5. ✅ **Test and Validate**
   - Verified 2,016 readings stored correctly across 2 stations
   - Confirmed UPSERT logic works (ready for re-run testing)
   - Validated timezone handling (UTC storage, AEST display)
   - Confirmed 7-day rolling window and old data deletion

### Stage 3: REST API & Frontend ✅ COMPLETED

1. ✅ **Build Express REST API** (`src/api/server.ts`)
   - GET /api/stations - List all tide stations with readings
   - GET /api/stations/:id - Get specific station details
   - GET /api/stations/:id/tide-readings - Get tide readings for a station
   - GET /api/stats - Database statistics
   - GET /api/health - Health check endpoint
2. ✅ **Create Simple HTML Frontend** (`frontend/index.html`)
   - Display tide data in table format
   - Filter by station (dropdown with all stations)
   - Show database statistics dashboard
   - Convert UTC to AEST for display
3. ✅ **Test Data Visualization**
   - Verified data displays correctly in modern gradient UI
   - Tested station filters (All Stations, Noosa Heads, Mooloolaba)
   - Confirmed timezone conversions working correctly

### Stage 3.5: Schema Evolution ✅ COMPLETED

1. ✅ **Migrated Database Schema**
   - Added `stationType` field for multi-source support
   - Added `createdAt` timestamp
   - Renamed `readings` to `tideReadings`
   - Added spatial indexes for location-based queries
2. ✅ **Updated Backend Code**
   - Regenerated Prisma Client
   - Updated API to include tideReadings relation
   - Verified no TypeScript errors

### Stage 4: Scheduling & Automation 📋 NEXT

- Implement scheduling with node-cron for automated daily updates
- Add manual trigger endpoints (POST /api/fetch/tide, etc.)
- Add comprehensive error handling and retry logic
- Implement structured logging system
- Add data validation and quality checks

### Stage 5: Wind & Wave Integration 📋 FUTURE

- Find and integrate Wave Buoy APIs (similar to tide station pattern)
- Find and integrate Wind Station APIs
- Create `WaveReading` and `WindReading` tables
- Build wave and wind data fetch scripts
- Add POST /api/fetch/wave and POST /api/fetch/wind endpoints
- Update frontend to display wind and wave data

### Stage 6: Location-Based Forecasting 📋 FUTURE

- Implement haversine distance calculation utility
- Add `SurfBreak` table for user-selected surf locations
- Create algorithm to find nearest tide/wave/wind stations to any surf break
- Build GET /api/surf-breaks/:id/forecast endpoint (combined forecast)
- Add interactive map to frontend for selecting surf breaks
- Display combined forecast (tide + wave + wind) for each break
