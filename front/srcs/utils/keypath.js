//@ts-nocheck


/**
 * getValue.
 *
 * @param {any} obj
 * @param {string} keypath  "first.second.third"
 */
export function getValue(obj, keypath) {
  return keypath.split('.').reduce((previous, current) => previous[current], obj);
}

/**
 * testValue.
 *
 * @param {any} obj
 * @param {string} keypath  "first.second.third"
 * @returns {Boolean} true if obj.first.second.third can be true
 */
export function testValue(obj, keypath) {
  let isValid = obj != null && obj != undefined;
  return Boolean(keypath.split('.').reduce((previous, current) =>{
    if (!isValid) {
      return false;
    }
    isValid = previous != null && previous != undefined;
    if (typeof previous === "number")
      return previous != 0;
    else if (typeof previous === "string")
      return previous.length != 0;
    return previous[current]
  } , obj));
}


/**
 * setValue.
 *
 * @param {any} obj
 * @param {string} keypath  "first.second.third"
 * @param {any} value
 */
export function setValue(obj, keypath, value) {

  const path = keypath.split('.');
  if (path.length < 2) {
    obj[keypath] = value;
    return ;
  }
  const keyToSet = path.pop();
  const target = getValue(obj, path.join('.'));
  target[keyToSet] = value;
}
