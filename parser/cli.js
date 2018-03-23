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

const getFlowFilesPaths = (paths, cwd) => getFlatFiles(paths, cwd).filter((path) => /^.*?\.js(\.flow)?$/.test(path));

const copyDir = (from, to) => fs.readdirSync(from)
  .forEach((file) => fs.copyFileSync(path.resolve(from, file), path.resolve(to, file)));

const createDir = (dir) => {
  try {
    fs.mkdirSync(dir);
  } catch (err) {

  }
};

const run = async (...args) => {
  const cwd = process.cwd();
  const [options, ...argsPaths] = args.reverse();
  const isTextMode = options.text;
  const buildDir = path.resolve(cwd, options.output);
  let builtinsData;

  try {
    if (!isTextMode) {
      console.log('Parsing started');
    }

    if (options.builtins) {
      try {
        const builtins = await Promise.all(builtinsUrls.map((url) => axios(url).then(({data}) => data)));

        try {
          fs.mkdirSync('./builtins');
        } catch (error) {
        }

        builtins.forEach((body, index) => fs.writeFileSync(path.resolve('./builtins', builtinsNames[index]), body));

        const paths = getFlowFilesPaths(['./builtins'], cwd);

        builtinsData = getData(paths, {builtin: true});
      } catch (error) {
        console.log('Error while parsing builtin types');
      }
    }

    const paths = getFlowFilesPaths(argsPaths, cwd);
    const parsed = paths.length ? getData(paths) : null;

    if (!isTextMode) {
      console.log('Parsing complete');
    }

    const dataJson = JSON.stringify({parsed, builtins: builtinsData});

    if (isTextMode) {
      console.log(dataJson)
    } else {
      const jsonPath = path.resolve(cwd, !options.json ? path.resolve(buildDir, './data.json') : options.json);

      createDir(buildDir);
      fs.writeFileSync(jsonPath, dataJson);
      console.log(`${jsonPath} was created`);
    }

    if (options.viewer) {
      exec('npm i');
      console.log('Node modules installed');
      exec('npm run build');

      createDir(buildDir);
      copyDir('./dist', buildDir);

      console.log('Viewer ready');
    }
  } catch (error) {
    console.log('Parsing failed');
    console.error(error);

    throw new Error(error);
  }
};

module.exports = run;
