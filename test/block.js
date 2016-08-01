describe('block tag', function () {
  it('the value should be 2 ^ n', function () {
    var block = document.createElement('block');
    document.body.appendChild(block);
    riot.mount('block', {value: Math.pow(2, parseInt(Math.random() * 10, 10)) });
    var text = document.querySelector('block > label').textContent;
    expect(Math.log(text) / Math.log(2)).to.be(parseInt(Math.log(text) / Math.log(2), 10));
  });

  //it('')
});

// describe('game setup', function () {
//   it('should move')
// })