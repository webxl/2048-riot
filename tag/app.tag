<app onclick={setFocus}>

  <header>
    <div class="controls">
      <button type="button" name="button" id="newGame" onclick={newGame}>New Game</button>
      <div class="sizeWrapper">
        <button type="button" name="button" id="setSize" onclick={showSizeDropdown}>Size: { boardSize } &#9660; </button>
        <size if="{ settingSize() }"></size>
      </div>
      <div class="undoWrapper">
        <button id="undo" onclick={undoClick} disabled={ getUndoDisabledProp() }>Undo</button>
        <button id="redo" onclick={redoClick} disabled={ getRedoDisabledProp() }>Redo</button>
      </div>
    </div>

    <goal title="Use the arrow keys or swipe to get at least one block face value to {goal}" onclick={showAbout}>{goal}</goal>

    <about if={ aboutVisible } goal="{goal}"></about>

    <score gamescore={ gameScore } diffscore={ getDiffScore() }></score>

  </header>

  <winlose class='{gameStatus}' gamestatus="{gameStatus}"></winlose>

  <board ref="board" game={ game }></board>

  <div class="status">
    Game status: <input onkeydown={handleKeyDown} onkeypress={handleKeyPress}  onclick={updateGame} ref='input' name='test' value='{ gameStatus }' readonly />
  </div>

  <script>

    const DRAG_ENABLED = false;

    this.boardSize = 4;
    this.gameScore = 0;
    this.aboutVisible = false;
    this.settingBoardSize = false;

    this.game = new Game({
      size: this.boardSize
    });
    this.game.newGame();

    this.goal = this.game.opts.goal;

    this.isTouchEnabled = ("ontouchstart" in document.documentElement);

    this.on('mount', () => {

      setTimeout(this.setFocus, 300);

      document.documentElement.className += (this.isTouchEnabled ? ' touch' : ' no-touch');

      const mc = new Hammer.Manager(this.refs.board.root);

      const swipe = new Hammer.Swipe({
        threshold: 20
      });

      if (DRAG_ENABLED) { // WIP
        const pan = new Hammer.Pan({
          threshold: 5
        });
        pan.recognizeWith(swipe);
        mc.add(pan);
        mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        mc.on("pan", ev => {
          let dir, axis;

          switch (ev.direction) {
            case Hammer.DIRECTION_LEFT: dir = 'left'; axis = 'x'; break;
            case Hammer.DIRECTION_RIGHT: dir = 'right'; axis = 'x'; break;
            case Hammer.DIRECTION_UP: dir = 'up';  axis = 'y'; break;
            case Hammer.DIRECTION_DOWN: dir = 'down';  axis = 'y';break;
          }

          vent.trigger('drag', dir, axis === 'x' ? ev.deltaX:0, axis === 'y' ? ev.deltaY:0);

        });

        mc.on("panstart1", ev => {
          const START_X = 0, START_Y = 0;
          let dir;

          switch (ev.direction) {
            case Hammer.DIRECTION_LEFT: dir = 'left'; break;
            case Hammer.DIRECTION_RIGHT: dir = 'right'; break;
            case Hammer.DIRECTION_UP: dir = 'up'; break;
            case Hammer.DIRECTION_DOWN: dir = 'down'; break;
          }

        });
      }

      mc.add(swipe);

      mc.on('swipe', e => {
        let dir;
        switch (e.direction) {
          case Hammer.DIRECTION_LEFT: dir = 'left'; break;
          case Hammer.DIRECTION_RIGHT: dir = 'right'; break;
          case Hammer.DIRECTION_UP: dir = 'up'; break;
          case Hammer.DIRECTION_DOWN: dir = 'down'; break;
        }
        this.sendMove(dir);
      });

    });

    handleKeyDown(e) {

      // ctrl/cmd-z
      if (e.keyCode === 90 && (e.metaKey || e.ctrlKey)) {
        this.undoClick();
        e.preventDefault();
        return;
      }

      e.preventUpdate = true;

      const keys = {
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
      // this.game.printMatrix(this.game.rows);
    }

    newGame(e) {
      this.game.newGame({
        size: this.boardSize
      });
      this.trigger('newgame');
      this.gameStatus = 'active';
      this.gameScore = 0;
      this.goal = this.game.opts.goal;

      this.updateGame();
    }

    setFocus(e) {
      if (this.isTouchEnabled) return;

      this.refs.input.focus();
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

    this.on('move', () => {
      this.gameStatus = this.game.gameStatus();
      this.gameScore = this.game.score;
      this.update(/*{ gameStatus: this.game.gameStatus() }*/);
    });

    handleKeyPress(e) {

      if (!(e.ctrlKey || e.metaKey || e.altKey)) {
        e.stopPropagation();
      }
    }

    getMovingClass() {
        return "moving-" + this.lastMoveDirection;
    }

    settingSize() {
      return this.settingBoardSize;
    }

    setBoardSize(val) {
      this.settingBoardSize = false;
      this.boardSize = val;
      this.update();
    }

    showSizeDropdown() {
      this.settingBoardSize = !this.settingBoardSize;
    }

    getUndoDisabledProp() {
      return this.game.boardUndoStack.length ? '':'disabled';
    }

    getRedoDisabledProp() {
      return this.game.boardRedoStack.length ? '':'disabled';
    }

    showAbout() {
      this.aboutVisible = true;
    }

    let curScore = 0;

    getDiffScore() {
      let diff = this.gameScore - curScore;
      curScore = this.gameScore;
      return diff;
    }

  </script>
</app>