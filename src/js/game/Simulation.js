// Simulation.js - City simulation engine

class Simulation {
  constructor(city, budget) {
    this.city = city;
    this.budget = budget;

    this.year = GAME_CONSTANTS.STARTING_YEAR;
    this.month = GAME_CONSTANTS.STARTING_MONTH;

    this.population = 0;

    // R/C/I demand (-1 to 2, where positive means demand)
    this.residentialDemand = DEMAND_FACTORS.BASE_RESIDENTIAL;
    this.commercialDemand = DEMAND_FACTORS.BASE_COMMERCIAL;
    this.industrialDemand = DEMAND_FACTORS.BASE_INDUSTRIAL;

    // Simulation state
    this.isPaused = false;
    this.speed = GAME_CONSTANTS.SPEED_NORMAL;
    this.tickTimer = null;

    // Statistics
    this.stats = {
      totalPowerProduced: 0,
      totalPowerConsumed: 0,
      unemploymentRate: 0,
      crimeRate: 0,
      pollutionLevel: 0
    };
  }

  // Start simulation
  start() {
    this.isPaused = false;
    this.scheduleNextTick();
  }

  // Pause simulation
  pause() {
    this.isPaused = true;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  // Set simulation speed
  setSpeed(speed) {
    this.speed = speed;
    if (!this.isPaused && speed > 0) {
      this.scheduleNextTick();
    } else if (speed === 0) {
      this.pause();
    }
  }

  // Schedule next tick
  scheduleNextTick() {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
    }
    if (!this.isPaused && this.speed > 0) {
      this.tickTimer = setTimeout(() => this.tick(), this.speed);
    }
  }

  // Main simulation tick (one month)
  tick() {
    // Advance time
    this.month++;
    if (this.month >= 12) {
      this.month = 0;
      this.year++;
      this.budget.processYear(this.year);
    }

    // Run simulation steps
    this.updatePowerGrid();
    this.updateRoadAccess();
    this.updateZoneDevelopment();
    this.updateTraffic();
    this.updatePollution();
    this.updateDemand();
    this.updateLandValues();
    this.updateServices();
    this.updateDisasters();

    // Process budget
    this.budget.processMonth(this.city);

    // Update population
    this.population = this.city.getTotalPopulation();

    // Schedule next tick
    this.scheduleNextTick();

    // Emit tick event
    if (this.onTick) {
      this.onTick({
        year: this.year,
        month: this.month,
        population: this.population
      });
    }
  }

  // Update power grid - flood fill from power plants
  updatePowerGrid() {
    // Reset all power status
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (!tile.isPowerPlant()) {
          tile.powered = false;
        }
      }
    }

    // Get power plants
    const plants = this.city.getPowerPlants();
    let totalPower = 0;
    plants.forEach(p => totalPower += p.output);

    this.stats.totalPowerProduced = totalPower;

    // Flood fill from each power plant
    let powerConsumed = 0;
    const visited = new Set();

    const queue = [];

    // Start from power plants
    plants.forEach(plant => {
      const building = this.city.buildings.get(
        this.city.getTile(plant.x, plant.y).buildingId
      );
      if (building) {
        for (let dy = 0; dy < building.height; dy++) {
          for (let dx = 0; dx < building.width; dx++) {
            queue.push({ x: plant.x + dx, y: plant.y + dy });
          }
        }
      }
    });

    // BFS to spread power
    while (queue.length > 0 && powerConsumed < totalPower) {
      const { x, y } = queue.shift();
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = this.city.getTile(x, y);
      if (!tile) continue;

      // Power this tile if it conducts power
      if (tile.conductsPower() || tile.isPowerPlant()) {
        if (!tile.powered) {
          tile.powered = true;

          // Zones consume power
          if (tile.isZone() || tile.isBuilding()) {
            powerConsumed++;
          }
        }

        // Check adjacent tiles
        const neighbors = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 }
        ];

        neighbors.forEach(n => {
          const nKey = `${n.x},${n.y}`;
          if (!visited.has(nKey)) {
            const nTile = this.city.getTile(n.x, n.y);
            if (nTile && (nTile.conductsPower() || nTile.isPowerPlant())) {
              queue.push(n);
            }
          }
        });
      }
    }

    this.stats.totalPowerConsumed = powerConsumed;
  }

  // Update road access for zones (check zone edges, not just main tile)
  updateRoadAccess() {
    // First pass: check road access for main tiles using zone-aware check
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        if (tile.isMainTile && (tile.isZone() || tile.isBuilding())) {
          // Use zone-aware road access check
          const hasAccess = this.city.zoneHasRoadAccess(x, y, tile.buildingWidth, tile.buildingHeight);
          tile.roadAccess = hasAccess;
        }
      }
    }

    // Second pass: propagate road access from main tile to all zone tiles
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        if (!tile.isMainTile && tile.buildingId) {
          const building = this.city.buildings.get(tile.buildingId);
          if (building) {
            const mainTile = this.city.getTile(building.x, building.y);
            if (mainTile) {
              tile.roadAccess = mainTile.roadAccess;
            }
          }
        }
      }
    }
  }

  // Update zone development
  updateZoneDevelopment() {
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        // Only process main tiles of zones
        if (!tile.isMainTile || !tile.zoneType) continue;

        // Check development conditions
        const canDevelop = tile.powered && tile.roadAccess;

        if (tile.isZone()) {
          // Undeveloped zone - try to develop
          if (canDevelop) {
            const demand = this.getDemandForZone(tile.zoneType);
            if (demand > 0 && Math.random() < demand * 0.1) {
              this.developZone(x, y, tile.zoneType);
            }
          }
        } else if (tile.isBuilding()) {
          // Developed zone - try to increase density
          if (canDevelop) {
            const demand = this.getDemandForZone(tile.zoneType);
            if (demand > 0 && Math.random() < demand * 0.05) {
              this.increaseZoneDensity(x, y);
            }
          } else if (!tile.powered) {
            // Depopulate unpowered zones
            if (Math.random() < 0.1) {
              this.decreaseZoneDensity(x, y);
            }
          }
        }
      }
    }
  }

  // Get demand for zone type
  getDemandForZone(zoneType) {
    switch (zoneType) {
      case 'residential': return this.residentialDemand;
      case 'commercial': return this.commercialDemand;
      case 'industrial': return this.industrialDemand;
      default: return 0;
    }
  }

  // Develop a zone (change from empty zone to building at level 1)
  developZone(x, y, zoneType) {
    const mainTile = this.city.getTile(x, y);
    const building = this.city.buildings.get(mainTile?.buildingId);
    if (!building) return;

    for (let dy = 0; dy < building.height; dy++) {
      for (let dx = 0; dx < building.width; dx++) {
        const tile = this.city.getTile(x + dx, y + dy);
        if (tile) {
          tile.develop();
          tile.level = 1;
          tile.density = 1;
          // Only main tile tracks population/jobs
          if (tile.isMainTile) {
            tile.updateStats();
          }
        }
      }
    }
  }

  // Increase zone level (with max level check per zone type)
  increaseZoneDensity(x, y) {
    const mainTile = this.city.getTile(x, y);
    const building = this.city.buildings.get(mainTile?.buildingId);
    if (!building) return;

    // Check if main tile is at max level
    if (mainTile.isMaxLevel()) return;

    for (let dy = 0; dy < building.height; dy++) {
      for (let dx = 0; dx < building.width; dx++) {
        const tile = this.city.getTile(x + dx, y + dy);
        if (tile) {
          tile.increaseLevel();
          // Only main tile tracks population/jobs
          if (tile.isMainTile) {
            tile.updateStats();
          }
        }
      }
    }
  }

  // Decrease zone level
  decreaseZoneDensity(x, y) {
    const mainTile = this.city.getTile(x, y);
    const building = this.city.buildings.get(mainTile?.buildingId);
    if (!building) return;

    for (let dy = 0; dy < building.height; dy++) {
      for (let dx = 0; dx < building.width; dx++) {
        const tile = this.city.getTile(x + dx, y + dy);
        if (tile && tile.level > 0) {
          tile.decreaseLevel();
          // Only main tile tracks population/jobs
          if (tile.isMainTile) {
            tile.updateStats();
          }
        }
      }
    }
  }

  // Update demand based on city state (SimCity-style RCI model)
  updateDemand() {
    const stats = this.city.getZoneStats();

    // Use actual jobs from commercial and industrial zones
    const totalJobs = stats.commercialJobs + stats.industrialJobs;

    // Residential demand: people want to move in if there are jobs
    // High demand when jobs > population, low when housing exceeds jobs
    const jobsPerCapita = this.population > 0 ? totalJobs / this.population : 2;

    // Calculate housing availability based on potential max population
    const maxResidentialPop = stats.residentialZones * 1920; // Max possible if all R-TOP
    const housingPressure = maxResidentialPop > 0 ? this.population / maxResidentialPop : 0;

    this.residentialDemand = Math.min(
      DEMAND_FACTORS.MAX_DEMAND,
      Math.max(
        DEMAND_FACTORS.MIN_DEMAND,
        0.5 + (jobsPerCapita - 0.8) * 0.6 - housingPressure * 0.3
      )
    );

    // Commercial demand: needs population to serve, follows residential
    // Optimal ratio: ~1 commercial job per 2 residents
    const idealCommercialJobs = this.population * 0.5;
    const commercialRatio = idealCommercialJobs > 0 ? stats.commercialJobs / idealCommercialJobs : 1;

    this.commercialDemand = Math.min(
      DEMAND_FACTORS.MAX_DEMAND,
      Math.max(
        DEMAND_FACTORS.MIN_DEMAND,
        0.3 + (this.population / 1000) * 0.3 - (commercialRatio - 1) * 0.5
      )
    );

    // Industrial demand: foundational, external market driven
    // Needs ~1 industrial job per 3 residents for full employment
    const idealIndustrialJobs = this.population * 0.33;
    const industrialRatio = idealIndustrialJobs > 0 ? stats.industrialJobs / idealIndustrialJobs : 1;
    const pollutionPenalty = this.stats.pollutionLevel / 255 * 0.5;

    this.industrialDemand = Math.min(
      DEMAND_FACTORS.MAX_DEMAND,
      Math.max(
        DEMAND_FACTORS.MIN_DEMAND,
        0.6 - (industrialRatio - 1) * 0.4 - pollutionPenalty + (this.population / 5000) * 0.2
      )
    );

    // Tax rate affects all demand (7% is optimal)
    const taxPenalty = (this.budget.taxRate - 7) * 0.03;
    this.residentialDemand -= taxPenalty;
    this.commercialDemand -= taxPenalty;
    this.industrialDemand -= taxPenalty * 0.5; // Industry less affected by taxes
  }

  // Update traffic on roads based on nearby zones
  updateTraffic() {
    // Reset traffic
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        this.city.tiles[y][x].traffic = 0;
      }
    }

    // For each developed zone, add traffic to nearby roads
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        if (tile.isMainTile && tile.isBuilding()) {
          // Traffic generated based on zone type and level
          let trafficGenerated = 0;

          if (tile.isResidential()) {
            // Residential generates commuter traffic (scales with level 1-9)
            trafficGenerated = tile.level * 10;
          } else if (tile.isCommercial()) {
            // Commercial generates shopper traffic (scales with level 1-5)
            trafficGenerated = tile.level * 20;
          } else if (tile.isIndustrial()) {
            // Industrial generates truck traffic (scales with level 1-4)
            trafficGenerated = tile.level * 30;
          }

          // Spread traffic to nearby roads (radius 5)
          for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
              const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
              if (dist <= 5 && dist > 0) {
                const roadTile = this.city.getTile(x + dx, y + dy);
                if (roadTile && roadTile.isRoad()) {
                  const trafficAmount = Math.floor(trafficGenerated * (1 - dist / 6));
                  roadTile.traffic = Math.min(255, roadTile.traffic + trafficAmount);
                }
              }
            }
          }
        }
      }
    }
  }

  // Update pollution from industrial zones and power plants
  updatePollution() {
    // Reset pollution
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        this.city.tiles[y][x].pollution = 0;
      }
    }

    // Industrial zones create pollution
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        if (tile.isMainTile && tile.isIndustrial() && tile.isBuilding()) {
          // Industrial pollution scales with level (50 base per NES guide, +10 per level)
          const pollutionStrength = 40 + tile.level * 10;
          this.spreadPollution(x, y, pollutionStrength, 8);
        }

        // Power plants also pollute
        if (tile.isMainTile && tile.type === TILE_TYPES.COAL_POWER) {
          this.spreadPollution(x, y, 80, 12);
        }
      }
    }

    // Traffic also creates pollution (simplified)
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isRoad() && tile.traffic > 50) {
          this.spreadPollution(x, y, tile.traffic / 10, 3);
        }
      }
    }
  }

  // Spread pollution from a source
  spreadPollution(sourceX, sourceY, strength, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const tile = this.city.getTile(sourceX + dx, sourceY + dy);
          if (tile) {
            const amount = Math.floor(strength * (1 - dist / radius));
            tile.pollution = Math.min(255, tile.pollution + amount);
          }
        }
      }
    }
  }

  // Update land values
  updateLandValues() {
    // Simple land value model based on distance from services, parks, and pollution
    const services = this.city.getServiceBuildings();

    // Find all parks for land value bonus
    const parks = [];
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        if (this.city.tiles[y][x].isPark()) {
          parks.push({ x, y });
        }
      }
    }

    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        // Base land value
        let value = 50;

        // Increase near services
        services.forEach(service => {
          const dist = Math.sqrt((x - service.x) ** 2 + (y - service.y) ** 2);
          if (dist < service.radius) {
            value += (service.radius - dist) * 2;
          }
        });

        // Increase near parks (radius 4)
        parks.forEach(park => {
          const dist = Math.sqrt((x - park.x) ** 2 + (y - park.y) ** 2);
          if (dist < 4) {
            value += (4 - dist) * 5;
          }
        });

        // Decrease from pollution
        value -= tile.pollution * 0.5;

        // Water frontage increases value
        const neighbors = [
          this.city.getTile(x - 1, y),
          this.city.getTile(x + 1, y),
          this.city.getTile(x, y - 1),
          this.city.getTile(x, y + 1)
        ];
        if (neighbors.some(n => n && n.isWater())) {
          value += 20;
        }

        tile.landValue = Math.max(0, Math.min(255, Math.floor(value)));
      }
    }
  }

  // Update service effects (crime, fire risk)
  updateServices() {
    const services = this.city.getServiceBuildings();

    // Reset crime and fire risk
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        tile.crime = 50;  // Base crime level
        tile.fireRisk = 20; // Base fire risk
      }
    }

    // Apply service effects
    services.forEach(service => {
      const effectRadius = service.radius * (
        service.type === 'police' ?
          this.budget.policeFunding / 100 :
          this.budget.fireFunding / 100
      );

      for (let dy = -effectRadius; dy <= effectRadius; dy++) {
        for (let dx = -effectRadius; dx <= effectRadius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= effectRadius) {
            const tile = this.city.getTile(service.x + dx, service.y + dy);
            if (tile) {
              const effect = 1 - (dist / effectRadius);
              if (service.type === 'police') {
                tile.crime = Math.max(0, tile.crime - effect * 50);
              } else {
                tile.fireRisk = Math.max(0, tile.fireRisk - effect * 20);
              }
            }
          }
        }
      }
    });

    // Calculate city-wide stats
    let totalCrime = 0;
    let totalPollution = 0;
    let count = 0;

    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isBuilding()) {
          totalCrime += tile.crime;
          totalPollution += tile.pollution;
          count++;
        }
      }
    }

    this.stats.crimeRate = count > 0 ? totalCrime / count : 0;
    this.stats.pollutionLevel = count > 0 ? totalPollution / count : 0;
  }

  // Get date string
  getDateString() {
    return `${MONTH_NAMES[this.month]} ${this.year}`;
  }

  // Get demand values for UI (normalized 0-100)
  getDemandIndicators() {
    return {
      residential: Math.round((this.residentialDemand + 1) / 3 * 100),
      commercial: Math.round((this.commercialDemand + 1) / 3 * 100),
      industrial: Math.round((this.industrialDemand + 1) / 3 * 100)
    };
  }

  // ==================== DISASTER SYSTEM ====================

  // Active disasters tracking
  activeDisasters = {
    fires: [],      // [{x, y, age}]
    monster: null,  // {x, y, dx, dy, hp}
    tornado: null   // {x, y, dx, dy, lifetime}
  };

  // Start a fire at location
  startFire(x, y) {
    const tile = this.city.getTile(x, y);
    if (!tile || tile.isWater() || tile.isBurning()) return false;

    // Store original type for restoration
    tile.originalType = tile.type;
    tile.type = TILE_TYPES.FIRE_BURNING;
    this.activeDisasters.fires.push({ x, y, age: 0 });
    return true;
  }

  // Trigger fire disaster at random location
  triggerFireDisaster() {
    // Find a random developed area to start fire
    const candidates = [];
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isFlammable()) {
          candidates.push({ x, y });
        }
      }
    }

    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      this.startFire(target.x, target.y);
      return true;
    }
    return false;
  }

  // Update active fires (spread and burn out)
  updateFires() {
    const newFires = [];

    for (let i = this.activeDisasters.fires.length - 1; i >= 0; i--) {
      const fire = this.activeDisasters.fires[i];
      fire.age++;

      const tile = this.city.getTile(fire.x, fire.y);
      if (!tile || !tile.isBurning()) {
        this.activeDisasters.fires.splice(i, 1);
        continue;
      }

      // Check if fire department is nearby (reduces spread chance)
      const fireProtection = tile.fireRisk < 10;

      // Fire spreads to adjacent tiles
      if (fire.age < 20 && Math.random() < (fireProtection ? 0.05 : 0.2)) {
        const dirs = [
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = fire.x + dir.dx;
        const ny = fire.y + dir.dy;
        const neighbor = this.city.getTile(nx, ny);

        if (neighbor && neighbor.isFlammable() && !neighbor.isBurning()) {
          this.startFire(nx, ny);
        }
      }

      // Fire burns out after some time, leaves rubble
      if (fire.age > (fireProtection ? 10 : 30)) {
        tile.type = TILE_TYPES.RUBBLE;
        tile.clear();
        tile.type = TILE_TYPES.RUBBLE;
        this.activeDisasters.fires.splice(i, 1);
      }
    }
  }

  // Trigger monster disaster
  triggerMonsterDisaster() {
    // Monster appears from map edge
    const edge = Math.floor(Math.random() * 4);
    let x, y, dx, dy;

    switch (edge) {
      case 0: // Top
        x = Math.floor(Math.random() * this.city.width);
        y = 0;
        dx = 0; dy = 1;
        break;
      case 1: // Right
        x = this.city.width - 1;
        y = Math.floor(Math.random() * this.city.height);
        dx = -1; dy = 0;
        break;
      case 2: // Bottom
        x = Math.floor(Math.random() * this.city.width);
        y = this.city.height - 1;
        dx = 0; dy = -1;
        break;
      case 3: // Left
        x = 0;
        y = Math.floor(Math.random() * this.city.height);
        dx = 1; dy = 0;
        break;
    }

    this.activeDisasters.monster = { x, y, dx, dy, hp: 50 };
  }

  // Update monster movement and destruction
  updateMonster() {
    const monster = this.activeDisasters.monster;
    if (!monster) return;

    // Destroy current tile
    const tile = this.city.getTile(monster.x, monster.y);
    if (tile && !tile.isWater() && !tile.isEmpty()) {
      this.city.bulldoze(monster.x, monster.y);
      tile.type = TILE_TYPES.RUBBLE;
    }

    // Move monster
    monster.hp--;

    // Randomly change direction sometimes
    if (Math.random() < 0.2) {
      const dirs = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
      ];
      const newDir = dirs[Math.floor(Math.random() * dirs.length)];
      monster.dx = newDir.dx;
      monster.dy = newDir.dy;
    }

    monster.x += monster.dx;
    monster.y += monster.dy;

    // Keep monster in bounds
    monster.x = Math.max(0, Math.min(this.city.width - 1, monster.x));
    monster.y = Math.max(0, Math.min(this.city.height - 1, monster.y));

    // Monster leaves when HP depleted
    if (monster.hp <= 0) {
      this.activeDisasters.monster = null;
    }
  }

  // Trigger tornado disaster
  triggerTornadoDisaster() {
    // Tornado appears at random location
    this.activeDisasters.tornado = {
      x: Math.floor(Math.random() * this.city.width),
      y: Math.floor(Math.random() * this.city.height),
      dx: Math.random() < 0.5 ? -1 : 1,
      dy: Math.random() < 0.5 ? -1 : 1,
      lifetime: 30 + Math.floor(Math.random() * 30)
    };
  }

  // Update tornado movement and destruction
  updateTornado() {
    const tornado = this.activeDisasters.tornado;
    if (!tornado) return;

    // Destroy tiles in a small radius
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = this.city.getTile(tornado.x + dx, tornado.y + dy);
        if (tile && !tile.isWater() && !tile.isEmpty() && Math.random() < 0.5) {
          this.city.bulldoze(tornado.x + dx, tornado.y + dy);
          tile.type = TILE_TYPES.RUBBLE;
        }
      }
    }

    // Move tornado somewhat randomly
    if (Math.random() < 0.3) {
      tornado.dx = Math.random() < 0.5 ? -1 : 1;
    }
    if (Math.random() < 0.3) {
      tornado.dy = Math.random() < 0.5 ? -1 : 1;
    }

    tornado.x += tornado.dx;
    tornado.y += tornado.dy;

    // Keep in bounds
    tornado.x = Math.max(0, Math.min(this.city.width - 1, tornado.x));
    tornado.y = Math.max(0, Math.min(this.city.height - 1, tornado.y));

    tornado.lifetime--;
    if (tornado.lifetime <= 0) {
      this.activeDisasters.tornado = null;
    }
  }

  // Trigger earthquake disaster
  triggerEarthquakeDisaster() {
    // Earthquake damages random tiles across the map
    const damageCount = 20 + Math.floor(Math.random() * 30);

    for (let i = 0; i < damageCount; i++) {
      const x = Math.floor(Math.random() * this.city.width);
      const y = Math.floor(Math.random() * this.city.height);
      const tile = this.city.getTile(x, y);

      if (tile && !tile.isWater() && !tile.isEmpty()) {
        // Higher chance to damage older/weaker buildings
        if (Math.random() < 0.4) {
          this.city.bulldoze(x, y);
          tile.type = TILE_TYPES.RUBBLE;

          // Earthquakes can also start fires
          if (Math.random() < 0.2) {
            const neighbors = [
              { x: x - 1, y }, { x: x + 1, y },
              { x, y: y - 1 }, { x, y: y + 1 }
            ];
            for (const n of neighbors) {
              const nTile = this.city.getTile(n.x, n.y);
              if (nTile && nTile.isFlammable() && Math.random() < 0.3) {
                this.startFire(n.x, n.y);
                break;
              }
            }
          }
        }
      }
    }
  }

  // Trigger flood disaster
  triggerFloodDisaster() {
    // Flood spreads from water tiles
    const floodTiles = [];

    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isWater()) {
          // Check adjacent non-water tiles
          const neighbors = [
            { x: x - 1, y }, { x: x + 1, y },
            { x, y: y - 1 }, { x, y: y + 1 }
          ];
          for (const n of neighbors) {
            const nTile = this.city.getTile(n.x, n.y);
            if (nTile && !nTile.isWater() && Math.random() < 0.3) {
              floodTiles.push({ x: n.x, y: n.y });
            }
          }
        }
      }
    }

    // Apply flooding
    floodTiles.forEach(({ x, y }) => {
      const tile = this.city.getTile(x, y);
      if (tile) {
        this.city.bulldoze(x, y);
        tile.type = TILE_TYPES.FLOOD;
      }
    });

    // Floods recede after some time (handled in tick)
  }

  // Update all active disasters
  updateDisasters() {
    this.updateFires();
    this.updateMonster();
    this.updateTornado();

    // Floods slowly recede
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isFlooded() && Math.random() < 0.1) {
          tile.type = TILE_TYPES.EMPTY;
        }
      }
    }
  }

  // ==================== END DISASTER SYSTEM ====================

  // Serialize for save
  serialize() {
    return {
      year: this.year,
      month: this.month,
      residentialDemand: this.residentialDemand,
      commercialDemand: this.commercialDemand,
      industrialDemand: this.industrialDemand,
      stats: this.stats
    };
  }

  // Deserialize from save
  static deserialize(data, city, budget) {
    const sim = new Simulation(city, budget);
    Object.assign(sim, data);
    return sim;
  }
}
