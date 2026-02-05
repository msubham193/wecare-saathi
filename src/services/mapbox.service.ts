import axios from 'axios';
import { logger } from '../config/logger';
import { config } from '../config';

export interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  text: string;
}

export interface MapboxSearchResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface PoliceStationSearchResult {
  mapboxPlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
  pincode?: string;
}

export class MapboxService {
  private readonly baseUrl = 'https://api.mapbox.com';
  private readonly accessToken: string;

  constructor() {
    this.accessToken = config.mapbox.accessToken;
    if (!this.accessToken) {
      logger.warn('Mapbox access token not configured');
    }
  }

  /**
   * Search for police stations using Mapbox Geocoding API
   * Uses POI (Point of Interest) search with "police" category
   */
  async searchPoliceStations(
    query: string,
    options: {
      proximity?: { lat: number; lng: number };
      country?: string;
      limit?: number;
      bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    } = {}
  ): Promise<PoliceStationSearchResult[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Mapbox access token not configured');
      }

      const {
        proximity,
        country = 'IN', // Default to India
        limit = 10,
        bbox,
      } = options;

      // Build query with "police station" context
      const searchQuery = query.toLowerCase().includes('police')
        ? query
        : `${query} police station`;

      const params: Record<string, string> = {
        access_token: this.accessToken,
        types: 'poi',
        limit: limit.toString(),
        country,
        language: 'en',
      };

      // Add proximity bias if provided
      if (proximity) {
        params.proximity = `${proximity.lng},${proximity.lat}`;
      }

      // Add bounding box if provided
      if (bbox) {
        params.bbox = bbox.join(',');
      }

      const response = await axios.get<MapboxSearchResponse>(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json`,
        { params, timeout: 10000 }
      );

      if (!response.data.features) {
        return [];
      }

      // Filter for police-related POIs and transform results
      const policeStations = response.data.features
        .filter(feature => this.isPoliceStation(feature))
        .map(feature => this.transformToPoliceStation(feature));

      logger.info(`Mapbox search returned ${policeStations.length} police stations`, {
        query: searchQuery,
        totalResults: response.data.features.length,
      });

      return policeStations;
    } catch (error: any) {
      logger.error('Mapbox search failed:', error.message);
      throw new Error('Failed to search police stations');
    }
  }

  /**
   * Get details for a specific place by Mapbox place ID
   */
  async getPlaceDetails(mapboxPlaceId: string): Promise<PoliceStationSearchResult | null> {
    try {
      if (!this.accessToken) {
        throw new Error('Mapbox access token not configured');
      }

      const response = await axios.get<MapboxSearchResponse>(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${mapboxPlaceId}.json`,
        {
          params: {
            access_token: this.accessToken,
          },
          timeout: 10000,
        }
      );

      if (!response.data.features || response.data.features.length === 0) {
        return null;
      }

      return this.transformToPoliceStation(response.data.features[0]);
    } catch (error: any) {
      logger.error('Mapbox place details fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to find nearby police stations
   */
  async findNearbyPoliceStations(
    latitude: number,
    longitude: number,
    _radiusKm: number = 10
  ): Promise<PoliceStationSearchResult[]> {
    // Note: Mapbox Geocoding API doesn't support radius filtering directly,
    // but proximity bias helps prioritize nearby results
    return this.searchPoliceStations('police station', {
      proximity: { lat: latitude, lng: longitude },
      limit: 10,
    });
  }

  /**
   * Check if a Mapbox feature is a police station
   */
  private isPoliceStation(feature: MapboxFeature): boolean {
    const name = feature.text?.toLowerCase() || '';
    const placeName = feature.place_name?.toLowerCase() || '';
    const category = feature.properties?.category?.toLowerCase() || '';

    const policeKeywords = [
      'police',
      'thana',
      'ps ',
      ' ps',
      'police station',
      'police post',
      'cop',
      'constabulary',
    ];

    return policeKeywords.some(
      keyword =>
        name.includes(keyword) ||
        placeName.includes(keyword) ||
        category.includes(keyword)
    );
  }

  /**
   * Transform Mapbox feature to PoliceStationSearchResult
   */
  private transformToPoliceStation(feature: MapboxFeature): PoliceStationSearchResult {
    const [longitude, latitude] = feature.center;

    // Extract context information (district, state, pincode)
    let district: string | undefined;
    let state: string | undefined;
    let pincode: string | undefined;

    if (feature.context) {
      for (const ctx of feature.context) {
        if (ctx.id.startsWith('district')) {
          district = ctx.text;
        } else if (ctx.id.startsWith('region')) {
          state = ctx.text;
        } else if (ctx.id.startsWith('postcode')) {
          pincode = ctx.text;
        }
      }
    }

    return {
      mapboxPlaceId: feature.id,
      name: feature.text,
      address: feature.place_name,
      latitude,
      longitude,
      district,
      state,
      pincode,
    };
  }
}

export const mapboxService = new MapboxService();
