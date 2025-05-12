/**
 * UI operations for Ping Pong Match Tracker
 * Handles all UI interactions and DOM manipulations
 */

const UI = {
  // Current state
  currentRoom: null,
  currentTab: 'players',
  
  /**
   * Initialize the UI
   */
  init() {
    this.setupEventListeners();
    this.checkForExistingRooms();
  },
  
  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Room selector
    document.getElementById('room-selector').addEventListener('change', this.handleRoomChange.bind(this));
    document.getElementById('create-room-btn').addEventListener('click', this.showCreateRoomModal.bind(this));
    document.getElementById('manage-rooms-btn').addEventListener('click', this.showManageRoomsModal.bind(this));
    
    // Welcome screen buttons
    document.getElementById('welcome-create-room').addEventListener('click', this.showCreateRoomModal.bind(this));
    document.getElementById('welcome-import-data').addEventListener('click', this.showImportDataDialog.bind(this));
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', this.handleTabChange.bind(this));
    });
    
    // Player actions
    document.getElementById('add-player-btn').addEventListener('click', this.showAddPlayerModal.bind(this));
    
    // Match form
    document.getElementById('new-match-form').addEventListener('submit', this.handleMatchSubmit.bind(this));
    
    // Modal close buttons
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
      btn.addEventListener('click', this.closeAllModals.bind(this));
    });
    
    // Modal overlay
    document.getElementById('modal-overlay').addEventListener('click', this.closeAllModals.bind(this));
    
    // Form submissions
    document.getElementById('create-room-form').addEventListener('submit', this.handleCreateRoomSubmit.bind(this));
    document.getElementById('add-player-form').addEventListener('submit', this.handleAddPlayerSubmit.bind(this));
    document.getElementById('edit-player-form').addEventListener('submit', this.handleEditPlayerSubmit.bind(this));
    
    // Data management
    document.getElementById('export-all-data').addEventListener('click', this.handleExportAllData.bind(this));
    document.getElementById('import-data').addEventListener('click', this.showImportDataDialog.bind(this));
    document.getElementById('import-file').addEventListener('change', this.handleImportData.bind(this));
  },
  
  /**
   * Check if there are existing rooms and show appropriate screen
   */
  async checkForExistingRooms() {
    try {
      const rooms = await DB.getAllRooms();
      
      if (rooms.length === 0) {
        // No rooms, show welcome screen
        document.getElementById('welcome-screen').classList.remove('hidden');
        document.getElementById('room-content').classList.add('hidden');
      } else {
        // Populate room selector
        this.populateRoomSelector(rooms);
        
        // Check if there's a last selected room
        const lastRoomId = await DB.getSetting('lastRoomId');
        if (lastRoomId && rooms.some(room => room.id === lastRoomId)) {
          document.getElementById('room-selector').value = lastRoomId;
          this.loadRoom(lastRoomId);
        } else {
          // Show welcome screen until a room is selected
          document.getElementById('welcome-screen').classList.remove('hidden');
          document.getElementById('room-content').classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Error checking for existing rooms:', error);
      this.showToast('Error loading rooms', 'error');
    }
  },
  
  /**
   * Populate the room selector dropdown
   * @param {Array} rooms - Array of room objects
   */
  populateRoomSelector(rooms) {
    const selector = document.getElementById('room-selector');
    
    // Clear existing options except the first one
    while (selector.options.length > 1) {
      selector.remove(1);
    }
    
    // Add room options
    rooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = room.name;
      selector.appendChild(option);
    });
  },
  
  /**
   * Handle room change from selector
   * @param {Event} event - Change event
   */
  async handleRoomChange(event) {
    const roomId = event.target.value;
    
    if (!roomId) {
      // No room selected, show welcome screen
      document.getElementById('welcome-screen').classList.remove('hidden');
      document.getElementById('room-content').classList.add('hidden');
      document.getElementById('current-room-display').classList.add('hidden');
      this.currentRoom = null;
      return;
    }
    
    this.loadRoom(roomId);
  },
  
  /**
   * Load a room and its data
   * @param {string} roomId - Room ID
   */
  async loadRoom(roomId) {
    try {
      this.showLoading();
      
      // Get room data
      const room = await DB.getRoom(roomId);
      if (!room) {
        this.showToast('Room not found', 'error');
        this.hideLoading();
        return;
      }
      
      // Set as current room
      this.currentRoom = room;
      
      // Save as last selected room
      await DB.saveSetting('lastRoomId', roomId);
      
      // Update UI
      document.getElementById('welcome-screen').classList.add('hidden');
      document.getElementById('room-content').classList.remove('hidden');
      
      // Update room display
      document.getElementById('current-room-display').classList.remove('hidden');
      document.getElementById('current-room-name').textContent = room.name;
      
      // Load room data
      await this.loadPlayers();
      await this.loadMatches();
      await this.loadStats();
      
      // Set active tab
      this.setActiveTab(this.currentTab);
      
      this.hideLoading();
    } catch (error) {
      console.error('Error loading room:', error);
      this.showToast('Error loading room data', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle tab change
   * @param {Event} event - Click event
   */
  handleTabChange(event) {
    const tabName = event.target.dataset.tab;
    this.setActiveTab(tabName);
  },
  
  /**
   * Set the active tab
   * @param {string} tabName - Tab name
   */
  setActiveTab(tabName) {
    // Update current tab
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.id === `${tabName}-tab`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    // Special handling for certain tabs
    if (tabName === 'new-match') {
      this.populatePlayerSelectors();
    } else if (tabName === 'stats') {
      this.loadStats();
    } else if (tabName === 'history') {
      this.populatePlayerFilter();
    }
  },
  
  /**
   * Load players for the current room
   */
  async loadPlayers() {
    if (!this.currentRoom) return;
    
    try {
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      
      const playersList = document.getElementById('players-list');
      const noPlayersMessage = document.getElementById('no-players-message');
      
      // Clear existing players
      playersList.innerHTML = '';
      
      if (players.length === 0) {
        // Show no players message
        playersList.parentElement.classList.add('hidden');
        noPlayersMessage.classList.remove('hidden');
      } else {
        // Hide no players message
        playersList.parentElement.classList.remove('hidden');
        noPlayersMessage.classList.add('hidden');
        
        // Add players to the list
        for (const player of players) {
          // Get player stats
          const stats = await DB.getPlayerStats(player.id);
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${player.name}${player.nickname ? ` (${player.nickname})` : ''}</td>
            <td>${stats.matches}</td>
            <td>${stats.wins}</td>
            <td>${stats.losses}</td>
            <td>${stats.winPercentage}%</td>
            <td class="table-actions">
              <button class="btn primary edit-player" data-id="${player.id}">Edit</button>
              <button class="btn danger delete-player" data-id="${player.id}">Delete</button>
            </td>
          `;
          
          // Add event listeners
          row.querySelector('.edit-player').addEventListener('click', () => this.showEditPlayerModal(player));
          row.querySelector('.delete-player').addEventListener('click', () => this.confirmDeletePlayer(player));
          
          playersList.appendChild(row);
        }
      }
    } catch (error) {
      console.error('Error loading players:', error);
      this.showToast('Error loading players', 'error');
    }
  },
  
  /**
   * Load matches for the current room
   */
  async loadMatches() {
    if (!this.currentRoom) return;
    
    try {
      const matches = await DB.getMatchesInRoom(this.currentRoom.id);
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      
      // Create a map of player IDs to names
      const playerMap = new Map();
      players.forEach(player => {
        playerMap.set(player.id, player.name);
      });
      
      const matchesList = document.getElementById('match-history-list');
      const noMatchesMessage = document.getElementById('no-matches-message');
      
      // Clear existing matches
      matchesList.innerHTML = '';
      
      if (matches.length === 0) {
        // Show no matches message
        matchesList.parentElement.classList.add('hidden');
        noMatchesMessage.classList.remove('hidden');
      } else {
        // Hide no matches message
        matchesList.parentElement.classList.remove('hidden');
        noMatchesMessage.classList.add('hidden');
        
        // Sort matches by date (newest first)
        const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add matches to the list
        for (const match of sortedMatches) {
          const date = new Date(match.date);
          const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${playerMap.get(match.player1Id)} vs ${playerMap.get(match.player2Id)}</td>
            <td>${match.player1Score} - ${match.player2Score}</td>
            <td>${playerMap.get(match.winnerId)}</td>
            <td>${match.notes || '-'}</td>
            <td class="table-actions">
              <button class="btn danger delete-match" data-id="${match.id}">Delete</button>
            </td>
          `;
          
          // Add event listeners
          row.querySelector('.delete-match').addEventListener('click', () => this.confirmDeleteMatch(match));
          
          matchesList.appendChild(row);
        }
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      this.showToast('Error loading matches', 'error');
    }
  },
  
  /**
   * Load statistics for the current room
   */
  async loadStats() {
    if (!this.currentRoom) return;
    
    try {
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      const matches = await DB.getMatchesInRoom(this.currentRoom.id);
      
      // Calculate player stats
      const playerStats = [];
      for (const player of players) {
        const stats = await DB.getPlayerStats(player.id);
        playerStats.push({
          id: player.id,
          name: player.name,
          matches: stats.matches,
          wins: stats.wins,
          losses: stats.losses,
          winPercentage: stats.winPercentage,
          currentStreak: stats.currentStreak,
          isWinningStreak: stats.isWinningStreak
        });
      }
      
      // Sort by win percentage (descending)
      playerStats.sort((a, b) => b.winPercentage - a.winPercentage);
      
      // Update leaderboard
      const leaderboardList = document.getElementById('leaderboard-list');
      leaderboardList.innerHTML = '';
      
      playerStats.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${player.name}</td>
          <td>${player.wins}</td>
          <td>${player.winPercentage}%</td>
          <td>${player.currentStreak > 0 ? `${player.currentStreak} ${player.isWinningStreak ? 'W' : 'L'}` : '-'}</td>
        `;
        leaderboardList.appendChild(row);
      });
      
      // Create win distribution chart
      this.createWinDistributionChart(playerStats);
      
      // Create match activity chart
      this.createMatchActivityChart(matches);
    } catch (error) {
      console.error('Error loading statistics:', error);
      this.showToast('Error loading statistics', 'error');
    }
  },
  
  /**
   * Create win distribution chart
   * @param {Array} playerStats - Array of player statistics
   */
  createWinDistributionChart(playerStats) {
    const chartContainer = document.getElementById('win-distribution-chart');
    chartContainer.innerHTML = '';
    
    if (playerStats.length === 0) {
      chartContainer.innerHTML = '<p class="empty-chart">No data available</p>';
      return;
    }
    
    // Find the player with the most wins (for scaling)
    const maxWins = Math.max(...playerStats.map(player => player.wins));
    
    // Create bars for each player
    playerStats.forEach(player => {
      if (player.matches === 0) return;
      
      const barHeight = player.wins > 0 ? (player.wins / maxWins) * 100 : 0;
      
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${barHeight}%`;
      
      const barLabel = document.createElement('div');
      barLabel.className = 'bar-label';
      barLabel.textContent = player.name;
      
      const barValue = document.createElement('div');
      barValue.className = 'bar-value';
      barValue.textContent = player.wins;
      
      bar.appendChild(barLabel);
      bar.appendChild(barValue);
      chartContainer.appendChild(bar);
    });
  },
  
  /**
   * Create match activity chart
   * @param {Array} matches - Array of matches
   */
  createMatchActivityChart(matches) {
    const chartContainer = document.getElementById('match-activity-chart');
    chartContainer.innerHTML = '';
    
    if (matches.length === 0) {
      chartContainer.innerHTML = '<p class="empty-chart">No data available</p>';
      return;
    }
    
    // Group matches by day
    const matchesByDay = {};
    matches.forEach(match => {
      const date = new Date(match.date);
      const day = date.toLocaleDateString();
      
      if (!matchesByDay[day]) {
        matchesByDay[day] = 0;
      }
      
      matchesByDay[day]++;
    });
    
    // Convert to array and sort by date
    const activityData = Object.entries(matchesByDay).map(([day, count]) => ({
      day,
      count,
      date: new Date(day)
    }));
    
    activityData.sort((a, b) => a.date - b.date);
    
    // Limit to the last 10 days with activity
    const recentActivity = activityData.slice(-10);
    
    // Find the maximum count (for scaling)
    const maxCount = Math.max(...recentActivity.map(data => data.count));
    
    // Create bars for each day
    recentActivity.forEach(data => {
      const barHeight = (data.count / maxCount) * 100;
      
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${barHeight}%`;
      
      const barLabel = document.createElement('div');
      barLabel.className = 'bar-label';
      barLabel.textContent = new Date(data.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const barValue = document.createElement('div');
      barValue.className = 'bar-value';
      barValue.textContent = data.count;
      
      bar.appendChild(barLabel);
      bar.appendChild(barValue);
      chartContainer.appendChild(bar);
    });
  },
  
  /**
   * Populate player selectors for the new match form
   */
  async populatePlayerSelectors() {
    if (!this.currentRoom) return;
    
    try {
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      
      const player1Select = document.getElementById('player1');
      const player2Select = document.getElementById('player2');
      
      // Clear existing options except the first one
      while (player1Select.options.length > 1) {
        player1Select.remove(1);
      }
      
      while (player2Select.options.length > 1) {
        player2Select.remove(1);
      }
      
      // Add player options
      players.forEach(player => {
        const option1 = document.createElement('option');
        option1.value = player.id;
        option1.textContent = player.name;
        player1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = player.id;
        option2.textContent = player.name;
        player2Select.appendChild(option2);
      });
    } catch (error) {
      console.error('Error populating player selectors:', error);
      this.showToast('Error loading players', 'error');
    }
  },
  
  /**
   * Populate player filter for match history
   */
  async populatePlayerFilter() {
    if (!this.currentRoom) return;
    
    try {
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      
      const playerFilter = document.getElementById('history-player-filter');
      
      // Clear existing options except the first one
      while (playerFilter.options.length > 1) {
        playerFilter.remove(1);
      }
      
      // Add player options
      players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        playerFilter.appendChild(option);
      });
      
      // Add event listener
      playerFilter.addEventListener('change', this.filterMatchHistory.bind(this));
      document.getElementById('history-date-filter').addEventListener('change', this.filterMatchHistory.bind(this));
    } catch (error) {
      console.error('Error populating player filter:', error);
      this.showToast('Error loading players', 'error');
    }
  },
  
  /**
   * Filter match history based on selected filters
   */
  async filterMatchHistory() {
    if (!this.currentRoom) return;
    
    try {
      const playerFilter = document.getElementById('history-player-filter').value;
      const dateFilter = document.getElementById('history-date-filter').value;
      
      let matches = await DB.getMatchesInRoom(this.currentRoom.id);
      const players = await DB.getPlayersInRoom(this.currentRoom.id);
      
      // Filter by player
      if (playerFilter) {
        matches = matches.filter(match => 
          match.player1Id === playerFilter || match.player2Id === playerFilter
        );
      }
      
      // Filter by date
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateFilter === 'today') {
          matches = matches.filter(match => new Date(match.date) >= today);
        } else if (dateFilter === 'week') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          matches = matches.filter(match => new Date(match.date) >= weekStart);
        } else if (dateFilter === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          matches = matches.filter(match => new Date(match.date) >= monthStart);
        }
      }
      
      // Create a map of player IDs to names
      const playerMap = new Map();
      players.forEach(player => {
        playerMap.set(player.id, player.name);
      });
      
      const matchesList = document.getElementById('match-history-list');
      const noMatchesMessage = document.getElementById('no-matches-message');
      
      // Clear existing matches
      matchesList.innerHTML = '';
      
      if (matches.length === 0) {
        // Show no matches message
        matchesList.parentElement.classList.add('hidden');
        noMatchesMessage.classList.remove('hidden');
      } else {
        // Hide no matches message
        matchesList.parentElement.classList.remove('hidden');
        noMatchesMessage.classList.add('hidden');
        
        // Sort matches by date (newest first)
        const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add matches to the list
        for (const match of sortedMatches) {
          const date = new Date(match.date);
          const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${playerMap.get(match.player1Id)} vs ${playerMap.get(match.player2Id)}</td>
            <td>${match.player1Score} - ${match.player2Score}</td>
            <td>${playerMap.get(match.winnerId)}</td>
            <td>${match.notes || '-'}</td>
            <td class="table-actions">
              <button class="btn danger delete-match" data-id="${match.id}">Delete</button>
            </td>
          `;
          
          // Add event listeners
          row.querySelector('.delete-match').addEventListener('click', () => this.confirmDeleteMatch(match));
          
          matchesList.appendChild(row);
        }
      }
    } catch (error) {
      console.error('Error filtering match history:', error);
      this.showToast('Error filtering matches', 'error');
    }
  },
  
  /**
   * Show the create room modal
   */
  showCreateRoomModal() {
    document.getElementById('create-room-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('room-name').focus();
  },
  
  /**
   * Show the manage rooms modal
   */
  async showManageRoomsModal() {
    try {
      this.showLoading();
      
      const rooms = await DB.getAllRooms();
      const roomsList = document.getElementById('rooms-list');
      
      // Clear existing rooms
      roomsList.innerHTML = '';
      
      // Add rooms to the list
      for (const room of rooms) {
        // Get room stats
        const stats = await DB.getRoomStats(room.id);
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${room.name}</td>
          <td>${stats.playerCount}</td>
          <td>${stats.matchCount}</td>
          <td>${new Date(room.createdAt).toLocaleDateString()}</td>
          <td class="table-actions">
            <button class="btn primary select-room" data-id="${room.id}">Select</button>
            <button class="btn secondary export-room" data-id="${room.id}">Export</button>
            <button class="btn danger delete-room" data-id="${room.id}">Delete</button>
          </td>
        `;
        
        // Add event listeners
        row.querySelector('.select-room').addEventListener('click', () => {
          document.getElementById('room-selector').value = room.id;
          this.loadRoom(room.id);
          this.closeAllModals();
        });
        
        row.querySelector('.export-room').addEventListener('click', () => this.handleExportRoomData(room.id));
        row.querySelector('.delete-room').addEventListener('click', () => this.confirmDeleteRoom(room));
        
        roomsList.appendChild(row);
      }
      
      // Update storage usage
      const storageUsage = await DB.getStorageUsage();
      document.getElementById('storage-usage').textContent = 
        `${(storageUsage.usage / (1024 * 1024)).toFixed(2)} MB / ${(storageUsage.quota / (1024 * 1024)).toFixed(2)} MB (${storageUsage.percent}%)`;
      
      document.getElementById('manage-rooms-modal').classList.remove('hidden');
      document.getElementById('modal-overlay').classList.remove('hidden');
      
      this.hideLoading();
    } catch (error) {
      console.error('Error showing manage rooms modal:', error);
      this.showToast('Error loading rooms', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Show the add player modal
   */
  showAddPlayerModal() {
    if (!this.currentRoom) {
      this.showToast('Please select a room first', 'error');
      return;
    }
    
    document.getElementById('add-player-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('player-name').focus();
  },
  
  /**
   * Show the edit player modal
   * @param {Object} player - Player object
   */
  showEditPlayerModal(player) {
    document.getElementById('edit-player-id').value = player.id;
    document.getElementById('edit-player-name').value = player.name;
    document.getElementById('edit-player-nickname').value = player.nickname || '';
    
    document.getElementById('edit-player-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('edit-player-name').focus();
  },
  
  /**
   * Show the import data dialog
   */
  showImportDataDialog() {
    document.getElementById('import-file').click();
  },
  
  /**
   * Close all modals
   */
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
    
    document.getElementById('modal-overlay').classList.add('hidden');
    
    // Reset forms
    document.getElementById('create-room-form').reset();
    document.getElementById('add-player-form').reset();
    document.getElementById('edit-player-form').reset();
  },
  
  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {Function} onConfirm - Function to call on confirm
   */
  showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    
    // Remove existing event listener
    const confirmBtn = document.getElementById('confirm-action');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add new event listener
    newConfirmBtn.addEventListener('click', () => {
      onConfirm();
      this.closeAllModals();
    });
    
    document.getElementById('confirmation-modal').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  
  /**
   * Confirm delete room
   * @param {Object} room - Room object
   */
  confirmDeleteRoom(room) {
    this.showConfirmation(
      'Delete Room',
      `Are you sure you want to delete the room "${room.name}"? This will also delete all players and matches in this room.`,
      async () => {
        try {
          this.showLoading();
          
          await DB.deleteRoom(room.id);
          
          // Update room selector
          const rooms = await DB.getAllRooms();
          this.populateRoomSelector(rooms);
          
          // If the deleted room was the current room, reset the UI
          if (this.currentRoom && this.currentRoom.id === room.id) {
            document.getElementById('room-selector').value = '';
            document.getElementById('welcome-screen').classList.remove('hidden');
            document.getElementById('room-content').classList.add('hidden');
            document.getElementById('current-room-display').classList.add('hidden');
            this.currentRoom = null;
          }
          
          this.showToast('Room deleted successfully', 'success');
          this.hideLoading();
          
          // Close the manage rooms modal
          this.closeAllModals();
        } catch (error) {
          console.error('Error deleting room:', error);
          this.showToast('Error deleting room', 'error');
          this.hideLoading();
        }
      }
    );
  },
  
  /**
   * Confirm delete player
   * @param {Object} player - Player object
   */
  confirmDeletePlayer(player) {
    this.showConfirmation(
      'Delete Player',
      `Are you sure you want to delete the player "${player.name}"?`,
      async () => {
        try {
          this.showLoading();
          
          await DB.deletePlayer(player.id);
          
          // Reload players
          await this.loadPlayers();
          
          // Reload other tabs that might be affected
          await this.loadMatches();
          await this.loadStats();
          
          this.showToast('Player deleted successfully', 'success');
          this.hideLoading();
        } catch (error) {
          console.error('Error deleting player:', error);
          this.showToast('Error deleting player', 'error');
          this.hideLoading();
        }
      }
    );
  },
  
  /**
   * Confirm delete match
   * @param {Object} match - Match object
   */
  confirmDeleteMatch(match) {
    this.showConfirmation(
      'Delete Match',
      'Are you sure you want to delete this match?',
      async () => {
        try {
          this.showLoading();
          
          await DB.deleteMatch(match.id);
          
          // Reload matches
          await this.loadMatches();
          
          // Reload stats
          await this.loadStats();
          
          this.showToast('Match deleted successfully', 'success');
          this.hideLoading();
        } catch (error) {
          console.error('Error deleting match:', error);
          this.showToast('Error deleting match', 'error');
          this.hideLoading();
        }
      }
    );
  },
  
  /**
   * Handle create room form submission
   * @param {Event} event - Submit event
   */
  async handleCreateRoomSubmit(event) {
    event.preventDefault();
    
    const roomName = document.getElementById('room-name').value.trim();
    const roomDescription = document.getElementById('room-description').value.trim();
    
    if (!roomName) {
      this.showToast('Please enter a room name', 'error');
      return;
    }
    
    try {
      this.showLoading();
      
      // Create room
      const room = await DB.createRoom({
        name: roomName,
        description: roomDescription
      });
      
      // Update room selector
      const rooms = await DB.getAllRooms();
      this.populateRoomSelector(rooms);
      
      // Select the new room
      document.getElementById('room-selector').value = room.id;
      this.loadRoom(room.id);
      
      this.showToast('Room created successfully', 'success');
      this.hideLoading();
      
      // Close the modal
      this.closeAllModals();
    } catch (error) {
      console.error('Error creating room:', error);
      this.showToast('Error creating room', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle add player form submission
   * @param {Event} event - Submit event
   */
  async handleAddPlayerSubmit(event) {
    event.preventDefault();
    
    if (!this.currentRoom) {
      this.showToast('Please select a room first', 'error');
      return;
    }
    
    const playerName = document.getElementById('player-name').value.trim();
    const playerNickname = document.getElementById('player-nickname').value.trim();
    
    if (!playerName) {
      this.showToast('Please enter a player name', 'error');
      return;
    }
    
    try {
      this.showLoading();
      
      // Create player
      await DB.createPlayer({
        roomId: this.currentRoom.id,
        name: playerName,
        nickname: playerNickname
      });
      
      // Reload players
      await this.loadPlayers();
      
      this.showToast('Player added successfully', 'success');
      this.hideLoading();
      
      // Close the modal
      this.closeAllModals();
    } catch (error) {
      console.error('Error adding player:', error);
      this.showToast('Error adding player', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle edit player form submission
   * @param {Event} event - Submit event
   */
  async handleEditPlayerSubmit(event) {
    event.preventDefault();
    
    const playerId = document.getElementById('edit-player-id').value;
    const playerName = document.getElementById('edit-player-name').value.trim();
    const playerNickname = document.getElementById('edit-player-nickname').value.trim();
    
    if (!playerId) {
      this.showToast('Invalid player ID', 'error');
      return;
    }
    
    if (!playerName) {
      this.showToast('Please enter a player name', 'error');
      return;
    }
    
    try {
      this.showLoading();
      
      // Update player
      await DB.updatePlayer({
        id: playerId,
        name: playerName,
        nickname: playerNickname
      });
      
      // Reload players
      await this.loadPlayers();
      
      // Reload other tabs that might be affected
      await this.loadMatches();
      await this.loadStats();
      
      this.showToast('Player updated successfully', 'success');
      this.hideLoading();
      
      // Close the modal
      this.closeAllModals();
    } catch (error) {
      console.error('Error updating player:', error);
      this.showToast('Error updating player', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle match form submission
   * @param {Event} event - Submit event
   */
  async handleMatchSubmit(event) {
    event.preventDefault();
    
    if (!this.currentRoom) {
      this.showToast('Please select a room first', 'error');
      return;
    }
    
    const player1Id = document.getElementById('player1').value;
    const player2Id = document.getElementById('player2').value;
    const player1Score = document.getElementById('player1-score').value;
    const player2Score = document.getElementById('player2-score').value;
    const notes = document.getElementById('match-notes').value.trim();
    
    if (!player1Id || !player2Id) {
      this.showToast('Please select both players', 'error');
      return;
    }
    
    if (player1Id === player2Id) {
      this.showToast('Please select different players', 'error');
      return;
    }
    
    if (!player1Score || !player2Score) {
      this.showToast('Please enter scores for both players', 'error');
      return;
    }
    
    try {
      this.showLoading();
      
      // Create match
      await DB.createMatch({
        roomId: this.currentRoom.id,
        player1Id,
        player2Id,
        player1Score,
        player2Score,
        notes
      });
      
      // Reset form
      document.getElementById('new-match-form').reset();
      
      // Reload matches
      await this.loadMatches();
      
      // Reload stats
      await this.loadStats();
      
      this.showToast('Match recorded successfully', 'success');
      this.hideLoading();
    } catch (error) {
      console.error('Error recording match:', error);
      this.showToast('Error recording match', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle export all data
   */
  async handleExportAllData() {
    try {
      this.showLoading();
      
      const data = await DB.exportAllData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ping-pong-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      this.showToast('Data exported successfully', 'success');
      this.hideLoading();
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Error exporting data', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle export room data
   * @param {string} roomId - Room ID
   */
  async handleExportRoomData(roomId) {
    try {
      this.showLoading();
      
      const room = await DB.getRoom(roomId);
      if (!room) {
        this.showToast('Room not found', 'error');
        this.hideLoading();
        return;
      }
      
      const data = await DB.exportRoomData(roomId);
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ping-pong-tracker-room-${room.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      this.showToast('Room data exported successfully', 'success');
      this.hideLoading();
    } catch (error) {
      console.error('Error exporting room data:', error);
      this.showToast('Error exporting room data', 'error');
      this.hideLoading();
    }
  },
  
  /**
   * Handle import data
   * @param {Event} event - Change event
   */
  async handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        this.showLoading();
        
        await DB.importData(data);
        
        // Update room selector
        const rooms = await DB.getAllRooms();
        this.populateRoomSelector(rooms);
        
        // Check if there's a last selected room
        const lastRoomId = await DB.getSetting('lastRoomId');
        if (lastRoomId && rooms.some(room => room.id === lastRoomId)) {
          document.getElementById('room-selector').value = lastRoomId;
          this.loadRoom(lastRoomId);
        } else if (rooms.length > 0) {
          // Select the first room
          document.getElementById('room-selector').value = rooms[0].id;
          this.loadRoom(rooms[0].id);
        }
        
        this.showToast('Data imported successfully', 'success');
        this.hideLoading();
        
        // Close the manage rooms modal if open
        this.closeAllModals();
      } catch (error) {
        console.error('Error importing data:', error);
        this.showToast('Error importing data. Invalid file format.', 'error');
        this.hideLoading();
      }
    };
    
    reader.readAsText(file);
  },
  
  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type ('success', 'error', 'warning', 'info')
   */
  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },
  
  /**
   * Show loading indicator
   */
  showLoading() {
    document.getElementById('loading-indicator').classList.remove('hidden');
  },
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    document.getElementById('loading-indicator').classList.add('hidden');
  }
};
