// Tile.js - Individual map tile

class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = TILE_TYPES.EMPTY;
    this.zoneType = null;         // For zone tiles: 'residential', 'commercial', 'industrial'
    this.level = 0;               // Zone development level (R: 0-9, C: 0-5, I: 0-4)
    this.density = 0;             // Legacy alias for level (for backwards compatibility)
    this.zoneClass = null;        // Zone class: 'low', 'mid', 'upper', 'high' (based on land value)
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
    this.jobs = 0;                // Jobs for commercial/industrial tiles
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
    this.level = 0;
    this.density = 0;
    this.zoneClass = null;
    this.powered = false;
    this.roadAccess = false;
    this.buildingId = null;
    this.isMainTile = false;
    this.buildingWidth = 1;
    this.buildingHeight = 1;
    this.population = 0;
    this.jobs = 0;
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
    this.level = 0;
    this.density = 0;
    this.population = 0;
    this.jobs = 0;
  }

  // Get the maximum level for this zone type
  getMaxLevel() {
    if (!this.zoneType) return 0;
    return ZONE_MAX_LEVELS[this.zoneType] || 0;
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

  // Increase zone level
  increaseLevel() {
    const maxLevel = this.getMaxLevel();
    if (this.level < maxLevel) {
      this.level++;
      this.density = this.level; // Keep density in sync for backwards compatibility
      this.updateStats();
      return true;
    }
    return false;
  }

  // Decrease zone level
  decreaseLevel() {
    if (this.level > 0) {
      this.level--;
      this.density = this.level;
      this.updateStats();
      return true;
    }
    return false;
  }

  // Legacy method - now calls increaseLevel
  increaseDensity() {
    return this.increaseLevel();
  }

  // Update population and jobs based on zone level
  updateStats() {
    if (this.isResidential()) {
      this.population = RESIDENTIAL_POPULATION[this.level] || 0;
      this.jobs = 0;
    } else if (this.isCommercial()) {
      this.population = 0;
      this.jobs = COMMERCIAL_JOBS[this.level] || 0;
    } else if (this.isIndustrial()) {
      this.population = 0;
      this.jobs = INDUSTRIAL_JOBS[this.level] || 0;
    }
  }

  // Legacy method - now calls updateStats
  updatePopulation() {
    this.updateStats();
  }

  // Check if zone is at maximum level
  isMaxLevel() {
    return this.level >= this.getMaxLevel();
  }

  // Get zone level label (e.g., "R-3", "C-TOP", "I-2")
  getLevelLabel() {
    if (!this.zoneType) return '';
    const prefix = this.zoneType.charAt(0).toUpperCase();
    const maxLevel = this.getMaxLevel();
    if (this.level >= maxLevel) {
      return `${prefix}-TOP`;
    }
    return `${prefix}-${this.level}`;
  }

  // Calculate zone class based on land value (minus pollution effects)
  // Classes: Low (0-29), Mid (30-79), Upper (80-149), High (150-250)
  calculateZoneClass() {
    // Effective land value = land value - pollution penalty
    const effectiveLandValue = Math.max(0, this.landValue - Math.floor(this.pollution * 0.5));

    if (effectiveLandValue >= LAND_VALUE_THRESHOLDS.HIGH) {
      return LAND_VALUE_CLASS.HIGH;
    } else if (effectiveLandValue >= LAND_VALUE_THRESHOLDS.UPPER) {
      return LAND_VALUE_CLASS.UPPER;
    } else if (effectiveLandValue >= LAND_VALUE_THRESHOLDS.MID) {
      return LAND_VALUE_CLASS.MID;
    } else {
      return LAND_VALUE_CLASS.LOW;
    }
  }

  // Update zone class (called when zone develops or land value changes)
  updateZoneClass() {
    if (this.isBuilding() || this.isZone()) {
      // Industrial zones randomly pick between Low and High (per game mechanics)
      if (this.isIndustrial()) {
        this.zoneClass = Math.random() < 0.5 ? LAND_VALUE_CLASS.LOW : LAND_VALUE_CLASS.HIGH;
      } else {
        this.zoneClass = this.calculateZoneClass();
      }
    }
  }

  // Get effective land value (land value minus pollution effects)
  getEffectiveLandValue() {
    return Math.max(0, this.landValue - Math.floor(this.pollution * 0.5));
  }

  // Check if this zone is High class (needed for TOP development)
  isHighClass() {
    return this.zoneClass === LAND_VALUE_CLASS.HIGH;
  }

  // Get zone class label for display
  getClassLabel() {
    if (!this.zoneClass) return '';
    return this.zoneClass.charAt(0).toUpperCase() + this.zoneClass.slice(1);
  }

  // Serialize for save
  serialize() {
    return {
      x: this.x,
      y: this.y,
      type: this.type,
      zoneType: this.zoneType,
      level: this.level,
      density: this.density,
      zoneClass: this.zoneClass,
      powered: this.powered,
      roadAccess: this.roadAccess,
      buildingId: this.buildingId,
      isMainTile: this.isMainTile,
      buildingWidth: this.buildingWidth,
      buildingHeight: this.buildingHeight,
      landValue: this.landValue,
      pollution: this.pollution,
      population: this.population,
      jobs: this.jobs
    };
  }

  // Deserialize from save
  static deserialize(data) {
    const tile = new Tile(data.x, data.y);
    Object.assign(tile, data);
    return tile;
  }
}
