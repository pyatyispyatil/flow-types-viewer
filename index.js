const fs = require('fs');
const path = require('path');

const parser = require('./parser');
const {getDeclarations} = require('./analyzer');

const [, , ...args] = process.argv;

const COMMANDS = {
  '--json': 'json',
  '-j': 'json',
  '--text': 'text',
  '-t': 'text'
};

const COMMANDS_KEYS = Object.keys(COMMANDS);

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
  const commands = args.filter((arg) => COMMANDS_KEYS.includes(arg)).map((arg) => COMMANDS[arg]).filter(Boolean);
  const argsPaths = args.filter((arg) => !COMMANDS_KEYS.includes(arg));
  const isTextMode = commands.includes('text');

  try {
    if (!isTextMode) {
      console.log('Parsing started');
    }

    const paths = getFlowFiles(argsPaths);
    const files = paths.reduce((acc, path) => Object.assign(acc, parser.makeAST(path)), {});
    const data = getDeclarations(paths, files);

    if (!isTextMode) {
      console.log('Parsing complete');
    }

    const dataJson = JSON.stringify(data);

    if (isTextMode) {
      console.log(dataJson)
    } else if (commands.includes('json')) {
      fs.writeFileSync('output.json', dataJson);
    } else {
      const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, dataJson);
      fs.writeFileSync('./build/index.html', html);
      console.log('index.html was created');
    }
  } catch (error) {
    console.log('Parsing failed');
    console.error(error);

    throw new Error(error);
  }
} else {
  throw new Error('Arguments needed');
}