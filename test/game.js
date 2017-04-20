var expect = chai.expect;

describe('processMove', function () {
  it('accept different board sizes', function () {
    var bi = new Game({size: 8});
    bi.newGame();
    expect(bi.rows.length).to.equal(8);
    bi = new Game({size: 5});
    bi.newGame();
    expect(bi.rows.length).to.equal(5);
  });

  it('newGame should reset board (also tests add/RemoveProps)', function () {
    var bi = new Game();
    bi.newGame();
    var matrix = [[0, 2, 0, 4], [0, 2, 2, 3], [99, 3, 0, 3], [0, 0, 0, 1]];
    bi.rows = bi.addProps(matrix);
    expect(bi.removeProps(bi.rows)).to.deep.equal(matrix);
    bi.newGame();
    expect(bi.rows.reduce((total, row) => total + row.filter(e => e.val > 0).length, 0)).to.equal(2);
  });

  it('should add start adding higher number blocks after there\'s a block 1/8 of the goal block', function () {
    var bi = new Game();
    bi.newGame();
    var matrix = [[128, 128, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    bi.rows = bi.addProps(matrix);
    bi.processMove('left');
    expect(bi.maxBlockValue).to.equal(256);
    expect(bi.getNewBlockValue(true)).to.equal(4);

  });
  //
  // 4 2 0 0
  // 4 2 2 0
  // 2 0 0 0
  // 0 2 2 0

  it('should combine any matching blocks', function () {
    var bi = new Game();
    bi.newGame();
    bi.rows = bi.addProps([[0, 2, 0, 4], [0, 2, 2, 3], [99, 3, 0, 3], [0, 0, 0, 1]]);
    expect(bi.removeProps(bi.moveBlocks('left'))).to.deep.equal([[2,4,0,0],[4,3,0,0],[99,6,0,0],[1,0,0,0]]);
    // ensure blocks previously combined (nextBlock) aren't combined again on second pass:
    bi.rows = bi.addProps([[4, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(bi.removeProps(bi.moveBlocks('left'))).to.deep.equal([[4,4,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
    bi.rows = bi.addProps([[0, 2, 0, 4], [0, 2, 0, 3], [99, 2, 0, 3], [0, 0, 0, 1 ]]);
    expect(bi.removeProps(bi.moveBlocks('up'))).to.deep.equal([[99,4,0,4],[0,2,0,6],[0,0,0,1],[0,0,0,0]]);
    bi.rows = bi.addProps([[1, 0, 0, 0], [0, 2, 2, 3], [88, 3, 0, 3], [1, 0, 0, 1 ]]);
    expect(bi.removeProps(bi.moveBlocks('right'))).to.deep.equal([[0,0,0,1],[0,0,4,3],[0,0,88,6],[0,0,0,2]])
    bi.rows = bi.addProps([[1, 3, 0, 0], [0, 0, 2, 3], [5, 3, 0, 3], [5, 0, 0, 1 ]]);
    expect(bi.removeProps(bi.moveBlocks('down'))).to.deep.equal([[0,0,0,0],[0,0,0,0],[1,0,0,6],[10,6,2,1]])
    //var text = document.querySelector('board > label').textContent;
    //expect(Math.log(text) / Math.log(2)).to.equal(parseInt(Math.log(text) / Math.log(2), 10));
  });

  it('blocks should move all the way across the board if row/col is empty', function () {
    var bi = new Game({boardSize: 6});
    bi.newGame();
    bi.rows = bi.addProps([[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]]);
    bi.rows = bi.moveBlocks('right');
    expect(bi.removeProps(bi.rows)).to.deep.equal([[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,1],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]]);
  });

  it('should add a block after each successful move', function() {
    var bi = new Game();
    bi.newGame();
    bi.rows = bi.addProps([[0, 2, 0, 0], [0, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    bi.processMove('left');
    expect(bi.rows.reduce((total, row) => total + row.filter(e => e.val > 0).length, 0)).to.equal(3);
    bi.rows = bi.addProps([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    bi.processMove('left');
    expect(bi.rows.reduce((total, row) => total + row.filter(e => e.val > 0).length, 0)).to.equal(2);
  });

  it('should end the game if any of the blocks add up to the goal', function() {
    var bi = new Game();
    bi.newGame();
    bi.rows = bi.addProps([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(bi.gameStatus()).to.equal('active');
    bi.processMove('left');
    expect(bi.removeProps(bi.rows)).to.deep.equal([[2048,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]])
    expect(bi.gameStatus()).to.equal('win');
  });

  it('should end the game if there aren\'t any possible moves left', function() {
    var bi = new Game();
    bi.newGame();
    expect(bi.gameStatus()).to.equal('active');
    bi.rows = bi.addProps([[1, 1, 3, 48], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
    bi.processMove('left');
    expect(bi.gameStatus()).to.equal('loss');
  });

  function testMoves(matrix, direction, expResult) {
    var bi = new Game();
    bi.newGame();
    bi.rows = bi.addProps(matrix);
    var blockMovements = bi.getBlockMovements(direction);
    //console.log(JSON.stringify(blockMovements));
    expect(blockMovements).to.deep.equal(expResult);
    return {bi: bi, blockMovements: blockMovements};
  }

  it('should provide movements for each block going down', function() {

    var matrix = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    var direction = 'down';
    var expResult = [[{dy: 3, dx: 0}, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    testMoves(matrix, direction, expResult);
  });

  it('should provide movements for each block going left', function() {

    var matrix = [[2, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    var direction = 'left';
    var expResult = [[{ combined: true }, 0, { dy: 0, dx: -2 }, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    testMoves(matrix, direction, expResult);
  });

  it('should provide movements for each block going up', function() {

    var matrix = [[2, 0, 0, 0], [0, 0, 2, 0], [0, 0, 2, 0], [0, 0, 0, 2]];
    var direction = 'up';
    var expResult = [[0, 0, { combined: true }, 0], [0, 0, { dy: -1, dx: 0, removed: true  }, 0], [0, 0, { dy: -2, dx: 0 }, 0], [0, 0, 0, { dy: -3, dx: 0 }]];
    testMoves(matrix, direction, expResult);
  });

  it('should provide movements for each block going right', function() {

    var matrix = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    var direction = 'right';
    var expResult = [[{ dy: 0, dx: 3 }, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    testMoves(matrix, direction, expResult);
  });


});