'use strict';

const readable = require('./lib/readable');
const packageInfo = require('./lib/package-info');

module.exports = {
  createReadStream: readable.createReadStream
};

module.exports.packageJsonFinder = (options) => {
  const repos = readable.createReadStream(options);
  const packages = packageInfo.createTransformStream(options);
  repos.on('error', (err) => packages.emit('error', err));
  return repos.pipe(packages);
};
