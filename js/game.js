if (typeof Object.assign != 'function') {
  Object.assign = function(target) {
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

  const DEFAULT_SIZE = 4;
  const DEFAULT_GOAL = 2048;
  const DEFAULT_NEW_BLOCK_COUNT = 1;

  var opts = Object.assign({
    size: DEFAULT_SIZE,
    goal: DEFAULT_GOAL,
    newBlockCount: DEFAULT_NEW_BLOCK_COUNT
  }, _opts);

  this.boardUndoStack = [];
  this.boardRedoStack = [];

  this.getStartBlocks = (blocks, boardSize) => {
    var loc = [Math.floor(boardSize * Math.random()), Math.floor(boardSize * Math.random())];
    if (!blocks.some(b => b[0] == loc[0] && b[1] == loc[1])) {
      blocks.push(loc);
      return blocks;
    } else {
      return this.getStartBlocks(blocks, boardSize);
    }
  };

  this.gameStatus = () => {
    return this.status;
  };

  this.getNewBlocks = (matrix, count, newBlocks) => {
    if (0 == count--) return newBlocks;
    var boardSize = matrix.length, available = [];
    var newMatrix = cloneMatrix(matrix);
    for (var i = 0; i < boardSize; i++) {
      for (var j = 0; j < boardSize; j++) {
        if (!matrix[i][j].val) available.push({y: i, x: j});
      }
    }

    if (!available.length) return newBlocks;

    var c = available[Math.floor(available.length * Math.random())];
    newBlocks.push(c);
    newMatrix[c.y][c.x].val = 2;
    return this.getNewBlocks(newMatrix, count, newBlocks);
  };

  this.maybeGetBlock = (blocks, x, y) => {
    var val = blocks.some(b => b[0] == x && b[1] == y) ? 2 : 0;
    return { val, combined: false, startY: y, startX: x, moved: 0 };
  };

  this.newGame = () => {
    this.status = 'active';
    this.boardSize = opts.size;
    var gameBlocks = this.getStartBlocks([], this.boardSize);
    gameBlocks = this.getStartBlocks(gameBlocks, this.boardSize);
    this.rows = [];
    for (var i = 0; i < this.boardSize; i++) {
      var row = [];
      for (var j = 0; j < this.boardSize; j++) {
        row.push(this.maybeGetBlock(gameBlocks, i, j));
      }
      this.rows.push(row);
    }
  };

  this.combineValuesUp = (matrix, secondPass) => {
    var size = matrix.length, combined = cloneMatrix(matrix);

    for (var x = 0; x < size; x++) {
      let size_r = size;
      for (var y = 0; y < size_r - 1; y++) {
        let curBlock = combined[y][x],
          nextBlock = combined[y + 1][x];

        if (curBlock.val === 0) {
          let y1;
          for (y1 = y; y1 < size_r - 1; y1++) {
            combined[y1][x] = Object.assign({}, combined[y1 + 1][x]);
          }
          combined[y1][x].val = 0;
          y--; size_r--;
        } else {
          if (curBlock.val === nextBlock.val && !curBlock.combined && !nextBlock.combined) {
            let y1;
            combined[y][x] = Object.assign({}, nextBlock, { combined: { y: curBlock.startY, x: curBlock.startX }, val: curBlock.val * 2});
            nextBlock.val = 0;
            for (y1 = y+1; y1 < size_r - 1; y1++) {
              combined[y1][x] = Object.assign({ }, combined[y1 + 1][x]);
            }
            combined[y1][x].val = 0;
            y--; size_r--;
          }
        }
      }
    }

    if (!secondPass) {
      return this.combineValuesUp(combined, true);
    }
    return combined;
  };

  this.getBlockMovements = direction => {
    var size = this.rows.length,  blocks = [];

    var preview = this.moveBlocks(direction);

    for (let y = 0; y < size; y++) {
      blocks.push(new Array(size));
      for (let x = 0; x < size; x++) {
        blocks[y][x] = 0;
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        //  let block = this.rows[y][x];
        let newBlock = preview[y][x];

        let dx = 0, dy = 0;

        switch (direction) {
          case 'up':
          case 'down':
            dy = y - newBlock.startY; break;
          case 'left':
          case 'right':
            dx = x - newBlock.startX ; break;
        }
        //console.log(y,x,dy,dx,n,block,newBlock)

        if ((dy || dx)  && newBlock.val)
          blocks[newBlock.startY][newBlock.startX] = { dy, dx };

        if (newBlock.combined) {
          let dx = 0, dy = 0;
          switch (direction) {
            case 'up':
            case 'down':
              dy = y - newBlock.combined.y; break;
            case 'left':
            case 'right':
              dx = x - newBlock.combined.x ; break;
          }
          //console.log(y,x,dy,dx,newBlock.combined)

          if ((dy || dx)  && newBlock.val)
            blocks[newBlock.combined.y][newBlock.combined.x] = { dy, dx, removed: true };
            blocks[y][x] = Object.assign({ combined: true }, blocks[y][x]);
        }
      }
    }

    return blocks;
  };

  this.processMove = direction => {

    var size = this.rows.length, moves = [];

    if (this.status != 'active')
      return;

    function possibleMoves(matrix, x, y) {
      var nbs = [[-1,0,'up'],[0,-1,'left'],[0,1,'right'],[1,0,'down']], moves = [];
      for (var j=0; j<nbs.length; j++) {
        var y1 = y + nbs[j][0], x1 = x + nbs[j][1];
        if (x1 >= 0 && y1 >= 0 && x1 < size && y1 < size) {
          if (matrix[y1][x1].val == matrix[y][x].val || !matrix[y1][x1].val)
            moves.push(nbs[j][2]);
        }
      }
      return moves;
    }

    this.transformMatrix(direction, function(transformedMatrix) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          moves.push(possibleMoves(transformedMatrix, x, y));
        }
      }
      return transformedMatrix;
    });

    if (!moves.some(b => b.length != 0))
      this.status = 'loss';

    if (!moves.some(b => b.some(m => m == "up"))) // not `== direction` because of rotation
      return;

    this.boardUndoStack.push( this.rows );
    this.boardRedoStack = [];

    this.rows = updateProps(this.moveBlocks(direction));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.rows[y][x].val >= opts.goal) {
          this.status = 'win'; break;
        }
      }
    }

    if (this.status == 'active') {
      var newMatrix = cloneMatrix(this.rows);

      this.newBlocks = this.getNewBlocks(this.rows, opts.newBlockCount, []);
      this.newBlocks.forEach(c => Object.assign(newMatrix[c.y][c.x], { val:2, isNew:true }));
      this.rows = newMatrix;
    }

  };

  this.moveBlocks = direction => this.transformMatrix(direction, this.combineValuesUp);

  this.undo = () => {
    if (this.boardUndoStack.length) {
      this.status = 'active';
      var redo  = this.rows;
      this.rows = this.boardUndoStack.pop();
      this.boardRedoStack.push(redo);
    }
  };

  this.redo = () => {
    if (this.boardRedoStack.length) {
      var undo  = this.rows;
      this.rows = this.boardRedoStack.pop();
      this.boardUndoStack.push(undo);
    }
  };


  // matrix helpers

  this.transpose = matrix => {
    var size = matrix.length, trans = new Array(size);
    for (var y = 0; y < size; y++) {
      trans[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        trans[y][x] = Object.assign({}, matrix[x][y]);
      }
    }
    return trans;
  };

  this.reverseEachRow = matrix => {

    var size = matrix.length, reversed = new Array(size);
    for (var y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[y][size - x - 1]);
      }
    }
    return reversed;
  };

  this.reverseEachColumn = matrix => {

    var size = matrix.length, reversed = new Array(size);
    for (var y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (var x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[size - y - 1][x]);
      }
      //reversed[y] = Object.assign({}, matrix[size - y - 1]);
    }
    return reversed;
  };

  this.printMatrix = (matrix) => {
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

  this.rotate = (direction, matrix) => {
    switch (direction) {
      case 'left':
        return this.reverseEachColumn(this.transpose(matrix));
      case 'right':
        return this.reverseEachRow(this.transpose(matrix));
      default:
        break;
    }
    return matrix;
  };

  this.flip = matrix => {
    return this.reverseEachRow(this.reverseEachColumn(cloneMatrix(matrix)));
  };

  this.transformMatrix = (direction, callback) => {
    switch (direction) {
      case 'left':
        return this.rotate('left', callback(this.rotate('right', this.rows)));
        break;
      case 'right':
        return this.rotate('right', callback(this.rotate('left', this.rows)));
        break;
      case 'up':
        return callback(this.rows);
        break;
      case 'down':
        return this.flip(callback(this.flip(this.rows)));
        break;
      default:
        return; break;
    }
  };

  this.addProps = (matrix) => {
    var size = matrix.length, newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = { val: matrix[y][x], combined: false, startY: y, startX: x, moved: 0 };
      }
    }
    return newMatrix;
  };

  this.removeProps = (matrix) => {
    var size = matrix.length, newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = matrix[y][x].val;
      }
    }
    return newMatrix;
  };

  function updateProps(matrix) {
    var size = matrix.length, newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        newMatrix[y][x] = { val: matrix[y][x].val, combined: false, startY: y, startX: x, moved: 0, isNew: false};
      }
    }
    return newMatrix;
  }

  function cloneMatrix(matrix) {
    var size = matrix.length, newMatrix = new Array(size);
    for (var y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (var x = 0; x < size; x++) {
        if (typeof matrix[y][x] == 'object')
          newMatrix[y][x] = Object.assign({}, matrix[y][x]);
        //else
        //newMatrix[y][x] = matrix[y][x];
      }
    }
    return newMatrix;
  }

}