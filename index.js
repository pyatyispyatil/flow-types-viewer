const {makeAST} = require('./parser');
const {getDeclarations} = require('./analyzer');

const getData = (paths) => {
  const files = paths.reduce((acc, path) => Object.assign(acc, makeAST(path)), {});

  return getDeclarations(paths, files);
};

module.exports = getData;
