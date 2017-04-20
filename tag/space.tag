<space>
  <block if={ opts.bv.val != 0 } bv={ opts.bv } new={ opts.new } combined={ opts.combined } moving={ isMoving(y,x) }  >
  </block>
  <script>

    this.mixin(riotAnimate);

    // look into https://github.com/any-code/riot-animation-context


    isMoving(y,x) {
      return this.boardRows[y][x].delta.dx || this.boardRows[y][x].delta.dy;
    }

//    var self = this;
//    vent.on('moved', (matrix) => {
//      opts.bv = matrix[opts.y][opts.x];
//      self.update()
//    });

    this.on('mount', () => {
      this.block = opts.bv;
    });

//    this.on('before-unmount', function() {
//      vent.off('*');
//    });

  </script>
</space>
