const {
  getDeclarationFromNode,
  getTypeDeclaration
} = require('./declarations');
const {getDeepDeclarations, typeDeclarationToTemplate} = require('./assembly');
const {declarationByType} = require('./utils');


const getTypesNames = (path, files) => (
  files[path]
    .filter(({type}) => type !== 'EmptyStatement')
    .filter(declarationByType('TypeAlias', 'ExportNamedDeclaration', 'DeclareFunction', 'DeclareClass', 'InterfaceDeclaration', 'DeclareInterface'))
    .map((node) => node.type === 'TypeAlias' || !node.declaration ? node : node.declaration)
    .map(getDeclarationFromNode)
    .map(({name, parametersCount}) => ({name, parametersCount}))
);

const getModules = (path, files) => files[path]
  .filter(declarationByType('DeclareModule'))
  .map((module) => ({
    path,
    name: module.id.value,
    typesIds: module.body.body
      .filter(({type}) => type !== 'EmptyStatement')
      .map((node) => getTypeIdFromNode(node.type === 'DeclareExportDeclaration' ? node : node.declaration || node))
  }));

const getTypeIdFromNode = (node) => {
  const {name, parametersCount} = getDeclarationFromNode(node);

  return {name, parametersCount};
};


const getModulesFiles = (files) => Object.entries(files)
  .filter(([path, file]) => file)
  .map(([path, file]) => [path, file.filter(({type}) => type === 'DeclareModule')])
  .filter(([path, file]) => file.length)
  .reduce((acc, [path, file]) => Object.assign(acc, file
    .filter(({type}) => type !== 'EmptyStatement')
    .filter((declaration) => declaration.type === 'DeclareModule')
    .reduce((modules, declaration) => Object.assign(
      modules,
      {
        [`${declaration.id.value}:${path}`]: declaration.body.body.map((node) => node.declaration || node)
      }
    ), {})
  ), {});

const getCommonFiles = (files) => Object.entries(files)
  .filter(([path, file]) => file)
  .map(([path, file]) => [path, file.filter(({type}) => type !== 'DeclareModule')])
  .reduce((acc, [path, file]) => Object.assign(acc,
    acc,
    {
      [path]: file
        .filter(({type}) => type !== 'EmptyStatement')
    }
  ), {});

const parse = (paths, files) => {
  const declarations = paths.map((path) => ({
      path,
      typesIds: getTypesNames(path, files),
      modules: getModules(path, files)
    })
  );
  const preparedFiles = Object.assign(getModulesFiles(files), getCommonFiles(files));

  const typesInPaths = declarations.filter(({typesIds}) => typesIds.length);
  const modulesInPaths = declarations.filter(({modules}) => modules.length);

  const allTypes = [
    ...typesInPaths
      .reduce((acc, {typesIds, path}) => [...acc, ...typesIds.map((typeId) => ({typeId, path}))], []),
    ...modulesInPaths
      .reduce((acc, file) => [
        ...acc,
        ...file.modules.reduce((types, {path, name, typesIds}) => [
          ...types,
          ...typesIds.map((typeId) => ({
            typeId,
            path: `${name}:${path}`
          }))
        ], [])
      ], [])
  ];

  const getDeclarationsForTypes = (typesIds, path) => typesIds.map((typeId) => {
    const typeDeclaration = getTypeDeclaration(
      typeId,
      path,
      preparedFiles
    );

    return typeDeclarationToTemplate(typeDeclaration, preparedFiles)
  });

  return {
    types: typesInPaths.reduce((acc, {typesIds, path}) => Object.assign(acc,
      {
        [path]: getDeclarationsForTypes(typesIds, path)
      }
    ), {}),
    modules: modulesInPaths.reduce((acc, {modules, name, path}) => Object.assign(
      acc,
      {
        [path]: modules.reduce((acc, {name, typesIds}) => Object.assign(
          acc,
          {
            [name]: getDeclarationsForTypes(typesIds, `${name}:${path}`)
          }
        ), {})
      }
    ), {}),
    declarations: allTypes.reduce((acc, {typeId, path}) => getDeepDeclarations(typeId, path, preparedFiles, acc), {})
  }
};


module.exports = parse;
