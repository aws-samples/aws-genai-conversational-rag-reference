/**
 * Override CRA configuration without needing to eject.
 *
 * @see https://www.npmjs.com/package/react-app-rewired
 */
module.exports = function override(config, env) {
  return require('../webpack/config-overrides')(config, env);
};