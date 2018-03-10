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


module.exports = {
  memoize
};