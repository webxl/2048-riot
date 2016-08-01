<space>
  <block if={ opts.bv.val != 0 } bv={ opts.bv } new={ opts.new } combined={ opts.combined } moving={ isMoving(y,x) }  >
  </block>
  <script>

    this.mixin(riotAnimate);

    // look into https://github.com/any-code/riot-animation-context

    this.parent.parent.on('moveblocks', () => {
      this.trigger('moveblocks');
    });


    isMoving(y,x) {
      return this.boardRows[y][x].delta.dx || this.boardRows[y][x].delta.dy;
    }

    this.on('mount', () => {
      this.block = opts.bv;
    });

  </script>
</space>
