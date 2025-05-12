/**
 * Data export and import functionality for Ping Pong Match Tracker
 * Handles data export, import, validation, and transformation
 */

const ExportImport = {
  /**
   * Export all data
   * @returns {Promise} - Resolves with exported data
   */
  async exportAllData() {
    try {
      UI.showLoading();
      
      const data = await DB.exportAllData();
      
      // Add metadata
      data.metadata = {
        exportDate: new Date().toISOString(),
        appName: 'Ping Pong Match Tracker',
        appVersion: '1.0.0',
        exportType: 'full'
      };
      
      UI.hideLoading();
      return data;
    } catch (error) {
      UI.hideLoading();
      console.error('Error exporting data:', error);
      throw error;
    }
  },
  
  /**
   * Export room data
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves with exported room data
   */
  async exportRoomData(roomId) {
    try {
      UI.showLoading();
      
      const data = await DB.exportRoomData(roomId);
      
      // Add metadata
      data.metadata = {
        exportDate: new Date().toISOString(),
        appName: 'Ping Pong Match Tracker',
        appVersion: '1.0.0',
        exportType: 'room'
      };
      
      UI.hideLoading();
      return data;
    } catch (error) {
      UI.hideLoading();
      console.error('Error exporting room data:', error);
      throw error;
    }
  },
  
  /**
   * Import data
   * @param {Object} data - Data to import
   * @returns {Promise} - Resolves when import is complete
   */
  async importData(data) {
    try {
      // Validate data
      this.validateImportData(data);
      
      UI.showLoading();
      
      // Import data
      await DB.importData(data);
      
      UI.hideLoading();
      return true;
    } catch (error) {
      UI.hideLoading();
      console.error('Error importing data:', error);
      throw error;
    }
  },
  
  /**
   * Validate import data
   * @param {Object} data - Data to validate
   * @throws {Error} - If data is invalid
   */
  validateImportData(data) {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: Data must be an object');
    }
    
    // Check if data has version
    if (!data.version) {
      throw new Error('Invalid data format: Missing version');
    }
    
    // Check if data has rooms or room
    if ((!data.rooms || !Array.isArray(data.rooms)) && !data.room) {
      throw new Error('Invalid data format: Missing rooms or room');
    }
    
    // If data has rooms, check if each room has required fields
    if (data.rooms && Array.isArray(data.rooms)) {
      data.rooms.forEach((room, index) => {
        if (!room.id) {
          throw new Error(`Invalid data format: Room at index ${index} is missing id`);
        }
        if (!room.name) {
          throw new Error(`Invalid data format: Room at index ${index} is missing name`);
        }
      });
    }
    
    // If data has room, check if it has required fields
    if (data.room) {
      if (!data.room.id) {
        throw new Error('Invalid data format: Room is missing id');
      }
      if (!data.room.name) {
        throw new Error('Invalid data format: Room is missing name');
      }
    }
    
    // If data has players, check if each player has required fields
    if (data.players && Array.isArray(data.players)) {
      data.players.forEach((player, index) => {
        if (!player.id) {
          throw new Error(`Invalid data format: Player at index ${index} is missing id`);
        }
        if (!player.roomId) {
          throw new Error(`Invalid data format: Player at index ${index} is missing roomId`);
        }
        if (!player.name) {
          throw new Error(`Invalid data format: Player at index ${index} is missing name`);
        }
      });
    }
    
    // If data has matches, check if each match has required fields
    if (data.matches && Array.isArray(data.matches)) {
      data.matches.forEach((match, index) => {
        if (!match.id) {
          throw new Error(`Invalid data format: Match at index ${index} is missing id`);
        }
        if (!match.roomId) {
          throw new Error(`Invalid data format: Match at index ${index} is missing roomId`);
        }
        if (!match.player1Id) {
          throw new Error(`Invalid data format: Match at index ${index} is missing player1Id`);
        }
        if (!match.player2Id) {
          throw new Error(`Invalid data format: Match at index ${index} is missing player2Id`);
        }
        if (match.player1Score === undefined) {
          throw new Error(`Invalid data format: Match at index ${index} is missing player1Score`);
        }
        if (match.player2Score === undefined) {
          throw new Error(`Invalid data format: Match at index ${index} is missing player2Score`);
        }
        if (!match.winnerId) {
          throw new Error(`Invalid data format: Match at index ${index} is missing winnerId`);
        }
        if (!match.date) {
          throw new Error(`Invalid data format: Match at index ${index} is missing date`);
        }
      });
    }
  },
  
  /**
   * Download data as JSON file
   * @param {Object} data - Data to download
   * @param {string} filename - Filename
   */
  downloadJson(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
  },
  
  /**
   * Generate backup reminder
   * @param {number} days - Days since last backup
   * @returns {string} - Reminder message
   */
  generateBackupReminder(days) {
    if (days >= 30) {
      return 'It has been over a month since your last backup. Please consider exporting your data.';
    } else if (days >= 14) {
      return 'It has been over two weeks since your last backup. Consider exporting your data soon.';
    } else if (days >= 7) {
      return 'It has been over a week since your last backup.';
    }
    
    return '';
  },
  
  /**
   * Check if backup reminder is needed
   * @returns {Promise} - Resolves with reminder message or empty string
   */
  async checkBackupReminder() {
    try {
      const lastBackup = await DB.getSetting('lastBackupDate');
      
      if (!lastBackup) {
        return 'You have never backed up your data. Consider exporting your data.';
      }
      
      const lastBackupDate = new Date(lastBackup);
      const now = new Date();
      const diffTime = Math.abs(now - lastBackupDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return this.generateBackupReminder(diffDays);
    } catch (error) {
      console.error('Error checking backup reminder:', error);
      return '';
    }
  },
  
  /**
   * Update last backup date
   * @returns {Promise} - Resolves when update is complete
   */
  async updateLastBackupDate() {
    try {
      await DB.saveSetting('lastBackupDate', new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Error updating last backup date:', error);
      throw error;
    }
  }
};
