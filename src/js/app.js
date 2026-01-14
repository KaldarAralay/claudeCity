// app.js - Application entry point

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('ClaudeCity initializing...');

  // Create and initialize the game
  const game = new Game();
  game.init();

  // Make game accessible globally for debugging
  window.game = game;

  console.log('ClaudeCity ready!');
});
