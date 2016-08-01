describe('processMove', function () {
  it('should combine any matching blocks', function () {
    var board = document.createElement('board');
    document.body.appendChild(board);
    var bi = riot.mount('board')[0];
    bi.newGame();
    bi.rows = [[0, 2, 0, 4], [0, 2, 0, 3], [99, 0, 0, 3], [0, 0, 0, 1 ]];
    bi.processMove('up');
    expect(JSON.stringify(bi.rows)).to.be('[[99,4,0,4],[0,0,0,6],[0,0,0,1],[0,0,0,0]]');
    bi.rows = [[0, 2, 0, 4], [0, 2, 2, 3], [99, 3, 0, 3], [0, 0, 0, 1 ]];
    bi.processMove('left');
    expect(JSON.stringify(bi.rows)).to.be('[[2,4,0,0],[4,3,0,0],[99,3,0,3],[1,0,0,0]]')
    //var text = document.querySelector('board > label').textContent;
    //expect(Math.log(text) / Math.log(2)).to.be(parseInt(Math.log(text) / Math.log(2), 10));
  })
});