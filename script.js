/**
 * Cat vs Dog Runner
 * Core Game Logic
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.lastTime = 0;
        this.speed = 0;
        this.score = 0;
        this.gameSpeed = 5;
        this.isPlaying = false;
        this.isGameOver = false;

        // Entities
        this.player = new Player(this);
        this.obstacles = [];
        this.background = new Background(this);

        // Audio
        this.sound = new SoundManager();

        // Input
        this.input = new InputHandler(this);

        // Setup Resize Listener
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Bind UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.scoreEl = document.getElementById('score');
        this.finalScoreEl = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.startBtn = document.getElementById('start-btn');

        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.startBtn.addEventListener('click', () => this.startGame());
    }

    resize() {
        this.canvas.width = window.innerWidth > 1200 ? 1200 : window.innerWidth;
        this.canvas.height = window.innerHeight > 600 ? 600 : window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.groundLevel = this.height * 0.8; // Ground is at 80% height
    }

    startGame() {
        this.isPlaying = true;
        this.isGameOver = false;
        this.score = 0;
        this.gameSpeed = 5;
        this.obstacles = [];
        this.lastTime = 0;
        this.player.reset();

        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        if (this.sound.ctx.state === 'suspended') {
            this.sound.ctx.resume();
        }

        requestAnimationFrame((ts) => this.loop(ts));
    }

    resetGame() {
        this.startGame();
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.finalScoreEl.innerText = Math.floor(this.score);
        this.gameOverScreen.classList.remove('hidden');
        this.sound.die();
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        this.background.update();
        this.player.update(this.input, deltaTime);

        // Obstacle Handling
        if (this.obstacles.length === 0 ||
            this.obstacles[this.obstacles.length - 1].x < this.width - 400) { // Spawn distance
            // Random chance to spawn
            if (Math.random() < 0.02) {
                this.obstacles.push(new Obstacle(this));
            }
        }

        this.obstacles.forEach((obstacle, index) => {
            obstacle.update();
            if (obstacle.markedForDeletion) this.obstacles.splice(index, 1);

            // Collision Detection
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
            }
        });

        // Score
        const previousScore = Math.floor(this.score);
        this.score += 0.1;
        const currentScore = Math.floor(this.score);

        if (previousScore % 100 !== 0 && currentScore % 100 === 0) {
            this.sound.score();
        }

        this.scoreEl.innerText = currentScore.toString().padStart(5, '0');

        // Speed scaling
        this.gameSpeed += 0.001;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.background.draw(this.ctx);
        this.player.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
    }

    checkCollision(player, obstacle) {
        return (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        );
    }

    loop(timestamp) {
        if (!this.isPlaying) return;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

class InputHandler {
    constructor(game) {
        this.keys = [];
        window.addEventListener('keydown', e => {
            if ((e.code === 'Space' ||
                e.code === 'ArrowUp' ||
                e.code === 'ArrowDown')
                && this.keys.indexOf(e.code) === -1) {
                this.keys.push(e.code);
            }
            // Debug Start
            if (e.code === 'Enter' && !game.isPlaying) game.startGame();
        });

        window.addEventListener('keyup', e => {
            if (e.code === 'Space' ||
                e.code === 'ArrowUp' ||
                e.code === 'ArrowDown') {
                this.keys.splice(this.keys.indexOf(e.code), 1);
            }
        });

        // Touch support
        window.addEventListener('touchstart', () => {
            if (this.keys.indexOf('Space') === -1) this.keys.push('Space');
        });
        window.addEventListener('touchend', () => {
            this.keys.splice(this.keys.indexOf('Space'), 1);
        });
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 50; // Placeholder size
        this.height = 50;
        this.x = 50;
        this.y = this.game.groundLevel - this.height;
        this.vy = 0;
        this.weight = 1;
        this.jumpPower = 15; // Starting simple
        this.color = '#FFA726'; // Orange Cat
    }

    reset() {
        this.y = this.game.groundLevel - this.height;
        this.vy = 0;
    }

    update(input, deltaTime) {
        // Jump
        if ((input.keys.includes('Space') || input.keys.includes('ArrowUp')) && this.onGround()) {
            this.vy -= 20;
            this.game.sound.jump();
        }

        // Horizontal Movement (Optional, usually fixed X)

        // Physics
        this.y += this.vy;
        if (!this.onGround()) {
            this.vy += this.weight;
        } else {
            this.vy = 0;
            this.y = this.game.groundLevel - this.height;
        }

        // Ensure ground clamp
        if (this.y > this.game.groundLevel - this.height) {
            this.y = this.game.groundLevel - this.height;
        }
    }

    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        // Draw Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x + 25, this.y + 45, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Cat Emoji
        // Flip if needed (not easy with text, but okay for side view)
        ctx.fillText('🐱', this.x, this.y);
    }

    onGround() {
        return this.y >= this.game.groundLevel - this.height;
    }
}

class Obstacle {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = this.game.width;
        this.y = this.game.groundLevel - this.height;
        this.markedForDeletion = false;
        // Random dog variety
        this.type = Math.random() < 0.5 ? '🐕' : '🐩';
    }

    update() {
        this.x -= this.game.gameSpeed;
        if (this.x < -this.width) this.markedForDeletion = true;
    }

    draw(ctx) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x + 20, this.y + 40, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '40px Arial';
        ctx.fillText(this.type, this.x, this.y);
    }
}

class Background {
    constructor(game) {
        this.game = game;
        this.clouds = [];
        this.trees = [];
        this.cloudTimer = 0;
        this.treeTimer = 0;
    }

    update() {
        // Generate Clouds
        if (this.cloudTimer > 100 + Math.random() * 200) {
            this.clouds.push({
                x: this.game.width,
                y: Math.random() * (this.game.height / 2),
                size: 30 + Math.random() * 40,
                speed: 0.5 + Math.random() * 0.5
            });
            this.cloudTimer = 0;
        } else {
            this.cloudTimer++;
        }

        // Generate Trees
        if (this.treeTimer > 50 + Math.random() * 100) { // More frequent than clouds
            this.trees.push({
                x: this.game.width,
                y: this.game.groundLevel - 20, // Slightly sunken or on line
                size: 40 + Math.random() * 20,
                type: Math.random() < 0.5 ? '🌲' : '🌳'
            });
            this.treeTimer = 0;
        } else {
            this.treeTimer += (this.game.gameSpeed / 5); // Trees spawn relative to game speed
        }

        // Move objects
        this.clouds.forEach(c => c.x -= c.speed);
        this.trees.forEach(t => t.x -= this.game.gameSpeed); // Trees move with ground

        // Cleanup
        this.clouds = this.clouds.filter(c => c.x > -100);
        this.trees = this.trees.filter(t => t.x > -100);
    }

    draw(ctx) {
        // Draw Clouds
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        this.clouds.forEach(c => {
            ctx.font = `${c.size}px Arial`;
            ctx.fillText('☁️', c.x, c.y);
        });

        // Draw Ground Line
        ctx.fillStyle = '#81C784'; // Green Grass
        ctx.fillRect(0, this.game.groundLevel, this.game.width, this.game.height - this.game.groundLevel);

        // Draw Ground Decor (Trees behind path?)
        // Let's draw trees on the horizon
        this.trees.forEach(t => {
            ctx.font = `${t.size}px Arial`;
            // Draw tree slightly above ground level to look planted
            ctx.fillText(t.type, t.x, t.y - t.size / 2);
        });

        // Grass trim
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, this.game.groundLevel);
        ctx.lineTo(this.game.width, this.game.groundLevel);
        ctx.stroke();
    }
}

// Init Game
window.addEventListener('load', () => {
    const game = new Game();
});

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type, duration) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() {
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.2), 50);
    }

    score() {
        this.playTone(1000, 'square', 0.1);
    }

    die() {
        this.playTone(200, 'sawtooth', 0.5);
        this.playTone(150, 'sawtooth', 0.5); // overlapping descending feel
    }
}

