// ---------------------------------------------------------------------------
// QuestDay — bundled offline city table for prayer times (v1.12).
// Plain data, NO network. The prayer engine needs only lat/lon; the timezone
// (incl. DST) comes from the user's system clock (see prayerTimes.ts), so v1
// assumes the machine's timezone matches the chosen city. Anyone not near a
// listed city can enter manual coordinates instead (see the settings UI).
//
// Curated for spread + Muslim-population centres + major world capitals. Coords
// are city-centre, ~2-decimal precision (well within prayer-time tolerance).
// ---------------------------------------------------------------------------

export interface City {
  id: string
  name: string
  country: string
  lat: number
  lon: number
}

export const CITIES: City[] = [
  // --- North America ---
  { id: 'detroit', name: 'Detroit', country: 'USA', lat: 42.33, lon: -83.05 },
  { id: 'grand-rapids', name: 'Grand Rapids', country: 'USA', lat: 42.96, lon: -85.67 },
  { id: 'dearborn', name: 'Dearborn', country: 'USA', lat: 42.32, lon: -83.18 },
  { id: 'chicago', name: 'Chicago', country: 'USA', lat: 41.88, lon: -87.63 },
  { id: 'new-york', name: 'New York', country: 'USA', lat: 40.71, lon: -74.01 },
  { id: 'los-angeles', name: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.24 },
  { id: 'houston', name: 'Houston', country: 'USA', lat: 29.76, lon: -95.37 },
  { id: 'dallas', name: 'Dallas', country: 'USA', lat: 32.78, lon: -96.8 },
  { id: 'minneapolis', name: 'Minneapolis', country: 'USA', lat: 44.98, lon: -93.27 },
  { id: 'washington-dc', name: 'Washington, D.C.', country: 'USA', lat: 38.91, lon: -77.04 },
  { id: 'atlanta', name: 'Atlanta', country: 'USA', lat: 33.75, lon: -84.39 },
  { id: 'boston', name: 'Boston', country: 'USA', lat: 42.36, lon: -71.06 },
  { id: 'seattle', name: 'Seattle', country: 'USA', lat: 47.61, lon: -122.33 },
  { id: 'san-francisco', name: 'San Francisco', country: 'USA', lat: 37.77, lon: -122.42 },
  { id: 'phoenix', name: 'Phoenix', country: 'USA', lat: 33.45, lon: -112.07 },
  { id: 'denver', name: 'Denver', country: 'USA', lat: 39.74, lon: -104.99 },
  { id: 'miami', name: 'Miami', country: 'USA', lat: 25.76, lon: -80.19 },
  { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38 },
  { id: 'montreal', name: 'Montreal', country: 'Canada', lat: 45.5, lon: -73.57 },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', lat: 49.28, lon: -123.12 },
  { id: 'ottawa', name: 'Ottawa', country: 'Canada', lat: 45.42, lon: -75.7 },
  { id: 'calgary', name: 'Calgary', country: 'Canada', lat: 51.05, lon: -114.07 },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13 },

  // --- South America ---
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63 },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lon: -43.17 },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', lat: -34.6, lon: -58.38 },
  { id: 'lima', name: 'Lima', country: 'Peru', lat: -12.05, lon: -77.04 },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', lat: 4.71, lon: -74.07 },
  { id: 'santiago', name: 'Santiago', country: 'Chile', lat: -33.45, lon: -70.67 },
  { id: 'paramaribo', name: 'Paramaribo', country: 'Suriname', lat: 5.85, lon: -55.2 },

  // --- Europe ---
  { id: 'london', name: 'London', country: 'UK', lat: 51.51, lon: -0.13 },
  { id: 'birmingham-uk', name: 'Birmingham', country: 'UK', lat: 52.49, lon: -1.89 },
  { id: 'manchester', name: 'Manchester', country: 'UK', lat: 53.48, lon: -2.24 },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
  { id: 'marseille', name: 'Marseille', country: 'France', lat: 43.3, lon: 5.37 },
  { id: 'berlin', name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.41 },
  { id: 'frankfurt', name: 'Frankfurt', country: 'Germany', lat: 50.11, lon: 8.68 },
  { id: 'cologne', name: 'Cologne', country: 'Germany', lat: 50.94, lon: 6.96 },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lon: 4.9 },
  { id: 'rotterdam', name: 'Rotterdam', country: 'Netherlands', lat: 51.92, lon: 4.48 },
  { id: 'brussels', name: 'Brussels', country: 'Belgium', lat: 50.85, lon: 4.35 },
  { id: 'madrid', name: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.7 },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', lat: 41.39, lon: 2.17 },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', lat: 38.72, lon: -9.14 },
  { id: 'rome', name: 'Rome', country: 'Italy', lat: 41.9, lon: 12.5 },
  { id: 'milan', name: 'Milan', country: 'Italy', lat: 45.46, lon: 9.19 },
  { id: 'vienna', name: 'Vienna', country: 'Austria', lat: 48.21, lon: 16.37 },
  { id: 'zurich', name: 'Zürich', country: 'Switzerland', lat: 47.37, lon: 8.54 },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', lat: 59.33, lon: 18.07 },
  { id: 'oslo', name: 'Oslo', country: 'Norway', lat: 59.91, lon: 10.75 },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark', lat: 55.68, lon: 12.57 },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', lat: 60.17, lon: 24.94 },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', lat: 53.35, lon: -6.26 },
  { id: 'warsaw', name: 'Warsaw', country: 'Poland', lat: 52.23, lon: 21.01 },
  { id: 'prague', name: 'Prague', country: 'Czechia', lat: 50.08, lon: 14.44 },
  { id: 'budapest', name: 'Budapest', country: 'Hungary', lat: 47.5, lon: 19.04 },
  { id: 'athens', name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.73 },
  { id: 'bucharest', name: 'Bucharest', country: 'Romania', lat: 44.43, lon: 26.1 },
  { id: 'sofia', name: 'Sofia', country: 'Bulgaria', lat: 42.7, lon: 23.32 },
  { id: 'sarajevo', name: 'Sarajevo', country: 'Bosnia', lat: 43.86, lon: 18.41 },
  { id: 'moscow', name: 'Moscow', country: 'Russia', lat: 55.76, lon: 37.62 },
  { id: 'kyiv', name: 'Kyiv', country: 'Ukraine', lat: 50.45, lon: 30.52 },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', lat: 41.01, lon: 28.98 },
  { id: 'ankara', name: 'Ankara', country: 'Turkey', lat: 39.93, lon: 32.86 },

  // --- Middle East & North Africa ---
  { id: 'mecca', name: 'Mecca', country: 'Saudi Arabia', lat: 21.42, lon: 39.83 },
  { id: 'medina', name: 'Medina', country: 'Saudi Arabia', lat: 24.47, lon: 39.61 },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68 },
  { id: 'jeddah', name: 'Jeddah', country: 'Saudi Arabia', lat: 21.49, lon: 39.19 },
  { id: 'dubai', name: 'Dubai', country: 'UAE', lat: 25.2, lon: 55.27 },
  { id: 'abu-dhabi', name: 'Abu Dhabi', country: 'UAE', lat: 24.45, lon: 54.38 },
  { id: 'doha', name: 'Doha', country: 'Qatar', lat: 25.29, lon: 51.53 },
  { id: 'kuwait-city', name: 'Kuwait City', country: 'Kuwait', lat: 29.38, lon: 47.99 },
  { id: 'manama', name: 'Manama', country: 'Bahrain', lat: 26.23, lon: 50.59 },
  { id: 'muscat', name: 'Muscat', country: 'Oman', lat: 23.59, lon: 58.41 },
  { id: 'sanaa', name: 'Sanaa', country: 'Yemen', lat: 15.37, lon: 44.19 },
  { id: 'baghdad', name: 'Baghdad', country: 'Iraq', lat: 33.31, lon: 44.36 },
  { id: 'amman', name: 'Amman', country: 'Jordan', lat: 31.95, lon: 35.93 },
  { id: 'jerusalem', name: 'Jerusalem', country: 'Palestine', lat: 31.77, lon: 35.21 },
  { id: 'gaza', name: 'Gaza', country: 'Palestine', lat: 31.5, lon: 34.47 },
  { id: 'beirut', name: 'Beirut', country: 'Lebanon', lat: 33.89, lon: 35.5 },
  { id: 'damascus', name: 'Damascus', country: 'Syria', lat: 33.51, lon: 36.29 },
  { id: 'tehran', name: 'Tehran', country: 'Iran', lat: 35.69, lon: 51.39 },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24 },
  { id: 'alexandria', name: 'Alexandria', country: 'Egypt', lat: 31.2, lon: 29.92 },
  { id: 'tripoli-ly', name: 'Tripoli', country: 'Libya', lat: 32.89, lon: 13.19 },
  { id: 'tunis', name: 'Tunis', country: 'Tunisia', lat: 36.81, lon: 10.18 },
  { id: 'algiers', name: 'Algiers', country: 'Algeria', lat: 36.75, lon: 3.06 },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', lat: 33.57, lon: -7.59 },
  { id: 'rabat', name: 'Rabat', country: 'Morocco', lat: 34.02, lon: -6.84 },
  { id: 'khartoum', name: 'Khartoum', country: 'Sudan', lat: 15.5, lon: 32.56 },

  // --- Sub-Saharan Africa ---
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', lat: 6.52, lon: 3.38 },
  { id: 'abuja', name: 'Abuja', country: 'Nigeria', lat: 9.06, lon: 7.49 },
  { id: 'kano', name: 'Kano', country: 'Nigeria', lat: 12.0, lon: 8.52 },
  { id: 'accra', name: 'Accra', country: 'Ghana', lat: 5.6, lon: -0.19 },
  { id: 'dakar', name: 'Dakar', country: 'Senegal', lat: 14.72, lon: -17.47 },
  { id: 'bamako', name: 'Bamako', country: 'Mali', lat: 12.64, lon: -8.0 },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
  { id: 'mogadishu', name: 'Mogadishu', country: 'Somalia', lat: 2.05, lon: 45.32 },
  { id: 'addis-ababa', name: 'Addis Ababa', country: 'Ethiopia', lat: 9.03, lon: 38.74 },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzania', lat: -6.79, lon: 39.21 },
  { id: 'kampala', name: 'Kampala', country: 'Uganda', lat: 0.35, lon: 32.58 },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', lat: -26.2, lon: 28.05 },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42 },

  // --- Central & South Asia ---
  { id: 'islamabad', name: 'Islamabad', country: 'Pakistan', lat: 33.68, lon: 73.05 },
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.0 },
  { id: 'lahore', name: 'Lahore', country: 'Pakistan', lat: 31.55, lon: 74.34 },
  { id: 'peshawar', name: 'Peshawar', country: 'Pakistan', lat: 34.01, lon: 71.58 },
  { id: 'kabul', name: 'Kabul', country: 'Afghanistan', lat: 34.56, lon: 69.21 },
  { id: 'tashkent', name: 'Tashkent', country: 'Uzbekistan', lat: 41.3, lon: 69.24 },
  { id: 'almaty', name: 'Almaty', country: 'Kazakhstan', lat: 43.24, lon: 76.89 },
  { id: 'baku', name: 'Baku', country: 'Azerbaijan', lat: 40.41, lon: 49.87 },
  { id: 'delhi', name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { id: 'hyderabad-in', name: 'Hyderabad', country: 'India', lat: 17.39, lon: 78.49 },
  { id: 'kolkata', name: 'Kolkata', country: 'India', lat: 22.57, lon: 88.36 },
  { id: 'bengaluru', name: 'Bengaluru', country: 'India', lat: 12.97, lon: 77.59 },
  { id: 'chennai', name: 'Chennai', country: 'India', lat: 13.08, lon: 80.27 },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41 },
  { id: 'chittagong', name: 'Chittagong', country: 'Bangladesh', lat: 22.36, lon: 91.78 },
  { id: 'colombo', name: 'Colombo', country: 'Sri Lanka', lat: 6.93, lon: 79.85 },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32 },

  // --- East & Southeast Asia ---
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', lat: -6.21, lon: 106.85 },
  { id: 'surabaya', name: 'Surabaya', country: 'Indonesia', lat: -7.25, lon: 112.75 },
  { id: 'bandung', name: 'Bandung', country: 'Indonesia', lat: -6.92, lon: 107.61 },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.14, lon: 101.69 },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { id: 'manila', name: 'Manila', country: 'Philippines', lat: 14.6, lon: 120.98 },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.5 },
  { id: 'hanoi', name: 'Hanoi', country: 'Vietnam', lat: 21.03, lon: 105.85 },
  { id: 'beijing', name: 'Beijing', country: 'China', lat: 39.9, lon: 116.41 },
  { id: 'shanghai', name: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47 },
  { id: 'urumqi', name: 'Ürümqi', country: 'China', lat: 43.83, lon: 87.62 },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', lat: 22.32, lon: 114.17 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69 },
  { id: 'osaka', name: 'Osaka', country: 'Japan', lat: 34.69, lon: 135.5 },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98 },
  { id: 'taipei', name: 'Taipei', country: 'Taiwan', lat: 25.03, lon: 121.57 },

  // --- Oceania ---
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', lat: -37.81, lon: 144.96 },
  { id: 'perth', name: 'Perth', country: 'Australia', lat: -31.95, lon: 115.86 },
  { id: 'brisbane', name: 'Brisbane', country: 'Australia', lat: -27.47, lon: 153.03 },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', lat: -36.85, lon: 174.76 }
]

/** Look up a city by id (or null if not found / not a known id). */
export function findCity(id: string | null | undefined): City | null {
  if (!id) return null
  return CITIES.find((c) => c.id === id) ?? null
}
