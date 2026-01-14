// Toolbar.js - Left toolbar with tools

class Toolbar {
  constructor(game) {
    this.game = game;
    this.currentTool = 'pointer';
    this.toolbar = document.getElementById('toolbar');

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Prevent scroll wheel from affecting toolbar
    this.toolbar.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });

    // Tool button clicks
    this.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool) {
          this.selectTool(tool);
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'q': this.selectTool('pointer'); break;
        case 'b': this.selectTool('bulldozer'); break;
        case 'r': this.selectTool('road'); break;
        case 'p': this.selectTool('power-line'); break;
        case 't': this.selectTool('rail'); break;
        case '1': this.selectTool('residential'); break;
        case '2': this.selectTool('commercial'); break;
        case '3': this.selectTool('industrial'); break;
        case 'escape': this.selectTool('pointer'); break;
      }
    });
  }

  // Select a tool
  selectTool(tool) {
    this.currentTool = tool;

    // Update button states
    this.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.tool === tool);
    });

    // Update status bar
    if (this.game.statusBar) {
      this.game.statusBar.setTool(tool);
    }

    // Update cursor
    this.updateCursor(tool);

    // Notify game
    if (this.game.onToolChange) {
      this.game.onToolChange(tool);
    }
  }

  // Update cursor based on tool
  updateCursor(tool) {
    const canvas = document.getElementById('game-canvas');

    // Remove all cursor classes
    canvas.classList.remove('cursor-bulldozer', 'cursor-zone', 'cursor-road', 'cursor-power');

    // Add appropriate cursor
    switch (tool) {
      case 'bulldozer':
        canvas.classList.add('cursor-bulldozer');
        break;
      case 'residential':
      case 'commercial':
      case 'industrial':
        canvas.classList.add('cursor-zone');
        break;
      case 'road':
      case 'rail':
        canvas.classList.add('cursor-road');
        break;
      case 'power-line':
        canvas.classList.add('cursor-power');
        break;
      default:
        canvas.style.cursor = 'default';
    }
  }

  // Get current tool
  getCurrentTool() {
    return this.currentTool;
  }

  // Get tool cost
  getToolCost(tool = this.currentTool) {
    return TOOL_COSTS[tool] || 0;
  }

  // Check if current tool is a zone
  isZoneTool(tool = this.currentTool) {
    return ['residential', 'commercial', 'industrial'].includes(tool);
  }

  // Check if current tool is a building
  isBuildingTool(tool = this.currentTool) {
    return ['coal-power', 'nuclear-power', 'police', 'fire', 'stadium', 'seaport', 'airport'].includes(tool);
  }

  // Check if current tool is infrastructure
  isInfraTool(tool = this.currentTool) {
    return ['road', 'power-line', 'rail'].includes(tool);
  }
}
