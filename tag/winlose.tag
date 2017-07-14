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
      const newMsg = 'YOU ' + opts.gamestatus;
      if (opts.gamestatus.toLowerCase() != 'active') {
        prevMsg = newMsg
        this.root.style.zIndex = 500;
        return newMsg;
      } else {
        return prevMsg;
      }
    }

  </script>
</winlose>