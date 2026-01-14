// City.js - City data model and map management

class City {
  constructor(width = GAME_CONSTANTS.MAP_WIDTH, height = GAME_CONSTANTS.MAP_HEIGHT) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.buildings = new Map(); // Building ID -> building data
    this.nextBuildingId = 1;

    this.initializeMap();
  }

  // Initialize empty map
  initializeMap() {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(new Tile(x, y));
      }
      this.tiles.push(row);
    }
  }

  // Generate terrain (water, forests)
  generateTerrain() {
    // Generate water features using simple noise
    this.generateWater();
    // Generate forests
    this.generateForests();
  }

  generateWater() {
    // Create a river or lake
    const riverX = Math.floor(this.width * 0.7);
    const riverWidth = 4 + Math.floor(Math.random() * 3);

    for (let y = 0; y < this.height; y++) {
      const offset = Math.sin(y * 0.1) * 3;
      const startX = Math.floor(riverX + offset);

      for (let x = startX; x < startX + riverWidth && x < this.width; x++) {
        if (x >= 0 && x < this.width) {
          this.tiles[y][x].type = TILE_TYPES.WATER;
        }
      }
    }

    // Add a lake
    const lakeX = Math.floor(this.width * 0.2);
    const lakeY = Math.floor(this.height * 0.3);
    const lakeRadius = 8;

    for (let dy = -lakeRadius; dy <= lakeRadius; dy++) {
      for (let dx = -lakeRadius; dx <= lakeRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= lakeRadius + Math.random() * 2) {
          const x = lakeX + dx;
          const y = lakeY + dy;
          if (this.isInBounds(x, y)) {
            this.tiles[y][x].type = TILE_TYPES.WATER;
          }
        }
      }
    }
  }

  generateForests() {
    // Scatter forest clusters
    const numClusters = 15;

    for (let i = 0; i < numClusters; i++) {
      const cx = Math.floor(Math.random() * this.width);
      const cy = Math.floor(Math.random() * this.height);
      const radius = 3 + Math.floor(Math.random() * 5);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius && Math.random() > 0.3) {
            const x = cx + dx;
            const y = cy + dy;
            if (this.isInBounds(x, y)) {
              const tile = this.tiles[y][x];
              if (tile.isEmpty()) {
                tile.type = TILE_TYPES.FOREST;
              }
            }
          }
        }
      }
    }
  }

  // Check if coordinates are in bounds
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // Get tile at coordinates
  getTile(x, y) {
    if (!this.isInBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  // Set tile type
  setTile(x, y, type) {
    if (!this.isInBounds(x, y)) return false;
    this.tiles[y][x].type = type;
    return true;
  }

  // Place a road
  placeRoad(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;

    if (tile.canBuildOn() || tile.isPowerLine()) {
      tile.type = TILE_TYPES.ROAD;
      return true;
    }
    return false;
  }

  // Place a power line
  placePowerLine(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;

    if (tile.canBuildOn() || tile.isRoad()) {
      // Power line on road creates special combo
      if (tile.isRoad()) {
        // Keep as road but mark as having power line
        tile.powered = true;
      } else {
        tile.type = TILE_TYPES.POWER_LINE;
      }
      return true;
    }
    return false;
  }

  // Place a rail
  placeRail(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;

    if (tile.canBuildOn()) {
      tile.type = TILE_TYPES.RAIL;
      return true;
    }
    return false;
  }

  // Place a park
  placePark(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;

    if (tile.canBuildOn()) {
      tile.type = TILE_TYPES.PARK;
      return true;
    }
    return false;
  }

  // Place a zone (3x3)
  placeZone(startX, startY, zoneType) {
    const size = GAME_CONSTANTS.ZONE_SIZE;

    // Check if all tiles can be built on
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const tile = this.getTile(startX + dx, startY + dy);
        if (!tile || !tile.canBuildOn()) {
          return false;
        }
      }
    }

    // Place the zone
    const buildingId = this.nextBuildingId++;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const tile = this.getTile(startX + dx, startY + dy);
        tile.setZone(zoneType);
        tile.buildingId = buildingId;
        if (dx === 0 && dy === 0) {
          tile.isMainTile = true;
          tile.buildingWidth = size;
          tile.buildingHeight = size;
        }
      }
    }

    this.buildings.set(buildingId, {
      id: buildingId,
      type: zoneType,
      x: startX,
      y: startY,
      width: size,
      height: size
    });

    return true;
  }

  // Place a special building (power plant, police, fire, etc.)
  placeBuilding(startX, startY, buildingType) {
    const sizeInfo = GAME_CONSTANTS.BUILDING_SIZES[buildingType];
    if (!sizeInfo) return false;

    const { width, height } = sizeInfo;

    // Check if all tiles can be built on
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tile = this.getTile(startX + dx, startY + dy);
        if (!tile || !tile.canBuildOn()) {
          return false;
        }
      }
    }

    // Determine tile type
    let tileType;
    switch (buildingType) {
      case 'coal-power': tileType = TILE_TYPES.COAL_POWER; break;
      case 'nuclear-power': tileType = TILE_TYPES.NUCLEAR_POWER; break;
      case 'police': tileType = TILE_TYPES.POLICE; break;
      case 'fire': tileType = TILE_TYPES.FIRE; break;
      case 'stadium': tileType = TILE_TYPES.STADIUM; break;
      case 'seaport': tileType = TILE_TYPES.SEAPORT; break;
      case 'airport': tileType = TILE_TYPES.AIRPORT; break;
      default: return false;
    }

    // Place the building
    const buildingId = this.nextBuildingId++;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tile = this.getTile(startX + dx, startY + dy);
        tile.type = tileType;
        tile.buildingId = buildingId;
        if (dx === 0 && dy === 0) {
          tile.isMainTile = true;
          tile.buildingWidth = width;
          tile.buildingHeight = height;
        }
      }
    }

    // Power plants are automatically powered
    if (buildingType === 'coal-power' || buildingType === 'nuclear-power') {
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const tile = this.getTile(startX + dx, startY + dy);
          tile.powered = true;
        }
      }
    }

    this.buildings.set(buildingId, {
      id: buildingId,
      type: buildingType,
      x: startX,
      y: startY,
      width,
      height
    });

    return true;
  }

  // Bulldoze a tile
  bulldoze(x, y) {
    const tile = this.getTile(x, y);
    if (!tile || !tile.canBulldoze()) return false;

    // If part of a building, remove entire building
    if (tile.buildingId) {
      const building = this.buildings.get(tile.buildingId);
      if (building) {
        for (let dy = 0; dy < building.height; dy++) {
          for (let dx = 0; dx < building.width; dx++) {
            const t = this.getTile(building.x + dx, building.y + dy);
            if (t) t.clear();
          }
        }
        this.buildings.delete(tile.buildingId);
      }
    } else {
      tile.clear();
    }

    return true;
  }

  // Get all power plants
  getPowerPlants() {
    const plants = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.isPowerPlant() && tile.isMainTile) {
          plants.push({
            x,
            y,
            type: tile.type === TILE_TYPES.COAL_POWER ? 'coal-power' : 'nuclear-power',
            output: tile.type === TILE_TYPES.COAL_POWER ?
              POWER_OUTPUT['coal-power'] : POWER_OUTPUT['nuclear-power']
          });
        }
      }
    }
    return plants;
  }

  // Get all service buildings (police, fire)
  getServiceBuildings() {
    const services = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.isService() && tile.isMainTile) {
          services.push({
            x,
            y,
            type: tile.type === TILE_TYPES.POLICE ? 'police' : 'fire',
            radius: SERVICE_RADIUS[tile.type === TILE_TYPES.POLICE ? 'police' : 'fire']
          });
        }
      }
    }
    return services;
  }

  // Calculate total population (only from main tiles to avoid 9x counting)
  getTotalPopulation() {
    let population = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        // Only count population from main tiles of residential zones
        if (tile.isMainTile && tile.isResidential()) {
          population += tile.population;
        }
      }
    }
    return population;
  }

  // Check if a zone has road access (checks all edge tiles)
  zoneHasRoadAccess(startX, startY, width, height) {
    // Check all edge tiles for road adjacency
    for (let dx = 0; dx < width; dx++) {
      // Top edge - check above
      if (this.getTile(startX + dx, startY - 1)?.providesRoadAccess()) return true;
      // Bottom edge - check below
      if (this.getTile(startX + dx, startY + height)?.providesRoadAccess()) return true;
    }
    for (let dy = 0; dy < height; dy++) {
      // Left edge - check left
      if (this.getTile(startX - 1, startY + dy)?.providesRoadAccess()) return true;
      // Right edge - check right
      if (this.getTile(startX + width, startY + dy)?.providesRoadAccess()) return true;
    }
    return false;
  }

  // Count zones by type
  countZones() {
    const counts = {
      residential: { total: 0, developed: 0, powered: 0 },
      commercial: { total: 0, developed: 0, powered: 0 },
      industrial: { total: 0, developed: 0, powered: 0 }
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.isMainTile && tile.zoneType) {
          counts[tile.zoneType].total++;
          if (tile.isBuilding()) {
            counts[tile.zoneType].developed++;
          }
          if (tile.powered) {
            counts[tile.zoneType].powered++;
          }
        }
      }
    }

    return counts;
  }

  // Get zone statistics including population and jobs
  getZoneStats() {
    const stats = {
      population: 0,
      commercialJobs: 0,
      industrialJobs: 0,
      residentialZones: 0,
      commercialZones: 0,
      industrialZones: 0
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];

        // Only count main tiles to avoid double-counting
        if (tile.isMainTile) {
          if (tile.isResidential()) {
            stats.population += tile.population;
            if (tile.isBuilding()) stats.residentialZones++;
          } else if (tile.isCommercial()) {
            stats.commercialJobs += tile.jobs;
            if (tile.isBuilding()) stats.commercialZones++;
          } else if (tile.isIndustrial()) {
            stats.industrialJobs += tile.jobs;
            if (tile.isBuilding()) stats.industrialZones++;
          }
        }
      }
    }

    return stats;
  }

  // Count infrastructure
  countInfrastructure() {
    let roads = 0;
    let rails = 0;
    let powerLines = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        if (tile.isRoad()) roads++;
        if (tile.isRail()) rails++;
        if (tile.isPowerLine()) powerLines++;
      }
    }

    return { roads, rails, powerLines };
  }

  // Serialize for save
  serialize() {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles.map(row => row.map(tile => tile.serialize())),
      buildings: Array.from(this.buildings.entries()),
      nextBuildingId: this.nextBuildingId
    };
  }

  // Deserialize from save
  static deserialize(data) {
    const city = new City(data.width, data.height);
    city.tiles = data.tiles.map(row => row.map(tileData => Tile.deserialize(tileData)));
    city.buildings = new Map(data.buildings);
    city.nextBuildingId = data.nextBuildingId;
    return city;
  }
}
