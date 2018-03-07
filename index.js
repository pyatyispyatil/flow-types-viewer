const exec = require('child_process').execSync;
const fs = require('fs');

const parser = require('./parser');
const {getDeclarations} = require('./utils');

const [,,index] = process.argv;

if (index) {
  const ast = parser.makeAST(index);
  const declarations = getDeclarations([index], ast);
  const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, JSON.stringify(declarations));

  fs.mkdirSync('build');
  exec('npm run build');

  fs.writeFileSync('./build/index.html', html);
}