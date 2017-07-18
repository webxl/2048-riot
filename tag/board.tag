<board>
  <div class="row" each={ row, y in boardRows }>
    <space each= { tmp, x in row } bv={ parent.getVal(parent.y, x) } new={ parent.isNew(parent.y,x) } x={x} y={y} combined={ parent.isCombined(parent.y,x) } class={ new: parent.isNew(parent.y,x) }></space>
  </div>
  <div class="row font-sizer" >
    <div class="space"><div class="block" ref="sizer_block"><label ref="sizer_block_label">2048</label></div></div>
  </div>

  <script>
    this.game = opts.game;
    this.timeout = null;
    this.fontSizes = {};

    const minFontSize = 5, maxFontSize = 100;

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
      this.fontSizes = {};
    });

    this.parent.on('move', (dir) => {
      this.trigger('move');
      if (dir) {

        if (this.game.gameStatus() !== 'active') return;

        if (this.timeout) {
          return;
        }

        this.lastBoardRows = this.boardRows = updateMoves(this.boardRows, this.game.getBlockMovements(dir));

        vent.trigger('moveblocks');

        // necessary for slide animation
        this.timeout = setTimeout(() => {
          if (dir) this.game.processMove(dir);
          this.update({ boardRows: this.game.rows});
          this.parent.trigger('move');
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
      if (!this.lastBoardRows || !this.lastBoardRows.length) return;
      return this.lastBoardRows[y][x].delta.combined;
    }

    getVal(y,x) {
      return this.boardRows[y][x];
    }

    this.on('before-update', function() {
      vent.off('*');
    });

    setFontSizes(boardDimensions)
    {
      let space = this.root.querySelectorAll('div:nth-child(1) > space:nth-child(1)')[0];

      if (!space) { // children aren't mounted
        return;
      }

      this.fontSizes[boardDimensions] = {};

      let testGoal = this.game.opts.goal, test = 2, label = this.refs.sizer_block_label, block = this.refs.sizer_block;
      let y = maxFontSize, compressor = .2;

      block.style.width = space.clientWidth + 'px';
      block.style.height = space.clientHeight + 'px';

      let el = block;

      let initialComputed = Math.max(Math.min(el.clientWidth / (compressor*10),
          Math.min(el.clientHeight, maxFontSize)), minFontSize) + 'px';

      while (test <= testGoal) {
        el.style.fontSize = initialComputed;
        label.innerHTML = test;
        if ((el.offsetHeight < el.scrollHeight) || (el.offsetWidth < el.scrollWidth)) {
          while (((el.offsetHeight < el.scrollHeight) || (el.offsetWidth < el.scrollWidth)) && y > minFontSize) {
            el.style.fontSize = y + 'px';
            y--;
          }
        }

        this.fontSizes[boardDimensions]["" + test] = el.style.fontSize;

        test *= 2;
      }
    }

    this.on('update', function() {
      let boardDimensions =  `${this.root.clientHeight}x${this.root.clientWidth}`;

      if (!this.fontSizes[boardDimensions] && this.isMounted) {
        this.setFontSizes(boardDimensions);
      }

    });

    getFontSize(value) {
      let boardDimensions =  `${this.root.clientHeight}x${this.root.clientWidth}`;

      if (!this.fontSizes[boardDimensions] && this.isMounted) {
        this.setFontSizes(boardDimensions);
      }

      if (!this.fontSizes[boardDimensions]) {

        let space = this.root.querySelectorAll('div:nth-child(1) > space:nth-child(1)')[0];

        if (!space) { // children aren't mounted
          let compressor = .2, length = this.boardRows.length, spaceMargin = 10;
          let sliceWidth = (this.root.clientWidth / length) - (2 * spaceMargin),
            sliceHeight = (this.root.clientHeight / length) - (2 * spaceMargin);

          return Math.max(Math.min(sliceWidth / (compressor * 10),
              Math.min(sliceHeight, maxFontSize)), minFontSize) + 'px';;
        }
      }

      return this.fontSizes[boardDimensions][value];
    }


  </script>

</board>
