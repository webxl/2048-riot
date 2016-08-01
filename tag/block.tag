<block class={ this.getLevelClass() }>
  <label animate={ this.getAnimations() }  animate-leave="zoomOut" animate-duration="300ms">{ opts.bv.val }</label>

  <script>
    this.mixin(riotAnimate);

    this.getAnimations = () => {
      var classes = [];
      if (this.opts.new)
        classes.push('bounceIn');
      if (this.opts.combined)
        classes.push('flipInY');
      if (this.moving)
        classes.push('fadeOut');
      return classes.join(' ');
    };

    this.getLevelClass = () => {
      var val = this.opts.bv.val;
      var level = Math.log(val) / Math.log(2);
      return 'level' + level;
    };

    this.parent.on('moveblocks', () => {

      var delta = this.opts.bv.delta;
      if (delta) {

        var marginAdjustX = delta.dx * 20, marginAdjustY = delta.dy * 20;

        this.moving = true;

        if (delta.removed || delta.combined)
          this.animatedUnmount();

        this.update();

        Velocity(this.root,
            {
              left: (this.root.offsetWidth * delta.dx) + marginAdjustX + 'px',
              top: (this.root.offsetHeight * delta.dy) + marginAdjustY + 'px'
            },
            {
              duration: 100,
              complete: () => {
                this.moving = false;
              }
            }
        );
      }
    });

//    this.parent.on('updateblocks', () => {
//      console.log('update');
//      //this.update();
//    })

    this.on('before-unmount', function() {
    });

    this.on('updated', function() {
      //this.label.setAttribute('class', this.getAnimations());

    });
    this.on('mount', function() {
      //console.log(this.value);

    });
  </script>
</block>
