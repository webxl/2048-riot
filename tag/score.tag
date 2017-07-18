<score>
  <div>
    <div class="label">Score</div>
    <div class="value">{ opts.gamescore }</div>
    <div class="plus { this.getAnimateClass() }">+{ opts.diffscore }</div>
  </div>

  <style>

    .label {
      color: #fff;
      font-size: .8em;
    }
  </style>

  <script>
    getAnimateClass() {
      return opts.diffscore !== 0 ? 'animated fadeOutUp':'';
    }
  </script>
</score>
