/**
 * Main application logic for Ping Pong Match Tracker
 * Initializes the application and ties everything together
 */

const App = {
  /**
   * Initialize the application
   */
  async init() {
    try {
      // Show loading indicator during initialization
      UI.showLoading();
      
      // Initialize database
      await DB.init();
      
      // Initialize UI
      UI.init();
      
      // Check for backup reminder
      this.checkBackupReminder();
      
      // Hide loading indicator
      UI.hideLoading();
      
      console.log('Ping Pong Match Tracker initialized successfully');
    } catch (error) {
      console.error('Error initializing application:', error);
      UI.hideLoading();
      UI.showToast('Error initializing application', 'error');
    }
  },
  
  /**
   * Check if backup reminder is needed
   */
  async checkBackupReminder() {
    try {
      const reminder = await ExportImport.checkBackupReminder();
      
      if (reminder) {
        setTimeout(() => {
          UI.showToast(reminder, 'info');
        }, 3000); // Show reminder after 3 seconds
      }
    } catch (error) {
      console.error('Error checking backup reminder:', error);
    }
  }
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Service Worker Registration for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
