# SurfAlert v3 - Project Plan

## Vision

A web app that shows users surf conditions (tide, wave, wind) for their favorite beaches in Queensland.

**Problem we're solving**:

- Surfers need to check multiple sites for tide/wave/wind data
- Data is scattered across different APIs
- No single source of truth

**Solution**:

- Centralized app that aggregates all data
- Shows predictions on a map/list view
- Users can save their favorite spots

---

## Phased Approach

### Phase 1: Tide Data (Current)

**Goal**: Build a working system that fetches, stores, and displays tide data

**What we'll build**:

1. Database to store locations & tide predictions
2. Backend server that can fetch tide data from QLD API
3. API endpoints that frontend can call
4. Frontend to display tide data

**Why Phase 1 first**:

- Tide data is simpler (only 1 value: height)
- QLD provides free public API
- Sets up the architecture for wave/wind later

**Done when**: User can add a location, fetch tide data, see predictions displayed

#### Tide Data Strategy

**Data Resolution**: 10-minute intervals

- **Per day**: 144 data points (24 hours ÷ 10 minutes)
- **Per break**: 1,008 data points (7 days × 144 points)
- **Chart display**: Detailed tide chart showing all 10-minute intervals

**Fetching Strategy**: Scheduled, rolling 7-day window

- **Frequency**: Every 24 hours (automated scheduled task)
- **Data retained**: Always 7 days of future predictions
- **Example flow**:
  - Day 1 (Feb 14): Fetch Feb 14 → Feb 20 predictions
  - Day 2 (Feb 15): Delete Feb 14 data, fetch Feb 21 predictions (now have Feb 15 → Feb 21)
  - Day 3 (Feb 16): Delete Feb 15 data, fetch Feb 22 predictions (now have Feb 16 → Feb 22)

**Why this approach**:

- Surfers need future predictions, not historical data
- Keeps database size stable (not growing forever)
- Fresh predictions = accurate forecasts
- 24-hour frequency = efficient (minimal API calls)

**Implementation notes**:

1. Tide data fetch can be triggered manually (via API endpoint)
2. Automatic scheduling will be added later (cron job or similar)
3. Each break fetches from its closest tide station
4. When data is fetched, old data is deleted to keep database clean

---

### Phase 2: Wave Data (Future)

**Goal**: Add wave height/period predictions

**What we'll need**:

1. New `WaveDataSource` class (similar to TideDataSource)
2. Integration with Stormglass.io API
3. New database table for wave data
4. Frontend display for wave data

**Why separate from Phase 1**:

- Different API (Stormglass, not QLD)
- Different data structure (wave height + period + direction)
- Teaches the "add new data source" pattern

---

### Phase 3: Wind Data (Future)

**Goal**: Add wind speed/direction predictions

**Similar to Phase 2**: New data source + database + frontend display

---

### Phase 4: Frontend Polish (Future)

**Goal**: Make it look nice and be easy to use

**What we'll do**:

- Better UI/UX
- Map view of spots
- Styling
- Mobile responsiveness

---

## Tech Stack (Why Each Choice)

| Tech                  | Purpose             | Beginner Friendly?                  |
| --------------------- | ------------------- | ----------------------------------- |
| **Node.js + Express** | Backend server      | Yes - JavaScript everywhere         |
| **TypeScript**        | Type safety         | Yes - catches errors early          |
| **Prisma**            | Database queries    | Yes - SQL translated to JavaScript  |
| **PostgreSQL**        | Data storage        | Yes - reliable, free                |
| **Docker**            | Run PostgreSQL      | Yes - one command setup             |
| **React**             | Frontend            | Medium - popular, lots of tutorials |
| **Vite**              | Frontend build tool | Yes - fast, simple                  |

---

## Architecture (Why It's Designed This Way)

```
Frontend (React)
       ↓
Routes (Express endpoints)
       ↓
Services (Business logic)
       ↓
Data Sources (External APIs)
Database (PostgreSQL via Prisma)
```

**Why this structure**:

1. **Separation of concerns** - each layer does ONE thing
2. **Easy to test** - can test each layer independently
3. **Scalable** - adding Wave/Wind data means adding ONE new DataSource class
4. **No duplication** - Services don't get rewritten for each data type

**Analogy**: Like a restaurant kitchen

- Front counter (Routes) = takes orders
- Manager (Services) = makes decisions, coordinates
- Chefs (Data Sources) = fetch ingredients, prepare food
- Pantry (Database) = stores food

Each person has a job. Nobody does 2 jobs.

---

## What Each Layer Does

### Layer 1: Routes (HTTP Endpoints)

**Job**: Listen for HTTP requests, pass to service, return response

**Examples**:

```
POST /api/breaks
  ↓ Service creates break ↓
Returns the new break

POST /api/tides/:breakId/refresh
  ↓ Service fetches & stores ↓
Returns success message

GET /api/tides/:breakId?days=7
  ↓ Service retrieves from DB ↓
Returns tide data
```

**Who uses this**: Frontend (ONLY frontend should call these)

### Layer 2: Services

**Job**: Make decisions, coordinate between layers, handle business logic

**Examples**:

- "Which tide station is closest?" (math)
- "Should I fetch fresh data or use cached?" (logic)
- "Store this data in the database" (coordination)

**Who uses this**: Routes (ONLY routes should call services)

### Layer 3: Data Sources

**Job**: Get data from external APIs

**Examples**:

- TideDataSource: Talks to QLD CKAN API
- WaveDataSource: Talks to Stormglass.io API
- WindDataSource: Talks to BOM API

**Who uses this**: Services (ONLY services should call data sources)

### Layer 4: Database

**Job**: Save and retrieve data

**Using**: Prisma (handles SQL for us)

**Who uses this**: Services (ONLY services should call database)

---

## Database Schema

### Break (Location)

Represents a user's favorite spot

```
id: abc-123-def
name: "Surfers Paradise"
latitude: -28.0
longitude: 153.43
timezone: "Australia/Brisbane"
createdAt: 2026-02-14
updatedAt: 2026-02-14
```

Has relationship to: TideData (one Break → many TideData)

### TideData (Tide Prediction)

A single tide height at a specific time

```
id: xyz-789-uvw
breakId: abc-123-def (links to Break)
timestamp: 2026-02-15 10:30
heightM: 1.5
stationType: "noosa-heads"
```

Belongs to: Break (one TideData ← one Break)

### WaveData (Future)

```
id: wave-123
breakId: abc-123-def
timestamp: 2026-02-15 10:30
heightM: 2.1
periodSeconds: 12
direction: "E"
```

### WindData (Future)

```
id: wind-123
breakId: abc-123-def
timestamp: 2026-02-15 10:30
speedMs: 8.5
direction: "NE"
```

---

## Known Tide Stations (QLD)

These are the tide measurements available from QLD government:

| Station     | Latitude | Longitude | Dataset Name                                  |
| ----------- | -------- | --------- | --------------------------------------------- |
| Noosa Heads | -26.39   | 153.09    | noosa-head-tide-gauge-predicted-interval-data |
| Mooloolaba  | -26.68   | 153.12    | mooloolaba-tide-gauge-predicted-interval-data |

**How it works**:

1. User adds location at -26.4, 153.08 (random spot)
2. Our code calculates: "Noosa Heads is closest"
3. We fetch tide data FROM Noosa station
4. Store with `stationType: "noosa-heads"`
5. User sees Noosa's tide (it's close enough to their spot)

---

## Data Flow (End to End)

### "Get Tide Data" Button Clicked

```
1. Frontend calls:
   POST /api/tides/break-abc-123/refresh?days=7

2. Route handler receives request
   ↓ calls TideService.fetchAndStoreTideData()

3. TideService:
   - Finds closest station to break's location
   - Creates TideDataSource for that station
   ↓ calls TideDataSource.getData()

4. TideDataSource:
   - Calls ckanAdapter to fetch raw data from QLD API
   - Calls fieldNormalizer to clean it up
   ↓ returns list of {timestamp, heightM}

5. TideService:
   - Takes the cleaned data
   ↓ calls database to save it

6. Database:
   - Saves all tide points to TideData table
   ↓ returns success

7. Route:
   ↓ returns to frontend

8. Frontend:
   - Shows success message
   OR calls GET /api/tides/break-abc-123 to display data
```

---

## Code Organization

```
backend/
├── src/
│   ├── types/
│   │   ├── ckan.ts              (CKAN API types)
│   │   ├── entities.ts          (Break, TideData, etc.)
│   │   └── index.ts             (export all types)
│   │
│   ├── data-sources/
│   │   ├── base/
│   │   │   └── DataSource.ts    (abstract base class)
│   │   ├── tide/
│   │   │   ├── ckanAdapter.ts   (talk to QLD API)
│   │   │   ├── fieldNormalizer.ts (clean up data)
│   │   │   └── TideDataSource.ts  (orchestrate)
│   │   ├── wave/                (future)
│   │   └── wind/                (future)
│   │
│   ├── database/
│   │   ├── client.ts            (connect to PostgreSQL)
│   │   └── queries/
│   │       ├── break.ts         (save/get breaks)
│   │       ├── tide.ts          (save/get tide)
│   │       ├── wave.ts          (future)
│   │       └── wind.ts          (future)
│   │
│   ├── services/
│   │   ├── BreakService.ts      (manage breaks)
│   │   ├── TideService.ts       (manage tides)
│   │   ├── WaveService.ts       (future)
│   │   └── WindService.ts       (future)
│   │
│   ├── routes/
│   │   ├── health.ts            (health check endpoint)
│   │   ├── breaks.ts            (break endpoints)
│   │   ├── tides.ts             (tide endpoints)
│   │   ├── waves.ts             (future)
│   │   └── winds.ts             (future)
│   │
│   ├── server.ts                (create Express app)
│   └── index.ts                 (start server)
│
├── prisma/
│   └── schema.prisma            (database definition)
│
└── package.json
```

---

## Development Workflow

1. **Database first**: Define schema (what to store)
2. **Data source next**: Learn to fetch from API (CKAN)
3. **Service next**: Logic for when/what to fetch
4. **Routes next**: HTTP endpoints
5. **Frontend next**: Display the data

**Not**: "Let's code everything at once!"

---

## Success Criteria (Phase 1)

✅ PostgreSQL is running in Docker  
✅ Prisma can connect to database  
✅ Can create a Break in database  
✅ Can trigger tide data fetch from QLD API  
✅ Tide data is stored in database  
✅ Can retrieve tide data via API endpoint  
✅ Frontend displays the tide data

**That's Phase 1 complete!** 🎉

---

## Testing Strategy

For each layer, we'll test independently:

1. **Types**: Check TypeScript compiler
2. **Data Source**: Test fetching from QLD API directly
3. **Service**: Test logic (closest station calculation)
4. **Database**: Test saving/retrieving with Prisma
5. **Route**: Test API endpoint with curl/Postman
6. **Frontend**: Test display in browser

**Rule**: Don't move forward until current layer works!

---

## Key Learning Moments

As we build, you'll learn:

1. **What is a database schema?** (tables, relationships)
2. **How does async/await work?** (fetching data without freezing)
3. **What is TypeScript?** (types catch bugs)
4. **How do API boundaries work?** (each layer only talks to the one below)
5. **What is a REST endpoint?** (GET/POST/PUT/DELETE)
6. **How does Prisma work?** (ORM, migrations)
7. **How do React components work?** (UI, state, props)

Each concept builds on the previous one.

---

## Timeline Estimate

- **Database setup**: 1-2 sessions
- **Basic server**: 1 session
- **Fetch from QLD API**: 2-3 sessions (lots of debugging)
- **Store in database**: 1 session
- **Create API routes**: 1-2 sessions
- **Frontend display**: 2-3 sessions

**Total**: ~10-15 learning sessions

---

## Questions to Answer Today

Before we start coding:

1. Does the architecture make sense?
2. Do you understand why we separate layers?
3. Are you ready to start with database setup?
4. Any questions about the overall flow?
