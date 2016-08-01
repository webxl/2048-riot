'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

if (typeof Object.assign != 'function') {
  Object.assign = function (target) {
    'use strict';

    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}

function Game(_opts) {
  var _this = this;

  var DEFAULT_SIZE = 4;
  var DEFAULT_GOAL = 2048;
  var DEFAULT_NEW_BLOCK_COUNT = 1;

  var opts = Object.assign({
    size: DEFAULT_SIZE,
    goal: DEFAULT_GOAL,
    newBlockCount: DEFAULT_NEW_BLOCK_COUNT
  }, _opts);

  this.boardUndoStack = [];
  this.boardRedoStack = [];

  this.getStartBlocks = function (blocks, boardSize) {
    var loc = [Math.floor(boardSize * Math.random()), Math.floor(boardSize * Math.random())];
    if (!blocks.some(function (b) {
      return b[0] == loc[0] && b[1] == loc[1];
    })) {
      blocks.push(loc);
      return blocks;
    } else {
      return _this.getStartBlocks(blocks, boardSize);
    }
  };

  this.gameStatus = function () {
    return _this.status;
  };

  this.getNewBlocks = function (matrix, count, newBlocks) {
    if (0 == count--) return newBlocks;
    var boardSize = matrix.length,
        available = [];
    var newMatrix = cloneMatrix(matrix);
    for (var i = 0; i < boardSize; i++) {
      for (var j = 0; j < boardSize; j++) {
        if (!matrix[i][j].val) available.push({ y: i, x: j });
      }
    }

    if (!available.length) return newBlocks;

    var c = available[Math.floor(available.length * Math.random())];
    newBlocks.push(c);
    newMatrix[c.y][c.x].val = 2;
    return _this.getNewBlocks(newMatrix, count, newBlocks);
  };

  this.maybeGetBlock = function (blocks, x, y) {
    var val = blocks.some(function (b) {
      return b[0] == x && b[1] == y;
    }) ? 2 : 0;
    return { val: val, combined: false, startY: y, startX: x, moved: 0 };
  };

  this.newGame = function () {
    _this.status = 'active';
    _this.boardSize = opts.size;
    var gameBlocks = _this.getStartBlocks([], _this.boardSize);
    gameBlocks = _this.getStartBlocks(gameBlocks, _this.boardSize);
    _this.rows = [];
    for (var i = 0; i < _this.boardSize; i++) {
      var row = [];
      for (var j = 0; j < _this.boardSize; j++) {
        row.push(_this.maybeGetBlock(gameBlocks, i, j));
      }
      _this.rows.push(row);
    }
  };

  this.combineValuesUp = function (matrix, secondPass) {
    var size = matrix.length,
        combined = cloneMatrix(matrix);

    for (var x = 0; x < size; x++) {
      var size_r = size;
      for (var y = 0; y < size_r - 1; y++) {
        var curBlock = combined[y][x],
            nextBlock = combined[y + 1][x];

        if (curBlock.val === 0) {
          var y1 = void 0;
          for (y1 = y; y1 < size_r - 1; y1++) {
            combined[y1][x] = Object.assign({}, combined[y1 + 1][x]);
          }
          combined[y1][x].val = 0;
          y--;size_r--;
        } else {
          if (curBlock.val === nextBlock.val && !curBlock.combined && !nextBlock.combined) {
            var _y = void 0;
            combined[y][x] = Object.assign({}, nextBlock, { combined: { y: curBlock.startY, x: curBlock.startX }, val: curBlock.val * 2 });
            nextBlock.val = 0;
            for (_y = y + 1; _y < size_r - 1; _y++) {
              combined[_y][x] = Object.assign({}, combined[_y + 1][x]);
            }
            combined[_y][x].val = 0;
            y--;size_r--;
          }
        }
      }
    }

    if (!secondPass) {
      return _this.combineValuesUp(combined, true);
    }
    return combined;
  };

  this.getBlockMovements = function (direction) {
    var size = _this.rows.length,
        blocks = [];

    var preview = _this.moveBlocks(direction);

    for (var y = 0; y < size; y++) {
      blocks.push(new Array(size));
      for (var x = 0; x < size; x++) {
        blocks[y][x] = 0;
      }
    }
    for (var _y2 = 0; _y2 < size; _y2++) {
      for (var _x = 0; _x < size; _x++) {
        //  let block = this.rows[y][x];
        var newBlock = preview[_y2][_x];

        var dx = 0,
            dy = 0;

        switch (direction) {
          case 'up':
          case 'down':
            dy = _y2 - newBlock.startY;break;
          case 'left':
          case 'right':
            dx = _x - newBlock.startX;break;
        }
        //console.log(y,x,dy,dx,n,block,newBlock)

        if ((dy || dx) && newBlock.val) blocks[newBlock.startY][newBlock.startX] = { dy: dy, dx: dx };

        if (newBlock.combined) {
          var _dx = 0,
              _dy = 0;
          switch (direction) {
            case 'up':
            case 'down':
              _dy = _y2 - newBlock.combined.y;break;
            case 'left':
            case 'right':
              _dx = _x - newBlock.combined.x;break;
          }
          //console.log(y,x,dy,dx,newBlock.combined)

          if ((_dy || _dx) && newBlock.val) blocks[newBlock.combined.y][newBlock.combined.x] = { dy: _dy, dx: _dx, removed: true };
          blocks[_y2][_x] = Object.assign({ combined: true }, blocks[_y2][_x]);
        }
      }
    }

    return blocks;
  };

  this.processMove = function (direction) {

    var size = _this.rows.length,
        moves = [];

    if (_this.status != 'active') return;

    function possibleMoves(matrix, x, y) {
      var nbs = [[-1, 0, 'up'], [0, -1, 'left'], [0, 1, 'right'], [1, 0, 'down']],
          moves = [];
      for (var j = 0; j < nbs.length; j++) {
        var y1 = y + nbs[j][0],
            x1 = x + nbs[j][1];
        if (x1 >= 0 && y1 >= 0 && x1 < size && y1 < size) {
          if (matrix[y1][x1].val == matrix[y][x].val || !matrix[y1][x1].val) moves.push(nbs[j][2]);
        }
      }
      return moves;
    }

    _this.transformMatrix(direction, function (transformedMatrix) {
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          moves.push(possibleMoves(transformedMatrix, x, y));
        }
      }
      return transformedMatrix;
    });

    if (!moves.some(function (b) {
      return b.length != 0;
    })) _this.status = 'loss';

    if (!moves.some(function (b) {
      return b.some(function (m) {
        return m == "up";
      });
    })) // not `== direction` because of rotation
      return;

    _this.boardUndoStack.push(_this.rows);
    _this.boardRedoStack = [];

    _this.rows = updateProps(_this.moveBlocks(direction));

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (_this.rows[y][x].val >= opts.goal) {
          _this.status = 'win';break;
        }
      }
    }

    if (_this.status == 'active') {
      var newMatrix = cloneMatrix(_this.rows);

      _this.newBlocks = _this.getNewBlocks(_this.rows, opts.newBlockCount, []);
      _this.newBlocks.forEach(function (c) {
        return Object.assign(newMatrix[c.y][c.x], { val: 2, isNew: true });
      });
      _this.rows = newMatrix;
    }
  };

  this.moveBlocks = function (direction) {
    return _this.transformMatrix(direction, _this.combineValuesUp);
  };

  this.undo = function () {
    if (_this.boardUndoStack.length) {
      _this.status = 'active';
      var redo = _this.rows;
      _this.rows = _this.boardUndoStack.pop();
      _this.boardRedoStack.push(redo);
    }
  };

  this.redo = function () {
    if (_this.boardRedoStack.length) {
      var undo = _this.rows;
      _this.rows = _this.boardRedoStack.pop();
      _this.boardUndoStack.push(undo);
    }
  };

  // matrix helpers

  this.transpose = function (matrix) {
    var size = matrix.length,
        trans = new Array(size);
    for (var y = 0; y < size; y++) {
      trans[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        trans[y][x] = Object.assign({}, matrix[x][y]);
      }
    }
    return trans;
  };

  this.reverseEachRow = function (matrix) {

    var size = matrix.length,
        reversed = new Array(size);
    for (var y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[y][size - x - 1]);
      }
    }
    return reversed;
  };

  this.reverseEachColumn = function (matrix) {

    var size = matrix.length,
        reversed = new Array(size);
    for (var y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[size - y - 1][x]);
      }
      //reversed[y] = Object.assign({}, matrix[size - y - 1]);
    }
    return reversed;
  };

  this.printMatrix = function (matrix) {
    var size = matrix.length;
    console.log('----');
    for (var y = 0; y < size; y++) {
      var row = '';
      for (var x = 0; x < size; x++) {
        row += matrix[y][x].val + ' ';
      }
      console.log(row);
    }
    console.log('----');
  };

  this.rotate = function (direction, matrix) {
    switch (direction) {
      case 'left':
        return _this.reverseEachColumn(_this.transpose(matrix));
      case 'right':
        return _this.reverseEachRow(_this.transpose(matrix));
      default:
        break;
    }
    return matrix;
  };

  this.flip = function (matrix) {
    return _this.reverseEachRow(_this.reverseEachColumn(cloneMatrix(matrix)));
  };

  this.transformMatrix = function (direction, callback) {
    switch (direction) {
      case 'left':
        return _this.rotate('left', callback(_this.rotate('right', _this.rows)));
        break;
      case 'right':
        return _this.rotate('right', callback(_this.rotate('left', _this.rows)));
        break;
      case 'up':
        return callback(_this.rows);
        break;
      case 'down':
        return _this.flip(callback(_this.flip(_this.rows)));
        break;
      default:
        return;break;
    }
  };

  this.addProps = function (matrix) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = { val: matrix[y][x], combined: false, startY: y, startX: x, moved: 0 };
      }
    }
    return newMatrix;
  };

  this.removeProps = function (matrix) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = matrix[y][x].val;
      }
    }
    return newMatrix;
  };

  function updateProps(matrix) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = { val: matrix[y][x].val, combined: false, startY: y, startX: x, moved: 0, isNew: false };
      }
    }
    return newMatrix;
  }

  function cloneMatrix(matrix) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        if (_typeof(matrix[y][x]) == 'object') newMatrix[y][x] = Object.assign({}, matrix[y][x]);
        //else
        //newMatrix[y][x] = matrix[y][x];
      }
    }
    return newMatrix;
  }
}
'use strict';

riot.tag2('app', '<button type="button" name="button" id="newGame" onclick="{newGame}">New Game</button> Game status: <input onkeydown="{handleKeyDown}" onkeypress="{handleKeyPress}" onclick="{updateGame}" id="input" name="test" value="{game.status}" readonly> <board name="board" game="{game}"></board> <button id="undo" onclick="{undoClick}">Undo</button> <button id="redo" onclick="{redoClick}">Redo</button>', '', 'onclick="{setFocus}"', function (opts) {
  var _this = this;

  this.game = new Game({ goal: 8 });
  this.game.newGame();

  this.on('mount', function () {
    setTimeout(_this.setFocus, 300);

    var mc = new Hammer.Manager(_this.board);
    var pan = new Hammer.Pan();
    var swipe = new Hammer.Swipe();

    mc.add(swipe);

    mc.on('swipe', function (e) {
      var dir;
      switch (e.direction) {
        case Hammer.DIRECTION_LEFT:
          dir = 'left';break;
        case Hammer.DIRECTION_RIGHT:
          dir = 'right';break;
        case Hammer.DIRECTION_UP:
          dir = 'up';break;
        case Hammer.DIRECTION_DOWN:
          dir = 'down';break;
      }
      _this.sendMove(dir);
    });

    mc.on("panstart panmove", function (ev) {
      var START_X = 0,
          START_Y = 0;
      var p = {
        x: START_X + ev.deltaX,
        y: START_Y + ev.deltaY
      };
    });
  });

  this.handleKeyDown = function (e) {

    e.preventUpdate = true;
    var keys = {
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down'
    };
    this.sendMove(keys[e.keyCode]);
  }.bind(this);

  this.sendMove = function (dir) {
    if (!dir) return true;
    this.lastMoveDirection = dir;
    this.trigger('move', dir);

    this.update({ game: { status: game.gameStatus() } });
  }.bind(this);
  this.newGame = function () {
    this.game = null;
    this.game = new Game();
    this.game.newGame();
    this.trigger('new');
  }.bind(this);
  this.setFocus = function (e) {
    this.input.focus();
    if (e) e.preventUpdate = true;
  }.bind(this);
  this.updateGame = function (e) {
    this.update();
  }.bind(this);
  this.undoClick = function () {
    this.game.undo();
    this.trigger('move');
  }.bind(this);
  this.redoClick = function () {
    this.game.redo();
    this.trigger('move');
  }.bind(this);

  this.handleKeyPress = function (e) {
    if (!(e.ctrlKey || e.metaKey || e.altKey)) {
      e.stopPropagation();
      e.preventDefault();
    }
  }.bind(this);

  this.getMovingClass = function () {
    return "moving-" + this.lastMoveDirection;
  }.bind(this);
});
'use strict';

riot.tag2('block', '<label animate="{this.getAnimations()}" animate-leave="zoomOut" animate-duration="300ms">{opts.bv.val}</label>', '', 'class="{this.getLevelClass()}"', function (opts) {
  var _this = this;

  this.mixin(riotAnimate);

  this.getAnimations = function () {
    var classes = [];
    if (_this.opts.new) classes.push('bounceIn');
    if (_this.opts.combined) classes.push('flipInY');
    if (_this.moving) classes.push('fadeOut');
    return classes.join(' ');
  };

  this.getLevelClass = function () {
    var val = _this.opts.bv.val;
    var level = Math.log(val) / Math.log(2);
    return 'level' + level;
  };

  this.parent.on('moveblocks', function () {

    var delta = _this.opts.bv.delta;
    if (delta) {

      var marginAdjustX = delta.dx * 20,
          marginAdjustY = delta.dy * 20;

      _this.moving = true;

      if (delta.removed || delta.combined) _this.animatedUnmount();

      _this.update();

      Velocity(_this.root, {
        left: _this.root.offsetWidth * delta.dx + marginAdjustX + 'px',
        top: _this.root.offsetHeight * delta.dy + marginAdjustY + 'px'
      }, {
        duration: 100,
        complete: function complete() {
          _this.moving = false;
        }
      });
    }
  });

  this.on('before-unmount', function () {});

  this.on('updated', function () {});
  this.on('mount', function () {});
});
'use strict';

riot.tag2('board', '<div class="row" each="{row, y in boardRows}"> <space each="{tmp, x in row}" bv="{getVal(y, x)}" new="{isNew(y,x)}" combined="{isCombined(y,x)}" class="{new: isNew(y,x)}"></space> </div>', '', '', function (opts) {
  var _this = this;

  this.game = opts.game;

  function cloneMatrix(matrix) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = matrix[y][x];
      }
    }
    return newMatrix;
  }

  function updateMoves(matrix, moves) {
    var size = matrix.length,
        newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        var block = matrix[y][x];
        block.delta = moves[y][x];
        block.isNew = false;
        newMatrix[y][x] = block;
      }
    }
    return newMatrix;
  }

  this.on('mount', function () {
    _this.boardRows = cloneMatrix(_this.game.rows);
    _this.update();
  });

  this.on('new', function () {
    _this.boardRows = cloneMatrix(_this.game.rows);
    _this.update();
  });

  this.parent.on('move', function (dir) {
    _this.trigger('move');
    if (dir) {

      _this.lastBoardRows = _this.boardRows = updateMoves(_this.boardRows, _this.game.getBlockMovements(dir));

      _this.trigger('moveblocks');

      setTimeout(function () {
        if (dir) _this.game.processMove(dir);
        _this.boardRows = cloneMatrix(_this.game.rows);
        _this.update();
      }, 100);
    } else {
      _this.boardRows = _this.game.rows;
      _this.update();
    }
  });

  this.mixin(riotAnimate);

  this.isNew = function (y, x) {
    return this.game.rows[y][x].isNew;
  }.bind(this);

  this.isCombined = function (y, x) {
    return this.lastBoardRows[y][x].delta.combined;
  }.bind(this);

  this.getVal = function (y, x) {
    return this.boardRows[y][x];
  }.bind(this);
});
'use strict';

riot.tag2('space', '<block if="{opts.bv.val != 0}" bv="{opts.bv}" new="{opts.new}" combined="{opts.combined}" moving="{isMoving(y,x)}"> </block>', '', '', function (opts) {
  var _this = this;

  this.mixin(riotAnimate);

  this.parent.parent.on('moveblocks', function () {
    _this.trigger('moveblocks');
  });

  this.isMoving = function (y, x) {
    return this.boardRows[y][x].delta.dx || this.boardRows[y][x].delta.dy;
  }.bind(this);

  this.on('mount', function () {
    _this.block = opts.bv;
  });
});