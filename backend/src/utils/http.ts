/**
 * Reusable HTTP utility for making GET requests
 * This can be used for any API, not just CKAN
 */

/**
 * Fetch data from a URL and parse as JSON
 * @param url - The URL to fetch from
 * @returns Parsed JSON response
 * @throws Error if the request fails
 */
export async function fetchJson<T>(url: string): Promise<T> {
  try {
    // Make the HTTP GET request
    const response = await fetch(url);

    // Check if the response was successful (status 200-299)
    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} - ${response.statusText}`,
      );
    }

    // Parse the JSON response
    const data = await response.json();

    return data as T;
  } catch (error) {
    // Re-throw with more context
    throw new Error(
      `Failed to fetch from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
