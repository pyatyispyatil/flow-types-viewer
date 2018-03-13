const makeAST = require('./ast');
const parse = require('./parser');

const getData = (paths) => {
  const files = paths.reduce((acc, path) => Object.assign(acc, makeAST(path)), {});

  return parse(paths, files);
};

module.exports = getData;
