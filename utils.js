const memoize = (fn) => {
  const memory = [];

  return (...args) => {
    const similarIndex = memory
      .findIndex(({args: memoryArgs}) => args
        .every((arg, index) => arg === memoryArgs[index]));

    if (similarIndex > -1) {
      return memory[similarIndex].result;
    } else {
      const result = fn(...args);

      memory.push({result, args});

      return result;
    }
  }
};

const declarationByTypeName = (...types) => (node) => (
  types.includes(node.id && node.id.name)
  || types.includes(node.declaration && node.declaration.id && node.declaration.id.name)
);
const declarationByType = (...types) => (node) => (
  types.includes(node.type)
);
const specifierByLocalName = (...names) => (specifier) => names.includes(specifier.local && specifier.local.name);

const getTypeDeclaration = memoize((typeName, path, files) => {
  const fileASTNodeArray = files[path];
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
    const id = declaration.right.type.id;
    const name = (id && id.name) || typeName;
    const key = `${name || typeName}:${path}`;

    return {
      path,
      key,
      name,
      declaration: declaration.right
    };
  }
});

const getDeepDeclarations = (type, path, files, acc = {}) => {
  const typeDeclaration = getTypeDeclaration(type, path, files);
  const detailedType = getDetailedType(typeDeclaration, files);

  if (!acc[typeDeclaration.key]) {
    acc[typeDeclaration.key] = detailedType;

    if (Array.isArray(detailedType.value)) {
      return detailedType.value
        .map((item) => item.type === 'prop' ? item.value : item)
        .reduce((flatArray, item) => flatArray.concat(Array.isArray(item.value) ? item.value : item), [])
        .filter(({type}) => type !== 'primitive' && type !== 'stringLiteral')
        .reduce((acc, item) =>
            getDeepDeclarations(item.name, item.path, files, acc),
          acc);
    }
  }

  return acc;
};

const getTypesNames = (path, files) => (
  files[path]
    .filter(declarationByType('TypeAlias', 'ExportNamedDeclaration'))
    .map((node) => node.type === 'TypeAlias' ? node : node.declaration)
    .map((node) => node.id.name)
);

const getDetailedType = memoize((typeDeclaration, files) => {
  const {declaration, name, path} = typeDeclaration;

  return Object.assign(
    typeToObject(declaration, path, files),
    {name, path}
  );
});

const getTypeDeclarationMeta = (typeName, path, files) => {
  const typeDeclaration = getTypeDeclaration(typeName, path, files);

  if (typeDeclaration) {
    return {
      declarationId: typeDeclaration.key,
      path: typeDeclaration.path
    };
  } else {
    return {};
  }
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
    case 'GenericTypeAnnotation':
      return Object.assign({
        type: type.typeParameters ? 'generic' : 'type',
        value: type.typeParameters ? mapTypes(type.typeParameters.params) : null,
        name: type.id && type.id.name
      }, getTypeDeclarationMeta(type.id && type.id.name, path, files));
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
        value: type.properties.map((prop) => Object.assign(typeToObject(prop.value, path, files), {
          optional: prop.optional,
          key: prop.key.name
        }))
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

const getDeclarations = (paths, files) => {
  const participatingTypes = paths.reduce((acc, path) => acc
    .concat(
      getTypesNames(path, files).map((type) => ({type, path}))
    ), []);

  return {
    types: participatingTypes.map(({type, path}) => getDetailedType(getTypeDeclaration(type, path, files), files)),
    declarations: participatingTypes.reduce((acc, {type, path}) => getDeepDeclarations(type, path, files), {})
  }
};


module.exports = {
  getDeclarations,
  getDetailedType
};