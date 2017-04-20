if (typeof Object.assign != 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (let index = 1; index < arguments.length; index++) {
      const source = arguments[index];
      if (source != null) {
        for (let key in source) {
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
  const NEW_BLOCK_VAL_HIGH = 4;
  const NEW_BLOCK_VAL_LOW = 2;
  const HIGH_LOW_RATIO = .75;
  const HIGH_BLOCK_PERMITTED = 1 / 256;

  let opts = Object.assign({
    size: DEFAULT_SIZE,
    goal: DEFAULT_GOAL,
    newBlockCount: DEFAULT_NEW_BLOCK_COUNT,

  }, _opts);

  this.boardUndoStack = [];
  this.boardRedoStack = [];
  this.score = 0;

  this.getStartBlocks = (blocks, boardSize) => {
    const loc = [Math.floor(boardSize * Math.random()), Math.floor(boardSize * Math.random())];
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
    const boardSize = matrix.length, available = [];
    const newMatrix = cloneMatrix(matrix);
    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        if (!matrix[i][j].val) available.push({y: i, x: j});
      }
    }

    if (!available.length) return newBlocks;

    const c = available[Math.floor(available.length * Math.random())];
    newBlocks.push(c);
    newMatrix[c.y][c.x].val = 2;
    return this.getNewBlocks(newMatrix, count, newBlocks);
  };

  this.maybeGetBlock = (blocks, x, y) => {
    const val = blocks.some(b => b[0] == x && b[1] == y) ? 2 : 0;
    return { val, combined: false, startY: y, startX: x, moved: 0 };
  };

  this.newGame = (newOpts) => {
    this.status = 'active';
    opts = Object.assign({}, opts, newOpts);
    this.boardSize = opts.size;
    this.maxBlockValue = 2;

    let gameBlocks = this.getStartBlocks([], this.boardSize);
    gameBlocks = this.getStartBlocks(gameBlocks, this.boardSize);

    this.rows = [];
    for (let i = 0; i < this.boardSize; i++) {
      const row = [];
      for (let j = 0; j < this.boardSize; j++) {
        row.push(this.maybeGetBlock(gameBlocks, i, j));
      }
      this.rows.push(row);
    }
    this.rows = this.updateProps(this.rows);
  };

  this.combineValuesUp = (matrix, secondPass) => {
    const size = matrix.length, combined = cloneMatrix(matrix);

    for (let x = 0; x < size; x++) {
      let size_r = size;
      for (let y = 0; y < size_r - 1; y++) {
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
            const newValue = curBlock.val * 2;
            this.score += newValue;
            debugger;
            combined[y][x] = Object.assign({}, nextBlock, { combined: { y: curBlock.startY, x: curBlock.startX }, val: newValue});
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
    const size = this.rows.length, blocks = [];

    const preview = this.moveBlocks(direction);

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

  this.possibleMoves = (matrix, y, x)  => {
    const size = this.rows.length, moves = [];
    const nbs = [[-1, 0, 'up'], [0, -1, 'left'], [0, 1, 'right'], [1, 0, 'down']];
    for (let j=0; j<nbs.length; j++) {
      const y1 = y + nbs[j][0], x1 = x + nbs[j][1];
      if (x1 >= 0 && y1 >= 0 && x1 < size && y1 < size) {
        if (matrix[y][x].val && (matrix[y1][x1].val == matrix[y][x].val || !matrix[y1][x1].val))
          moves.push(nbs[j][2]);
      }
    }
    return moves;
  };


  this.getNewBlockValue = (notRandom) => (this.maxBlockValue >= opts.goal * HIGH_BLOCK_PERMITTED && (notRandom || Math.random() > HIGH_LOW_RATIO)) ? NEW_BLOCK_VAL_HIGH: NEW_BLOCK_VAL_LOW;

  this.processMove = direction => {

    const size = this.rows.length, moves = [];

    if (this.status !== 'active')
      return;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.rows[y][x].possibleMoves.length)
        moves.push(this.rows[y][x].possibleMoves);
      }
    }

    if (!moves.some(b => b.some(m => m === direction)))
      return;

    this.boardUndoStack.push( this.rows );
    this.boardRedoStack = [];

    this.rows = this.moveBlocks(direction);

    if (this.checkWin()) return;

    this.newBlocks = this.getNewBlocks(this.rows, opts.newBlockCount, []);
    const newVal = this.getNewBlockValue();
    this.newBlocks.forEach(c => {
      Object.assign(this.rows[c.y][c.x], getDefaults(c.y, c.x, newVal, null), { isNew: true });

    });

    this.rows = this.updateProps(this.rows);

    this.checkLoss();

  };

  this.checkWin = () => {
    const size = this.rows.length;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.rows[y][x].val >= this.maxBlockValue) {
          this.maxBlockValue = this.rows[y][x].val;
        }
      }
    }

    if (this.maxBlockValue >= opts.goal) {
      this.status = 'win';
      return true;
    }

    return false;
  };

  this.checkLoss = () => {
    const size = this.rows.length, moves = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        moves.push(this.rows[y][x].possibleMoves);
      }
    }
    if (!moves.some(b => b.length != 0)) {
      this.status = 'loss'; return true;
    }

    return false;
  };

  this.moveBlocks = direction => this.transformMatrix(direction, this.combineValuesUp);

  this.undo = () => {
    if (this.boardUndoStack.length) {
      this.status = 'active';
      const redo = this.rows;
      this.rows = this.boardUndoStack.pop();
      this.boardRedoStack.push(redo);
    }
  };

  this.redo = () => {
    if (this.boardRedoStack.length) {
      const undo = this.rows;
      this.rows = this.boardRedoStack.pop();
      this.boardUndoStack.push(undo);
      this.checkWin();
      this.checkLoss();
    }
  };


  // matrix helpers

  this.transpose = matrix => {
    const size = matrix.length, trans = new Array(size);
    for (let y = 0; y < size; y++) {
      trans[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        trans[y][x] = Object.assign({}, matrix[x][y]);
      }
    }
    return trans;
  };

  this.reverseEachRow = matrix => {

    const size = matrix.length, reversed = new Array(size);
    for (let y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[y][size - x - 1]);
      }
    }
    return reversed;
  };

  this.reverseEachColumn = matrix => {

    const size = matrix.length, reversed = new Array(size);
    for (let y = 0; y < size; y++) {
      reversed[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        reversed[y][x] = Object.assign({}, matrix[size - y - 1][x]);
      }
      //reversed[y] = Object.assign({}, matrix[size - y - 1]);
    }
    return reversed;
  };

  this.printMatrix = (matrix) => {
    const size = matrix.length;
    console.log('----');
    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
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

  this.transformMatrix = (direction, combineFn) => {
    switch (direction) {
      case 'left':
        return this.rotate('left', combineFn.call(this, this.rotate('right', this.rows)));
        break;
      case 'right':
        return this.rotate('right', combineFn.call(this, this.rotate('left', this.rows)));
        break;
      case 'up':
        return combineFn.call(this, this.rows);
        break;
      case 'down':
        return this.flip(combineFn.call(this, this.flip(this.rows)));
        break;
      default:
        return; break;
    }
  };

  this.addProps = (matrix) => {
    const size = matrix.length, newMatrix = new Array(size);
    for (let y = 0; y < size; y++) {
      newMatrix[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        newMatrix[y][x] = getDefaults(y, x, matrix[y][x], []);
      }
    }
    return this.updateProps(newMatrix);
  };

  this.removeProps = (matrix) => {
    const size = matrix.length, newMatrix = new Array(size);
    for (let y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (let x = 0; x < size; x++) {
        newMatrix[y][x] = matrix[y][x].val;
      }
    }
    return newMatrix;
  };

  this.updateProps = (matrix) => {
    const size = matrix.length, newMatrix = new Array(size);
    for (let y = 0; y < size; y++) {
      newMatrix[y] = new Array(size);
      for (let x = 0; x < size; x++) {
        newMatrix[y][x] = getDefaults(y, x, matrix[y][x].val, this.possibleMoves(matrix, y, x));
      }
    }
    return newMatrix;
  };

  function getDefaults (y, x, val, moves) {
    return {
      val: val,
      combined: false,
      startY: y,
      startX: x,
      moved: 0,
      possibleMoves: moves,
      isNew: false
    }
  }
  function cloneMatrix(matrix) {
    const size = matrix.length, newMatrix = new Array(size);
    for (let y = 0; y < size; y++) {
      newMatrix[y] = Array(size);
      for (let x = 0; x < size; x++) {
        if (typeof matrix[y][x] == 'object')
          newMatrix[y][x] = Object.assign({}, matrix[y][x]);
        //else
        //newMatrix[y][x] = matrix[y][x];
      }
    }
    return newMatrix;
  }

}