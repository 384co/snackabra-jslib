import { sb_config, jslibVerbose, globalState } from './test_config.js';
import { Snackabra } from './snackabra.js';
const version = 'v0.0.36';
console.log(`\n\n-- test suite (${version}) loaded --\n\n`);
console.log("++++ globalState.SB:");
globalState.SB = new Snackabra(sb_config, jslibVerbose);
console.log(globalState.SB);
//# sourceMappingURL=test_suite.js.map