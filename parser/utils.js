const compareArrays = (arr1, arr2) => arr1
  .every((arg, index) => arg === arr2[index]);

const memoize = (fn) => {
  const memory = [];

  return (...args) => {
    const similarIndex = memory
      .findIndex(({args: memoryArgs}) => args
        .every((arg, index) => (
          arg === memoryArgs[index]
        ) || (
          Array.isArray(arg) && Array.isArray(memoryArgs[index]) && compareArrays(arg, memoryArgs[index])
        )));

    if (similarIndex > -1) {
      return memory[similarIndex].result;
    } else {
      const result = fn(...args);

      memory.push({result, args});

      return result;
    }
  }
};

const declarationByType = (...types) => (node) => (
  types.includes(node.type)
);

const specifierByLocalName = (...names) => (specifier) => names.includes(specifier.local && specifier.local.name);

const TypesNodes = [
  'DeclareVariable'
];
const isTypeNode = (node) => TypesNodes.includes(node.type);

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

module.exports = {
  memoize,
  declarationByType,
  specifierByLocalName,
  isTypeNode,
  isPrimitiveType,
  isNotPrimitiveType
};
