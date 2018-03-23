const {
  memoize,
  declarationByType,
  specifierByLocalName
} = require('./utils');


const getDeclarationFromNode = memoize((node) => {
  let declaration;
  let name;

  if (node.type === 'TypeAlias') {
    declaration = node;
    name = (declaration && declaration.right.type.id) || declaration.id.name;
  } else if (node.type === 'DeclareFunction') {
    declaration = node.id.typeAnnotation.typeAnnotation;
    name = node.id.name;
  } else if (node.type === 'TypeofTypeAnnotation') {
    declaration = node.argument;
    name = declaration.id.name;
  } else if (node.type === 'ImportDeclaration') {
    return {
      name: null,
      parameters: [],
      declaration: null
    }
  } else if (node.type === 'DeclareModuleExports' || node.type === 'DeclareExportDeclaration') {
    name = 'default';
    declaration = node;
  } else {
    declaration = node.declaration || node;
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

const declarationByTypeId = (typeId) => (node) => {
  const nodeId = getDeclarationFromNode(node);

  return typeId.name === nodeId.name && (
    typeId.parameters.every((param, index) => nodeId.parameters[index] === param)
  );
};

const getTypeDeclaration = memoize((typeId, path, files) => {
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

module.exports = {
  getDeclarationFromNode,
  getTypeDeclaration
};
