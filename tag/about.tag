<about>
  <div>
    <div class="close" onclick={closeAbout}>x</div>
    <h2>2048 <small>Enhanced!</small></h2>
    <p>
      By Matt Motherway
    </p>
    <p>
      Object: Use the arrow keys or swipe to get at least one block face value to 2048.
    </p>
    <p>
      <a href="https://github.com/webxl/2048-riot" onclick={goToThisUrl}>GitHub Project</a>
    </p>
  </div>

  <script>
    closeAbout() {
      this.parent.aboutVisible = false;
      this.unmount(true);
      this.parent.update();
    }
    goToThisUrl(e) {
      // fix for riot.js v2
      window.location = e.target.href;
    }
  </script>
</about>