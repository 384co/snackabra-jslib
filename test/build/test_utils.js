export function assert(expr, msg = '') {
    if (expr) {
        return true;
    }
    else {
        let m = 'Failed Assertion in test. ' + msg;
        console.error(m);
        console.log('stack trace:');
        console.trace();
        throw new Error(m);
    }
}
export function getElement(s) {
    const z = document.getElementById(s);
    if (z == null) {
        assert(false, `failed to find DOM element '${s}'`);
        return {};
    }
    else {
        return z;
    }
}
//# sourceMappingURL=test_utils.js.map