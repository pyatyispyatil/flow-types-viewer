const {getTypeDeclaration} = require('./declarations');
const {isNotPrimitiveType} = require('./utils');

const typeToTypeId = (type) => ({
  name: type.name || type.genericName,
  parametersCount: type.typeParameters ? type.typeParameters.length : 0
});

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

const getDeepDeclarations = (typeId, path, files, acc = {}) => {
  const typeDeclaration = getTypeDeclaration(typeId, path, files);

  if (typeDeclaration) {
    const detailedType = typeDeclarationToTemplate(typeDeclaration, files);

    if (!acc[typeDeclaration.key]) {
      acc[typeDeclaration.key] = detailedType;

      if (Array.isArray(detailedType.value)) {
        return expandArraysAndObjects([detailedType])
          .filter(isNotPrimitiveType)
          .filter(({typeParameter}) => !typeParameter)
          .filter(({name, genericName}) => name || genericName)
          .reduce((acc, item) => getDeepDeclarations(item.id || typeToTypeId(item), item.path, files, acc), acc);//ToDo: parameters
      }
    }
  }

  return acc;
};

const getTypeDeclarationMeta = (typeId, parameters, path, files) => {
  if (parameters && parameters.some(({name}) => typeId.name === name)) {
    return {
      typeParameter: true
    }
  }

  if (path) {
    const typeDeclaration = getTypeDeclaration(typeId, path, files);

    if (typeDeclaration) {
      return {
        declarationId: typeDeclaration.key,
        path: typeDeclaration.path
      };
    } else if (typeId.name !== 'this') {
      return {
        declarationId: `${typeId.name}:${typeId.parametersCount}:global`,
        path: 'global',
        builtin: true
      }
    }
  }

  return {};
};

const typeDeclarationToTemplate = (typeDeclaration, files) => {
  const {declaration, id, path} = typeDeclaration;

  if (declaration) {
    return Object.assign(
      declarationToAssetedTemplate(declaration, path, files),
      {id}
    );
  } else {
    return {id};
  }
};

const declarationToAssetedTemplate = (declaration, path, files, parentParameters = null) => {
  const declarationParameters = declaration.typeParameters && declaration.typeParameters.params
    .map((param) => declarationToAssetedTemplate(param, path, files));
  const parameters = declarationParameters ? declarationParameters : parentParameters;

  return Object.assign(
    declarationToTemplate(path, files, parameters, declaration),
    {
      path,
      typeParameters: declarationParameters,
      id: {
        name: declaration.id && declaration.id.name,
        parametersCount: (declarationParameters && declarationParameters.length) || 0
      }
    }
  )
};

const declarationToTemplate = (path, files, parameters, declaration) => {
  const carryDeclarationToTemplate = (declaration) => declarationToAssetedTemplate(
    declaration,
    path,
    files,
    parameters,
  );
  const mapDeclarations = (declarations) => declarations
    .map((declaration) => carryDeclarationToTemplate(declaration));
  const typeId = {
    name: declaration.id && declaration.id.name,
    parametersCount: (declaration.typeParameters && declaration.typeParameters.params.length) || 0
  };


  switch (declaration.type) {
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
    case 'BooleanLiteralTypeAnnotation':
      return {
        type: 'booleanLiteral',
        value: declaration.value
      };
    case 'NumberLiteralTypeAnnotation':
      return {
        type: 'numberLiteral',
        value: declaration.value
      };
    case 'StringLiteralTypeAnnotation':
      return {
        type: 'stringLiteral',
        value: declaration.value
      };
    case 'NullLiteralTypeAnnotation':
      return {
        type: 'null',
        value: 'null'
      };
    case 'TypeAlias':
      return Object.assign(
        {
          type: 'type',
          value: carryDeclarationToTemplate(declaration.right)
        },
        getTypeDeclarationMeta(typeId, parameters, path, files)
      );
    case 'GenericTypeAnnotation':
      return Object.assign(
        {
          type: 'generic',
          typeParameters: declaration.typeParameters ? mapDeclarations(declaration.typeParameters.params) : null
        },
        getTypeDeclarationMeta(typeId, parameters, path, files)
      );
    case 'IntersectionTypeAnnotation':
      return {
        type: 'intersection',
        value: mapDeclarations(declaration.types)
      };
    case 'UnionTypeAnnotation':
      return {
        type: 'union',
        value: mapDeclarations(declaration.types)
      };
    case 'ObjectTypeAnnotation':
      return {
        type: 'object',
        value: [
          ...declaration.indexers.map((index) => ({
            propType: 'indexer',
            key: carryDeclarationToTemplate(index.key),
            value: carryDeclarationToTemplate(index.value)
          })),
          ...declaration.properties.map((prop) => Object.assign(carryDeclarationToTemplate(prop.value), {
            propType: 'prop',
            optional: prop.optional,
            key: prop.key.name || `"${prop.key.value}"`,
            'static': prop.static
          })),
          ...declaration.callProperties.map((prop) => Object.assign(carryDeclarationToTemplate(prop.value), {
            propType: 'call'
          }))
        ]
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    case 'FunctionTypeAnnotation':
      return {
        type: 'function',
        typeParameters: declaration.typeParameters ? mapDeclarations(declaration.typeParameters.params) : null,
        returnType: carryDeclarationToTemplate(declaration.returnType),
        args: declaration.params.map((arg) => ({
          name: arg.name && arg.name.name,
          value: carryDeclarationToTemplate(arg.typeAnnotation)
        }))
      };
    case 'DeclareVariable':
      return {
        type: 'variable',
        name: declaration.id.name,
        value: declaration.id.typeAnnotation && declaration.id.typeAnnotation.typeAnnotation ? (
          carryDeclarationToTemplate(declaration.id.typeAnnotation.typeAnnotation)
        ) : (null)
      };
    case 'ArrayTypeAnnotation':
      return {
        type: 'generic',
        name: 'Array',
        value: [carryDeclarationToTemplate(declaration.elementType)]
      };
    case 'VoidTypeAnnotation':
      return {
        type: 'void'
      };
    case 'AnyTypeAnnotation':
      return {
        type: 'any'
      };
    case 'MixedTypeAnnotation':
      return {
        type: 'mixed'
      };
    case 'InterfaceDeclaration':
    case 'DeclareInterface':
    case 'DeclareClass':
      return Object.assign(carryDeclarationToTemplate(declaration.body), {
        type: declaration.type === 'DeclareClass' ? 'class' : 'interface',
        parents: declaration.extends
          .map((parent) => Object.assign(
            {
              type: 'generic',
              typeParameters: parent.typeParameters && mapDeclarations(parent.typeParameters.params)
            },
            getTypeDeclarationMeta({
              name: parent.id && parent.id.name,
              parametersCount: parent.typeParameters && parent.typeParameters.params.length
            }, parameters, path, files)
          ))
      });
    case 'NullableTypeAnnotation':
      return Object.assign(carryDeclarationToTemplate(declaration.typeAnnotation), {nullable: true});
    case 'TypeofTypeAnnotation':
      return carryDeclarationToTemplate(declaration.argument);
    case 'DeclareModuleExports':
      return {
        type: 'export',
        value: carryDeclarationToTemplate(declaration.typeAnnotation.typeAnnotation)
      };
    case 'TupleTypeAnnotation':
      return {
        type: 'tuple',
        value: mapDeclarations(declaration.types)
      };
    case 'TypeParameter':
      return {
        type: 'typeParameter',
        name: declaration.name
      };
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

module.exports = {
  getDeepDeclarations,
  typeDeclarationToTemplate
};
