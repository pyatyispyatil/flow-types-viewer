const {memoize} = require('./utils');

const declarationByTypeName = (...types) => (node) => (
  types.includes(node.id && node.id.name)
  || types.includes(node.declaration && node.declaration.id && node.declaration.id.name)
);
const declarationByType = (...types) => (node) => (
  types.includes(node.type)
);
const specifierByLocalName = (...names) => (specifier) => names.includes(specifier.local && specifier.local.name);

const isPrimitiveType = ({type}) => (
  [
    'null',
    'function',
    'stringLiteral',
    'primitive'
  ].includes(type)
);
const isNotPrimitiveType = (type) => !isPrimitiveType(type);

const getTypeDeclaration = memoize((typeName, path, files) => {
  const fileASTNodeArray = files[path];

  if (!fileASTNodeArray) {
    return {
      path: '',
      key: null,
      name: typeName,
      declaration: null
    }
  }

  const localType = fileASTNodeArray.find(declarationByTypeName(typeName));

  if (!localType) {
    const imports = fileASTNodeArray.filter(declarationByType('ImportDeclaration'));

    const matchedImport = imports
      .find(({specifiers}) => specifiers
        .some(specifierByLocalName(typeName)));

    if (matchedImport) {
      const specifier = matchedImport.specifiers.find(specifierByLocalName(typeName));

      if (specifier) {
        return getTypeDeclaration(
          specifier.imported.name,
          matchedImport.source.value,
          files
        );
      }
    }
  } else {
    const declaration = localType.type === 'TypeAlias' ? localType : localType.declaration;
    const id = declaration && declaration.right.type.id;
    const name = (id && id.name) || typeName;
    const key = `${name || typeName}:${path}`;

    return {
      path,
      key,
      name,
      declaration: declaration
    };
  }
});

const getDeepDeclarations = (type, path, files, acc = {}) => {
  const typeDeclaration = getTypeDeclaration(type, path, files);
  const detailedType = getDetailedType(typeDeclaration, files);

  if (!acc[typeDeclaration.key]) {
    acc[typeDeclaration.key] = detailedType;

    if (Array.isArray(detailedType.value)) {
      return expandArraysAndObjects([detailedType])
        .filter(isNotPrimitiveType)
        .reduce((acc, item) => getDeepDeclarations(item.name, item.path, files, acc), acc);
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

const getTypesNames = (path, files) => (
  files[path]
    .filter(declarationByType('TypeAlias', 'ExportNamedDeclaration'))
    .map((node) => node.type === 'TypeAlias' ? node : node.declaration)
    .map((node) => node.id.name)
);

const getDetailedType = memoize((typeDeclaration, files) => {
  const {declaration, name, path} = typeDeclaration;

  return declaration ? Object.assign(
    typeToObject(declaration.right, path, files),
    {
      name,
      path,
      parameters: declaration.typeParameters && declaration.typeParameters.params
        .map(({name}) => ({
          type: 'typeParameter',
          name
        }))
    }
  ) : {name};
});

const getTypeDeclarationMeta = (typeName, path, files) => {
  if (path) {
    const typeDeclaration = getTypeDeclaration(typeName, path, files);

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
          name: type.id && type.id.name,
          genericName: type.id && type.id.name
        },
        getTypeDeclarationMeta(type.id && type.id.name, path, files)
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
        indexers: type.indexers.map((index) => ({
          key: typeToObject(index.key, path, files),
          value: typeToObject(index.value, path, files)
        })),
        value: type.properties.map((prop) => Object.assign(typeToObject(prop.value, path, files), {
          optional: prop.optional,
          key: prop.key.name || `"${prop.key.value}"`
        }))
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    case 'FunctionTypeAnnotation':
      return {type: 'function', value: 'function'};//ToDo: function handling
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

const parse = (paths, files) => {
  const typesInPaths = paths.map((path) => ({
      path,
      types: getTypesNames(path, files)
    })
  );

  const allTypes = typesInPaths.reduce((acc, {types, path}) => acc.concat(types.map((type) => ({type, path}))), []);

  return {
    types: typesInPaths.reduce((acc, {types, path}) => Object.assign(acc,
      {
        [path]: types.map((type) => getDetailedType(getTypeDeclaration(type, path, files), files))
      }
    ), {}),
    declarations: allTypes.reduce((acc, {type, path}) => getDeepDeclarations(type, path, files, acc), {})
  }
};


module.exports = parse;
