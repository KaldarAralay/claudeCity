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
      pollutionLevel: 0,
      averageTraffic: 0,
      averageLandValue: 0
    };

    // Voter complaints (0-100%, below 20% is good)
    this.voterComplaints = {
      crime: 0,
      fire: 0,
      housingCosts: 0,
      pollution: 0,
      taxes: 0,
      traffic: 0,
      unemployment: 0
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
    this.calculateVoterComplaints();

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
  // Land value affects: R growth + class, C size limit + class, I ignores land value
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
          // Developed zone - try to increase level
          if (canDevelop) {
            const demand = this.getDemandForZone(tile.zoneType);
            const growthChance = this.calculateGrowthChance(tile, demand);

            if (Math.random() < growthChance) {
              // Check if zone can grow (land value limits for commercial, TOP requirements)
              if (this.canZoneGrow(tile, x, y)) {
                this.increaseZoneDensity(x, y);
              }
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

  // Calculate growth chance based on zone type, demand, and land value
  calculateGrowthChance(tile, demand) {
    if (demand <= 0) return 0;

    let baseChance = demand * 0.05;

    if (tile.isResidential()) {
      // Residential: Land value boosts growth, pollution hurts
      const effectiveLandValue = tile.getEffectiveLandValue();
      const landValueBonus = effectiveLandValue / 255 * 0.05; // Up to +5% from land value
      baseChance += landValueBonus;
    } else if (tile.isCommercial()) {
      // Commercial: Growth based on demand only, land value affects SIZE limit
      // (handled in canZoneGrow)
    } else if (tile.isIndustrial()) {
      // Industrial: Growth purely from demand
      // Slightly faster growth rate for industry
      baseChance *= 1.2;
    }

    return Math.min(0.2, baseChance); // Cap at 20% per tick
  }

  // Check if a zone can grow to the next level
  canZoneGrow(tile, x, y) {
    if (tile.isMaxLevel()) return false;

    const nextLevel = tile.level + 1;
    const maxLevel = tile.getMaxLevel();

    // Check if trying to reach TOP level (max)
    if (nextLevel >= maxLevel) {
      // TOP requires two adjacent zones of the same type at max-1 level with High class
      return this.canReachTopLevel(tile, x, y);
    }

    // Commercial zones have land value requirements for growth
    if (tile.isCommercial()) {
      const requiredLandValue = COMMERCIAL_LAND_VALUE_REQUIREMENTS[nextLevel] || 0;
      if (tile.getEffectiveLandValue() < requiredLandValue) {
        return false; // Not enough land value to grow
      }
    }

    return true;
  }

  // Check if zone can reach TOP level (requires adjacent High class zones)
  canReachTopLevel(tile, x, y) {
    // Per game mechanics: R-TOP and C-TOP require two adjacent zones at max-1 level with High class
    // Industrial zones don't have this requirement
    if (tile.isIndustrial()) return true;

    const maxLevel = tile.getMaxLevel();
    const requiredLevel = maxLevel - 1; // Need to be at one below TOP

    // Check if current zone is at the required level
    if (tile.level !== requiredLevel) return false;

    // Must be High class to reach TOP
    if (!tile.isHighClass()) return false;

    // Check for adjacent zone of same type at same level with High class
    const adjacentOffsets = [
      { dx: -3, dy: 0 },  // Left (3x3 zone)
      { dx: 3, dy: 0 },   // Right
      { dx: 0, dy: -3 },  // Up
      { dx: 0, dy: 3 }    // Down
    ];

    for (const offset of adjacentOffsets) {
      const adjTile = this.city.getTile(x + offset.dx, y + offset.dy);
      if (adjTile &&
          adjTile.isMainTile &&
          adjTile.zoneType === tile.zoneType &&
          adjTile.level === requiredLevel &&
          adjTile.isHighClass()) {
        return true; // Found a valid adjacent zone
      }
    }

    return false; // No valid adjacent High class zone found
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
          // Only main tile tracks population/jobs and class
          if (tile.isMainTile) {
            tile.updateStats();
            tile.updateZoneClass(); // Set initial class based on land value
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
          // Only main tile tracks population/jobs and class
          if (tile.isMainTile) {
            tile.updateStats();
            tile.updateZoneClass(); // Update class when level changes
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
          // Only main tile tracks population/jobs and class
          if (tile.isMainTile) {
            tile.updateStats();
            tile.updateZoneClass(); // Update class when level changes
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

  // Update land values based on NES SimCity mechanics
  // Land value is boosted by: Water, Forest, Parks, City Center proximity
  // Pollution reduces EFFECTIVE land value (for class calculation) but not stored value
  updateLandValues() {
    // First, find the city center (weighted average of all developed zones)
    let centerX = this.city.width / 2;
    let centerY = this.city.height / 2;
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isBuilding()) {
          const weight = tile.level + 1;
          weightedX += x * weight;
          weightedY += y * weight;
          totalWeight += weight;
        }
      }
    }

    if (totalWeight > 0) {
      centerX = weightedX / totalWeight;
      centerY = weightedY / totalWeight;
    }

    // Store city center for other calculations
    this.cityCenter = { x: centerX, y: centerY };

    // Calculate max distance from center for normalization
    const maxDist = Math.sqrt(
      Math.pow(this.city.width / 2, 2) + Math.pow(this.city.height / 2, 2)
    );

    // Calculate land values for each tile
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        let value = 30; // Base land value

        // Check nearby tiles for terrain features (within radius 4)
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 4) continue;

            const nearbyTile = this.city.getTile(x + dx, y + dy);
            if (!nearbyTile) continue;

            const distFactor = 1 - (dist / 5); // Falloff with distance

            // Water boost (highest)
            if (nearbyTile.isWater()) {
              if (dist <= 1) {
                value += LAND_VALUE_BOOSTS.WATER; // Direct adjacency
              } else {
                value += LAND_VALUE_BOOSTS.WATER_ADJACENT * distFactor;
              }
            }

            // Forest boost
            if (nearbyTile.isForest()) {
              if (dist <= 1) {
                value += LAND_VALUE_BOOSTS.FOREST;
              } else {
                value += LAND_VALUE_BOOSTS.FOREST_ADJACENT * distFactor;
              }
            }

            // Park boost (very valuable)
            if (nearbyTile.isPark()) {
              if (dist <= 1) {
                value += LAND_VALUE_BOOSTS.PARK;
              } else {
                value += LAND_VALUE_BOOSTS.PARK_ADJACENT * distFactor;
              }
            }
          }
        }

        // City center proximity boost
        const distToCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const centerBoost = LAND_VALUE_BOOSTS.CITY_CENTER_MAX *
          (1 - distToCenter / maxDist);
        value += Math.max(0, centerBoost);

        // Services boost (police/fire stations indicate good neighborhood)
        const services = this.city.getServiceBuildings();
        services.forEach(service => {
          const dist = Math.sqrt((x - service.x) ** 2 + (y - service.y) ** 2);
          if (dist < service.radius) {
            value += (service.radius - dist) * 0.5;
          }
        });

        // Store the raw land value (pollution is factored in during class calculation)
        tile.landValue = Math.max(0, Math.min(255, Math.floor(value)));

        // Update zone class if this is a zone
        if (tile.isMainTile && (tile.isBuilding() || tile.isZone())) {
          tile.updateZoneClass();
        }
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
    let totalLandValue = 0;
    let totalTraffic = 0;
    let buildingCount = 0;
    let roadCount = 0;

    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isBuilding()) {
          totalCrime += tile.crime;
          totalPollution += tile.pollution;
          totalLandValue += tile.landValue;
          buildingCount++;
        }
        if (tile.isRoad()) {
          totalTraffic += tile.traffic;
          roadCount++;
        }
      }
    }

    this.stats.crimeRate = buildingCount > 0 ? totalCrime / buildingCount : 0;
    this.stats.pollutionLevel = buildingCount > 0 ? totalPollution / buildingCount : 0;
    this.stats.averageLandValue = buildingCount > 0 ? totalLandValue / buildingCount : 0;
    this.stats.averageTraffic = roadCount > 0 ? totalTraffic / roadCount : 0;
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

  // Calculate voter complaints (0-100% for each category)
  calculateVoterComplaints() {
    const stats = this.city.getZoneStats();
    const zoneCounts = this.city.countZones();
    const totalDevelopedZones = zoneCounts.residential.developed +
                                 zoneCounts.commercial.developed +
                                 zoneCounts.industrial.developed;

    // Skip calculations if no developed zones
    if (totalDevelopedZones === 0) {
      this.voterComplaints = {
        crime: 0, fire: 0, housingCosts: 0,
        pollution: 0, taxes: 0, traffic: 0, unemployment: 0
      };
      return;
    }

    // 1. CRIME - based on average crime level vs police coverage
    // Crime rate 0 = 0%, Crime rate 100 = 100%
    this.voterComplaints.crime = Math.min(100, Math.round(
      (this.stats.crimeRate / COMPLAINT_THRESHOLDS.CRIME_ACCEPTABLE) * 20
    ));

    // 2. FIRE - based on active fires and fire station coverage
    const activeFireCount = this.activeDisasters.fires.length;
    const fireStations = this.city.getServiceBuildings().filter(s => s.type === 'fire').length;
    const fireStationsNeeded = Math.ceil(totalDevelopedZones * COMPLAINT_THRESHOLDS.FIRE_STATIONS_PER_ZONE);
    const fireCoverage = fireStationsNeeded > 0 ? fireStations / fireStationsNeeded : 1;

    // Active fires greatly increase complaint, poor coverage increases it moderately
    this.voterComplaints.fire = Math.min(100, Math.round(
      activeFireCount * 20 + (1 - Math.min(1, fireCoverage)) * 30
    ));

    // 3. HOUSING COSTS - high land values make housing expensive
    // Also affected by distance from R zones to C/I zones (simplified)
    const avgLandValue = this.stats.averageLandValue;
    const housingPressure = avgLandValue > COMPLAINT_THRESHOLDS.HOUSING_LAND_VALUE_HIGH
      ? (avgLandValue - COMPLAINT_THRESHOLDS.HOUSING_LAND_VALUE_HIGH) / 80
      : 0;

    // Check R zone distance to jobs (simplified: ratio of R to C+I)
    const rToJobRatio = zoneCounts.residential.developed /
      Math.max(1, zoneCounts.commercial.developed + zoneCounts.industrial.developed);
    const distancePenalty = rToJobRatio > 2 ? (rToJobRatio - 2) * 10 : 0;

    this.voterComplaints.housingCosts = Math.min(100, Math.round(
      housingPressure * 50 + distancePenalty
    ));

    // 4. POLLUTION - based on average pollution level
    this.voterComplaints.pollution = Math.min(100, Math.round(
      (this.stats.pollutionLevel / COMPLAINT_THRESHOLDS.POLLUTION_ACCEPTABLE) * 20
    ));

    // 5. TAXES - based on tax rate vs optimal
    const taxRate = this.budget.taxRate;
    if (taxRate <= COMPLAINT_THRESHOLDS.TAX_OPTIMAL) {
      this.voterComplaints.taxes = 0;
    } else if (taxRate <= COMPLAINT_THRESHOLDS.TAX_HIGH) {
      // Gradual increase from optimal to high
      this.voterComplaints.taxes = Math.round(
        ((taxRate - COMPLAINT_THRESHOLDS.TAX_OPTIMAL) /
         (COMPLAINT_THRESHOLDS.TAX_HIGH - COMPLAINT_THRESHOLDS.TAX_OPTIMAL)) * 40
      );
    } else {
      // Major complaints above high threshold
      this.voterComplaints.taxes = Math.min(100, 40 + (taxRate - COMPLAINT_THRESHOLDS.TAX_HIGH) * 10);
    }

    // 6. TRAFFIC - based on average traffic on roads
    this.voterComplaints.traffic = Math.min(100, Math.round(
      (this.stats.averageTraffic / COMPLAINT_THRESHOLDS.TRAFFIC_ACCEPTABLE) * 20
    ));

    // 7. UNEMPLOYMENT - jobs vs population ratio
    // Need enough jobs for the population
    const totalJobs = stats.commercialJobs + stats.industrialJobs;
    const jobsPerPerson = this.population > 0 ? totalJobs / this.population : 1;

    if (jobsPerPerson >= COMPLAINT_THRESHOLDS.UNEMPLOYMENT_RATIO) {
      this.voterComplaints.unemployment = 0;
    } else {
      // Unemployment increases as job ratio decreases
      this.voterComplaints.unemployment = Math.min(100, Math.round(
        (1 - jobsPerPerson / COMPLAINT_THRESHOLDS.UNEMPLOYMENT_RATIO) * 80
      ));
    }

    // Calculate unemployment rate for stats
    this.stats.unemploymentRate = this.population > 0
      ? Math.max(0, 100 - (totalJobs / this.population) * 100)
      : 0;
  }

  // Check if voters are satisfied (all complaints below threshold)
  areVotersSatisfied() {
    return Object.values(this.voterComplaints).every(
      complaint => complaint < VOTER_SATISFACTION_THRESHOLD
    );
  }

  // Get overall approval rating (100 - average complaint)
  getApprovalRating() {
    const complaints = Object.values(this.voterComplaints);
    const avgComplaint = complaints.reduce((a, b) => a + b, 0) / complaints.length;
    return Math.round(100 - avgComplaint);
  }

  // Get voter complaints for UI display
  getVoterComplaints() {
    return {
      ...this.voterComplaints,
      approvalRating: this.getApprovalRating(),
      satisfied: this.areVotersSatisfied()
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
