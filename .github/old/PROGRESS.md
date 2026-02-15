# SurfAlert v3 — Progress Tracker

## Lesson Progress

### Lesson 1: Project Architecture & Tech Stack

- Discussed three-layer architecture (Routes → Services → DataSources → Database)
- Explained tech stack: Node.js, Express, TypeScript, Prisma, PostgreSQL, Docker

### Lesson 2: Database Schema Design

- Decided to store 7 days of tide predictions at 10-minute intervals (1,008 points per break)
- Designed two tables: Break (locations) and TideData (predictions)
- Explained one-to-many relationships and indexes

### Lesson 3: Writing the Prisma Schema

- Created `backend/prisma/schema.prisma` with Break and TideData models
- Explained each field, relationships, and indexing

### Lesson 4: Environment & Config

- Decided to use a `.env` file for database credentials and config
- Created `backend/src/config.ts` for app configuration
- Populated `.env` with DB credentials and full DATABASE_URL

### Lesson 5: Project Setup & Migration Prep

- Created `backend/package.json` with scripts and dependencies
- Ran `npm install` to generate `package-lock.json` and install dependencies

---

## Next Step

- Run Prisma migration to create tables in the database

---

**This file will be updated after each lesson or major step!**
