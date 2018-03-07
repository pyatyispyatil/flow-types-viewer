const fs = require('fs');
const rm = require('rimraf');

const parser = require('./parser');
const {getDeclarations} = require('./utils');

const [, , index] = process.argv;

if (index) {
  const ast = parser.makeAST(index);
  const declarations = getDeclarations([index], ast);
  const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, JSON.stringify(declarations));

  rm.sync('build');

  fs.mkdirSync('build');
  fs.writeFileSync('./build/index.html', html);
}