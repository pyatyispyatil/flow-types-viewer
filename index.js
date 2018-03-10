const fs = require('fs');
const path = require('path');

const parser = require('./parser');
const {getDeclarations} = require('./utils');

const [, , ...args] = process.argv;


const getFlatFiles = (paths, parentPath, acc = []) => paths.reduce((flattedDir, item) => {
  const newPath = path.resolve(parentPath || '', item);

  try {
    if (fs.lstatSync(newPath).isDirectory()) {
      getFlatFiles(fs.readdirSync(newPath), newPath, flattedDir);
    } else {
      flattedDir.push(newPath);
    }
  } catch (err) {
  }

  return flattedDir;
}, acc);

const getFlowFiles = (paths) => getFlatFiles(paths).filter((path) => /^.*?\.js(\.flow)?$/.test(path));

if (args.length) {
  const paths = getFlowFiles(args);
  const files = paths.reduce((acc, path) => Object.assign(acc, parser.makeAST(path)), {});
  const declarations = getDeclarations(paths, files);
  const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, JSON.stringify(declarations));

  fs.writeFileSync('./build/index.html', html);
}