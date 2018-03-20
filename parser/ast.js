const exec = require('child_process').execSync;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {memoize} = require('./utils');


const getGenericTypes = (type) => {
  switch (type.type) {
    case 'GenericTypeAnnotation':
      return [type.id.name, ...(type.typeParameters ? type.typeParameters.params.map(getGenericTypes) : [])];
    case 'IntersectionTypeAnnotation':
      return type.types.reduce((acc, prop) => [...acc, ...getGenericTypes(prop)], []);
    case 'ObjectTypeAnnotation':
      return type.properties.reduce((acc, prop) => [...acc, ...getGenericTypes(prop.value)], []);
    default:
      return [];
  }
};

const findTypeImports = (body) => body
  .filter(({type, importKind}) => type === 'ImportDeclaration' && importKind === 'type')
  .reduce((acc, item) => {
    acc.push(...item.specifiers.map((specifier) => ({
      name: specifier.imported.name,
      path: item.source.value
    })));

    return acc;
  }, []);


const getFileAST = (url) => {
  if (url && getFileAST.memory.has(url)) {
    return getFileAST.memory.get(url);
  }

  const ast = JSON.parse(exec(`flow ast ${url}`)).body;

  if (url) {
    getFileAST.memory.set(url, ast);
  }

  return ast;
};

getFileAST.memory = new Map();

const getFile = (path) => {
  if (path && !/^[a-zA-Z0-9\-]+$/.test(path)) {
    if (getFile.memory.has(path)) {
      return getFile.memory.get(path);
    } else {
      const file = fs.readFileSync(path).toString();

      getFile.memory.set(path, file);

      return file;
    }
  }

  return '';
};

getFile.memory = new Map();

const getAST = (content) => {
  const fileName = crypto.createCipher('aes192', content).final('hex');
  const dir = 'temp';
  const path = `${dir}/${fileName}`;

  try {
    fs.mkdirSync(dir);
  } catch (err) {

  }

  fs.writeFileSync(path, content);

  return JSON.parse(exec(`flow ast ${path}`)).body;
};


const getDeepImports = (ast, relativePath, acc = {}) => {
  const typeImports = findTypeImports(ast);

  return typeImports.reduce((acc, type) => {
    const importPath = resolveImportPath(type.path, relativePath);

    if (acc[importPath] == null) {
      if (importPath) {
        const fileAST = getFileAST(importPath);

        acc[importPath] = fileAST;

        getDeepImports(fileAST, importPath, acc);
      } else {
        acc[type.path] = null;
      }
    }

    return acc;
  }, acc);
};

const resolveImports = (astNodes, path) => (
  astNodes.map((node) => node.type === 'ImportDeclaration' ? (
    Object.assign(node, {
      source: Object.assign(node.source, {
        value: resolveImportPath(node.source.value, path)
      })
    })
  ) : node)
);


const filesEndings = ['.js', '.js.flow'];
const resolveImportPath = memoize((importPath, parentPath) => {
  const isNodeModule = /^[a-zA-Z0-9_].*?$/.test(importPath);
  const clearedPath = importPath && importPath.replace(/^\.[\/]/, '');
  const clearedParentPath = parentPath && parentPath.replace(/[a-zA-Z0-9\-_.]*?\.js(\.flow)?$/, '');

  let resolvedPath = null;

  if (importPath && path.isAbsolute(importPath)) {
    resolvedPath = importPath;
  } else if (isNodeModule) {
    resolvedPath = null;
  } else if (!parentPath) {
    resolvedPath = './node_modules/' + clearedPath;
  } else {
    resolvedPath = parentPath ? (
      path.resolve(clearedParentPath, clearedPath)
    ) : importPath;
  }

  if (resolvedPath && !fs.existsSync(resolvedPath)) {
    resolvedPath += filesEndings.find((ending) => fs.existsSync(resolvedPath + ending)) || '';
  }

  return resolvedPath;
});

const makeAST = (...paths) => {
  const imports = paths.reduce((acc, path) => {
    acc[path] = getFileAST(path);

    return acc;
  }, {});


  Object.entries(imports)
    .forEach(([path, entry]) => getDeepImports(
      entry,
      path,
      imports
    ));

  return Object.entries(imports)
    .reduce((acc, [key, value]) => {
      acc[key] = value && resolveImports(value, key);

      return acc;
    }, {});
};

module.exports = makeAST;
