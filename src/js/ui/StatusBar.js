// StatusBar.js - Bottom status bar

class StatusBar {
  constructor(game) {
    this.game = game;

    this.fundsEl = document.getElementById('status-funds');
    this.dateEl = document.getElementById('status-date');
    this.populationEl = document.getElementById('status-population');
    this.toolEl = document.getElementById('status-tool');

    // Demand bars
    this.demandR = document.getElementById('demand-r');
    this.demandC = document.getElementById('demand-c');
    this.demandI = document.getElementById('demand-i');

    // Scenario elements
    this.scenarioSection = document.getElementById('status-scenario');
    this.scenarioProgress = document.getElementById('scenario-progress');
    this.scenarioTime = document.getElementById('scenario-time');

    // Speed controls
    this.currentSpeed = 'normal';
    this.setupSpeedControls();
  }

  setupSpeedControls() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = btn.dataset.speed;
        this.setSpeed(speed);
      });
    });
  }

  // Update funds display
  updateFunds(amount) {
    this.fundsEl.textContent = '$' + amount.toLocaleString();

    // Color code based on amount
    if (amount < 0) {
      this.fundsEl.style.color = '#FF0000';
    } else if (amount < 1000) {
      this.fundsEl.style.color = '#FF8800';
    } else {
      this.fundsEl.style.color = '';
    }
  }

  // Update date display
  updateDate(dateString) {
    this.dateEl.textContent = dateString;
  }

  // Update population display
  updatePopulation(count) {
    this.populationEl.textContent = count.toLocaleString();
  }

  // Update selected tool display
  setTool(tool) {
    const name = TOOL_NAMES[tool] || tool;
    const cost = TOOL_COSTS[tool] || 0;

    if (cost > 0) {
      this.toolEl.textContent = `${name} ($${cost})`;
    } else {
      this.toolEl.textContent = name;
    }
  }

  // Update demand indicators
  updateDemand(residential, commercial, industrial) {
    // Demand values are 0-100, representing bar height percentage
    if (this.demandR) {
      this.demandR.style.setProperty('--demand-height', `${residential}%`);
      this.demandR.querySelector('::after')?.style.setProperty('height', `${residential}%`);
    }
    if (this.demandC) {
      this.demandC.style.setProperty('--demand-height', `${commercial}%`);
    }
    if (this.demandI) {
      this.demandI.style.setProperty('--demand-height', `${industrial}%`);
    }

    // Update via direct style manipulation since pseudo-elements are tricky
    this.updateDemandBar(this.demandR, residential);
    this.updateDemandBar(this.demandC, commercial);
    this.updateDemandBar(this.demandI, industrial);
  }

  updateDemandBar(el, value) {
    if (!el) return;

    // Clear previous bar
    el.innerHTML = '';

    // Create bar fill
    const fill = document.createElement('div');
    fill.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${value}%;
      background: inherit;
      transition: height 0.3s;
    `;

    // Set color based on parent class
    if (el.classList.contains('demand-r')) {
      fill.style.background = '#00AA00';
    } else if (el.classList.contains('demand-c')) {
      fill.style.background = '#0000AA';
    } else if (el.classList.contains('demand-i')) {
      fill.style.background = '#AAAA00';
    }

    el.appendChild(fill);
  }

  // Set simulation speed
  setSpeed(speed) {
    this.currentSpeed = speed;

    // Update button states
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.speed === speed);
    });

    // Notify game
    if (this.game.setSpeed) {
      this.game.setSpeed(speed);
    }
  }

  // Get current speed
  getSpeed() {
    return this.currentSpeed;
  }

  // Update scenario progress display
  updateScenarioProgress(scenarioData) {
    if (!scenarioData) {
      // No scenario - hide the section
      if (this.scenarioSection) {
        this.scenarioSection.style.display = 'none';
      }
      return;
    }

    // Show scenario section
    if (this.scenarioSection) {
      this.scenarioSection.style.display = '';
    }

    // Update progress
    if (this.scenarioProgress) {
      this.scenarioProgress.textContent = `${scenarioData.percentage}%`;
      // Color based on progress
      if (scenarioData.percentage >= 100) {
        this.scenarioProgress.style.color = '#00AA00';
      } else if (scenarioData.percentage >= 50) {
        this.scenarioProgress.style.color = '#AAAA00';
      } else {
        this.scenarioProgress.style.color = '#AA0000';
      }
    }

    // Update time remaining
    if (this.scenarioTime) {
      if (scenarioData.yearsRemaining < 0) {
        this.scenarioTime.textContent = 'Unlimited';
        this.scenarioTime.style.color = '';
      } else if (scenarioData.yearsRemaining <= 1) {
        const monthsLeft = scenarioData.monthsRemaining;
        this.scenarioTime.textContent = `${monthsLeft} mo`;
        this.scenarioTime.style.color = '#AA0000';
      } else {
        this.scenarioTime.textContent = `${scenarioData.yearsRemaining} yrs`;
        this.scenarioTime.style.color = scenarioData.yearsRemaining <= 2 ? '#AAAA00' : '';
      }
    }
  }

  // Update all status at once
  update(data) {
    if (data.funds !== undefined) this.updateFunds(data.funds);
    if (data.date !== undefined) this.updateDate(data.date);
    if (data.population !== undefined) this.updatePopulation(data.population);
    if (data.demand) {
      this.updateDemand(
        data.demand.residential,
        data.demand.commercial,
        data.demand.industrial
      );
    }
    if (data.scenario !== undefined) {
      this.updateScenarioProgress(data.scenario);
    }
  }
}
