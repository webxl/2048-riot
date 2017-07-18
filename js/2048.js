'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_SIZE = 4;
var DEFAULT_GOAL = 2048;
var DEFAULT_NEW_BLOCK_COUNT = 1;
var NEW_BLOCK_VAL_HIGH = 4;
var NEW_BLOCK_VAL_LOW = 2;
var HIGH_LOW_RATIO = .75;
var HIGH_BLOCK_PERMITTED = 1 / 256;

var Game = function () {
  function Game(_opts) {
    _classCallCheck(this, Game);

    var opts = Object.assign({
      size: DEFAULT_SIZE,
      goal: DEFAULT_GOAL,
      newBlockCount: DEFAULT_NEW_BLOCK_COUNT

    }, _opts);

    this.boardUndoStack = [];
    this.boardRedoStack = [];
    this.scoreUndoStack = [];
    this.scoreRedoStack = [];

    this.score = 0;
    this.opts = opts;
  }

  _createClass(Game, [{
    key: 'getStartBlocks',
    value: function getStartBlocks(blocks, boardSize) {
      var loc = [Math.floor(boardSize * Math.random()), Math.floor(boardSize * Math.random())];
      if (!blocks.some(function (b) {
        return b[0] === loc[0] && b[1] === loc[1];
      })) {
        blocks.push(loc);
        return blocks;
      } else {
        return this.getStartBlocks(blocks, boardSize);
      }
    }
  }, {
    key: 'gameStatus',
    value: function gameStatus() {
      return this.status;
    }
  }, {
    key: 'getNewBlocks',
    value: function getNewBlocks(matrix, count, newBlocks) {
      if (0 === count--) return newBlocks;
      var boardSize = matrix.length,
          available = [];
      var newMatrix = Game.cloneMatrix(matrix);
      for (var i = 0; i < boardSize; i++) {
        for (var j = 0; j < boardSize; j++) {
          if (!matrix[i][j].val) available.push({ y: i, x: j });
        }
      }

      if (!available.length) return newBlocks;

      var c = available[Math.floor(available.length * Math.random())];
      newBlocks.push(c);
      newMatrix[c.y][c.x].val = 2;
      return this.getNewBlocks(newMatrix, count, newBlocks);
    }
  }, {
    key: 'maybeGetBlock',
    value: function maybeGetBlock(blocks, x, y) {
      var val = blocks.some(function (b) {
        return b[0] === x && b[1] === y;
      }) ? 2 : 0;
      return { val: val, combined: false, startY: y, startX: x, moved: 0 };
    }
  }, {
    key: 'newGame',
    value: function newGame(newOpts) {
      this.status = 'active';
      var opts = Object.assign({}, this.opts, newOpts);
      this.boardSize = opts.size;
      this.maxBlockValue = 2;
      this.boardUndoStack = [];
      this.boardRedoStack = [];
      this.scoreUndoStack = [];
      this.scoreRedoStack = [];

      var newGoal = void 0;

      switch (this.boardSize) {
        case 2:
          newGoal = 32;break;
        case 3:
          newGoal = 512;break;
        case 4:
          newGoal = 2048;break;
        case 5:
          newGoal = 8192;break;
        default:
          newGoal = 32768;break;
      }

      this.opts.goal = opts.goal = newGoal;

      var gameBlocks = this.getStartBlocks([], this.boardSize);
      gameBlocks = this.getStartBlocks(gameBlocks, this.boardSize);

      this.rows = [];
      this.score = 0;

      for (var i = 0; i < this.boardSize; i++) {
        var row = [];
        for (var j = 0; j < this.boardSize; j++) {
          row.push(this.maybeGetBlock(gameBlocks, i, j));
        }
        this.rows.push(row);
      }
      this.rows = Game.updateProps(this.rows);
    }
  }, {
    key: 'combineValuesUp',
    value: function combineValuesUp(matrix, secondPass) {
      var size = matrix.length,
          combined = Game.cloneMatrix(matrix);

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
              var newValue = curBlock.val * 2;

              combined[y][x] = Object.assign({}, nextBlock, { combined: { y: curBlock.startY, x: curBlock.startX }, val: newValue });
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
        return this.combineValuesUp(combined, true);
      }
      return combined;
    }
  }, {
    key: 'getBlockMovements',
    value: function getBlockMovements(direction) {
      var size = this.rows.length,
          blocks = [];

      var preview = this.moveBlocks(direction);

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
    }
  }, {
    key: 'getNewBlockValue',
    value: function getNewBlockValue(notRandom) {
      return this.maxBlockValue >= this.opts.goal * HIGH_BLOCK_PERMITTED && (notRandom || Math.random() > HIGH_LOW_RATIO) ? NEW_BLOCK_VAL_HIGH : NEW_BLOCK_VAL_LOW;
    }
  }, {
    key: 'processMove',
    value: function processMove(direction) {
      var _this = this;

      var size = this.rows.length,
          moves = [];

      if (this.status !== 'active') return;

      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (this.rows[y][x].possibleMoves.length) moves.push(this.rows[y][x].possibleMoves);
        }
      }

      if (!moves.some(function (b) {
        return b.some(function (m) {
          return m === direction;
        });
      })) return;

      this.boardUndoStack.push(this.rows);
      this.boardRedoStack = [];

      this.rows = this.moveBlocks(direction);

      if (this.checkWin()) return;

      this.newBlocks = this.getNewBlocks(this.rows, this.opts.newBlockCount, []);
      var newVal = this.getNewBlockValue();
      this.newBlocks.forEach(function (c) {
        Object.assign(_this.rows[c.y][c.x], Game.getDefaults(c.y, c.x, newVal, []), { isNew: true });
      });

      this.scoreUndoStack.push(this.score);
      this.scoreRedoStack = [];

      this.score += this.getMoveScore();

      this.rows = Game.updateProps(this.rows);

      this.checkLoss();
    }
  }, {
    key: 'checkWin',
    value: function checkWin() {
      var size = this.rows.length;
      this.maxBlockValue = NEW_BLOCK_VAL_LOW;
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (this.rows[y][x].val >= this.maxBlockValue) {
            this.maxBlockValue = this.rows[y][x].val;
          }
        }
      }
      if (this.maxBlockValue >= this.opts.goal) {
        this.status = 'win';
        return true;
      }

      return false;
    }
  }, {
    key: 'checkLoss',
    value: function checkLoss() {
      var size = this.rows.length,
          moves = [];
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          moves.push(this.rows[y][x].possibleMoves);
        }
      }
      if (!moves.some(function (b) {
        return b.length !== 0;
      })) {
        this.status = 'loss';return true;
      }

      return false;
    }
  }, {
    key: 'moveBlocks',
    value: function moveBlocks(direction) {
      return this.transformMatrix(direction, this.combineValuesUp);
    }
  }, {
    key: 'undo',
    value: function undo() {
      if (this.boardUndoStack.length) {
        this.status = 'active';
        var redo = this.rows,
            redoScore = this.score;
        this.rows = this.boardUndoStack.pop();
        this.score = this.scoreUndoStack.pop();
        this.boardRedoStack.push(redo);
        this.scoreRedoStack.push(redoScore);
      }
    }
  }, {
    key: 'redo',
    value: function redo() {
      if (this.boardRedoStack.length) {
        var undo = this.rows,
            undoScore = this.score;
        this.rows = this.boardRedoStack.pop();
        this.score = this.scoreRedoStack.pop();
        this.boardUndoStack.push(undo);
        this.scoreUndoStack.push(undoScore);
        this.checkWin();
        this.checkLoss();
      }
    }
  }, {
    key: 'getMoveScore',
    value: function getMoveScore() {
      var moveScore = 0,
          matrix = this.rows;
      var size = matrix.length;
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (matrix[y][x].combined) {
            moveScore += matrix[y][x].val;
          }
        }
      }
      return moveScore;
    }
  }, {
    key: 'transformMatrix',
    value: function transformMatrix(direction, combineFn) {
      switch (direction) {
        case 'left':
          return Game.rotate('left', combineFn.call(this, Game.rotate('right', this.rows)));
          break;
        case 'right':
          return Game.rotate('right', combineFn.call(this, Game.rotate('left', this.rows)));
          break;
        case 'up':
          return combineFn.call(this, this.rows);
          break;
        case 'down':
          return Game.flip(combineFn.call(this, Game.flip(this.rows)));
          break;
        default:
          return;break;
      }
    }
  }], [{
    key: 'transpose',


    // matrix helpers

    value: function transpose(matrix) {
      var size = matrix.length,
          trans = new Array(size);
      for (var y = 0; y < size; y++) {
        trans[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          trans[y][x] = Object.assign({}, matrix[x][y]);
        }
      }
      return trans;
    }
  }, {
    key: 'reverseEachRow',
    value: function reverseEachRow(matrix) {

      var size = matrix.length,
          reversed = new Array(size);
      for (var y = 0; y < size; y++) {
        reversed[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          reversed[y][x] = Object.assign({}, matrix[y][size - x - 1]);
        }
      }
      return reversed;
    }
  }, {
    key: 'reverseEachColumn',
    value: function reverseEachColumn(matrix) {

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
    }
  }, {
    key: 'printMatrix',
    value: function printMatrix(matrix) {
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
    }
  }, {
    key: 'rotate',
    value: function rotate(direction, matrix) {
      switch (direction) {
        case 'left':
          return Game.reverseEachColumn(Game.transpose(matrix));
        case 'right':
          return Game.reverseEachRow(Game.transpose(matrix));
        default:
          break;
      }
      return matrix;
    }
  }, {
    key: 'flip',
    value: function flip(matrix) {
      return Game.reverseEachRow(Game.reverseEachColumn(Game.cloneMatrix(matrix)));
    }
  }, {
    key: 'addProps',
    value: function addProps(matrix) {
      var size = matrix.length,
          newMatrix = new Array(size);
      for (var y = 0; y < size; y++) {
        newMatrix[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          newMatrix[y][x] = Game.getDefaults(y, x, matrix[y][x], []);
        }
      }
      return Game.updateProps(newMatrix);
    }
  }, {
    key: 'possibleMoves',
    value: function possibleMoves(matrix, y, x) {
      var size = matrix.length,
          moves = [];
      var nbs = [[-1, 0, 'up'], [0, -1, 'left'], [0, 1, 'right'], [1, 0, 'down']];
      for (var j = 0; j < nbs.length; j++) {
        var y1 = y + nbs[j][0],
            x1 = x + nbs[j][1];
        if (x1 >= 0 && y1 >= 0 && x1 < size && y1 < size) {
          if (matrix[y][x].val && (matrix[y1][x1].val === matrix[y][x].val || !matrix[y1][x1].val)) moves.push(nbs[j][2]);
        }
      }
      return moves;
    }
  }, {
    key: 'removeProps',
    value: function removeProps(matrix) {
      var size = matrix.length,
          newMatrix = new Array(size);
      for (var y = 0; y < size; y++) {
        newMatrix[y] = Array(size);
        for (var x = 0; x < size; x++) {
          newMatrix[y][x] = matrix[y][x].val;
        }
      }
      return newMatrix;
    }
  }, {
    key: 'updateProps',
    value: function updateProps(matrix) {
      var size = matrix.length,
          newMatrix = new Array(size);
      for (var y = 0; y < size; y++) {
        newMatrix[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          var oldProps = matrix[y][x];
          newMatrix[y][x] = Game.getDefaults(y, x, matrix[y][x].val, Game.possibleMoves(matrix, y, x));
          newMatrix[y][x].isNew = oldProps.isNew; // todo: why are we using getDefaults above?
        }
      }
      return newMatrix;
    }
  }, {
    key: 'getDefaults',
    value: function getDefaults(y, x, val, moves) {
      return {
        val: val,
        combined: false,
        startY: y,
        startX: x,
        moved: 0,
        possibleMoves: moves,
        isNew: false
      };
    }
  }, {
    key: 'cloneMatrix',
    value: function cloneMatrix(matrix) {
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
  }]);

  return Game;
}();

if (typeof Object.assign !== 'function') {
  Object.assign = function (target) {
    'use strict';

    if (target === null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source !== null) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdhbWUuanMiXSwibmFtZXMiOlsiREVGQVVMVF9TSVpFIiwiREVGQVVMVF9HT0FMIiwiREVGQVVMVF9ORVdfQkxPQ0tfQ09VTlQiLCJORVdfQkxPQ0tfVkFMX0hJR0giLCJORVdfQkxPQ0tfVkFMX0xPVyIsIkhJR0hfTE9XX1JBVElPIiwiSElHSF9CTE9DS19QRVJNSVRURUQiLCJHYW1lIiwiX29wdHMiLCJvcHRzIiwiT2JqZWN0IiwiYXNzaWduIiwic2l6ZSIsImdvYWwiLCJuZXdCbG9ja0NvdW50IiwiYm9hcmRVbmRvU3RhY2siLCJib2FyZFJlZG9TdGFjayIsInNjb3JlVW5kb1N0YWNrIiwic2NvcmVSZWRvU3RhY2siLCJzY29yZSIsImJsb2NrcyIsImJvYXJkU2l6ZSIsImxvYyIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsInNvbWUiLCJiIiwicHVzaCIsImdldFN0YXJ0QmxvY2tzIiwic3RhdHVzIiwibWF0cml4IiwiY291bnQiLCJuZXdCbG9ja3MiLCJsZW5ndGgiLCJhdmFpbGFibGUiLCJuZXdNYXRyaXgiLCJjbG9uZU1hdHJpeCIsImkiLCJqIiwidmFsIiwieSIsIngiLCJjIiwiZ2V0TmV3QmxvY2tzIiwiY29tYmluZWQiLCJzdGFydFkiLCJzdGFydFgiLCJtb3ZlZCIsIm5ld09wdHMiLCJtYXhCbG9ja1ZhbHVlIiwibmV3R29hbCIsImdhbWVCbG9ja3MiLCJyb3dzIiwicm93IiwibWF5YmVHZXRCbG9jayIsInVwZGF0ZVByb3BzIiwic2Vjb25kUGFzcyIsInNpemVfciIsImN1ckJsb2NrIiwibmV4dEJsb2NrIiwieTEiLCJuZXdWYWx1ZSIsImNvbWJpbmVWYWx1ZXNVcCIsImRpcmVjdGlvbiIsInByZXZpZXciLCJtb3ZlQmxvY2tzIiwiQXJyYXkiLCJuZXdCbG9jayIsImR4IiwiZHkiLCJyZW1vdmVkIiwibm90UmFuZG9tIiwibW92ZXMiLCJwb3NzaWJsZU1vdmVzIiwibSIsImNoZWNrV2luIiwibmV3VmFsIiwiZ2V0TmV3QmxvY2tWYWx1ZSIsImZvckVhY2giLCJnZXREZWZhdWx0cyIsImlzTmV3IiwiZ2V0TW92ZVNjb3JlIiwiY2hlY2tMb3NzIiwidHJhbnNmb3JtTWF0cml4IiwicmVkbyIsInJlZG9TY29yZSIsInBvcCIsInVuZG8iLCJ1bmRvU2NvcmUiLCJtb3ZlU2NvcmUiLCJjb21iaW5lRm4iLCJyb3RhdGUiLCJjYWxsIiwiZmxpcCIsInRyYW5zIiwicmV2ZXJzZWQiLCJjb25zb2xlIiwibG9nIiwicmV2ZXJzZUVhY2hDb2x1bW4iLCJ0cmFuc3Bvc2UiLCJyZXZlcnNlRWFjaFJvdyIsIm5icyIsIngxIiwib2xkUHJvcHMiLCJ0YXJnZXQiLCJUeXBlRXJyb3IiLCJpbmRleCIsImFyZ3VtZW50cyIsInNvdXJjZSIsImtleSIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQU1BLGVBQWUsQ0FBckI7QUFDQSxJQUFNQyxlQUFlLElBQXJCO0FBQ0EsSUFBTUMsMEJBQTBCLENBQWhDO0FBQ0EsSUFBTUMscUJBQXFCLENBQTNCO0FBQ0EsSUFBTUMsb0JBQW9CLENBQTFCO0FBQ0EsSUFBTUMsaUJBQWlCLEdBQXZCO0FBQ0EsSUFBTUMsdUJBQXVCLElBQUksR0FBakM7O0lBRU1DLEk7QUFFSixnQkFBWUMsS0FBWixFQUFtQjtBQUFBOztBQUVqQixRQUFJQyxPQUFPQyxPQUFPQyxNQUFQLENBQWM7QUFDdkJDLFlBQU1aLFlBRGlCO0FBRXZCYSxZQUFNWixZQUZpQjtBQUd2QmEscUJBQWVaOztBQUhRLEtBQWQsRUFLUk0sS0FMUSxDQUFYOztBQU9BLFNBQUtPLGNBQUwsR0FBc0IsRUFBdEI7QUFDQSxTQUFLQyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixFQUF0QjtBQUNBLFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBRUEsU0FBS0MsS0FBTCxHQUFhLENBQWI7QUFDQSxTQUFLVixJQUFMLEdBQVlBLElBQVo7QUFFRDs7OzttQ0FFZVcsTSxFQUFRQyxTLEVBQVc7QUFDakMsVUFBTUMsTUFBTSxDQUFDQyxLQUFLQyxLQUFMLENBQVdILFlBQVlFLEtBQUtFLE1BQUwsRUFBdkIsQ0FBRCxFQUF3Q0YsS0FBS0MsS0FBTCxDQUFXSCxZQUFZRSxLQUFLRSxNQUFMLEVBQXZCLENBQXhDLENBQVo7QUFDQSxVQUFJLENBQUNMLE9BQU9NLElBQVAsQ0FBWTtBQUFBLGVBQUtDLEVBQUUsQ0FBRixNQUFTTCxJQUFJLENBQUosQ0FBVCxJQUFtQkssRUFBRSxDQUFGLE1BQVNMLElBQUksQ0FBSixDQUFqQztBQUFBLE9BQVosQ0FBTCxFQUEyRDtBQUN6REYsZUFBT1EsSUFBUCxDQUFZTixHQUFaO0FBQ0EsZUFBT0YsTUFBUDtBQUNELE9BSEQsTUFHTztBQUNMLGVBQU8sS0FBS1MsY0FBTCxDQUFvQlQsTUFBcEIsRUFBNEJDLFNBQTVCLENBQVA7QUFDRDtBQUNGOzs7aUNBRWE7QUFDWixhQUFPLEtBQUtTLE1BQVo7QUFDRDs7O2lDQUVhQyxNLEVBQVFDLEssRUFBT0MsUyxFQUFXO0FBQ3RDLFVBQUksTUFBTUQsT0FBVixFQUFtQixPQUFPQyxTQUFQO0FBQ25CLFVBQU1aLFlBQVlVLE9BQU9HLE1BQXpCO0FBQUEsVUFBaUNDLFlBQVksRUFBN0M7QUFDQSxVQUFNQyxZQUFZN0IsS0FBSzhCLFdBQUwsQ0FBaUJOLE1BQWpCLENBQWxCO0FBQ0EsV0FBSyxJQUFJTyxJQUFJLENBQWIsRUFBZ0JBLElBQUlqQixTQUFwQixFQUErQmlCLEdBQS9CLEVBQW9DO0FBQ2xDLGFBQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJbEIsU0FBcEIsRUFBK0JrQixHQUEvQixFQUFvQztBQUNsQyxjQUFJLENBQUNSLE9BQU9PLENBQVAsRUFBVUMsQ0FBVixFQUFhQyxHQUFsQixFQUF1QkwsVUFBVVAsSUFBVixDQUFlLEVBQUNhLEdBQUdILENBQUosRUFBT0ksR0FBR0gsQ0FBVixFQUFmO0FBQ3hCO0FBQ0Y7O0FBRUQsVUFBSSxDQUFDSixVQUFVRCxNQUFmLEVBQXVCLE9BQU9ELFNBQVA7O0FBRXZCLFVBQU1VLElBQUlSLFVBQVVaLEtBQUtDLEtBQUwsQ0FBV1csVUFBVUQsTUFBVixHQUFtQlgsS0FBS0UsTUFBTCxFQUE5QixDQUFWLENBQVY7QUFDQVEsZ0JBQVVMLElBQVYsQ0FBZWUsQ0FBZjtBQUNBUCxnQkFBVU8sRUFBRUYsQ0FBWixFQUFlRSxFQUFFRCxDQUFqQixFQUFvQkYsR0FBcEIsR0FBMEIsQ0FBMUI7QUFDQSxhQUFPLEtBQUtJLFlBQUwsQ0FBa0JSLFNBQWxCLEVBQTZCSixLQUE3QixFQUFvQ0MsU0FBcEMsQ0FBUDtBQUNEOzs7a0NBRWNiLE0sRUFBUXNCLEMsRUFBR0QsQyxFQUFHO0FBQzNCLFVBQU1ELE1BQU1wQixPQUFPTSxJQUFQLENBQVk7QUFBQSxlQUFLQyxFQUFFLENBQUYsTUFBU2UsQ0FBVCxJQUFjZixFQUFFLENBQUYsTUFBU2MsQ0FBNUI7QUFBQSxPQUFaLElBQTZDLENBQTdDLEdBQWlELENBQTdEO0FBQ0EsYUFBTyxFQUFFRCxRQUFGLEVBQU9LLFVBQVUsS0FBakIsRUFBd0JDLFFBQVFMLENBQWhDLEVBQW1DTSxRQUFRTCxDQUEzQyxFQUE4Q00sT0FBTyxDQUFyRCxFQUFQO0FBQ0Q7Ozs0QkFFUUMsTyxFQUFTO0FBQ2hCLFdBQUtuQixNQUFMLEdBQWMsUUFBZDtBQUNBLFVBQUlyQixPQUFPQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQixLQUFLRixJQUF2QixFQUE2QndDLE9BQTdCLENBQVg7QUFDQSxXQUFLNUIsU0FBTCxHQUFpQlosS0FBS0csSUFBdEI7QUFDQSxXQUFLc0MsYUFBTCxHQUFxQixDQUFyQjtBQUNBLFdBQUtuQyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0EsV0FBS0MsY0FBTCxHQUFzQixFQUF0QjtBQUNBLFdBQUtDLGNBQUwsR0FBc0IsRUFBdEI7QUFDQSxXQUFLQyxjQUFMLEdBQXNCLEVBQXRCOztBQUVBLFVBQUlpQyxnQkFBSjs7QUFFQSxjQUFRLEtBQUs5QixTQUFiO0FBQ0UsYUFBSyxDQUFMO0FBQVE4QixvQkFBVSxFQUFWLENBQWM7QUFDdEIsYUFBSyxDQUFMO0FBQVFBLG9CQUFVLEdBQVYsQ0FBZTtBQUN2QixhQUFLLENBQUw7QUFBUUEsb0JBQVUsSUFBVixDQUFnQjtBQUN4QixhQUFLLENBQUw7QUFBUUEsb0JBQVUsSUFBVixDQUFnQjtBQUN4QjtBQUFTQSxvQkFBVSxLQUFWLENBQWlCO0FBTDVCOztBQVFBLFdBQUsxQyxJQUFMLENBQVVJLElBQVYsR0FBaUJKLEtBQUtJLElBQUwsR0FBWXNDLE9BQTdCOztBQUVBLFVBQUlDLGFBQWEsS0FBS3ZCLGNBQUwsQ0FBb0IsRUFBcEIsRUFBd0IsS0FBS1IsU0FBN0IsQ0FBakI7QUFDQStCLG1CQUFhLEtBQUt2QixjQUFMLENBQW9CdUIsVUFBcEIsRUFBZ0MsS0FBSy9CLFNBQXJDLENBQWI7O0FBRUEsV0FBS2dDLElBQUwsR0FBWSxFQUFaO0FBQ0EsV0FBS2xDLEtBQUwsR0FBYSxDQUFiOztBQUVBLFdBQUssSUFBSW1CLElBQUksQ0FBYixFQUFnQkEsSUFBSSxLQUFLakIsU0FBekIsRUFBb0NpQixHQUFwQyxFQUF5QztBQUN2QyxZQUFNZ0IsTUFBTSxFQUFaO0FBQ0EsYUFBSyxJQUFJZixJQUFJLENBQWIsRUFBZ0JBLElBQUksS0FBS2xCLFNBQXpCLEVBQW9Da0IsR0FBcEMsRUFBeUM7QUFDdkNlLGNBQUkxQixJQUFKLENBQVMsS0FBSzJCLGFBQUwsQ0FBbUJILFVBQW5CLEVBQStCZCxDQUEvQixFQUFrQ0MsQ0FBbEMsQ0FBVDtBQUNEO0FBQ0QsYUFBS2MsSUFBTCxDQUFVekIsSUFBVixDQUFlMEIsR0FBZjtBQUNEO0FBQ0QsV0FBS0QsSUFBTCxHQUFZOUMsS0FBS2lELFdBQUwsQ0FBaUIsS0FBS0gsSUFBdEIsQ0FBWjtBQUNEOzs7b0NBRWdCdEIsTSxFQUFRMEIsVSxFQUFZO0FBQ25DLFVBQU03QyxPQUFPbUIsT0FBT0csTUFBcEI7QUFBQSxVQUE0QlcsV0FBV3RDLEtBQUs4QixXQUFMLENBQWlCTixNQUFqQixDQUF2Qzs7QUFFQSxXQUFLLElBQUlXLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0IsWUFBSWdCLFNBQVM5QyxJQUFiO0FBQ0EsYUFBSyxJQUFJNkIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJaUIsU0FBUyxDQUE3QixFQUFnQ2pCLEdBQWhDLEVBQXFDO0FBQ25DLGNBQUlrQixXQUFXZCxTQUFTSixDQUFULEVBQVlDLENBQVosQ0FBZjtBQUFBLGNBQ0VrQixZQUFZZixTQUFTSixJQUFJLENBQWIsRUFBZ0JDLENBQWhCLENBRGQ7O0FBR0EsY0FBSWlCLFNBQVNuQixHQUFULEtBQWlCLENBQXJCLEVBQXdCO0FBQ3RCLGdCQUFJcUIsV0FBSjtBQUNBLGlCQUFLQSxLQUFLcEIsQ0FBVixFQUFhb0IsS0FBS0gsU0FBUyxDQUEzQixFQUE4QkcsSUFBOUIsRUFBb0M7QUFDbENoQix1QkFBU2dCLEVBQVQsRUFBYW5CLENBQWIsSUFBa0JoQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQmtDLFNBQVNnQixLQUFLLENBQWQsRUFBaUJuQixDQUFqQixDQUFsQixDQUFsQjtBQUNEO0FBQ0RHLHFCQUFTZ0IsRUFBVCxFQUFhbkIsQ0FBYixFQUFnQkYsR0FBaEIsR0FBc0IsQ0FBdEI7QUFDQUMsZ0JBQUtpQjtBQUNOLFdBUEQsTUFPTztBQUNMLGdCQUFJQyxTQUFTbkIsR0FBVCxLQUFpQm9CLFVBQVVwQixHQUEzQixJQUFrQyxDQUFDbUIsU0FBU2QsUUFBNUMsSUFBd0QsQ0FBQ2UsVUFBVWYsUUFBdkUsRUFBaUY7QUFDL0Usa0JBQUlnQixXQUFKO0FBQ0Esa0JBQU1DLFdBQVdILFNBQVNuQixHQUFULEdBQWUsQ0FBaEM7O0FBRUFLLHVCQUFTSixDQUFULEVBQVlDLENBQVosSUFBaUJoQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQmlELFNBQWxCLEVBQTZCLEVBQUVmLFVBQVUsRUFBRUosR0FBR2tCLFNBQVNiLE1BQWQsRUFBc0JKLEdBQUdpQixTQUFTWixNQUFsQyxFQUFaLEVBQXdEUCxLQUFLc0IsUUFBN0QsRUFBN0IsQ0FBakI7QUFDQUYsd0JBQVVwQixHQUFWLEdBQWdCLENBQWhCO0FBQ0EsbUJBQUtxQixLQUFLcEIsSUFBRSxDQUFaLEVBQWVvQixLQUFLSCxTQUFTLENBQTdCLEVBQWdDRyxJQUFoQyxFQUFzQztBQUNwQ2hCLHlCQUFTZ0IsRUFBVCxFQUFhbkIsQ0FBYixJQUFrQmhDLE9BQU9DLE1BQVAsQ0FBYyxFQUFkLEVBQW1Ca0MsU0FBU2dCLEtBQUssQ0FBZCxFQUFpQm5CLENBQWpCLENBQW5CLENBQWxCO0FBQ0Q7QUFDREcsdUJBQVNnQixFQUFULEVBQWFuQixDQUFiLEVBQWdCRixHQUFoQixHQUFzQixDQUF0QjtBQUNBQyxrQkFBS2lCO0FBQ047QUFDRjtBQUNGO0FBQ0Y7O0FBRUQsVUFBSSxDQUFDRCxVQUFMLEVBQWlCO0FBQ2YsZUFBTyxLQUFLTSxlQUFMLENBQXFCbEIsUUFBckIsRUFBK0IsSUFBL0IsQ0FBUDtBQUNEO0FBQ0QsYUFBT0EsUUFBUDtBQUNEOzs7c0NBRWtCbUIsUyxFQUFXO0FBQzVCLFVBQU1wRCxPQUFPLEtBQUt5QyxJQUFMLENBQVVuQixNQUF2QjtBQUFBLFVBQStCZCxTQUFTLEVBQXhDOztBQUVBLFVBQU02QyxVQUFVLEtBQUtDLFVBQUwsQ0FBZ0JGLFNBQWhCLENBQWhCOztBQUVBLFdBQUssSUFBSXZCLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLElBQXBCLEVBQTBCNkIsR0FBMUIsRUFBK0I7QUFDN0JyQixlQUFPUSxJQUFQLENBQVksSUFBSXVDLEtBQUosQ0FBVXZELElBQVYsQ0FBWjtBQUNBLGFBQUssSUFBSThCLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0J0QixpQkFBT3FCLENBQVAsRUFBVUMsQ0FBVixJQUFlLENBQWY7QUFDRDtBQUNGO0FBQ0QsV0FBSyxJQUFJRCxNQUFJLENBQWIsRUFBZ0JBLE1BQUk3QixJQUFwQixFQUEwQjZCLEtBQTFCLEVBQStCO0FBQzdCLGFBQUssSUFBSUMsS0FBSSxDQUFiLEVBQWdCQSxLQUFJOUIsSUFBcEIsRUFBMEI4QixJQUExQixFQUErQjtBQUM3QjtBQUNBLGNBQUkwQixXQUFXSCxRQUFReEIsR0FBUixFQUFXQyxFQUFYLENBQWY7O0FBRUEsY0FBSTJCLEtBQUssQ0FBVDtBQUFBLGNBQVlDLEtBQUssQ0FBakI7O0FBRUEsa0JBQVFOLFNBQVI7QUFDRSxpQkFBSyxJQUFMO0FBQ0EsaUJBQUssTUFBTDtBQUNFTSxtQkFBSzdCLE1BQUkyQixTQUFTdEIsTUFBbEIsQ0FBMEI7QUFDNUIsaUJBQUssTUFBTDtBQUNBLGlCQUFLLE9BQUw7QUFDRXVCLG1CQUFLM0IsS0FBSTBCLFNBQVNyQixNQUFsQixDQUEyQjtBQU4vQjtBQVFBOztBQUVBLGNBQUksQ0FBQ3VCLE1BQU1ELEVBQVAsS0FBZUQsU0FBUzVCLEdBQTVCLEVBQ0VwQixPQUFPZ0QsU0FBU3RCLE1BQWhCLEVBQXdCc0IsU0FBU3JCLE1BQWpDLElBQTJDLEVBQUV1QixNQUFGLEVBQU1ELE1BQU4sRUFBM0M7O0FBRUYsY0FBSUQsU0FBU3ZCLFFBQWIsRUFBdUI7QUFDckIsZ0JBQUl3QixNQUFLLENBQVQ7QUFBQSxnQkFBWUMsTUFBSyxDQUFqQjtBQUNBLG9CQUFRTixTQUFSO0FBQ0UsbUJBQUssSUFBTDtBQUNBLG1CQUFLLE1BQUw7QUFDRU0sc0JBQUs3QixNQUFJMkIsU0FBU3ZCLFFBQVQsQ0FBa0JKLENBQTNCLENBQThCO0FBQ2hDLG1CQUFLLE1BQUw7QUFDQSxtQkFBSyxPQUFMO0FBQ0U0QixzQkFBSzNCLEtBQUkwQixTQUFTdkIsUUFBVCxDQUFrQkgsQ0FBM0IsQ0FBK0I7QUFObkM7QUFRQTs7QUFFQSxnQkFBSSxDQUFDNEIsT0FBTUQsR0FBUCxLQUFlRCxTQUFTNUIsR0FBNUIsRUFDRXBCLE9BQU9nRCxTQUFTdkIsUUFBVCxDQUFrQkosQ0FBekIsRUFBNEIyQixTQUFTdkIsUUFBVCxDQUFrQkgsQ0FBOUMsSUFBbUQsRUFBRTRCLE9BQUYsRUFBTUQsT0FBTixFQUFVRSxTQUFTLElBQW5CLEVBQW5EO0FBQ0FuRCxtQkFBT3FCLEdBQVAsRUFBVUMsRUFBVixJQUFlaEMsT0FBT0MsTUFBUCxDQUFjLEVBQUVrQyxVQUFVLElBQVosRUFBZCxFQUFrQ3pCLE9BQU9xQixHQUFQLEVBQVVDLEVBQVYsQ0FBbEMsQ0FBZjtBQUNIO0FBQ0Y7QUFDRjs7QUFFRCxhQUFPdEIsTUFBUDtBQUNEOzs7cUNBRWlCb0QsUyxFQUFXO0FBQzNCLGFBQVEsS0FBS3RCLGFBQUwsSUFBc0IsS0FBS3pDLElBQUwsQ0FBVUksSUFBVixHQUFpQlAsb0JBQXZDLEtBQWdFa0UsYUFBYWpELEtBQUtFLE1BQUwsS0FBZ0JwQixjQUE3RixDQUFELEdBQWlIRixrQkFBakgsR0FBcUlDLGlCQUE1STtBQUNEOzs7Z0NBRVk0RCxTLEVBQVc7QUFBQTs7QUFFdEIsVUFBTXBELE9BQU8sS0FBS3lDLElBQUwsQ0FBVW5CLE1BQXZCO0FBQUEsVUFBK0J1QyxRQUFRLEVBQXZDOztBQUVBLFVBQUksS0FBSzNDLE1BQUwsS0FBZ0IsUUFBcEIsRUFDRTs7QUFFRixXQUFLLElBQUlXLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLElBQXBCLEVBQTBCNkIsR0FBMUIsRUFBK0I7QUFDN0IsYUFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixJQUFwQixFQUEwQjhCLEdBQTFCLEVBQStCO0FBQzdCLGNBQUksS0FBS1csSUFBTCxDQUFVWixDQUFWLEVBQWFDLENBQWIsRUFBZ0JnQyxhQUFoQixDQUE4QnhDLE1BQWxDLEVBQ0F1QyxNQUFNN0MsSUFBTixDQUFXLEtBQUt5QixJQUFMLENBQVVaLENBQVYsRUFBYUMsQ0FBYixFQUFnQmdDLGFBQTNCO0FBQ0Q7QUFDRjs7QUFFRCxVQUFJLENBQUNELE1BQU0vQyxJQUFOLENBQVc7QUFBQSxlQUFLQyxFQUFFRCxJQUFGLENBQU87QUFBQSxpQkFBS2lELE1BQU1YLFNBQVg7QUFBQSxTQUFQLENBQUw7QUFBQSxPQUFYLENBQUwsRUFDRTs7QUFFRixXQUFLakQsY0FBTCxDQUFvQmEsSUFBcEIsQ0FBMEIsS0FBS3lCLElBQS9CO0FBQ0EsV0FBS3JDLGNBQUwsR0FBc0IsRUFBdEI7O0FBRUEsV0FBS3FDLElBQUwsR0FBWSxLQUFLYSxVQUFMLENBQWdCRixTQUFoQixDQUFaOztBQUVBLFVBQUksS0FBS1ksUUFBTCxFQUFKLEVBQXFCOztBQUVyQixXQUFLM0MsU0FBTCxHQUFpQixLQUFLVyxZQUFMLENBQWtCLEtBQUtTLElBQXZCLEVBQTZCLEtBQUs1QyxJQUFMLENBQVVLLGFBQXZDLEVBQXNELEVBQXRELENBQWpCO0FBQ0EsVUFBTStELFNBQVMsS0FBS0MsZ0JBQUwsRUFBZjtBQUNBLFdBQUs3QyxTQUFMLENBQWU4QyxPQUFmLENBQXVCLGFBQUs7QUFDMUJyRSxlQUFPQyxNQUFQLENBQWMsTUFBSzBDLElBQUwsQ0FBVVYsRUFBRUYsQ0FBWixFQUFlRSxFQUFFRCxDQUFqQixDQUFkLEVBQW1DbkMsS0FBS3lFLFdBQUwsQ0FBaUJyQyxFQUFFRixDQUFuQixFQUFzQkUsRUFBRUQsQ0FBeEIsRUFBMkJtQyxNQUEzQixFQUFtQyxFQUFuQyxDQUFuQyxFQUEyRSxFQUFFSSxPQUFPLElBQVQsRUFBM0U7QUFDRCxPQUZEOztBQUlBLFdBQUtoRSxjQUFMLENBQW9CVyxJQUFwQixDQUEwQixLQUFLVCxLQUEvQjtBQUNBLFdBQUtELGNBQUwsR0FBc0IsRUFBdEI7O0FBRUEsV0FBS0MsS0FBTCxJQUFjLEtBQUsrRCxZQUFMLEVBQWQ7O0FBRUEsV0FBSzdCLElBQUwsR0FBWTlDLEtBQUtpRCxXQUFMLENBQWlCLEtBQUtILElBQXRCLENBQVo7O0FBRUEsV0FBSzhCLFNBQUw7QUFFRDs7OytCQUVXO0FBQ1YsVUFBTXZFLE9BQU8sS0FBS3lDLElBQUwsQ0FBVW5CLE1BQXZCO0FBQ0EsV0FBS2dCLGFBQUwsR0FBcUI5QyxpQkFBckI7QUFDQSxXQUFLLElBQUlxQyxJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCLGFBQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJOUIsSUFBcEIsRUFBMEI4QixHQUExQixFQUErQjtBQUM3QixjQUFJLEtBQUtXLElBQUwsQ0FBVVosQ0FBVixFQUFhQyxDQUFiLEVBQWdCRixHQUFoQixJQUF1QixLQUFLVSxhQUFoQyxFQUErQztBQUM3QyxpQkFBS0EsYUFBTCxHQUFxQixLQUFLRyxJQUFMLENBQVVaLENBQVYsRUFBYUMsQ0FBYixFQUFnQkYsR0FBckM7QUFDRDtBQUNGO0FBQ0Y7QUFDRCxVQUFJLEtBQUtVLGFBQUwsSUFBc0IsS0FBS3pDLElBQUwsQ0FBVUksSUFBcEMsRUFBMEM7QUFDeEMsYUFBS2lCLE1BQUwsR0FBYyxLQUFkO0FBQ0EsZUFBTyxJQUFQO0FBQ0Q7O0FBRUQsYUFBTyxLQUFQO0FBQ0Q7OztnQ0FFWTtBQUNYLFVBQU1sQixPQUFPLEtBQUt5QyxJQUFMLENBQVVuQixNQUF2QjtBQUFBLFVBQStCdUMsUUFBUSxFQUF2QztBQUNBLFdBQUssSUFBSWhDLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLElBQXBCLEVBQTBCNkIsR0FBMUIsRUFBK0I7QUFDN0IsYUFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixJQUFwQixFQUEwQjhCLEdBQTFCLEVBQStCO0FBQzdCK0IsZ0JBQU03QyxJQUFOLENBQVcsS0FBS3lCLElBQUwsQ0FBVVosQ0FBVixFQUFhQyxDQUFiLEVBQWdCZ0MsYUFBM0I7QUFDRDtBQUNGO0FBQ0QsVUFBSSxDQUFDRCxNQUFNL0MsSUFBTixDQUFXO0FBQUEsZUFBS0MsRUFBRU8sTUFBRixLQUFhLENBQWxCO0FBQUEsT0FBWCxDQUFMLEVBQXNDO0FBQ3BDLGFBQUtKLE1BQUwsR0FBYyxNQUFkLENBQXNCLE9BQU8sSUFBUDtBQUN2Qjs7QUFFRCxhQUFPLEtBQVA7QUFDRDs7OytCQUVXa0MsUyxFQUFXO0FBQ3JCLGFBQU8sS0FBS29CLGVBQUwsQ0FBcUJwQixTQUFyQixFQUFnQyxLQUFLRCxlQUFyQyxDQUFQO0FBQ0Q7OzsyQkFFTztBQUNOLFVBQUksS0FBS2hELGNBQUwsQ0FBb0JtQixNQUF4QixFQUFnQztBQUM5QixhQUFLSixNQUFMLEdBQWMsUUFBZDtBQUNBLFlBQU11RCxPQUFPLEtBQUtoQyxJQUFsQjtBQUFBLFlBQXdCaUMsWUFBWSxLQUFLbkUsS0FBekM7QUFDQSxhQUFLa0MsSUFBTCxHQUFZLEtBQUt0QyxjQUFMLENBQW9Cd0UsR0FBcEIsRUFBWjtBQUNBLGFBQUtwRSxLQUFMLEdBQWEsS0FBS0YsY0FBTCxDQUFvQnNFLEdBQXBCLEVBQWI7QUFDQSxhQUFLdkUsY0FBTCxDQUFvQlksSUFBcEIsQ0FBeUJ5RCxJQUF6QjtBQUNBLGFBQUtuRSxjQUFMLENBQW9CVSxJQUFwQixDQUF5QjBELFNBQXpCO0FBQ0Q7QUFDRjs7OzJCQUVPO0FBQ04sVUFBSSxLQUFLdEUsY0FBTCxDQUFvQmtCLE1BQXhCLEVBQWdDO0FBQzlCLFlBQU1zRCxPQUFPLEtBQUtuQyxJQUFsQjtBQUFBLFlBQXdCb0MsWUFBWSxLQUFLdEUsS0FBekM7QUFDQSxhQUFLa0MsSUFBTCxHQUFZLEtBQUtyQyxjQUFMLENBQW9CdUUsR0FBcEIsRUFBWjtBQUNBLGFBQUtwRSxLQUFMLEdBQWEsS0FBS0QsY0FBTCxDQUFvQnFFLEdBQXBCLEVBQWI7QUFDQSxhQUFLeEUsY0FBTCxDQUFvQmEsSUFBcEIsQ0FBeUI0RCxJQUF6QjtBQUNBLGFBQUt2RSxjQUFMLENBQW9CVyxJQUFwQixDQUF5QjZELFNBQXpCO0FBQ0EsYUFBS2IsUUFBTDtBQUNBLGFBQUtPLFNBQUw7QUFDRDtBQUNGOzs7bUNBRWU7QUFDZCxVQUFJTyxZQUFZLENBQWhCO0FBQUEsVUFBbUIzRCxTQUFTLEtBQUtzQixJQUFqQztBQUNBLFVBQU16QyxPQUFPbUIsT0FBT0csTUFBcEI7QUFDQSxXQUFLLElBQUlPLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLElBQXBCLEVBQTBCNkIsR0FBMUIsRUFBK0I7QUFDN0IsYUFBSyxJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixJQUFwQixFQUEwQjhCLEdBQTFCLEVBQStCO0FBQzdCLGNBQUlYLE9BQU9VLENBQVAsRUFBVUMsQ0FBVixFQUFhRyxRQUFqQixFQUEyQjtBQUN6QjZDLHlCQUFhM0QsT0FBT1UsQ0FBUCxFQUFVQyxDQUFWLEVBQWFGLEdBQTFCO0FBQ0Q7QUFDRjtBQUNGO0FBQ0QsYUFBT2tELFNBQVA7QUFDRDs7O29DQUVnQjFCLFMsRUFBVzJCLFMsRUFBVztBQUNyQyxjQUFRM0IsU0FBUjtBQUNFLGFBQUssTUFBTDtBQUNFLGlCQUFPekQsS0FBS3FGLE1BQUwsQ0FBWSxNQUFaLEVBQW9CRCxVQUFVRSxJQUFWLENBQWUsSUFBZixFQUFxQnRGLEtBQUtxRixNQUFMLENBQVksT0FBWixFQUFxQixLQUFLdkMsSUFBMUIsQ0FBckIsQ0FBcEIsQ0FBUDtBQUNBO0FBQ0YsYUFBSyxPQUFMO0FBQ0UsaUJBQU85QyxLQUFLcUYsTUFBTCxDQUFZLE9BQVosRUFBcUJELFVBQVVFLElBQVYsQ0FBZSxJQUFmLEVBQXFCdEYsS0FBS3FGLE1BQUwsQ0FBWSxNQUFaLEVBQW9CLEtBQUt2QyxJQUF6QixDQUFyQixDQUFyQixDQUFQO0FBQ0E7QUFDRixhQUFLLElBQUw7QUFDRSxpQkFBT3NDLFVBQVVFLElBQVYsQ0FBZSxJQUFmLEVBQXFCLEtBQUt4QyxJQUExQixDQUFQO0FBQ0E7QUFDRixhQUFLLE1BQUw7QUFDRSxpQkFBTzlDLEtBQUt1RixJQUFMLENBQVVILFVBQVVFLElBQVYsQ0FBZSxJQUFmLEVBQXFCdEYsS0FBS3VGLElBQUwsQ0FBVSxLQUFLekMsSUFBZixDQUFyQixDQUFWLENBQVA7QUFDQTtBQUNGO0FBQ0UsaUJBQVE7QUFkWjtBQWdCRDs7Ozs7QUFFRDs7OEJBRWtCdEIsTSxFQUFRO0FBQ3hCLFVBQU1uQixPQUFPbUIsT0FBT0csTUFBcEI7QUFBQSxVQUE0QjZELFFBQVEsSUFBSTVCLEtBQUosQ0FBVXZELElBQVYsQ0FBcEM7QUFDQSxXQUFLLElBQUk2QixJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCc0QsY0FBTXRELENBQU4sSUFBVyxJQUFJMEIsS0FBSixDQUFVdkQsSUFBVixDQUFYO0FBQ0EsYUFBSyxJQUFJOEIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJOUIsSUFBcEIsRUFBMEI4QixHQUExQixFQUErQjtBQUM3QnFELGdCQUFNdEQsQ0FBTixFQUFTQyxDQUFULElBQWNoQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQm9CLE9BQU9XLENBQVAsRUFBVUQsQ0FBVixDQUFsQixDQUFkO0FBQ0Q7QUFDRjtBQUNELGFBQU9zRCxLQUFQO0FBQ0Q7OzttQ0FFc0JoRSxNLEVBQVE7O0FBRTdCLFVBQU1uQixPQUFPbUIsT0FBT0csTUFBcEI7QUFBQSxVQUE0QjhELFdBQVcsSUFBSTdCLEtBQUosQ0FBVXZELElBQVYsQ0FBdkM7QUFDQSxXQUFLLElBQUk2QixJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCdUQsaUJBQVN2RCxDQUFULElBQWMsSUFBSTBCLEtBQUosQ0FBVXZELElBQVYsQ0FBZDtBQUNBLGFBQUssSUFBSThCLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0JzRCxtQkFBU3ZELENBQVQsRUFBWUMsQ0FBWixJQUFpQmhDLE9BQU9DLE1BQVAsQ0FBYyxFQUFkLEVBQWtCb0IsT0FBT1UsQ0FBUCxFQUFVN0IsT0FBTzhCLENBQVAsR0FBVyxDQUFyQixDQUFsQixDQUFqQjtBQUNEO0FBQ0Y7QUFDRCxhQUFPc0QsUUFBUDtBQUNEOzs7c0NBRXlCakUsTSxFQUFROztBQUVoQyxVQUFNbkIsT0FBT21CLE9BQU9HLE1BQXBCO0FBQUEsVUFBNEI4RCxXQUFXLElBQUk3QixLQUFKLENBQVV2RCxJQUFWLENBQXZDO0FBQ0EsV0FBSyxJQUFJNkIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJN0IsSUFBcEIsRUFBMEI2QixHQUExQixFQUErQjtBQUM3QnVELGlCQUFTdkQsQ0FBVCxJQUFjLElBQUkwQixLQUFKLENBQVV2RCxJQUFWLENBQWQ7QUFDQSxhQUFLLElBQUk4QixJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixJQUFwQixFQUEwQjhCLEdBQTFCLEVBQStCO0FBQzdCc0QsbUJBQVN2RCxDQUFULEVBQVlDLENBQVosSUFBaUJoQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQm9CLE9BQU9uQixPQUFPNkIsQ0FBUCxHQUFXLENBQWxCLEVBQXFCQyxDQUFyQixDQUFsQixDQUFqQjtBQUNEO0FBQ0Q7QUFDRDtBQUNELGFBQU9zRCxRQUFQO0FBQ0Q7OztnQ0FFbUJqRSxNLEVBQVE7QUFDMUIsVUFBTW5CLE9BQU9tQixPQUFPRyxNQUFwQjtBQUNBK0QsY0FBUUMsR0FBUixDQUFZLE1BQVo7QUFDQSxXQUFLLElBQUl6RCxJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCLFlBQUlhLE1BQU0sRUFBVjtBQUNBLGFBQUssSUFBSVosSUFBSSxDQUFiLEVBQWdCQSxJQUFJOUIsSUFBcEIsRUFBMEI4QixHQUExQixFQUErQjtBQUM3QlksaUJBQU92QixPQUFPVSxDQUFQLEVBQVVDLENBQVYsRUFBYUYsR0FBYixHQUFtQixHQUExQjtBQUNEO0FBQ0R5RCxnQkFBUUMsR0FBUixDQUFZNUMsR0FBWjtBQUNEO0FBQ0QyQyxjQUFRQyxHQUFSLENBQVksTUFBWjtBQUNEOzs7MkJBRWNsQyxTLEVBQVdqQyxNLEVBQVE7QUFDaEMsY0FBUWlDLFNBQVI7QUFDRSxhQUFLLE1BQUw7QUFDRSxpQkFBT3pELEtBQUs0RixpQkFBTCxDQUF1QjVGLEtBQUs2RixTQUFMLENBQWVyRSxNQUFmLENBQXZCLENBQVA7QUFDRixhQUFLLE9BQUw7QUFDRSxpQkFBT3hCLEtBQUs4RixjQUFMLENBQW9COUYsS0FBSzZGLFNBQUwsQ0FBZXJFLE1BQWYsQ0FBcEIsQ0FBUDtBQUNGO0FBQ0U7QUFOSjtBQVFBLGFBQU9BLE1BQVA7QUFDRDs7O3lCQUVZQSxNLEVBQVE7QUFDbkIsYUFBT3hCLEtBQUs4RixjQUFMLENBQW9COUYsS0FBSzRGLGlCQUFMLENBQXVCNUYsS0FBSzhCLFdBQUwsQ0FBaUJOLE1BQWpCLENBQXZCLENBQXBCLENBQVA7QUFDRDs7OzZCQUVnQkEsTSxFQUFRO0FBQ3ZCLFVBQU1uQixPQUFPbUIsT0FBT0csTUFBcEI7QUFBQSxVQUE0QkUsWUFBWSxJQUFJK0IsS0FBSixDQUFVdkQsSUFBVixDQUF4QztBQUNBLFdBQUssSUFBSTZCLElBQUksQ0FBYixFQUFnQkEsSUFBSTdCLElBQXBCLEVBQTBCNkIsR0FBMUIsRUFBK0I7QUFDN0JMLGtCQUFVSyxDQUFWLElBQWUsSUFBSTBCLEtBQUosQ0FBVXZELElBQVYsQ0FBZjtBQUNBLGFBQUssSUFBSThCLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0JOLG9CQUFVSyxDQUFWLEVBQWFDLENBQWIsSUFBa0JuQyxLQUFLeUUsV0FBTCxDQUFpQnZDLENBQWpCLEVBQW9CQyxDQUFwQixFQUF1QlgsT0FBT1UsQ0FBUCxFQUFVQyxDQUFWLENBQXZCLEVBQXFDLEVBQXJDLENBQWxCO0FBQ0Q7QUFDRjtBQUNELGFBQU9uQyxLQUFLaUQsV0FBTCxDQUFpQnBCLFNBQWpCLENBQVA7QUFDRDs7O2tDQUVxQkwsTSxFQUFRVSxDLEVBQUdDLEMsRUFBSTtBQUNuQyxVQUFNOUIsT0FBT21CLE9BQU9HLE1BQXBCO0FBQUEsVUFBNEJ1QyxRQUFRLEVBQXBDO0FBQ0EsVUFBTTZCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBRixFQUFLLENBQUwsRUFBUSxJQUFSLENBQUQsRUFBZ0IsQ0FBQyxDQUFELEVBQUksQ0FBQyxDQUFMLEVBQVEsTUFBUixDQUFoQixFQUFpQyxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sT0FBUCxDQUFqQyxFQUFrRCxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sTUFBUCxDQUFsRCxDQUFaO0FBQ0EsV0FBSyxJQUFJL0QsSUFBRSxDQUFYLEVBQWNBLElBQUUrRCxJQUFJcEUsTUFBcEIsRUFBNEJLLEdBQTVCLEVBQWlDO0FBQy9CLFlBQU1zQixLQUFLcEIsSUFBSTZELElBQUkvRCxDQUFKLEVBQU8sQ0FBUCxDQUFmO0FBQUEsWUFBMEJnRSxLQUFLN0QsSUFBSTRELElBQUkvRCxDQUFKLEVBQU8sQ0FBUCxDQUFuQztBQUNBLFlBQUlnRSxNQUFNLENBQU4sSUFBVzFDLE1BQU0sQ0FBakIsSUFBc0IwQyxLQUFLM0YsSUFBM0IsSUFBbUNpRCxLQUFLakQsSUFBNUMsRUFBa0Q7QUFDaEQsY0FBSW1CLE9BQU9VLENBQVAsRUFBVUMsQ0FBVixFQUFhRixHQUFiLEtBQXFCVCxPQUFPOEIsRUFBUCxFQUFXMEMsRUFBWCxFQUFlL0QsR0FBZixLQUF1QlQsT0FBT1UsQ0FBUCxFQUFVQyxDQUFWLEVBQWFGLEdBQXBDLElBQTJDLENBQUNULE9BQU84QixFQUFQLEVBQVcwQyxFQUFYLEVBQWUvRCxHQUFoRixDQUFKLEVBQ0VpQyxNQUFNN0MsSUFBTixDQUFXMEUsSUFBSS9ELENBQUosRUFBTyxDQUFQLENBQVg7QUFDSDtBQUNGO0FBQ0QsYUFBT2tDLEtBQVA7QUFDRDs7O2dDQUVtQjFDLE0sRUFBUTtBQUMxQixVQUFNbkIsT0FBT21CLE9BQU9HLE1BQXBCO0FBQUEsVUFBNEJFLFlBQVksSUFBSStCLEtBQUosQ0FBVXZELElBQVYsQ0FBeEM7QUFDQSxXQUFLLElBQUk2QixJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCTCxrQkFBVUssQ0FBVixJQUFlMEIsTUFBTXZELElBQU4sQ0FBZjtBQUNBLGFBQUssSUFBSThCLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0JOLG9CQUFVSyxDQUFWLEVBQWFDLENBQWIsSUFBa0JYLE9BQU9VLENBQVAsRUFBVUMsQ0FBVixFQUFhRixHQUEvQjtBQUNEO0FBQ0Y7QUFDRCxhQUFPSixTQUFQO0FBQ0Q7OztnQ0FFbUJMLE0sRUFBUTtBQUMxQixVQUFNbkIsT0FBT21CLE9BQU9HLE1BQXBCO0FBQUEsVUFBNEJFLFlBQVksSUFBSStCLEtBQUosQ0FBVXZELElBQVYsQ0FBeEM7QUFDQSxXQUFLLElBQUk2QixJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCTCxrQkFBVUssQ0FBVixJQUFlLElBQUkwQixLQUFKLENBQVV2RCxJQUFWLENBQWY7QUFDQSxhQUFLLElBQUk4QixJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixJQUFwQixFQUEwQjhCLEdBQTFCLEVBQStCO0FBQzdCLGNBQUk4RCxXQUFXekUsT0FBT1UsQ0FBUCxFQUFVQyxDQUFWLENBQWY7QUFDQU4sb0JBQVVLLENBQVYsRUFBYUMsQ0FBYixJQUFrQm5DLEtBQUt5RSxXQUFMLENBQWlCdkMsQ0FBakIsRUFBb0JDLENBQXBCLEVBQXVCWCxPQUFPVSxDQUFQLEVBQVVDLENBQVYsRUFBYUYsR0FBcEMsRUFBeUNqQyxLQUFLbUUsYUFBTCxDQUFtQjNDLE1BQW5CLEVBQTJCVSxDQUEzQixFQUE4QkMsQ0FBOUIsQ0FBekMsQ0FBbEI7QUFDQU4sb0JBQVVLLENBQVYsRUFBYUMsQ0FBYixFQUFnQnVDLEtBQWhCLEdBQXdCdUIsU0FBU3ZCLEtBQWpDLENBSDZCLENBR1c7QUFDekM7QUFDRjtBQUNELGFBQU83QyxTQUFQO0FBQ0Q7OztnQ0FFbUJLLEMsRUFBR0MsQyxFQUFHRixHLEVBQUtpQyxLLEVBQU87QUFDcEMsYUFBTztBQUNMakMsYUFBS0EsR0FEQTtBQUVMSyxrQkFBVSxLQUZMO0FBR0xDLGdCQUFRTCxDQUhIO0FBSUxNLGdCQUFRTCxDQUpIO0FBS0xNLGVBQU8sQ0FMRjtBQU1MMEIsdUJBQWVELEtBTlY7QUFPTFEsZUFBTztBQVBGLE9BQVA7QUFTRDs7O2dDQUVtQmxELE0sRUFBUTtBQUMxQixVQUFNbkIsT0FBT21CLE9BQU9HLE1BQXBCO0FBQUEsVUFBNEJFLFlBQVksSUFBSStCLEtBQUosQ0FBVXZELElBQVYsQ0FBeEM7QUFDQSxXQUFLLElBQUk2QixJQUFJLENBQWIsRUFBZ0JBLElBQUk3QixJQUFwQixFQUEwQjZCLEdBQTFCLEVBQStCO0FBQzdCTCxrQkFBVUssQ0FBVixJQUFlMEIsTUFBTXZELElBQU4sQ0FBZjtBQUNBLGFBQUssSUFBSThCLElBQUksQ0FBYixFQUFnQkEsSUFBSTlCLElBQXBCLEVBQTBCOEIsR0FBMUIsRUFBK0I7QUFDN0IsY0FBSSxRQUFPWCxPQUFPVSxDQUFQLEVBQVVDLENBQVYsQ0FBUCxLQUF1QixRQUEzQixFQUNFTixVQUFVSyxDQUFWLEVBQWFDLENBQWIsSUFBa0JoQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQm9CLE9BQU9VLENBQVAsRUFBVUMsQ0FBVixDQUFsQixDQUFsQjtBQUNGO0FBQ0E7QUFDRDtBQUNGO0FBQ0QsYUFBT04sU0FBUDtBQUNEOzs7Ozs7QUFJSCxJQUFJLE9BQU8xQixPQUFPQyxNQUFkLEtBQXlCLFVBQTdCLEVBQXlDO0FBQ3ZDRCxTQUFPQyxNQUFQLEdBQWdCLFVBQVM4RixNQUFULEVBQWlCO0FBQy9COztBQUNBLFFBQUlBLFdBQVcsSUFBZixFQUFxQjtBQUNuQixZQUFNLElBQUlDLFNBQUosQ0FBYyw0Q0FBZCxDQUFOO0FBQ0Q7O0FBRURELGFBQVMvRixPQUFPK0YsTUFBUCxDQUFUO0FBQ0EsU0FBSyxJQUFJRSxRQUFRLENBQWpCLEVBQW9CQSxRQUFRQyxVQUFVMUUsTUFBdEMsRUFBOEN5RSxPQUE5QyxFQUF1RDtBQUNyRCxVQUFNRSxTQUFTRCxVQUFVRCxLQUFWLENBQWY7QUFDQSxVQUFJRSxXQUFXLElBQWYsRUFBcUI7QUFDbkIsYUFBSyxJQUFJQyxHQUFULElBQWdCRCxNQUFoQixFQUF3QjtBQUN0QixjQUFJbkcsT0FBT3FHLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDbkIsSUFBaEMsQ0FBcUNnQixNQUFyQyxFQUE2Q0MsR0FBN0MsQ0FBSixFQUF1RDtBQUNyREwsbUJBQU9LLEdBQVAsSUFBY0QsT0FBT0MsR0FBUCxDQUFkO0FBQ0Q7QUFDRjtBQUNGO0FBQ0Y7QUFDRCxXQUFPTCxNQUFQO0FBQ0QsR0FsQkQ7QUFtQkQiLCJmaWxlIjoiZ2FtZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IERFRkFVTFRfU0laRSA9IDQ7XG5jb25zdCBERUZBVUxUX0dPQUwgPSAyMDQ4O1xuY29uc3QgREVGQVVMVF9ORVdfQkxPQ0tfQ09VTlQgPSAxO1xuY29uc3QgTkVXX0JMT0NLX1ZBTF9ISUdIID0gNDtcbmNvbnN0IE5FV19CTE9DS19WQUxfTE9XID0gMjtcbmNvbnN0IEhJR0hfTE9XX1JBVElPID0gLjc1O1xuY29uc3QgSElHSF9CTE9DS19QRVJNSVRURUQgPSAxIC8gMjU2O1xuXG5jbGFzcyBHYW1lIHtcblxuICBjb25zdHJ1Y3Rvcihfb3B0cykge1xuXG4gICAgbGV0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgIHNpemU6IERFRkFVTFRfU0laRSxcbiAgICAgIGdvYWw6IERFRkFVTFRfR09BTCxcbiAgICAgIG5ld0Jsb2NrQ291bnQ6IERFRkFVTFRfTkVXX0JMT0NLX0NPVU5ULFxuXG4gICAgfSwgX29wdHMpO1xuXG4gICAgdGhpcy5ib2FyZFVuZG9TdGFjayA9IFtdO1xuICAgIHRoaXMuYm9hcmRSZWRvU3RhY2sgPSBbXTtcbiAgICB0aGlzLnNjb3JlVW5kb1N0YWNrID0gW107XG4gICAgdGhpcy5zY29yZVJlZG9TdGFjayA9IFtdO1xuXG4gICAgdGhpcy5zY29yZSA9IDA7XG4gICAgdGhpcy5vcHRzID0gb3B0cztcblxuICB9XG5cbiAgZ2V0U3RhcnRCbG9ja3MgKGJsb2NrcywgYm9hcmRTaXplKSB7XG4gICAgY29uc3QgbG9jID0gW01hdGguZmxvb3IoYm9hcmRTaXplICogTWF0aC5yYW5kb20oKSksIE1hdGguZmxvb3IoYm9hcmRTaXplICogTWF0aC5yYW5kb20oKSldO1xuICAgIGlmICghYmxvY2tzLnNvbWUoYiA9PiBiWzBdID09PSBsb2NbMF0gJiYgYlsxXSA9PT0gbG9jWzFdKSkge1xuICAgICAgYmxvY2tzLnB1c2gobG9jKTtcbiAgICAgIHJldHVybiBibG9ja3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN0YXJ0QmxvY2tzKGJsb2NrcywgYm9hcmRTaXplKTtcbiAgICB9XG4gIH1cblxuICBnYW1lU3RhdHVzICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0dXM7XG4gIH1cblxuICBnZXROZXdCbG9ja3MgKG1hdHJpeCwgY291bnQsIG5ld0Jsb2Nrcykge1xuICAgIGlmICgwID09PSBjb3VudC0tKSByZXR1cm4gbmV3QmxvY2tzO1xuICAgIGNvbnN0IGJvYXJkU2l6ZSA9IG1hdHJpeC5sZW5ndGgsIGF2YWlsYWJsZSA9IFtdO1xuICAgIGNvbnN0IG5ld01hdHJpeCA9IEdhbWUuY2xvbmVNYXRyaXgobWF0cml4KTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJvYXJkU2l6ZTsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJvYXJkU2l6ZTsgaisrKSB7XG4gICAgICAgIGlmICghbWF0cml4W2ldW2pdLnZhbCkgYXZhaWxhYmxlLnB1c2goe3k6IGksIHg6IGp9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWF2YWlsYWJsZS5sZW5ndGgpIHJldHVybiBuZXdCbG9ja3M7XG5cbiAgICBjb25zdCBjID0gYXZhaWxhYmxlW01hdGguZmxvb3IoYXZhaWxhYmxlLmxlbmd0aCAqIE1hdGgucmFuZG9tKCkpXTtcbiAgICBuZXdCbG9ja3MucHVzaChjKTtcbiAgICBuZXdNYXRyaXhbYy55XVtjLnhdLnZhbCA9IDI7XG4gICAgcmV0dXJuIHRoaXMuZ2V0TmV3QmxvY2tzKG5ld01hdHJpeCwgY291bnQsIG5ld0Jsb2Nrcyk7XG4gIH1cblxuICBtYXliZUdldEJsb2NrIChibG9ja3MsIHgsIHkpIHtcbiAgICBjb25zdCB2YWwgPSBibG9ja3Muc29tZShiID0+IGJbMF0gPT09IHggJiYgYlsxXSA9PT0geSkgPyAyIDogMDtcbiAgICByZXR1cm4geyB2YWwsIGNvbWJpbmVkOiBmYWxzZSwgc3RhcnRZOiB5LCBzdGFydFg6IHgsIG1vdmVkOiAwIH07XG4gIH1cblxuICBuZXdHYW1lIChuZXdPcHRzKSB7XG4gICAgdGhpcy5zdGF0dXMgPSAnYWN0aXZlJztcbiAgICBsZXQgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMub3B0cywgbmV3T3B0cyk7XG4gICAgdGhpcy5ib2FyZFNpemUgPSBvcHRzLnNpemU7XG4gICAgdGhpcy5tYXhCbG9ja1ZhbHVlID0gMjtcbiAgICB0aGlzLmJvYXJkVW5kb1N0YWNrID0gW107XG4gICAgdGhpcy5ib2FyZFJlZG9TdGFjayA9IFtdO1xuICAgIHRoaXMuc2NvcmVVbmRvU3RhY2sgPSBbXTtcbiAgICB0aGlzLnNjb3JlUmVkb1N0YWNrID0gW107XG5cbiAgICBsZXQgbmV3R29hbDtcblxuICAgIHN3aXRjaCAodGhpcy5ib2FyZFNpemUpIHtcbiAgICAgIGNhc2UgMjogbmV3R29hbCA9IDMyOyBicmVhaztcbiAgICAgIGNhc2UgMzogbmV3R29hbCA9IDUxMjsgYnJlYWs7XG4gICAgICBjYXNlIDQ6IG5ld0dvYWwgPSAyMDQ4OyBicmVhaztcbiAgICAgIGNhc2UgNTogbmV3R29hbCA9IDgxOTI7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogbmV3R29hbCA9IDMyNzY4OyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLm9wdHMuZ29hbCA9IG9wdHMuZ29hbCA9IG5ld0dvYWw7XG5cbiAgICBsZXQgZ2FtZUJsb2NrcyA9IHRoaXMuZ2V0U3RhcnRCbG9ja3MoW10sIHRoaXMuYm9hcmRTaXplKTtcbiAgICBnYW1lQmxvY2tzID0gdGhpcy5nZXRTdGFydEJsb2NrcyhnYW1lQmxvY2tzLCB0aGlzLmJvYXJkU2l6ZSk7XG5cbiAgICB0aGlzLnJvd3MgPSBbXTtcbiAgICB0aGlzLnNjb3JlID0gMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5ib2FyZFNpemU7IGkrKykge1xuICAgICAgY29uc3Qgcm93ID0gW107XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuYm9hcmRTaXplOyBqKyspIHtcbiAgICAgICAgcm93LnB1c2godGhpcy5tYXliZUdldEJsb2NrKGdhbWVCbG9ja3MsIGksIGopKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucm93cy5wdXNoKHJvdyk7XG4gICAgfVxuICAgIHRoaXMucm93cyA9IEdhbWUudXBkYXRlUHJvcHModGhpcy5yb3dzKTtcbiAgfVxuXG4gIGNvbWJpbmVWYWx1ZXNVcCAobWF0cml4LCBzZWNvbmRQYXNzKSB7XG4gICAgY29uc3Qgc2l6ZSA9IG1hdHJpeC5sZW5ndGgsIGNvbWJpbmVkID0gR2FtZS5jbG9uZU1hdHJpeChtYXRyaXgpO1xuXG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgIGxldCBzaXplX3IgPSBzaXplO1xuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplX3IgLSAxOyB5KyspIHtcbiAgICAgICAgbGV0IGN1ckJsb2NrID0gY29tYmluZWRbeV1beF0sXG4gICAgICAgICAgbmV4dEJsb2NrID0gY29tYmluZWRbeSArIDFdW3hdO1xuXG4gICAgICAgIGlmIChjdXJCbG9jay52YWwgPT09IDApIHtcbiAgICAgICAgICBsZXQgeTE7XG4gICAgICAgICAgZm9yICh5MSA9IHk7IHkxIDwgc2l6ZV9yIC0gMTsgeTErKykge1xuICAgICAgICAgICAgY29tYmluZWRbeTFdW3hdID0gT2JqZWN0LmFzc2lnbih7fSwgY29tYmluZWRbeTEgKyAxXVt4XSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbWJpbmVkW3kxXVt4XS52YWwgPSAwO1xuICAgICAgICAgIHktLTsgc2l6ZV9yLS07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGN1ckJsb2NrLnZhbCA9PT0gbmV4dEJsb2NrLnZhbCAmJiAhY3VyQmxvY2suY29tYmluZWQgJiYgIW5leHRCbG9jay5jb21iaW5lZCkge1xuICAgICAgICAgICAgbGV0IHkxO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBjdXJCbG9jay52YWwgKiAyO1xuXG4gICAgICAgICAgICBjb21iaW5lZFt5XVt4XSA9IE9iamVjdC5hc3NpZ24oe30sIG5leHRCbG9jaywgeyBjb21iaW5lZDogeyB5OiBjdXJCbG9jay5zdGFydFksIHg6IGN1ckJsb2NrLnN0YXJ0WCB9LCB2YWw6IG5ld1ZhbHVlfSk7XG4gICAgICAgICAgICBuZXh0QmxvY2sudmFsID0gMDtcbiAgICAgICAgICAgIGZvciAoeTEgPSB5KzE7IHkxIDwgc2l6ZV9yIC0gMTsgeTErKykge1xuICAgICAgICAgICAgICBjb21iaW5lZFt5MV1beF0gPSBPYmplY3QuYXNzaWduKHsgfSwgY29tYmluZWRbeTEgKyAxXVt4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21iaW5lZFt5MV1beF0udmFsID0gMDtcbiAgICAgICAgICAgIHktLTsgc2l6ZV9yLS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFzZWNvbmRQYXNzKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21iaW5lVmFsdWVzVXAoY29tYmluZWQsIHRydWUpO1xuICAgIH1cbiAgICByZXR1cm4gY29tYmluZWQ7XG4gIH1cblxuICBnZXRCbG9ja01vdmVtZW50cyAoZGlyZWN0aW9uKSB7XG4gICAgY29uc3Qgc2l6ZSA9IHRoaXMucm93cy5sZW5ndGgsIGJsb2NrcyA9IFtdO1xuXG4gICAgY29uc3QgcHJldmlldyA9IHRoaXMubW92ZUJsb2NrcyhkaXJlY3Rpb24pO1xuXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIGJsb2Nrcy5wdXNoKG5ldyBBcnJheShzaXplKSk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICBibG9ja3NbeV1beF0gPSAwO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgLy8gIGxldCBibG9jayA9IHRoaXMucm93c1t5XVt4XTtcbiAgICAgICAgbGV0IG5ld0Jsb2NrID0gcHJldmlld1t5XVt4XTtcblxuICAgICAgICBsZXQgZHggPSAwLCBkeSA9IDA7XG5cbiAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICBjYXNlICd1cCc6XG4gICAgICAgICAgY2FzZSAnZG93bic6XG4gICAgICAgICAgICBkeSA9IHkgLSBuZXdCbG9jay5zdGFydFk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICAgIGR4ID0geCAtIG5ld0Jsb2NrLnN0YXJ0WCA7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coeSx4LGR5LGR4LG4sYmxvY2ssbmV3QmxvY2spXG5cbiAgICAgICAgaWYgKChkeSB8fCBkeCkgICYmIG5ld0Jsb2NrLnZhbClcbiAgICAgICAgICBibG9ja3NbbmV3QmxvY2suc3RhcnRZXVtuZXdCbG9jay5zdGFydFhdID0geyBkeSwgZHggfTtcblxuICAgICAgICBpZiAobmV3QmxvY2suY29tYmluZWQpIHtcbiAgICAgICAgICBsZXQgZHggPSAwLCBkeSA9IDA7XG4gICAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ3VwJzpcbiAgICAgICAgICAgIGNhc2UgJ2Rvd24nOlxuICAgICAgICAgICAgICBkeSA9IHkgLSBuZXdCbG9jay5jb21iaW5lZC55OyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICBkeCA9IHggLSBuZXdCbG9jay5jb21iaW5lZC54IDsgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coeSx4LGR5LGR4LG5ld0Jsb2NrLmNvbWJpbmVkKVxuXG4gICAgICAgICAgaWYgKChkeSB8fCBkeCkgICYmIG5ld0Jsb2NrLnZhbClcbiAgICAgICAgICAgIGJsb2Nrc1tuZXdCbG9jay5jb21iaW5lZC55XVtuZXdCbG9jay5jb21iaW5lZC54XSA9IHsgZHksIGR4LCByZW1vdmVkOiB0cnVlIH07XG4gICAgICAgICAgICBibG9ja3NbeV1beF0gPSBPYmplY3QuYXNzaWduKHsgY29tYmluZWQ6IHRydWUgfSwgYmxvY2tzW3ldW3hdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBibG9ja3M7XG4gIH1cblxuICBnZXROZXdCbG9ja1ZhbHVlIChub3RSYW5kb20pIHtcbiAgICByZXR1cm4gKHRoaXMubWF4QmxvY2tWYWx1ZSA+PSB0aGlzLm9wdHMuZ29hbCAqIEhJR0hfQkxPQ0tfUEVSTUlUVEVEICYmIChub3RSYW5kb20gfHwgTWF0aC5yYW5kb20oKSA+IEhJR0hfTE9XX1JBVElPKSkgPyBORVdfQkxPQ0tfVkFMX0hJR0g6IE5FV19CTE9DS19WQUxfTE9XO1xuICB9XG5cbiAgcHJvY2Vzc01vdmUgKGRpcmVjdGlvbikge1xuXG4gICAgY29uc3Qgc2l6ZSA9IHRoaXMucm93cy5sZW5ndGgsIG1vdmVzID0gW107XG5cbiAgICBpZiAodGhpcy5zdGF0dXMgIT09ICdhY3RpdmUnKVxuICAgICAgcmV0dXJuO1xuXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgIGlmICh0aGlzLnJvd3NbeV1beF0ucG9zc2libGVNb3Zlcy5sZW5ndGgpXG4gICAgICAgIG1vdmVzLnB1c2godGhpcy5yb3dzW3ldW3hdLnBvc3NpYmxlTW92ZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbW92ZXMuc29tZShiID0+IGIuc29tZShtID0+IG0gPT09IGRpcmVjdGlvbikpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5ib2FyZFVuZG9TdGFjay5wdXNoKCB0aGlzLnJvd3MgKTtcbiAgICB0aGlzLmJvYXJkUmVkb1N0YWNrID0gW107XG5cbiAgICB0aGlzLnJvd3MgPSB0aGlzLm1vdmVCbG9ja3MoZGlyZWN0aW9uKTtcblxuICAgIGlmICh0aGlzLmNoZWNrV2luKCkpIHJldHVybjtcblxuICAgIHRoaXMubmV3QmxvY2tzID0gdGhpcy5nZXROZXdCbG9ja3ModGhpcy5yb3dzLCB0aGlzLm9wdHMubmV3QmxvY2tDb3VudCwgW10pO1xuICAgIGNvbnN0IG5ld1ZhbCA9IHRoaXMuZ2V0TmV3QmxvY2tWYWx1ZSgpO1xuICAgIHRoaXMubmV3QmxvY2tzLmZvckVhY2goYyA9PiB7XG4gICAgICBPYmplY3QuYXNzaWduKHRoaXMucm93c1tjLnldW2MueF0sIEdhbWUuZ2V0RGVmYXVsdHMoYy55LCBjLngsIG5ld1ZhbCwgW10pLCB7IGlzTmV3OiB0cnVlIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zY29yZVVuZG9TdGFjay5wdXNoKCB0aGlzLnNjb3JlICk7XG4gICAgdGhpcy5zY29yZVJlZG9TdGFjayA9IFtdO1xuXG4gICAgdGhpcy5zY29yZSArPSB0aGlzLmdldE1vdmVTY29yZSgpO1xuXG4gICAgdGhpcy5yb3dzID0gR2FtZS51cGRhdGVQcm9wcyh0aGlzLnJvd3MpO1xuXG4gICAgdGhpcy5jaGVja0xvc3MoKTtcblxuICB9XG5cbiAgY2hlY2tXaW4gKCkge1xuICAgIGNvbnN0IHNpemUgPSB0aGlzLnJvd3MubGVuZ3RoO1xuICAgIHRoaXMubWF4QmxvY2tWYWx1ZSA9IE5FV19CTE9DS19WQUxfTE9XO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc2l6ZTsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICBpZiAodGhpcy5yb3dzW3ldW3hdLnZhbCA+PSB0aGlzLm1heEJsb2NrVmFsdWUpIHtcbiAgICAgICAgICB0aGlzLm1heEJsb2NrVmFsdWUgPSB0aGlzLnJvd3NbeV1beF0udmFsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm1heEJsb2NrVmFsdWUgPj0gdGhpcy5vcHRzLmdvYWwpIHtcbiAgICAgIHRoaXMuc3RhdHVzID0gJ3dpbic7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja0xvc3MgKCkge1xuICAgIGNvbnN0IHNpemUgPSB0aGlzLnJvd3MubGVuZ3RoLCBtb3ZlcyA9IFtdO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc2l6ZTsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICBtb3Zlcy5wdXNoKHRoaXMucm93c1t5XVt4XS5wb3NzaWJsZU1vdmVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFtb3Zlcy5zb21lKGIgPT4gYi5sZW5ndGggIT09IDApKSB7XG4gICAgICB0aGlzLnN0YXR1cyA9ICdsb3NzJzsgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbW92ZUJsb2NrcyAoZGlyZWN0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtTWF0cml4KGRpcmVjdGlvbiwgdGhpcy5jb21iaW5lVmFsdWVzVXApO1xuICB9XG5cbiAgdW5kbyAoKSB7XG4gICAgaWYgKHRoaXMuYm9hcmRVbmRvU3RhY2subGVuZ3RoKSB7XG4gICAgICB0aGlzLnN0YXR1cyA9ICdhY3RpdmUnO1xuICAgICAgY29uc3QgcmVkbyA9IHRoaXMucm93cywgcmVkb1Njb3JlID0gdGhpcy5zY29yZTtcbiAgICAgIHRoaXMucm93cyA9IHRoaXMuYm9hcmRVbmRvU3RhY2sucG9wKCk7XG4gICAgICB0aGlzLnNjb3JlID0gdGhpcy5zY29yZVVuZG9TdGFjay5wb3AoKTtcbiAgICAgIHRoaXMuYm9hcmRSZWRvU3RhY2sucHVzaChyZWRvKTtcbiAgICAgIHRoaXMuc2NvcmVSZWRvU3RhY2sucHVzaChyZWRvU2NvcmUpO1xuICAgIH1cbiAgfVxuXG4gIHJlZG8gKCkge1xuICAgIGlmICh0aGlzLmJvYXJkUmVkb1N0YWNrLmxlbmd0aCkge1xuICAgICAgY29uc3QgdW5kbyA9IHRoaXMucm93cywgdW5kb1Njb3JlID0gdGhpcy5zY29yZTtcbiAgICAgIHRoaXMucm93cyA9IHRoaXMuYm9hcmRSZWRvU3RhY2sucG9wKCk7XG4gICAgICB0aGlzLnNjb3JlID0gdGhpcy5zY29yZVJlZG9TdGFjay5wb3AoKTtcbiAgICAgIHRoaXMuYm9hcmRVbmRvU3RhY2sucHVzaCh1bmRvKTtcbiAgICAgIHRoaXMuc2NvcmVVbmRvU3RhY2sucHVzaCh1bmRvU2NvcmUpO1xuICAgICAgdGhpcy5jaGVja1dpbigpO1xuICAgICAgdGhpcy5jaGVja0xvc3MoKTtcbiAgICB9XG4gIH1cblxuICBnZXRNb3ZlU2NvcmUgKCkge1xuICAgIGxldCBtb3ZlU2NvcmUgPSAwLCBtYXRyaXggPSB0aGlzLnJvd3M7XG4gICAgY29uc3Qgc2l6ZSA9IG1hdHJpeC5sZW5ndGg7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgIGlmIChtYXRyaXhbeV1beF0uY29tYmluZWQpIHtcbiAgICAgICAgICBtb3ZlU2NvcmUgKz0gbWF0cml4W3ldW3hdLnZhbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW92ZVNjb3JlO1xuICB9O1xuXG4gIHRyYW5zZm9ybU1hdHJpeCAoZGlyZWN0aW9uLCBjb21iaW5lRm4pIHtcbiAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgIHJldHVybiBHYW1lLnJvdGF0ZSgnbGVmdCcsIGNvbWJpbmVGbi5jYWxsKHRoaXMsIEdhbWUucm90YXRlKCdyaWdodCcsIHRoaXMucm93cykpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgIHJldHVybiBHYW1lLnJvdGF0ZSgncmlnaHQnLCBjb21iaW5lRm4uY2FsbCh0aGlzLCBHYW1lLnJvdGF0ZSgnbGVmdCcsIHRoaXMucm93cykpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd1cCc6XG4gICAgICAgIHJldHVybiBjb21iaW5lRm4uY2FsbCh0aGlzLCB0aGlzLnJvd3MpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2Rvd24nOlxuICAgICAgICByZXR1cm4gR2FtZS5mbGlwKGNvbWJpbmVGbi5jYWxsKHRoaXMsIEdhbWUuZmxpcCh0aGlzLnJvd3MpKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuOyBicmVhaztcbiAgICB9XG4gIH07XG5cbiAgLy8gbWF0cml4IGhlbHBlcnNcblxuICBzdGF0aWMgdHJhbnNwb3NlIChtYXRyaXgpIHtcbiAgICBjb25zdCBzaXplID0gbWF0cml4Lmxlbmd0aCwgdHJhbnMgPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIHRyYW5zW3ldID0gbmV3IEFycmF5KHNpemUpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgdHJhbnNbeV1beF0gPSBPYmplY3QuYXNzaWduKHt9LCBtYXRyaXhbeF1beV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJhbnM7XG4gIH07XG5cbiAgc3RhdGljIHJldmVyc2VFYWNoUm93IChtYXRyaXgpIHtcblxuICAgIGNvbnN0IHNpemUgPSBtYXRyaXgubGVuZ3RoLCByZXZlcnNlZCA9IG5ldyBBcnJheShzaXplKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgcmV2ZXJzZWRbeV0gPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICByZXZlcnNlZFt5XVt4XSA9IE9iamVjdC5hc3NpZ24oe30sIG1hdHJpeFt5XVtzaXplIC0geCAtIDFdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldmVyc2VkO1xuICB9O1xuXG4gIHN0YXRpYyByZXZlcnNlRWFjaENvbHVtbiAobWF0cml4KSB7XG5cbiAgICBjb25zdCBzaXplID0gbWF0cml4Lmxlbmd0aCwgcmV2ZXJzZWQgPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIHJldmVyc2VkW3ldID0gbmV3IEFycmF5KHNpemUpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgcmV2ZXJzZWRbeV1beF0gPSBPYmplY3QuYXNzaWduKHt9LCBtYXRyaXhbc2l6ZSAtIHkgLSAxXVt4XSk7XG4gICAgICB9XG4gICAgICAvL3JldmVyc2VkW3ldID0gT2JqZWN0LmFzc2lnbih7fSwgbWF0cml4W3NpemUgLSB5IC0gMV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV2ZXJzZWQ7XG4gIH07XG5cbiAgc3RhdGljIHByaW50TWF0cml4IChtYXRyaXgpIHtcbiAgICBjb25zdCBzaXplID0gbWF0cml4Lmxlbmd0aDtcbiAgICBjb25zb2xlLmxvZygnLS0tLScpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgc2l6ZTsgeSsrKSB7XG4gICAgICBsZXQgcm93ID0gJyc7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICByb3cgKz0gbWF0cml4W3ldW3hdLnZhbCArICcgJztcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKHJvdyk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCctLS0tJyk7XG4gIH07XG5cbiAgc3RhdGljIHJvdGF0ZSAoZGlyZWN0aW9uLCBtYXRyaXgpIHtcbiAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgIHJldHVybiBHYW1lLnJldmVyc2VFYWNoQ29sdW1uKEdhbWUudHJhbnNwb3NlKG1hdHJpeCkpO1xuICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICByZXR1cm4gR2FtZS5yZXZlcnNlRWFjaFJvdyhHYW1lLnRyYW5zcG9zZShtYXRyaXgpKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gbWF0cml4O1xuICB9O1xuXG4gIHN0YXRpYyBmbGlwIChtYXRyaXgpIHtcbiAgICByZXR1cm4gR2FtZS5yZXZlcnNlRWFjaFJvdyhHYW1lLnJldmVyc2VFYWNoQ29sdW1uKEdhbWUuY2xvbmVNYXRyaXgobWF0cml4KSkpO1xuICB9O1xuXG4gIHN0YXRpYyBhZGRQcm9wcyAobWF0cml4KSB7XG4gICAgY29uc3Qgc2l6ZSA9IG1hdHJpeC5sZW5ndGgsIG5ld01hdHJpeCA9IG5ldyBBcnJheShzaXplKTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHNpemU7IHkrKykge1xuICAgICAgbmV3TWF0cml4W3ldID0gbmV3IEFycmF5KHNpemUpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgbmV3TWF0cml4W3ldW3hdID0gR2FtZS5nZXREZWZhdWx0cyh5LCB4LCBtYXRyaXhbeV1beF0sIFtdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIEdhbWUudXBkYXRlUHJvcHMobmV3TWF0cml4KTtcbiAgfTtcblxuICBzdGF0aWMgcG9zc2libGVNb3ZlcyAobWF0cml4LCB5LCB4KSAge1xuICAgIGNvbnN0IHNpemUgPSBtYXRyaXgubGVuZ3RoLCBtb3ZlcyA9IFtdO1xuICAgIGNvbnN0IG5icyA9IFtbLTEsIDAsICd1cCddLCBbMCwgLTEsICdsZWZ0J10sIFswLCAxLCAncmlnaHQnXSwgWzEsIDAsICdkb3duJ11dO1xuICAgIGZvciAobGV0IGo9MDsgajxuYnMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGNvbnN0IHkxID0geSArIG5ic1tqXVswXSwgeDEgPSB4ICsgbmJzW2pdWzFdO1xuICAgICAgaWYgKHgxID49IDAgJiYgeTEgPj0gMCAmJiB4MSA8IHNpemUgJiYgeTEgPCBzaXplKSB7XG4gICAgICAgIGlmIChtYXRyaXhbeV1beF0udmFsICYmIChtYXRyaXhbeTFdW3gxXS52YWwgPT09IG1hdHJpeFt5XVt4XS52YWwgfHwgIW1hdHJpeFt5MV1beDFdLnZhbCkpXG4gICAgICAgICAgbW92ZXMucHVzaChuYnNbal1bMl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW92ZXM7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlUHJvcHMgKG1hdHJpeCkge1xuICAgIGNvbnN0IHNpemUgPSBtYXRyaXgubGVuZ3RoLCBuZXdNYXRyaXggPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIG5ld01hdHJpeFt5XSA9IEFycmF5KHNpemUpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgbmV3TWF0cml4W3ldW3hdID0gbWF0cml4W3ldW3hdLnZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld01hdHJpeDtcbiAgfTtcblxuICBzdGF0aWMgdXBkYXRlUHJvcHMgKG1hdHJpeCkge1xuICAgIGNvbnN0IHNpemUgPSBtYXRyaXgubGVuZ3RoLCBuZXdNYXRyaXggPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIG5ld01hdHJpeFt5XSA9IG5ldyBBcnJheShzaXplKTtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgc2l6ZTsgeCsrKSB7XG4gICAgICAgIGxldCBvbGRQcm9wcyA9IG1hdHJpeFt5XVt4XTtcbiAgICAgICAgbmV3TWF0cml4W3ldW3hdID0gR2FtZS5nZXREZWZhdWx0cyh5LCB4LCBtYXRyaXhbeV1beF0udmFsLCBHYW1lLnBvc3NpYmxlTW92ZXMobWF0cml4LCB5LCB4KSk7XG4gICAgICAgIG5ld01hdHJpeFt5XVt4XS5pc05ldyA9IG9sZFByb3BzLmlzTmV3OyAvLyB0b2RvOiB3aHkgYXJlIHdlIHVzaW5nIGdldERlZmF1bHRzIGFib3ZlP1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3TWF0cml4O1xuICB9O1xuXG4gIHN0YXRpYyBnZXREZWZhdWx0cyAoeSwgeCwgdmFsLCBtb3Zlcykge1xuICAgIHJldHVybiB7XG4gICAgICB2YWw6IHZhbCxcbiAgICAgIGNvbWJpbmVkOiBmYWxzZSxcbiAgICAgIHN0YXJ0WTogeSxcbiAgICAgIHN0YXJ0WDogeCxcbiAgICAgIG1vdmVkOiAwLFxuICAgICAgcG9zc2libGVNb3ZlczogbW92ZXMsXG4gICAgICBpc05ldzogZmFsc2VcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgY2xvbmVNYXRyaXggKG1hdHJpeCkge1xuICAgIGNvbnN0IHNpemUgPSBtYXRyaXgubGVuZ3RoLCBuZXdNYXRyaXggPSBuZXcgQXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgIG5ld01hdHJpeFt5XSA9IEFycmF5KHNpemUpO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtYXRyaXhbeV1beF0gPT0gJ29iamVjdCcpXG4gICAgICAgICAgbmV3TWF0cml4W3ldW3hdID0gT2JqZWN0LmFzc2lnbih7fSwgbWF0cml4W3ldW3hdKTtcbiAgICAgICAgLy9lbHNlXG4gICAgICAgIC8vbmV3TWF0cml4W3ldW3hdID0gbWF0cml4W3ldW3hdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3TWF0cml4O1xuICB9XG5cbn1cblxuaWYgKHR5cGVvZiBPYmplY3QuYXNzaWduICE9PSAnZnVuY3Rpb24nKSB7XG4gIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgdGFyZ2V0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgZm9yIChsZXQgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XG4gICAgICBpZiAoc291cmNlICE9PSBudWxsKSB7XG4gICAgICAgIGZvciAobGV0IGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfTtcbn0iXX0=
'use strict';

riot.tag2('about', '<div> <div class="close" onclick="{closeAbout}">x</div> <h2>2048 <small>Enhanced!</small></h2> <p> By Matt Motherway </p> <p> Object: Use the arrow keys or swipe to get at least one block face value to {opts.goal}. </p> <p> <a href="https://github.com/webxl/2048-riot" onclick="{goToThisUrl}">GitHub Project</a> </p> </div>', '', '', function (opts) {

  this.closeAbout = function () {
    this.parent.aboutVisible = false;
    this.unmount(true);
    this.parent.update();
  }.bind(this);
  this.goToThisUrl = function (e) {

    window.location = e.target.href;
  }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0LmpzIl0sIm5hbWVzIjpbInJpb3QiLCJ0YWcyIiwib3B0cyIsImNsb3NlQWJvdXQiLCJwYXJlbnQiLCJhYm91dFZpc2libGUiLCJ1bm1vdW50IiwidXBkYXRlIiwiYmluZCIsImdvVG9UaGlzVXJsIiwiZSIsIndpbmRvdyIsImxvY2F0aW9uIiwidGFyZ2V0IiwiaHJlZiJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsS0FBS0MsSUFBTCxDQUFVLE9BQVYsRUFBbUIscVVBQW5CLEVBQTBWLEVBQTFWLEVBQThWLEVBQTlWLEVBQWtXLFVBQVNDLElBQVQsRUFBZTs7QUFFN1csT0FBS0MsVUFBTCxHQUFrQixZQUFXO0FBQzNCLFNBQUtDLE1BQUwsQ0FBWUMsWUFBWixHQUEyQixLQUEzQjtBQUNBLFNBQUtDLE9BQUwsQ0FBYSxJQUFiO0FBQ0EsU0FBS0YsTUFBTCxDQUFZRyxNQUFaO0FBQ0QsR0FKaUIsQ0FJaEJDLElBSmdCLENBSVgsSUFKVyxDQUFsQjtBQUtBLE9BQUtDLFdBQUwsR0FBbUIsVUFBU0MsQ0FBVCxFQUFZOztBQUU3QkMsV0FBT0MsUUFBUCxHQUFrQkYsRUFBRUcsTUFBRixDQUFTQyxJQUEzQjtBQUNELEdBSGtCLENBR2pCTixJQUhpQixDQUdaLElBSFksQ0FBbkI7QUFJSCxDQVhEIiwiZmlsZSI6ImFib3V0LmpzIiwic291cmNlc0NvbnRlbnQiOlsicmlvdC50YWcyKCdhYm91dCcsICc8ZGl2PiA8ZGl2IGNsYXNzPVwiY2xvc2VcIiBvbmNsaWNrPVwie2Nsb3NlQWJvdXR9XCI+eDwvZGl2PiA8aDI+MjA0OCA8c21hbGw+RW5oYW5jZWQhPC9zbWFsbD48L2gyPiA8cD4gQnkgTWF0dCBNb3RoZXJ3YXkgPC9wPiA8cD4gT2JqZWN0OiBVc2UgdGhlIGFycm93IGtleXMgb3Igc3dpcGUgdG8gZ2V0IGF0IGxlYXN0IG9uZSBibG9jayBmYWNlIHZhbHVlIHRvIHtvcHRzLmdvYWx9LiA8L3A+IDxwPiA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3dlYnhsLzIwNDgtcmlvdFwiIG9uY2xpY2s9XCJ7Z29Ub1RoaXNVcmx9XCI+R2l0SHViIFByb2plY3Q8L2E+IDwvcD4gPC9kaXY+JywgJycsICcnLCBmdW5jdGlvbihvcHRzKSB7XG5cbiAgICB0aGlzLmNsb3NlQWJvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucGFyZW50LmFib3V0VmlzaWJsZSA9IGZhbHNlO1xuICAgICAgdGhpcy51bm1vdW50KHRydWUpO1xuICAgICAgdGhpcy5wYXJlbnQudXBkYXRlKCk7XG4gICAgfS5iaW5kKHRoaXMpXG4gICAgdGhpcy5nb1RvVGhpc1VybCA9IGZ1bmN0aW9uKGUpIHtcblxuICAgICAgd2luZG93LmxvY2F0aW9uID0gZS50YXJnZXQuaHJlZjtcbiAgICB9LmJpbmQodGhpcylcbn0pOyJdfQ==
'use strict';

riot.tag2('app', '<header> <div class="controls"> <button type="button" name="button" id="newGame" onclick="{newGame}">New Game</button> <div class="sizeWrapper"> <button type="button" name="button" id="setSize" onclick="{showSizeDropdown}">Size: {boardSize} &#9660; </button> <size if="{settingSize()}"></size> </div> <div class="undoWrapper"> <button id="undo" onclick="{undoClick}" disabled="{getUndoDisabledProp()}">Undo</button> <button id="redo" onclick="{redoClick}" disabled="{getRedoDisabledProp()}">Redo</button> </div> </div> <goal title="Use the arrow keys or swipe to get at least one block face value to {goal}" onclick="{showAbout}">{goal}</goal> <about if="{aboutVisible}" goal="{goal}"></about> <score gamescore="{gameScore}" diffscore="{getDiffScore()}"></score> </header> <winlose class="{gameStatus}" gamestatus="{gameStatus}"></winlose> <board ref="board" game="{game}"></board> <div class="status"> Game status: <input onkeydown="{handleKeyDown}" onkeypress="{handleKeyPress}" onclick="{updateGame}" ref="input" name="test" riot-value="{gameStatus}" readonly> </div>', '', 'onclick="{setFocus}"', function (opts) {
  var _this = this;

  var DRAG_ENABLED = false;

  this.boardSize = 4;
  this.gameScore = 0;
  this.aboutVisible = false;
  this.settingBoardSize = false;

  this.game = new Game({
    size: this.boardSize
  });
  this.game.newGame();

  this.goal = this.game.opts.goal;

  this.isTouchEnabled = "ontouchstart" in document.documentElement;

  this.on('mount', function () {

    setTimeout(_this.setFocus, 300);

    document.documentElement.className += _this.isTouchEnabled ? ' touch' : ' no-touch';

    var mc = new Hammer.Manager(_this.refs.board.root);

    var swipe = new Hammer.Swipe({
      threshold: 20
    });

    if (DRAG_ENABLED) {
      var pan = new Hammer.Pan({
        threshold: 5
      });
      pan.recognizeWith(swipe);
      mc.add(pan);
      mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

      mc.on("pan", function (ev) {
        var dir = void 0,
            axis = void 0;

        switch (ev.direction) {
          case Hammer.DIRECTION_LEFT:
            dir = 'left';axis = 'x';break;
          case Hammer.DIRECTION_RIGHT:
            dir = 'right';axis = 'x';break;
          case Hammer.DIRECTION_UP:
            dir = 'up';axis = 'y';break;
          case Hammer.DIRECTION_DOWN:
            dir = 'down';axis = 'y';break;
        }

        vent.trigger('drag', dir, axis === 'x' ? ev.deltaX : 0, axis === 'y' ? ev.deltaY : 0);
      });

      mc.on("panstart1", function (ev) {
        var START_X = 0,
            START_Y = 0;
        var dir = void 0;

        switch (ev.direction) {
          case Hammer.DIRECTION_LEFT:
            dir = 'left';break;
          case Hammer.DIRECTION_RIGHT:
            dir = 'right';break;
          case Hammer.DIRECTION_UP:
            dir = 'up';break;
          case Hammer.DIRECTION_DOWN:
            dir = 'down';break;
        }
      });
    }

    mc.add(swipe);

    mc.on('swipe', function (e) {
      var dir = void 0;
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
  });

  this.handleKeyDown = function (e) {

    if (e.keyCode === 90 && (e.metaKey || e.ctrlKey)) {
      this.undoClick();
      e.preventDefault();
      return;
    }

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
  }.bind(this);

  this.newGame = function (e) {
    this.game.newGame({
      size: this.boardSize
    });
    this.trigger('newgame');
    this.gameStatus = 'active';
    this.gameScore = 0;
    this.goal = this.game.opts.goal;

    this.updateGame();
  }.bind(this);

  this.setFocus = function (e) {
    if (this.isTouchEnabled) return;

    this.refs.input.focus();
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

  this.on('move', function () {
    _this.gameStatus = _this.game.gameStatus();
    _this.gameScore = _this.game.score;
    _this.update();
  });

  this.handleKeyPress = function (e) {

    if (!(e.ctrlKey || e.metaKey || e.altKey)) {
      e.stopPropagation();
    }
  }.bind(this);

  this.getMovingClass = function () {
    return "moving-" + this.lastMoveDirection;
  }.bind(this);

  this.settingSize = function () {
    return this.settingBoardSize;
  }.bind(this);

  this.setBoardSize = function (val) {
    this.settingBoardSize = false;
    this.boardSize = val;
    this.update();
  }.bind(this);

  this.showSizeDropdown = function () {
    this.settingBoardSize = !this.settingBoardSize;
  }.bind(this);

  this.getUndoDisabledProp = function () {
    return this.game.boardUndoStack.length ? '' : 'disabled';
  }.bind(this);

  this.getRedoDisabledProp = function () {
    return this.game.boardRedoStack.length ? '' : 'disabled';
  }.bind(this);

  this.showAbout = function () {
    this.aboutVisible = true;
  }.bind(this);

  var curScore = 0;

  this.getDiffScore = function () {
    var diff = this.gameScore - curScore;
    curScore = this.gameScore;
    return diff;
  }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyJdLCJuYW1lcyI6WyJyaW90IiwidGFnMiIsIm9wdHMiLCJEUkFHX0VOQUJMRUQiLCJib2FyZFNpemUiLCJnYW1lU2NvcmUiLCJhYm91dFZpc2libGUiLCJzZXR0aW5nQm9hcmRTaXplIiwiZ2FtZSIsIkdhbWUiLCJzaXplIiwibmV3R2FtZSIsImdvYWwiLCJpc1RvdWNoRW5hYmxlZCIsImRvY3VtZW50IiwiZG9jdW1lbnRFbGVtZW50Iiwib24iLCJzZXRUaW1lb3V0Iiwic2V0Rm9jdXMiLCJjbGFzc05hbWUiLCJtYyIsIkhhbW1lciIsIk1hbmFnZXIiLCJyZWZzIiwiYm9hcmQiLCJyb290Iiwic3dpcGUiLCJTd2lwZSIsInRocmVzaG9sZCIsInBhbiIsIlBhbiIsInJlY29nbml6ZVdpdGgiLCJhZGQiLCJnZXQiLCJzZXQiLCJkaXJlY3Rpb24iLCJESVJFQ1RJT05fQUxMIiwiZGlyIiwiYXhpcyIsImV2IiwiRElSRUNUSU9OX0xFRlQiLCJESVJFQ1RJT05fUklHSFQiLCJESVJFQ1RJT05fVVAiLCJESVJFQ1RJT05fRE9XTiIsInZlbnQiLCJ0cmlnZ2VyIiwiZGVsdGFYIiwiZGVsdGFZIiwiU1RBUlRfWCIsIlNUQVJUX1kiLCJlIiwic2VuZE1vdmUiLCJoYW5kbGVLZXlEb3duIiwia2V5Q29kZSIsIm1ldGFLZXkiLCJjdHJsS2V5IiwidW5kb0NsaWNrIiwicHJldmVudERlZmF1bHQiLCJwcmV2ZW50VXBkYXRlIiwia2V5cyIsImJpbmQiLCJsYXN0TW92ZURpcmVjdGlvbiIsImdhbWVTdGF0dXMiLCJ1cGRhdGVHYW1lIiwiaW5wdXQiLCJmb2N1cyIsInVwZGF0ZSIsInVuZG8iLCJyZWRvQ2xpY2siLCJyZWRvIiwic2NvcmUiLCJoYW5kbGVLZXlQcmVzcyIsImFsdEtleSIsInN0b3BQcm9wYWdhdGlvbiIsImdldE1vdmluZ0NsYXNzIiwic2V0dGluZ1NpemUiLCJzZXRCb2FyZFNpemUiLCJ2YWwiLCJzaG93U2l6ZURyb3Bkb3duIiwiZ2V0VW5kb0Rpc2FibGVkUHJvcCIsImJvYXJkVW5kb1N0YWNrIiwibGVuZ3RoIiwiZ2V0UmVkb0Rpc2FibGVkUHJvcCIsImJvYXJkUmVkb1N0YWNrIiwic2hvd0Fib3V0IiwiY3VyU2NvcmUiLCJnZXREaWZmU2NvcmUiLCJkaWZmIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxLQUFLQyxJQUFMLENBQVUsS0FBVixFQUFpQixnakNBQWpCLEVBQW1rQyxFQUFua0MsRUFBdWtDLHNCQUF2a0MsRUFBK2xDLFVBQVNDLElBQVQsRUFBZTtBQUFBOztBQUUxbUMsTUFBTUMsZUFBZSxLQUFyQjs7QUFFQSxPQUFLQyxTQUFMLEdBQWlCLENBQWpCO0FBQ0EsT0FBS0MsU0FBTCxHQUFpQixDQUFqQjtBQUNBLE9BQUtDLFlBQUwsR0FBb0IsS0FBcEI7QUFDQSxPQUFLQyxnQkFBTCxHQUF3QixLQUF4Qjs7QUFFQSxPQUFLQyxJQUFMLEdBQVksSUFBSUMsSUFBSixDQUFTO0FBQ25CQyxVQUFNLEtBQUtOO0FBRFEsR0FBVCxDQUFaO0FBR0EsT0FBS0ksSUFBTCxDQUFVRyxPQUFWOztBQUVBLE9BQUtDLElBQUwsR0FBWSxLQUFLSixJQUFMLENBQVVOLElBQVYsQ0FBZVUsSUFBM0I7O0FBRUEsT0FBS0MsY0FBTCxHQUF1QixrQkFBa0JDLFNBQVNDLGVBQWxEOztBQUVBLE9BQUtDLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFlBQU07O0FBRXJCQyxlQUFXLE1BQUtDLFFBQWhCLEVBQTBCLEdBQTFCOztBQUVBSixhQUFTQyxlQUFULENBQXlCSSxTQUF6QixJQUF1QyxNQUFLTixjQUFMLEdBQXNCLFFBQXRCLEdBQWlDLFdBQXhFOztBQUVBLFFBQU1PLEtBQUssSUFBSUMsT0FBT0MsT0FBWCxDQUFtQixNQUFLQyxJQUFMLENBQVVDLEtBQVYsQ0FBZ0JDLElBQW5DLENBQVg7O0FBRUEsUUFBTUMsUUFBUSxJQUFJTCxPQUFPTSxLQUFYLENBQWlCO0FBQzdCQyxpQkFBVztBQURrQixLQUFqQixDQUFkOztBQUlBLFFBQUl6QixZQUFKLEVBQWtCO0FBQ2hCLFVB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QUwsR0FBMkIsWUFBVztBQUNwQyxXQUFPLEtBQUt2RSxJQUFMLENBQVV3RSxjQUFWLENBQXlCQyxNQUF6QixHQUFrQyxFQUFsQyxHQUFxQyxVQUE1QztBQUNELEdBRjBCLENBRXpCckIsSUFGeUIsQ0FFcEIsSUFGb0IsQ0FBM0I7O0FBSUEsT0FBS3NCLG1CQUFMLEdBQTJCLFlBQVc7QUFDcEMsV0FBTyxLQUFLMUUsSUFBTCxDQUFVMkUsY0FBVixDQUF5QkYsTUFBekIsR0FBa0MsRUFBbEMsR0FBcUMsVUFBNUM7QUFDRCxHQUYwQixDQUV6QnJCLElBRnlCLENBRXBCLElBRm9CLENBQTNCOztBQUlBLE9BQUt3QixTQUFMLEdBQWlCLFlBQVc7QUFDMUIsU0FBSzlFLFlBQUwsR0FBb0IsSUFBcEI7QUFDRCxHQUZnQixDQUVmc0QsSUFGZSxDQUVWLElBRlUsQ0FBakI7O0FBSUEsTUFBSXlCLFdBQVcsQ0FBZjs7QUFFQSxPQUFLQyxZQUFMLEdBQW9CLFlBQVc7QUFDN0IsUUFBSUMsT0FBTyxLQUFLbEYsU0FBTCxHQUFpQmdGLFFBQTVCO0FBQ0FBLGVBQVcsS0FBS2hGLFNBQWhCO0FBQ0EsV0FBT2tGLElBQVA7QUFDRCxHQUptQixDQUlsQjNCLElBSmtCLENBSWIsSUFKYSxDQUFwQjtBQU1ILENBak1EIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbInJpb3QudGFnMignYXBwJywgJzxoZWFkZXI+IDxkaXYgY2xhc3M9XCJjb250cm9sc1wiPiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBuYW1lPVwiYnV0dG9uXCIgaWQ9XCJuZXdHYW1lXCIgb25jbGljaz1cIntuZXdHYW1lfVwiPk5ldyBHYW1lPC9idXR0b24+IDxkaXYgY2xhc3M9XCJzaXplV3JhcHBlclwiPiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBuYW1lPVwiYnV0dG9uXCIgaWQ9XCJzZXRTaXplXCIgb25jbGljaz1cIntzaG93U2l6ZURyb3Bkb3dufVwiPlNpemU6IHtib2FyZFNpemV9ICYjOTY2MDsgPC9idXR0b24+IDxzaXplIGlmPVwie3NldHRpbmdTaXplKCl9XCI+PC9zaXplPiA8L2Rpdj4gPGRpdiBjbGFzcz1cInVuZG9XcmFwcGVyXCI+IDxidXR0b24gaWQ9XCJ1bmRvXCIgb25jbGljaz1cInt1bmRvQ2xpY2t9XCIgZGlzYWJsZWQ9XCJ7Z2V0VW5kb0Rpc2FibGVkUHJvcCgpfVwiPlVuZG88L2J1dHRvbj4gPGJ1dHRvbiBpZD1cInJlZG9cIiBvbmNsaWNrPVwie3JlZG9DbGlja31cIiBkaXNhYmxlZD1cIntnZXRSZWRvRGlzYWJsZWRQcm9wKCl9XCI+UmVkbzwvYnV0dG9uPiA8L2Rpdj4gPC9kaXY+IDxnb2FsIHRpdGxlPVwiVXNlIHRoZSBhcnJvdyBrZXlzIG9yIHN3aXBlIHRvIGdldCBhdCBsZWFzdCBvbmUgYmxvY2sgZmFjZSB2YWx1ZSB0byB7Z29hbH1cIiBvbmNsaWNrPVwie3Nob3dBYm91dH1cIj57Z29hbH08L2dvYWw+IDxhYm91dCBpZj1cInthYm91dFZpc2libGV9XCIgZ29hbD1cIntnb2FsfVwiPjwvYWJvdXQ+IDxzY29yZSBnYW1lc2NvcmU9XCJ7Z2FtZVNjb3JlfVwiIGRpZmZzY29yZT1cIntnZXREaWZmU2NvcmUoKX1cIj48L3Njb3JlPiA8L2hlYWRlcj4gPHdpbmxvc2UgY2xhc3M9XCJ7Z2FtZVN0YXR1c31cIiBnYW1lc3RhdHVzPVwie2dhbWVTdGF0dXN9XCI+PC93aW5sb3NlPiA8Ym9hcmQgcmVmPVwiYm9hcmRcIiBnYW1lPVwie2dhbWV9XCI+PC9ib2FyZD4gPGRpdiBjbGFzcz1cInN0YXR1c1wiPiBHYW1lIHN0YXR1czogPGlucHV0IG9ua2V5ZG93bj1cIntoYW5kbGVLZXlEb3dufVwiIG9ua2V5cHJlc3M9XCJ7aGFuZGxlS2V5UHJlc3N9XCIgb25jbGljaz1cInt1cGRhdGVHYW1lfVwiIHJlZj1cImlucHV0XCIgbmFtZT1cInRlc3RcIiByaW90LXZhbHVlPVwie2dhbWVTdGF0dXN9XCIgcmVhZG9ubHk+IDwvZGl2PicsICcnLCAnb25jbGljaz1cIntzZXRGb2N1c31cIicsIGZ1bmN0aW9uKG9wdHMpIHtcblxuICAgIGNvbnN0IERSQUdfRU5BQkxFRCA9IGZhbHNlO1xuXG4gICAgdGhpcy5ib2FyZFNpemUgPSA0O1xuICAgIHRoaXMuZ2FtZVNjb3JlID0gMDtcbiAgICB0aGlzLmFib3V0VmlzaWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuc2V0dGluZ0JvYXJkU2l6ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5nYW1lID0gbmV3IEdhbWUoe1xuICAgICAgc2l6ZTogdGhpcy5ib2FyZFNpemVcbiAgICB9KTtcbiAgICB0aGlzLmdhbWUubmV3R2FtZSgpO1xuXG4gICAgdGhpcy5nb2FsID0gdGhpcy5nYW1lLm9wdHMuZ29hbDtcblxuICAgIHRoaXMuaXNUb3VjaEVuYWJsZWQgPSAoXCJvbnRvdWNoc3RhcnRcIiBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuXG4gICAgdGhpcy5vbignbW91bnQnLCAoKSA9PiB7XG5cbiAgICAgIHNldFRpbWVvdXQodGhpcy5zZXRGb2N1cywgMzAwKTtcblxuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTmFtZSArPSAodGhpcy5pc1RvdWNoRW5hYmxlZCA/ICcgdG91Y2gnIDogJyBuby10b3VjaCcpO1xuXG4gICAgICBjb25zdCBtYyA9IG5ldyBIYW1tZXIuTWFuYWdlcih0aGlzLnJlZnMuYm9hcmQucm9vdCk7XG5cbiAgICAgIGNvbnN0IHN3aXBlID0gbmV3IEhhbW1lci5Td2lwZSh7XG4gICAgICAgIHRocmVzaG9sZDogMjBcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoRFJBR19FTkFCTEVEKSB7XG4gICAgICAgIGNvbnN0IHBhbiA9IG5ldyBIYW1tZXIuUGFuKHtcbiAgICAgICAgICB0aHJlc2hvbGQ6IDVcbiAgICAgICAgfSk7XG4gICAgICAgIHBhbi5yZWNvZ25pemVXaXRoKHN3aXBlKTtcbiAgICAgICAgbWMuYWRkKHBhbik7XG4gICAgICAgIG1jLmdldCgncGFuJykuc2V0KHsgZGlyZWN0aW9uOiBIYW1tZXIuRElSRUNUSU9OX0FMTCB9KTtcblxuICAgICAgICBtYy5vbihcInBhblwiLCBldiA9PiB7XG4gICAgICAgICAgbGV0IGRpciwgYXhpcztcblxuICAgICAgICAgIHN3aXRjaCAoZXYuZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIEhhbW1lci5ESVJFQ1RJT05fTEVGVDogZGlyID0gJ2xlZnQnOyBheGlzID0gJ3gnOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSGFtbWVyLkRJUkVDVElPTl9SSUdIVDogZGlyID0gJ3JpZ2h0JzsgYXhpcyA9ICd4JzsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEhhbW1lci5ESVJFQ1RJT05fVVA6IGRpciA9ICd1cCc7ICBheGlzID0gJ3knOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSGFtbWVyLkRJUkVDVElPTl9ET1dOOiBkaXIgPSAnZG93bic7ICBheGlzID0gJ3knO2JyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZlbnQudHJpZ2dlcignZHJhZycsIGRpciwgYXhpcyA9PT0gJ3gnID8gZXYuZGVsdGFYOjAsIGF4aXMgPT09ICd5JyA/IGV2LmRlbHRhWTowKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBtYy5vbihcInBhbnN0YXJ0MVwiLCBldiA9PiB7XG4gICAgICAgICAgY29uc3QgU1RBUlRfWCA9IDAsIFNUQVJUX1kgPSAwO1xuICAgICAgICAgIGxldCBkaXI7XG5cbiAgICAgICAgICBzd2l0Y2ggKGV2LmRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSBIYW1tZXIuRElSRUNUSU9OX0xFRlQ6IGRpciA9ICdsZWZ0JzsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEhhbW1lci5ESVJFQ1RJT05fUklHSFQ6IGRpciA9ICdyaWdodCc7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBIYW1tZXIuRElSRUNUSU9OX1VQOiBkaXIgPSAndXAnOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgSGFtbWVyLkRJUkVDVElPTl9ET1dOOiBkaXIgPSAnZG93bic7IGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgbWMuYWRkKHN3aXBlKTtcblxuICAgICAgbWMub24oJ3N3aXBlJywgZSA9PiB7XG4gICAgICAgIGxldCBkaXI7XG4gICAgICAgIHN3aXRjaCAoZS5kaXJlY3Rpb24pIHtcbiAgICAgICAgICBjYXNlIEhhbW1lci5ESVJFQ1RJT05fTEVGVDogZGlyID0gJ2xlZnQnOyBicmVhaztcbiAgICAgICAgICBjYXNlIEhhbW1lci5ESVJFQ1RJT05fUklHSFQ6IGRpciA9ICdyaWdodCc7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgSGFtbWVyLkRJUkVDVElPTl9VUDogZGlyID0gJ3VwJzsgYnJlYWs7XG4gICAgICAgICAgY2FzZSBIYW1tZXIuRElSRUNUSU9OX0RPV046IGRpciA9ICdkb3duJzsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZW5kTW92ZShkaXIpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIHRoaXMuaGFuZGxlS2V5RG93biA9IGZ1bmN0aW9uKGUpIHtcblxuICAgICAgaWYgKGUua2V5Q29kZSA9PT0gOTAgJiYgKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpKSB7XG4gICAgICAgIHRoaXMudW5kb0NsaWNrKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBlLnByZXZlbnRVcGRhdGUgPSB0cnVlO1xuXG4gICAgICBjb25zdCBrZXlzID0ge1xuICAgICAgICAzNzogJ2xlZnQnLFxuICAgICAgICAzODogJ3VwJyxcbiAgICAgICAgMzk6ICdyaWdodCcsXG4gICAgICAgIDQwOiAnZG93bidcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuc2VuZE1vdmUoa2V5c1tlLmtleUNvZGVdKTtcblxuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5zZW5kTW92ZSA9IGZ1bmN0aW9uKGRpcikge1xuICAgICAgaWYgKCFkaXIpIHJldHVybiB0cnVlO1xuICAgICAgdGhpcy5sYXN0TW92ZURpcmVjdGlvbiA9IGRpcjtcbiAgICAgIHRoaXMudHJpZ2dlcignbW92ZScsIGRpcik7XG5cbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMubmV3R2FtZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRoaXMuZ2FtZS5uZXdHYW1lKHtcbiAgICAgICAgc2l6ZTogdGhpcy5ib2FyZFNpemVcbiAgICAgIH0pO1xuICAgICAgdGhpcy50cmlnZ2VyKCduZXdnYW1lJyk7XG4gICAgICB0aGlzLmdhbWVTdGF0dXMgPSAnYWN0aXZlJztcbiAgICAgIHRoaXMuZ2FtZVNjb3JlID0gMDtcbiAgICAgIHRoaXMuZ29hbCA9IHRoaXMuZ2FtZS5vcHRzLmdvYWw7XG5cbiAgICAgIHRoaXMudXBkYXRlR2FtZSgpO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5zZXRGb2N1cyA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aGlzLmlzVG91Y2hFbmFibGVkKSByZXR1cm47XG5cbiAgICAgIHRoaXMucmVmcy5pbnB1dC5mb2N1cygpO1xuICAgICAgaWYgKGUpIGUucHJldmVudFVwZGF0ZSA9IHRydWU7XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnVwZGF0ZUdhbWUgPSBmdW5jdGlvbihlKSB7XG4gICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy51bmRvQ2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZ2FtZS51bmRvKCk7XG4gICAgICB0aGlzLnRyaWdnZXIoJ21vdmUnKTtcbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMucmVkb0NsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmdhbWUucmVkbygpO1xuICAgICAgdGhpcy50cmlnZ2VyKCdtb3ZlJyk7XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLm9uKCdtb3ZlJywgKCkgPT4ge1xuICAgICAgdGhpcy5nYW1lU3RhdHVzID0gdGhpcy5nYW1lLmdhbWVTdGF0dXMoKTtcbiAgICAgIHRoaXMuZ2FtZVNjb3JlID0gdGhpcy5nYW1lLnNjb3JlO1xuICAgICAgdGhpcy51cGRhdGUoICk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmhhbmRsZUtleVByZXNzID0gZnVuY3Rpb24oZSkge1xuXG4gICAgICBpZiAoIShlLmN0cmxLZXkgfHwgZS5tZXRhS2V5IHx8IGUuYWx0S2V5KSkge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5nZXRNb3ZpbmdDbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJtb3ZpbmctXCIgKyB0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5zZXR0aW5nU2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ0JvYXJkU2l6ZTtcbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMuc2V0Qm9hcmRTaXplID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICB0aGlzLnNldHRpbmdCb2FyZFNpemUgPSBmYWxzZTtcbiAgICAgIHRoaXMuYm9hcmRTaXplID0gdmFsO1xuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMuc2hvd1NpemVEcm9wZG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zZXR0aW5nQm9hcmRTaXplID0gIXRoaXMuc2V0dGluZ0JvYXJkU2l6ZTtcbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMuZ2V0VW5kb0Rpc2FibGVkUHJvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2FtZS5ib2FyZFVuZG9TdGFjay5sZW5ndGggPyAnJzonZGlzYWJsZWQnO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5nZXRSZWRvRGlzYWJsZWRQcm9wID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5nYW1lLmJvYXJkUmVkb1N0YWNrLmxlbmd0aCA/ICcnOidkaXNhYmxlZCc7XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnNob3dBYm91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5hYm91dFZpc2libGUgPSB0cnVlO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgbGV0IGN1clNjb3JlID0gMDtcblxuICAgIHRoaXMuZ2V0RGlmZlNjb3JlID0gZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgZGlmZiA9IHRoaXMuZ2FtZVNjb3JlIC0gY3VyU2NvcmU7XG4gICAgICBjdXJTY29yZSA9IHRoaXMuZ2FtZVNjb3JlO1xuICAgICAgcmV0dXJuIGRpZmY7XG4gICAgfS5iaW5kKHRoaXMpXG5cbn0pOyJdfQ==
'use strict';

riot.tag2('block', '<label animate="{this.getAnimations()}" animate-leave="zoomOut" animate-duration="500ms">{opts.bv.val}</label>', '', 'class="{this.getLevelClass()}" riot-style="font-size: {opts.fontsize}"', function (opts) {
  var _this = this;

  this.mixin(riotAnimate);

  this.getAnimations = function () {
    var classes = [];
    if (_this.opts.new) {
      classes.push('bounceIn');
    }
    if (_this.opts.combined) classes.push('flipInY');
    if (_this.moving) classes.push('fadeOut');
    return classes.join(' ');
  };

  this.getLevelClass = function () {
    var val = _this.opts.bv.val;
    var level = Math.log(val) / Math.log(2);
    return 'level' + level;
  };

  this.blockMargin = 0;

  var self = this;

  this.move = function () {

    var delta = self.opts.bv.delta;

    if (delta) {

      var marginAdjustX = delta.dx * self.blockMargin,
          marginAdjustY = delta.dy * self.blockMargin;

      self.moving = true;

      if (delta.removed) self.animatedUnmount();

      self.update();

      Velocity(self.root, {
        left: self.root.offsetWidth * delta.dx + marginAdjustX + 'px',
        top: self.root.offsetHeight * delta.dy + marginAdjustY + 'px'
      }, {
        duration: 100,
        complete: function complete() {
          self.moving = false;
        }
      });
    }
  };

  var adjustMargin = function adjustMargin(e) {

    if (this.root && this.root.parentElement) {
      var style = this.root.parentElement.currentStyle || window.getComputedStyle(this.root.parentElement);

      this.blockMargin = parseInt(style.marginRight, 10) * 2;
    }
  };

  this.on('updated', adjustMargin);

  this.drag = function (dir, dx, dy) {

    if (!Game.possibleMoves.some(function (m) {
      return m === dir;
    })) return;

    var translate = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
    self.root.style.transform = translate;
    self.root.style.mozTransform = translate;
    self.root.style.webkitTransform = translate;
  };

  vent.on('moveblocks', this.move);
  vent.on('drag', this.drag);

  this.on('before-unmount', function () {
    vent.off('moveblocks', this.move);
    vent.off('drag', this.drag);
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsb2NrLmpzIl0sIm5hbWVzIjpbInJpb3QiLCJ0YWcyIiwib3B0cyIsIm1peGluIiwicmlvdEFuaW1hdGUiLCJnZXRBbmltYXRpb25zIiwiY2xhc3NlcyIsIm5ldyIsInB1c2giLCJjb21iaW5lZCIsIm1vdmluZyIsImpvaW4iLCJnZXRMZXZlbENsYXNzIiwidmFsIiwiYnYiLCJsZXZlbCIsIk1hdGgiLCJsb2ciLCJibG9ja01hcmdpbiIsInNlbGYiLCJtb3ZlIiwiZGVsdGEiLCJtYXJnaW5BZGp1c3RYIiwiZHgiLCJtYXJnaW5BZGp1c3RZIiwiZHkiLCJyZW1vdmVkIiwiYW5pbWF0ZWRVbm1vdW50IiwidXBkYXRlIiwiVmVsb2NpdHkiLCJyb290IiwibGVmdCIsIm9mZnNldFdpZHRoIiwidG9wIiwib2Zmc2V0SGVpZ2h0IiwiZHVyYXRpb24iLCJjb21wbGV0ZSIsImFkanVzdE1hcmdpbiIsImUiLCJwYXJlbnRFbGVtZW50Iiwic3R5bGUiLCJjdXJyZW50U3R5bGUiLCJ3aW5kb3ciLCJnZXRDb21wdXRlZFN0eWxlIiwicGFyc2VJbnQiLCJtYXJnaW5SaWdodCIsIm9uIiwiZHJhZyIsImRpciIsIkdhbWUiLCJwb3NzaWJsZU1vdmVzIiwic29tZSIsIm0iLCJ0cmFuc2xhdGUiLCJ0cmFuc2Zvcm0iLCJtb3pUcmFuc2Zvcm0iLCJ3ZWJraXRUcmFuc2Zvcm0iLCJ2ZW50Iiwib2ZmIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxLQUFLQyxJQUFMLENBQVUsT0FBVixFQUFtQixnSEFBbkIsRUFBcUksRUFBckksRUFBeUksd0VBQXpJLEVBQW1OLFVBQVNDLElBQVQsRUFBZTtBQUFBOztBQUM5TixPQUFLQyxLQUFMLENBQVdDLFdBQVg7O0FBRUEsT0FBS0MsYUFBTCxHQUFxQixZQUFNO0FBQ3pCLFFBQU1DLFVBQVUsRUFBaEI7QUFDQSxRQUFJLE1BQUtKLElBQUwsQ0FBVUssR0FBZCxFQUFtQjtBQUNqQkQsY0FBUUUsSUFBUixDQUFhLFVBQWI7QUFDRDtBQUNELFFBQUksTUFBS04sSUFBTCxDQUFVTyxRQUFkLEVBQ0VILFFBQVFFLElBQVIsQ0FBYSxTQUFiO0FBQ0YsUUFBSSxNQUFLRSxNQUFULEVBQ0VKLFFBQVFFLElBQVIsQ0FBYSxTQUFiO0FBQ0YsV0FBT0YsUUFBUUssSUFBUixDQUFhLEdBQWIsQ0FBUDtBQUNELEdBVkQ7O0FBWUEsT0FBS0MsYUFBTCxHQUFxQixZQUFNO0FBQ3pCLFFBQU1DLE1BQU0sTUFBS1gsSUFBTCxDQUFVWSxFQUFWLENBQWFELEdBQXpCO0FBQ0EsUUFBTUUsUUFBUUMsS0FBS0MsR0FBTCxDQUFTSixHQUFULElBQWdCRyxLQUFLQyxHQUFMLENBQVMsQ0FBVCxDQUE5QjtBQUNBLFdBQU8sVUFBVUYsS0FBakI7QUFDRCxHQUpEOztBQU1BLE9BQUtHLFdBQUwsR0FBbUIsQ0FBbkI7O0FBRUEsTUFBTUMsT0FBTyxJQUFiOztBQUVBLE9BQUtDLElBQUwsR0FBWSxZQUFNOztBQUVoQixRQUFNQyxRQUFRRixLQUFLakIsSUFBTCxDQUFVWSxFQUFWLENBQWFPLEtBQTNCOztBQUVBLFFBQUlBLEtBQUosRUFBVzs7QUFFVCxVQUFNQyxnQkFBZ0JELE1BQU1FLEVBQU4sR0FBV0osS0FBS0QsV0FBdEM7QUFBQSxVQUFtRE0sZ0JBQWdCSCxNQUFNSSxFQUFOLEdBQVdOLEtBQUtELFdBQW5GOztBQUVBQyxXQUFLVCxNQUFMLEdBQWMsSUFBZDs7QUFFQSxVQUFJVyxNQUFNSyxPQUFWLEVBQ0VQLEtBQUtRLGVBQUw7O0FBRUZSLFdBQUtTLE1BQUw7O0FBRUFDLGVBQVNWLEtBQUtXLElBQWQsRUFDSTtBQUNFQyxjQUFPWixLQUFLVyxJQUFMLENBQVVFLFdBQVYsR0FBd0JYLE1BQU1FLEVBQS9CLEdBQXFDRCxhQUFyQyxHQUFxRCxJQUQ3RDtBQUVFVyxhQUFNZCxLQUFLVyxJQUFMLENBQVVJLFlBQVYsR0FBeUJiLE1BQU1JLEVBQWhDLEdBQXNDRCxhQUF0QyxHQUFzRDtBQUY3RCxPQURKLEVBS0k7QUFDRVcsa0JBQVUsR0FEWjtBQUVFQyxrQkFBVSxvQkFBTTtBQUNkakIsZUFBS1QsTUFBTCxHQUFjLEtBQWQ7QUFDRDtBQUpILE9BTEo7QUFZRDtBQUNGLEdBNUJEOztBQThCQSxNQUFNMkIsZUFBZSxTQUFmQSxZQUFlLENBQVNDLENBQVQsRUFBWTs7QUFFL0IsUUFBSSxLQUFLUixJQUFMLElBQWEsS0FBS0EsSUFBTCxDQUFVUyxhQUEzQixFQUEwQztBQUN4QyxVQUFNQyxRQUFRLEtBQUtWLElBQUwsQ0FBVVMsYUFBVixDQUF3QkUsWUFBeEIsSUFBd0NDLE9BQU9DLGdCQUFQLENBQXdCLEtBQUtiLElBQUwsQ0FBVVMsYUFBbEMsQ0FBdEQ7O0FBRUEsV0FBS3JCLFdBQUwsR0FBbUIwQixTQUFTSixNQUFNSyxXQUFmLEVBQTRCLEVBQTVCLElBQWtDLENBQXJEO0FBQ0Q7QUFDRixHQVBEOztBQVNBLE9BQUtDLEVBQUwsQ0FBUSxTQUFSLEVBQW1CVCxZQUFuQjs7QUFFQSxPQUFLVSxJQUFMLEdBQVksVUFBQ0MsR0FBRCxFQUFNekIsRUFBTixFQUFVRSxFQUFWLEVBQWlCOztBQUUzQixRQUFJLENBQUN3QixLQUFLQyxhQUFMLENBQW1CQyxJQUFuQixDQUF3QjtBQUFBLGFBQUtDLE1BQU1KLEdBQVg7QUFBQSxLQUF4QixDQUFMLEVBQThDOztBQUU5QyxRQUFNSyw2QkFBMkI5QixFQUEzQixZQUFvQ0UsRUFBcEMsV0FBTjtBQUNBTixTQUFLVyxJQUFMLENBQVVVLEtBQVYsQ0FBZ0JjLFNBQWhCLEdBQTRCRCxTQUE1QjtBQUNBbEMsU0FBS1csSUFBTCxDQUFVVSxLQUFWLENBQWdCZSxZQUFoQixHQUErQkYsU0FBL0I7QUFDQWxDLFNBQUtXLElBQUwsQ0FBVVUsS0FBVixDQUFnQmdCLGVBQWhCLEdBQWtDSCxTQUFsQztBQUVELEdBVEQ7O0FBV0FJLE9BQUtYLEVBQUwsQ0FBUSxZQUFSLEVBQXNCLEtBQUsxQixJQUEzQjtBQUNBcUMsT0FBS1gsRUFBTCxDQUFRLE1BQVIsRUFBZ0IsS0FBS0MsSUFBckI7O0FBRUEsT0FBS0QsRUFBTCxDQUFRLGdCQUFSLEVBQTBCLFlBQVc7QUFDbkNXLFNBQUtDLEdBQUwsQ0FBUyxZQUFULEVBQXVCLEtBQUt0QyxJQUE1QjtBQUNBcUMsU0FBS0MsR0FBTCxDQUFTLE1BQVQsRUFBaUIsS0FBS1gsSUFBdEI7QUFDRCxHQUhEO0FBS0gsQ0FyRkQiLCJmaWxlIjoiYmxvY2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJyaW90LnRhZzIoJ2Jsb2NrJywgJzxsYWJlbCBhbmltYXRlPVwie3RoaXMuZ2V0QW5pbWF0aW9ucygpfVwiIGFuaW1hdGUtbGVhdmU9XCJ6b29tT3V0XCIgYW5pbWF0ZS1kdXJhdGlvbj1cIjUwMG1zXCI+e29wdHMuYnYudmFsfTwvbGFiZWw+JywgJycsICdjbGFzcz1cInt0aGlzLmdldExldmVsQ2xhc3MoKX1cIiByaW90LXN0eWxlPVwiZm9udC1zaXplOiB7b3B0cy5mb250c2l6ZX1cIicsIGZ1bmN0aW9uKG9wdHMpIHtcbiAgICB0aGlzLm1peGluKHJpb3RBbmltYXRlKTtcblxuICAgIHRoaXMuZ2V0QW5pbWF0aW9ucyA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGNsYXNzZXMgPSBbXTtcbiAgICAgIGlmICh0aGlzLm9wdHMubmV3KSB7XG4gICAgICAgIGNsYXNzZXMucHVzaCgnYm91bmNlSW4nKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdHMuY29tYmluZWQpXG4gICAgICAgIGNsYXNzZXMucHVzaCgnZmxpcEluWScpO1xuICAgICAgaWYgKHRoaXMubW92aW5nKVxuICAgICAgICBjbGFzc2VzLnB1c2goJ2ZhZGVPdXQnKTtcbiAgICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRMZXZlbENsYXNzID0gKCkgPT4ge1xuICAgICAgY29uc3QgdmFsID0gdGhpcy5vcHRzLmJ2LnZhbDtcbiAgICAgIGNvbnN0IGxldmVsID0gTWF0aC5sb2codmFsKSAvIE1hdGgubG9nKDIpO1xuICAgICAgcmV0dXJuICdsZXZlbCcgKyBsZXZlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5ibG9ja01hcmdpbiA9IDA7XG5cbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIHRoaXMubW92ZSA9ICgpID0+IHtcblxuICAgICAgY29uc3QgZGVsdGEgPSBzZWxmLm9wdHMuYnYuZGVsdGE7XG5cbiAgICAgIGlmIChkZWx0YSkge1xuXG4gICAgICAgIGNvbnN0IG1hcmdpbkFkanVzdFggPSBkZWx0YS5keCAqIHNlbGYuYmxvY2tNYXJnaW4sIG1hcmdpbkFkanVzdFkgPSBkZWx0YS5keSAqIHNlbGYuYmxvY2tNYXJnaW47XG5cbiAgICAgICAgc2VsZi5tb3ZpbmcgPSB0cnVlO1xuXG4gICAgICAgIGlmIChkZWx0YS5yZW1vdmVkKVxuICAgICAgICAgIHNlbGYuYW5pbWF0ZWRVbm1vdW50KCk7XG5cbiAgICAgICAgc2VsZi51cGRhdGUoKTtcblxuICAgICAgICBWZWxvY2l0eShzZWxmLnJvb3QsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGxlZnQ6IChzZWxmLnJvb3Qub2Zmc2V0V2lkdGggKiBkZWx0YS5keCkgKyBtYXJnaW5BZGp1c3RYICsgJ3B4JyxcbiAgICAgICAgICAgICAgdG9wOiAoc2VsZi5yb290Lm9mZnNldEhlaWdodCAqIGRlbHRhLmR5KSArIG1hcmdpbkFkanVzdFkgKyAncHgnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkdXJhdGlvbjogMTAwLFxuICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHNlbGYubW92aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgYWRqdXN0TWFyZ2luID0gZnVuY3Rpb24oZSkge1xuXG4gICAgICBpZiAodGhpcy5yb290ICYmIHRoaXMucm9vdC5wYXJlbnRFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gdGhpcy5yb290LnBhcmVudEVsZW1lbnQuY3VycmVudFN0eWxlIHx8IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMucm9vdC5wYXJlbnRFbGVtZW50KTtcblxuICAgICAgICB0aGlzLmJsb2NrTWFyZ2luID0gcGFyc2VJbnQoc3R5bGUubWFyZ2luUmlnaHQsIDEwKSAqIDI7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMub24oJ3VwZGF0ZWQnLCBhZGp1c3RNYXJnaW4pO1xuXG4gICAgdGhpcy5kcmFnID0gKGRpciwgZHgsIGR5KSA9PiB7XG5cbiAgICAgIGlmICghR2FtZS5wb3NzaWJsZU1vdmVzLnNvbWUobSA9PiBtID09PSBkaXIpKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IHRyYW5zbGF0ZSA9IGB0cmFuc2xhdGUzZCgke2R4fXB4LCAke2R5fXB4LCAwKWA7XG4gICAgICBzZWxmLnJvb3Quc3R5bGUudHJhbnNmb3JtID0gdHJhbnNsYXRlO1xuICAgICAgc2VsZi5yb290LnN0eWxlLm1velRyYW5zZm9ybSA9IHRyYW5zbGF0ZTtcbiAgICAgIHNlbGYucm9vdC5zdHlsZS53ZWJraXRUcmFuc2Zvcm0gPSB0cmFuc2xhdGU7XG5cbiAgICB9O1xuXG4gICAgdmVudC5vbignbW92ZWJsb2NrcycsIHRoaXMubW92ZSk7XG4gICAgdmVudC5vbignZHJhZycsIHRoaXMuZHJhZyk7XG5cbiAgICB0aGlzLm9uKCdiZWZvcmUtdW5tb3VudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgdmVudC5vZmYoJ21vdmVibG9ja3MnLCB0aGlzLm1vdmUpO1xuICAgICAgdmVudC5vZmYoJ2RyYWcnLCB0aGlzLmRyYWcpO1xuICAgIH0pO1xuXG59KTtcbiJdfQ==
'use strict';

riot.tag2('board', '<div class="row" each="{row, y in boardRows}"> <space each="{tmp, x in row}" bv="{parent.getVal(parent.y, x)}" new="{parent.isNew(parent.y,x)}" x="{x}" y="{y}" combined="{parent.isCombined(parent.y,x)}" class="{new: parent.isNew(parent.y,x)}"></space> </div> <div class="row font-sizer"> <div class="space"><div class="block" ref="sizer_block"><label ref="sizer_block_label">2048</label></div></div> </div>', '', '', function (opts) {
  var _this = this;

  this.game = opts.game;
  this.timeout = null;
  this.fontSizes = {};

  var minFontSize = 5,
      maxFontSize = 100;

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
    window.addEventListener('resize', _this.update.bind(_this));
    window.addEventListener('orientationchange', _this.update.bind(_this));
    _this.update();
  });

  this.parent.on('newgame', function () {
    _this.boardRows = cloneMatrix(_this.game.rows);
    _this.update();
    _this.fontSizes = {};
  });

  this.parent.on('move', function (dir) {
    _this.trigger('move');
    if (dir) {

      if (_this.game.gameStatus() !== 'active') return;

      if (_this.timeout) {
        return;
      }

      _this.lastBoardRows = _this.boardRows = updateMoves(_this.boardRows, _this.game.getBlockMovements(dir));

      vent.trigger('moveblocks');

      _this.timeout = setTimeout(function () {
        if (dir) _this.game.processMove(dir);
        _this.update({ boardRows: _this.game.rows });
        _this.parent.trigger('move');
        _this.timeout = null;
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
    if (!this.lastBoardRows || !this.lastBoardRows.length) return;
    return this.lastBoardRows[y][x].delta.combined;
  }.bind(this);

  this.getVal = function (y, x) {
    return this.boardRows[y][x];
  }.bind(this);

  this.on('before-update', function () {
    vent.off('*');
  });

  this.setFontSizes = function (boardDimensions) {
    var space = this.root.querySelectorAll('div:nth-child(1) > space:nth-child(1)')[0];

    if (!space) {
      return;
    }

    this.fontSizes[boardDimensions] = {};

    var testGoal = this.game.opts.goal,
        test = 2,
        label = this.refs.sizer_block_label,
        block = this.refs.sizer_block;
    var y = maxFontSize,
        compressor = .2;

    block.style.width = space.clientWidth + 'px';
    block.style.height = space.clientHeight + 'px';

    var el = block;

    var initialComputed = Math.max(Math.min(el.clientWidth / (compressor * 10), Math.min(el.clientHeight, maxFontSize)), minFontSize) + 'px';

    while (test <= testGoal) {
      el.style.fontSize = initialComputed;
      label.innerHTML = test;
      if (el.offsetHeight < el.scrollHeight || el.offsetWidth < el.scrollWidth) {
        while ((el.offsetHeight < el.scrollHeight || el.offsetWidth < el.scrollWidth) && y > minFontSize) {
          el.style.fontSize = y + 'px';
          y--;
        }
      }

      this.fontSizes[boardDimensions]["" + test] = el.style.fontSize;

      test *= 2;
    }
  }.bind(this);

  this.on('update', function () {
    var boardDimensions = this.root.clientHeight + 'x' + this.root.clientWidth;

    if (!this.fontSizes[boardDimensions] && this.isMounted) {
      this.setFontSizes(boardDimensions);
    }
  });

  this.getFontSize = function (value) {
    var boardDimensions = this.root.clientHeight + 'x' + this.root.clientWidth;

    if (!this.fontSizes[boardDimensions] && this.isMounted) {
      this.setFontSizes(boardDimensions);
    }

    if (!this.fontSizes[boardDimensions]) {

      var space = this.root.querySelectorAll('div:nth-child(1) > space:nth-child(1)')[0];

      if (!space) {
        var compressor = .2,
            length = this.boardRows.length,
            spaceMargin = 10;
        var sliceWidth = this.root.clientWidth / length - 2 * spaceMargin,
            sliceHeight = this.root.clientHeight / length - 2 * spaceMargin;

        return Math.max(Math.min(sliceWidth / (compressor * 10), Math.min(sliceHeight, maxFontSize)), minFontSize) + 'px';;
      }
    }

    return this.fontSizes[boardDimensions][value];
  }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJvYXJkLmpzIl0sIm5hbWVzIjpbInJpb3QiLCJ0YWcyIiwib3B0cyIsImdhbWUiLCJ0aW1lb3V0IiwiZm9udFNpemVzIiwibWluRm9udFNpemUiLCJtYXhGb250U2l6ZSIsImNsb25lTWF0cml4IiwibWF0cml4Iiwic2l6ZSIsImxlbmd0aCIsIm5ld01hdHJpeCIsIkFycmF5IiwieSIsIngiLCJ1cGRhdGVNb3ZlcyIsIm1vdmVzIiwiYmxvY2siLCJkZWx0YSIsImlzTmV3Iiwib24iLCJib2FyZFJvd3MiLCJyb3dzIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInVwZGF0ZSIsImJpbmQiLCJwYXJlbnQiLCJkaXIiLCJ0cmlnZ2VyIiwiZ2FtZVN0YXR1cyIsImxhc3RCb2FyZFJvd3MiLCJnZXRCbG9ja01vdmVtZW50cyIsInZlbnQiLCJzZXRUaW1lb3V0IiwicHJvY2Vzc01vdmUiLCJtaXhpbiIsInJpb3RBbmltYXRlIiwiaXNDb21iaW5lZCIsImNvbWJpbmVkIiwiZ2V0VmFsIiwib2ZmIiwic2V0Rm9udFNpemVzIiwiYm9hcmREaW1lbnNpb25zIiwic3BhY2UiLCJyb290IiwicXVlcnlTZWxlY3RvckFsbCIsInRlc3RHb2FsIiwiZ29hbCIsInRlc3QiLCJsYWJlbCIsInJlZnMiLCJzaXplcl9ibG9ja19sYWJlbCIsInNpemVyX2Jsb2NrIiwiY29tcHJlc3NvciIsInN0eWxlIiwid2lkdGgiLCJjbGllbnRXaWR0aCIsImhlaWdodCIsImNsaWVudEhlaWdodCIsImVsIiwiaW5pdGlhbENvbXB1dGVkIiwiTWF0aCIsIm1heCIsIm1pbiIsImZvbnRTaXplIiwiaW5uZXJIVE1MIiwib2Zmc2V0SGVpZ2h0Iiwic2Nyb2xsSGVpZ2h0Iiwib2Zmc2V0V2lkdGgiLCJzY3JvbGxXaWR0aCIsImlzTW91bnRlZCIsImdldEZvbnRTaXplIiwidmFsdWUiLCJzcGFjZU1hcmdpbiIsInNsaWNlV2lkdGgiLCJzbGljZUhlaWdodCJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEs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a0JDLGVBQWxCO0FBQ0Q7O0FBRUQsUUFBSSxDQUFDLEtBQUt2QyxTQUFMLENBQWV1QyxlQUFmLENBQUwsRUFBc0M7O0FBRXBDLFVBQUlDLFFBQVEsS0FBS0MsSUFBTCxDQUFVQyxnQkFBVixDQUEyQix1Q0FBM0IsRUFBb0UsQ0FBcEUsQ0FBWjs7QUFFQSxVQUFJLENBQUNGLEtBQUwsRUFBWTtBQUNWLFlBQUlVLGFBQWEsRUFBakI7QUFBQSxZQUFxQjVDLFNBQVMsS0FBS1csU0FBTCxDQUFlWCxNQUE3QztBQUFBLFlBQXFEZ0UsY0FBYyxFQUFuRTtBQUNBLFlBQUlDLGFBQWMsS0FBSzlCLElBQUwsQ0FBVVksV0FBVixHQUF3Qi9DLE1BQXpCLEdBQW9DLElBQUlnRSxXQUF6RDtBQUFBLFlBQ0VFLGNBQWUsS0FBSy9CLElBQUwsQ0FBVWMsWUFBVixHQUF5QmpELE1BQTFCLEdBQXFDLElBQUlnRSxXQUR6RDs7QUFHQSxlQUFPWixLQUFLQyxHQUFMLENBQVNELEtBQUtFLEdBQUwsQ0FBU1csY0FBY3JCLGFBQWEsRUFBM0IsQ0FBVCxFQUNaUSxLQUFLRSxHQUFMLENBQVNZLFdBQVQsRUFBc0J0RSxXQUF0QixDQURZLENBQVQsRUFDa0NELFdBRGxDLElBQ2lELElBRHhELENBQzZEO0FBQzlEO0FBQ0Y7O0FBRUQsV0FBTyxLQUFLRCxTQUFMLENBQWV1QyxlQUFmLEVBQWdDOEIsS0FBaEMsQ0FBUDtBQUNELEdBdEJrQixDQXNCakIvQyxJQXRCaUIsQ0FzQlosSUF0QlksQ0FBbkI7QUF3QkgsQ0FsS0QiLCJmaWxlIjoiYm9hcmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJyaW90LnRhZzIoJ2JvYXJkJywgJzxkaXYgY2xhc3M9XCJyb3dcIiBlYWNoPVwie3JvdywgeSBpbiBib2FyZFJvd3N9XCI+IDxzcGFjZSBlYWNoPVwie3RtcCwgeCBpbiByb3d9XCIgYnY9XCJ7cGFyZW50LmdldFZhbChwYXJlbnQueSwgeCl9XCIgbmV3PVwie3BhcmVudC5pc05ldyhwYXJlbnQueSx4KX1cIiB4PVwie3h9XCIgeT1cInt5fVwiIGNvbWJpbmVkPVwie3BhcmVudC5pc0NvbWJpbmVkKHBhcmVudC55LHgpfVwiIGNsYXNzPVwie25ldzogcGFyZW50LmlzTmV3KHBhcmVudC55LHgpfVwiPjwvc3BhY2U+IDwvZGl2PiA8ZGl2IGNsYXNzPVwicm93IGZvbnQtc2l6ZXJcIj4gPGRpdiBjbGFzcz1cInNwYWNlXCI+PGRpdiBjbGFzcz1cImJsb2NrXCIgcmVmPVwic2l6ZXJfYmxvY2tcIj48bGFiZWwgcmVmPVwic2l6ZXJfYmxvY2tfbGFiZWxcIj4yMDQ4PC9sYWJlbD48L2Rpdj48L2Rpdj4gPC9kaXY+JywgJycsICcnLCBmdW5jdGlvbihvcHRzKSB7XG4gICAgdGhpcy5nYW1lID0gb3B0cy5nYW1lO1xuICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5mb250U2l6ZXMgPSB7fTtcblxuICAgIGNvbnN0IG1pbkZvbnRTaXplID0gNSwgbWF4Rm9udFNpemUgPSAxMDA7XG5cbiAgICBmdW5jdGlvbiBjbG9uZU1hdHJpeChtYXRyaXgpIHtcbiAgICAgIHZhciBzaXplID0gbWF0cml4Lmxlbmd0aCwgbmV3TWF0cml4ID0gbmV3IEFycmF5KHNpemUpO1xuICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzaXplOyB5KyspIHtcbiAgICAgICAgbmV3TWF0cml4W3ldID0gbmV3IEFycmF5KHNpemUpO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNpemU7IHgrKykge1xuICAgICAgICAgIG5ld01hdHJpeFt5XVt4XSA9IG1hdHJpeFt5XVt4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5ld01hdHJpeDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVNb3ZlcyhtYXRyaXgsIG1vdmVzKSB7XG4gICAgICB2YXIgc2l6ZSA9IG1hdHJpeC5sZW5ndGgsIG5ld01hdHJpeCA9IG5ldyBBcnJheShzaXplKTtcbiAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2l6ZTsgeSsrKSB7XG4gICAgICAgIG5ld01hdHJpeFt5XSA9IG5ldyBBcnJheShzaXplKTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzaXplOyB4KyspIHtcbiAgICAgICAgICBsZXQgYmxvY2sgPSBtYXRyaXhbeV1beF07XG4gICAgICAgICAgYmxvY2suZGVsdGEgPSBtb3Zlc1t5XVt4XTtcbiAgICAgICAgICBibG9jay5pc05ldyA9IGZhbHNlO1xuICAgICAgICAgIG5ld01hdHJpeFt5XVt4XSA9IGJsb2NrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3TWF0cml4O1xuICAgIH1cblxuICAgIHRoaXMub24oJ21vdW50JywgKCkgPT4ge1xuICAgICAgdGhpcy5ib2FyZFJvd3MgPSBjbG9uZU1hdHJpeCh0aGlzLmdhbWUucm93cyk7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnBhcmVudC5vbignbmV3Z2FtZScsICgpID0+IHtcbiAgICAgIHRoaXMuYm9hcmRSb3dzID0gY2xvbmVNYXRyaXgodGhpcy5nYW1lLnJvd3MpO1xuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIHRoaXMuZm9udFNpemVzID0ge307XG4gICAgfSk7XG5cbiAgICB0aGlzLnBhcmVudC5vbignbW92ZScsIChkaXIpID0+IHtcbiAgICAgIHRoaXMudHJpZ2dlcignbW92ZScpO1xuICAgICAgaWYgKGRpcikge1xuXG4gICAgICAgIGlmICh0aGlzLmdhbWUuZ2FtZVN0YXR1cygpICE9PSAnYWN0aXZlJykgcmV0dXJuO1xuXG4gICAgICAgIGlmICh0aGlzLnRpbWVvdXQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxhc3RCb2FyZFJvd3MgPSB0aGlzLmJvYXJkUm93cyA9IHVwZGF0ZU1vdmVzKHRoaXMuYm9hcmRSb3dzLCB0aGlzLmdhbWUuZ2V0QmxvY2tNb3ZlbWVudHMoZGlyKSk7XG5cbiAgICAgICAgdmVudC50cmlnZ2VyKCdtb3ZlYmxvY2tzJyk7XG5cbiAgICAgICAgdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGRpcikgdGhpcy5nYW1lLnByb2Nlc3NNb3ZlKGRpcik7XG4gICAgICAgICAgdGhpcy51cGRhdGUoeyBib2FyZFJvd3M6IHRoaXMuZ2FtZS5yb3dzfSk7XG4gICAgICAgICAgdGhpcy5wYXJlbnQudHJpZ2dlcignbW92ZScpO1xuICAgICAgICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgICAgIH0sIDEwMCk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5ib2FyZFJvd3MgPSB0aGlzLmdhbWUucm93cztcbiAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICB0aGlzLm1peGluKHJpb3RBbmltYXRlKTtcblxuICAgIHRoaXMuaXNOZXcgPSBmdW5jdGlvbih5LHgpIHtcbiAgICAgIHJldHVybiB0aGlzLmdhbWUucm93c1t5XVt4XS5pc05ldztcbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMuaXNDb21iaW5lZCA9IGZ1bmN0aW9uKHkseCkge1xuICAgICAgaWYgKCF0aGlzLmxhc3RCb2FyZFJvd3MgfHwgIXRoaXMubGFzdEJvYXJkUm93cy5sZW5ndGgpIHJldHVybjtcbiAgICAgIHJldHVybiB0aGlzLmxhc3RCb2FyZFJvd3NbeV1beF0uZGVsdGEuY29tYmluZWQ7XG4gICAgfS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLmdldFZhbCA9IGZ1bmN0aW9uKHkseCkge1xuICAgICAgcmV0dXJuIHRoaXMuYm9hcmRSb3dzW3ldW3hdO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5vbignYmVmb3JlLXVwZGF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgdmVudC5vZmYoJyonKTtcbiAgICB9KTtcblxuICAgIHRoaXMuc2V0Rm9udFNpemVzID0gZnVuY3Rpb24oYm9hcmREaW1lbnNpb25zKVxuICAgIHtcbiAgICAgIGxldCBzcGFjZSA9IHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yQWxsKCdkaXY6bnRoLWNoaWxkKDEpID4gc3BhY2U6bnRoLWNoaWxkKDEpJylbMF07XG5cbiAgICAgIGlmICghc3BhY2UpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmZvbnRTaXplc1tib2FyZERpbWVuc2lvbnNdID0ge307XG5cbiAgICAgIGxldCB0ZXN0R29hbCA9IHRoaXMuZ2FtZS5vcHRzLmdvYWwsIHRlc3QgPSAyLCBsYWJlbCA9IHRoaXMucmVmcy5zaXplcl9ibG9ja19sYWJlbCwgYmxvY2sgPSB0aGlzLnJlZnMuc2l6ZXJfYmxvY2s7XG4gICAgICBsZXQgeSA9IG1heEZvbnRTaXplLCBjb21wcmVzc29yID0gLjI7XG5cbiAgICAgIGJsb2NrLnN0eWxlLndpZHRoID0gc3BhY2UuY2xpZW50V2lkdGggKyAncHgnO1xuICAgICAgYmxvY2suc3R5bGUuaGVpZ2h0ID0gc3BhY2UuY2xpZW50SGVpZ2h0ICsgJ3B4JztcblxuICAgICAgbGV0IGVsID0gYmxvY2s7XG5cbiAgICAgIGxldCBpbml0aWFsQ29tcHV0ZWQgPSBNYXRoLm1heChNYXRoLm1pbihlbC5jbGllbnRXaWR0aCAvIChjb21wcmVzc29yKjEwKSxcbiAgICAgICAgICBNYXRoLm1pbihlbC5jbGllbnRIZWlnaHQsIG1heEZvbnRTaXplKSksIG1pbkZvbnRTaXplKSArICdweCc7XG5cbiAgICAgIHdoaWxlICh0ZXN0IDw9IHRlc3RHb2FsKSB7XG4gICAgICAgIGVsLnN0eWxlLmZvbnRTaXplID0gaW5pdGlhbENvbXB1dGVkO1xuICAgICAgICBsYWJlbC5pbm5lckhUTUwgPSB0ZXN0O1xuICAgICAgICBpZiAoKGVsLm9mZnNldEhlaWdodCA8IGVsLnNjcm9sbEhlaWdodCkgfHwgKGVsLm9mZnNldFdpZHRoIDwgZWwuc2Nyb2xsV2lkdGgpKSB7XG4gICAgICAgICAgd2hpbGUgKCgoZWwub2Zmc2V0SGVpZ2h0IDwgZWwuc2Nyb2xsSGVpZ2h0KSB8fCAoZWwub2Zmc2V0V2lkdGggPCBlbC5zY3JvbGxXaWR0aCkpICYmIHkgPiBtaW5Gb250U2l6ZSkge1xuICAgICAgICAgICAgZWwuc3R5bGUuZm9udFNpemUgPSB5ICsgJ3B4JztcbiAgICAgICAgICAgIHktLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZvbnRTaXplc1tib2FyZERpbWVuc2lvbnNdW1wiXCIgKyB0ZXN0XSA9IGVsLnN0eWxlLmZvbnRTaXplO1xuXG4gICAgICAgIHRlc3QgKj0gMjtcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcylcblxuICAgIHRoaXMub24oJ3VwZGF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgbGV0IGJvYXJkRGltZW5zaW9ucyA9ICBgJHt0aGlzLnJvb3QuY2xpZW50SGVpZ2h0fXgke3RoaXMucm9vdC5jbGllbnRXaWR0aH1gO1xuXG4gICAgICBpZiAoIXRoaXMuZm9udFNpemVzW2JvYXJkRGltZW5zaW9uc10gJiYgdGhpcy5pc01vdW50ZWQpIHtcbiAgICAgICAgdGhpcy5zZXRGb250U2l6ZXMoYm9hcmREaW1lbnNpb25zKTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgdGhpcy5nZXRGb250U2l6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBsZXQgYm9hcmREaW1lbnNpb25zID0gIGAke3RoaXMucm9vdC5jbGllbnRIZWlnaHR9eCR7dGhpcy5yb290LmNsaWVudFdpZHRofWA7XG5cbiAgICAgIGlmICghdGhpcy5mb250U2l6ZXNbYm9hcmREaW1lbnNpb25zXSAmJiB0aGlzLmlzTW91bnRlZCkge1xuICAgICAgICB0aGlzLnNldEZvbnRTaXplcyhib2FyZERpbWVuc2lvbnMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuZm9udFNpemVzW2JvYXJkRGltZW5zaW9uc10pIHtcblxuICAgICAgICBsZXQgc3BhY2UgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbCgnZGl2Om50aC1jaGlsZCgxKSA+IHNwYWNlOm50aC1jaGlsZCgxKScpWzBdO1xuXG4gICAgICAgIGlmICghc3BhY2UpIHtcbiAgICAgICAgICBsZXQgY29tcHJlc3NvciA9IC4yLCBsZW5ndGggPSB0aGlzLmJvYXJkUm93cy5sZW5ndGgsIHNwYWNlTWFyZ2luID0gMTA7XG4gICAgICAgICAgbGV0IHNsaWNlV2lkdGggPSAodGhpcy5yb290LmNsaWVudFdpZHRoIC8gbGVuZ3RoKSAtICgyICogc3BhY2VNYXJnaW4pLFxuICAgICAgICAgICAgc2xpY2VIZWlnaHQgPSAodGhpcy5yb290LmNsaWVudEhlaWdodCAvIGxlbmd0aCkgLSAoMiAqIHNwYWNlTWFyZ2luKTtcblxuICAgICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLm1pbihzbGljZVdpZHRoIC8gKGNvbXByZXNzb3IgKiAxMCksXG4gICAgICAgICAgICAgIE1hdGgubWluKHNsaWNlSGVpZ2h0LCBtYXhGb250U2l6ZSkpLCBtaW5Gb250U2l6ZSkgKyAncHgnOztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5mb250U2l6ZXNbYm9hcmREaW1lbnNpb25zXVt2YWx1ZV07XG4gICAgfS5iaW5kKHRoaXMpXG5cbn0pO1xuIl19
'use strict';

riot.tag2('score', '<div> <div class="label">Score</div> <div class="value">{opts.gamescore}</div> <div class="plus {this.getAnimateClass()}">+{opts.diffscore}</div> </div>', 'score .label,[data-is="score"] .label{ color: #fff; font-size: .8em; }', '', function (opts) {
  this.getAnimateClass = function () {
    return opts.diffscore !== 0 ? 'animated fadeOutUp' : '';
  }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjb3JlLmpzIl0sIm5hbWVzIjpbInJpb3QiLCJ0YWcyIiwib3B0cyIsImdldEFuaW1hdGVDbGFzcyIsImRpZmZzY29yZSIsImJpbmQiXSwibWFwcGluZ3MiOiI7O0FBQUFBLEtBQUtDLElBQUwsQ0FBVSxPQUFWLEVBQW1CLDBKQUFuQixFQUErSyx3RUFBL0ssRUFBeVAsRUFBelAsRUFBNlAsVUFBU0MsSUFBVCxFQUFlO0FBQ3hRLE9BQUtDLGVBQUwsR0FBdUIsWUFBVztBQUNoQyxXQUFPRCxLQUFLRSxTQUFMLEtBQW1CLENBQW5CLEdBQXVCLG9CQUF2QixHQUE0QyxFQUFuRDtBQUNELEdBRnNCLENBRXJCQyxJQUZxQixDQUVoQixJQUZnQixDQUF2QjtBQUdILENBSkQiLCJmaWxlIjoic2NvcmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJyaW90LnRhZzIoJ3Njb3JlJywgJzxkaXY+IDxkaXYgY2xhc3M9XCJsYWJlbFwiPlNjb3JlPC9kaXY+IDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPntvcHRzLmdhbWVzY29yZX08L2Rpdj4gPGRpdiBjbGFzcz1cInBsdXMge3RoaXMuZ2V0QW5pbWF0ZUNsYXNzKCl9XCI+K3tvcHRzLmRpZmZzY29yZX08L2Rpdj4gPC9kaXY+JywgJ3Njb3JlIC5sYWJlbCxbZGF0YS1pcz1cInNjb3JlXCJdIC5sYWJlbHsgY29sb3I6ICNmZmY7IGZvbnQtc2l6ZTogLjhlbTsgfScsICcnLCBmdW5jdGlvbihvcHRzKSB7XG4gICAgdGhpcy5nZXRBbmltYXRlQ2xhc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBvcHRzLmRpZmZzY29yZSAhPT0gMCA/ICdhbmltYXRlZCBmYWRlT3V0VXAnOicnO1xuICAgIH0uYmluZCh0aGlzKVxufSk7XG4iXX0=
'use strict';

riot.tag2('size', '<div each="{val, i in sizes}" onclick="{setSize}"> {val} <span if="{val === parent.boardSize}">&#10004;</span> </div>', 'size div { cursor: pointer; padding: 4px; }', '', function (opts) {

    this.sizes = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    this.setSize = function (e) {
        this.parent.setBoardSize(e.item.val);
    }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpemUuanMiXSwibmFtZXMiOlsicmlvdCIsInRhZzIiLCJvcHRzIiwic2l6ZXMiLCJzZXRTaXplIiwiZSIsInBhcmVudCIsInNldEJvYXJkU2l6ZSIsIml0ZW0iLCJ2YWwiLCJiaW5kIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxLQUFLQyxJQUFMLENBQVUsTUFBVixFQUFrQix1SEFBbEIsRUFBMkksNkNBQTNJLEVBQTBMLEVBQTFMLEVBQThMLFVBQVNDLElBQVQsRUFBZTs7QUFFek0sU0FBS0MsS0FBTCxHQUFhLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLEVBQVUsQ0FBVixFQUFhLENBQWIsRUFBZ0IsQ0FBaEIsRUFBbUIsQ0FBbkIsRUFBc0IsQ0FBdEIsRUFBeUIsRUFBekIsQ0FBYjs7QUFFQSxTQUFLQyxPQUFMLEdBQWUsVUFBU0MsQ0FBVCxFQUFZO0FBQ3pCLGFBQUtDLE1BQUwsQ0FBWUMsWUFBWixDQUF5QkYsRUFBRUcsSUFBRixDQUFPQyxHQUFoQztBQUNELEtBRmMsQ0FFYkMsSUFGYSxDQUVSLElBRlEsQ0FBZjtBQUlILENBUkQiLCJmaWxlIjoic2l6ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInJpb3QudGFnMignc2l6ZScsICc8ZGl2IGVhY2g9XCJ7dmFsLCBpIGluIHNpemVzfVwiIG9uY2xpY2s9XCJ7c2V0U2l6ZX1cIj4ge3ZhbH0gPHNwYW4gaWY9XCJ7dmFsID09PSBwYXJlbnQuYm9hcmRTaXplfVwiPiYjMTAwMDQ7PC9zcGFuPiA8L2Rpdj4nLCAnc2l6ZSBkaXYgeyBjdXJzb3I6IHBvaW50ZXI7IHBhZGRpbmc6IDRweDsgfScsICcnLCBmdW5jdGlvbihvcHRzKSB7XG5cbiAgICB0aGlzLnNpemVzID0gWzIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwXTtcblxuICAgIHRoaXMuc2V0U2l6ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRoaXMucGFyZW50LnNldEJvYXJkU2l6ZShlLml0ZW0udmFsKTtcbiAgICB9LmJpbmQodGhpcylcblxufSk7XG4iXX0=
'use strict';

riot.tag2('space', '<block if="{opts.bv.val != 0}" bv="{opts.bv}" new="{opts.new}" combined="{opts.combined}" fontsize="{getFontSize()}"> </block>', '', '', function (opts) {
  var _this = this;

  this.mixin(riotAnimate);

  this.isMoving = function (y, x) {
    return this.parent.boardRows[y][x].delta.dx || this.parent.boardRows[y][x].delta.dy;
  }.bind(this);

  this.getFontSize = function () {
    return this.parent.getFontSize('' + opts.bv.val);
  }.bind(this);

  this.on('mount', function () {
    _this.block = opts.bv;
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNwYWNlLmpzIl0sIm5hbWVzIjpbInJpb3QiLCJ0YWcyIiwib3B0cyIsIm1peGluIiwicmlvdEFuaW1hdGUiLCJpc01vdmluZyIsInkiLCJ4IiwicGFyZW50IiwiYm9hcmRSb3dzIiwiZGVsdGEiLCJkeCIsImR5IiwiYmluZCIsImdldEZvbnRTaXplIiwiYnYiLCJ2YWwiLCJvbiIsImJsb2NrIl0sIm1hcHBpbmdzIjoiOztBQUFBQSxLQUFLQyxJQUFMLENBQVUsT0FBVixFQUFtQixnSUFBbkIsRUFBcUosRUFBckosRUFBeUosRUFBekosRUFBNkosVUFBU0MsSUFBVCxFQUFlO0FBQUE7O0FBRXhLLE9BQUtDLEtBQUwsQ0FBV0MsV0FBWDs7QUFFQSxPQUFLQyxRQUFMLEdBQWdCLFVBQVNDLENBQVQsRUFBV0MsQ0FBWCxFQUFjO0FBQzVCLFdBQU8sS0FBS0MsTUFBTCxDQUFZQyxTQUFaLENBQXNCSCxDQUF0QixFQUF5QkMsQ0FBekIsRUFBNEJHLEtBQTVCLENBQWtDQyxFQUFsQyxJQUF3QyxLQUFLSCxNQUFMLENBQVlDLFNBQVosQ0FBc0JILENBQXRCLEVBQXlCQyxDQUF6QixFQUE0QkcsS0FBNUIsQ0FBa0NFLEVBQWpGO0FBQ0QsR0FGZSxDQUVkQyxJQUZjLENBRVQsSUFGUyxDQUFoQjs7QUFJQSxPQUFLQyxXQUFMLEdBQW1CLFlBQVc7QUFDNUIsV0FBTyxLQUFLTixNQUFMLENBQVlNLFdBQVosQ0FBd0IsS0FBS1osS0FBS2EsRUFBTCxDQUFRQyxHQUFyQyxDQUFQO0FBQ0QsR0FGa0IsQ0FFakJILElBRmlCLENBRVosSUFGWSxDQUFuQjs7QUFJQSxPQUFLSSxFQUFMLENBQVEsT0FBUixFQUFpQixZQUFNO0FBQ3JCLFVBQUtDLEtBQUwsR0FBYWhCLEtBQUthLEVBQWxCO0FBQ0QsR0FGRDtBQUlILENBaEJEIiwiZmlsZSI6InNwYWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsicmlvdC50YWcyKCdzcGFjZScsICc8YmxvY2sgaWY9XCJ7b3B0cy5idi52YWwgIT0gMH1cIiBidj1cIntvcHRzLmJ2fVwiIG5ldz1cIntvcHRzLm5ld31cIiBjb21iaW5lZD1cIntvcHRzLmNvbWJpbmVkfVwiIGZvbnRzaXplPVwie2dldEZvbnRTaXplKCl9XCI+IDwvYmxvY2s+JywgJycsICcnLCBmdW5jdGlvbihvcHRzKSB7XG5cbiAgICB0aGlzLm1peGluKHJpb3RBbmltYXRlKTtcblxuICAgIHRoaXMuaXNNb3ZpbmcgPSBmdW5jdGlvbih5LHgpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcmVudC5ib2FyZFJvd3NbeV1beF0uZGVsdGEuZHggfHwgdGhpcy5wYXJlbnQuYm9hcmRSb3dzW3ldW3hdLmRlbHRhLmR5O1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5nZXRGb250U2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMucGFyZW50LmdldEZvbnRTaXplKCcnICsgb3B0cy5idi52YWwpO1xuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgdGhpcy5vbignbW91bnQnLCAoKSA9PiB7XG4gICAgICB0aGlzLmJsb2NrID0gb3B0cy5idjtcbiAgICB9KTtcblxufSk7XG4iXX0=
'use strict';

riot.tag2('winlose', '<div animate="zoomIn" animate-leave="zoomOut" animate-duration="300ms"> {getStatus()} </div>', '', '', function (opts) {
  var _this = this;

  this.mixin(riotAnimate);

  var prevMsg = '';

  this.root.addEventListener("transitionend", function () {
    if (opts.gamestatus.toLowerCase() === 'active') {
      _this.root.style.zIndex = 0;
    }
  }, false);

  this.getStatus = function () {
    var verb = '';
    switch (opts.gamestatus) {
      case 'win':
        verb = 'won';break;
      case 'loss':
        verb = 'lose';break;
      default:
        verb = '?';break;
    }
    var newMsg = 'YOU ' + verb.toUpperCase() + '!';
    if (opts.gamestatus && opts.gamestatus.toLowerCase() !== 'active') {
      prevMsg = newMsg;
      this.root.style.zIndex = 500;
      return newMsg;
    } else {
      return prevMsg;
    }
  }.bind(this);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndpbmxvc2UuanMiXSwibmFtZXMiOlsicmlvdCIsInRhZzIiLCJvcHRzIiwibWl4aW4iLCJyaW90QW5pbWF0ZSIsInByZXZNc2ciLCJyb290IiwiYWRkRXZlbnRMaXN0ZW5lciIsImdhbWVzdGF0dXMiLCJ0b0xvd2VyQ2FzZSIsInN0eWxlIiwiekluZGV4IiwiZ2V0U3RhdHVzIiwidmVyYiIsIm5ld01zZyIsInRvVXBwZXJDYXNlIiwiYmluZCJdLCJtYXBwaW5ncyI6Ijs7QUFBQUEsS0FBS0MsSUFBTCxDQUFVLFNBQVYsRUFBcUIsOEZBQXJCLEVBQXFILEVBQXJILEVBQXlILEVBQXpILEVBQTZILFVBQVNDLElBQVQsRUFBZTtBQUFBOztBQUN4SSxPQUFLQyxLQUFMLENBQVdDLFdBQVg7O0FBRUEsTUFBSUMsVUFBVSxFQUFkOztBQUVBLE9BQUtDLElBQUwsQ0FBVUMsZ0JBQVYsQ0FBMkIsZUFBM0IsRUFBNEMsWUFBTTtBQUNoRCxRQUFJTCxLQUFLTSxVQUFMLENBQWdCQyxXQUFoQixPQUFrQyxRQUF0QyxFQUFnRDtBQUM5QyxZQUFLSCxJQUFMLENBQVVJLEtBQVYsQ0FBZ0JDLE1BQWhCLEdBQXlCLENBQXpCO0FBQ0Q7QUFDRixHQUpELEVBSUcsS0FKSDs7QUFNQSxPQUFLQyxTQUFMLEdBQWlCLFlBQVc7QUFDMUIsUUFBSUMsT0FBTyxFQUFYO0FBQ0EsWUFBUVgsS0FBS00sVUFBYjtBQUNFLFdBQUssS0FBTDtBQUFZSyxlQUFPLEtBQVAsQ0FBYztBQUMxQixXQUFLLE1BQUw7QUFBYUEsZUFBTyxNQUFQLENBQWU7QUFDNUI7QUFBU0EsZUFBTyxHQUFQLENBQVk7QUFIdkI7QUFLQSxRQUFNQyxrQkFBZ0JELEtBQUtFLFdBQUwsRUFBaEIsTUFBTjtBQUNBLFFBQUliLEtBQUtNLFVBQUwsSUFBbUJOLEtBQUtNLFVBQUwsQ0FBZ0JDLFdBQWhCLE9BQWtDLFFBQXpELEVBQW1FO0FBQ2pFSixnQkFBVVMsTUFBVjtBQUNBLFdBQUtSLElBQUwsQ0FBVUksS0FBVixDQUFnQkMsTUFBaEIsR0FBeUIsR0FBekI7QUFDQSxhQUFPRyxNQUFQO0FBQ0QsS0FKRCxNQUlPO0FBQ0wsYUFBT1QsT0FBUDtBQUNEO0FBQ0YsR0FmZ0IsQ0FlZlcsSUFmZSxDQWVWLElBZlUsQ0FBakI7QUFpQkgsQ0E1QkQiLCJmaWxlIjoid2lubG9zZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInJpb3QudGFnMignd2lubG9zZScsICc8ZGl2IGFuaW1hdGU9XCJ6b29tSW5cIiBhbmltYXRlLWxlYXZlPVwiem9vbU91dFwiIGFuaW1hdGUtZHVyYXRpb249XCIzMDBtc1wiPiB7Z2V0U3RhdHVzKCl9IDwvZGl2PicsICcnLCAnJywgZnVuY3Rpb24ob3B0cykge1xuICAgIHRoaXMubWl4aW4ocmlvdEFuaW1hdGUpO1xuXG4gICAgbGV0IHByZXZNc2cgPSAnJztcblxuICAgIHRoaXMucm9vdC5hZGRFdmVudExpc3RlbmVyKFwidHJhbnNpdGlvbmVuZFwiLCAoKSA9PiB7XG4gICAgICBpZiAob3B0cy5nYW1lc3RhdHVzLnRvTG93ZXJDYXNlKCkgPT09ICdhY3RpdmUnKSB7XG4gICAgICAgIHRoaXMucm9vdC5zdHlsZS56SW5kZXggPSAwO1xuICAgICAgfVxuICAgIH0sIGZhbHNlKTtcblxuICAgIHRoaXMuZ2V0U3RhdHVzID0gZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgdmVyYiA9ICcnO1xuICAgICAgc3dpdGNoIChvcHRzLmdhbWVzdGF0dXMpIHtcbiAgICAgICAgY2FzZSAnd2luJzogdmVyYiA9ICd3b24nOyBicmVhaztcbiAgICAgICAgY2FzZSAnbG9zcyc6IHZlcmIgPSAnbG9zZSc7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiB2ZXJiID0gJz8nOyBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld01zZyA9IGBZT1UgJHt2ZXJiLnRvVXBwZXJDYXNlKCl9IWA7XG4gICAgICBpZiAob3B0cy5nYW1lc3RhdHVzICYmIG9wdHMuZ2FtZXN0YXR1cy50b0xvd2VyQ2FzZSgpICE9PSAnYWN0aXZlJykge1xuICAgICAgICBwcmV2TXNnID0gbmV3TXNnO1xuICAgICAgICB0aGlzLnJvb3Quc3R5bGUuekluZGV4ID0gNTAwO1xuICAgICAgICByZXR1cm4gbmV3TXNnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXZNc2c7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpXG5cbn0pOyJdfQ==
//# sourceMappingURL=2048.js.map
