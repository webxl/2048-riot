<app onclick={setFocus}>
  <button type="button" name="button" id="newGame" onclick={newGame}>New Game</button>
  Game status: <input onkeydown={handleKeyDown} onkeypress={handleKeyPress}  onclick={updateGame} id='input' name='test' value='{ game.status }' readonly />
  <board name="board" game={ game }></board>
  <button id="undo" onclick={undoClick}>Undo</button>
  <button id="redo" onclick={redoClick}>Redo</button>

  <script>
    this.game = new Game( { goal: 8 });
    this.game.newGame();


    this.on('mount', () => {
        setTimeout(this.setFocus, 300);

      var mc = new Hammer.Manager(this.board);
      var pan = new Hammer.Pan();
      var swipe = new Hammer.Swipe();
      //swipe.recognizeWith(pan);

      //mc.add(pan);
      mc.add(swipe);

      //mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

      mc.on('swipe', e => {
        var dir;
        switch (e.direction) {
          case Hammer.DIRECTION_LEFT: dir = 'left'; break;
          case Hammer.DIRECTION_RIGHT: dir = 'right'; break;
          case Hammer.DIRECTION_UP: dir = 'up'; break;
          case Hammer.DIRECTION_DOWN: dir = 'down'; break;
        }
        this.sendMove(dir);
      });


      mc.on("panstart panmove", ev => {
        var START_X = 0, START_Y =0;
        var p = {
          x: START_X + ev.deltaX,
          y: START_Y + ev.deltaY
        };

        //requestElementUpdate();
      });

    });

    handleKeyDown(e) {

      e.preventUpdate = true;
      var keys = {
          37: 'left',
          38: 'up',
          39: 'right',
          40: 'down'
      };
      this.sendMove(keys[e.keyCode]);
    }

    sendMove(dir) {
      if (!dir) return true;
      this.lastMoveDirection = dir;
      this.trigger('move', dir);
//      this.game.printMatrix(this.game.rows);
      this.update({ game: { status: game.gameStatus() }}); // todo: fix me
    }
    newGame() {
      this.game = null;
      this.game = new Game();
      this.game.newGame();
      this.trigger('new');
    }
    setFocus(e) {
      this.input.focus();
      if (e) e.preventUpdate = true;
    }
    updateGame(e) {
      this.update();
    }
    undoClick() {
      this.game.undo();
      this.trigger('move');
    }
    redoClick() {
      this.game.redo();
      this.trigger('move');
    }

    handleKeyPress(e) {
      if (!(e.ctrlKey || e.metaKey || e.altKey)) {
        e.stopPropagation();
        e.preventDefault();
      }
    }

    getMovingClass() {
        return "moving-" + this.lastMoveDirection;
    }

  </script>
</app>