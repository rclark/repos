'use strict';

const parallel = require('parallel-stream');
const github = require('./github');

const createTransformStream = (options) => {
  options = options || {};

  const transform = function(repo, _, callback) {
    github.getFile('package.json', Object.assign({}, options, { repo: repo.name }))
      .then((data) => {
        this.push(JSON.parse(data.toString()));
        callback();
      })
      .catch((err) => {
        if (err instanceof github.errors.EmptyRepositoryError) return callback();
        if (err instanceof github.errors.NotFoundError) return callback();
        callback(err);
      });
  };

  return parallel.transform(transform, Object.assign(options, { objectMode: true }));
};

module.exports = { createTransformStream };
