const {getTypeDeclaration} = require('./declarations');
const {memoize, isNotPrimitiveType} = require('./utils');

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
  const detailedType = declarationToTemplate(typeDeclaration, files);

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

const getTypeDeclarationMeta = memoize((typeId, path, files) => {
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
});

const declarationToTemplate = memoize((typeDeclaration, files) => {
  const {declaration, id, path} = typeDeclaration;

  return declaration ? Object.assign(
    typeToTemplate(declaration.right || declaration, path, files),
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

const typeToTemplate = memoize((type, path, files) => {
  const mapTypes = (types) => types.map((type) => typeToTemplate(type, path, files));

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
            key: typeToTemplate(index.key, path, files),
            value: typeToTemplate(index.value, path, files)
          })),
          ...type.properties.map((prop) => Object.assign(typeToTemplate(prop.value, path, files), {
            propType: 'prop',
            optional: prop.optional,
            key: prop.key.name || `"${prop.key.value}"`
          })),
          ...type.callProperties.map((prop) => Object.assign(typeToTemplate(prop.value, path, files), {
            propType: 'call'
          }))
        ]
      };
    case 'ExistsTypeAnnotation':
      return {type: 'exists', value: '*'};
    case 'FunctionTypeAnnotation':
      return {
        type: 'function',
        returnType: typeToTemplate(type.returnType, path, files),
        args: type.params.map((arg) => ({
          name: arg.name && arg.name.name,
          value: typeToTemplate(arg.typeAnnotation, path, files)
        }))
      };
    case 'DeclareVariable':
      return {
        type: 'variable',
        name: type.id.name,
        value: type.id.typeAnnotation && type.id.typeAnnotation.typeAnnotation ? (
          typeToTemplate(type.id.typeAnnotation.typeAnnotation, path, files)
        ) : (null)
      };
    case 'ArrayTypeAnnotation':
      return {
        type: 'generic',
        name: 'Array',
        value: [typeToTemplate(type.elementType, path, files)]
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
      return Object.assign(typeToTemplate(type.body, path, files), {
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
            }, path, files)
          ))
      });
    case 'NullableTypeAnnotation':
      return Object.assign(typeToTemplate(type.typeAnnotation, path, files), {nullable: true});
    case 'TypeofTypeAnnotation':
      return typeToTemplate(type.argument, path, files);
    case 'DeclareModuleExports':
      return {
        type: 'export',
        value: typeToTemplate(type.typeAnnotation.typeAnnotation, path, files)
      };
    case 'TupleTypeAnnotation':
      return {
        type: 'tuple',
        value: mapTypes(type.types)
      };
    default:
      return {type: 'NaT', value: 'NaT'};
  }
});

module.exports = {
  getDeepDeclarations,
  declarationToTemplate
};
