// Game State
let gameState = {
    snowflakeHealth: 100,
    databricksHealth: 100,
    snowflakePower: 0,
    databricksPower: 0,
    gameOver: false,
    autoPlay: false,
    autoPlayInterval: null
};

// Battle messages for different advantages
const battleMessages = {
    performance: [
        "⚡ Snowflake executes queries 10x faster than Databricks!",
        "🚀 Snowflake's columnar storage delivers lightning-fast performance!",
        "💨 Databricks struggles to keep up with Snowflake's speed!"
    ],
    cost: [
        "💰 Snowflake's pay-per-use model saves you money!",
        "💸 Databricks charges for idle compute - what a waste!",
        "📊 Snowflake's cost optimization features are unmatched!"
    ],
    scalability: [
        "📈 Snowflake scales automatically without manual intervention!",
        "🔄 Databricks requires complex cluster management!",
        "⚖️ Snowflake's elastic scaling adapts to your workload!"
    ],
    security: [
        "🔒 Snowflake's enterprise-grade security is bank-tested!",
        "🛡️ Databricks security requires additional configuration!",
        "🔐 Snowflake's zero-trust architecture protects your data!"
    ],
    ease: [
        "🎯 Snowflake requires zero infrastructure management!",
        "🔧 Databricks needs constant maintenance and tuning!",
        "✨ Snowflake's simplicity makes data warehousing effortless!"
    ],
    "data-sharing": [
        "🤝 Snowflake's data sharing eliminates data copying!",
        "📤 Databricks requires complex data movement processes!",
        "🌐 Snowflake's global data sharing network is revolutionary!"
    ]
};

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    setupEventListeners();
});

function initializeGame() {
    updateHealthBars();
    updatePowerDisplay();
    addLogMessage("🎮 Battle begins! Snowflake is ready to showcase its superiority!");
}

function setupEventListeners() {
    // Action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!gameState.gameOver) {
                const power = parseInt(this.dataset.power);
                const advantage = this.dataset.advantage;
                performAttack(power, advantage);
            }
        });
    });

    // Control buttons
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('auto-play-btn').addEventListener('click', toggleAutoPlay);
}

function performAttack(power, advantage) {
    if (gameState.gameOver) return;

    // Add power to Snowflake
    gameState.snowflakePower += power;
    
    // Calculate damage to Databricks (Snowflake's power vs Databricks' health)
    const damage = Math.min(power + Math.floor(Math.random() * 10), gameState.databricksHealth);
    gameState.databricksHealth -= damage;
    
    // Databricks counter-attack (weaker)
    const counterDamage = Math.min(Math.floor(Math.random() * 8) + 2, gameState.snowflakeHealth);
    gameState.snowflakeHealth -= counterDamage;
    gameState.databricksPower += counterDamage;

    // Update UI
    updateHealthBars();
    updatePowerDisplay();
    
    // Add battle animations
    animateAttack('snowflake-char');
    setTimeout(() => animateDamage('databricks-char'), 200);
    
    // Add battle messages
    const messages = battleMessages[advantage];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    addLogMessage(randomMessage);
    
    // Check for game over
    checkGameOver();
}

function updateHealthBars() {
    const snowflakeHealthBar = document.getElementById('snowflake-health');
    const databricksHealthBar = document.getElementById('databricks-health');
    const snowflakeHealthText = document.getElementById('snowflake-health-text');
    const databricksHealthText = document.getElementById('databricks-health-text');

    snowflakeHealthBar.style.width = gameState.snowflakeHealth + '%';
    databricksHealthBar.style.width = gameState.databricksHealth + '%';
    snowflakeHealthText.textContent = gameState.snowflakeHealth;
    databricksHealthText.textContent = gameState.databricksHealth;
}

function updatePowerDisplay() {
    document.getElementById('snowflake-power').textContent = gameState.snowflakePower;
    document.getElementById('databricks-power').textContent = gameState.databricksPower;
}

function animateAttack(characterClass) {
    const character = document.querySelector('.' + characterClass);
    character.classList.add('attacking');
    setTimeout(() => {
        character.classList.remove('attacking');
    }, 500);
}

function animateDamage(characterClass) {
    const character = document.querySelector('.' + characterClass);
    character.classList.add('taking-damage');
    setTimeout(() => {
        character.classList.remove('taking-damage');
    }, 500);
}

function addLogMessage(message) {
    const logContent = document.getElementById('log-content');
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    logContent.appendChild(messageElement);
    logContent.scrollTop = logContent.scrollHeight;
}

function checkGameOver() {
    if (gameState.snowflakeHealth <= 0) {
        gameState.gameOver = true;
        addLogMessage("💀 Databricks has defeated Snowflake! This shouldn't happen in real life!");
        addLogMessage("🔄 Click 'Reset Battle' to try again!");
        document.querySelector('.snowflake-char').classList.add('defeat');
        document.querySelector('.databricks-char').classList.add('victory');
        disableActionButtons();
    } else if (gameState.databricksHealth <= 0) {
        gameState.gameOver = true;
        addLogMessage("🏆 SNOWFLAKE WINS! As expected, Snowflake dominates the data warehouse battle!");
        addLogMessage("🎉 Snowflake's superior architecture, performance, and ease of use prove victorious!");
        addLogMessage("🔄 Click 'Reset Battle' to play again!");
        document.querySelector('.snowflake-char').classList.add('victory');
        document.querySelector('.databricks-char').classList.add('defeat');
        disableActionButtons();
    }
}

function disableActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.disabled = true;
    });
}

function enableActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.disabled = false;
    });
}

function resetGame() {
    // Reset game state
    gameState = {
        snowflakeHealth: 100,
        databricksHealth: 100,
        snowflakePower: 0,
        databricksPower: 0,
        gameOver: false,
        autoPlay: false,
        autoPlayInterval: null
    };

    // Clear auto-play if active
    if (gameState.autoPlayInterval) {
        clearInterval(gameState.autoPlayInterval);
        gameState.autoPlayInterval = null;
    }

    // Update UI
    updateHealthBars();
    updatePowerDisplay();
    enableActionButtons();
    
    // Clear battle log
    const logContent = document.getElementById('log-content');
    logContent.innerHTML = '<p>🎮 Battle begins! Snowflake is ready to showcase its superiority!</p>';
    
    // Remove victory/defeat animations
    document.querySelector('.snowflake-char').classList.remove('victory', 'defeat');
    document.querySelector('.databricks-char').classList.remove('victory', 'defeat');
    
    // Update auto-play button
    const autoPlayBtn = document.getElementById('auto-play-btn');
    autoPlayBtn.textContent = '🤖 Auto Play';
    autoPlayBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
}

function toggleAutoPlay() {
    const autoPlayBtn = document.getElementById('auto-play-btn');
    
    if (gameState.autoPlay) {
        // Stop auto-play
        clearInterval(gameState.autoPlayInterval);
        gameState.autoPlay = false;
        gameState.autoPlayInterval = null;
        autoPlayBtn.textContent = '🤖 Auto Play';
        autoPlayBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        addLogMessage("⏹️ Auto-play stopped!");
    } else {
        // Start auto-play
        gameState.autoPlay = true;
        autoPlayBtn.textContent = '⏹️ Stop Auto Play';
        autoPlayBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ff4757)';
        addLogMessage("🤖 Auto-play started! Watch Snowflake dominate!");
        
        gameState.autoPlayInterval = setInterval(() => {
            if (!gameState.gameOver) {
                const actionButtons = document.querySelectorAll('.action-btn:not([disabled])');
                if (actionButtons.length > 0) {
                    const randomButton = actionButtons[Math.floor(Math.random() * actionButtons.length)];
                    randomButton.click();
                }
            } else {
                clearInterval(gameState.autoPlayInterval);
                gameState.autoPlay = false;
                gameState.autoPlayInterval = null;
            }
        }, 2000); // Auto-attack every 2 seconds
    }
}

// Add some fun sound effects (visual feedback)
function createFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'fixed';
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    floatingText.style.color = '#00d4ff';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.fontSize = '1.2rem';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.zIndex = '1000';
    floatingText.style.animation = 'floatUp 2s ease-out forwards';
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => {
        document.body.removeChild(floatingText);
    }, 2000);
}

// Add CSS for floating text animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translateY(0);
        }
        100% {
            opacity: 0;
            transform: translateY(-50px);
        }
    }
`;
document.head.appendChild(style);

// Enhanced attack function with floating text
const originalPerformAttack = performAttack;
performAttack = function(power, advantage) {
    originalPerformAttack(power, advantage);
    
    // Add floating damage text
    const databricksChar = document.querySelector('.databricks-char');
    const rect = databricksChar.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    createFloatingText(`-${power}`, x, y);
};
