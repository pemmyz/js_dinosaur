const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverContainer = document.getElementById('game-over-container');

// --- Game Constants ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 250;
const GROUND_Y = GAME_HEIGHT - 30;

// Player constants
const DINO_WIDTH = 40;
const DINO_HEIGHT = 60;
const DINO_CROUCH_WIDTH = 60;
const DINO_CROUCH_HEIGHT = 30;
const DINO_JUMP_POWER = 12;
const GRAVITY = 0.6;
const JUMP_CUTOFF_VELOCITY = -4; // Velocity when jump key is released early

// Game speed
const INITIAL_GAME_SPEED = 5;
const GAME_SPEED_INCREMENT = 0.001;
const IDLE_TIMEOUT_DURATION = 5000; // 5 seconds

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// --- Game State ---
let player, gameSpeed, score, highScore, obstacles, clouds, frameCount;
let gameState = 'waiting'; // 'waiting', 'countingDown', 'playing', 'demo', 'gameOver'
let demoTimeout, countdownInterval, countdownValue;

// --- Player (Dino) Object ---
class Player {
    constructor(x, y, w, h, crouchW, crouchH) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.crouchW = crouchW;
        this.crouchH = crouchH;
        
        this.velocityY = 0;
        this.isJumping = false;
        this.isCrouching = false;
        this.legToggle = true; // For running animation
    }

    draw() {
        ctx.fillStyle = '#535353';
        const hitbox = this.getHitbox();

        if (this.isCrouching) {
            // Crouched Body
            ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
            // Crouched Head
            ctx.fillRect(hitbox.x + hitbox.w - 15, hitbox.y + 5, 20, 15);
        } else {
            // Standing Body
            ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h - 10);
            // Standing Head
            ctx.fillRect(hitbox.x + hitbox.w * 0.7, hitbox.y - 10, hitbox.w * 0.6, hitbox.w * 0.4);
            // Arm
            ctx.fillRect(hitbox.x + hitbox.w * 0.6, hitbox.y + 20, 10, 5);
            // Legs
            if (this.isJumping) {
                ctx.fillRect(hitbox.x + 10, hitbox.y + hitbox.h - 10, 8, 10);
                ctx.fillRect(hitbox.x + hitbox.w - 20, hitbox.y + hitbox.h - 10, 8, 10);
            } else {
                if (this.legToggle) {
                    ctx.fillRect(hitbox.x + 5, hitbox.y + hitbox.h - 10, 8, 10);
                } else {
                    ctx.fillRect(hitbox.x + hitbox.w - 15, hitbox.y + hitbox.h - 10, 8, 10);
                }
            }
        }
    }

    update() {
        if (!this.isJumping && !this.isCrouching && frameCount % 10 === 0) {
            this.legToggle = !this.legToggle;
        }

        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        // Ground check
        const groundPos = GROUND_Y - (this.isCrouching ? this.crouchH : this.h);
        if (this.y > groundPos) {
            this.y = groundPos;
            this.velocityY = 0;
            this.isJumping = false;
        }
        
        this.draw();
    }

    jump() {
        if (!this.isJumping && !this.isCrouching) {
            this.isJumping = true;
            this.velocityY = -DINO_JUMP_POWER;
        }
    }

    cutJump() {
        if (this.velocityY < 0) {
            this.velocityY = Math.max(this.velocityY, JUMP_CUTOFF_VELOCITY);
        }
    }

    crouch() {
        if (!this.isJumping) {
            this.isCrouching = true;
        }
    }

    stopCrouch() {
        this.isCrouching = false;
    }
    
    getHitbox() {
        if (this.isCrouching) {
            return { x: this.x, y: this.y, w: this.crouchW, h: this.crouchH };
        }
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// --- Obstacle Classes ---
class Obstacle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    update() {
        this.x -= gameSpeed;
        this.draw();
    }
    
    getHitbox() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

class Cactus extends Obstacle {
    constructor(x, y, type) {
        const sizes = {
            'small': { w: 20, h: 40 },
            'large': { w: 30, h: 60 },
            'group': { w: 60, h: 40 }
        };
        super(x, y - sizes[type].h, sizes[type].w, sizes[type].h);
        this.type = type;
    }

    draw() {
        ctx.fillStyle = '#535353';
        if (this.type === 'small') {
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillRect(this.x + 5, this.y - 10, 10, 10);
        } else if (this.type === 'large') {
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillRect(this.x + 10, this.y - 20, 10, 20);
        } else if (this.type === 'group') {
            ctx.fillRect(this.x, this.y, 20, 40);
            ctx.fillRect(this.x + 25, this.y - 15, 25, 55);
            ctx.fillRect(this.x + 55, this.y, 20, 40);
        }
    }
}

class Pterodactyl extends Obstacle {
    constructor(x, y) {
        super(x, y, 50, 30);
        this.wingToggle = true;
    }

    draw() {
        ctx.fillStyle = '#535353';
        ctx.fillRect(this.x, this.y + 10, this.w, 10);
        ctx.fillRect(this.x + this.w, this.y + 5, 15, 10);
        if (this.wingToggle) {
            ctx.fillRect(this.x + 10, this.y, 30, 10);
        } else {
            ctx.fillRect(this.x + 10, this.y + 20, 30, 10);
        }
    }

    update() {
        if (frameCount % 15 === 0) {
            this.wingToggle = !this.wingToggle;
        }
        super.update();
    }
}

class Stone extends Obstacle {
    constructor(x, y) {
        super(x, y - 20, 20, 20);
    }
    
    draw() {
        ctx.fillStyle = '#535353';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Cloud {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }

    draw() {
        ctx.fillStyle = 'rgba(83, 83, 83, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size, this.y - 5, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 2, this.y, this.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x -= gameSpeed * 0.5; // Parallax effect
        this.draw();
    }
}

// --- Bot AI ---
function findNextObstacle() {
    return obstacles.find(obs => obs.x + obs.w > player.x);
}

// --- !! REPLACED FUNCTION !! ---
function updateBot() {
    const nextObstacle = findNextObstacle();

    if (!nextObstacle) {
        if (player.isCrouching) player.stopCrouch();
        return;
    }

    // --- 1. Decision Making: Analyze the obstacle and decide the best action ---

    let mustCrouch = false;
    let shouldJump = false; // Simplified from high/low to just "jump"
    let reactionDistance;

    if (nextObstacle instanceof Pterodactyl) {
        // It's a low Pterodactyl that requires crouching
        if (nextObstacle.y >= GROUND_Y - 80) {
            mustCrouch = true;
            reactionDistance = gameSpeed * 20 + (nextObstacle.w / 2);
        }
        // High Pterodactyls are ignored, no action needed.
    } else if (nextObstacle instanceof Cactus && (nextObstacle.type === 'large' || nextObstacle.type === 'group')) {
        // BIG OBSTACLE: Plan to jump LATE
        shouldJump = true;
        // Jump later (closer to the obstacle) for large ones.
        reactionDistance = gameSpeed * 18.5 + (nextObstacle.w / 2);
    } else if (nextObstacle instanceof Cactus || nextObstacle instanceof Stone) {
        // SMALL OBSTACLE (Small Cactus or Stone): Plan to jump EARLIER
        shouldJump = true;
        // Jump a bit earlier for smaller obstacles to be safe.
        reactionDistance = gameSpeed * 21 + (nextObstacle.w / 2);
    }

    // --- 2. State Correction: Ensure the bot isn't stuck in the wrong state ---
    if (player.isCrouching && !mustCrouch) {
        player.stopCrouch();
    }

    // --- 3. Action Execution: Perform the decided action if close enough ---
    const distance = nextObstacle.x - player.x;

    if (reactionDistance && distance <= reactionDistance && distance > 0) {
        if (mustCrouch) {
            player.crouch();
        } else if (shouldJump) {
            // ALWAYS perform a full jump to guarantee clearance.
            // We are no longer calling player.cutJump() for the bot.
            player.jump();
        }
    }
}


// --- Game Flow & Drawing ---
function drawInitialScreen() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    player.draw();
    ctx.fillStyle = '#535353';
    ctx.font = '20px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press UP or Tap to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
}

function drawCountdown() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    player.draw();
    obstacles.forEach(obs => obs.draw());
    clouds.forEach(c => c.draw());
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = '40px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Demo starting in ${countdownValue}...`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

function resetGame() {
    player = new Player(50, GROUND_Y - DINO_HEIGHT, DINO_WIDTH, DINO_HEIGHT, DINO_CROUCH_WIDTH, DINO_CROUCH_HEIGHT);
    gameSpeed = INITIAL_GAME_SPEED;
    score = 0;
    highScore = localStorage.getItem('dinoHighScore') || 0;
    scoreEl.textContent = 0;
    highScoreEl.textContent = highScore;
    obstacles = [];
    clouds = [];
    frameCount = 0;
    for(let i = 0; i < 3; i++) spawnCloud();
    gameOverContainer.classList.add('hidden');
}

function init() {
    resetGame();
    gameState = 'waiting';
    drawInitialScreen();
    clearTimeout(demoTimeout);
    demoTimeout = setTimeout(() => {
        gameState = 'countingDown';
        countdownValue = 5;
        drawCountdown();
        countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                startGame('demo');
            } else {
                drawCountdown();
            }
        }, 1000);
    }, IDLE_TIMEOUT_DURATION);
}

function startGame(mode) {
    clearTimeout(demoTimeout);
    clearInterval(countdownInterval);
    if (gameState === 'playing' || gameState === 'demo') return;
    
    resetGame(); // Reset score and obstacles when starting
    gameState = mode;
}

function runGameFrame() {
    frameCount++;
    gameSpeed += GAME_SPEED_INCREMENT;
    score++;
    scoreEl.textContent = Math.floor(score / 10);
    
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    cloudSpawnTimer--;
    if (cloudSpawnTimer <= 0) {
        spawnCloud();
        cloudSpawnTimer = getRandomInt(200, 400);
    }
    clouds = clouds.filter(c => c.x + c.size * 3 > 0);
    clouds.forEach(cloud => cloud.update());
    
    player.update();
    
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
        obstacleSpawnTimer = getRandomInt(60, 140) / (gameSpeed / INITIAL_GAME_SPEED);
    }
    obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
    obstacles.forEach(obs => {
        obs.update();
        if (checkCollision(player.getHitbox(), obs.getHitbox())) {
            gameState = 'gameOver';
        }
    });
}

function update() {
    requestAnimationFrame(update);
    switch (gameState) {
        case 'playing':
            runGameFrame();
            break;
        case 'demo':
            updateBot();
            runGameFrame();
            break;
        case 'gameOver':
            showGameOver();
            break;
    }
}

// --- Spawning Logic ---
let obstacleSpawnTimer = 0;
let cloudSpawnTimer = 0;

function spawnObstacle() {
    const type = Math.random();
    if (type < 0.2 && obstacles.length === 0) { 
        spawnStoneFormation();
        obstacleSpawnTimer = getRandomInt(100, 180) / (gameSpeed / INITIAL_GAME_SPEED);
    } else if (type < 0.7) { 
        const cactusType = ['small', 'large', 'group'][getRandomInt(0, 2)];
        obstacles.push(new Cactus(GAME_WIDTH, GROUND_Y, cactusType));
    } else {
        const pteroY = Math.random() < 0.5 ? GROUND_Y - 70 : GROUND_Y - 100;
        obstacles.push(new Pterodactyl(GAME_WIDTH, pteroY));
    }
}

function spawnStoneFormation() {
    const stoneCount = getRandomInt(2, 4);
    const spacing = getRandomInt(100, 150);
    for (let i = 0; i < stoneCount; i++) {
        obstacles.push(new Stone(GAME_WIDTH + i * spacing, GROUND_Y));
    }
}

function spawnCloud() {
    clouds.push(new Cloud(GAME_WIDTH + 50, getRandomInt(30, 100), getRandomInt(15, 30)));
}

// --- Utility & Event Listeners ---
function checkCollision(box1, box2) {
    return (
        box1.x < box2.x + box2.w &&
        box1.x + box1.w > box2.x &&
        box1.y < box2.y + box2.h &&
        box1.y + box1.h > box2.y
    );
}

let gameOverRendered = false;
function showGameOver() {
    if (gameOverRendered) return;
    const finalScore = Math.floor(score / 10);
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    gameOverContainer.classList.remove('hidden');
    gameOverRendered = true;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function handleStartInput(isJump) {
    if (gameState === 'waiting' || gameState === 'countingDown') {
        startGame('playing');
        if (isJump) player.jump();
    } else if (gameState === 'gameOver') {
        init();
        gameOverRendered = false;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleStartInput(true);
        if (gameState === 'playing') player.jump();
    } else if (e.code === 'ArrowDown' && gameState === 'playing') {
        player.crouch();
    }
});

document.addEventListener('keyup', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === 'playing') {
        player.cutJump();
    } else if (e.code === 'ArrowDown' && gameState === 'playing') {
        player.stopCrouch();
    }
});

canvas.addEventListener('mousedown', () => {
    handleStartInput(true);
    if (gameState === 'playing') player.jump();
});

canvas.addEventListener('mouseup', () => {
    if (gameState === 'playing') player.cutJump();
});

// --- Start ---
init();
update();
