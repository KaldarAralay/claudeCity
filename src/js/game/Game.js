// Game.js - Main game controller

class Game {
  constructor() {
    // Core game objects
    this.city = null;
    this.budget = null;
    this.simulation = null;
    this.renderer = null;
    this.minimap = null;

    // UI components
    this.toolbar = null;
    this.menuBar = null;
    this.statusBar = null;

    // Game state
    this.currentTool = 'pointer';
    this.autoBulldoze = false;
    this.autoBudget = true;
    this.disastersDisabled = false;

    // Input state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastPlacedX = -1;
    this.lastPlacedY = -1;

    // Canvas reference
    this.canvas = document.getElementById('game-canvas');
  }

  // Initialize the game
  init() {
    // Create city
    this.city = new City();
    this.city.generateTerrain();

    // Create budget
    this.budget = new Budget();

    // Create simulation
    this.simulation = new Simulation(this.city, this.budget);
    this.simulation.onTick = (data) => this.onSimulationTick(data);

    // Create renderer
    this.renderer = new Renderer(this.canvas, this.city);
    this.renderer.simulation = this.simulation;

    // Create minimap
    const minimapCanvas = document.getElementById('minimap-canvas');
    this.minimap = new Minimap(minimapCanvas, this.city, this.renderer.camera);

    // Create UI components
    this.toolbar = new Toolbar(this);
    this.menuBar = new MenuBar(this);
    this.statusBar = new StatusBar(this);

    // Setup input handling
    this.setupInputHandlers();

    // Setup window controls
    this.setupWindowControls();

    // Start rendering
    this.renderer.start();
    this.minimap.start();

    // Start simulation
    this.simulation.start();

    // Initial UI update
    this.updateUI();

    // Center camera on map
    this.renderer.centerOn(
      Math.floor(this.city.width / 2),
      Math.floor(this.city.height / 2)
    );
  }

  // Setup input event handlers
  setupInputHandlers() {
    // Mouse events on canvas
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
  }

  // Setup window control buttons
  setupWindowControls() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => {
      window.electronAPI?.minimizeWindow();
    });

    document.getElementById('btn-maximize')?.addEventListener('click', () => {
      window.electronAPI?.maximizeWindow();
    });

    document.getElementById('btn-close')?.addEventListener('click', () => {
      window.electronAPI?.closeWindow();
    });

    // Minimap close button
    document.getElementById('minimap-close')?.addEventListener('click', () => {
      this.toggleMinimap();
    });
  }

  // Handle mouse down
  onMouseDown(e) {
    if (e.button !== 0) return; // Left click only

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tile = this.renderer.getTileAt(x, y);

    this.isDragging = true;
    this.dragStartX = tile.x;
    this.dragStartY = tile.y;
    this.lastPlacedX = -1;
    this.lastPlacedY = -1;

    // Perform tool action
    this.useTool(tile.x, tile.y);
  }

  // Handle mouse move
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tile = this.renderer.getTileAt(x, y);

    // Update preview
    this.updatePreview(tile.x, tile.y);

    // If dragging, continue placing (for roads, power lines, etc.)
    if (this.isDragging && this.toolbar.isInfraTool()) {
      if (tile.x !== this.lastPlacedX || tile.y !== this.lastPlacedY) {
        this.useTool(tile.x, tile.y);
      }
    }
  }

  // Handle mouse up
  onMouseUp(e) {
    this.isDragging = false;
  }

  // Handle mouse leave
  onMouseLeave(e) {
    this.isDragging = false;
    this.renderer.clearPreview();
  }

  // Update tool preview
  updatePreview(x, y) {
    const tool = this.toolbar.getCurrentTool();

    if (tool === 'pointer') {
      this.renderer.clearPreview();
      return;
    }

    const valid = this.canPlaceTool(tool, x, y);
    this.renderer.setPreview(tool, x, y, valid);
  }

  // Check if tool can be placed at location
  canPlaceTool(tool, x, y) {
    const cost = TOOL_COSTS[tool] || 0;
    if (!this.budget.canAfford(cost)) return false;

    const tile = this.city.getTile(x, y);
    if (!tile) return false;

    switch (tool) {
      case 'bulldozer':
        return tile.canBulldoze();

      case 'road':
        return tile.canBuildOn() || tile.isPowerLine();

      case 'power-line':
        return tile.canBuildOn() || tile.isRoad();

      case 'rail':
      case 'park':
        return tile.canBuildOn();

      case 'residential':
      case 'commercial':
      case 'industrial':
        return this.canPlaceZone(x, y);

      case 'coal-power':
      case 'nuclear-power':
      case 'police':
      case 'fire':
      case 'stadium':
      case 'seaport':
      case 'airport':
        return this.canPlaceBuilding(x, y, tool);

      default:
        return false;
    }
  }

  // Check if zone can be placed
  canPlaceZone(x, y) {
    const size = GAME_CONSTANTS.ZONE_SIZE;
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const tile = this.city.getTile(x + dx, y + dy);
        if (!tile || !tile.canBuildOn()) return false;
      }
    }
    return true;
  }

  // Check if building can be placed
  canPlaceBuilding(x, y, buildingType) {
    const sizeInfo = GAME_CONSTANTS.BUILDING_SIZES[buildingType];
    if (!sizeInfo) return false;

    for (let dy = 0; dy < sizeInfo.height; dy++) {
      for (let dx = 0; dx < sizeInfo.width; dx++) {
        const tile = this.city.getTile(x + dx, y + dy);
        if (!tile || !tile.canBuildOn()) return false;
      }
    }
    return true;
  }

  // Use current tool at location
  useTool(x, y) {
    const tool = this.toolbar.getCurrentTool();
    if (tool === 'pointer') return;

    const cost = TOOL_COSTS[tool] || 0;

    if (!this.canPlaceTool(tool, x, y)) return;

    let success = false;

    switch (tool) {
      case 'bulldozer':
        success = this.city.bulldoze(x, y);
        break;

      case 'road':
        success = this.city.placeRoad(x, y);
        break;

      case 'power-line':
        success = this.city.placePowerLine(x, y);
        break;

      case 'rail':
        success = this.city.placeRail(x, y);
        break;

      case 'park':
        success = this.city.placePark(x, y);
        break;

      case 'residential':
        success = this.city.placeZone(x, y, 'residential');
        break;

      case 'commercial':
        success = this.city.placeZone(x, y, 'commercial');
        break;

      case 'industrial':
        success = this.city.placeZone(x, y, 'industrial');
        break;

      case 'coal-power':
      case 'nuclear-power':
      case 'police':
      case 'fire':
      case 'stadium':
      case 'seaport':
      case 'airport':
        success = this.city.placeBuilding(x, y, tool);
        break;
    }

    if (success) {
      this.budget.spend(cost);
      this.lastPlacedX = x;
      this.lastPlacedY = y;
      this.updateUI();
    }
  }

  // Called when simulation ticks
  onSimulationTick(data) {
    this.updateUI();
  }

  // Update all UI elements
  updateUI() {
    this.statusBar.update({
      funds: this.budget.funds,
      date: this.simulation.getDateString(),
      population: this.simulation.population,
      demand: this.simulation.getDemandIndicators(),
      scenario: this.simulation.getScenarioProgress()
    });
  }

  // Tool change callback
  onToolChange(tool) {
    this.currentTool = tool;
  }

  // Set simulation speed
  setSpeed(speed) {
    switch (speed) {
      case 'pause':
        this.simulation.pause();
        break;
      case 'normal':
        this.simulation.setSpeed(GAME_CONSTANTS.SPEED_NORMAL);
        this.simulation.start();
        break;
      case 'fast':
        this.simulation.setSpeed(GAME_CONSTANTS.SPEED_FAST);
        this.simulation.start();
        break;
      case 'ultra':
        this.simulation.setSpeed(GAME_CONSTANTS.SPEED_ULTRA);
        this.simulation.start();
        break;
    }
  }

  // Set map overlay
  setOverlay(overlay) {
    // Toggle if same overlay
    if (this.renderer.overlay === overlay) {
      this.renderer.setOverlay(null);
    } else {
      this.renderer.setOverlay(overlay);
    }
  }

  // Toggle minimap visibility
  toggleMinimap() {
    const minimapWindow = document.getElementById('minimap-window');
    if (minimapWindow) {
      minimapWindow.style.display =
        minimapWindow.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Create new city - shows difficulty selection dialog
  newCity() {
    this.showDifficultyDialog();
  }

  // Start a new city with the selected difficulty
  startNewCity(difficulty) {
    this.simulation.pause();
    this.city = new City();
    this.city.generateTerrain();
    this.budget = new Budget(difficulty);
    this.simulation = new Simulation(this.city, this.budget);
    this.simulation.onTick = (data) => this.onSimulationTick(data);
    this.renderer.city = this.city;
    this.renderer.simulation = this.simulation;
    this.minimap.city = this.city;
    this.simulation.start();
    this.updateUI();
    this.updateWindowTitle(null); // Reset title
    this.renderer.centerOn(
      Math.floor(this.city.width / 2),
      Math.floor(this.city.height / 2)
    );
  }

  // Show difficulty selection dialog
  showDifficultyDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('difficulty-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'difficulty-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag;">
        <div class="win95-title-bar-text">Select Difficulty</div>
        <div class="win95-title-bar-controls">
          <button class="win95-title-btn win95-title-btn-close" id="difficulty-close-btn">X</button>
        </div>
      </div>
      <div class="win95-dialog-content" style="padding: 20px; min-width: 300px;">
        <div style="text-align: center; margin-bottom: 15px; font-weight: bold;">
          Choose your difficulty level:
        </div>

        <div class="difficulty-option" data-difficulty="easy" style="
          padding: 12px;
          margin: 8px 0;
          background: #C0C0C0;
          border: 2px solid;
          border-color: #FFFFFF #808080 #808080 #FFFFFF;
          cursor: pointer;
        ">
          <div style="font-weight: bold; color: #008000;">Easy</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Starting Funds: $20,000<br>
            Full tax income, boosted industry<br>
            Rare disasters (planes/ships only)
          </div>
        </div>

        <div class="difficulty-option" data-difficulty="normal" style="
          padding: 12px;
          margin: 8px 0;
          background: #C0C0C0;
          border: 2px solid;
          border-color: #FFFFFF #808080 #808080 #FFFFFF;
          cursor: pointer;
        ">
          <div style="font-weight: bold; color: #000080;">Normal</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Starting Funds: $10,000<br>
            85.7% tax income, slight industry boost<br>
            Occasional disasters (all types)
          </div>
        </div>

        <div class="difficulty-option" data-difficulty="hard" style="
          padding: 12px;
          margin: 8px 0;
          background: #C0C0C0;
          border: 2px solid;
          border-color: #FFFFFF #808080 #808080 #FFFFFF;
          cursor: pointer;
        ">
          <div style="font-weight: bold; color: #800000;">Hard</div>
          <div style="font-size: 11px; margin-top: 4px;">
            Starting Funds: $5,000<br>
            57.1% tax income, reduced industry<br>
            Frequent disasters (including meltdowns!)
          </div>
        </div>

        <div style="margin-top: 15px; text-align: center;">
          <button class="win95-button" id="difficulty-cancel-btn" style="padding: 4px 20px;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Add hover effects
    dialog.querySelectorAll('.difficulty-option').forEach(option => {
      option.addEventListener('mouseenter', () => {
        option.style.borderColor = '#808080 #FFFFFF #FFFFFF #808080';
        option.style.background = '#D0D0D0';
      });
      option.addEventListener('mouseleave', () => {
        option.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF';
        option.style.background = '#C0C0C0';
      });
      option.addEventListener('click', () => {
        const difficulty = option.dataset.difficulty;
        dialog.remove();
        this.startNewCity(difficulty);
      });
    });

    // Close button
    dialog.querySelector('#difficulty-close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    // Cancel button
    dialog.querySelector('#difficulty-cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  // Show scenario selection dialog
  showScenarioDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('scenario-dialog');
    if (existing) existing.remove();

    const scenarios = SCENARIOS;
    const scenarioList = Object.values(scenarios);

    // Separate main scenarios from bonus
    const mainScenarios = scenarioList.filter(s => !s.isBonus);
    const bonusScenarios = scenarioList.filter(s => s.isBonus);

    const dialog = document.createElement('div');
    dialog.id = 'scenario-dialog';
    dialog.className = 'win95-dialog';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflow = 'hidden';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag;">
        <div class="win95-title-bar-text">Select Scenario</div>
        <div class="win95-title-bar-controls">
          <button class="win95-title-btn win95-title-btn-close" id="scenario-close-btn">X</button>
        </div>
      </div>
      <div class="win95-dialog-content" style="padding: 15px; min-width: 450px; max-height: 60vh; overflow-y: auto;">
        <div style="text-align: center; margin-bottom: 15px; font-weight: bold;">
          Choose a Scenario Challenge:
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; color: #000080;">Main Scenarios</div>
        <div id="main-scenarios"></div>

        <div style="font-weight: bold; margin: 15px 0 8px 0; color: #800080;">Bonus Scenarios</div>
        <div id="bonus-scenarios"></div>

        <div style="margin-top: 15px; text-align: center;">
          <button class="win95-button" id="scenario-cancel-btn" style="padding: 4px 20px;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Helper to create scenario option HTML
    const createScenarioOption = (scenario) => {
      const durationText = scenario.duration === -1 ? 'Unlimited' : `${scenario.duration} years`;
      let goalText = '';
      switch (scenario.goalType) {
        case 'population':
          goalText = `Population: ${scenario.goalValue.toLocaleString()}`;
          break;
        case 'crime':
          goalText = `Crime below ${scenario.goalValue}%`;
          break;
        case 'metropolis':
          goalText = 'Reach Metropolis status';
          break;
        case 'megalopolis':
          goalText = 'Reach Megalopolis status';
          break;
      }

      const option = document.createElement('div');
      option.className = 'scenario-option';
      option.dataset.scenario = scenario.id;
      option.style.cssText = `
        padding: 10px;
        margin: 6px 0;
        background: #C0C0C0;
        border: 2px solid;
        border-color: #FFFFFF #808080 #808080 #FFFFFF;
        cursor: pointer;
      `;
      option.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: bold;">${scenario.name}</div>
          <div style="font-size: 10px; color: #666;">${scenario.year}</div>
        </div>
        <div style="font-size: 11px; margin-top: 4px; color: #333;">
          ${scenario.description}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: #444;">
          <span>Duration: ${durationText}</span>
          <span>Goal: ${goalText}</span>
        </div>
      `;
      return option;
    };

    // Add main scenarios
    const mainContainer = dialog.querySelector('#main-scenarios');
    mainScenarios.forEach(scenario => {
      const option = createScenarioOption(scenario);
      mainContainer.appendChild(option);
    });

    // Add bonus scenarios
    const bonusContainer = dialog.querySelector('#bonus-scenarios');
    bonusScenarios.forEach(scenario => {
      const option = createScenarioOption(scenario);
      bonusContainer.appendChild(option);
    });

    // Add hover and click events
    dialog.querySelectorAll('.scenario-option').forEach(option => {
      option.addEventListener('mouseenter', () => {
        option.style.borderColor = '#808080 #FFFFFF #FFFFFF #808080';
        option.style.background = '#D0D0D0';
      });
      option.addEventListener('mouseleave', () => {
        option.style.borderColor = '#FFFFFF #808080 #808080 #FFFFFF';
        option.style.background = '#C0C0C0';
      });
      option.addEventListener('click', () => {
        const scenarioId = option.dataset.scenario;
        dialog.remove();
        this.startScenario(scenarioId);
      });
    });

    // Close button
    dialog.querySelector('#scenario-close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    // Cancel button
    dialog.querySelector('#scenario-cancel-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  // Start a scenario
  startScenario(scenarioId) {
    const scenario = SCENARIOS[scenarioId];
    if (!scenario) {
      alert('Unknown scenario: ' + scenarioId);
      return;
    }

    this.simulation.pause();

    // Create new city with scenario map
    this.city = new City();
    this.city.generateScenarioMap(scenario.mapType);

    // Create budget with scenario settings
    this.budget = new Budget(scenario.difficulty);
    this.budget.funds = scenario.startingFunds;

    // Create simulation with scenario
    this.simulation = new Simulation(this.city, this.budget);
    this.simulation.setScenario(scenario);
    this.simulation.onTick = (data) => this.onSimulationTick(data);
    this.simulation.onScenarioWin = () => this.onScenarioWin();
    this.simulation.onScenarioLose = () => this.onScenarioLose();

    // Update references
    this.renderer.city = this.city;
    this.renderer.simulation = this.simulation;
    this.minimap.city = this.city;

    // Start simulation
    this.simulation.start();
    this.updateUI();
    this.updateWindowTitle(null);

    // Center camera
    this.renderer.centerOn(
      Math.floor(this.city.width / 2),
      Math.floor(this.city.height / 2)
    );

    // Show scenario start notification
    this.showScenarioStartDialog(scenario);
  }

  // Show scenario start dialog
  showScenarioStartDialog(scenario) {
    const existing = document.getElementById('scenario-start-dialog');
    if (existing) existing.remove();

    const durationText = scenario.duration === -1 ? 'Unlimited time' : `${scenario.duration} years`;
    let goalText = '';
    switch (scenario.goalType) {
      case 'population':
        goalText = `Reach a population of ${scenario.goalValue.toLocaleString()}`;
        break;
      case 'crime':
        goalText = `Lower crime rate below ${scenario.goalValue}%`;
        break;
      case 'metropolis':
        goalText = 'Grow your city to Metropolis status';
        break;
      case 'megalopolis':
        goalText = 'Build a Megalopolis with 500,000+ population';
        break;
    }

    const dialog = document.createElement('div');
    dialog.id = 'scenario-start-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag;">
        <div class="win95-title-bar-text">${scenario.name}</div>
        <div class="win95-title-bar-controls">
          <button class="win95-title-btn win95-title-btn-close" id="scenario-start-close">X</button>
        </div>
      </div>
      <div class="win95-dialog-content" style="padding: 20px; min-width: 350px; text-align: center;">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">
          ${scenario.name}
        </div>
        <div style="font-size: 12px; margin-bottom: 10px; color: #333;">
          ${scenario.description}
        </div>
        <div style="background: #FFF; border: 2px inset #808080; padding: 10px; margin: 15px 0;">
          <div style="font-weight: bold; margin-bottom: 5px;">Objective</div>
          <div style="font-size: 12px;">${goalText}</div>
          <div style="font-size: 11px; color: #666; margin-top: 5px;">Time Limit: ${durationText}</div>
        </div>
        <div style="margin-top: 15px;">
          <button class="win95-button" id="scenario-start-btn" style="padding: 6px 30px;">
            Start Scenario
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Pause the simulation until user starts
    this.simulation.pause();

    dialog.querySelector('#scenario-start-close').addEventListener('click', () => {
      dialog.remove();
      this.simulation.start();
    });

    dialog.querySelector('#scenario-start-btn').addEventListener('click', () => {
      dialog.remove();
      this.simulation.start();
    });
  }

  // Called when scenario is won
  onScenarioWin() {
    this.simulation.pause();
    const scenario = this.simulation.scenario;

    const dialog = document.createElement('div');
    dialog.id = 'scenario-win-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag; background: linear-gradient(90deg, #008000, #00AA00);">
        <div class="win95-title-bar-text" style="color: white;">Victory!</div>
      </div>
      <div class="win95-dialog-content" style="padding: 25px; min-width: 350px; text-align: center;">
        <div style="font-size: 24px; color: #008000; margin-bottom: 15px;">
          Congratulations!
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;">
          You have completed the <strong>${scenario.name}</strong> scenario!
        </div>
        <div style="background: #C0FFC0; border: 2px inset #808080; padding: 15px; margin: 15px 0;">
          <div>Final Population: ${this.simulation.population.toLocaleString()}</div>
          <div>Time: ${this.simulation.year} (${this.simulation.getDateString()})</div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="win95-button" id="win-continue-btn" style="padding: 6px 20px;">Continue Playing</button>
          <button class="win95-button" id="win-newgame-btn" style="padding: 6px 20px;">New Game</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#win-continue-btn').addEventListener('click', () => {
      dialog.remove();
      this.simulation.scenario = null; // Clear scenario to continue in sandbox mode
      this.simulation.start();
    });

    dialog.querySelector('#win-newgame-btn').addEventListener('click', () => {
      dialog.remove();
      this.newCity();
    });
  }

  // Called when scenario is lost (time ran out)
  onScenarioLose() {
    this.simulation.pause();
    const scenario = this.simulation.scenario;
    const progress = this.simulation.getScenarioProgress();

    const dialog = document.createElement('div');
    dialog.id = 'scenario-lose-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag; background: linear-gradient(90deg, #800000, #AA0000);">
        <div class="win95-title-bar-text" style="color: white;">Time's Up!</div>
      </div>
      <div class="win95-dialog-content" style="padding: 25px; min-width: 350px; text-align: center;">
        <div style="font-size: 24px; color: #800000; margin-bottom: 15px;">
          Scenario Failed
        </div>
        <div style="font-size: 14px; margin-bottom: 10px;">
          Time has run out for the <strong>${scenario.name}</strong> scenario.
        </div>
        <div style="background: #FFC0C0; border: 2px inset #808080; padding: 15px; margin: 15px 0;">
          <div>Your Progress: ${progress.currentValue.toLocaleString()} / ${progress.targetValue.toLocaleString()}</div>
          <div style="margin-top: 5px;">
            <div style="background: #800000; height: 20px; position: relative;">
              <div style="background: #00AA00; height: 100%; width: ${Math.min(100, progress.percentage)}%;"></div>
              <div style="position: absolute; top: 2px; left: 50%; transform: translateX(-50%); color: white; font-size: 11px;">
                ${progress.percentage}%
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="win95-button" id="lose-retry-btn" style="padding: 6px 20px;">Retry Scenario</button>
          <button class="win95-button" id="lose-newgame-btn" style="padding: 6px 20px;">New Game</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#lose-retry-btn').addEventListener('click', () => {
      dialog.remove();
      this.startScenario(scenario.id);
    });

    dialog.querySelector('#lose-newgame-btn').addEventListener('click', () => {
      dialog.remove();
      this.newCity();
    });
  }

  // Save city (quick save to current file, or Save As if no file)
  async saveCity() {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      city: this.city.serialize(),
      budget: this.budget.serialize(),
      simulation: this.simulation.serialize()
    };

    const jsonData = JSON.stringify(saveData, null, 2);

    // Try quick save first
    const result = await window.electronAPI?.quickSave(jsonData);

    if (result?.success) {
      this.showSaveNotification('City saved!');
      this.updateWindowTitle(result.filePath);
    } else if (result?.needsDialog) {
      // No current save path, show Save As dialog
      await this.saveCityAs();
    } else if (result?.error) {
      alert('Failed to save: ' + result.error);
    } else {
      // Fallback to localStorage if electronAPI not available
      localStorage.setItem('claudeCity_save', jsonData);
      this.showSaveNotification('City saved to local storage!');
    }
  }

  // Load city from file
  async loadCity() {
    const filePath = await window.electronAPI?.showOpenDialog();

    if (!filePath) {
      return; // User cancelled
    }

    const result = await window.electronAPI?.loadFile(filePath);

    if (!result?.success) {
      alert('Failed to load city: ' + (result?.error || 'Unknown error'));
      return;
    }

    try {
      const saveData = JSON.parse(result.data);

      this.simulation.pause();
      this.city = City.deserialize(saveData.city);
      this.budget = Budget.deserialize(saveData.budget);
      this.simulation = Simulation.deserialize(saveData.simulation, this.city, this.budget);
      this.simulation.onTick = (data) => this.onSimulationTick(data);
      this.renderer.city = this.city;
      this.renderer.simulation = this.simulation;
      this.minimap.city = this.city;
      this.simulation.start();
      this.updateUI();
      this.updateWindowTitle(filePath);
      this.showSaveNotification('City loaded!');
    } catch (e) {
      alert('Failed to load city: ' + e.message);
    }
  }

  // Save city as (always shows dialog)
  async saveCityAs() {
    const filePath = await window.electronAPI?.showSaveDialog();

    if (!filePath) {
      return; // User cancelled
    }

    const saveData = {
      version: 1,
      timestamp: Date.now(),
      city: this.city.serialize(),
      budget: this.budget.serialize(),
      simulation: this.simulation.serialize()
    };

    const jsonData = JSON.stringify(saveData, null, 2);
    const result = await window.electronAPI?.saveFile(filePath, jsonData);

    if (result?.success) {
      this.showSaveNotification('City saved!');
      this.updateWindowTitle(filePath);
    } else {
      alert('Failed to save: ' + (result?.error || 'Unknown error'));
    }
  }

  // Update window title with current file name
  updateWindowTitle(filePath) {
    if (filePath) {
      const fileName = filePath.split(/[\\/]/).pop(); // Get filename from path
      document.querySelector('.win95-title-bar-text').textContent = `ClaudeCity - ${fileName}`;
    } else {
      document.querySelector('.win95-title-bar-text').textContent = 'ClaudeCity';
    }
  }

  // Show a brief save notification
  showSaveNotification(message) {
    // Remove existing notification
    const existing = document.getElementById('save-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'save-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #C0C0C0;
      border: 2px solid;
      border-color: #FFFFFF #808080 #808080 #FFFFFF;
      padding: 15px 30px;
      font-family: 'MS Sans Serif', Arial, sans-serif;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 2px 2px 0 #000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after 1.5 seconds
    setTimeout(() => notification.remove(), 1500);
  }

  // Toggle auto bulldoze
  toggleAutoBulldoze() {
    this.autoBulldoze = !this.autoBulldoze;
  }

  // Toggle auto budget
  toggleAutoBudget() {
    this.autoBudget = !this.autoBudget;
  }

  // Toggle disasters
  toggleDisasters() {
    this.disastersDisabled = !this.disastersDisabled;
  }

  // Show budget dialog (simplified)
  showBudgetDialog() {
    const summary = this.budget.getSummary();
    alert(`Budget Summary:
Funds: $${summary.funds.toLocaleString()}
Tax Rate: ${summary.taxRate}%
Projected Annual Income: $${summary.taxIncome.toLocaleString()}
Annual Expenses: $${summary.totalExpenses.toLocaleString()}
Projected Cash Flow: $${summary.projectedCashFlow.toLocaleString()}`);
  }

  // Show tax dialog (simplified)
  showTaxDialog() {
    const newRate = prompt(`Enter tax rate (0-20%):`, this.budget.taxRate);
    if (newRate !== null) {
      const rate = parseInt(newRate);
      if (!isNaN(rate) && rate >= 0 && rate <= 20) {
        this.budget.setTaxRate(rate);
      }
    }
  }

  // Trigger disaster
  triggerDisaster(type) {
    if (this.disastersDisabled) {
      alert('Disasters are disabled.');
      return;
    }

    switch (type) {
      case 'fire':
        this.simulation.triggerFireDisaster();
        break;
      case 'flood':
        this.simulation.triggerFloodDisaster();
        break;
      case 'tornado':
        this.simulation.triggerTornadoDisaster();
        break;
      case 'earthquake':
        this.simulation.triggerEarthquakeDisaster();
        break;
      case 'monster':
        this.simulation.triggerMonsterDisaster();
        break;
    }
  }

  // Show graphs window
  showGraphs() {
    this.showGraphsDialog();
  }

  // Show voter opinion window
  showVoterOpinion() {
    this.showVoterOpinionDialog();
  }

  // Create and show voter opinion dialog
  showVoterOpinionDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('voter-dialog');
    if (existing) existing.remove();

    const complaints = this.simulation.getVoterComplaints();

    // Helper function to get complaint bar color
    const getBarColor = (value) => {
      if (value < 20) return '#00AA00'; // Green - Good
      if (value < 40) return '#AAAA00'; // Yellow - Warning
      if (value < 60) return '#FF8800'; // Orange - Concern
      return '#AA0000'; // Red - Bad
    };

    // Helper function to get status text
    const getStatus = (value) => {
      if (value < 20) return 'Good';
      if (value < 40) return 'Fair';
      if (value < 60) return 'Poor';
      return 'Critical';
    };

    const dialog = document.createElement('div');
    dialog.id = 'voter-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag;">
        <div class="win95-title-bar-text">Voter Opinion</div>
        <div class="win95-title-bar-controls">
          <button class="win95-title-btn win95-title-btn-close" id="voter-close-btn">X</button>
        </div>
      </div>
      <div class="win95-dialog-content" style="padding: 15px; min-width: 350px;">
        <div style="text-align: center; margin-bottom: 15px; padding: 10px; background: ${complaints.satisfied ? '#C0FFC0' : '#FFC0C0'}; border: 2px inset #808080;">
          <div style="font-size: 14px; font-weight: bold;">Approval Rating</div>
          <div style="font-size: 24px; font-weight: bold; color: ${complaints.approvalRating >= 50 ? '#006600' : '#660000'};">
            ${complaints.approvalRating}%
          </div>
          <div style="font-size: 11px; color: #666;">
            ${complaints.satisfied ? 'Voters are satisfied!' : 'Voters have concerns'}
          </div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #808080; padding-bottom: 4px;">
          Voter Complaints
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Crime:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.crime}%; background: ${getBarColor(complaints.crime)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.crime}% ${getStatus(complaints.crime)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Fire:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.fire}%; background: ${getBarColor(complaints.fire)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.fire}% ${getStatus(complaints.fire)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Housing:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.housingCosts}%; background: ${getBarColor(complaints.housingCosts)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.housingCosts}% ${getStatus(complaints.housingCosts)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Pollution:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.pollution}%; background: ${getBarColor(complaints.pollution)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.pollution}% ${getStatus(complaints.pollution)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Taxes:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.taxes}%; background: ${getBarColor(complaints.taxes)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.taxes}% ${getStatus(complaints.taxes)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Traffic:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.traffic}%; background: ${getBarColor(complaints.traffic)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.traffic}% ${getStatus(complaints.traffic)}</div>
        </div>

        <div class="complaint-row" style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 100px;">Unemployment:</div>
          <div style="flex: 1; height: 16px; background: #333; border: 1px inset #808080; position: relative;">
            <div style="height: 100%; width: ${complaints.unemployment}%; background: ${getBarColor(complaints.unemployment)};"></div>
          </div>
          <div style="width: 60px; text-align: right; font-size: 11px;">${complaints.unemployment}% ${getStatus(complaints.unemployment)}</div>
        </div>

        <div style="margin-top: 15px; font-size: 10px; color: #666; border-top: 1px solid #808080; padding-top: 8px;">
          Keep all complaints below 20% to satisfy voters.
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Add event listener for close button
    dialog.querySelector('#voter-close-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  // Create and show graphs dialog
  showGraphsDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('graphs-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'graphs-dialog';
    dialog.className = 'win95-dialog';
    dialog.innerHTML = `
      <div class="win95-title-bar" style="-webkit-app-region: no-drag;">
        <div class="win95-title-bar-text">City Graphs</div>
        <div class="win95-title-bar-controls">
          <button class="win95-title-btn win95-title-btn-close" id="graphs-close-btn">X</button>
        </div>
      </div>
      <div class="win95-dialog-content" style="padding: 10px; min-width: 400px;">
        <canvas id="graph-canvas" width="380" height="200" style="border: 1px inset #808080; background: #FFF;"></canvas>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
          <button class="win95-button" data-graph="population">Population</button>
          <button class="win95-button" data-graph="funds">Funds</button>
          <button class="win95-button" data-graph="cashflow">Cash Flow</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Add event listeners (CSP blocks inline onclick)
    dialog.querySelector('#graphs-close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelectorAll('[data-graph]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.drawGraph(btn.dataset.graph);
      });
    });

    // Draw initial population graph
    this.drawGraph('population');
  }

  // Draw graph on canvas
  drawGraph(type) {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const history = this.budget.history;
    if (history.length < 2) {
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.fillText('Not enough data yet. Play for a few years.', 20, 100);
      return;
    }

    // Get data based on type
    let data, color, label;
    switch (type) {
      case 'population':
        // We don't track population history in budget, use funds as proxy
        data = history.map((h, i) => ({ x: i, y: h.funds / 100 }));
        color = '#228B22';
        label = 'City Growth (Funds/100)';
        break;
      case 'funds':
        data = history.map((h, i) => ({ x: i, y: h.funds }));
        color = '#4169E1';
        label = 'City Funds';
        break;
      case 'cashflow':
        data = history.map((h, i) => ({ x: i, y: h.cashFlow }));
        color = '#B8860B';
        label = 'Annual Cash Flow';
        break;
    }

    // Find min/max
    const values = data.map(d => d.y);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, 170);
    ctx.lineTo(370, 170);
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#000';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, 150, 190);

    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = 40 + (i / (data.length - 1)) * 320;
      const y = 170 - ((point.y - minVal) / range) * 150;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw min/max labels
    ctx.fillStyle = '#666';
    ctx.font = '9px sans-serif';
    ctx.fillText(Math.round(maxVal).toLocaleString(), 2, 15);
    ctx.fillText(Math.round(minVal).toLocaleString(), 2, 170);
  }

  // Show population (placeholder)
  showPopulation() {
    alert(`Total Population: ${this.simulation.population.toLocaleString()}`);
  }

  // Undo (placeholder)
  undo() {
    alert('Undo - Coming soon!');
  }
}
