const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;
const getData = require('./index');

const makeCommands = (...commands) => commands
  .reduce((acc, com) => Object.assign(acc, {
    [`--${com}`]: com,
    [`-${com.substr(0, 1)}`]: com
  }), {});

const COMMANDS = makeCommands('json', 'text', 'viewer');
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

const run = (args) => {
  const cwd = process.cwd();

  if (args.length) {
    const commands = args.filter((arg) => COMMANDS_KEYS.includes(arg)).map((arg) => COMMANDS[arg]).filter(Boolean);
    const argsPaths = args.filter((arg) => !COMMANDS_KEYS.includes(arg)).map((argPath) => path.resolve(cwd, argPath));
    const isTextMode = commands.includes('text');

    try {
      if (!isTextMode) {
        console.log('Parsing started');
      }

      const paths = getFlowFiles(argsPaths);
      const data = getData(paths);

      if (!isTextMode) {
        console.log('Parsing complete');
      }

      const dataJson = JSON.stringify(data);

      if (isTextMode) {
        console.log(dataJson)
      } else if (commands.includes('json')) {
        fs.writeFileSync(path.resolve(cwd, './flow-types-viewer.output.json'), dataJson);
      } else {
        const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, dataJson);

        try {
          fs.mkdirSync(path.resolve(cwd, 'flow-types-viewer'));
        } catch (err) {

        }

        fs.writeFileSync(path.resolve(cwd, './flow-types-viewer/index.html'), html);
        console.log('index.html was created');
      }

      if (commands.includes('viewer')) {
        exec('npm i');
        console.log('Node modules installed');
        exec('npm run build');

        try {
          fs.mkdirSync(path.resolve(cwd), 'flow-types-viewer');
        } catch (err) {

        }

        fs.copyFileSync('./build/viewer.js', path.resolve(cwd, './flow-types-viewer/viewer.js'));
        fs.copyFileSync('./build/viewer.css', path.resolve(cwd, './flow-types-viewer/viewer.css'));
        console.log('Viewer ready');
      }

    } catch (error) {
      console.log('Parsing failed');
      console.error(error);

      throw new Error(error);
    }
  } else {
    throw new Error('Arguments needed');
  }
};

module.exports = run;
