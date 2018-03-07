const declarationByTypeName = (...types) => (node) => (
  types.includes(node.id && node.id.name)
  || types.includes(node.declaration && node.declaration.id && node.declaration.id.name)
);
const declarationByType = (...types) => (node) => (
  types.includes(node.type)
);
const specifierByLocalName = (...names) => (specifier) => names.includes(specifier.local && specifier.local.name);

const getTypeDeclaration = (typeName, path, files) => {
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
    return {
      path,
      declaration: localType.type === 'TypeAlias' ? localType : localType.declaration
    };
  }
};

const getTypesDeclarations = (path, files) => (
  files[path]
    .filter(declarationByType('TypeAlias', 'ExportNamedDeclaration'))
    .map((node) => node.type === 'TypeAlias' ? node : node.declaration)
    .map((node) => node.id.name)
);

const getDetailedType = (typeName, path, files) => {
  const root = getTypeDeclaration(typeName, path, files);

  if (root) {
    const key = `${typeName}:${root.path}`;

    if (getDetailedType.memory[key] === undefined) {
      const name = (root.declaration.right.type.id && root.declaration.right.type.id.name) || typeName;

      getDetailedType.memory[key] = null;

      const detailedType = Object.assign(
        typeToObject(root.declaration.right, root.path, files),
        {
          name,
          path: root.path
        }
      );

      getDetailedType.memory[key] = detailedType;

      return detailedType;
    } else {
      return getDetailedType.memory[key];
    }
  } else {
    return null;
  }
};

getDetailedType.memory = {};

const getTypeDeclarationId = (typeName, path, files) => {
  const detailedType = getDetailedType(typeName, path, files);

  return detailedType ? `${detailedType.name}:${detailedType.path}` : null;
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
        type: 'primitive',
        value: 'stringLiteral'
      };
    case 'GenericTypeAnnotation':
      return {
        type: type.typeParameters ? 'generic' : 'type',
        declarationId: getTypeDeclarationId(type.id && type.id.name, path, files),
        value: type.typeParameters ? mapTypes(type.typeParameters.params) : null
      };
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
        value: type.properties.map((prop) => ({
          optional: prop.optional,
          name: prop.key.name,
          value: typeToObject(prop.value, path, files)
        }))
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

const getDeclarations = (paths, files) => ({
  types: paths.reduce((acc, path) => {
    acc.push(
      ...getTypesDeclarations(path, files)
        .map((type) => getDetailedType(type, path, files))
    );

    return acc;
  }, []),
  declarations: getDetailedType.memory
});


module.exports = {
  getDeclarations,
  getDetailedType
};