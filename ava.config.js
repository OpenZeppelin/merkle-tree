module.exports = {
  extensions: ['ts'],
  require: ['ts-node/register'],
  timeout: '600s',
  watchMode: {
    ignoreChanges: ['**/cache/*', '**/artifacts/*'],
  },
};
