module.exports = {
  extensions: ['ts'],
  require: ['ts-node/register'],
  watchMode: {
    ignoreChanges: ['**/cache/*', '**/artifacts/*'],
  },
};
