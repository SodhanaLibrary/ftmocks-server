class FtJSON {
  static parse(text, reviver, reference) {
    try {
      return JSON.parse(text, reviver);
    } catch (error) {
      console.error('FtJSON parse error:', error, reference);
      return text;
    }
  }

  static stringify(value, replacer, space, reference) {
    try {
      return JSON.stringify(value, replacer, space);
    } catch (error) {
      console.error('FtJSON stringify error:', error, reference);
      return value;
    }
  }

  static areJsonEqual(jsonObj1, jsonObj2) {
    // Check if both are objects and not null
    if (
      typeof jsonObj1 === 'object' &&
      jsonObj1 !== null &&
      typeof jsonObj2 === 'object' &&
      jsonObj2 !== null
    ) {
      // Get the keys of both objects
      const keys1 = Object.keys(jsonObj1);
      const keys2 = Object.keys(jsonObj2);

      // Check if the number of keys is different
      if (keys1.length !== keys2.length) {
        return false;
      }

      // Recursively check each key-value pair
      for (let key of keys1) {
        if (
          !keys2.includes(key) ||
          !FtJSON.areJsonEqual(jsonObj1[key], jsonObj2[key])
        ) {
          return false;
        }
      }

      return true;
    } else {
      // For non-object types, use strict equality comparison
      return jsonObj1 === jsonObj2;
    }
  }
}

module.exports = FtJSON;
