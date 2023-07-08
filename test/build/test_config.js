import { SB384 } from './snackabra.js';
export { serverPassword } from './test_server_password.js';
export const autoRun = false;
export const jslibVerbose = false;
const sb_config_workerd = {
    channel_server: 'http://localhost:3845',
    channel_ws: 'ws://localhost:3845',
    storage_server: 'http://localhost:3843',
    shard_server: 'http://localhost:3841',
};
export const sb_config = sb_config_workerd;
export const globalState = {
    SB: null,
    channelHandle: null,
    visitorHandle: null,
    channelEndpoint: null,
    secondEndpoint: null,
    channelSocket: null,
    visitorSocket: null,
    visitorKeys: (new SB384()).ready.then((x) => x.exportable_privateKey),
    channel_test13: false,
    channel_test14: false,
    noDependency: true,
};
//# sourceMappingURL=test_config.js.map