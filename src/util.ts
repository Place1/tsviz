export function flatten<T>(array: (T | T[])[]): T[] {
  let flatArray: T[] = [];
  array.forEach((item) => {
    if (Array.isArray(item)) {
      flatArray = flatArray.concat(...flatten(item));
    } else {
      flatArray = flatArray.concat(item);
    }
  });
  return flatArray;
}
