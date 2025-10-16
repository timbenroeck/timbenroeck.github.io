// Game configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    CELL_SIZE: 20,
    GRID_WIDTH: 40,
    GRID_HEIGHT: 30,
    PLAYER_SPEED: 2,
    GHOST_SPEED: 0.5,
    POWER_UP_DURATION: 10000, // 10 seconds
    DATA_PELLET_SCORE: 10,
    POWER_PELLET_SCORE: 50,
    GHOST_SCORE: 200
};

// Game state
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    level: 1,
    score: 0,
    lives: 3,
    dataCollected: 0,
    totalData: 0,
    powerUpActive: false,
    powerUpType: null,
    powerUpEndTime: 0
};

// Game objects
let player = {
    x: 20,
    y: 15,
    direction: 'right',
    nextDirection: 'right',
    speed: CONFIG.PLAYER_SPEED
};

let ghosts = [];
let dataPellets = [];
let powerPellets = [];
let powerUps = [];

// Canvas and context
let canvas, ctx;

// Input handling
let keys = {};

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    setupEventListeners();
    initializeLevel();
    updateUI();
    
    // Start game loop
    gameLoop();
});

function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        keys[e.key.toLowerCase()] = true;
        
        // Handle direction changes
        if (e.key === 'ArrowUp' || e.key === 'w') {
            player.nextDirection = 'up';
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            player.nextDirection = 'down';
        } else if (e.key === 'ArrowLeft' || e.key === 'a') {
            player.nextDirection = 'left';
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            player.nextDirection = 'right';
        } else if (e.key === ' ') {
            togglePause();
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('keyup', function(e) {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Button controls
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
}

function initializeLevel() {
    // Reset game objects
    ghosts = [];
    dataPellets = [];
    powerPellets = [];
    powerUps = [];
    
    // Create maze layout (simplified)
    createMaze();
    
    // Create player at starting position
    player.x = 20;
    player.y = 15;
    player.direction = 'right';
    player.nextDirection = 'right';
    
    // Create ghosts
    createGhosts();
    
    // Create data pellets
    createDataPellets();
    
    // Create power pellets
    createPowerPellets();
    
    gameState.totalData = dataPellets.length;
    gameState.dataCollected = 0;
}

function createMaze() {
    // Simple maze layout - in a real game, this would be more complex
    // For now, we'll create a basic grid with some walls
}

function createGhosts() {
    const ghostTypes = [
        { icon: 'DB', name: 'Databricks', color: '#ff6b6b' },
        { icon: 'F', name: 'Fabric', color: '#4fc3f7' },
        { icon: 'R', name: 'Redshift', color: '#ff9800' },
        { icon: 'BQ', name: 'BigQuery', color: '#ffeb3b' }
    ];
    
    // Place ghosts far from player starting position (20, 15)
    const ghostPositions = [
        { x: 5, y: 5 },
        { x: 35, y: 5 },
        { x: 5, y: 25 },
        { x: 35, y: 25 }
    ];
    
    ghostTypes.forEach((type, index) => {
        const pos = ghostPositions[index] || { x: 10 + index * 5, y: 10 + index * 3 };
        ghosts.push({
            x: pos.x,
            y: pos.y,
            direction: 'right',
            speed: CONFIG.GHOST_SPEED,
            type: type,
            mode: 'chase', // chase, scatter, frightened
            targetX: player.x,
            targetY: player.y
        });
    });
}

function createDataPellets() {
    // Create data pellets throughout the maze
    for (let x = 1; x < CONFIG.GRID_WIDTH - 1; x++) {
        for (let y = 1; y < CONFIG.GRID_HEIGHT - 1; y++) {
            // Skip player starting area and ghost areas
            if ((x >= 18 && x <= 22 && y >= 13 && y <= 17) ||
                (x >= 3 && x <= 7 && y >= 3 && y <= 7)) {
                continue;
            }
            
            // Random chance to place pellet
            if (Math.random() > 0.3) {
                dataPellets.push({
                    x: x,
                    y: y,
                    collected: false
                });
            }
        }
    }
}

function createPowerPellets() {
    // Create power pellets in corners
    const corners = [
        { x: 2, y: 2 },
        { x: CONFIG.GRID_WIDTH - 3, y: 2 },
        { x: 2, y: CONFIG.GRID_HEIGHT - 3 },
        { x: CONFIG.GRID_WIDTH - 3, y: CONFIG.GRID_HEIGHT - 3 }
    ];
    
    corners.forEach(corner => {
        powerPellets.push({
            x: corner.x,
            y: corner.y,
            collected: false
        });
    });
}

function startGame() {
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    document.getElementById('gameOverlay').style.display = 'none';
}

function restartGame() {
    gameState = {
        running: false,
        paused: false,
        gameOver: false,
        level: 1,
        score: 0,
        lives: 3,
        dataCollected: 0,
        totalData: 0,
        powerUpActive: false,
        powerUpType: null,
        powerUpEndTime: 0
    };
    
    initializeLevel();
    updateUI();
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('overlayTitle').textContent = 'Ready to Collect Data?';
    document.getElementById('overlayMessage').textContent = 'Help Snowflake collect all the data pellets while avoiding the competitor ghosts!';
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('restartBtn').style.display = 'none';
}

function togglePause() {
    if (gameState.running && !gameState.gameOver) {
        gameState.paused = !gameState.paused;
    }
}

function updatePlayer() {
    if (!gameState.running || gameState.paused) return;
    
    // Check if direction change is valid
    if (canMove(player.x, player.y, player.nextDirection)) {
        player.direction = player.nextDirection;
    }
    
    // Move player
    if (canMove(player.x, player.y, player.direction)) {
        switch (player.direction) {
            case 'up':
                player.y -= player.speed / CONFIG.CELL_SIZE;
                break;
            case 'down':
                player.y += player.speed / CONFIG.CELL_SIZE;
                break;
            case 'left':
                player.x -= player.speed / CONFIG.CELL_SIZE;
                break;
            case 'right':
                player.x += player.speed / CONFIG.CELL_SIZE;
                break;
        }
    }
    
    // Wrap around screen
    if (player.x < 0) player.x = CONFIG.GRID_WIDTH - 1;
    if (player.x >= CONFIG.GRID_WIDTH) player.x = 0;
    if (player.y < 0) player.y = CONFIG.GRID_HEIGHT - 1;
    if (player.y >= CONFIG.GRID_HEIGHT) player.y = 0;
    
    // Check for pellet collection
    checkPelletCollection();
    
    // Check for power-up collection
    checkPowerUpCollection();
}

function canMove(x, y, direction) {
    // Simple boundary checking - in a real game, this would check for walls
    let newX = x;
    let newY = y;
    
    switch (direction) {
        case 'up':
            newY -= 0.1;
            break;
        case 'down':
            newY += 0.1;
            break;
        case 'left':
            newX -= 0.1;
            break;
        case 'right':
            newX += 0.1;
            break;
    }
    
    return newX >= 0 && newX < CONFIG.GRID_WIDTH && newY >= 0 && newY < CONFIG.GRID_HEIGHT;
}

function updateGhosts() {
    if (!gameState.running || gameState.paused) return;
    
    ghosts.forEach((ghost, index) => {
        // Add some randomness to ghost movement to make it less predictable
        const randomFactor = Math.random();
        
        // Simple AI - move towards player but with some randomness
        const dx = player.x - ghost.x;
        const dy = player.y - ghost.y;
        
        // Only change direction occasionally to make movement smoother
        if (randomFactor < 0.1) {
            // Choose direction based on distance
            if (Math.abs(dx) > Math.abs(dy)) {
                ghost.direction = dx > 0 ? 'right' : 'left';
            } else {
                ghost.direction = dy > 0 ? 'down' : 'up';
            }
        }
        
        // Move ghost
        if (canMove(ghost.x, ghost.y, ghost.direction)) {
            switch (ghost.direction) {
                case 'up':
                    ghost.y -= ghost.speed / CONFIG.CELL_SIZE;
                    break;
                case 'down':
                    ghost.y += ghost.speed / CONFIG.CELL_SIZE;
                    break;
                case 'left':
                    ghost.x -= ghost.speed / CONFIG.CELL_SIZE;
                    break;
                case 'right':
                    ghost.x += ghost.speed / CONFIG.CELL_SIZE;
                    break;
            }
        } else {
            // If can't move in current direction, try a random direction
            const directions = ['up', 'down', 'left', 'right'];
            ghost.direction = directions[Math.floor(Math.random() * directions.length)];
        }
        
        // Wrap around screen
        if (ghost.x < 0) ghost.x = CONFIG.GRID_WIDTH - 1;
        if (ghost.x >= CONFIG.GRID_WIDTH) ghost.x = 0;
        if (ghost.y < 0) ghost.y = CONFIG.GRID_HEIGHT - 1;
        if (ghost.y >= CONFIG.GRID_HEIGHT) ghost.y = 0;
        
        // Check collision with player
        checkGhostCollision(ghost);
    });
}

function checkPelletCollection() {
    dataPellets.forEach(pellet => {
        if (!pellet.collected) {
            const distance = Math.sqrt(
                Math.pow(player.x - pellet.x, 2) + Math.pow(player.y - pellet.y, 2)
            );
            
            if (distance < 0.5) {
                pellet.collected = true;
                gameState.score += CONFIG.DATA_PELLET_SCORE;
                gameState.dataCollected++;
                updateUI();
                
                // Check if level complete
                if (gameState.dataCollected >= gameState.totalData) {
                    nextLevel();
                }
            }
        }
    });
}

function checkPowerUpCollection() {
    powerPellets.forEach(pellet => {
        if (!pellet.collected) {
            const distance = Math.sqrt(
                Math.pow(player.x - pellet.x, 2) + Math.pow(player.y - pellet.y, 2)
            );
            
            if (distance < 0.5) {
                pellet.collected = true;
                gameState.score += CONFIG.POWER_PELLET_SCORE;
                
                // Activate random power-up
                activatePowerUp();
                updateUI();
            }
        }
    });
}

function activatePowerUp() {
    const powerUpTypes = ['speed', 'shield', 'multiplier'];
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    gameState.powerUpActive = true;
    gameState.powerUpType = randomType;
    gameState.powerUpEndTime = Date.now() + CONFIG.POWER_UP_DURATION;
    
    // Apply power-up effects
    switch (randomType) {
        case 'speed':
            player.speed = CONFIG.PLAYER_SPEED * 1.5;
            break;
        case 'shield':
            // Shield effect handled in collision detection
            break;
        case 'multiplier':
            // Multiplier effect handled in scoring
            break;
    }
}

function checkPowerUpExpiry() {
    if (gameState.powerUpActive && Date.now() > gameState.powerUpEndTime) {
        gameState.powerUpActive = false;
        gameState.powerUpType = null;
        
        // Reset player speed
        player.speed = CONFIG.PLAYER_SPEED;
    }
}

function checkGhostCollision(ghost) {
    const distance = Math.sqrt(
        Math.pow(player.x - ghost.x, 2) + Math.pow(player.y - ghost.y, 2)
    );
    
    // Make collision detection less aggressive
    if (distance < 0.3) {
        if (gameState.powerUpActive && gameState.powerUpType === 'shield') {
            // Shield protects from collision
            return;
        }
        
        // Player hit by ghost
        gameState.lives--;
        updateUI();
        
        if (gameState.lives <= 0) {
            gameOver();
        } else {
            // Reset player position and give brief invincibility
            player.x = 20;
            player.y = 15;
            
            // Add brief invincibility period
            gameState.powerUpActive = true;
            gameState.powerUpType = 'shield';
            gameState.powerUpEndTime = Date.now() + 2000; // 2 seconds of invincibility
        }
    }
}

function nextLevel() {
    gameState.level++;
    gameState.score += 1000; // Level completion bonus
    initializeLevel();
    updateUI();
}

function gameOver() {
    gameState.gameOver = true;
    gameState.running = false;
    
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('overlayTitle').textContent = 'Game Over!';
    document.getElementById('overlayMessage').textContent = `Final Score: ${gameState.score}`;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'inline-block';
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('data-collected').textContent = gameState.dataCollected;
    document.getElementById('total-data').textContent = gameState.totalData;
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Draw grid
    drawGrid();
    
    // Draw data pellets
    drawDataPellets();
    
    // Draw power pellets
    drawPowerPellets();
    
    // Draw power-ups
    drawPowerUps();
    
    // Draw player
    drawPlayer();
    
    // Draw ghosts
    drawGhosts();
    
    // Draw UI elements
    drawUI();
}

function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= CONFIG.GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(x * CONFIG.CELL_SIZE, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CONFIG.CELL_SIZE);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, y * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
}

function drawDataPellets() {
    dataPellets.forEach(pellet => {
        if (!pellet.collected) {
            const x = pellet.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            const y = pellet.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            
            // Create variety in data representation
            const dataType = (pellet.x + pellet.y) % 4;
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#00d4ff';
            
            switch (dataType) {
                case 0:
                    // Binary data
                    ctx.font = '12px monospace';
                    ctx.fillText('1', x, y);
                    break;
                case 1:
                    // Binary data
                    ctx.font = '12px monospace';
                    ctx.fillText('0', x, y);
                    break;
                case 2:
                    // Data symbol
                    ctx.font = '10px Arial';
                    ctx.fillText('📊', x, y);
                    break;
                case 3:
                    // Small data grid
                    ctx.fillStyle = '#00d4ff';
                    for (let i = 0; i < 2; i++) {
                        for (let j = 0; j < 2; j++) {
                            ctx.fillRect(x - 3 + i * 2, y - 3 + j * 2, 1.5, 1.5);
                        }
                    }
                    break;
            }
        }
    });
}

function drawPowerPellets() {
    powerPellets.forEach(pellet => {
        if (!pellet.collected) {
            const x = pellet.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            const y = pellet.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
            
            // Draw as a data grid (3x3 grid of squares)
            ctx.fillStyle = '#ffeb3b';
            const gridSize = 8;
            const cellSize = 2;
            
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.fillRect(
                        x - gridSize/2 + i * cellSize,
                        y - gridSize/2 + j * cellSize,
                        cellSize - 0.5,
                        cellSize - 0.5
                    );
                }
            }
        }
    });
}

function drawPowerUps() {
    if (gameState.powerUpActive) {
        ctx.fillStyle = '#ff9800';
        ctx.font = '16px Orbitron';
        ctx.textAlign = 'center';
        
        let powerUpText = '';
        switch (gameState.powerUpType) {
            case 'speed':
                powerUpText = '🚀 SPEED BOOST';
                break;
            case 'shield':
                powerUpText = '🛡️ SHIELD ACTIVE';
                break;
            case 'multiplier':
                powerUpText = '💎 2X POINTS';
                break;
        }
        
        ctx.fillText(powerUpText, CONFIG.CANVAS_WIDTH / 2, 30);
    }
}

function drawPlayer() {
    const x = player.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    const y = player.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    
    // Draw Snowflake logo
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('❄️', x, y);
    
    // Draw power-up effect
    if (gameState.powerUpActive) {
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

function drawGhosts() {
    ghosts.forEach(ghost => {
        const x = ghost.x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        const y = ghost.y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
        
        // Draw ghost background circle
        ctx.fillStyle = ghost.type.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw ghost icon
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(ghost.type.icon, x, y);
    });
}

function drawUI() {
    // Draw pause indicator
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = '#00d4ff';
        ctx.font = '48px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    }
}

function gameLoop() {
    updatePlayer();
    updateGhosts();
    checkPowerUpExpiry();
    render();
    
    requestAnimationFrame(gameLoop);
}
