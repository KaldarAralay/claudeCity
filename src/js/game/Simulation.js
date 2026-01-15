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

    // Scenario mode
    this.scenario = null;
    this.scenarioStartYear = 0;
    this.scenarioStartMonth = 0;
    this.scenarioMonthsElapsed = 0;
    this.scenarioComplete = false;
    this.scenarioFailed = false;
    this.triggeredDisasters = new Set();  // Track which scheduled disasters have fired

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

  // Set up scenario mode
  setScenario(scenario) {
    this.scenario = scenario;
    this.year = scenario.year;
    this.month = 0;
    this.scenarioStartYear = scenario.year;
    this.scenarioStartMonth = 0;
    this.scenarioMonthsElapsed = 0;
    this.scenarioComplete = false;
    this.scenarioFailed = false;
    this.triggeredDisasters = new Set();
  }

  // Check scenario goals and time limit
  checkScenarioStatus() {
    if (!this.scenario || this.scenarioComplete || this.scenarioFailed) return;

    // Update elapsed time
    this.scenarioMonthsElapsed = (this.year - this.scenarioStartYear) * 12 + this.month;

    // Check time limit (if not infinite)
    if (this.scenario.duration > 0) {
      const maxMonths = this.scenario.duration * 12;
      if (this.scenarioMonthsElapsed >= maxMonths) {
        // Time's up - check if goal was met
        if (this.checkScenarioGoal()) {
          this.scenarioComplete = true;
          if (this.onScenarioWin) this.onScenarioWin(this.scenario);
        } else {
          this.scenarioFailed = true;
          if (this.onScenarioLose) this.onScenarioLose(this.scenario);
        }
        return;
      }
    }

    // Check if goal is met early
    if (this.checkScenarioGoal()) {
      this.scenarioComplete = true;
      if (this.onScenarioWin) this.onScenarioWin(this.scenario);
    }
  }

  // Check if scenario goal is met
  checkScenarioGoal() {
    if (!this.scenario) return false;

    switch (this.scenario.goalType) {
      case 'population':
        return this.population >= this.scenario.goalValue;

      case 'metropolis':
        return this.population >= CITY_CLASSES.METROPOLIS.minPop;

      case 'megalopolis':
        return this.population >= CITY_CLASSES.MEGALOPOLIS.minPop;

      case 'crime':
        // Crime must be BELOW the goal value
        return this.stats.crimeRate < this.scenario.goalValue;

      default:
        return false;
    }
  }

  // Get scenario progress info
  getScenarioProgress() {
    if (!this.scenario) return null;

    const maxMonths = this.scenario.duration > 0 ? this.scenario.duration * 12 : -1;
    const remainingMonths = maxMonths > 0 ? maxMonths - this.scenarioMonthsElapsed : -1;

    let progress = 0;
    let goalText = '';
    let currentValue = 0;
    let targetValue = this.scenario.goalValue;

    switch (this.scenario.goalType) {
      case 'population':
      case 'metropolis':
      case 'megalopolis':
        currentValue = this.population;
        progress = Math.min(100, (this.population / this.scenario.goalValue) * 100);
        goalText = `Population: ${this.population.toLocaleString()} / ${this.scenario.goalValue.toLocaleString()}`;
        break;
      case 'crime':
        currentValue = Math.round(this.stats.crimeRate);
        progress = Math.max(0, 100 - this.stats.crimeRate);
        goalText = `Crime Rate: ${Math.round(this.stats.crimeRate)}% (Goal: below ${this.scenario.goalValue}%)`;
        break;
    }

    return {
      name: this.scenario.name,
      description: this.scenario.description,
      progress: Math.round(progress),
      percentage: Math.round(progress),
      currentValue,
      targetValue,
      goalText,
      monthsElapsed: this.scenarioMonthsElapsed,
      monthsRemaining: remainingMonths,
      yearsRemaining: remainingMonths > 0 ? Math.ceil(remainingMonths / 12) : -1,
      complete: this.scenarioComplete,
      failed: this.scenarioFailed
    };
  }

  // Check and trigger scheduled disasters
  checkScheduledDisasters() {
    if (!this.scenario || !this.scenario.scheduledDisasters) return;

    for (const disaster of this.scenario.scheduledDisasters) {
      const key = `${disaster.type}-${disaster.month}`;
      if (this.scenarioMonthsElapsed >= disaster.month && !this.triggeredDisasters.has(key)) {
        this.triggeredDisasters.add(key);
        this.triggerScheduledDisaster(disaster.type);
      }
    }
  }

  // Trigger a scheduled disaster
  triggerScheduledDisaster(type) {
    switch (type) {
      case 'earthquake':
        this.triggerEarthquakeDisaster();
        break;
      case 'fire':
        this.triggerFireDisaster();
        break;
      case 'flood':
        this.triggerFloodDisaster();
        break;
      case 'tornado':
        this.triggerTornadoDisaster();
        break;
      case 'monster':
        this.triggerMonsterDisaster();
        break;
      case 'meltdown':
        this.triggerNuclearMeltdown();
        break;
      case 'plane':
        this.triggerPlaneCrashDisaster();
        break;
      case 'ufo':
        this.triggerUFODisaster();
        break;
    }
  }

  // Get city classification based on population
  getCityClass() {
    if (this.population >= CITY_CLASSES.MEGALOPOLIS.minPop) return CITY_CLASSES.MEGALOPOLIS;
    if (this.population >= CITY_CLASSES.METROPOLIS.minPop) return CITY_CLASSES.METROPOLIS;
    if (this.population >= CITY_CLASSES.CAPITAL.minPop) return CITY_CLASSES.CAPITAL;
    if (this.population >= CITY_CLASSES.CITY.minPop) return CITY_CLASSES.CITY;
    if (this.population >= CITY_CLASSES.TOWN.minPop) return CITY_CLASSES.TOWN;
    return CITY_CLASSES.VILLAGE;
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
    this.updateTransportDeterioration();
    this.updateDisasters();
    this.calculateVoterComplaints();

    // Process budget
    this.budget.processMonth(this.city);

    // Update population
    this.population = this.city.getTotalPopulation();

    // Check scenario-related events
    if (this.scenario) {
      this.checkScheduledDisasters();
      this.checkScenarioStatus();
    }

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
  // Difficulty affects: effective tax rate perception, industrial demand multiplier
  updateDemand() {
    const stats = this.city.getZoneStats();
    const difficultySettings = this.budget.difficultySettings;

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

    // Apply difficulty industrial demand multiplier (Easy: x1.2, Normal: x1.1, Hard: x0.98)
    this.industrialDemand *= difficultySettings.industrialDemandMultiplier;

    // Tax rate affects all demand - use effective tax rate based on difficulty
    // Easy: 7% neutral, Normal: 6% neutral, Hard: 5% neutral
    const effectiveTaxRate = this.budget.getEffectiveTaxRate();
    const taxPenalty = (effectiveTaxRate - 7) * 0.03;
    this.residentialDemand -= taxPenalty;
    this.commercialDemand -= taxPenalty;
    this.industrialDemand -= taxPenalty * 0.5; // Industry less affected by taxes

    // Clamp demands to valid range
    this.residentialDemand = Math.min(DEMAND_FACTORS.MAX_DEMAND, Math.max(DEMAND_FACTORS.MIN_DEMAND, this.residentialDemand));
    this.commercialDemand = Math.min(DEMAND_FACTORS.MAX_DEMAND, Math.max(DEMAND_FACTORS.MIN_DEMAND, this.commercialDemand));
    this.industrialDemand = Math.min(DEMAND_FACTORS.MAX_DEMAND, Math.max(DEMAND_FACTORS.MIN_DEMAND, this.industrialDemand));
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

  // Update pollution using NES SimCity 2x2 grid diffusion system
  // Each tile adds pollution to its 2x2 square, then diffusion spreads it
  updatePollution() {
    const width = this.city.width;
    const height = this.city.height;

    // Create 2x2 pollution grid (half the resolution of the tile grid)
    // Each 2x2 square covers 4 tiles
    const gridWidth = Math.ceil(width / 2);
    const gridHeight = Math.ceil(height / 2);
    let pollutionGrid = new Array(gridHeight).fill(0).map(() => new Array(gridWidth).fill(0));

    // Phase 1: Add pollution sources to 2x2 grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.city.tiles[y][x];
        const gridX = Math.floor(x / 2);
        const gridY = Math.floor(y / 2);
        let pollutionValue = 0;

        // Nuclear waste sets the 2x2 to maximum
        if (tile.isNuclearWaste()) {
          pollutionGrid[gridY][gridX] = POLLUTION_VALUES.NUCLEAR_WASTE;
          continue;
        }

        // Industrial zones - each tile contributes (developed zones only)
        if (tile.isIndustrial() && tile.isBuilding()) {
          pollutionValue = POLLUTION_VALUES.INDUSTRIAL;
        }

        // Coal power plant - each tile contributes
        if (tile.type === TILE_TYPES.COAL_POWER) {
          pollutionValue = POLLUTION_VALUES.COAL_POWER;
        }

        // Seaport - each tile contributes
        if (tile.type === TILE_TYPES.SEAPORT) {
          pollutionValue = POLLUTION_VALUES.SEAPORT;
        }

        // Airport - each tile contributes
        if (tile.type === TILE_TYPES.AIRPORT) {
          pollutionValue = POLLUTION_VALUES.AIRPORT;
        }

        // Active fire
        if (tile.isBurning()) {
          pollutionValue = POLLUTION_VALUES.FIRE;
        }

        // Add to 2x2 grid
        if (pollutionValue > 0) {
          pollutionGrid[gridY][gridX] = Math.min(
            POLLUTION_DIFFUSION.MAX_VALUE,
            pollutionGrid[gridY][gridX] + pollutionValue
          );
        }
      }
    }

    // Phase 2: Apply diffusion (25% to self and adjacent, done twice)
    for (let pass = 0; pass < POLLUTION_DIFFUSION.PASSES; pass++) {
      pollutionGrid = this.diffusePollution(pollutionGrid, gridWidth, gridHeight);
    }

    // Phase 3: Map 2x2 grid back to tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gridX = Math.floor(x / 2);
        const gridY = Math.floor(y / 2);
        this.city.tiles[y][x].pollution = Math.floor(pollutionGrid[gridY][gridX]);
      }
    }

    // Calculate average pollution for stats
    let totalPollution = 0;
    let buildingCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isBuilding()) {
          totalPollution += tile.pollution;
          buildingCount++;
        }
      }
    }
    this.stats.pollutionLevel = buildingCount > 0 ? totalPollution / buildingCount : 0;
  }

  // Diffusion: Add 25% of each cell's value to itself and adjacent cells
  diffusePollution(grid, width, height) {
    const factor = POLLUTION_DIFFUSION.FACTOR;
    const newGrid = new Array(height).fill(0).map(() => new Array(width).fill(0));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = grid[y][x];
        if (value === 0) continue;

        const contribution = value * factor;

        // Add to self
        newGrid[y][x] = Math.min(POLLUTION_DIFFUSION.MAX_VALUE, newGrid[y][x] + contribution);

        // Add to adjacent cells (N, S, E, W)
        if (y > 0) {
          newGrid[y - 1][x] = Math.min(POLLUTION_DIFFUSION.MAX_VALUE, newGrid[y - 1][x] + contribution);
        }
        if (y < height - 1) {
          newGrid[y + 1][x] = Math.min(POLLUTION_DIFFUSION.MAX_VALUE, newGrid[y + 1][x] + contribution);
        }
        if (x > 0) {
          newGrid[y][x - 1] = Math.min(POLLUTION_DIFFUSION.MAX_VALUE, newGrid[y][x - 1] + contribution);
        }
        if (x < width - 1) {
          newGrid[y][x + 1] = Math.min(POLLUTION_DIFFUSION.MAX_VALUE, newGrid[y][x + 1] + contribution);
        }
      }
    }

    return newGrid;
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

  // Update transport infrastructure deterioration when funding is below 100%
  // Roads and rails can decay to rubble if underfunded
  // Power line crossovers protect roads/rails from deterioration
  updateTransportDeterioration() {
    const transportFunding = this.budget.transportFunding;

    // Only deteriorate if funding is below 100%
    if (transportFunding >= 100) return;

    const difficultySettings = this.budget.difficultySettings;
    const deteriorationChance = difficultySettings.deteriorationChance;

    // Calculate actual deterioration probability based on funding deficit
    // At 0% funding: full deterioration chance
    // At 50% funding: half deterioration chance
    // At 100% funding: no deterioration
    const fundingDeficit = (100 - transportFunding) / 100;
    const actualChance = deteriorationChance * fundingDeficit;

    // Check each road and rail tile
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];

        // Only process roads and rails
        if (!tile.isRoad() && !tile.isRail()) continue;

        // Power line crossover protection - roads/rails under power lines don't deteriorate
        if (this.hasPowerLineCrossover(x, y)) continue;

        // Roll for deterioration
        if (Math.random() < actualChance) {
          // Road/rail deteriorates to rubble
          tile.type = TILE_TYPES.RUBBLE;
          tile.clear();
          tile.type = TILE_TYPES.RUBBLE;
        }
      }
    }
  }

  // Check if a road/rail tile has power line crossing over it
  // In NES SimCity, power lines can cross over roads/rails and protect them
  hasPowerLineCrossover(x, y) {
    const tile = this.city.getTile(x, y);
    if (!tile) return false;

    // Check if this tile has the powerLineCrossover flag set
    // This flag is set when a power line is placed over existing road/rail
    return tile.powerLineCrossover === true;
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
    tornado: null,  // {x, y, dx, dy, lifetime}
    plane: null,    // {x, y, dx, dy, targetX, targetY, crashed}
    ufos: []        // [{x, y, dx, dy, lifetime, attackCooldown}]
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

  // Trigger plane crash disaster - plane flies across map and crashes
  triggerPlaneCrashDisaster() {
    // Plane starts from a random edge and flies to crash at a random location
    const edge = Math.floor(Math.random() * 4);
    let x, y, dx, dy;

    // Pick a random crash target (prefer developed areas)
    let targetX = Math.floor(Math.random() * this.city.width);
    let targetY = Math.floor(Math.random() * this.city.height);

    // Try to find a developed area to crash into
    const candidates = [];
    for (let ty = 0; ty < this.city.height; ty++) {
      for (let tx = 0; tx < this.city.width; tx++) {
        const tile = this.city.tiles[ty][tx];
        if (tile.isBuilding() || tile.isZone()) {
          candidates.push({ x: tx, y: ty });
        }
      }
    }
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      targetX = target.x;
      targetY = target.y;
    }

    // Start from edge, heading toward target
    switch (edge) {
      case 0: // Top
        x = Math.floor(Math.random() * this.city.width);
        y = -5;
        break;
      case 1: // Right
        x = this.city.width + 5;
        y = Math.floor(Math.random() * this.city.height);
        break;
      case 2: // Bottom
        x = Math.floor(Math.random() * this.city.width);
        y = this.city.height + 5;
        break;
      case 3: // Left
        x = -5;
        y = Math.floor(Math.random() * this.city.height);
        break;
    }

    // Calculate direction toward target
    const angle = Math.atan2(targetY - y, targetX - x);
    dx = Math.cos(angle) * 2; // Speed of 2 tiles per update
    dy = Math.sin(angle) * 2;

    this.activeDisasters.plane = {
      x, y, dx, dy,
      targetX, targetY,
      crashed: false
    };
  }

  // Update plane movement and crash
  updatePlane() {
    const plane = this.activeDisasters.plane;
    if (!plane) return;

    if (plane.crashed) {
      // Plane already crashed, remove it
      this.activeDisasters.plane = null;
      return;
    }

    // Move plane
    plane.x += plane.dx;
    plane.y += plane.dy;

    // Check if plane reached crash target (within 2 tiles)
    const distToTarget = Math.sqrt(
      Math.pow(plane.x - plane.targetX, 2) +
      Math.pow(plane.y - plane.targetY, 2)
    );

    if (distToTarget < 2) {
      // CRASH! - affects a 1x1 area plus X pattern (5 tiles total)
      plane.crashed = true;
      const crashX = Math.round(plane.targetX);
      const crashY = Math.round(plane.targetY);

      // X pattern: center + 4 diagonal neighbors
      const crashPattern = [
        { dx: 0, dy: 0 },   // Center
        { dx: -1, dy: -1 }, // Top-left
        { dx: 1, dy: -1 },  // Top-right
        { dx: -1, dy: 1 },  // Bottom-left
        { dx: 1, dy: 1 }    // Bottom-right
      ];

      for (const offset of crashPattern) {
        const tx = crashX + offset.dx;
        const ty = crashY + offset.dy;
        const tile = this.city.getTile(tx, ty);

        if (tile && !tile.isWater() && !tile.isEmpty()) {
          this.city.bulldoze(tx, ty);
          // 50% chance to start fire, 50% just rubble
          if (Math.random() < 0.5 && tile.isFlammable()) {
            this.startFire(tx, ty);
          } else {
            tile.type = TILE_TYPES.RUBBLE;
          }
        }
      }
    }

    // If plane flew way off map without crashing, remove it
    if (plane.x < -20 || plane.x > this.city.width + 20 ||
        plane.y < -20 || plane.y > this.city.height + 20) {
      this.activeDisasters.plane = null;
    }
  }

  // Trigger UFO attack disaster - multiple UFOs attack the city
  triggerUFODisaster() {
    // Spawn 3-5 UFOs from different directions
    const numUFOs = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numUFOs; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x, y, dx, dy;

      switch (edge) {
        case 0: // Top
          x = Math.floor(Math.random() * this.city.width);
          y = -5;
          dx = (Math.random() - 0.5) * 2;
          dy = 1 + Math.random();
          break;
        case 1: // Right
          x = this.city.width + 5;
          y = Math.floor(Math.random() * this.city.height);
          dx = -(1 + Math.random());
          dy = (Math.random() - 0.5) * 2;
          break;
        case 2: // Bottom
          x = Math.floor(Math.random() * this.city.width);
          y = this.city.height + 5;
          dx = (Math.random() - 0.5) * 2;
          dy = -(1 + Math.random());
          break;
        case 3: // Left
          x = -5;
          y = Math.floor(Math.random() * this.city.height);
          dx = 1 + Math.random();
          dy = (Math.random() - 0.5) * 2;
          break;
      }

      this.activeDisasters.ufos.push({
        x, y, dx, dy,
        lifetime: 40 + Math.floor(Math.random() * 30),
        attackCooldown: 0
      });
    }
  }

  // Update UFO movements and attacks
  updateUFOs() {
    for (let i = this.activeDisasters.ufos.length - 1; i >= 0; i--) {
      const ufo = this.activeDisasters.ufos[i];

      // Move UFO
      ufo.x += ufo.dx;
      ufo.y += ufo.dy;

      // Occasionally change direction (erratic movement)
      if (Math.random() < 0.1) {
        ufo.dx += (Math.random() - 0.5) * 0.5;
        ufo.dy += (Math.random() - 0.5) * 0.5;
        // Clamp speed
        ufo.dx = Math.max(-2, Math.min(2, ufo.dx));
        ufo.dy = Math.max(-2, Math.min(2, ufo.dy));
      }

      // Keep UFO somewhat in bounds (can go slightly off)
      if (ufo.x < -10) ufo.dx = Math.abs(ufo.dx);
      if (ufo.x > this.city.width + 10) ufo.dx = -Math.abs(ufo.dx);
      if (ufo.y < -10) ufo.dy = Math.abs(ufo.dy);
      if (ufo.y > this.city.height + 10) ufo.dy = -Math.abs(ufo.dy);

      // Attack - spray disrupters on area below
      ufo.attackCooldown--;
      if (ufo.attackCooldown <= 0 && ufo.x >= 0 && ufo.x < this.city.width &&
          ufo.y >= 0 && ufo.y < this.city.height) {
        // Attack a 3x3 area
        const attackX = Math.floor(ufo.x);
        const attackY = Math.floor(ufo.y);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const tx = attackX + dx;
            const ty = attackY + dy;
            const tile = this.city.getTile(tx, ty);

            if (tile && !tile.isWater() && !tile.isEmpty() && Math.random() < 0.4) {
              this.city.bulldoze(tx, ty);
              // UFOs mostly cause fires (70%) or rubble (30%)
              if (Math.random() < 0.7) {
                this.startFire(tx, ty);
              } else {
                tile.type = TILE_TYPES.RUBBLE;
              }
            }
          }
        }
        ufo.attackCooldown = 3 + Math.floor(Math.random() * 3); // Attack every 3-6 ticks
      }

      // Decrease lifetime
      ufo.lifetime--;
      if (ufo.lifetime <= 0) {
        this.activeDisasters.ufos.splice(i, 1);
      }
    }
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

    // Destroy current tile - monster either demolishes to rubble OR starts a fire
    const tile = this.city.getTile(monster.x, monster.y);
    if (tile && !tile.isWater() && !tile.isEmpty() && !tile.isRubble()) {
      this.city.bulldoze(monster.x, monster.y);
      // 40% chance to start fire, 60% just rubble
      if (Math.random() < 0.4 && tile.isFlammable()) {
        this.startFire(monster.x, monster.y);
      } else {
        tile.type = TILE_TYPES.RUBBLE;
      }
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

    // Destroy tiles in a small radius - leaves trail of destruction and fires
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tile = this.city.getTile(tornado.x + dx, tornado.y + dy);
        if (tile && !tile.isWater() && !tile.isEmpty() && !tile.isRubble() && Math.random() < 0.5) {
          this.city.bulldoze(tornado.x + dx, tornado.y + dy);
          // 30% chance to start fire, 70% just rubble
          if (Math.random() < 0.3 && tile.isFlammable()) {
            this.startFire(tornado.x + dx, tornado.y + dy);
          } else {
            tile.type = TILE_TYPES.RUBBLE;
          }
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
    this.updatePlane();
    this.updateUFOs();

    // Floods slowly recede
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isFlooded() && Math.random() < 0.1) {
          tile.type = TILE_TYPES.EMPTY;
        }
      }
    }

    // Nuclear waste slowly decays (very slowly)
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.isNuclearWaste() && Math.random() < 0.01) {
          tile.type = TILE_TYPES.RUBBLE;
        }
      }
    }

    // Random disaster triggering based on difficulty
    this.checkRandomDisaster();
  }

  // Check for random disaster based on difficulty settings
  checkRandomDisaster() {
    const difficultySettings = this.budget.difficultySettings;

    // Roll for disaster
    if (Math.random() >= difficultySettings.disasterFrequency) return;

    // Determine which disaster
    if (!difficultySettings.allDisastersEnabled) {
      // Easy mode: only plane crashes and shipwrecks (simplified as small fires near airport/seaport)
      this.triggerMinorDisaster();
    } else {
      // Normal/Hard: All disasters possible
      const disasterTypes = ['fire', 'flood', 'tornado', 'earthquake'];

      // Nuclear meltdown only on Normal/Hard with nuclear plants
      if (difficultySettings.nuclearMeltdownEnabled) {
        const hasNuclearPlant = this.city.getPowerPlants().some(p => p.type === 'nuclear-power');
        if (hasNuclearPlant) {
          disasterTypes.push('meltdown');
        }
      }

      // Add monster for variety
      disasterTypes.push('monster');

      const disasterType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];

      switch (disasterType) {
        case 'fire':
          this.triggerFireDisaster();
          break;
        case 'flood':
          this.triggerFloodDisaster();
          break;
        case 'tornado':
          this.triggerTornadoDisaster();
          break;
        case 'earthquake':
          this.triggerEarthquakeDisaster();
          break;
        case 'monster':
          this.triggerMonsterDisaster();
          break;
        case 'meltdown':
          this.triggerNuclearMeltdown();
          break;
      }
    }
  }

  // Trigger minor disaster (plane crash / shipwreck - simplified as small fires)
  triggerMinorDisaster() {
    // Find airport or seaport
    const candidates = [];
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.type === TILE_TYPES.AIRPORT || tile.type === TILE_TYPES.SEAPORT) {
          candidates.push({ x, y });
        }
      }
    }

    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      // Start a small fire nearby
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const tile = this.city.getTile(target.x + dx, target.y + dy);
          if (tile && tile.isFlammable() && Math.random() < 0.2) {
            this.startFire(target.x + dx, target.y + dy);
            return;
          }
        }
      }
    }
  }

  // Trigger nuclear meltdown - the dreaded disaster!
  triggerNuclearMeltdown() {
    // Find nuclear power plants
    const nuclearPlants = [];
    for (let y = 0; y < this.city.height; y++) {
      for (let x = 0; x < this.city.width; x++) {
        const tile = this.city.tiles[y][x];
        if (tile.type === TILE_TYPES.NUCLEAR_POWER && tile.isMainTile) {
          nuclearPlants.push({ x, y, building: this.city.buildings.get(tile.buildingId) });
        }
      }
    }

    if (nuclearPlants.length === 0) return;

    // Pick a random nuclear plant
    const plant = nuclearPlants[Math.floor(Math.random() * nuclearPlants.length)];
    const building = plant.building;

    if (!building) return;

    // Convert plant to nuclear waste and rubble
    for (let dy = 0; dy < building.height; dy++) {
      for (let dx = 0; dx < building.width; dx++) {
        const tile = this.city.getTile(plant.x + dx, plant.y + dy);
        if (tile) {
          // Center tiles become nuclear waste, edges become rubble
          if (dx >= 1 && dx < building.width - 1 && dy >= 1 && dy < building.height - 1) {
            tile.type = TILE_TYPES.NUCLEAR_WASTE;
          } else {
            tile.type = TILE_TYPES.RUBBLE;
          }
          tile.buildingId = null;
          tile.isMainTile = false;
        }
      }
    }

    // Remove building from registry
    this.city.buildings.delete(plant.building?.id);

    // Start fires around the meltdown
    for (let dy = -3; dy <= building.height + 2; dy++) {
      for (let dx = -3; dx <= building.width + 2; dx++) {
        const tile = this.city.getTile(plant.x + dx, plant.y + dy);
        if (tile && tile.isFlammable() && Math.random() < 0.4) {
          this.startFire(plant.x + dx, plant.y + dy);
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
