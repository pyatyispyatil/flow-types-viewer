const {getTypeDeclaration} = require('./declarations');
const {isNotPrimitiveType} = require('./utils');

const typeToTypeId = (type) => ({
  name: type.name || type.genericName,
  parameters: type.parameters ? type.parameters.map(({name}) => name) : []
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
    const detailedType = declarationToTemplate(typeDeclaration, files);

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
  if (parameters && parameters.includes(typeId.name)) {
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
        declarationId: `${typeId.name}:${typeId.parameters.join('.')}:global`,
        path: 'global',
        builtin: true
      }
    }
  }

  return {};
};

const declarationToTemplate = (typeDeclaration, files) => {
  const {declaration, id, path} = typeDeclaration;

  if (declaration) {
    const parameters = declaration.typeParameters && declaration.typeParameters.params
      .map(({name}) => ({
        type: 'typeParameter',
        name
      }));
    const newDeclaration = declaration.right || declaration;

    return Object.assign(
      typeToTemplate(path, files, parameters && parameters.map(({name}) => name), newDeclaration),
      {
        id,
        path,
        parameters
      }
    )
  } else {
    return {id};
  }
};

const typeToTemplate = (path, files, parameters, type) => {
  const carryTypeToTemplate = (type) => typeToTemplate(path, files, parameters, type);
  const mapTypes = (types) => types.map((type) => carryTypeToTemplate(type));

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
    case 'BooleanLiteralTypeAnnotation':
      return {
        type: 'booleanLiteral',
        value: type.value
      };
    case 'NumberLiteralTypeAnnotation':
      return {
        type: 'numberLiteral',
        value: type.value
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
        getTypeDeclarationMeta({name: type.id && type.id.name, parameters: []}, parameters, path, files)
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
            key: carryTypeToTemplate(index.key),
            value: carryTypeToTemplate(index.value)
          })),
          ...type.properties.map((prop) => Object.assign(carryTypeToTemplate(prop.value), {
            propType: 'prop',
            optional: prop.optional,
            key: prop.key.name || `"${prop.key.value}"`,
            'static': prop.static
          })),
          ...type.callProperties.map((prop) => Object.assign(carryTypeToTemplate(prop.value), {
            propType: 'call'
          }))
        ]
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    case 'FunctionTypeAnnotation':
      return {
        type: 'function',
        value: type.typeParameters ? mapTypes(type.typeParameters.params) : null,
        returnType: carryTypeToTemplate(type.returnType),
        args: type.params.map((arg) => ({
          name: arg.name && arg.name.name,
          value: carryTypeToTemplate(arg.typeAnnotation)
        }))
      };
    case 'DeclareVariable':
      return {
        type: 'variable',
        name: type.id.name,
        value: type.id.typeAnnotation && type.id.typeAnnotation.typeAnnotation ? (
          carryTypeToTemplate(type.id.typeAnnotation.typeAnnotation)
        ) : (null)
      };
    case 'ArrayTypeAnnotation':
      return {
        type: 'generic',
        name: 'Array',
        value: [carryTypeToTemplate(type.elementType)]
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
    case 'DeclareClass':
      return Object.assign(carryTypeToTemplate(type.body), {
        type: 'class',
        parents: type.extends
          .map((parent) => Object.assign(
            {
              type: parent.typeParameters ? 'generic' : 'type',
              genericName: parent.id && parent.id.name,
              value: parent.typeParameters ? parent.typeParameters.params
                .map((param) => ({
                  type: 'typeParameter',
                  name: param.name
                })) : null,
            },
            getTypeDeclarationMeta({
              name: parent.id && parent.id.name,
              parameters: []
            }, parameters, path, files)
          ))
      });
    case 'NullableTypeAnnotation':
      return Object.assign(carryTypeToTemplate(type.typeAnnotation), {nullable: true});
    case 'TypeofTypeAnnotation':
      return carryTypeToTemplate(type.argument);
    case 'DeclareModuleExports':
      return {
        type: 'export',
        value: carryTypeToTemplate(type.typeAnnotation.typeAnnotation)
      };
    case 'TupleTypeAnnotation':
      return {
        type: 'tuple',
        value: mapTypes(type.types)
      };
    default:
      return {type: 'NaT', value: 'NaT'};
  }
};

module.exports = {
  getDeepDeclarations,
  declarationToTemplate
};
