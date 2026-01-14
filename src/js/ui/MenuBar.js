// MenuBar.js - Top menu bar

class MenuBar {
  constructor(game) {
    this.game = game;
    this.menuBar = document.getElementById('menu-bar');
    this.activeMenu = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Menu item clicks
    this.menuBar.querySelectorAll('.win95-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = item.dataset.menu;
        this.toggleMenu(menu, item);
      });

      item.addEventListener('mouseenter', () => {
        if (this.activeMenu) {
          const menu = item.dataset.menu;
          this.showMenu(menu, item);
        }
      });
    });

    // Click outside to close
    document.addEventListener('click', () => {
      this.closeAllMenus();
    });

    // Dropdown item clicks
    document.querySelectorAll('.win95-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        this.handleAction(action);
        this.closeAllMenus();
      });
    });
  }

  // Toggle menu open/closed
  toggleMenu(menuName, menuItem) {
    if (this.activeMenu === menuName) {
      this.closeAllMenus();
    } else {
      this.showMenu(menuName, menuItem);
    }
  }

  // Show a specific menu
  showMenu(menuName, menuItem) {
    this.closeAllMenus();

    const dropdown = document.getElementById(`dropdown-${menuName}`);
    if (!dropdown) return;

    // Position dropdown below menu item
    const rect = menuItem.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.style.display = 'block';

    // Mark menu item as active
    menuItem.classList.add('active');
    this.activeMenu = menuName;
  }

  // Close all menus
  closeAllMenus() {
    document.querySelectorAll('.win95-dropdown').forEach(dropdown => {
      dropdown.style.display = 'none';
    });
    document.querySelectorAll('.win95-menu-item').forEach(item => {
      item.classList.remove('active');
    });
    this.activeMenu = null;
  }

  // Handle menu action
  handleAction(action) {
    switch (action) {
      // System menu
      case 'new-city':
        if (confirm('Start a new city? Current city will be lost.')) {
          this.game.newCity();
        }
        break;
      case 'load-city':
        this.game.loadCity();
        break;
      case 'save-city':
        this.game.saveCity();
        break;
      case 'save-city-as':
        this.game.saveCityAs();
        break;
      case 'exit':
        if (confirm('Exit ClaudeCity?')) {
          window.close();
        }
        break;

      // Options menu
      case 'budget':
        this.game.showBudgetDialog();
        break;
      case 'tax-rate':
        this.game.showTaxDialog();
        break;
      case 'auto-bulldoze':
        this.game.toggleAutoBulldoze();
        this.updateCheckmark('auto-bulldoze', this.game.autoBulldoze);
        break;
      case 'auto-budget':
        this.game.toggleAutoBudget();
        this.updateCheckmark('auto-budget', this.game.autoBudget);
        break;

      // Edit menu
      case 'undo':
        this.game.undo();
        break;

      // Disasters menu
      case 'fire':
        this.game.triggerDisaster('fire');
        break;
      case 'flood':
        this.game.triggerDisaster('flood');
        break;
      case 'tornado':
        this.game.triggerDisaster('tornado');
        break;
      case 'earthquake':
        this.game.triggerDisaster('earthquake');
        break;
      case 'monster':
        this.game.triggerDisaster('monster');
        break;
      case 'disable-disasters':
        this.game.toggleDisasters();
        this.updateCheckmark('disable-disasters', this.game.disastersDisabled);
        break;

      // Windows menu
      case 'toggle-minimap':
        this.game.toggleMinimap();
        break;
      case 'graphs':
        this.game.showGraphs();
        break;
      case 'population':
        this.game.showPopulation();
        break;
      case 'voter-opinion':
        this.game.showVoterOpinion();
        break;
      case 'overlay-power':
        this.game.setOverlay('power');
        break;
      case 'overlay-traffic':
        this.game.setOverlay('traffic');
        break;
      case 'overlay-pollution':
        this.game.setOverlay('pollution');
        break;
      case 'overlay-crime':
        this.game.setOverlay('crime');
        break;
      case 'overlay-landvalue':
        this.game.setOverlay('landvalue');
        break;
    }
  }

  // Update checkmark on menu item
  updateCheckmark(action, checked) {
    const item = document.querySelector(`[data-action="${action}"]`);
    if (item) {
      item.classList.toggle('checked', checked);
    }
  }
}
