# SurfAlert

A modular TypeScript backend system for ingesting, storing, and serving marine data (tide predictions, wave conditions, wind data) from various APIs into a PostgreSQL database. Built with extensibility in mind to support future integration of multiple data sources for surf forecasting.

## 🌊 Features

- **Automated Tide Data Ingestion**: Fetches 7-day tide predictions from Queensland Government CKAN API
- **RESTful API**: Express.js backend serving tide readings and station data
- **Interactive Dashboard**: Web interface for viewing statistics, filtering stations, and monitoring data
- **Manual Data Triggers**: On-demand data fetching with real-time status updates
- **Type-Safe Database**: Prisma ORM with PostgreSQL for robust data management
- **Extensible Architecture**: Designed to support wave buoy and wind station data in the future

## 🛠️ Tech Stack

### Backend

- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **Prisma 7.4.0** - Modern ORM with PostgreSQL adapter
- **PostgreSQL 18.2** - Relational database (Docker)
- **pg** - PostgreSQL driver

### Frontend

- **HTML/CSS/JavaScript** - Simple SPA for data visualization
- **Fetch API** - HTTP client for backend communication

### Development Tools

- **ts-node** - TypeScript execution
- **Docker** - Database containerization
- **Git** - Version control

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Docker** and Docker Compose
- **npm** or **yarn**
- **Git**

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Aerdus/SurfAlert.git
cd SurfAlert
```

### 2. Start PostgreSQL Database

```bash
docker run -d \
  --name surfalert-postgres \
  -e POSTGRES_USER=surfalert_admin \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=surfalert_db \
  -p 5432:5432 \
  postgres:18.2
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://surfalert_admin:your_secure_password@localhost:5432/surfalert_db"
PORT=3001
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Run Database Migrations

```bash
npx prisma migrate deploy
```

### 6. Sync Tide Stations

Load initial station metadata:

```bash
npx ts-node scripts/syncTideStations.ts
```

### 7. Fetch Initial Tide Data

```bash
npx ts-node src/scripts/fetchTideData.ts
```

## 🏃 Running the Application

### Start the Backend API

```bash
cd backend
npx ts-node src/api/server.ts
```

The API will start on `http://localhost:3001`

### Access the Frontend

Open `frontend/index.html` in your browser, or serve it with a simple HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server frontend -p 8000
```

Then navigate to `http://localhost:8000`

## 📡 API Endpoints

### Stations

- **GET** `/api/stations` - List all tide stations with their readings
- **GET** `/api/stations/:id` - Get specific station details
- **GET** `/api/stations/:id/tide-readings` - Get tide readings for a station

### Data Management

- **POST** `/api/fetch/tide` - Manually trigger tide data fetch
  ```json
  Response: {
    "success": true,
    "dataType": "TIDE",
    "deleted": 0,
    "inserted": 2016,
    "updated": 0,
    "totalProcessed": 2016
  }
  ```

### Monitoring

- **GET** `/api/stats` - System statistics (total stations, readings, date ranges)
- **GET** `/api/health` - Health check endpoint

## 📁 Project Structure

```
surfalertV1-app/
├── backend/
│   ├── config/
│   │   └── tide_stations.json      # Station metadata
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/              # Migration history
│   ├── src/
│   │   ├── api/
│   │   │   └── server.ts            # Express API server
│   │   ├── scripts/
│   │   │   └── fetchTideData.ts     # Data ingestion script
│   │   ├── types/
│   │   │   └── ckan.ts              # TypeScript interfaces
│   │   └── utils/
│   │       ├── http.ts              # HTTP utilities
│   │       └── tideApi.ts           # Tide API functions
│   ├── .env                         # Environment variables (not in git)
│   └── package.json
├── frontend/
│   └── index.html                   # Web dashboard
├── .gitignore
└── README.md
```

## 🗄️ Database Schema

### Station

- `id` - Unique identifier
- `name` - Station name (e.g., "Noosa Heads")
- `stationType` - Type of station (default: "TIDE")
- `apiUrl` - CKAN resource URL
- `latitude` / `longitude` - Geographic coordinates
- `createdAt` - Record creation timestamp

### TideReading

- `id` - Unique identifier
- `stationId` - Foreign key to Station
- `timestamp` - UTC timestamp of reading
- `tide` - Tide height in meters
- **Unique constraint**: (stationId, timestamp)

## 🔄 Data Flow

1. **Station Sync**: Loads station metadata from JSON into database
2. **Data Fetch**: Queries CKAN API for 7-day predictions (10-minute intervals)
3. **UPSERT**: Inserts new readings, updates existing ones
4. **Cleanup**: Removes readings older than 7 days
5. **API Serving**: Express endpoints serve data to frontend
6. **Visualization**: Dashboard displays statistics and readings

## 🎯 Future Roadmap

### Stage 4: Automation (In Progress)

- ✅ Manual trigger system via POST endpoint
- ⏳ Automated scheduling with node-cron
- ⏳ Error notifications and monitoring
- ⏳ Retry logic for failed API calls

### Stage 5: Additional Data Sources

- [ ] Wave buoy data integration
- [ ] Wind station data integration
- [ ] Multi-source data validation

### Stage 6: Location-Based Forecasting

- [ ] SurfBreak table for surf spots
- [ ] Haversine distance calculation
- [ ] Nearest station finder
- [ ] Composite forecast endpoint combining tide/wave/wind

### Stage 7: Production Features

- [ ] User authentication
- [ ] Favorite locations
- [ ] Push notifications
- [ ] Mobile app

## 🧪 Development

### Run Migrations

```bash
npx prisma migrate dev --name migration_description
```

### View Database

```bash
npx prisma studio
```

### Check TypeScript Errors

```bash
npx tsc --noEmit
```

## 🤝 Contributing

This is a learning project built to understand:

- TypeScript backend development
- API integration patterns
- Database design and optimization
- RESTful API design
- Data ingestion pipelines

## 📄 License

MIT

## 🌐 Data Sources

- **Tide Predictions**: [Queensland Government Open Data Portal](https://www.data.qld.gov.au/)
  - Dataset: Maritime Safety Queensland - Tide Predictions
  - Update Frequency: 10-minute intervals
  - Coverage: 7-day rolling window

## 📧 Contact

Built by [Aerdus](https://github.com/Aerdus)

---

**Note**: This project is under active development. Features and documentation are subject to change.
