export function assert(expr, msg = '') {
    if (expr) {
        return true;
    }
    else {
        let m = 'Failed Assertion in test. ' + msg;
        console.error(m);
        console.log('stack trace:');
        console.trace();
        return false;
    }
}
//# sourceMappingURL=test_utils.js.map