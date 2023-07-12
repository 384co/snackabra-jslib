import { Snackabra, SBServer, SBChannelHandle, ChannelEndpoint, ChannelSocket } from './snackabra.js';
export { serverPassword } from './test_server_password.js';
export declare const autoRun = false;
export declare const jslibVerbose = false;
export declare const sb_config: SBServer;
export type GlobalState = {
    SB: Snackabra | null;
    channelHandle: SBChannelHandle | null;
    visitorHandle: SBChannelHandle | null;
    channelEndpoint: ChannelEndpoint | null;
    secondEndpoint: ChannelEndpoint | null;
    channelSocket: ChannelSocket | null;
    visitorSocket: ChannelSocket | null;
    visitorKeys: Promise<JsonWebKey>;
    channel_test13: boolean;
    channel_test14: boolean;
    noDependency: true;
};
export declare const globalState: GlobalState;
//# sourceMappingURL=test_config.d.ts.map