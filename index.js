const parser = require('./parser');
const {getDetailedType, getDeclarations} = require('./utils');

const [,,index, type] = process.argv;

if (index) {
  const ast = parser.makeAST(index);
  const detailedType = getDetailedType(type, index, ast);
  const declarations = getDeclarations(index, ast);

  debugger;
}