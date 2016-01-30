/*jslint node: true */

'use strict';
// Require Gulp first
var gulp = require('gulp'),
// Load plugins
  $ = require('gulp-load-plugins')(),
// SASS and sourcemaps
  sass = require('gulp-ruby-sass'),
  sourcemaps = require('gulp-sourcemaps'),
// Javascript
  jshint = require('gulp-jshint'),
// Image Processing
  imagemin = require('gulp-imagemin'),
// Cleanup Crew
  del = require('del'),
// Run files in sequence
// var runSequence = require('run-sequence');
// var concat = ('gulp-concat');
// var fs = require('fs');
// var glob = require('glob-all');
  merge = require('merge-stream'),
// var path = require('path');

// Static Web Server stuff
// var webserver = require('gulp-webserver');
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  historyApiFallback = require('connect-history-api-fallback');

// To make sure I don't screw up and to make it easier to change
var dist = dist;

// List of browser versions we'll autoprefix for
var AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];

// Javascript style and syntax validation
gulp.task('js-lint', function () {
  return gulp.src(['gulpfile.js', 'app/js/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('js-style', function () {
  return gulp.src([ 'gulpfile.js', 'app/js/**/*.js'])
    .pipe($.jscs())
    .pipe($.jscs.reporter());
});

// ES6/2015 Transpiler Tasks
gulp.task('babel', function () {
  return gulp.src('app/es6/**/*.js')
    .pipe(sourcemaps.init())
    .pipe($.babel({
      presets: ['es2015']
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('app/js/'))
    .pipe($.size({
      pretty: true,
      title: "Babel"
    }));
});

gulp.task('coffee', function () {
  gulp.src('app/coffee/**/*.coffee')
    .pipe(sourcemaps.init())
    .pipe($.coffee())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('app/js/'))
      .pipe($.size({
      pretty: true,
      title: "Coffee"
    }));
});

// SCSS conversion and CSS processing
gulp.task('sass', function () {
  return sass('app/scss/**/*.scss', { sourcemap: true, style: 'expanded'})
    .pipe(gulp.dest('app/css'))
    .pipe($.size({
      pretty: true,
      title: "SASS"
    }));
});


gulp.task('processCSS', function () {
  return gulp.src('app/css/**/*.css')
    .pipe($.changed('app/css/**/*.css', {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(sourcemaps.init())
    .pipe($.cssnano({autoprefixer: false}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/css/'))
    .pipe($.size({
      pretty: true,
      title: "processCSS"
    }));
});

gulp.task('useref', function () {
  return gulp.src('app/index.html')
    .pipe($.useref({ searchPath: '.tmp' }))
    .pipe(gulp.dest(dist));
});

gulp.task('critical', function () {
  $.critical.generate({
    base: 'app/',
    src: 'index.html',
    css: ['css/all.min.css'],
    dimensions: [{
      width: 320,
      height: 480
    }, {
      width: 768,
      height: 1024
    }, {
      width: 1280,
      height: 960
    }],
    dest: 'app/css/critical.css',
    minify: true,
    extract: false,
    ignore: ['font-face']
  })
    .pipe($.size({
      pretty: true,
      title: "Critical"
    }));
});

gulp.task('uncss', function () {
  return gulp.src('app/css/**/*.css')
    .pipe($.concat('main.css'))
    .pipe($.uncss({
      html: ['index.html']
    }))
    .pipe(gulp.dest('dist/css/all-clean.css'))
    .pipe($.size({
      pretty: true,
      title: "Uncss"
    }));
});

//// Image manipulation
//gulp.task('imagemin', function () {
//  return gulp.src('app/images/**/*')
//    .pipe(imagemin({
//      progressive: true,
//      svgoPlugins: [{removeViewBox: false}],
//      use: [$.mozjpeg()]
//    }))
//    .pipe(gulp.dest('dist/images'))
//    .pipe($.size({
//      pretty: true,
//      title: 'imagemin'
//    }));
//});


// Copy all files at the root level (app)
gulp.task('copy', function () {
  var app, bower;
  app = gulp.src([
    'app/*',
    '!app/coffee',
    '!app/es6',
    '!app/scss',
    '!app/test',
    '!app/elements',
    '!app/bower_components',
    '!app/cache-config.json',
    '!**/.DS_Store'
  ], {
    dot: true
  }).pipe(gulp.dest(dist));

  // Copy over only the bower_components we need
  // These are things which cannot be vulcanized
  bower = gulp.src([
    'app/bower_components/{webcomponentsjs,platinum-sw,sw-toolbox,promise-polyfill}/**/*'
  ])
    .pipe(gulp.dest('dist/bower_components'));

  return merge(app, bower)
    .pipe($.size({
      pretty: true,
      title: 'copy'
    }));
});

// Copy web fonts to dist
gulp.task('fonts', function () {
  return gulp.src(['app/fonts/**'])
    .pipe(gulp.dest('dist/fonts/'))
    .pipe($.size({
      title: 'fonts'
    }));
});


// Run Vulcanize and Crisper
gulp.task('polymerBuild', function () {
  return gulp.src('app/elements/elements.html')
    .pipe($.vulcanize({
      stripComments: false,
      inlineCss: true,
      inlineScripts: true
    }))
    .pipe($.crisper({
      scriptInHead: false, // true is default 
      onlySplit: false
    }))
    .pipe(gulp.dest('dist/elements'))
    .pipe($.size({title: 'vulcanize'}));
});

// Example to be further edited later
gulp.task('processImages', function () {
  return gulp.src('src/*.{jpg,png}')
    .pipe($.responsive({
      'image.*': [{
        // image-small.jpg is 200 pixels wide
        width: 200,
        rename: {
          suffix: '-small',
          extname: '.jpg'
        }
      }, {
        // image-small@2x.jpg is 400 pixels wide
        width: 200 * 2,
        rename: {
          suffix: '-small@2x',
          extname: '.jpg'
        }
      }, {
        // image-large.jpg is 480 pixels wide
        width: 480,
        rename: {
          suffix: '-large',
          extname: '.jpg'
        }
      }, {
        // image-large@2x.jpg is 960 pixels wide
        width: 480 * 2,
        rename: {
          suffix: '-large@2x',
          extname: '.jpg'
        }
      }, {
        // image-extralarge.jpg is 1280 pixels wide
        width: 1280,
        rename: {
          suffix: '-extralarge',
          extname: '.jpg'
        }
      }, {
        // image-extralarge@2x.jpg is 2560 pixels wide
        width: 1280 * 2,
        rename: {
          suffix: '-extralarge@2x',
          extname: '.jpg'
        }
      }, {
        // image-small.webp is 200 pixels wide
        width: 200,
        rename: {
          suffix: '-small',
          extname: '.webp'
        }
      }, {
        // image-small@2x.webp is 400 pixels wide
        width: 200 * 2,
        rename: {
          suffix: '-small@2x',
          extname: '.webp'
        }
      }, {
        // image-large.webp is 480 pixels wide
        width: 480,
        rename: {
          suffix: '-large',
          extname: '.webp'
        }
      }, {
        // image-large@2x.webp is 960 pixels wide
        width: 480 * 2,
        rename: {
          suffix: '-large@2x',
          extname: '.webp'
        }
      }, {
        // image-extralarge.webp is 1280 pixels wide
        width: 1280,
        rename: {
          suffix: '-extralarge',
          extname: '.webp'
        }
      }, {
        // image-extralarge@2x.webp is 2560 pixels wide
        width: 1280 * 2,
        rename: {
          suffix: '-extralarge@2x',
          extname: '.webp'
        }
      }]
    }))
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [ $.mozjpeg() ]
    }))
    .pipe($.imageminWebp({quality: 50})())
    .pipe(gulp.dest('dist/images'))
    .pipe($.size({
      pretty: true,
      title: 'processImages'
    }));
});


// Clean output directory
gulp.task('clean', function () {
  return del(['.tmp', 'dist/']);
});

// Watch files for changes & reload
gulp.task('serve', function () {
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'ATHENA',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', 'app'],
      middleware: [historyApiFallback()]
    }
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
  gulp.watch(['app/elements/**/*.css'], ['elements', reload]);
  gulp.watch(['app/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
  browserSync({
    port: 5001,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: 'dist/',
    middleware: [historyApiFallback()]
  });
});

gulp.task('css', ['sass', 'processCSS']);

gulp.task('default', ['sass']);
