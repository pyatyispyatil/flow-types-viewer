const {
  declarationByType,
  specifierByLocalName
} = require('./utils');


const getDeclarationFromNode = (node) => {
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
      parametersCount: 0,
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

  const parametersCount = declaration.typeParameters ?
    declaration.typeParameters.params.length : 0;

  return {name, parametersCount, declaration};
};

const declarationByTypeId = (typeId) => (node) => {
  const nodeId = getDeclarationFromNode(node);

  return typeId.name === nodeId.name
    && typeId.parametersCount === nodeId.parametersCount;
};

const getTypeDeclaration = (typeId, path, files) => {
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
            parametersCount: typeId.parametersCount
          },
          matchedImport.source.value,
          files
        );
      }
    }
  } else {
    const {name, declaration, parametersCount = typeId.parametersCount} = getDeclarationFromNode(localType);
    const key = `${name}:${parametersCount}:${path}`;

    return {
      path,
      key,
      id: {
        name: name || typeId.name,
        parametersCount
      },
      declaration
    };
  }
};

module.exports = {
  getDeclarationFromNode,
  getTypeDeclaration
};
