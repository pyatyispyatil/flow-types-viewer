const {memoize} = require('./utils');

const declarationByTypeId = (typeId) => (node) => {
  const nodeId = getDeclarationFromNode(node);

  return typeId.name === nodeId.name && (
    typeId.parameters.every((param, index) => nodeId.parameters[index] === param)
  );
};
const declarationByType = (...types) => (node) => (
  types.includes(node.type)
);
const specifierByLocalName = (...names) => (specifier) => names.includes(specifier.local && specifier.local.name);

const primitiveTypes = [
  'null',
  'boolean',
  'void',
  'any',
  'stringLiteral',
  'primitive'
];

const isPrimitiveType = ({type}) => primitiveTypes.includes(type);
const isNotPrimitiveType = (type) => !isPrimitiveType(type);

const getDeclarationFromNode = memoize((node) => {
  let declaration;
  let name;

  if (node.type === 'TypeAlias') {
    declaration = node;
    name = (declaration && declaration.right.type.id) || declaration.id.name;
  } else if (node.type === 'DeclareFunction') {
    declaration = node.id.typeAnnotation.typeAnnotation;
    name = node.id.name;
  } else if (node.type === 'ImportDeclaration') {
    return {
      name: null,
      parameters: [],
      declaration: null
    }
  } else {
    declaration = node.declaration;
    name = declaration && declaration.id ? (
      declaration.id.name
    ) : (
      declaration && declaration.right.type.id.name
    );
  }

  const parameters = declaration.typeParameters ? (
    declaration.typeParameters.params.map(({name}) => name)
  ) : [];

  return {name, parameters, declaration};
});

const getTypeDeclaration = memoize((typeId, path, files) => {//ToDo: deep memoize based on first 2 arguments
  const fileASTNodeArray = files[path];

  if (!fileASTNodeArray) {
    return {
      path: '',
      key: null,
      id: typeId,
      declaration: null
    }
  }

  const localType = fileASTNodeArray.find(declarationByTypeId(typeId));

  if (!localType) {
    const imports = fileASTNodeArray.filter(declarationByType('ImportDeclaration'));

    const matchedImport = imports
      .find(({specifiers}) => specifiers
        .some(specifierByLocalName(typeId.name)));

    if (matchedImport) {
      const specifier = matchedImport.specifiers.find(specifierByLocalName(typeId.name));

      if (specifier) {
        return getTypeDeclaration(
          {
            name: specifier.imported.name,
            parameters: typeId.parameters
          },
          matchedImport.source.value,
          files
        );
      }
    }
  } else {
    const {name, declaration, parameters = typeId.parameters} = getDeclarationFromNode(localType);
    const key = `${name}:${parameters.join('.')}:${path}`;

    return {
      path,
      key,
      id: {
        name: name || typeId.name,
        parameters
      },
      declaration
    };
  }
});

const typeToTypeId = (type) => ({
  name: type.name || type.genericName,
  parameters: type.parameters ? type.parameters.map(({name}) => name) : []
});

const getDeepDeclarations = (typeId, path, files, acc = {}) => {
  const typeDeclaration = getTypeDeclaration(typeId, path, files);
  const detailedType = getDetailedType(typeDeclaration, files);

  if (!acc[typeDeclaration.key]) {
    acc[typeDeclaration.key] = detailedType;

    if (Array.isArray(detailedType.value)) {
      return expandArraysAndObjects([detailedType])
        .filter(isNotPrimitiveType)
        .filter(({name, genericName}) => name || genericName)
        .reduce((acc, item) => getDeepDeclarations(item.id || typeToTypeId(item), item.path, files, acc), acc);//ToDo: parameters
    }

    return acc;
  }

  return acc;
};

const expandArraysAndObjects = (detailedTypes, acc = []) => detailedTypes
  .reduce((flatArray, item) => {
    if (item.type === 'object') {
      return flatArray.concat(
        item,
        expandArraysAndObjects(
          item.value,
          acc
        ));
    } else if (item.type === 'function') {
      return flatArray.concat(
        item,
        expandArraysAndObjects(
          [...item.args.map(({value}) => value), item.returnType],
          acc
        )
      )
    } else {
      return flatArray.concat(
        item.type === 'union' || item.type === 'generic' ? item : [],
        Array.isArray(item.value) ? (
          expandArraysAndObjects(item.value, acc)
        ) : (
          item
        )
      )
    }
  }, acc);

const getDetailedType = memoize((typeDeclaration, files) => {
  const {declaration, id, path} = typeDeclaration;

  return declaration ? Object.assign(
    typeToObject(declaration.right || declaration, path, files),
    {
      id,
      path,
      parameters: declaration.typeParameters && declaration.typeParameters.params
        .map(({name}) => ({
          type: 'typeParameter',
          name
        }))
    }
  ) : {id};
});

const getTypeDeclarationMeta = (typeId, path, files) => {
  if (path) {
    const typeDeclaration = getTypeDeclaration(typeId, path, files);

    if (typeDeclaration) {
      return {
        declarationId: typeDeclaration.key,
        path: typeDeclaration.path
      };
    }
  }

  return {
    builtin: true
  };
};


const typeToObject = (type, path, files) => {
  const mapTypes = (types) => types.map((type) => typeToObject(type, path, files));

  switch (type.type) {
    case 'NumberTypeAnnotation':
      return {
        type: 'primitive',
        value: 'number'
      };
    case 'StringTypeAnnotation':
      return {
        type: 'primitive',
        value: 'string'
      };
    case 'BooleanTypeAnnotation':
      return {
        type: 'primitive',
        value: 'boolean'
      };
    case 'StringLiteralTypeAnnotation':
      return {
        type: 'stringLiteral',
        value: type.value
      };
    case 'NullLiteralTypeAnnotation':
      return {
        type: 'null',
        value: 'null'
      };
    case 'GenericTypeAnnotation':
      return Object.assign(
        {
          type: type.typeParameters ? 'generic' : 'type',
          value: type.typeParameters ? mapTypes(type.typeParameters.params) : null,
          genericName: type.id && type.id.name
        },
        getTypeDeclarationMeta({name: type.id && type.id.name, parameters: []}, path, files)
      );
    case 'IntersectionTypeAnnotation':
      return {
        type: 'intersection',
        value: mapTypes(type.types)
      };
    case 'UnionTypeAnnotation':
      return {
        type: 'union',
        value: mapTypes(type.types)
      };
    case 'ObjectTypeAnnotation':
      return {
        type: 'object',
        value: [
          ...type.indexers.map((index) => ({
            propType: 'indexer',
            key: typeToObject(index.key, path, files),
            value: typeToObject(index.value, path, files)
          })),
          ...type.properties.map((prop) => Object.assign(typeToObject(prop.value, path, files), {
            propType: 'prop',
            optional: prop.optional,
            key: prop.key.name || `"${prop.key.value}"`
          })),
          ...type.callProperties.map((prop) => Object.assign(typeToObject(prop.value, path, files), {
            propType: 'call'
          }))
        ]
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    case 'FunctionTypeAnnotation':
      return {
        type: 'function',
        returnType: typeToObject(type.returnType),
        args: type.params.map((arg) => ({
          name: arg.name && arg.name.name,
          value: typeToObject(arg.typeAnnotation, path, files)
        }))
      };
    case 'VoidTypeAnnotation':
      return {
        type: 'void'
      };
    case 'AnyTypeAnnotation':
      return {
        type: 'any'
      };
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

const getTypesNames = (path, files) => (
  files[path]
    .filter(declarationByType('TypeAlias', 'ExportNamedDeclaration', 'DeclareFunction'))
    .map((node) => node.type === 'TypeAlias' ? node : node.declaration)
    .map(getDeclarationFromNode)
    .map(({name, parameters}) => ({name, parameters}))
);

const getModules = (path, files) => files[path]
  .filter(declarationByType('DeclareModule'))
  .map((module) => ({
    path,
    name: module.id.value,
    typesIds: module.body.body.map(({declaration}) => getTypeIdFromNode(declaration))
  }));

const getTypeIdFromNode = memoize((node) => {
  const {name, parameters} = getDeclarationFromNode(node);

  return {name, parameters};
});


const getModulesFiles = (files) => Object.entries(files)
  .filter(([path, file]) => file && file.some(({type}) => type === 'DeclareModule'))
  .reduce((acc, [path, file]) => Object.assign(acc, file
    .reduce((modules, declaration) => Object.assign(
      modules,
      {
        [`${declaration.id.value}:${path}`]: declaration.body.body.map(({declaration}) => declaration)
      }
    ), {})
  ), {});

const getCommonFiles = (files) => Object.entries(files)
  .filter(([path, file]) => file && !file.some((declaration) => declaration.type === 'DeclareModule'))
  .reduce((acc, [path, file]) => Object.assign(acc,
    acc,
    {
      [path]: file
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

  const getDeclarationsForTypes = (typesIds, path) => typesIds.map((typeId) =>
    getDetailedType(
      getTypeDeclaration(
        typeId,
        path,
        preparedFiles
      ),
      preparedFiles)
  );

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
