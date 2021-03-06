// generated on 2020-11-08 using generator-webapp 4.0.0-8
const { src, dest, watch, series, parallel, lastRun } = require('gulp'),
      gulpLoadPlugins                                                                             = require(
        'gulp-load-plugins'),
      fs                                                                                          = require('fs'),
      mkdirp                                                                                      = require('mkdirp'),
      Modernizr                                                                                   = require('modernizr'),
      browserSync                                                                                 = require('browser-sync'),
      del                                                                                         = require('del'),
      autoprefixer                                                                                = require('autoprefixer'),
      cssnano                                                                                     = require(
        'cssnano'), { argv }                                                                      = require('yargs'),
      { babel, eslint, htmlmin, if: if1, imagemin, plumber, postcss, sass, size, uglify, useref } = gulpLoadPlugins(),
      server                                                                                      = browserSync.create(),
      port                                                                                        = argv.port || 9000,
      isProd                                                                                      = process.env.NODE_ENV ===
               'production',
      isTest                                                                                      = process.env.NODE_ENV ===
               'test',
      isDev                                                                                       = !isProd && !isTest

function styles() {
  return src('app/styles/*.scss', {
    sourcemaps: !isProd,
  })
    .pipe(plumber())
    .pipe(sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', sass.logError))
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(dest('.tmp/styles', {
      sourcemaps: !isProd,
    }))
    .pipe(server.reload({stream: true}));
}

function scripts() {
  return src('app/scripts/**/*.js', {
    sourcemaps: !isProd,
  })
    .pipe(plumber())
    .pipe(babel())
    .pipe(dest('.tmp/scripts', {
      sourcemaps: !isProd ? '.' : false,
    }))
    .pipe(server.reload({stream: true}));
}

async function modernizr () {
  const readConfig = () => new Promise((resolve, reject) => {
    fs.readFile(`${__dirname}/modernizr.json`, 'utf8', (err, data) => {
      if (err) reject(err)
      resolve(JSON.parse(data))
    })
  })
  const createDir = () => new Promise((resolve, reject) => {
    mkdirp(`${__dirname}/.tmp/scripts`, err => {
      if (err) reject(err)
      resolve()
    })
  })
  const generateScript = config => new Promise((resolve, reject) => {
    Modernizr.build(config, content => {
      fs.writeFile(`${__dirname}/.tmp/scripts/modernizr.js`, content, err => {
        if (err) reject(err)
        resolve(content)
      })
    })
  })

  const [config] = await Promise.all([
    readConfig(),
    createDir(),
  ])
  await generateScript(config)
}

const lintBase = (files, options) => {
  return src(files)
    .pipe(eslint(options))
    .pipe(server.reload({stream: true, once: true}))
    .pipe(eslint.format())
    .pipe(if1(!server.active, eslint.failAfterError()));
}
function lint() {
  return lintBase('app/scripts/**/*.js', { fix: true })
    .pipe(dest('app/scripts'));
}
function lintTest() {
  return lintBase('test/spec/**/*.js');
}

function html() {
  return src('app/*.html')
    .pipe(useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe(if1(/\.js$/, uglify({compress: {drop_console: true}})))
    .pipe(if1(/\.css$/, postcss([cssnano({safe: true, autoprefixer: false})])))
    .pipe(if1(/\.html$/, htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: {compress: {drop_console: true}},
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(dest('dist'));
}

function images() {
  return src('app/images/**/*', { since: lastRun(images) })
    .pipe(imagemin())
    .pipe(dest('dist/images'));
}

function fonts() {
  return src('app/fonts/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(if1(!isProd, dest('.tmp/fonts'), dest('dist/fonts')));
}

function extras() {
  return src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(dest('dist'));
}

function clean() {
  return del(['.tmp', 'dist'])
}

function measureSize() {
  return src('dist/**/*')
    .pipe(size({title: 'build', gzip: true}));
}

const build = series(
  clean,
  parallel(
    lint,
    // series(parallel(styles, scripts, modernizr), html),
    series(parallel(styles, scripts), html),
    images,
    fonts,
    extras
  ),
  measureSize
);

function startAppServer() {
  server.init({
    notify: false,
    open: false,
    port,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  });

  watch([
    'app/*.html',
    'app/images/**/*',
    '.tmp/fonts/**/*'
  ]).on('change', server.reload);

  watch('app/styles/**/*.scss', styles);
  watch('app/scripts/**/*.js', scripts);
  watch('modernizr.json', modernizr);
  watch('app/fonts/**/*', fonts);
}

function startTestServer() {
  server.init({
    notify: false,
    open: false,
    port,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
        '/scripts': '.tmp/scripts',
        '/node_modules': 'node_modules'
      }
    }
  });

  watch('test/index.html').on('change', server.reload);
  watch('app/scripts/**/*.js', scripts);
  watch('test/spec/**/*.js', lintTest);
}

function startDistServer() {
  server.init({
    notify: false,
    open: false,
    port,
    server: {
      baseDir: 'dist',
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  });
}

let serve;
if (isDev) {
  /** FIXME : Problem with Modernizr... */
  // serve = series(clean, parallel(styles, scripts, modernizr, fonts), startAppServer);
  serve = series(clean, parallel(styles, scripts, fonts), startAppServer);
} else if (isTest) {
  serve = series(clean, scripts, startTestServer);
} else if (isProd) {
  serve = series(build, startDistServer);
}

exports.serve = serve;
exports.build = build;
exports.default = build;
