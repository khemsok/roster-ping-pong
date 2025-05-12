/**
 * Database operations for Ping Pong Match Tracker
 * Handles all IndexedDB interactions
 */

const DB = {
  // Database configuration
  name: 'PingPongTrackerDB',
  version: 1,
  db: null,
  
  // Object store names
  stores: {
    rooms: 'rooms',
    players: 'players',
    matches: 'matches',
    settings: 'settings'
  },
  
  /**
   * Initialize the database
   * @returns {Promise} - Resolves when database is ready
   */
  init() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }
      
      // Show loading indicator
      UI.showLoading();
      
      const request = indexedDB.open(this.name, this.version);
      
      // Create object stores if needed
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create rooms store
        if (!db.objectStoreNames.contains(this.stores.rooms)) {
          const roomsStore = db.createObjectStore(this.stores.rooms, { keyPath: 'id' });
          roomsStore.createIndex('name', 'name', { unique: false });
          roomsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Create players store
        if (!db.objectStoreNames.contains(this.stores.players)) {
          const playersStore = db.createObjectStore(this.stores.players, { keyPath: 'id' });
          playersStore.createIndex('roomId', 'roomId', { unique: false });
          playersStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create matches store
        if (!db.objectStoreNames.contains(this.stores.matches)) {
          const matchesStore = db.createObjectStore(this.stores.matches, { keyPath: 'id' });
          matchesStore.createIndex('roomId', 'roomId', { unique: false });
          matchesStore.createIndex('player1Id', 'player1Id', { unique: false });
          matchesStore.createIndex('player2Id', 'player2Id', { unique: false });
          matchesStore.createIndex('winnerId', 'winnerId', { unique: false });
          matchesStore.createIndex('date', 'date', { unique: false });
        }
        
        // Create settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'id' });
        }
      };
      
      // Handle success
      request.onsuccess = (event) => {
        this.db = event.target.result;
        UI.hideLoading();
        resolve(this.db);
      };
      
      // Handle error
      request.onerror = (event) => {
        UI.hideLoading();
        UI.showToast('Error opening database', 'error');
        console.error('Database error:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get a transaction and object store
   * @param {string} storeName - Name of the object store
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @returns {Object} - Object containing transaction and store
   */
  getStore(storeName, mode = 'readonly') {
    const transaction = this.db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  },
  
  /**
   * Generate a unique ID
   * @returns {string} - Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
  
  /**
   * Calculate storage usage
   * @returns {Promise} - Resolves with storage usage in bytes
   */
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0
      };
    }
    return { usage: 0, quota: 0, percent: 0 };
  },
  
  /*** ROOM OPERATIONS ***/
  
  /**
   * Create a new room
   * @param {Object} roomData - Room data
   * @returns {Promise} - Resolves with the created room
   */
  async createRoom(roomData) {
    await this.init();
    
    const room = {
      id: this.generateId(),
      name: roomData.name,
      description: roomData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.rooms, 'readwrite');
      
      const request = store.add(room);
      
      request.onsuccess = () => {
        resolve(room);
      };
      
      request.onerror = (event) => {
        console.error('Error creating room:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get all rooms
   * @returns {Promise} - Resolves with an array of rooms
   */
  async getAllRooms() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.rooms);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting rooms:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get a room by ID
   * @param {string} id - Room ID
   * @returns {Promise} - Resolves with the room
   */
  async getRoom(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.rooms);
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting room:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Update a room
   * @param {Object} room - Room data
   * @returns {Promise} - Resolves with the updated room
   */
  async updateRoom(room) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.rooms, 'readwrite');
      
      // Get existing room first
      const getRequest = store.get(room.id);
      
      getRequest.onsuccess = () => {
        const existingRoom = getRequest.result;
        if (!existingRoom) {
          reject(new Error('Room not found'));
          return;
        }
        
        // Update room with new data
        const updatedRoom = {
          ...existingRoom,
          ...room,
          updatedAt: new Date().toISOString()
        };
        
        const updateRequest = store.put(updatedRoom);
        
        updateRequest.onsuccess = () => {
          resolve(updatedRoom);
        };
        
        updateRequest.onerror = (event) => {
          console.error('Error updating room:', event.target.error);
          reject(event.target.error);
        };
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting room for update:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Delete a room and all associated data
   * @param {string} id - Room ID
   * @returns {Promise} - Resolves when room is deleted
   */
  async deleteRoom(id) {
    await this.init();
    
    // Delete room
    const deleteRoom = new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.rooms, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting room:', event.target.error);
        reject(event.target.error);
      };
    });
    
    // Delete all players in the room
    const deletePlayers = this.deleteAllPlayersInRoom(id);
    
    // Delete all matches in the room
    const deleteMatches = this.deleteAllMatchesInRoom(id);
    
    // Wait for all operations to complete
    return Promise.all([deleteRoom, deletePlayers, deleteMatches]);
  },
  
  /**
   * Get room statistics
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves with room statistics
   */
  async getRoomStats(roomId) {
    await this.init();
    
    const players = await this.getPlayersInRoom(roomId);
    const matches = await this.getMatchesInRoom(roomId);
    
    return {
      playerCount: players.length,
      matchCount: matches.length,
      lastMatch: matches.length > 0 ? matches.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null
    };
  },
  
  /*** PLAYER OPERATIONS ***/
  
  /**
   * Create a new player
   * @param {Object} playerData - Player data
   * @returns {Promise} - Resolves with the created player
   */
  async createPlayer(playerData) {
    await this.init();
    
    const player = {
      id: this.generateId(),
      roomId: playerData.roomId,
      name: playerData.name,
      nickname: playerData.nickname || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.players, 'readwrite');
      
      const request = store.add(player);
      
      request.onsuccess = () => {
        resolve(player);
      };
      
      request.onerror = (event) => {
        console.error('Error creating player:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get all players in a room
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves with an array of players
   */
  async getPlayersInRoom(roomId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.players);
      const index = store.index('roomId');
      const request = index.getAll(roomId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting players:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get a player by ID
   * @param {string} id - Player ID
   * @returns {Promise} - Resolves with the player
   */
  async getPlayer(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.players);
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting player:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Update a player
   * @param {Object} player - Player data
   * @returns {Promise} - Resolves with the updated player
   */
  async updatePlayer(player) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.players, 'readwrite');
      
      // Get existing player first
      const getRequest = store.get(player.id);
      
      getRequest.onsuccess = () => {
        const existingPlayer = getRequest.result;
        if (!existingPlayer) {
          reject(new Error('Player not found'));
          return;
        }
        
        // Update player with new data
        const updatedPlayer = {
          ...existingPlayer,
          ...player,
          updatedAt: new Date().toISOString()
        };
        
        const updateRequest = store.put(updatedPlayer);
        
        updateRequest.onsuccess = () => {
          resolve(updatedPlayer);
        };
        
        updateRequest.onerror = (event) => {
          console.error('Error updating player:', event.target.error);
          reject(event.target.error);
        };
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting player for update:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Delete a player
   * @param {string} id - Player ID
   * @returns {Promise} - Resolves when player is deleted
   */
  async deletePlayer(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.players, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting player:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Delete all players in a room
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves when all players are deleted
   */
  async deleteAllPlayersInRoom(roomId) {
    await this.init();
    
    const players = await this.getPlayersInRoom(roomId);
    const deletePromises = players.map(player => this.deletePlayer(player.id));
    
    return Promise.all(deletePromises);
  },
  
  /**
   * Get player statistics
   * @param {string} playerId - Player ID
   * @returns {Promise} - Resolves with player statistics
   */
  async getPlayerStats(playerId) {
    await this.init();
    
    const player = await this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Get all matches involving this player
    const matches = await this.getPlayerMatches(playerId);
    
    // Calculate statistics
    const wins = matches.filter(match => match.winnerId === playerId).length;
    const losses = matches.length - wins;
    const winPercentage = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
    
    // Calculate current streak
    let currentStreak = 0;
    let isWinningStreak = false;
    
    if (matches.length > 0) {
      // Sort matches by date (newest first)
      const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      isWinningStreak = sortedMatches[0].winnerId === playerId;
      currentStreak = 1;
      
      for (let i = 1; i < sortedMatches.length; i++) {
        const match = sortedMatches[i];
        const isWin = match.winnerId === playerId;
        
        if (isWin === isWinningStreak) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return {
      matches: matches.length,
      wins,
      losses,
      winPercentage,
      currentStreak,
      isWinningStreak
    };
  },
  
  /*** MATCH OPERATIONS ***/
  
  /**
   * Create a new match
   * @param {Object} matchData - Match data
   * @returns {Promise} - Resolves with the created match
   */
  async createMatch(matchData) {
    await this.init();
    
    // Determine winner based on scores
    const player1Score = parseInt(matchData.player1Score);
    const player2Score = parseInt(matchData.player2Score);
    const winnerId = player1Score > player2Score ? matchData.player1Id : matchData.player2Id;
    
    const match = {
      id: this.generateId(),
      roomId: matchData.roomId,
      player1Id: matchData.player1Id,
      player2Id: matchData.player2Id,
      player1Score,
      player2Score,
      winnerId,
      notes: matchData.notes || '',
      date: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.matches, 'readwrite');
      
      const request = store.add(match);
      
      request.onsuccess = () => {
        resolve(match);
      };
      
      request.onerror = (event) => {
        console.error('Error creating match:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get all matches in a room
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves with an array of matches
   */
  async getMatchesInRoom(roomId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.matches);
      const index = store.index('roomId');
      const request = index.getAll(roomId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting matches:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get matches for a specific player
   * @param {string} playerId - Player ID
   * @returns {Promise} - Resolves with an array of matches
   */
  async getPlayerMatches(playerId) {
    await this.init();
    
    // Get matches where player is player1
    const player1Matches = await new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.matches);
      const index = store.index('player1Id');
      const request = index.getAll(playerId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting player1 matches:', event.target.error);
        reject(event.target.error);
      };
    });
    
    // Get matches where player is player2
    const player2Matches = await new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.matches);
      const index = store.index('player2Id');
      const request = index.getAll(playerId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting player2 matches:', event.target.error);
        reject(event.target.error);
      };
    });
    
    // Combine and remove duplicates
    const allMatches = [...player1Matches, ...player2Matches];
    const uniqueMatches = Array.from(new Map(allMatches.map(match => [match.id, match])).values());
    
    return uniqueMatches;
  },
  
  /**
   * Get a match by ID
   * @param {string} id - Match ID
   * @returns {Promise} - Resolves with the match
   */
  async getMatch(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.matches);
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting match:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Delete a match
   * @param {string} id - Match ID
   * @returns {Promise} - Resolves when match is deleted
   */
  async deleteMatch(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.matches, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting match:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Delete all matches in a room
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves when all matches are deleted
   */
  async deleteAllMatchesInRoom(roomId) {
    await this.init();
    
    const matches = await this.getMatchesInRoom(roomId);
    const deletePromises = matches.map(match => this.deleteMatch(match.id));
    
    return Promise.all(deletePromises);
  },
  
  /*** SETTINGS OPERATIONS ***/
  
  /**
   * Save a setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise} - Resolves when setting is saved
   */
  async saveSetting(key, value) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { transaction, store } = this.getStore(this.stores.settings, 'readwrite');
      
      const setting = {
        id: key,
        value,
        updatedAt: new Date().toISOString()
      };
      
      const request = store.put(setting);
      
      request.onsuccess = () => {
        resolve(setting);
      };
      
      request.onerror = (event) => {
        console.error('Error saving setting:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /**
   * Get a setting
   * @param {string} key - Setting key
   * @returns {Promise} - Resolves with the setting value
   */
  async getSetting(key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.settings);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = (event) => {
        console.error('Error getting setting:', event.target.error);
        reject(event.target.error);
      };
    });
  },
  
  /*** DATA EXPORT/IMPORT ***/
  
  /**
   * Export all data
   * @returns {Promise} - Resolves with exported data
   */
  async exportAllData() {
    await this.init();
    
    const rooms = await this.getAllRooms();
    const players = [];
    const matches = [];
    
    // Get all players and matches for each room
    for (const room of rooms) {
      const roomPlayers = await this.getPlayersInRoom(room.id);
      const roomMatches = await this.getMatchesInRoom(room.id);
      
      players.push(...roomPlayers);
      matches.push(...roomMatches);
    }
    
    // Get all settings
    const settings = await new Promise((resolve, reject) => {
      const { store } = this.getStore(this.stores.settings);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting settings:', event.target.error);
        reject(event.target.error);
      };
    });
    
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      rooms,
      players,
      matches,
      settings
    };
  },
  
  /**
   * Export room data
   * @param {string} roomId - Room ID
   * @returns {Promise} - Resolves with exported room data
   */
  async exportRoomData(roomId) {
    await this.init();
    
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    const players = await this.getPlayersInRoom(roomId);
    const matches = await this.getMatchesInRoom(roomId);
    
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      room,
      players,
      matches
    };
  },
  
  /**
   * Import data
   * @param {Object} data - Data to import
   * @returns {Promise} - Resolves when import is complete
   */
  async importData(data) {
    await this.init();
    
    // Validate data
    if (!data || !data.version) {
      throw new Error('Invalid data format');
    }
    
    // Show loading indicator
    UI.showLoading();
    
    try {
      // Import rooms
      if (data.rooms && Array.isArray(data.rooms)) {
        for (const room of data.rooms) {
          await new Promise((resolve, reject) => {
            const { store } = this.getStore(this.stores.rooms, 'readwrite');
            const request = store.put(room);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
          });
        }
      } else if (data.room) {
        // Single room export
        await new Promise((resolve, reject) => {
          const { store } = this.getStore(this.stores.rooms, 'readwrite');
          const request = store.put(data.room);
          
          request.onsuccess = () => resolve();
          request.onerror = (event) => reject(event.target.error);
        });
      }
      
      // Import players
      if (data.players && Array.isArray(data.players)) {
        for (const player of data.players) {
          await new Promise((resolve, reject) => {
            const { store } = this.getStore(this.stores.players, 'readwrite');
            const request = store.put(player);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
          });
        }
      }
      
      // Import matches
      if (data.matches && Array.isArray(data.matches)) {
        for (const match of data.matches) {
          await new Promise((resolve, reject) => {
            const { store } = this.getStore(this.stores.matches, 'readwrite');
            const request = store.put(match);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
          });
        }
      }
      
      // Import settings
      if (data.settings && Array.isArray(data.settings)) {
        for (const setting of data.settings) {
          await new Promise((resolve, reject) => {
            const { store } = this.getStore(this.stores.settings, 'readwrite');
            const request = store.put(setting);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
          });
        }
      }
      
      UI.hideLoading();
      return true;
    } catch (error) {
      UI.hideLoading();
      console.error('Error importing data:', error);
      throw error;
    }
  }
};
