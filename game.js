// 游戏主要变量
let canvas;
let ctx;
let requestId;
let isGameOver = false;
let isPaused = false;

// 游戏状态
let score = 0;
let level = 1;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000; // 下落间隔时间（毫秒）

// 当前方块和下一个方块
let currentPiece;
let nextPiece;

// 游戏区域大小
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// 游戏面板
const board = Array(ROWS).fill().map(() => Array(COLS).fill(0));

// 方块形状和颜色
const PIECES = [
    [[[1, 1, 1, 1]], '#3498db'],     // I - 蓝色
    [[[1, 1, 1], [0, 1, 0]], '#9b59b6'],     // T - 紫色
    [[[1, 1, 1], [1, 0, 0]], '#e67e22'],     // L - 橙色
    [[[1, 1, 1], [0, 0, 1]], '#2980b9'],     // J - 深蓝色
    [[[1, 1], [1, 1]], '#e74c3c'],     // O - 红色
    [[[1, 1, 0], [0, 1, 1]], '#2ecc71'],     // S - 绿色
    [[[0, 1, 1], [1, 1, 0]], '#f1c40f']      // Z - 黄色
];

// 添加游戏开始时间变量
let gameStartTime = Date.now();
let lines = 0;  // 添加行数统计变量

// 初始化游戏
function initGame() {
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    
    // 设置画布样式
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
    
    // 生成第一个方块和下一个方块
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyPress);
    
    // 添加重新开始按钮事件
    document.getElementById('restartButton').addEventListener('click', restart);
    
    // 添加触屏控制
    initTouchControls();
    
    // 开始游戏循环
    update();
}

// 创建新方块
function createPiece() {
    const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
        shape: piece[0],
        color: piece[1],
        x: Math.floor(COLS / 2) - Math.floor(piece[0][0].length / 2),
        y: 0
    };
}

// 绘制方块
function drawBlock(x, y, color) {
    // 填充方块颜色
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    
    // 绘制网格边框
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
}

// 绘制游戏面板
function drawBoard() {
    // 绘制背景网格
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 0.05;
            ctx.strokeRect(x, y, 1, 1);
        }
    }
    
    // 绘制已放置的方块
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(x, y, value);
            }
        });
    });
}

// 绘制当前方块
function drawPiece(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(x + piece.x, y + piece.y, piece.color);
            }
        });
    });
}

// 检查碰撞
function checkCollision(piece, board) {
    return piece.shape.some((row, dy) => {
        return row.some((value, dx) => {
            let x = piece.x + dx;
            let y = piece.y + dy;
            return (
                value && 
                (x < 0 || x >= COLS || y >= ROWS ||
                (y >= 0 && board[y] && board[y][x]))
            );
        });
    });
}

// 合并方块到面板
function merge(piece, board) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[y + piece.y][x + piece.x] = piece.color;
            }
        });
    });
}

// 清除完整的行
function clearLines() {
    let linesCleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) continue outer;
        }
        
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++;
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;  // 更新总行数
        updateScore(linesCleared);
    }
}

// 更新分数
function updateScore(lines) {
    let points;
    switch(lines) {
        case 1: points = 100; break;
        case 2: points = 300; break;
        case 3: points = 500; break;
        case 4: points = 800; break;
        default: points = 0;
    }
    
    score += points;
    document.getElementById('score').textContent = score;
    
    // 更新等级
    level = Math.floor(score / 1000) + 1;
    document.getElementById('level').textContent = level;
    dropInterval = Math.max(100, 1000 - (level - 1) * 100);
}

// 旋转方块
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[row.length - 1 - i])
    );
    
    const p = {
        ...piece,
        shape: rotated
    };
    
    if (!checkCollision(p, board)) {
        piece.shape = rotated;
    }
}

// 移动方块
function move(dir) {
    currentPiece.x += dir;
    if (checkCollision(currentPiece, board)) {
        currentPiece.x -= dir;
    }
}

// 下落方块
function drop() {
    currentPiece.y++;
    if (checkCollision(currentPiece, board)) {
        currentPiece.y--;
        merge(currentPiece, board);
        clearLines();
        
        if (currentPiece.y <= 0) {
            gameOver();
            return;
        }
        
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
    }
    dropCounter = 0;
}

// 绘制下一个方块预览
function drawNextPiece() {
    const nextPieceCanvas = document.getElementById('nextPiece');
    const nextCtx = nextPieceCanvas.getContext('2d');
    
    // 清除画布
    nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    // 计算方块大小和偏移量，确保方块居中显示
    const blockSize = 20;  // 每个小方块的大小
    const pieceWidth = nextPiece.shape[0].length * blockSize;
    const pieceHeight = nextPiece.shape.length * blockSize;
    const offsetX = (nextPieceCanvas.width - pieceWidth) / 2;
    const offsetY = (nextPieceCanvas.height - pieceHeight) / 2;
    
    // 绘制下一个方块
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                // 绘制方块
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(
                    offsetX + x * blockSize, 
                    offsetY + y * blockSize, 
                    blockSize - 1,  // 减1留出间隙
                    blockSize - 1
                );
                
                // 绘制边框
                nextCtx.strokeStyle = '#34495e';
                nextCtx.strokeRect(
                    offsetX + x * blockSize, 
                    offsetY + y * blockSize, 
                    blockSize - 1, 
                    blockSize - 1
                );
            }
        });
    });
}

// 处理键盘事件
function handleKeyPress(event) {
    if (isGameOver) return;
    
    if (!isPaused) {
        switch(event.key) {
            case 'ArrowLeft':
                move(-1);
                break;
            case 'ArrowRight':
                move(1);
                break;
            case 'ArrowDown':
                drop();
                break;
            case 'ArrowUp':
                rotate(currentPiece);
                break;
        }
    }
    
    if (event.key === ' ') {
        isPaused = !isPaused;
    }
}

// 游戏结束
function gameOver() {
    console.log('游戏结束');
    isGameOver = true;
    cancelAnimationFrame(requestId);
    
    // 计算游戏时长
    const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新游戏结束界面的统计数据
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLines').textContent = lines;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('gameTime').textContent = timeString;
    
    // 显示游戏结束界面
    const overlay = document.querySelector('.game-over-overlay');
    overlay.style.display = 'flex';
    
    // 添加按钮事件监听
    const restartBtn = document.getElementById('gameOverRestartBtn');
    const menuBtn = document.getElementById('gameOverMenuBtn');
    
    // 移除旧的事件监听器（如果有的话）
    restartBtn.replaceWith(restartBtn.cloneNode(true));
    menuBtn.replaceWith(menuBtn.cloneNode(true));
    
    // 添加新的事件监听器
    document.getElementById('gameOverRestartBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        restart();
    });
    
    document.getElementById('gameOverMenuBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        // 可以添加返回菜单的逻辑
    });
}

// 重新开始游戏
function restart() {
    board.forEach(row => row.fill(0));
    score = 0;
    level = 1;
    lines = 0;  // 重置行数
    isGameOver = false;
    isPaused = false;
    dropInterval = 1000;
    gameStartTime = Date.now();  // 重置游戏开始时间
    
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    
    // 隐藏游戏结束界面
    document.querySelector('.game-over-overlay').style.display = 'none';
    
    cancelAnimationFrame(requestId);
    update();
}

// 游戏主循环
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (!isPaused && !isGameOver) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            drop();
        }
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制游戏元素
        drawBoard();  // 这会绘制网格和已放置的方块
        drawPiece(currentPiece);
    }
    
    requestId = requestAnimationFrame(update);
}

// 添加触屏控制初始化函数
function initTouchControls() {
    // 方向按钮控制
    document.getElementById('leftBtn')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        move(-1);
    });
    
    document.getElementById('rightBtn')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        move(1);
    });
    
    document.getElementById('downBtn')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        drop();
    });
    
    document.getElementById('rotateBtn')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        rotate(currentPiece);
    });

    // 添加滑动手势支持
    let touchStartX = 0;
    let touchStartY = 0;
    let lastMoveTime = 0;
    const SWIPE_THRESHOLD = 30;  // 滑动距离阈值
    const SWIPE_TIME_THRESHOLD = 300;  // 滑动时间阈值（毫秒）

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastMoveTime = Date.now();
    });

    document.addEventListener('touchmove', (e) => {
        if (isGameOver || isPaused) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const currentTime = Date.now();
        
        // 如果滑动时间太长，重置起始点
        if (currentTime - lastMoveTime > SWIPE_TIME_THRESHOLD) {
            touchStartX = touchEndX;
            touchStartY = touchEndY;
            lastMoveTime = currentTime;
            return;
        }

        // 水平滑动
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                move(1);  // 右移
            } else {
                move(-1);  // 左移
            }
            touchStartX = touchEndX;
            lastMoveTime = currentTime;
        }
        // 垂直滑动
        else if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY > 0) {
                drop();  // 下落
            } else {
                rotate(currentPiece);  // 上滑旋转
            }
            touchStartY = touchEndY;
            lastMoveTime = currentTime;
        }
    });

    // 防止移动端浏览器的默认行���（如滚动）
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.mobile-controls')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 启动游戏
initGame();
