<size>
  <div each={ val, i in sizes } onclick="{ setSize }">
    { val } <span if="{ val === parent.boardSize }">&#10004;</span>
  </div>

  <style>
    size div {
      cursor: pointer;
      padding: 4px;
    }
  </style>

  <script>

    this.sizes = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    setSize(e) {
      this.parent.setBoardSize(e.item.val);
    }

  </script>
</size>
