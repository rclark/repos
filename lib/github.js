'use strict';

const https = require('https');
const qs = require('querystring');
const fasterror = require('fasterror');

const errors = {
  NotFoundError: fasterror('NotFoundError'),
  EmptyRepositoryError: fasterror('EmptyRepositoryError')
};

const list = (options) => {
  const query = {
    access_token: options.token,
    per_page: 100,
    page: options.page || 1
  };

  const params = {
    hostname: 'api.github.com',
    path: (options.org ? `/orgs/${options.org}/repos` : `/users/${options.username}/repos`) + `?${qs.stringify(query)}`,
    headers: {
      'User-Agent': 'repo-stream/1.0.0',
      Accept: 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    const err = new Error(`Request to ${params.path.replace(options.token, 'xxx')} failed`);

    https.get(params, (res) => {
      let data = '';

      err.statusCode = res.statusCode;

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const result = {};
        try { result.data = JSON.parse(data); }
        catch (e) {
          err.message += `: ${data}`;
          return reject(err);
        }

        if (err.statusCode !== 200) {
          err.message += `: ${err.statusCode}`;
          return reject(err);
        }

        if (!res.headers.link) return resolve(result);

        const pages = res.headers.link.split(',');
        const findNext = /[^_]page=(\d+).*rel="next"$/;
        const findLast = /[^_]page=(\d*).*rel="last"$/;

        const next = pages
          .filter((page) => findNext.test(page))
          .map((page) => Number(page.match(findNext)[1]))
          .pop();

        const last = pages
          .filter((page) => findLast.test(page))
          .map((page) => Number(page.match(findLast)[1]))
          .pop();

        if (!next || options.page === last) return resolve(result);
        resolve(Object.assign(result, { next }));
      });
    }).on('error', (e) => {
      err.message += `: ${e.message}`;
      reject(err);
    });
  });
};

const topLevel = (options) => {
  options = options || {};

  const query = { access_token: options.token };

  const tree = {
    hostname: 'api.github.com',
    path: `/repos/${options.org || options.username}/${options.repo}/git/trees/${options.sha || 'master'}` + `?${qs.stringify(query)}`,
    headers: {
      'User-Agent': 'repo-stream/1.0.0',
      Accept: 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    const err = new Error(`Request to ${tree.path.replace(options.token, 'xxx')} failed`);

    https.get(tree, (res) => {
      let data = '';

      err.statusCode = res.statusCode;

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { data = JSON.parse(data); }
        catch (e) {
          err.message += `: ${data}`;
          return reject(err);
        }

        if (err.statusCode !== 200) {
          err.message += `: ${err.statusCode}`;

          // This could represent a repo or sha that does not exist
          if (err.statusCode === 404)
            return reject(new errors.NotFoundError(err.message));

          return reject(err);
        }

        resolve(data.tree);
      });
    }).on('error', (e) => {
      err.message += `: ${e.message}`;
      reject(err);
    });
  });
};

const getBlob = (blobUrl, token) => {
  const query = { access_token: token };

  const blob = {
    hostname: 'api.github.com',
    path: `${blobUrl}?${qs.stringify(query)}`,
    headers: {
      'User-Agent': 'repo-stream/1.0.0',
      Accept: 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    const err = new Error(`Request to ${blob.path.replace(token, 'xxx')} failed`);

    https.get(blob, (res) => {
      let data = '';

      err.statusCode = res.statusCode;

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { data = JSON.parse(data); }
        catch (e) {
          err.message += `: ${data}`;
          return reject(err);
        }

        if (err.statusCode !== 200) {
          err.message += `: ${err.statusCode}`;
          return reject(err);
        }

        if (data.tree) return resolve(data.tree);
        resolve(new Buffer(data.content, data.encoding));
      });
    }).on('error', (e) => {
      err.message += `: ${e.message}`;
      reject(err);
    });
  });
};

const getFile = (filepath, options) => {
  const fileparts = filepath.split('/');
  let part = fileparts.shift();

  const recurse = (url, token, resolve, reject) => {
    getBlob(url, token)
      .then((data) => {
        if (Array.isArray(data)) {
          part = fileparts.shift();
          const blob = data.find((b) => b.path === part);
          if (!blob)
            return reject(new errors.NotFoundError(`${filepath} not found`));
          return recurse(blob.url, token, resolve, reject);
        }
        resolve(data);
      })
      .catch(reject);
  };

  return topLevel(options)
    .then((tree) => {
      const blob = tree.find((b) => b.path === part);
      if (!blob)
        return Promise.reject(new errors.NotFoundError(`${filepath} not found`));

      return new Promise((resolve, reject) => {
        recurse(blob.url, options.token, resolve, reject);
      });
    })
    .catch((err) => {
      if (err && err.statusCode === 409)
        return Promise.reject(new errors.EmptyRepositoryError());
      return Promise.reject(err);
    });
};

module.exports = { list, getFile, errors };
