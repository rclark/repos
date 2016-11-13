'use strict';

const stream = require('stream');
const github = require('./github');

const createReadStream = (options) => {
  options = options || {};

  const readable = new stream.Readable(Object.assign(options, { objectMode: true }));
  const repos = [];
  let nextPage = 1;
  let pending = false;

  const readPage = () => {
    pending = true;
    github.list(Object.assign({}, options, { page: nextPage }))
      .then((result) => {
        nextPage = result.next;
        result.data.forEach((repo) => repos.push(repo));
        readable._read();
      })
      .catch((err) => readable.emit('error', err))
      .then(() => pending = false);
  };

  readable._read = () => {
    let status = true;
    while (status && repos.length) status = readable.push(repos.shift());
    if (repos.length) return;
    if (!nextPage) return readable.push(null);
    if (status && !pending) readPage();
  };

  return readable;
};

module.exports = { createReadStream };
