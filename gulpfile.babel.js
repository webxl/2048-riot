import gulp from 'gulp';
import riot from 'gulp-riot';
import babel from 'gulp-babel';
import concat from 'gulp-concat';
import less from 'gulp-less';


gulp.task('less', ()=> {
  gulp.src('less/style.less')
    .pipe(less())
    .pipe(gulp.dest('.'));
});

gulp.task('riot', ()=> {
  gulp.src('tag/*.tag')
    .pipe(riot())
    .pipe(gulp.dest('tmp'));
});

gulp.task('babel', () => {
  gulp.src(['js/game.js', 'tmp/*.js'])
    .pipe(babel({
      presets: ['es2015'],
    }))
    .pipe(concat('2048.js'))
    .pipe(gulp.dest('js'));
});

gulp.task('watch', ()=> {
  gulp.watch('less/*.less', ['less']);
  gulp.watch('tag/*.tag', ['riot']);
  gulp.watch(['tmp/*.js', 'js/game.js'], ['babel']);
});
