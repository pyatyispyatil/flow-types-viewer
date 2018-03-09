const fs = require('fs');

const parser = require('./parser');
const {getDeclarations} = require('./utils');

const [, , ...paths] = process.argv;

if (paths.length) {
  const ast = paths.reduce((acc, path) => Object.assign(acc, parser.makeAST(path)), {});
  const declarations = getDeclarations(paths, ast);
  const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, JSON.stringify(declarations));

  fs.writeFileSync('./build/index.html', html);
}