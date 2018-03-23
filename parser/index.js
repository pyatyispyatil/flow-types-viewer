const makeAST = require('./ast');
const parse = require('./parser');

const getData = (paths, options = {}) => {
  const files = paths.reduce((acc, path) => Object.assign(acc, makeAST(path)), {});

  if (options.builtin) {
    const monoFile = {'global': Object.values(files).reduce((acc, file) => acc.concat(file), [])};

    return parse(['global'], monoFile).declarations;
  } else {
    return parse(paths, files);
  }
};

module.exports = getData;
