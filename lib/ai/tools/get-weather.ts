import { tool } from "ai";
import { z } from "zod";

async function geocodeCity(
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}

export const getWeather = tool({
  description:
    "Get the current weather at a location. You can provide either coordinates or a city name.",
  inputSchema: z.object({
    city: z
      .string()
      .optional()
      .describe(
        "City name (e.g., 'San Francisco', 'New York', 'London'). If provided, coordinates will be geocoded."
      ),
    latitude: z
      .number()
      .optional()
      .describe("Latitude coordinate. Required if not providing city."),
    longitude: z
      .number()
      .optional()
      .describe("Longitude coordinate. Required if not providing city."),
  }),
  execute: async (input) => {
    let latitude: number;
    let longitude: number;

    if (input.city) {
      const coords = await geocodeCity(input.city);
      if (!coords) {
        return {
          error: `Could not find coordinates for "${input.city}". Please check the city name.`,
        };
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else if (input.latitude !== undefined && input.longitude !== undefined) {
      latitude = input.latitude;
      longitude = input.longitude;
    } else {
      return {
        error:
          "Either 'city' must be provided, or both 'latitude' and 'longitude' must be provided.",
      };
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();

    if (input.city) {
      weatherData.cityName = input.city;
    }

    return weatherData;
  },
});
