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
    const name = (root.declaration.right.type.id && root.declaration.right.type.id.name) || typeName;

    return Object.assign(typeToObject(root.declaration.right, root.path, files), {name});
  } else {
    return null;
  }
};

const getTypeDeclarationId = (typeName, path, files) => {
  const key = `${typeName}:${path}`;

  if (getTypeDeclarationId.memory[key] === undefined) {
    getTypeDeclarationId.memory[key] = null;
    getTypeDeclarationId.memory[key] = getDetailedType(typeName, path, files);
  }

  return key;
};

getTypeDeclarationId.memory = {};

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
    case 'GenericTypeAnnotation':
      return {
        type: 'generic',
        declarationId: getTypeDeclarationId(type.id && type.id.name, path, files),
        data: type.typeParameters ? mapTypes(type.typeParameters.params) : null
      };
    case 'IntersectionTypeAnnotation':
      return {
        type: 'intersection',
        data: mapTypes(type.types)
      };
    case 'ObjectTypeAnnotation':
      return {
        type: 'object',
        data: type.properties.map((prop) => ({
          optional: prop.optional,
          name: prop.key.name,
          data: typeToObject(prop.value, path, files)
        }))
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};


const getDeclarations = (path, files) => ({
  types: getTypesDeclarations(path, files).map((type) => getDetailedType(type, path, files)),
  declarations: getTypeDeclarationId.memory
});


module.exports = {
  getDeclarations,
  getDetailedType
};