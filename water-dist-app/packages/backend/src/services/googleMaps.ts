import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

/**
 * Geocode an address to get latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not set");
      return null;
    }

    const response = await client.geocode({
      params: {
        address,
        key: apiKey,
      },
    });

    if (response.data.results.length === 0) {
      console.warn(`No geocoding results for address: ${address}`);
      return null;
    }

    const location = response.data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Calculate distance and duration between two points using Distance Matrix API
 */
export async function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distance: number; duration: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not set");
      return null;
    }

    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        key: apiKey,
      },
    });

    const element = response.data.rows[0]?.elements[0];

    if (!element || element.status !== "OK") {
      console.warn("No route found between origin and destination");
      return null;
    }

    return {
      distance: element.distance.value, // in meters
      duration: element.duration.value, // in seconds
    };
  } catch (error) {
    console.error("Distance calculation error:", error);
    return null;
  }
}
