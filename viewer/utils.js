export const cn = (...objs) => objs
  .filter(Boolean)
  .map((obj) => typeof obj !== 'string' ? (
    Object.entries(obj)
      .map(([key, value]) => value ? key : '')
      .filter(Boolean)
      .join(' ')
  ) : obj)
  .join(' ');

const rotate = (arr) => {
  const longestArrLength = arr
    .reduce((longestArr, arr) => longestArr.length > arr.length ? longestArr : arr).length;
  const result = new Array(longestArrLength).fill([]);

  for (let x = arr.length; x--;) {
    for (let y = longestArrLength; y--;) {
      result[y][x] = arr[x][y];
    }
  }
};

export const cutRoot = (paths) => {
  const [separator] = paths[0].match(/(\/)|(\\)/g) || [];
  const splitedPaths = paths
    .map((path) => path.split(separator));

  return splitedPaths.map((path, index, paths) => {
      const pathCopy = path.slice();

      for (let i = 0; i < path.length; i++) {
        if (paths.every((anotherPath) => anotherPath[i] === path[i])) {
          pathCopy.shift();
        } else {
          return pathCopy;
        }
      }
    })
    .map((path) => path.join(separator));
};
