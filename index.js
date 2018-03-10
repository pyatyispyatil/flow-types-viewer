const fs = require('fs');
const path = require('path');

const parser = require('./parser');
const {getDeclarations} = require('./analyzer');

const [, , ...args] = process.argv;


const getFlatFiles = (paths, parentPath, acc = []) => paths.reduce((flattedDir, item) => {
  const newPath = path.resolve(parentPath || __dirname, item);

  if (fs.lstatSync(newPath).isDirectory()) {
    try {
      getFlatFiles(fs.readdirSync(newPath), newPath, flattedDir);
    } catch (err) {
    }
  } else {
    flattedDir.push(newPath);
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