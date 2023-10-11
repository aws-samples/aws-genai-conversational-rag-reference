/**
 * Override CRA configuration without needing to eject.
 *
 * @see https://www.npmjs.com/package/react-app-rewired
 */
module.exports = function override(config, env) {
  config.ignoreWarnings = [{"module":/node_modules\/(autolinker|ace-builds)/i}];
  return config;
};