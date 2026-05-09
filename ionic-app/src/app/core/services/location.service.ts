import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  state?: string;
  address?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  readonly currentLocation = signal<UserLocation | null>(null);
  readonly locationError = signal<string>('');
  readonly isLocating = signal(false);

  constructor() {
    this.loadSavedLocation();
  }

  /**
   * Get current location using browser Geolocation API (works in web and hybrid apps)
   */
  async detectCurrentLocation(): Promise<UserLocation> {
    this.isLocating.set(true);
    this.locationError.set('');

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = '📍 Location services not available on your device';
        this.locationError.set(error);
        this.isLocating.set(false);
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          this.currentLocation.set(loc);
          this.saveLocation(loc);
          this.isLocating.set(false);

          // Try to get address from coordinates
          this.getAddressFromCoordinates(loc.latitude, loc.longitude)
            .then(address => {
              loc.address = address;
              this.currentLocation.set(loc);
              this.saveLocation(loc);
            })
            .catch(() => {
              // Silently fail - address is optional
            });

          resolve(loc);
        },
        (error) => {
          let errorMsg = '📍 Could not detect location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = '❌ Location permission denied. Please enable location access in settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = '📍 Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = '⏱️ Location detection timed out. Try again.';
              break;
          }

          this.locationError.set(errorMsg);
          this.isLocating.set(false);
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  private async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      // Extract address components
      const address = data.address || {};
      const parts = [];

      if (address.road) parts.push(address.road);
      if (address.suburb) parts.push(address.suburb);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);

      return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.warn('Could not reverse geocode location:', error);
      throw error;
    }
  }

  /**
   * Save location to localStorage
   */
  private saveLocation(location: UserLocation): void {
    try {
      localStorage.setItem('user_location', JSON.stringify(location));
    } catch (error) {
      console.warn('Could not save location to localStorage:', error);
    }
  }

  /**
   * Load previously saved location
   */
  private loadSavedLocation(): void {
    try {
      const saved = localStorage.getItem('user_location');
      if (saved) {
        const location = JSON.parse(saved);
        const age = Date.now() - location.timestamp;

        // Only use saved location if less than 1 hour old
        if (age < 3600000) {
          this.currentLocation.set(location);
        } else {
          localStorage.removeItem('user_location');
        }
      }
    } catch (error) {
      console.warn('Could not load saved location:', error);
      localStorage.removeItem('user_location');
    }
  }

  /**
   * Clear saved location
   */
  clearLocation(): void {
    this.currentLocation.set(null);
    this.locationError.set('');
    localStorage.removeItem('user_location');
  }

  /**
   * Get location coordinates for API calls
   */
  getLocationCoordinates(): { latitude: number; longitude: number } | null {
    const loc = this.currentLocation();
    if (loc) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude
      };
    }
    return null;
  }
}
