<winlose>
  <div animate="zoomIn" animate-leave="zoomOut" animate-duration="300ms">
    {getStatus()}
  </div>

  <script>
    this.mixin(riotAnimate);

    let prevMsg = '';

    this.root.addEventListener("transitionend", () => {
      if (opts.gamestatus.toLowerCase() === 'active') {
        this.root.style.zIndex = 0;
      }
    }, false);

    getStatus() {
      let verb = '';
      switch (opts.gamestatus) {
        case 'win': verb = 'won'; break;
        case 'loss': verb = 'lose'; break;
        default: verb = '?'; break;
      }
      const newMsg = 'YOU ' + verb.toUpperCase() + '!';
      if (opts.gamestatus && opts.gamestatus.toLowerCase() !== 'active') {
        prevMsg = newMsg;
        this.root.style.zIndex = 500;
        return newMsg;
      } else {
        return prevMsg;
      }
    }

  </script>
</winlose>