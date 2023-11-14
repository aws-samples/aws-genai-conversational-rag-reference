const path = require('path');
const webpack = require('webpack');

/**
 * Override CRA configuration without needing to eject.
 *
 * @see https://www.npmjs.com/package/react-app-rewired
 */
module.exports = function override(config, env) {
  if (config.resolve == null) {
    config.resolve = {}
  }

  config.ignoreWarnings = [
    ...config.ignoreWarnings || [],
    {"module":/node_modules\/(autolinker|ace-builds|@aws-lambda-powertools|@aws-sdk)/i}
  ];

  config.resolve.fallback = {
    ...config.resolve.fallback,
    'console': path.resolve(__dirname, 'console.js'),
    'crypto': require.resolve('crypto-browserify'),
    'path': require.resolve('path-browserify'),
    'process': require.resolve('process/browser.js'),
    'stream': require.resolve('stream-browserify'),
  }

  config.plugins = [
    // Remove node: from import specifiers, because Next.js does not yet support node: scheme
    // https://github.com/vercel/next.js/issues/28774
    new webpack.NormalModuleReplacementPlugin(
      /^node:/,
      (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      },
    ),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
    }),
    ...config.plugins || [],
  ]

  return config;
};
