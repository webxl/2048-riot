import gulp from 'gulp';
import riot from 'gulp-riot';
import babel from 'gulp-babel';
import concat from 'gulp-concat';
import less from 'gulp-less';
import del from 'del';
import sourcemaps from 'gulp-sourcemaps';


gulp.task('less', ()=> {
  gulp.src('less/style.less')
    .pipe(less())
    .pipe(gulp.dest('.'));
});

gulp.task('clean', () => {
  return Promise.all([
    //del(['tmp']),
    del(['js/2048.js'])
  ])
});

gulp.task('riot', ['clean'], ()=> {
  return gulp.src('tag/*.tag')
    //.pipe(sourcemaps.init({loadMaps: true}))
    .pipe(riot())
    //.pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('tmp'));
});

gulp.task('babel', ['riot'], () => {
  return gulp.src(['js/game.js', 'tmp/*.js'])
    .pipe(sourcemaps.init({loadMaps: false}))
    .pipe(babel({
      presets: ['es2015'],
      sourceMaps: 'inline'
    }))
    .pipe(concat('2048.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('js'));
});

gulp.task('watch', ['less', 'babel'],  ()=> {
  gulp.watch('less/*.less', ['less']);
  gulp.watch('tag/*.tag', ['riot']);
  gulp.watch(['tmp/*.js', 'js/game.js'], ['babel']);
});
