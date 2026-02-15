// TypeScript interfaces for CKAN API responses

/**
 * Individual tide reading record from the CKAN API
 */
export interface CkanTideRecord {
  _id: number; // Sequential ID (from API, we won't use it)
  Date: string; // Format: "DD/MM/YYYY" e.g., "01/01/2026"
  Time: string; // Format: "HH:MM" (24-hour) e.g., "00:00"
  Reading: string; // Tide height as string e.g., "0.430"
  Ind: string; // Indicator/quality flag (we'll ignore for now)
}

/**
 * Field definition in CKAN response
 */
export interface CkanField {
  id: string; // Field name
  type: string; // Data type (text, int, etc.)
}

/**
 * Pagination links
 */
export interface CkanLinks {
  start: string; // First page URL
  next?: string; // Next page URL (undefined on last page)
}

/**
 * The main result object from CKAN
 */
export interface CkanResult {
  resource_id: string; // Resource ID we queried
  fields: CkanField[]; // Field definitions
  records: CkanTideRecord[]; // Array of tide records
  total: number; // Total number of records
  total_was_estimated: boolean; // Whether total is estimated
  limit: number; // Records per page
  _links: CkanLinks; // Pagination links
}

/**
 * Top-level CKAN API response wrapper
 */
export interface CkanResponse {
  help: string; // URL to API documentation
  success: boolean; // Whether the request succeeded
  result: CkanResult; // The actual data
}
