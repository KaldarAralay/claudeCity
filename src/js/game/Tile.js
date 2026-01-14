// Tile.js - Individual map tile

class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = TILE_TYPES.EMPTY;
    this.zoneType = null;         // For zone tiles: 'residential', 'commercial', 'industrial'
    this.density = 0;             // Development level 0-4
    this.powered = false;         // Has power connection
    this.roadAccess = false;      // Has road connection
    this.buildingId = null;       // For multi-tile buildings, reference to main tile
    this.isMainTile = false;      // True if this is the anchor tile of a multi-tile building
    this.buildingWidth = 1;       // Width of building if main tile
    this.buildingHeight = 1;      // Height of building if main tile
    this.landValue = 50;          // Land value 0-255
    this.pollution = 0;           // Pollution level 0-255
    this.crime = 0;               // Crime level 0-255
    this.traffic = 0;             // Traffic density 0-255
    this.fireRisk = 0;            // Fire risk 0-255
    this.population = 0;          // Population for residential tiles
  }

  // Check if tile is empty or can be bulldozed
  isEmpty() {
    return this.type === TILE_TYPES.EMPTY;
  }

  isWater() {
    return this.type === TILE_TYPES.WATER;
  }

  isForest() {
    return this.type === TILE_TYPES.FOREST;
  }

  isRoad() {
    return this.type === TILE_TYPES.ROAD;
  }

  isPowerLine() {
    return this.type === TILE_TYPES.POWER_LINE;
  }

  isRail() {
    return this.type === TILE_TYPES.RAIL;
  }

  isPark() {
    return this.type === TILE_TYPES.PARK;
  }

  isBurning() {
    return this.type === TILE_TYPES.FIRE_BURNING;
  }

  isFlooded() {
    return this.type === TILE_TYPES.FLOOD;
  }

  isRubble() {
    return this.type === TILE_TYPES.RUBBLE;
  }

  isZone() {
    return this.type === TILE_TYPES.ZONE_RESIDENTIAL ||
           this.type === TILE_TYPES.ZONE_COMMERCIAL ||
           this.type === TILE_TYPES.ZONE_INDUSTRIAL;
  }

  isBuilding() {
    return this.type === TILE_TYPES.BUILDING_RESIDENTIAL ||
           this.type === TILE_TYPES.BUILDING_COMMERCIAL ||
           this.type === TILE_TYPES.BUILDING_INDUSTRIAL;
  }

  isResidential() {
    return this.type === TILE_TYPES.ZONE_RESIDENTIAL ||
           this.type === TILE_TYPES.BUILDING_RESIDENTIAL;
  }

  isCommercial() {
    return this.type === TILE_TYPES.ZONE_COMMERCIAL ||
           this.type === TILE_TYPES.BUILDING_COMMERCIAL;
  }

  isIndustrial() {
    return this.type === TILE_TYPES.ZONE_INDUSTRIAL ||
           this.type === TILE_TYPES.BUILDING_INDUSTRIAL;
  }

  isPowerPlant() {
    return this.type === TILE_TYPES.COAL_POWER ||
           this.type === TILE_TYPES.NUCLEAR_POWER;
  }

  isService() {
    return this.type === TILE_TYPES.POLICE ||
           this.type === TILE_TYPES.FIRE;
  }

  isSpecialBuilding() {
    return this.type >= 30 && this.type < 40;
  }

  // Check if tile conducts power
  conductsPower() {
    return this.isRoad() ||
           this.isPowerLine() ||
           this.isZone() ||
           this.isBuilding() ||
           this.isSpecialBuilding();
  }

  // Check if tile provides road access
  providesRoadAccess() {
    return this.isRoad() || this.isRail();
  }

  // Check if tile can be built on
  canBuildOn() {
    return this.isEmpty() || this.isForest();
  }

  // Check if tile can be bulldozed
  canBulldoze() {
    return !this.isWater() && !this.isEmpty() && !this.isFlooded();
  }

  // Check if tile is flammable
  isFlammable() {
    return this.isForest() || this.isBuilding() || this.isZone() ||
           this.isSpecialBuilding() || this.isPark();
  }

  // Clear tile to empty
  clear() {
    this.type = TILE_TYPES.EMPTY;
    this.zoneType = null;
    this.density = 0;
    this.powered = false;
    this.roadAccess = false;
    this.buildingId = null;
    this.isMainTile = false;
    this.buildingWidth = 1;
    this.buildingHeight = 1;
    this.population = 0;
  }

  // Set as zone
  setZone(zoneType) {
    switch (zoneType) {
      case 'residential':
        this.type = TILE_TYPES.ZONE_RESIDENTIAL;
        break;
      case 'commercial':
        this.type = TILE_TYPES.ZONE_COMMERCIAL;
        break;
      case 'industrial':
        this.type = TILE_TYPES.ZONE_INDUSTRIAL;
        break;
    }
    this.zoneType = zoneType;
    this.density = 0;
  }

  // Develop zone to building
  develop() {
    if (!this.isZone()) return;

    switch (this.type) {
      case TILE_TYPES.ZONE_RESIDENTIAL:
        this.type = TILE_TYPES.BUILDING_RESIDENTIAL;
        break;
      case TILE_TYPES.ZONE_COMMERCIAL:
        this.type = TILE_TYPES.BUILDING_COMMERCIAL;
        break;
      case TILE_TYPES.ZONE_INDUSTRIAL:
        this.type = TILE_TYPES.BUILDING_INDUSTRIAL;
        break;
    }
  }

  // Increase density
  increaseDensity() {
    if (this.density < DENSITY_LEVELS.VERY_HIGH) {
      this.density++;
      this.updatePopulation();
    }
  }

  // Update population based on density (for residential)
  updatePopulation() {
    if (this.isResidential()) {
      this.population = POPULATION_PER_DENSITY[this.density] || 0;
    }
  }

  // Serialize for save
  serialize() {
    return {
      x: this.x,
      y: this.y,
      type: this.type,
      zoneType: this.zoneType,
      density: this.density,
      powered: this.powered,
      roadAccess: this.roadAccess,
      buildingId: this.buildingId,
      isMainTile: this.isMainTile,
      buildingWidth: this.buildingWidth,
      buildingHeight: this.buildingHeight,
      landValue: this.landValue,
      pollution: this.pollution,
      population: this.population
    };
  }

  // Deserialize from save
  static deserialize(data) {
    const tile = new Tile(data.x, data.y);
    Object.assign(tile, data);
    return tile;
  }
}
