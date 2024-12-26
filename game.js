window.addEventListener('load', () => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const BLOCK_SIZE = 30;

    /**
     * 俄罗斯方块形状定义
     * @type {Object}
     */
    const SHAPES = {
        I: [
            [1, 1, 1, 1]
        ],
        L: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        J: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        O: [
            [1, 1],
            [1, 1]
        ],
        Z: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        S: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        T: [
            [0, 1, 0],
            [1, 1, 1]
        ]
    };

    /**
     * 方块颜色定义
     * @type {Object}
     */
    const COLORS = {
        I: 'cyan',
        L: 'orange',
        J: 'blue',
        O: 'yellow',
        Z: 'red',
        S: 'green',
        T: 'purple'
    };

    /**
     * 游戏主要配置
     * @type {Object}
     */
    const CONFIG = {
        baseSpeed: 1000,
        speedFactor: 0.8,
        linesPerLevel: 10,
        scorePerLine: [100, 300, 500, 800],
        colors: {
            I: '#00f0f0',  // 青色
            L: '#f0a000',  // 橙色
            J: '#0000f0',  // 蓝色
            O: '#f0f000',  // 黄色
            Z: '#f00000',  // 红色
            S: '#00f000',  // 绿色
            T: '#a000f0'   // 紫色
        },
        animation: {
            lineClear: 300,    // 消行动画持续时间（毫秒）
            dropFlash: 100     // 方块落地闪烁时间（毫秒）
        }
    };

    /**
     * 当前游戏状态
     * @type {Object}
     */
    const gameState = {
        currentPiece: null,
        nextPiece: null,
        position: { x: 0, y: 0 },
        grid: Array(20).fill().map(() => Array(10).fill(0)),
        score: 0,
        level: 1,
        lines: 0,
        gameOver: false,
        isPaused: false,
        highScores: JSON.parse(localStorage.getItem('tetrisHighScores')) || [],
        startTime: null,
        elapsedTime: 0,
        timerInterval: null
    };

    const nextCanvas = document.getElementById('nextPiece');
    const nextContext = nextCanvas.getContext('2d');

    /**
     * 绘制单个方块
     */
    function drawBlock(x, y, color) {
        context.fillStyle = color;
        context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        context.strokeStyle = '#000';
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }

    /**
     * 绘制网格和已固定的方块
     */
    function drawGrid() {
        context.strokeStyle = '#ddd';
        context.lineWidth = 0.5;
        
        // 绘制网格线
        for (let x = 0; x < canvas.width; x += BLOCK_SIZE) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, canvas.height);
            context.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += BLOCK_SIZE) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(canvas.width, y);
            context.stroke();
        }

        // 绘制已固定的方块
        gameState.grid.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    drawBlock(x, y, color);
                }
            });
        });
    }

    /**
     * 绘制当前方块
     */
    function drawCurrentPiece() {
        const piece = gameState.currentPiece;
        if (!piece) return;

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(
                        gameState.position.x + x,
                        gameState.position.y + y,
                        piece.color
                    );
                }
            });
        });
    }

    /**
     * 更新游戏画面
     */
    function update() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawCurrentPiece();
    }

    /**
     * 生成新的方块
     */
    function generateNewPiece() {
        const shapes = Object.keys(SHAPES);
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        
        gameState.currentPiece = gameState.nextPiece || {
            shape: SHAPES[randomShape],
            color: COLORS[randomShape]
        };

        gameState.nextPiece = {
            shape: SHAPES[shapes[Math.floor(Math.random() * shapes.length)]],
            color: COLORS[shapes[Math.floor(Math.random() * shapes.length)]]
        };

        gameState.position = {
            x: Math.floor((10 - gameState.currentPiece.shape[0].length) / 2),
            y: 0
        };

        drawNextPiece();
    }

    /**
     * 绘制下一个方块预览
     */
    function drawNextPiece() {
        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const piece = gameState.nextPiece;
        const blockSize = 30;
        const offsetX = (nextCanvas.width - piece.shape[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - piece.shape.length * blockSize) / 2;

        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextContext.fillStyle = piece.color;
                    nextContext.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize,
                        blockSize
                    );
                    nextContext.strokeStyle = '#000';
                    nextContext.strokeRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize,
                        blockSize
                    );
                }
            });
        });
    }

    /**
     * 检查移动是否有效
     */
    function isValidMove(newX, newY, shape = gameState.currentPiece.shape) {
        return shape.every((row, y) => {
            return row.every((value, x) => {
                if (!value) return true;
                const nextX = newX + x;
                const nextY = newY + y;
                return (
                    nextX >= 0 &&
                    nextX < 10 &&
                    nextY >= 0 &&
                    nextY < 20 &&
                    !gameState.grid[nextY][nextX]
                );
            });
        });
    }

    /**
     * 旋转方块
     */
    function rotateMatrix(matrix) {
        const N = matrix.length;
        const M = matrix[0].length;
        let result = Array(M).fill().map(() => Array(N).fill(0));
        
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < M; j++) {
                result[j][N-1-i] = matrix[i][j];
            }
        }
        return result;
    }

    /**
     * 消行动画效果
     * @param {number[]} lines - 要消除的行号数组
     * @returns {Promise} - 动画完成的Promise
     */
    function animateLineClear(lines) {
        return new Promise(resolve => {
            const originalGrid = gameState.grid.map(row => [...row]);
            let progress = 0;
            const animationStep = 16; // 约60fps

            function animate() {
                progress += animationStep;
                const alpha = Math.cos((progress / CONFIG.animation.lineClear) * Math.PI) * 0.5 + 0.5;

                // 重绘整个游戏区域
                context.clearRect(0, 0, canvas.width, canvas.height);
                drawGrid();
                drawCurrentPiece();

                // 绘制消行动画
                context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                lines.forEach(line => {
                    context.fillRect(0, line * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
                });

                if (progress < CONFIG.animation.lineClear) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            }

            animate();
        });
    }

    /**
     * 方块落地闪烁动画
     * @param {Object} piece - 落地的方块
     * @param {Object} position - 方块位置
     * @returns {Promise} - 动画完成的Promise
     */
    function animateDropFlash(piece, position) {
        return new Promise(resolve => {
            let progress = 0;
            const animationStep = 16;

            function animate() {
                progress += animationStep;
                const alpha = Math.cos((progress / CONFIG.animation.dropFlash) * Math.PI * 2) * 0.5 + 0.5;

                // 绘制闪烁效果
                piece.shape.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value) {
                            const drawX = (position.x + x) * BLOCK_SIZE;
                            const drawY = (position.y + y) * BLOCK_SIZE;
                            context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                            context.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                        }
                    });
                });

                if (progress < CONFIG.animation.dropFlash) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            }

            animate();
        });
    }

    /**
     * 将当前方块固定到网格中
     */
    async function lockPiece() {
        const piece = gameState.currentPiece;
        const position = {...gameState.position};

        // 播放落地动画
        await animateDropFlash(piece, position);

        // 将方块固定到网格中
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const gridY = position.y + y;
                    const gridX = position.x + x;
                    if (gridY >= 0) {
                        gameState.grid[gridY][gridX] = piece.color;
                    }
                }
            });
        });

        await checkLines();
    }

    /**
     * 检查并清除完整的行
     */
    async function checkLines() {
        let linesCleared = [];
        
        // 检查完整行
        for (let y = gameState.grid.length - 1; y >= 0; y--) {
            if (gameState.grid[y].every(cell => cell !== 0)) {
                linesCleared.push(y);
            }
        }

        if (linesCleared.length > 0) {
            // 播放消行动画
            await animateLineClear(linesCleared);

            // 移除完整行
            linesCleared.sort((a, b) => b - a).forEach(line => {
                gameState.grid.splice(line, 1);
                gameState.grid.unshift(Array(10).fill(0));
            });

            // 更新分数
            gameState.score += CONFIG.scorePerLine[linesCleared.length - 1];
            gameState.lines += linesCleared.length;

            // 检查升级
            const newLevel = Math.floor(gameState.lines / CONFIG.linesPerLevel) + 1;
            if (newLevel > gameState.level) {
                gameState.level = newLevel;
                clearInterval(gameLoop.interval);
                gameLoop.interval = setInterval(gameLoop, CONFIG.baseSpeed * Math.pow(CONFIG.speedFactor, gameState.level - 1));
            }

            updateScore();
        }
    }

    /**
     * 更新分数显示
     */
    function updateScore() {
        document.getElementById('score').textContent = gameState.score;
        document.getElementById('level').textContent = gameState.level;
    }

    /**
     * 检查游戏是否结束
     */
    function checkGameOver() {
        if (gameState.grid[0].some(cell => cell !== 0)) {
            gameState.gameOver = true;
            pauseTimer();  // 停止计时器
            updateHighScores();
            alert('游戏结束！');
            return true;
        }
        return false;
    }

    /**
     * 更新高分榜
     */
    function updateHighScores() {
        if (gameState.score > 0) {
            gameState.highScores.push({
                score: gameState.score,
                date: new Date().toLocaleDateString()
            });
            
            // 按分数排序并只保留前5个
            gameState.highScores.sort((a, b) => b.score - a.score);
            gameState.highScores = gameState.highScores.slice(0, 5);
            
            // 保存到本地存储
            localStorage.setItem('tetrisHighScores', JSON.stringify(gameState.highScores));
            
            // 更新显示
            displayHighScores();
        }
    }

    /**
     * 显示高分榜
     */
    function displayHighScores() {
        const highScoresList = document.getElementById('highScores');
        highScoresList.innerHTML = '';
        
        gameState.highScores.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${score.score}分 (${score.date})`;
            highScoresList.appendChild(li);
        });
    }

    /**
     * 重置游戏
     */
    function resetGame() {
        // 保存当前分数到高分榜
        updateHighScores();
        
        // 重置计时器
        resetTimer();
        
        // 重置游戏状态
        gameState.grid = Array(20).fill().map(() => Array(10).fill(0));
        gameState.score = 0;
        gameState.level = 1;
        gameState.lines = 0;
        gameState.gameOver = false;
        gameState.isPaused = false;
        
        // 清除定时器
        clearInterval(gameLoop.interval);
        
        // 生成新方块
        generateNewPiece();
        
        // 更新显示
        update();
        updateScore();
        
        // 重新开始游戏循环和计时器
        gameLoop.interval = setInterval(gameLoop, CONFIG.baseSpeed);
        startTimer();
    }

    /**
     * 更新计时器显示
     */
    function updateTimer() {
        if (!gameState.startTime || gameState.isPaused || gameState.gameOver) return;
        
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - gameState.startTime) / 1000) + gameState.elapsedTime;
        
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 开始计时器
     */
    function startTimer() {
        gameState.startTime = Date.now();
        gameState.timerInterval = setInterval(updateTimer, 1000);
    }

    /**
     * 暂停计时器
     */
    function pauseTimer() {
        if (gameState.startTime) {
            clearInterval(gameState.timerInterval);
            gameState.elapsedTime += Math.floor((Date.now() - gameState.startTime) / 1000);
            gameState.startTime = null;
        }
    }

    /**
     * 重置计时器
     */
    function resetTimer() {
        clearInterval(gameState.timerInterval);
        gameState.startTime = null;
        gameState.elapsedTime = 0;
        document.getElementById('timer').textContent = '00:00';
    }

    // 键盘控制
    document.addEventListener('keydown', (event) => {
        if (!gameState.currentPiece || gameState.gameOver || gameState.isPaused) return;

        let newX = gameState.position.x;
        let newY = gameState.position.y;
        let newShape = gameState.currentPiece.shape;

        switch (event.key) {
            case 'ArrowLeft':
                newX--;
                break;
            case 'ArrowRight':
                newX++;
                break;
            case 'ArrowDown':
                newY++;
                break;
            case 'ArrowUp':
                newShape = rotateMatrix(newShape);
                break;
            case ' ':
                gameState.isPaused = !gameState.isPaused;
                if (gameState.isPaused) {
                    pauseTimer();
                    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = 'white';
                    context.font = '30px Arial';
                    context.fillText('已暂停', canvas.width/2 - 45, canvas.height/2);
                } else {
                    gameState.startTime = Date.now();
                    startTimer();
                    update();
                }
                return;
        }

        if (isValidMove(newX, newY, newShape)) {
            gameState.position.x = newX;
            gameState.position.y = newY;
            if (event.key === 'ArrowUp') {
                gameState.currentPiece.shape = newShape;
            }
            update();
        }
    });

    function gameLoop() {
        if (gameState.gameOver || gameState.isPaused) return;
        
        if (gameState.currentPiece) {
            const newY = gameState.position.y + 1;
            if (isValidMove(gameState.position.x, newY)) {
                gameState.position.y = newY;
                update();
            } else {
                (async () => {
                    await lockPiece();
                    if (!checkGameOver()) {
                        generateNewPiece();
                        update();
                    }
                })();
            }
        }
    }

    // 初始化游戏
    generateNewPiece();
    update();
    updateScore();
    gameLoop.interval = setInterval(gameLoop, CONFIG.baseSpeed);
    startTimer();

    // 添加重新开始按钮事件监听
    document.getElementById('restartButton').addEventListener('click', resetGame);

    // 在初始化时显示高分榜
    displayHighScores();

    // 在初始化代码后添加触摸控制
    function initTouchControls() {
        // 防止双击缩放
        document.addEventListener('touchstart', function(e) {
            if(e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // 阻止默认滚动行为
        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });

        // 添加触控按钮事件
        const buttons = {
            'leftBtn': { key: 'ArrowLeft' },
            'rightBtn': { key: 'ArrowRight' },
            'downBtn': { key: 'ArrowDown' },
            'rotateBtn': { key: 'ArrowUp' },
            'pauseBtn': { key: ' ' }
        };

        Object.entries(buttons).forEach(([btnId, keyInfo]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                ['touchstart', 'mousedown'].forEach(eventType => {
                    btn.addEventListener(eventType, (e) => {
                        e.preventDefault();
                        const event = new KeyboardEvent('keydown', {
                            key: keyInfo.key
                        });
                        document.dispatchEvent(event);
                    });
                });
            }
        });
    }

    // 在游戏初始化时调用
    initTouchControls();
});
