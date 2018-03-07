const parser = require('./parser');
const {getDetailedType, getDeclarations} = require('./utils');

const [,,index] = process.argv;

if (index) {
  const ast = parser.makeAST(index);
  const declarations = getDeclarations([index], ast);
}