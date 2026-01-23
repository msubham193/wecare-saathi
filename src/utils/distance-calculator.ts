/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get human-readable address from coordinates using Nominatim (OpenStreetMap)
 * Free and no API key required - works perfectly with Leaflet maps
 * @param lat Latitude
 * @param lng Longitude
 * @returns Address string or coordinates as fallback
 */
export async function getAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const axios = require('axios');
    const { logger } = require('../config/logger');
    
    // Use Nominatim reverse geocoding API (OpenStreetMap)
    // Completely free, no API key needed
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'WeCare-Saathi-SOS-App/1.0', // Required by Nominatim usage policy
      },
      timeout: 5000,
    });

    if (response.data && response.data.display_name) {
      logger.info('Address resolved via Nominatim (OpenStreetMap)', {
        lat,
        lng,
        address: response.data.display_name,
      });
      return response.data.display_name;
    }

    logger.warn('No address found for coordinates', { lat, lng });
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    // Return coordinates as fallback if geocoding fails
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/**
 * Sort locations by distance from a reference point
 * @param reference Reference point {lat, lng}
 * @param locations Array of locations with lat, lng
 * @returns Sorted array with distance added
 */
export function sortByDistance<T extends { lat: number; lng: number }>(
  reference: { lat: number; lng: number },
  locations: T[]
): Array<T & { distanceKm: number }> {
  return locations
    .map(location => ({
      ...location,
      distanceKm: calculateDistance(
        reference.lat,
        reference.lng,
        location.lat,
        location.lng
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
