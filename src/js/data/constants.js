// Game Constants for ClaudeCity

const GAME_CONSTANTS = {
  // Map settings
  MAP_WIDTH: 120,
  MAP_HEIGHT: 120,
  TILE_SIZE: 16,

  // Starting values
  STARTING_FUNDS: 20000,
  STARTING_YEAR: 1900,
  STARTING_MONTH: 0, // January

  // Tax settings
  MIN_TAX_RATE: 0,
  MAX_TAX_RATE: 20,
  DEFAULT_TAX_RATE: 7,

  // Simulation speeds (ms per tick)
  SPEED_PAUSED: 0,
  SPEED_NORMAL: 1000,
  SPEED_FAST: 500,
  SPEED_ULTRA: 100,

  // Zone sizes
  ZONE_SIZE: 3, // 3x3 tiles

  // Building sizes
  BUILDING_SIZES: {
    'coal-power': { width: 4, height: 4 },
    'nuclear-power': { width: 4, height: 4 },
    'police': { width: 3, height: 3 },
    'fire': { width: 3, height: 3 },
    'stadium': { width: 4, height: 4 },
    'seaport': { width: 4, height: 4 },
    'airport': { width: 6, height: 6 }
  }
};

// Tool costs (based on original SimCity)
const TOOL_COSTS = {
  'pointer': 0,
  'bulldozer': 1,
  'road': 4,           // C64: $4
  'power-line': 2,     // C64: $2
  'rail': 10,
  'residential': 100,  // C64: $100
  'commercial': 100,   // C64: $100
  'industrial': 100,   // C64: $100
  'police': 500,
  'fire': 500,
  'park': 10,
  'coal-power': 2000,  // C64: $2000
  'nuclear-power': 5000,
  'stadium': 3000,
  'seaport': 1000,     // C64: $1000
  'airport': 4000      // C64: $4000
};

// Tool display names
const TOOL_NAMES = {
  'pointer': 'Select',
  'bulldozer': 'Bulldozer',
  'road': 'Road',
  'power-line': 'Power Line',
  'rail': 'Rail',
  'residential': 'Residential',
  'commercial': 'Commercial',
  'industrial': 'Industrial',
  'police': 'Police Dept',
  'fire': 'Fire Dept',
  'park': 'Park',
  'coal-power': 'Coal Power',
  'nuclear-power': 'Nuclear Power',
  'stadium': 'Stadium',
  'seaport': 'Seaport',
  'airport': 'Airport'
};

// Tile types
const TILE_TYPES = {
  EMPTY: 0,
  WATER: 1,
  FOREST: 2,
  ROAD: 3,
  POWER_LINE: 4,
  RAIL: 5,
  PARK: 6,
  ZONE_RESIDENTIAL: 10,
  ZONE_COMMERCIAL: 11,
  ZONE_INDUSTRIAL: 12,
  BUILDING_RESIDENTIAL: 20,
  BUILDING_COMMERCIAL: 21,
  BUILDING_INDUSTRIAL: 22,
  COAL_POWER: 30,
  NUCLEAR_POWER: 31,
  POLICE: 32,
  FIRE: 33,
  STADIUM: 34,
  SEAPORT: 35,
  AIRPORT: 36,
  RUBBLE: 99,
  FIRE_BURNING: 100,
  FLOOD: 101
};

// Zone development levels - based on NES SimCity mechanics
// Residential: 9 levels (0 = undeveloped, 1-9 = developed, 9 = TOP)
// Commercial: 5 levels (0 = undeveloped, 1-5 = developed, 5 = TOP)
// Industrial: 4 levels (0 = undeveloped, 1-4 = developed, 4 = TOP)
const ZONE_MAX_LEVELS = {
  residential: 9,
  commercial: 5,
  industrial: 4
};

// Population per zone level (NES SimCity accurate values)
// R-TOP (level 9) = 1920 residents
const RESIDENTIAL_POPULATION = {
  0: 0,      // Undeveloped zone
  1: 8,      // R-1: Small house
  2: 24,     // R-2: Houses
  3: 64,     // R-3: Dense houses
  4: 128,    // R-4: Small apartments
  5: 256,    // R-5: Apartments
  6: 512,    // R-6: Large apartments
  7: 768,    // R-7: High-rise
  8: 1280,   // R-8: Tower
  9: 1920    // R-TOP: Maximum density tower
};

// Commercial jobs per zone level
// C-TOP (level 5) = 1960 jobs
const COMMERCIAL_JOBS = {
  0: 0,      // Undeveloped
  1: 392,    // C-1: Small shop
  2: 784,    // C-2: Shops
  3: 1176,   // C-3: Store
  4: 1568,   // C-4: Large store
  5: 1960    // C-TOP: Office tower
};

// Industrial jobs per zone level
// I-4 = 640 workers
const INDUSTRIAL_JOBS = {
  0: 0,      // Undeveloped
  1: 160,    // I-1: Small factory
  2: 320,    // I-2: Factory
  3: 480,    // I-3: Large factory
  4: 640     // I-4: Industrial complex
};

// Legacy alias for backwards compatibility
const DENSITY_LEVELS = {
  EMPTY: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4
};

// Power plant output
const POWER_OUTPUT = {
  'coal-power': 200,
  'nuclear-power': 500
};

// Service effect radius
const SERVICE_RADIUS = {
  'police': 15,
  'fire': 15
};

// Legacy population lookup (now uses RESIDENTIAL_POPULATION)
const POPULATION_PER_DENSITY = RESIDENTIAL_POPULATION;

// Colors for rendering
const TILE_COLORS = {
  // Terrain
  [TILE_TYPES.EMPTY]: '#90A060',      // Grass
  [TILE_TYPES.WATER]: '#4060B0',      // Water
  [TILE_TYPES.FOREST]: '#206020',     // Forest

  // Infrastructure
  [TILE_TYPES.ROAD]: '#8B7355',       // Road - brown
  [TILE_TYPES.POWER_LINE]: '#808080', // Power line - gray
  [TILE_TYPES.RAIL]: '#4A3728',       // Rail - dark brown
  [TILE_TYPES.PARK]: '#32CD32',       // Park - lime green

  // Disaster states
  [TILE_TYPES.FIRE_BURNING]: '#FF4500', // Fire - orange red
  [TILE_TYPES.FLOOD]: '#1E90FF',        // Flood - dodger blue
  [TILE_TYPES.RUBBLE]: '#8B4513',       // Rubble - saddle brown

  // Zones (undeveloped)
  [TILE_TYPES.ZONE_RESIDENTIAL]: '#90EE90', // Light green
  [TILE_TYPES.ZONE_COMMERCIAL]: '#87CEEB',  // Light blue
  [TILE_TYPES.ZONE_INDUSTRIAL]: '#FFD700',  // Yellow

  // Buildings (developed)
  [TILE_TYPES.BUILDING_RESIDENTIAL]: '#228B22', // Green building
  [TILE_TYPES.BUILDING_COMMERCIAL]: '#4169E1',  // Blue building
  [TILE_TYPES.BUILDING_INDUSTRIAL]: '#B8860B',  // Brown/yellow building

  // Special buildings
  [TILE_TYPES.COAL_POWER]: '#333333',
  [TILE_TYPES.NUCLEAR_POWER]: '#FFAA00',
  [TILE_TYPES.POLICE]: '#4169E1',
  [TILE_TYPES.FIRE]: '#FF4500',
  [TILE_TYPES.STADIUM]: '#DEB887',
  [TILE_TYPES.SEAPORT]: '#4682B4',
  [TILE_TYPES.AIRPORT]: '#808080',

  // Other
  [TILE_TYPES.RUBBLE]: '#8B4513',

  // Special states
  'unpowered': '#AA0000',
  'powered': '#00AA00'
};

// Month names
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Maintenance costs per year
const MAINTENANCE_COSTS = {
  'road': 1,      // per tile
  'rail': 2,      // per tile
  'police': 100,  // per station
  'fire': 100,    // per station
  'coal-power': 500,
  'nuclear-power': 1000
};

// Demand factors
const DEMAND_FACTORS = {
  BASE_RESIDENTIAL: 0.5,
  BASE_COMMERCIAL: 0.3,
  BASE_INDUSTRIAL: 0.4,
  GROWTH_RATE: 0.02,
  MAX_DEMAND: 2.0,
  MIN_DEMAND: -1.0
};
