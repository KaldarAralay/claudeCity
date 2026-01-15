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

  // Generate scenario-specific map
  generateScenarioMap(mapType) {
    this.initializeMap();

    switch (mapType) {
      case 'island':
        this.generateIslandMap();
        break;
      case 'sanFrancisco':
        this.generateSanFranciscoMap();
        break;
      case 'bern':
        this.generateBernMap();
        break;
      case 'detroit':
        this.generateDetroitMap();
        break;
      case 'tokyo':
        this.generateTokyoMap();
        break;
      case 'boston':
        this.generateBostonMap();
        break;
      case 'rio':
        this.generateRioMap();
        break;
      case 'lasVegas':
        this.generateLasVegasMap();
        break;
      case 'freeland':
        this.generateFreelandMap();
        break;
      default:
        this.generateTerrain();
    }
  }

  // Island map for practice scenario
  generateIslandMap() {
    // Fill with water
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x].type = TILE_TYPES.WATER;
      }
    }

    // Create main island in center
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    const radiusX = 35;
    const radiusY = 30;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1 + Math.sin(Math.atan2(dy, dx) * 5) * 0.15) {
          this.tiles[y][x].type = TILE_TYPES.EMPTY;
        }
      }
    }

    // Add some forests
    this.generateForests();

    // Add a small starter city in center
    this.placeStarterCity(centerX - 10, centerY - 10);
  }

  // San Francisco - coastal city with bay
  generateSanFranciscoMap() {
    // Ocean on west side, bay in center
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < 15; x++) {
        this.tiles[y][x].type = TILE_TYPES.WATER;
      }
    }

    // Bay area
    const bayX = 50, bayY = 50, bayRadius = 20;
    for (let dy = -bayRadius; dy <= bayRadius; dy++) {
      for (let dx = -bayRadius; dx <= bayRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bayRadius) {
          const x = bayX + dx, y = bayY + dy;
          if (this.isInBounds(x, y)) {
            this.tiles[y][x].type = TILE_TYPES.WATER;
          }
        }
      }
    }

    this.generateForests();
    this.placeMediumCity(30, 30);
  }

  // Bern - landlocked with rivers, heavy traffic city
  generateBernMap() {
    // River through city
    for (let y = 0; y < this.height; y++) {
      const riverX = 60 + Math.sin(y * 0.08) * 8;
      for (let x = Math.floor(riverX); x < Math.floor(riverX) + 4; x++) {
        if (this.isInBounds(x, y)) {
          this.tiles[y][x].type = TILE_TYPES.WATER;
        }
      }
    }

    this.generateForests();
    // Dense city with lots of roads (traffic problem)
    this.placeDenseCity(30, 30);
  }

  // Detroit - industrial city with crime issues
  generateDetroitMap() {
    // River on edge
    for (let y = 0; y < this.height; y++) {
      for (let x = this.width - 8; x < this.width; x++) {
        this.tiles[y][x].type = TILE_TYPES.WATER;
      }
    }

    this.generateForests();
    // Industrial heavy city
    this.placeIndustrialCity(20, 30);
  }

  // Tokyo - coastal city
  generateTokyoMap() {
    // Bay on south and east
    for (let y = this.height - 20; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (y > this.height - 15 || x > this.width - 30) {
          this.tiles[y][x].type = TILE_TYPES.WATER;
        }
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = this.width - 15; x < this.width; x++) {
        this.tiles[y][x].type = TILE_TYPES.WATER;
      }
    }

    this.generateForests();
    this.placeLargeCity(30, 30);
  }

  // Boston - coastal city with nuclear plants
  generateBostonMap() {
    // Harbor
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < this.width; x++) {
        if (y < 15 || (x > 40 && x < 80)) {
          this.tiles[y][x].type = TILE_TYPES.WATER;
        }
      }
    }

    this.generateForests();
    this.placeNuclearCity(30, 40);
  }

  // Rio - coastal city prone to flooding
  generateRioMap() {
    // Ocean on east
    for (let y = 0; y < this.height; y++) {
      for (let x = this.width - 20; x < this.width; x++) {
        this.tiles[y][x].type = TILE_TYPES.WATER;
      }
    }

    // Beach areas (low land)
    for (let y = 0; y < this.height; y++) {
      for (let x = this.width - 30; x < this.width - 20; x++) {
        if (Math.random() < 0.3) {
          this.tiles[y][x].type = TILE_TYPES.WATER;
        }
      }
    }

    this.generateForests();
    this.placeCoastalCity(25, 30);
  }

  // Las Vegas - desert city
  generateLasVegasMap() {
    // No water - desert
    this.generateForests(); // Sparse
    this.placeLargeCity(40, 40);
  }

  // Freeland - completely flat, no water
  generateFreelandMap() {
    // Just forests scattered around
    this.generateForests();
    // No starter city - player builds from scratch
  }

  // Place a small starter city
  placeStarterCity(startX, startY) {
    // Power plant
    this.placeBuilding(startX, startY, 'coal-power');

    // Some roads
    for (let i = 0; i < 15; i++) {
      this.placeRoad(startX + 4 + i, startY + 2);
      this.placeRoad(startX + 4 + i, startY + 8);
    }
    for (let i = 0; i < 7; i++) {
      this.placeRoad(startX + 4, startY + 2 + i);
      this.placeRoad(startX + 18, startY + 2 + i);
    }

    // Zones
    this.placeZone(startX + 6, startY + 3, 'residential');
    this.placeZone(startX + 10, startY + 3, 'residential');
    this.placeZone(startX + 14, startY + 3, 'commercial');
    this.placeZone(startX + 6, startY + 5, 'industrial');
  }

  // Place a medium-sized city
  placeMediumCity(startX, startY) {
    this.placeStarterCity(startX, startY);

    // Add more zones
    for (let i = 0; i < 3; i++) {
      this.placeZone(startX + 6 + i * 4, startY + 12, 'residential');
      this.placeZone(startX + 6 + i * 4, startY + 16, 'residential');
    }

    // More roads
    for (let i = 0; i < 20; i++) {
      this.placeRoad(startX + 4 + i, startY + 11);
      this.placeRoad(startX + 4 + i, startY + 15);
      this.placeRoad(startX + 4 + i, startY + 19);
    }
  }

  // Place a dense city with traffic issues
  placeDenseCity(startX, startY) {
    this.placeMediumCity(startX, startY);

    // Dense road network
    for (let y = 0; y < 40; y += 4) {
      for (let x = 0; x < 50; x++) {
        if (this.isInBounds(startX + x, startY + y)) {
          const tile = this.getTile(startX + x, startY + y);
          if (tile && tile.isEmpty()) {
            this.placeRoad(startX + x, startY + y);
          }
        }
      }
    }

    // Rail system
    for (let x = 0; x < 50; x += 8) {
      for (let y = 0; y < 40; y++) {
        if (this.isInBounds(startX + x, startY + y)) {
          const tile = this.getTile(startX + x, startY + y);
          if (tile && tile.isEmpty()) {
            this.placeRail(startX + x, startY + y);
          }
        }
      }
    }
  }

  // Place industrial-heavy city
  placeIndustrialCity(startX, startY) {
    this.placeStarterCity(startX, startY);

    // Lots of industrial zones
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        this.placeZone(startX + 25 + i * 4, startY + j * 4, 'industrial');
      }
    }

    // Few police stations (high crime)
    this.placeBuilding(startX + 20, startY + 15, 'police');
  }

  // Place large city
  placeLargeCity(startX, startY) {
    this.placeMediumCity(startX, startY);

    // More residential
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        if (Math.random() > 0.3) {
          this.placeZone(startX + i * 4, startY + 25 + j * 4, 'residential');
        }
      }
    }

    // Services
    this.placeBuilding(startX + 25, startY + 5, 'police');
    this.placeBuilding(startX + 25, startY + 10, 'fire');
  }

  // Place city with nuclear power
  placeNuclearCity(startX, startY) {
    this.placeLargeCity(startX, startY);

    // Nuclear power plants
    this.placeBuilding(startX + 40, startY + 10, 'nuclear-power');
    this.placeBuilding(startX + 50, startY + 10, 'nuclear-power');
  }

  // Place coastal city
  placeCoastalCity(startX, startY) {
    this.placeMediumCity(startX, startY);

    // Seaport
    this.placeBuilding(startX + 30, startY + 5, 'seaport');
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
  // Power lines can cross over roads and rails, creating a crossover that:
  // 1. Conducts power
  // 2. Still functions as road/rail
  // 3. Protects the road/rail from deterioration when underfunded
  placePowerLine(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return false;

    if (tile.canBuildOn()) {
      // Normal power line placement on empty/forest
      tile.type = TILE_TYPES.POWER_LINE;
      return true;
    } else if (tile.isRoad() || tile.isRail()) {
      // Power line crosses over road/rail
      // Keep the road/rail type but mark as having power line crossover
      tile.powerLineCrossover = true;
      tile.powered = true; // Crossovers conduct power
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
