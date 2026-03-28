// Achievement Definitions 
const achievementDefinitions = {
    // Special Achievements
    special: [
        {
            id: 'speed_win',
            name: 'Lightning Fast',
            description: 'Win in 2 guesses',
            icon: '⚡',
            points: 75,
            type: 'special'
        },
        {
            id: 'comeback_win',
            name: 'Comeback King',
            description: 'Win with only 1 guess left',
            icon: '👑',
            points: 75,
            type: 'special'
        }
    ],
    
    // Win Milestones
    wins: [
        { id: 'wins_1', name: 'Novice Observer', description: 'Win 1 game', icon: '⭐', points: 10, milestone: 1 },
        { id: 'wins_3', name: 'Rising Observer', description: 'Win 3 games', icon: '⭐⭐', points: 20, milestone: 3 },
        { id: 'wins_5', name: 'Skilled Observer', description: 'Win 5 games', icon: '⭐⭐', points: 25, milestone: 5 },
        { id: 'wins_10', name: 'Experienced Observer', description: 'Win 10 games', icon: '⭐⭐⭐', points: 50, milestone: 10 },
        { id: 'wins_25', name: 'Legendary Observer', description: 'Win 25 games', icon: '👑', points: 100, milestone: 25 },
        { id: 'wins_50', name: 'Master Observer', description: 'Win 50 games', icon: '👑👑', points: 150, milestone: 50 },
        { id: 'wins_100', name: 'Mythical Observer', description: 'Win 100 games', icon: '🏆', points: 250, milestone: 100 },
        { id: 'wins_250', name: 'Transcendant Observer', description: 'Win 250 games', icon: '🏆🏆', points: 400, milestone: 250 }
    ],
    
    // Games Played Milestones
    games: [
        { id: 'games_10', name: 'Getting Started', description: 'Play 10 games', icon: '🎮', points: 15, milestone: 10 },
        { id: 'games_20', name: 'Committed Player', description: 'Play 20 games', icon: '🎮🎮', points: 30, milestone: 20 },
        { id: 'games_50', name: 'Dedicated Gamer', description: 'Play 50 games', icon: '🎮🎮🎮', points: 75, milestone: 50 },
        { id: 'games_100', name: 'Obsessed', description: 'Play 100 games', icon: '🎮🎮🎮🎮', points: 150, milestone: 100 },
        { id: 'games_250', name: 'Cant Stop', description: 'Play 250 games', icon: '💪', points: 250, milestone: 250 },
        { id: 'games_500', name: 'True Addict', description: 'Play 500 games', icon: '🌊', points: 400, milestone: 500 }
    ],
    
    // Streak Milestones
    streaks: [
        { id: 'streak_1', name: 'On a Roll', description: 'Win 1 game in a row', icon: '🔥', points: 10, milestone: 1 },
        { id: 'streak_3', name: 'On Fire', description: 'Win 3 games in a row', icon: '🔥', points: 25, milestone: 3 },
        { id: 'streak_5', name: 'Hot Streak', description: 'Win 5 games in a row', icon: '🔥🔥', points: 40, milestone: 5 },
        { id: 'streak_10', name: 'Unbeatable', description: 'Win 10 games in a row', icon: '🔥🔥🔥', points: 100, milestone: 10 },
        { id: 'streak_25', name: 'Unstoppable', description: 'Win 25 games in a row', icon: '⚡', points: 200, milestone: 25 },
        { id: 'streak_50', name: 'Invincible', description: 'Win 50 games in a row', icon: '⚡⚡', points: 350, milestone: 50 }
    ],
    
    // Efficiency Achievements
    efficiency: [
        { id: 'avg_guesses_low', name: 'Sharp Mind', description: 'Average 4 or fewer guesses per win', icon: '🧠', points: 100, type: 'efficiency' },
        { id: 'guess_master', name: 'Guess Master', description: 'Average 3 or fewer guesses per win', icon: '🎯', points: 150, type: 'efficiency' }
    ],
    

    
    // Milestone Achievements
    milestones: [
    ]
};

// Initialize achievements on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAndDisplayAchievements();
});



// Retroactively unlock achievements that players have already earned based on current stats
function retroactivelyUnlockAchievements(profileData, unlockedAchievements) {
    const wins = profileData.wins || 0;
    const gamesPlayed = profileData.gamesPlayed || 0;
    const currentStreak = profileData.currentStreak || 0;
    const totalGuesses = profileData.totalGuesses || 0;
    
    // Check win milestones
    achievementDefinitions.wins.forEach(achievement => {
        if (wins >= achievement.milestone && !unlockedAchievements.includes(achievement.id)) {
            unlockedAchievements.push(achievement.id);
        }
    });
    
    // Check games played milestones
    achievementDefinitions.games.forEach(achievement => {
        if (gamesPlayed >= achievement.milestone && !unlockedAchievements.includes(achievement.id)) {
            unlockedAchievements.push(achievement.id);
        }
    });
    
    // Check streak milestones
    achievementDefinitions.streaks.forEach(achievement => {
        if (currentStreak >= achievement.milestone && !unlockedAchievements.includes(achievement.id)) {
            unlockedAchievements.push(achievement.id);
        }
    });
    
    // Check efficiency achievements
    if (wins > 0) {
        const avgGuesses = totalGuesses / wins;
        if (avgGuesses <= 4 && !unlockedAchievements.includes('avg_guesses_low')) {
            unlockedAchievements.push('avg_guesses_low');
        }
        if (avgGuesses <= 3 && !unlockedAchievements.includes('guess_master')) {
            unlockedAchievements.push('guess_master');
        }
    }
    

    
    // Save the updated list
    localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));
    
    return unlockedAchievements;
}

function loadAndDisplayAchievements() {
    const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
    let unlockedAchievements = JSON.parse(localStorage.getItem("unlockedAchievements") || "[]");
    
    // Remove old XP-based achievement IDs that no longer exist
    const oldAchievementIds = ['100_xp_earned', '500_xp_earned', '1000_xp_earned', '2000_xp_earned'];
    unlockedAchievements = unlockedAchievements.filter(id => !oldAchievementIds.includes(id));
    localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));
    
    // Retroactively unlock achievements for existing players based on current stats
    unlockedAchievements = retroactivelyUnlockAchievements(profileData, unlockedAchievements);
    
    renderAchievements(profileData, unlockedAchievements);
    updateAchievementStats(unlockedAchievements);
}

function renderAchievements(profileData, unlockedAchievements) {
    const container = document.getElementById('achievements-content');
    if (!container) {
        console.warn("renderAchievements: #achievements-content not found in DOM");
        return;
    }
    container.innerHTML = '';

    // Render special achievements
    if (achievementDefinitions.special.length > 0) {
        container.appendChild(createCategorySection('🌟 Special Achievements', 'special', profileData, unlockedAchievements));
    }
    

    
    // Render win milestones
    if (achievementDefinitions.wins.length > 0) {
        container.appendChild(createCategorySection('⭐ Win Milestones', 'wins', profileData, unlockedAchievements));
    }
    
    // Render games played milestones
    if (achievementDefinitions.games.length > 0) {
        container.appendChild(createCategorySection('🎮 Games Played Milestones', 'games', profileData, unlockedAchievements));
    }
    
    // Render streak milestones
    if (achievementDefinitions.streaks.length > 0) {
        container.appendChild(createCategorySection('🔥 Win Streak Milestones', 'streaks', profileData, unlockedAchievements));
    }
    
    // Render efficiency achievements
    if (achievementDefinitions.efficiency.length > 0) {
        container.appendChild(createCategorySection('💡 Efficiency Achievements', 'efficiency', profileData, unlockedAchievements));
    }
    
    // Render milestone achievements
    if (achievementDefinitions.milestones.length > 0) {
        container.appendChild(createCategorySection('🎯 Milestone Achievements', 'milestones', profileData, unlockedAchievements));
    }
}

function createCategorySection(categoryName, categoryKey, profileData, unlockedAchievements) {
    const section = document.createElement('div');
    section.className = 'achievement-category';
    
    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = categoryName;
    section.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'achievements-grid';
    
    achievementDefinitions[categoryKey].forEach(achievement => {
        grid.appendChild(createAchievementCard(achievement, profileData, unlockedAchievements));
    });
    
    section.appendChild(grid);
    return section;
}

function createAchievementCard(achievement, profileData, unlockedAchievements) {
    const card = document.createElement('div');
    card.className = 'achievement-card';
    
    const isUnlocked = unlockedAchievements.includes(achievement.id);
    const claimedAchievements = JSON.parse(localStorage.getItem("claimedAchievements") || "[]");
    const isClaimed = claimedAchievements.includes(achievement.id);
    
    card.classList.add(isUnlocked ? 'unlocked' : 'locked');
    
    const icon = document.createElement('div');
    icon.className = 'achievement-icon';
    icon.textContent = achievement.icon;
    
    const name = document.createElement('div');
    name.className = 'achievement-name';
    name.textContent = achievement.name;
    
    const description = document.createElement('div');
    description.className = 'achievement-description';
    description.textContent = achievement.description;
    
    const pointsDisplay = document.createElement('div');
    pointsDisplay.className = 'achievement-points';
    pointsDisplay.textContent = `+${achievement.points} XP`;
    pointsDisplay.style.cssText = `
        font-size: 0.9em;
        color: #4dd0e1;
        font-weight: 600;
        margin-bottom: 10px;
    `;
    
    const status = document.createElement('div');
    status.className = 'achievement-status';
    
    // Determine progress display
    let progressHTML = '';
    if (isUnlocked) {
        if (isClaimed) {
            status.textContent = '✓ Claimed';
            status.style.cssText = `
                background: rgba(76, 175, 80, 0.3);
                color: #4caf50;
                font-size: 0.85em;
                padding: 8px 12px;
                border-radius: 6px;
                font-weight: 600;
            `;
        } else {
            // Create claim button
            const claimBtn = document.createElement('button');
            claimBtn.textContent = 'Claim Reward';
            claimBtn.style.cssText = `
                background: linear-gradient(135deg, #00b4d8, #4dd0e1);
                color: #000;
                border: none;
                padding: 10px 16px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.85em;
                transition: all 0.3s ease;
                width: 100%;
            `;
            claimBtn.onmouseover = function() {
                this.style.transform = 'scale(1.05)';
                this.style.boxShadow = '0 4px 12px rgba(77, 208, 225, 0.4)';
            };
            claimBtn.onmouseout = function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            };
            claimBtn.onclick = async function(e) {
                e.stopPropagation();
                await claimAchievementReward(achievement.id, achievement.points);
        w        // Reload achievements to update display
                setTimeout(() => loadAndDisplayAchievements(), 300);
            };
            
            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(description);
            card.appendChild(pointsDisplay);
            card.appendChild(claimBtn);
            return card;
        }
    } else if (achievement.milestone) {
        // Show progress for milestone achievements
        let currentProgress = 0;
        if (achievement.id.includes('wins_')) {
            currentProgress = profileData.wins || 0;
        } else if (achievement.id.includes('games_')) {
            currentProgress = profileData.gamesPlayed || 0;
        } else if (achievement.id.includes('streak_')) {
            currentProgress = profileData.currentStreak || 0;
        }
        
        const progress = Math.min((currentProgress / achievement.milestone) * 100, 100);
        status.textContent = `${currentProgress}/${achievement.milestone}`;
        progressHTML = `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>`;
    } else {
        status.textContent = '🔒 Locked';
    }
    
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(description);
    if (isUnlocked) {
        card.appendChild(pointsDisplay);
    }
    card.appendChild(status);
    if (progressHTML) {
        card.innerHTML += progressHTML;
    }
    
    return card;
}

function updateAchievementStats(unlockedAchievements) {
    const totalAchievements = Object.values(achievementDefinitions).flat().length;
    const unlockedCount = unlockedAchievements.length;
    const claimedAchievements = JSON.parse(localStorage.getItem("claimedAchievements") || "[]");
    const claimedPoints = calculateClaimedPoints(claimedAchievements);
    const percentage = Math.round((unlockedCount / totalAchievements) * 100);
    
    const countEl = document.getElementById('achievement-count');
    const pointsEl = document.getElementById('achievement-points');
    const percentageEl = document.getElementById('achievement-percentage');
    
    if (countEl) countEl.textContent = unlockedCount;
    if (pointsEl) pointsEl.textContent = claimedPoints;
    if (percentageEl) percentageEl.textContent = percentage + '%';
}

function calculateClaimedPoints(claimedAchievements) {
    let total = 0;
    const allAchievements = Object.values(achievementDefinitions).flat();
    claimedAchievements.forEach(id => {
        const achievement = allAchievements.find(a => a.id === id);
        if (achievement) {
            total += achievement.points;
        }
    });
    return total;
}

// Function to unlock an achievement
function unlockAchievement(achievementId) {
    const unlockedAchievements = JSON.parse(localStorage.getItem("unlockedAchievements") || "[]");
    
    if (!unlockedAchievements.includes(achievementId)) {
        unlockedAchievements.push(achievementId);
        localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));
        
        // Sync to Firebase to sync achievements across devices
        if (window.syncStatsToFirebase) {
            try {
                window.syncStatsToFirebase().catch(error => 
                    console.error("Error syncing achievements to Firebase:", error)
                );
            } catch (error) {
                console.error("Error calling syncStatsToFirebase:", error);
            }
        }
        
        // Show notification (if on achievements page)
        const allAchievements = Object.values(achievementDefinitions).flat();
        const achievement = allAchievements.find(a => a.id === achievementId);
        if (achievement) {
            showAchievementNotification(achievement);
        }
    }
}

// Function to claim achievement reward and add XP
async function claimAchievementReward(achievementId, points) {
    const claimedAchievements = JSON.parse(localStorage.getItem("claimedAchievements") || "[]");
    
    if (!claimedAchievements.includes(achievementId)) {
        claimedAchievements.push(achievementId);
        localStorage.setItem("claimedAchievements", JSON.stringify(claimedAchievements));
        
        // Add XP to user profile
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profileData.totalXP = (profileData.totalXP || 0) + points;
        
        // Handle special cosmetic rewards from achievement definitions
        const allAchievements = Object.values(achievementDefinitions).flat();
        const achievement = allAchievements.find(a => a.id === achievementId);
        if (achievement && achievement.cosmetic) {
            if (!profileData.earnedCosmetics) {
                profileData.earnedCosmetics = [];
            }
            if (!profileData.earnedCosmetics.some(c => c.name === achievement.cosmetic.name)) {
                profileData.earnedCosmetics.push(achievement.cosmetic);
            }
        }
        
        localStorage.setItem("userProfile", JSON.stringify(profileData));
        
        // Sync to Firebase to prevent duplicate claims on other devices
        if (window.syncStatsToFirebase) {
            try {
                await window.syncStatsToFirebase();
            } catch (error) {
                console.error("Error syncing achievements to Firebase:", error);
            }
        }
        
        // Show claim notification
        showClaimNotification(points);
    }
}

// Notification stack manager
let notificationStack = [];

function getNotificationPosition() {
    const activeNotifications = document.querySelectorAll('[data-notification]').length;
    const notificationHeight = 100; // Approximate height of each notification
    const spacing = 16; // Spacing between notifications
    return 20 + (activeNotifications * (notificationHeight + spacing));
}

// Function to show claim reward notification
function showClaimNotification(points) {
    const notification = document.createElement('div');
    notification.setAttribute('data-notification', 'true');
    
    const topPosition = getNotificationPosition();
    
    notification.style.cssText = `
        position: fixed;
        top: ${topPosition}px;
        right: 20px;
        background: linear-gradient(135deg, #00b4d8, #4dd0e1);
        color: #000;
        padding: 20px 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: 700;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
        transition: top 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">⭐</div>
            <div>
                <div style="font-weight: 700; font-size: 1.1em;">Reward Claimed!</div>
                <div style="font-size: 0.9em;">+${points} XP</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    notificationStack.push(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
            notificationStack = notificationStack.filter(n => n !== notification);
        }, 300);
    }, 4000);
}

// Function to check and unlock achievements after game completion
function checkAchievements(isWin, guessesTaken, wasGameWon) {
    const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
    
    // Check special achievements
    if (isWin && guessesTaken === 2) {
        unlockAchievement('speed_win');
    }
    
    if (isWin && guessesTaken === 11) {
        unlockAchievement('comeback_win');
    }
    

    
    // Check win milestones
    const wins = profileData.wins || 0;
    achievementDefinitions.wins.forEach(achievement => {
        if (wins >= achievement.milestone) {
            unlockAchievement(achievement.id);
        }
    });
    
    // Check games played milestones
    const gamesPlayed = profileData.gamesPlayed || 0;
    achievementDefinitions.games.forEach(achievement => {
        if (gamesPlayed >= achievement.milestone) {
            unlockAchievement(achievement.id);
        }
    });
    
    // Check streak milestones
    const streak = profileData.currentStreak || 0;
    achievementDefinitions.streaks.forEach(achievement => {
        if (streak >= achievement.milestone) {
            unlockAchievement(achievement.id);
        }
    });
    
    // Check efficiency achievements
    if (wins > 0) {
        const totalGuesses = profileData.totalGuesses || 0;
        const avgGuesses = totalGuesses / wins;
        if (avgGuesses <= 4) {
            unlockAchievement('avg_guesses_low');
        }
        if (avgGuesses <= 3) {
            unlockAchievement('guess_master');
        }
    }
    

    
    // Check XP milestone achievements
    const sharkPassLevel = profileData.sharkPassLevel || 0;
    if (sharkPassLevel >= 5) {
        unlockAchievement('level_5_sharkpass');
    }
    if (sharkPassLevel >= 15) {
        unlockAchievement('level_15_sharkpass');
    }
    if (sharkPassLevel >= 30) {
        unlockAchievement('level_30_sharkpass');
    }
    if (sharkPassLevel >= 50) {
        unlockAchievement('level_50_sharkpass');
    }
}

// Show achievement notification
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.setAttribute('data-notification', 'true');
    
    const topPosition = getNotificationPosition();
    
    notification.style.cssText = `
        position: fixed;
        top: ${topPosition}px;
        right: 20px;
        background: linear-gradient(135deg, #4caf50, #45a049);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: 600;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
        transition: top 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">${achievement.icon}</div>
            <div>
                <div style="font-weight: 700; font-size: 1.1em;">Achievement Unlocked!</div>
                <div style="font-size: 0.9em;">${achievement.name}</div>
                <div style="font-size: 0.85em; opacity: 0.9;">+${achievement.points} points</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    notificationStack.push(notification);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
            notificationStack = notificationStack.filter(n => n !== notification);
        }, 300);
    }, 4000);
}

// Expose function for game files
window.checkAchievements = checkAchievements;
window.unlockAchievement = unlockAchievement;
window.claimAchievementReward = claimAchievementReward;
