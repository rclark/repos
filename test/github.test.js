'use strict';

const test = require('tape');
const github = require('../lib/github');

const token = process.env.GithubAccessToken;
const username = 'rclark';
const org = 'mapbox';

test('[github.list] (live) lists user repos', (assert) => {
  github.list({ username, token })
    .then((result) => {
      assert.ok(Array.isArray(result.data), 'lists repository data');
    })
    .catch((err) => assert.ifError(err, 'failed'))
    .then(() => assert.end());
});

test('[github.list] (live) first page of org repos', (assert) => {
  github.list({ org, token })
    .then((result) => {
      assert.ok(Array.isArray(result.data), 'lists repository data');
      assert.equal(result.next, 2, 'exposes next page');
    })
    .catch((err) => assert.ifError(err, 'failed'))
    .then(() => assert.end());
});

test('[github.list] (live) second page of org repos', (assert) => {
  github.list({ org, token, page: 2 })
    .then((result) => {
      assert.ok(Array.isArray(result.data), 'lists repository data');
      assert.equal(result.next, 3, 'exposes next page');
    })
    .catch((err) => assert.ifError(err, 'failed'))
    .then(() => assert.end());
});

test.only('[github.getFile] (live) get a top-level package.json from master', (assert) => {
  const repo = 'tilelive';
  github.getFile('package.json', { org, token, repo })
    .then((result) => {
      assert.doesNotThrow(() => {
        JSON.parse(result.toString());
      }, 'found a JSON buffer');
    })
    .catch((err) => assert.ifError(err, 'failed'))
    .then(() => assert.end());
});
