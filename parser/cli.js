const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;
const axios = require('axios');

const getData = require('./index');

const libsRoot = 'https://raw.githubusercontent.com/facebook/flow/v0.67.0/lib/';
const builtinsNames = [
  'bom.js',
  'core.js',
  'cssom.js',
  'dom.js',
  'indexeddb.js',
  'node.js',
  'react-dom.js',
  'react.js',
  'serviceworkers.js',
  'streams.js',
];
const builtinsUrls = builtinsNames.map((url) => libsRoot + url);

const getFlatFiles = (paths, parentPath, acc = []) => paths.reduce((flattedDir, item) => {
  const newPath = path.resolve(parentPath, item);

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

const getFlowFiles = (paths, cwd) => getFlatFiles(paths, cwd).filter((path) => /^.*?\.js(\.flow)?$/.test(path));

const createBuildDir = (cwd, buildDir) => {
  try {
    fs.mkdirSync(path.resolve(cwd, buildDir));
  } catch (err) {

  }
};

const run = async (...args) => {
  const cwd = process.cwd();

  if (args.length > 1) {
    const [options, ...argsPaths] = args.reverse();
    const isTextMode = options.text;
    const buildDir = options.buildDir;

    try {
      if (!isTextMode) {
        console.log('Parsing started');
      }

      try {
        const builtins = await Promise.all(builtinsUrls.map((url) => axios(url).then(({data}) => data)));

        try {
          fs.mkdirSync('./builtins');
        } catch (error) {

        }

        builtins.forEach((body, index) => fs.writeFileSync(path.resolve('./builtins', builtinsNames[index]), body));
      } catch (error) {

      }

      const paths = getFlowFiles(argsPaths, cwd);
      const data = getData(paths);

      if (!isTextMode) {
        console.log('Parsing complete');
      }

      const dataJson = JSON.stringify(data);

      if (isTextMode) {
        console.log(dataJson)
      } else if (options.json) {
        const jsonPath = path.resolve(cwd, options.json === true ? './output.json' : options.json);

        fs.writeFileSync(jsonPath, dataJson);
        console.log(`${jsonPath} was created`);
      } else {
        const html = fs.readFileSync('./template.html').toString().replace(/{{data}}/igm, dataJson);
        const htmlPath = path.resolve(cwd, buildDir, 'index.html');

        createBuildDir(cwd, buildDir);

        fs.writeFileSync(htmlPath, html);
        console.log(`${htmlPath} was created`);
      }

      if (options.viewer) {
        exec('npm i');
        console.log('Node modules installed');
        exec('npm run build');

        createBuildDir(cwd, buildDir);

        fs.copyFileSync('./build/viewer.js', path.resolve(cwd, buildDir, 'viewer.js'));
        fs.copyFileSync('./build/viewer.css', path.resolve(cwd, buildDir, 'viewer.css'));
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
