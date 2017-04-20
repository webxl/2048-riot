<block class={ this.getLevelClass() }>
  <label animate={ this.getAnimations() }  animate-leave="zoomOut" animate-duration="300ms">{ opts.bv.val }</label>

  <script>
    this.mixin(riotAnimate);

    this.getAnimations = () => {
      const classes = [];
      if (this.opts.new)
        classes.push('bounceIn');
      if (this.opts.combined)
        classes.push('flipInY');
      if (this.moving)
        classes.push('fadeOut');
      return classes.join(' ');
    };

    this.getLevelClass = () => {
      const val = this.opts.bv.val;
      const level = Math.log(val) / Math.log(2);
      return 'level' + level;
    };

    this.blockMargin = 0;

    const self = this;

    this.move = () => {

      const delta = self.opts.bv.delta;
      if (delta) {


        const marginAdjustX = delta.dx * self.blockMargin, marginAdjustY = delta.dy * self.blockMargin;

        self.moving = true;

        if (delta.removed)
          self.animatedUnmount();

        self.update();

        Velocity(self.root,
            {
              left: (self.root.offsetWidth * delta.dx) + marginAdjustX + 'px',
              top: (self.root.offsetHeight * delta.dy) + marginAdjustY + 'px'
            },
            {
              duration: 100,
              complete: () => {
                self.moving = false;
              }
            }
        );
      }
    };

    this.drag = (dir, dx, dy) => {

      if (!self.opts.bv.possibleMoves.some(m => m == dir)) return;

      const translate
        = `translate3d(${dx}px, ${dy}px, 0)`;
      self.root.style.transform = translate;
      self.root.style.mozTransform = translate;
      self.root.style.webkitTransform = translate;

    };

    vent.on('moveblocks', this.move);
    vent.on('drag', this.drag);

//    this.parent.on('updateblocks', () => {
//      console.log('update');
//      //this.update();
//    });

    this.on('mount', function() {

    });
    this.on('before-unmount', function() {
      vent.off('moveblocks', this.move);
      vent.off('drag', this.drag);
    });

    this.on('updated', function() {

      let minFontSize = 5, maxFontSize = 100, compressor = .2, el = this.root;

      el.style.fontSize = Math.max(Math.min(el.clientWidth / (compressor*10), Math.min(el.clientHeight, maxFontSize)), minFontSize) + 'px';

      if (this.root && this.root.parentElement) {
        const style = this.root.parentElement.currentStyle || window.getComputedStyle(this.root.parentElement);

        this.blockMargin = parseInt(style.marginRight, 10) * 2;
      }

      // this.label.setAttribute('class', this.getAnimations());
      // self.root.style.left = 0;
      // self.root.style.top = 0;
    });
    this.on('mount', function() {

    });
  </script>
</block>
