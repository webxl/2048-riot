// karma.conf.js
module.exports = function(config) {
  config.set({
    //logLevel: 'debug',
    frameworks: ['mocha', 'sinon-chai',  'riot'],
    plugins: [
      'karma-mocha',
      'karma-sinon-chai',
     'karma-mocha-reporter',
      'karma-phantomjs-launcher',
      'karma-riot',
      'karma-babel-preprocessor'
    ],
    files: [
      //'node_modules/expect.js/index.js',
      'node_modules/chai/chai.js',
      //'tag/*.tag',
      //'test/**/*.js'
      'js/game.js',
      'test/game.js'
    ],
    preprocessors: {
      '**/*.tag': ['riot'],
      'test/game.js': ['babel'],
      'js/game.js': ['babel']
    },
    browsers: ['PhantomJS'],
   reporters: ['mocha'],
    riotPreprocessor: {
      options: {
        type: 'babel'
      }
    },
    babelPreprocessor: {
      options: {
        "presets": ["es2015"]
      }
    }
  })
};