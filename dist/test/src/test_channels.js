import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js';
import { assert } from './test_utils.js';
import { Snackabra, SBMessage, ChannelEndpoint, ChannelApi } from '../dist/snackabra.js';
const TRACE_CHANNELS = jslibVerbose;
function logTest(msg) {
    const z = getElement('channel_tests');
    z.innerHTML += msg + "<br/><br/>";
    console.log('==== LogTest: ' + msg);
}
function getElement(s) {
    const z = document.getElementById(s);
    if (z == null) {
        assert(false, `failed to find DOM element '${s}'`);
        return {};
    }
    else {
        return z;
    }
}
const globalSB = new Snackabra(sb_config, jslibVerbose);
logTest("SB for channel tests created");
console.log("SB server (for channel tests) created:");
console.log(globalSB);
let globalChannelHandle;
let globalChannelAPI;
let secondaryGlobalChannelAPI;
let globalChannelSocket;
async function test09() {
    logTest("RUNNING TEST 09: create channel");
    try {
        const sbServer = sb_config;
        console.log("Using these servers:");
        console.log(sbServer);
        globalChannelHandle = await globalSB.create(sbServer, serverPassword);
        logTest("New channel created");
        console.log(globalChannelHandle);
    }
    catch (e) {
        logTest("ERROR: test09 failed");
        console.log(e);
    }
}
async function test10() {
    if (!globalChannelHandle)
        await test09();
    assert(globalChannelHandle, "globalChannelHandle is null (after test09)");
    logTest("RUNNING TEST 10: connect to socket");
    let c = await globalSB.connect((m) => { console.log('got message:'); console.log(m); }, globalChannelHandle.key, globalChannelHandle.channelId);
    c.enableTrace = TRACE_CHANNELS;
    c.userName = "TestBot";
    (new SBMessage(c, "Hello from TestBot!")).send()
        .then((c) => { console.log(`test message sent! (${c})`); });
    let messageCount = 0;
    getElement('anotherMessage').onclick = (async () => {
        messageCount++;
        let sbm = new SBMessage(c, `message number ${messageCount} from test10!`);
        logTest(`==== sending message number ${messageCount} (on console)`);
        console.log(`==== sending message number ${messageCount}:`);
        console.log(sbm);
        await c.send(sbm)
            .then((c) => console.log(`back from sending message ${messageCount} (${c})`));
    });
    globalChannelSocket = c;
    logTest("global channel (socket) is ready");
    console.log(globalChannelSocket);
}
async function test11() {
    if (!globalChannelHandle)
        await test09();
    assert(globalChannelHandle, "globalChannelHandle is null (after test09)");
    logTest("RUNNING TEST 11: test channel api (without socket)");
    const channelEndpoint = new ChannelEndpoint(sb_config, globalChannelHandle.key, globalChannelHandle.channelId);
    await channelEndpoint.ready;
    logTest("channel (endpoint) is ready");
    console.log(channelEndpoint);
    globalChannelAPI = new ChannelApi(channelEndpoint);
    logTest("global channel (api) is ready");
    console.log(globalChannelAPI);
}
async function test12() {
    if (!globalChannelAPI) {
        logTest("No channel api - will run test11 automatically");
        await test11();
    }
    logTest("RUNNING TEST 12: get api endpoint and some basic capacity (budding) tests");
    assert(globalChannelAPI, "globalChannelAPI is null");
    const storageLimit = await globalChannelAPI.getStorageLimit();
    logTest(`storage limit is ${storageLimit}`);
    console.log(`storage limit is:`);
    console.log(storageLimit);
}
async function test13() {
    if (!globalChannelAPI)
        await test11();
    assert(globalChannelAPI, "globalChannelAPI is null");
    logTest("RUNNING TEST 13: 'budd' a new channel (take full budget)");
    assert(globalChannelAPI, "globalChannelAPI is null");
    const newChannel = await globalChannelAPI.budd();
    logTest(`new channel is ${newChannel.channelId}`);
    console.log('swapping global channel handle to new channel');
    globalChannelHandle = newChannel;
    globalChannelAPI = undefined;
}
async function test14() {
    if (!globalChannelHandle)
        await test09();
    logTest("RUNNING TEST 14: create a small budded channel");
    const channelEndpoint = new ChannelEndpoint(sb_config, globalChannelHandle.key, globalChannelHandle.channelId);
    globalChannelAPI = new ChannelApi(channelEndpoint);
    let { storageLimit } = await globalChannelAPI.getStorageLimit();
    logTest(`mother budget is ${storageLimit}`);
    assert(storageLimit > 0, "mother budget is zero?");
    const newChannel = await globalChannelAPI.budd({ storage: 64 * 1024 * 1024 });
    logTest(`new channel is ${newChannel.channelId}`);
    const newChannelApi = new ChannelApi(new ChannelEndpoint(sb_config, newChannel.key, newChannel.channelId));
    secondaryGlobalChannelAPI = newChannelApi;
    const { motherChannel } = await newChannelApi.getMother();
    logTest(`new channel is tracking mother ${motherChannel}`);
    ({ storageLimit } = await newChannelApi.getStorageLimit());
    logTest(`new channel budget is ${storageLimit}`);
}
async function test15() {
    if (!secondaryGlobalChannelAPI)
        await test14();
    const testAmount = 64 * 1024 * 1024;
    logTest(`RUNNING TEST 15: move ${testAmount / (1024 * 1024)} MiB to new budded channel`);
    let { storageLimit } = await globalChannelAPI.getStorageLimit();
    logTest(`mother budget is ${storageLimit}`);
    ({ storageLimit } = await secondaryGlobalChannelAPI.getStorageLimit());
    logTest(`child budget is ${storageLimit}`);
    const childBudget1 = storageLimit;
    await globalChannelAPI.budd({ storage: 64 * 1024 * 1024, targetChannel: secondaryGlobalChannelAPI.channelId });
    ({ storageLimit } = await globalChannelAPI.getStorageLimit());
    logTest(`after transfer, mother budget is ${storageLimit}`);
    ({ storageLimit } = await secondaryGlobalChannelAPI.getStorageLimit());
    logTest(`after transfer, child budget is ${storageLimit}`);
    const childBudget2 = storageLimit;
    if (childBudget2 - childBudget1 != testAmount)
        logTest(`ERROR: child budget did not increase by ${testAmount} (it increased by ${childBudget2 - childBudget1})`);
    else
        logTest(`SUCCESS: child budget increased by ${testAmount}`);
}
function installTestButton(name, func) {
    const button = document.createElement('button');
    button.innerText = 'CHANNEL:\n' + name;
    button.onclick = func;
    document.body.appendChild(button);
    const testButtons = document.getElementById('channelTestButtons');
    const testDiv = document.createElement('div');
    testDiv.id = name;
    testDiv.appendChild(button);
    if (testButtons)
        testButtons.appendChild(testDiv);
    else
        console.log('testButtons not found');
}
installTestButton('create a channel', test09);
installTestButton('connect to socket', test10);
installTestButton('test channel api (without socket)', test11);
installTestButton('get api endpoint and some basic capacity (budding) tests', test12);
installTestButton('"budd" a new channel', test13);
installTestButton('create a small budded channel', test14);
installTestButton('move 64MB to new budded channel', test15);
async function testAll() {
    await test09();
    await test10();
    await test11();
    await test12();
    await test13();
    await test14();
    await test15();
}
installTestButton('ALL CHANNEL TESTS', testAll);
if (autoRun) {
    testAll();
}
//# sourceMappingURL=test_channels.js.map