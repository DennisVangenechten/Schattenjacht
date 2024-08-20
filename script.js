class GameBoard {
    constructor(size, numTreasures, numWalls) {
        this.size = size;
        this.numTreasures = numTreasures;
        this.numWalls = numWalls;
        this.boardElement = document.getElementById('game-board');
        this.cells = [];
        this.hunter = null;
        this.enemies = [];
        this.treasures = [];
        this.walls = [];
    }

    init() {
        this.boardElement.innerHTML = '';
        this.cells = [];
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell', 'grass');
                cell.dataset.x = x;
                cell.dataset.y = y;
                this.boardElement.appendChild(cell);
                row.push(cell);
            }
            this.cells.push(row);
        }
        this.placeWalls();
        this.placeTreasures();
    }

    placeWalls() {
        this.walls = [];
        while (this.walls.length < this.numWalls) {
            const wall = { x: Math.floor(Math.random() * this.size), y: Math.floor(Math.random() * this.size) };
            if (!this.walls.some(w => w.x === wall.x && w.y === wall.y) && !this.isOccupied(wall.x, wall.y)) {
                this.walls.push(wall);
                this.getCell(wall.x, wall.y).classList.add('wall');
            }
        }
    }

    placeTreasures() {
        this.treasures = [];
        while (this.treasures.length < this.numTreasures) {
            const treasure = { x: Math.floor(Math.random() * this.size), y: Math.floor(Math.random() * this.size), value: 100 };
            if (!this.treasures.some(t => t.x === treasure.x && t.y === treasure.y) && !this.isOccupied(treasure.x, treasure.y)) {
                this.treasures.push(treasure);
                this.getCell(treasure.x, treasure.y).classList.add('treasure');
            }
        }
    }

    getCell(x, y) {
        return this.cells[y][x];
    }

    isOccupied(x, y) {
        return this.walls.some(w => w.x === x && w.y === y) || (this.hunter && this.hunter.isAt(x, y)) || this.enemies.some(e => e.isAt(x, y));
    }

    updateBoard() {
        this.cells.flat().forEach(cell => {
            cell.classList.remove('hunter', 'enemy', 'treasure');
        });
        if (this.hunter) this.getCell(this.hunter.x, this.hunter.y).classList.add('hunter');
        this.enemies.forEach(enemy => {
            if (enemy) this.getCell(enemy.x, enemy.y).classList.add('enemy');
        });
        this.treasures.forEach(t => this.getCell(t.x, t.y).classList.add('treasure'));
    }
}

class Hunter {
    constructor(x, y, lives) {
        this.x = x;
        this.y = y;
        this.lives = lives;
        this.score = 0;
    }

    move(dx, dy, board) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        if (newX >= 0 && newX < board.size && newY >= 0 && newY < board.size && !board.walls.some(w => w.x === newX && w.y === newY)) {
            this.x = newX;
            this.y = newY;
            this.checkTreasure(board);
            this.checkEnemy(board);
        }
    }

    checkTreasure(board) {
        const treasureIndex = board.treasures.findIndex(t => t.x === this.x && t.y === this.y);
        if (treasureIndex >= 0) {
            this.score += board.treasures[treasureIndex].value;
            board.treasures.splice(treasureIndex, 1);
            if (board.treasures.length === 0) {
                alert('Je hebt gewonnen!');
                resetGame(board);
            }
            // Increase the number of enemies on normal and hard difficulties
            if (currentDifficulty === 'normal') {
                doubleEnemies(board);
            } else if (currentDifficulty === 'hard') {
                tripleEnemies(board);
            }
        }
    }

    checkEnemy(board) {
        if (board.enemies.some(e => e.isAt(this.x, this.y))) {
            this.lives -= 1;
            updateLives();
            if (this.lives === 0) {
                alert('Je hebt verloren!');
                resetGame(board);
            }
        }
    }

    isAt(x, y) {
        return this.x === x && this.y === y;
    }
}

class Enemy {
    constructor(x, y, movementType) {
        this.x = x;
        this.y = y;
        this.movementType = movementType;
        this.patrolIndex = 0;
    }

    move(board) {
        if (this.movementType === 'random') {
            this.moveRandom(board);
        } else if (this.movementType === 'towards') {
            this.moveTowards(board.hunter, board);
        } else if (this.movementType === 'patrol') {
            this.patrol(board);
        }
        board.hunter.checkEnemy(board);
    }

    moveRandom(board) {
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        const newX = this.x + randomDirection.dx;
        const newY = this.y + randomDirection.dy;
        if (newX >= 0 && newX < board.size && newY >= 0 && newY < board.size && !board.walls.some(w => w.x === newX && w.y === newY)) {
            this.x = newX;
            this.y = newY;
        }
    }

    moveTowards(hunter, board) {
        const path = this.findPath(board, this.x, this.y, hunter.x, hunter.y);
        if (path.length > 1) {
            const nextStep = path[1];
            this.x = nextStep[0];
            this.y = nextStep[1];
        }
    }

    patrol(board) {
        const path = this.findPath(board, this.x, this.y, board.hunter.x, board.hunter.y);
        if (path.length > 1) {
            this.patrolIndex = (this.patrolIndex + 1) % path.length;
            const nextStep = path[this.patrolIndex];
            this.x = nextStep[0];
            this.y = nextStep[1];
        }
    }

    findPath(board, startX, startY, goalX, goalY) {
        const queue = [[startX, startY]];
        const cameFrom = {};
        cameFrom[`${startX},${startY}`] = null;

        while (queue.length > 0) {
            const [currentX, currentY] = queue.shift();
            if (currentX === goalX && currentY === goalY) {
                break;
            }

            const neighbors = [
                [currentX + 1, currentY],
                [currentX - 1, currentY],
                [currentX, currentY + 1],
                [currentX, currentY - 1]
            ];

            for (const [nextX, nextY] of neighbors) {
                if (
                    nextX >= 0 && nextX < board.size &&
                    nextY >= 0 && nextY < board.size &&
                    !board.walls.some(w => w.x === nextX && w.y === nextY) &&
                    !cameFrom.hasOwnProperty(`${nextX},${nextY}`)
                ) {
                    queue.push([nextX, nextY]);
                    cameFrom[`${nextX},${nextY}`] = [currentX, currentY];
                }
            }
        }

        const path = [];
        let current = [goalX, goalY];
        while (current) {
            path.push(current);
            current = cameFrom[`${current[0]},${current[1]}`];
        }
        path.reverse();
        return path;
    }

    isAt(x, y) {
        return this.x === x && this.y === y;
    }
}

let currentDifficulty = 'easy';
const gameBoard = new GameBoard(15, 3, 10);
const hunter = new Hunter(0, 0, 3);
gameBoard.hunter = hunter;

function addEnemy(board, x, y) {
    const corners = [
        { x: 0, y: 0 },
        { x: board.size - 1, y: 0 },
        { x: 0, y: board.size - 1 },
        { x: board.size - 1, y: board.size - 1 }
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const enemy = new Enemy(corner.x, corner.y, currentDifficulty === 'easy' ? 'random' : currentDifficulty === 'normal' ? 'towards' : 'patrol');
    board.enemies.push(enemy);
}

function doubleEnemies(board) {
    const currentEnemies = [...board.enemies];
    currentEnemies.forEach(enemy => {
        addEnemy(board, enemy.x, enemy.y);
    });
    console.log('Enemies doubled:', board.enemies.length); // Debug log
}

function tripleEnemies(board) {
    const currentEnemies = [...board.enemies];
    currentEnemies.forEach(enemy => {
        addEnemy(board, enemy.x, enemy.y);
        addEnemy(board, enemy.x, enemy.y);
    });
    console.log('Enemies tripled:', board.enemies.length); // Debug log
}

function updateLives() {
    const livesElement = document.getElementById('lives');
    livesElement.innerHTML = '❤️'.repeat(hunter.lives);
}

function resetGame(board) {
    hunter.x = 0;
    hunter.y = 0;
    hunter.lives = 3;
    hunter.score = 0;
    board.enemies = [];
    addEnemy(board);
    if (currentDifficulty !== 'easy') {
        addEnemy(board);
    }
    board.init();
    board.updateBoard();
    updateLives();
}

// Event listeners for controls
document.getElementById('up').addEventListener('click', () => {
    hunter.move(0, -1, gameBoard);
    gameBoard.updateBoard();
});

document.getElementById('down').addEventListener('click', () => {
    hunter.move(0, 1, gameBoard);
    gameBoard.updateBoard();
});

document.getElementById('left').addEventListener('click', () => {
    hunter.move(-1, 0, gameBoard);
    gameBoard.updateBoard();
});

document.getElementById('right').addEventListener('click', () => {
    hunter.move(1, 0, gameBoard);
    gameBoard.updateBoard();
});

// Event listener for arrow keys
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
        hunter.move(0, -1, gameBoard);
    } else if (event.key === 'ArrowDown') {
        hunter.move(0, 1, gameBoard);
    } else if (event.key === 'ArrowLeft') {
        hunter.move(-1, 0, gameBoard);
    } else if (event.key === 'ArrowRight') {
        hunter.move(1, 0, gameBoard);
    }
    gameBoard.updateBoard();
});

// Event listener for new game button
document.getElementById('new-game').addEventListener('click', () => {
    resetGame(gameBoard);
});

// Event listeners for difficulty buttons
document.getElementById('easy').addEventListener('click', () => {
    currentDifficulty = 'easy';
    gameBoard.numTreasures = 3;
    gameBoard.numWalls = 10;
    resetGame(gameBoard);
});

document.getElementById('normal').addEventListener('click', () => {
    currentDifficulty = 'normal';
    gameBoard.numTreasures = 4;
    gameBoard.numWalls = 14;
    resetGame(gameBoard);
});

document.getElementById('hard').addEventListener('click', () => {
    currentDifficulty = 'hard';
    gameBoard.numTreasures = 5;
    gameBoard.numWalls = 16;
    resetGame(gameBoard);
});

gameBoard.init();
resetGame(gameBoard);
setInterval(() => {
    gameBoard.enemies.forEach(enemy => enemy.move(gameBoard));
    gameBoard.updateBoard();
}, 1000); // Move enemy every second
