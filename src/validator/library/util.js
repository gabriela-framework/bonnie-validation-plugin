function ucFirst (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function is(type, val) {
    const res = `[object ${ucFirst(type)}]`;

    if (type === "float") {
        return val === +val && val !== (val | 0);
    }

    if (type === 'generator') {
        return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(val));
    }

    if (type.toLowerCase() === "nan") {
        return val !== val;
    }

    return Object.prototype.toString.call(val) === res;
}

function getArgNames(func) {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;

    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

    if(result === null) {
        result = [];
    }

    return result;
}

function hasKey(obj, key) {
    if (!is('object', obj)) return false;

    return Object.prototype.hasOwnProperty.call(obj, key);
}

module.exports = {
    hasKey,
    getArgNames,
    is,
    ucFirst,
};