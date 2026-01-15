// AlertSystem.js - Scrolling alert ticker system
// Displays important messages about city conditions

class AlertSystem {
  constructor(game) {
    this.game = game;
    this.tickerElement = document.getElementById('alert-ticker');
    this.tickerText = document.getElementById('alert-ticker-text');

    // Alert queue
    this.alertQueue = [];
    this.currentAlert = null;
    this.scrollPosition = 0;
    this.scrollSpeed = 2; // pixels per frame

    // Alert cooldowns (prevent spam)
    this.alertCooldowns = new Map();
    this.cooldownDuration = 60000; // 1 minute between same alerts

    // Tracking for one-time alerts
    this.hasBuiltFireStation = false;
    this.hasBuiltStadium = false;
    this.announcedTown = false;
    this.announcedCity = false;

    // Debug mode
    this.debugMode = false;

    // Start ticker animation
    this.startTicker();
  }

  // Check all alert conditions (called each simulation tick)
  checkAlerts() {
    if (!this.game.city || !this.game.simulation) return;

    const city = this.game.city;
    const sim = this.game.simulation;
    const budget = this.game.budget;

    // Check zone balance
    this.checkZoneBalance();

    // Check road access
    this.checkRoadAccess();

    // Check transit system
    this.checkTransitSystem();

    // Check power supply
    this.checkPowerSupply();

    // Check citizen demands based on population milestones
    this.checkCitizenDemands();
  }

  // Check for zone imbalance
  checkZoneBalance() {
    const zones = this.game.city.countZones();
    const sim = this.game.simulation;

    // Check demand indicators for imbalance
    if (sim.residentialDemand > 1.5 && zones.residential.total < 3) {
      this.queueAlert('More Residential Zones Needed');
    }
    if (sim.commercialDemand > 1.5 && zones.commercial.total < 2) {
      this.queueAlert('More Commercial Zones Needed');
    }
    if (sim.industrialDemand > 1.5 && zones.industrial.total < 2) {
      this.queueAlert('More Industrial Zones Needed');
    }
  }

  // Check for zones without road access
  checkRoadAccess() {
    const zones = this.game.city.countZones();
    const infra = this.game.city.countInfrastructure();

    // If there are zones but very few roads, alert
    const totalZones = zones.residential.total + zones.commercial.total + zones.industrial.total;
    if (totalZones > 0 && infra.roads < totalZones * 2) {
      this.queueAlert('Build More Roads');
    }
  }

  // Check transit system adequacy
  checkTransitSystem() {
    const sim = this.game.simulation;
    const infra = this.game.city.countInfrastructure();

    // High traffic with few rails indicates inadequate transit
    if (sim.stats.averageTraffic > 150 && infra.rails < 20) {
      this.queueAlert('Inadequate Transit System');
    }
  }

  // Check power supply
  checkPowerSupply() {
    const sim = this.game.simulation;

    // Power consumed exceeds or nearly exceeds production
    if (sim.stats.totalPowerConsumed > 0 &&
        sim.stats.totalPowerConsumed >= sim.stats.totalPowerProduced * 0.95) {
      this.queueAlert('Build a Power Plant');
    }
  }

  // Check citizen demands based on population
  checkCitizenDemands() {
    const sim = this.game.simulation;
    const city = this.game.city;
    const population = sim.population;

    // Check for fire station at Town (2000 pop)
    if (population >= CITY_CLASSES.TOWN.minPop && !this.hasBuiltFireStation) {
      const services = city.getServiceBuildings();
      const hasFireStation = services.some(s => s.type === 'fire');

      if (hasFireStation) {
        this.hasBuiltFireStation = true;
      } else if (!this.announcedTown) {
        this.announcedTown = true;
        this.queueAlert('Citizens Demand a Fire Station', true);
      }
    }

    // Check for stadium at City (10000 pop)
    if (population >= CITY_CLASSES.CITY.minPop && !this.hasBuiltStadium) {
      // Check if stadium exists
      let hasStadium = false;
      for (let y = 0; y < city.height; y++) {
        for (let x = 0; x < city.width; x++) {
          const tile = city.tiles[y][x];
          if (tile.type === TILE_TYPES.STADIUM && tile.isMainTile) {
            hasStadium = true;
            break;
          }
        }
        if (hasStadium) break;
      }

      if (hasStadium) {
        this.hasBuiltStadium = true;
      } else if (!this.announcedCity) {
        this.announcedCity = true;
        this.queueAlert('Citizens Demand a Stadium', true);
      }
    }
  }

  // Queue an alert (with optional priority flag)
  queueAlert(message, priority = false) {
    // Check cooldown (unless priority)
    if (!priority && this.alertCooldowns.has(message)) {
      const lastTime = this.alertCooldowns.get(message);
      if (Date.now() - lastTime < this.cooldownDuration) {
        return; // Still on cooldown
      }
    }

    // Don't add duplicates in queue
    if (this.alertQueue.includes(message)) return;
    if (this.currentAlert === message) return;

    // Add to queue (priority goes to front)
    if (priority) {
      this.alertQueue.unshift(message);
    } else {
      this.alertQueue.push(message);
    }

    // Set cooldown
    this.alertCooldowns.set(message, Date.now());
  }

  // Show immediate alert (bypasses queue)
  showAlert(message) {
    this.currentAlert = message;
    this.scrollPosition = this.tickerElement ? this.tickerElement.offsetWidth : 300;

    if (this.tickerText) {
      this.tickerText.textContent = message;
      this.tickerText.style.transform = `translateX(${this.scrollPosition}px)`;
    }
  }

  // Toggle debug mode
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    if (this.debugMode) {
      this.showAlert('I AM GOD I WISH YOU HAPPY');
    } else {
      this.showAlert('I AM GOD DEBUG OFF');
    }
  }

  // Start ticker animation loop
  startTicker() {
    const animate = () => {
      this.updateTicker();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // Update ticker scroll position
  updateTicker() {
    if (!this.tickerText || !this.tickerElement) return;

    // If no current alert, try to get one from queue
    if (!this.currentAlert && this.alertQueue.length > 0) {
      this.currentAlert = this.alertQueue.shift();
      this.scrollPosition = this.tickerElement.offsetWidth;
      this.tickerText.textContent = this.currentAlert;
    }

    // If we have an alert, scroll it
    if (this.currentAlert) {
      this.scrollPosition -= this.scrollSpeed;
      this.tickerText.style.transform = `translateX(${this.scrollPosition}px)`;

      // Check if scrolled off screen
      const textWidth = this.tickerText.offsetWidth;
      if (this.scrollPosition < -textWidth) {
        this.currentAlert = null;
        this.tickerText.textContent = '';
      }
    }
  }

  // Reset alerts (for new city)
  reset() {
    this.alertQueue = [];
    this.currentAlert = null;
    this.alertCooldowns.clear();
    this.hasBuiltFireStation = false;
    this.hasBuiltStadium = false;
    this.announcedTown = false;
    this.announcedCity = false;

    if (this.tickerText) {
      this.tickerText.textContent = '';
    }
  }

  // Serialize for save
  serialize() {
    return {
      hasBuiltFireStation: this.hasBuiltFireStation,
      hasBuiltStadium: this.hasBuiltStadium,
      announcedTown: this.announcedTown,
      announcedCity: this.announcedCity
    };
  }

  // Deserialize from save
  deserialize(data) {
    if (data) {
      this.hasBuiltFireStation = data.hasBuiltFireStation || false;
      this.hasBuiltStadium = data.hasBuiltStadium || false;
      this.announcedTown = data.announcedTown || false;
      this.announcedCity = data.announcedCity || false;
    }
  }
}
