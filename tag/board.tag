<board>
  <div class="row" each={ row, y in boardRows }>
    <space each= { tmp, x in row } bv={ getVal(y, x) } new={ isNew(y,x) } x={x} y={y} combined={ isCombined(y,x) } class={ new: isNew(y,x) }></space>
  </div>

  <script>
    this.game = opts.game;
    this.timeout = null;

    function cloneMatrix(matrix) {
      var size = matrix.length, newMatrix = new Array(size);
      for (var y = 0; y < size; y++) {
        newMatrix[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          newMatrix[y][x] = matrix[y][x];
        }
      }
      return newMatrix;
    }

    function updateMoves(matrix, moves) {
      var size = matrix.length, newMatrix = new Array(size);
      for (var y = 0; y < size; y++) {
        newMatrix[y] = new Array(size);
        for (var x = 0; x < size; x++) {
          let block = matrix[y][x];
          block.delta = moves[y][x];
          block.isNew = false;
          newMatrix[y][x] = block;
        }
      }
      return newMatrix;
    }

    this.on('mount', () => {
      this.boardRows = cloneMatrix(this.game.rows);
      window.addEventListener('resize', this.update.bind(this));
      window.addEventListener('orientationchange', this.update.bind(this));
      this.update();
    });

    this.parent.on('newgame', () => {
      this.boardRows = cloneMatrix(this.game.rows);
      this.update();
    });

    this.parent.on('move', (dir) => {
      this.trigger('move');
      if (dir) {

        //this.boardRows = cloneMatrix(this.game.rows);
        if (this.game.gameStatus() != 'active') return;


        if (this.timeout) {
          return;
        }

        this.lastBoardRows = this.boardRows = updateMoves(this.boardRows, this.game.getBlockMovements(dir));

        vent.trigger('moveblocks');

        this.timeout = setTimeout(() => {
              if (dir) this.game.processMove(dir);
              this.boardRows = cloneMatrix(this.game.rows);
              this.update();
            this.parent.trigger('moved');
          //vent.trigger('moved', this.boardRows);
          this.timeout = null;
          }, 100);

      } else {
          this.boardRows = this.game.rows;
          this.update();
      }

    });

    this.mixin(riotAnimate);


    isNew(y,x) {
      return this.game.rows[y][x].isNew;
    }

    isCombined(y,x) {
      return this.lastBoardRows[y][x].delta.combined;
    }

    getVal(y,x) {
      return this.boardRows[y][x];
    }

    this.on('before-update', function() {
      vent.off('*');
    });


  </script>

</board>
