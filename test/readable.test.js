'use strict';

const test = require('tape');
const readable = require('../lib/readable');

const token = process.env.GithubAccessToken;
const username = 'rclark';
const org = 'mapbox';

test('[.createReadStream] (live)', (assert) => {
  const stream = readable.createReadStream({ org, token });
  let count = 0;
  stream
    .on('data', () => count++)
    .on('end', () => {
      assert.ok(count > 0, 'listed more than one page of repositories');
      assert.end();
    });
});
