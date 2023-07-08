import { Snackabra, SBServer, SBChannelHandle, ChannelEndpoint, ChannelSocket, SB384 } from './snackabra.js'

// whatever server(s) you configure below, you will need to
// set the appropriate password(s) in test_server_password.ts
export { serverPassword } from './test_server_password.js'

// runs tests automatically (as opposed to by button-clicks)
export const autoRun = false;

// decides if jslib should be verbose
export const jslibVerbose = false;

// development (local) servers
const sb_config_workerd: SBServer = {
    channel_server: 'http://localhost:3845',
    channel_ws: 'ws://localhost:3845',
    storage_server: 'http://localhost:3843',
    shard_server: 'http://localhost:3841',
}

// // preview servers:
// const sb_config_new: SBServer = {
//     channel_server: 'https://channel.384co.workers.dev',
//     channel_ws: 'wss://channel.384co.workers.dev',
//     storage_server: 'https://storage.384co.workers.dev',
//     shard: 'https://shard.3.8.4.land',
// }

export const sb_config = sb_config_workerd;

export type GlobalState = {
    SB: Snackabra | null,
    channelHandle: SBChannelHandle | null, // used as 'main' handle, for OWNER
    visitorHandle: SBChannelHandle | null, // same as above, for VISITOR
    channelEndpoint: ChannelEndpoint | null,
    secondEndpoint: ChannelEndpoint | null,
    channelSocket: ChannelSocket | null, // used as 'main' socket, for OWNER
    visitorSocket: ChannelSocket | null, // same as above, for VISITOR
    visitorKeys: Promise<JsonWebKey>,
    channel_test13: boolean,
    channel_test14: boolean,
    noDependency: true,
    // other global dependencies
};

export const globalState: GlobalState = {
    SB: null,
    channelHandle: null,
    visitorHandle: null,
    channelEndpoint: null,
    secondEndpoint: null,
    channelSocket: null,
    visitorSocket: null,
    visitorKeys: (new SB384()).ready.then((x: SB384) => x.exportable_privateKey),
    channel_test13: false,
    channel_test14: false,
    noDependency: true,
    // other global dependencies initialized to null or default value
};
