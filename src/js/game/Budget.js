// Budget.js - City finances and budget management

class Budget {
  constructor() {
    this.funds = GAME_CONSTANTS.STARTING_FUNDS;
    this.taxRate = GAME_CONSTANTS.DEFAULT_TAX_RATE;

    // Income tracking
    this.taxIncome = 0;

    // Expense tracking
    this.policeExpense = 0;
    this.fireExpense = 0;
    this.roadExpense = 0;
    this.railExpense = 0;

    // Funding levels (0-100%)
    this.policeFunding = 100;
    this.fireFunding = 100;
    this.transportFunding = 100;

    // Year-end summary
    this.yearlyIncome = 0;
    this.yearlyExpenses = 0;
    this.lastYearCashFlow = 0;

    // History for graphs
    this.history = [];
  }

  // Check if we can afford something
  canAfford(cost) {
    return this.funds >= cost;
  }

  // Spend money
  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.funds -= amount;
    return true;
  }

  // Add money
  addFunds(amount) {
    this.funds += amount;
  }

  // Calculate monthly taxes based on population
  calculateTaxes(population) {
    // Tax per capita adjusted by tax rate
    const basePerCapita = 0.5;
    this.taxIncome = Math.floor(population * basePerCapita * (this.taxRate / 100));
    return this.taxIncome;
  }

  // Calculate maintenance costs
  calculateMaintenance(city) {
    const infra = city.countInfrastructure();
    const services = city.getServiceBuildings();
    const powerPlants = city.getPowerPlants();

    // Road maintenance
    this.roadExpense = Math.floor(infra.roads * MAINTENANCE_COSTS.road * (this.transportFunding / 100) / 12);

    // Rail maintenance
    this.railExpense = Math.floor(infra.rails * MAINTENANCE_COSTS.rail * (this.transportFunding / 100) / 12);

    // Police maintenance
    const policeCount = services.filter(s => s.type === 'police').length;
    this.policeExpense = Math.floor(policeCount * MAINTENANCE_COSTS.police * (this.policeFunding / 100) / 12);

    // Fire maintenance
    const fireCount = services.filter(s => s.type === 'fire').length;
    this.fireExpense = Math.floor(fireCount * MAINTENANCE_COSTS.fire * (this.fireFunding / 100) / 12);

    // Power plant maintenance
    let powerExpense = 0;
    powerPlants.forEach(plant => {
      powerExpense += MAINTENANCE_COSTS[plant.type] / 12;
    });

    return this.roadExpense + this.railExpense + this.policeExpense + this.fireExpense + Math.floor(powerExpense);
  }

  // Process monthly budget
  processMonth(city) {
    const population = city.getTotalPopulation();

    // Calculate income
    const taxes = this.calculateTaxes(population);

    // Calculate expenses
    const expenses = this.calculateMaintenance(city);

    // Apply
    this.funds += taxes;
    this.funds -= expenses;

    // Track for year
    this.yearlyIncome += taxes;
    this.yearlyExpenses += expenses;

    return {
      taxes,
      expenses,
      netChange: taxes - expenses
    };
  }

  // Process year end
  processYear(year) {
    this.lastYearCashFlow = this.yearlyIncome - this.yearlyExpenses;

    // Add to history
    this.history.push({
      year,
      funds: this.funds,
      income: this.yearlyIncome,
      expenses: this.yearlyExpenses,
      cashFlow: this.lastYearCashFlow
    });

    // Keep last 100 years
    if (this.history.length > 100) {
      this.history.shift();
    }

    // Reset yearly trackers
    this.yearlyIncome = 0;
    this.yearlyExpenses = 0;
  }

  // Get formatted funds string
  getFormattedFunds() {
    return '$' + this.funds.toLocaleString();
  }

  // Set tax rate
  setTaxRate(rate) {
    this.taxRate = Math.max(
      GAME_CONSTANTS.MIN_TAX_RATE,
      Math.min(GAME_CONSTANTS.MAX_TAX_RATE, rate)
    );
  }

  // Get budget summary
  getSummary() {
    return {
      funds: this.funds,
      taxRate: this.taxRate,
      taxIncome: this.taxIncome * 12, // Annualized
      policeExpense: this.policeExpense * 12,
      fireExpense: this.fireExpense * 12,
      roadExpense: this.roadExpense * 12,
      railExpense: this.railExpense * 12,
      totalExpenses: (this.policeExpense + this.fireExpense + this.roadExpense + this.railExpense) * 12,
      projectedCashFlow: (this.taxIncome - this.policeExpense - this.fireExpense - this.roadExpense - this.railExpense) * 12
    };
  }

  // Serialize for save
  serialize() {
    return {
      funds: this.funds,
      taxRate: this.taxRate,
      policeFunding: this.policeFunding,
      fireFunding: this.fireFunding,
      transportFunding: this.transportFunding,
      history: this.history
    };
  }

  // Deserialize from save
  static deserialize(data) {
    const budget = new Budget();
    Object.assign(budget, data);
    return budget;
  }
}
