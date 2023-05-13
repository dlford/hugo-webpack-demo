// Read `.env` file
require('dotenv').config();

const fs = require('fs');
const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const glob = require('glob');

module.exports = (env) => {
  // Check if we are in development or a production build
  const isProduction = Boolean(env && env.production);

  return {
    // Controls if built-in optimizations are used
    mode: isProduction ? 'production' : 'development',
    // Controls how source maps are generated
    devtool: isProduction ? 'source-map' : 'eval',
    // Base directory for code compilation
    context: path.resolve(__dirname, 'src'),
    // Entrypoints for individual bundles, each entrypoint will be compiled to a bundle
    entry() {
      const entrypoints = [
        // These are the 'special' folders we made above
        ...glob.sync(`src/kind/**/*.*`),
        ...glob.sync(`src/path/**/*.*`),
      ];

      // Converts each entrypoint (e.g. `src/kind/home/page/main.js`) to an object
      // (e.g. `{ import: 'src/kind/home/page/main.js', filename: 'kind/home/page/main.js' }`),
      // Basically just removing `src/` from the filename
      const result = entrypoints.reduce((obj, el) => {
        obj[el.replace(/^src\//, '').replace(/\.css$/, '')] = {
          import: path.resolve(__dirname, el),
          filename: el.replace(/^src\//, ''),
        };
        return obj;
      }, {});

      return result;
    },
    // Where to put the compiled bundles
    output: {
      // Save files to `assets/generated`
      path: path.resolve(__dirname, 'assets/generated'),
      // If production, add a hash to the filename for cachebusting
      filename: isProduction
        ? '[name].[chunkhash].bundle.js'
        : '[name].bundle.js',
      // If production, re-write source path to `/generated`,
      // if developement, re-write source path to dev server HTTP address
      publicPath: isProduction
        ? '/generated/'
        : 'http://localhost:3000/',
    },
    // These options change how modules are resolved (e.g. in `import` statements).
    resolve: {
      // Try to resolve these file extensions in order
      extensions: ['.js', '.jsx', '.css', '.scss'],
      // Aliases for resolver paths, e.g. `import css/global.css` instead of `import src/css/global.css`
      alias: {
        css: path.resolve(__dirname, 'src/css/'),
        js: path.resolve(__dirname, 'src/js/'),
        html: path.resolve(__dirname, 'src/html/'),
        generated: path.resolve(__dirname, 'src/generated/'),
      },
    },
    // Webpack plugins
    plugins: [
      // Generic plugin to inject environment variables into bundles
      // so we can reference values in `.env` file
      new webpack.DefinePlugin({
        'process.env': JSON.stringify({
          ...process.env,
        }),
      }),
      // This plugin extracts CSS into separate files
      new MiniCssExtractPlugin({
        filename: `[name].min.css`,
        chunkFilename: isProduction
          ? '[id].[chunkhash].css'
          : '[id].css',
      }),
    ],
    // Development server, this will host the bundles for local development
    devServer: {
      port: 3000,
      // Hot reload
      hot: true,
      // Short-circuit 404 errors on missing assets,
      // since we're often requesting files that don't
      // exist, this will keep the console a bit more
      // tidy when working in dev mode.
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }
        middlewares.push((req, res, next) => {
          const isAsset = /^\/(kind|path)\//.test(req.url);
          if (isAsset) {
            const file = path.resolve(__dirname, `src${req.url}`);
            if (!fs.existsSync(file)) {
              const isCss = /\.css$/.test(req.url);
              if (isCss) {
                res.setHeader('Content-Type', 'text/css');
                res.type('.css');
              }
              const isJs = /\.js$/.test(req.url);
              if (isJs) {
                res.setHeader('Content-Type', 'text/javascript');
                res.type('.js');
              }
              res.status(200);
              res.send();
            }
          }
          next();
        });
        return middlewares;
      },
      // Hot reload if these files have changed
      watchFiles: ['src/**/*'],
      // Proxy the Hugo site in development mode
      proxy: [
        {
          context: ['!/kind/**', '!/path/**'],
          target: 'http://127.0.0.1:3001',
        },
      ],
      // CORS options for proxy server
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
    },
    // Webpack module configurations
    module: {
      // These rules match file types to different Webpack modules
      rules: [
        // JSX Files go through Babel
        {
          test: /\.jsx?$/,
          exclude: [/node_modules/],
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            envName: isProduction ? 'production' : 'development',
            configFile: path.resolve(__dirname, 'babel.config.js'),
          },
        },
        // CSS files go through CSS, PostCSS, and Sass
        {
          test: /\.s?css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: isProduction ? '/generated/' : undefined,
              },
            },
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                sourceMap: !isProduction,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !isProduction,
                postcssOptions: {
                  plugins: [
                    require('postcss-normalize'),
                    require('postcss-preset-env'),
                    require('postcss-nested'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
            'sass-loader',
          ],
        },
        // HTML files, if you want to load templates through JS from `src/html`
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: { loader: 'html-loader' },
        },
        // YAML files, for static data in `src/yaml`
        {
          test: /\.ya?ml$/,
          use: 'yaml-loader',
        },
        // Image files
        {
          test: /\.(png|jpe?g|gif)$/i,
          use: [
            {
              loader: 'file-loader',
            },
          ],
        },
      ],
    },
  };
};