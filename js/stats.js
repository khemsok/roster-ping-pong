/**
 * Statistics calculations for Ping Pong Match Tracker
 * Provides additional statistics and visualization helpers
 */

const Stats = {
  /**
   * Calculate player statistics
   * @param {Object} player - Player object
   * @param {Array} matches - Array of matches
   * @returns {Object} - Player statistics
   */
  calculatePlayerStats(player, matches) {
    // Filter matches for this player
    const playerMatches = matches.filter(match => 
      match.player1Id === player.id || match.player2Id === player.id
    );
    
    // Calculate wins and losses
    const wins = playerMatches.filter(match => match.winnerId === player.id).length;
    const losses = playerMatches.length - wins;
    const winPercentage = playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0;
    
    // Calculate current streak
    let currentStreak = 0;
    let isWinningStreak = false;
    
    if (playerMatches.length > 0) {
      // Sort matches by date (newest first)
      const sortedMatches = [...playerMatches].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      isWinningStreak = sortedMatches[0].winnerId === player.id;
      currentStreak = 1;
      
      for (let i = 1; i < sortedMatches.length; i++) {
        const match = sortedMatches[i];
        const isWin = match.winnerId === player.id;
        
        if (isWin === isWinningStreak) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate average score
    let totalScoreFor = 0;
    let totalScoreAgainst = 0;
    
    playerMatches.forEach(match => {
      if (match.player1Id === player.id) {
        totalScoreFor += match.player1Score;
        totalScoreAgainst += match.player2Score;
      } else {
        totalScoreFor += match.player2Score;
        totalScoreAgainst += match.player1Score;
      }
    });
    
    const avgScoreFor = playerMatches.length > 0 ? Math.round((totalScoreFor / playerMatches.length) * 10) / 10 : 0;
    const avgScoreAgainst = playerMatches.length > 0 ? Math.round((totalScoreAgainst / playerMatches.length) * 10) / 10 : 0;
    
    // Calculate win/loss ratio
    const winLossRatio = losses > 0 ? Math.round((wins / losses) * 100) / 100 : wins > 0 ? Infinity : 0;
    
    return {
      matches: playerMatches.length,
      wins,
      losses,
      winPercentage,
      currentStreak,
      isWinningStreak,
      avgScoreFor,
      avgScoreAgainst,
      winLossRatio
    };
  },
  
  /**
   * Calculate room statistics
   * @param {Array} players - Array of players
   * @param {Array} matches - Array of matches
   * @returns {Object} - Room statistics
   */
  calculateRoomStats(players, matches) {
    // Calculate total matches
    const totalMatches = matches.length;
    
    // Calculate average score per match
    let totalScore = 0;
    matches.forEach(match => {
      totalScore += match.player1Score + match.player2Score;
    });
    const avgScorePerMatch = totalMatches > 0 ? Math.round((totalScore / totalMatches) * 10) / 10 : 0;
    
    // Calculate matches per day
    const matchesByDay = {};
    matches.forEach(match => {
      const date = new Date(match.date);
      const day = date.toLocaleDateString();
      
      if (!matchesByDay[day]) {
        matchesByDay[day] = 0;
      }
      
      matchesByDay[day]++;
    });
    
    const uniqueDays = Object.keys(matchesByDay).length;
    const avgMatchesPerDay = uniqueDays > 0 ? Math.round((totalMatches / uniqueDays) * 10) / 10 : 0;
    
    // Calculate most active player
    const playerMatchCounts = {};
    players.forEach(player => {
      playerMatchCounts[player.id] = matches.filter(match => 
        match.player1Id === player.id || match.player2Id === player.id
      ).length;
    });
    
    let mostActivePlayerId = null;
    let mostActivePlayerMatches = 0;
    
    Object.entries(playerMatchCounts).forEach(([playerId, count]) => {
      if (count > mostActivePlayerMatches) {
        mostActivePlayerId = playerId;
        mostActivePlayerMatches = count;
      }
    });
    
    const mostActivePlayer = mostActivePlayerId ? players.find(player => player.id === mostActivePlayerId) : null;
    
    // Calculate most winning player
    const playerWinCounts = {};
    players.forEach(player => {
      playerWinCounts[player.id] = matches.filter(match => match.winnerId === player.id).length;
    });
    
    let mostWinningPlayerId = null;
    let mostWinningPlayerWins = 0;
    
    Object.entries(playerWinCounts).forEach(([playerId, count]) => {
      if (count > mostWinningPlayerWins) {
        mostWinningPlayerId = playerId;
        mostWinningPlayerWins = count;
      }
    });
    
    const mostWinningPlayer = mostWinningPlayerId ? players.find(player => player.id === mostWinningPlayerId) : null;
    
    return {
      totalMatches,
      avgScorePerMatch,
      avgMatchesPerDay,
      mostActivePlayer: mostActivePlayer ? {
        name: mostActivePlayer.name,
        matches: mostActivePlayerMatches
      } : null,
      mostWinningPlayer: mostWinningPlayer ? {
        name: mostWinningPlayer.name,
        wins: mostWinningPlayerWins
      } : null
    };
  },
  
  /**
   * Calculate head-to-head statistics between two players
   * @param {Object} player1 - First player
   * @param {Object} player2 - Second player
   * @param {Array} matches - Array of matches
   * @returns {Object} - Head-to-head statistics
   */
  calculateHeadToHead(player1, player2, matches) {
    // Filter matches between these two players
    const headToHeadMatches = matches.filter(match => 
      (match.player1Id === player1.id && match.player2Id === player2.id) ||
      (match.player1Id === player2.id && match.player2Id === player1.id)
    );
    
    // Calculate wins for each player
    const player1Wins = headToHeadMatches.filter(match => match.winnerId === player1.id).length;
    const player2Wins = headToHeadMatches.filter(match => match.winnerId === player2.id).length;
    
    // Calculate average scores
    let player1TotalScore = 0;
    let player2TotalScore = 0;
    
    headToHeadMatches.forEach(match => {
      if (match.player1Id === player1.id) {
        player1TotalScore += match.player1Score;
        player2TotalScore += match.player2Score;
      } else {
        player1TotalScore += match.player2Score;
        player2TotalScore += match.player1Score;
      }
    });
    
    const player1AvgScore = headToHeadMatches.length > 0 ? Math.round((player1TotalScore / headToHeadMatches.length) * 10) / 10 : 0;
    const player2AvgScore = headToHeadMatches.length > 0 ? Math.round((player2TotalScore / headToHeadMatches.length) * 10) / 10 : 0;
    
    // Calculate current streak
    let currentStreak = 0;
    let streakHolder = null;
    
    if (headToHeadMatches.length > 0) {
      // Sort matches by date (newest first)
      const sortedMatches = [...headToHeadMatches].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      streakHolder = sortedMatches[0].winnerId === player1.id ? player1 : player2;
      currentStreak = 1;
      
      for (let i = 1; i < sortedMatches.length; i++) {
        const match = sortedMatches[i];
        const currentWinner = match.winnerId === player1.id ? player1 : player2;
        
        if (currentWinner.id === streakHolder.id) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return {
      totalMatches: headToHeadMatches.length,
      player1Wins,
      player2Wins,
      player1AvgScore,
      player2AvgScore,
      currentStreak,
      streakHolder: streakHolder ? {
        id: streakHolder.id,
        name: streakHolder.name
      } : null
    };
  },
  
  /**
   * Generate data for win distribution chart
   * @param {Array} players - Array of players
   * @param {Array} matches - Array of matches
   * @returns {Array} - Chart data
   */
  generateWinDistributionData(players, matches) {
    return players.map(player => {
      const stats = this.calculatePlayerStats(player, matches);
      return {
        id: player.id,
        name: player.name,
        wins: stats.wins,
        winPercentage: stats.winPercentage
      };
    }).sort((a, b) => b.wins - a.wins);
  },
  
  /**
   * Generate data for match activity chart
   * @param {Array} matches - Array of matches
   * @param {number} limit - Maximum number of days to include
   * @returns {Array} - Chart data
   */
  generateMatchActivityData(matches, limit = 10) {
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
    
    // Limit to the specified number of days
    return activityData.slice(-limit);
  },
  
  /**
   * Generate leaderboard data
   * @param {Array} players - Array of players
   * @param {Array} matches - Array of matches
   * @returns {Array} - Leaderboard data
   */
  generateLeaderboardData(players, matches) {
    return players.map(player => {
      const stats = this.calculatePlayerStats(player, matches);
      return {
        id: player.id,
        name: player.name,
        matches: stats.matches,
        wins: stats.wins,
        losses: stats.losses,
        winPercentage: stats.winPercentage,
        currentStreak: stats.currentStreak,
        isWinningStreak: stats.isWinningStreak
      };
    }).sort((a, b) => {
      // Sort by win percentage first
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      // If win percentages are equal, sort by number of wins
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      // If wins are equal, sort by number of matches (fewer matches is better)
      return a.matches - b.matches;
    });
  }
};
