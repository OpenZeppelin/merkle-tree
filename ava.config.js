module.exports = {
  extensions: ['ts'],
  require: ['ts-node/register'],
  timeout: '60s',
  watchMode: {
    ignoreChanges: ['**/cache/*', '**/artifacts/*'],
  },
};
