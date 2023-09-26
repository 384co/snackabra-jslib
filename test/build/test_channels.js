import { sb_config, autoRun, jslibVerbose, serverPassword, globalState } from './test_config.js';
import { assert, getElement } from './test_utils.js';
import { SBMessage, ChannelEndpoint } from './snackabra.js';
const TRACE_CHANNELS = jslibVerbose;
function logTest(msg) {
    const z = getElement('channel_tests');
    z.innerHTML += msg + "<br/><br/>";
    if (msg.includes('ERROR')) {
        console.warn('test_channels: ' + msg);
    }
    else {
        console.log('test_channels: ' + msg);
    }
}
console.log("#### you can track all 'window.globalState' variables in the console: ####");
window.globalState = globalState;
console.log(globalState);
function ownerMessageHandler(m) {
    console.log('++++ test 10 OWNER got message (on globalState.channelhandle):');
    console.log(m);
}
function visitorMessageHandler(m) {
    console.log('++++ test 10 VISITOR got message (on globalState.channelhandle):');
    console.log(m);
}
async function channel_test09() {
    console.log("... creating channels using these servers:");
    console.log(sb_config);
    const newChannel = await globalState.SB.create(sb_config, serverPassword);
    globalState.channelHandle = newChannel;
    logTest("... global channel handle is:");
    console.log(globalState.channelHandle);
}
async function channel_test21() {
    const jwk = {
        "kty": "EC",
        "crv": "P-384",
        "x": "aRI1wBYItKeJ2y1iTZDkwlgYvh9FiBRw-rYqO-ke8a-Ma8yhwB2m4SaDJDNJZZUP",
        "y": "mxnI_yFkXLTu0F0PCSZsulxcxtCqLoN2TVdJUSCzTly9BOpasn77sT8-G9o2CKe9",
        "d": "Xy_e7m5N26zZbliShLttkG_uEhRMD1GlvD0dXUwX6qUxHmqPGqN3_eA3wK1dSnIx",
        "ext": true,
        "key_ops": [
            "deriveKey"
        ]
    };
    console.log("... creating channel using this JWK:");
    console.log(jwk);
    const newChannel = await globalState.SB.create(sb_config, serverPassword, jwk);
    logTest("... got channel handle:");
    console.log(newChannel);
}
async function _channel_test10(owner) {
    const userName = owner ? "TestBot OWNER" : "TestBot VISITOR";
    const buttonName = owner ? "anotherOwnerMessage" : "anotherVisitorMessage";
    return new Promise(async (resolve, reject) => {
        assert(globalState.channelHandle, "global channelHandle is null");
        let c = owner
            ? await globalState.SB.connect(ownerMessageHandler, globalState.channelHandle.key, globalState.channelHandle.channelId)
            : await globalState.SB.connect(visitorMessageHandler, await globalState.visitorKeys, globalState.channelHandle.channelId);
        c.enableTrace = TRACE_CHANNELS;
        c.userName = userName;
        if (owner) {
            globalState.channelSocket = c;
            logTest("global channel (socket) is ready for OWNER, and we are about to send a message; socket:");
            console.log(globalState.channelSocket);
        }
        else {
            globalState.visitorSocket = c;
            logTest("global channel (socket) is ready for VISITOR, and we are about to send a message; socket:");
            console.log(globalState.visitorSocket);
        }
        let messageCount = 0;
        getElement(buttonName).onclick = (async () => {
            messageCount++;
            let additionalMessageSent = false;
            let sbm = new SBMessage(c, `---- test10 message number ${messageCount} from ${userName} ----}`, (owner && globalState.visitorSocket) ? await globalState.visitorKeys : undefined);
            logTest(`==== sending message number ${messageCount} as ${userName} (on console)`);
            console.log(sbm);
            c.send(sbm)
                .then((c) => {
                logTest(`... back from sending message ${messageCount} from ${userName} (${c})`);
                additionalMessageSent = true;
            });
            setTimeout(() => {
                if (!additionalMessageSent) {
                    logTest(`**** test 10 ERROR: message ${messageCount} was not sent (from ${userName})`);
                }
                else {
                    logTest(`++++ test 10 SUCCESS: message ${messageCount} was sent (from ${userName}))`);
                }
            }, 500);
        });
        let firstMessageWasSent = false;
        (new SBMessage(c, "Hello from ${userName} TestBot!")).send()
            .then((c) => {
            console.log(`test message sent from ${userName}! (${c})`);
            firstMessageWasSent = true;
            resolve("first message was directly sent from ${userName}");
        });
        setTimeout(() => {
            if (!firstMessageWasSent) {
                logTest("**** test 10 ERROR: first message was not sent (from ${userName}))");
                reject("message was not sent");
            }
            else {
                logTest("++++ test 10 SUCCESS: first message was *eventually* sent (from ${userName}))");
            }
        }, 500);
    });
}
async function channel_test10() {
    await _channel_test10(true);
}
async function channel_test11() {
    assert(globalState.channelHandle, "global channelHandle is null");
    const channelEndpoint = new ChannelEndpoint(sb_config, globalState.channelHandle.key, globalState.channelHandle.channelId);
    await channelEndpoint.ready;
    globalState.channelEndpoint = channelEndpoint;
    assert(globalState.channelEndpoint, "... somehow globalState channelEndpoint is still null?");
    logTest("global channel (api) is ready");
    console.log(globalState.channelEndpoint);
}
async function channel_test12() {
    const storageLimit = await globalState.channelEndpoint.getStorageLimit();
    logTest(`storage limit is ${storageLimit.storageLimit}`);
    console.log(`storage limit is:`);
    console.log(storageLimit);
}
async function channel_test13() {
    const newChannel = await globalState.channelEndpoint.budd();
    logTest(`new channel is ${newChannel.channelId}`);
    console.log('swapping global channel handle to new channel');
    globalState.channelHandle = newChannel;
    globalState.channelEndpoint = null;
    globalState.channel_test13 = true;
}
async function channel_test14() {
    const channelEndpoint = new ChannelEndpoint(sb_config, globalState.channelHandle.key, globalState.channelHandle.channelId);
    globalState.channelEndpoint = channelEndpoint;
    let { storageLimit } = await globalState.channelEndpoint.getStorageLimit();
    logTest(`mother budget is ${storageLimit}`);
    assert(storageLimit > 0, "mother budget is zero?");
    const newChannel = await globalState.channelEndpoint.budd({ storage: 64 * 1024 * 1024 });
    logTest(`new channel is ${newChannel.channelId}`);
    let newChannelApi = new ChannelEndpoint(sb_config, newChannel.key, newChannel.channelId);
    globalState.secondEndpoint = newChannelApi;
    const { motherChannel } = await newChannelApi.getMother();
    logTest(`new channel is tracking mother ${motherChannel}`);
    ({ storageLimit } = await newChannelApi.getStorageLimit());
    logTest(`new channel budget is ${storageLimit}`);
    globalState.channel_test14 = true;
}
async function channel_test15() {
    const testAmount = 64 * 1024 * 1024;
    logTest(`RUNNING TEST 15: move ${testAmount / (1024 * 1024)} MiB to new budded channel`);
    let { storageLimit } = await globalState.channelEndpoint.getStorageLimit();
    logTest(`mother budget is ${storageLimit}`);
    ({ storageLimit } = await globalState.secondEndpoint.getStorageLimit());
    logTest(`child budget is ${storageLimit}`);
    const childBudget1 = storageLimit;
    await globalState.channelEndpoint.budd({ storage: 64 * 1024 * 1024, targetChannel: globalState.secondEndpoint.channelId });
    ({ storageLimit } = await globalState.channelEndpoint.getStorageLimit());
    logTest(`after transfer, mother budget is ${storageLimit}`);
    ({ storageLimit } = await globalState.channelEndpoint.getStorageLimit());
    logTest(`after transfer, child budget is ${storageLimit}`);
    const childBudget2 = storageLimit;
    if (childBudget2 - childBudget1 != testAmount) {
        let errMsg = `ERROR: child budget did not increase by ${testAmount} (it increased by ${childBudget2 - childBudget1})`;
        logTest(errMsg);
        return errMsg;
    }
    else {
        logTest(`++++ test 15 SUCCESS: child budget increased by ${testAmount}`);
        return '';
    }
}
async function channel_test16() {
    console.log("We will use visitor keys:");
    console.log(await globalState.visitorKeys);
    await _channel_test10(false);
}
async function channel_test17() {
    await globalState.channelSocket.lock();
}
async function channel_test18() {
    const lockStatus = await globalState.channelSocket.isLocked();
    console.log(`channel is locked: ${lockStatus}`);
}
async function channel_test19() {
    assert(globalState.channelEndpoint, "global channelEndpoint is null");
    const allData = await globalState.channelEndpoint.downloadData();
    logTest("++++ Channel 'downloadData' results ('all data') in console");
    console.log(allData);
}
async function channel_test20() {
    assert(globalState.channelEndpoint, "global channelEndpoint is null");
    const allData = await globalState.channelEndpoint.getOldMessages();
    logTest("++++ Channel 'getOldMessages' results ('all data') in console");
    console.log(allData);
}
function installTestButton(name, id, func) {
    const button = document.createElement('button');
    if (id)
        button.innerText = `CHANNEL (T${id}) :\n` + name;
    else
        button.innerText = name;
    button.onclick = func;
    button.style.margin = "2px 2px";
    const testButtons = document.getElementById('channelTestButtons');
    if (testButtons)
        testButtons.appendChild(button);
    else
        console.log('testButtons not found');
}
const depMap = new Map([
    ['channelHandle', 9],
    ['channelEndpoint', 11],
    ['channel_test13', 13],
    ['channel_test14', 14],
]);
const arrayOfTests = [
    { id: 9, name: 'create a channel', func: channel_test09, dependency: null },
    { id: 10, name: 'connect to socket\nas OWNER', func: channel_test10, dependency: 'channelHandle' },
    { id: 11, name: 'test channel api (without socket)', func: channel_test11, dependency: 'channelHandle' },
    { id: 12, name: 'get api endpoint and some\nbasic capacity (budding) channel_tests', func: channel_test12, dependency: 'channelEndpoint' },
    { id: 13, name: '"budd" a new channel', func: channel_test13, dependency: 'channelEndpoint' },
    { id: 14, name: 'create a small\nbudded channel', func: channel_test14, dependency: 'channel_test13' },
    { id: 15, name: 'move 64MB to new\nbudded channel', func: channel_test15, dependency: 'channel_test14' },
    { id: 16, name: 'connect to socket\nas VISITOR', func: channel_test16, dependency: 'channelHandle' },
    { id: 17, name: 'lock channel', func: channel_test17, dependency: 'channelSocket' },
    { id: 18, name: 'check lock status', func: channel_test18, dependency: 'channelSocket' },
    { id: 19, name: 'download data', func: channel_test19, dependency: 'channelEndpoint' },
    { id: 20, name: 'old messages', func: channel_test20, dependency: 'channelEndpoint' },
    { id: 21, name: 'create channel from known JWK', func: channel_test21, dependency: null },
];
async function runTest(id) {
    const test = arrayOfTests.find((t) => t.id === id);
    if (!test)
        throw new Error(`ERROR: test ${id} not found`);
    console.log(`starting test ${id}: ${test.name}`);
    const dependencyMet = globalState[test.dependency] !== null;
    if (!dependencyMet) {
        const depFunc = depMap.get(test.dependency);
        console.log(`... but first running test ${depFunc} (dependency '${test.dependency}' not met)`);
        if (depFunc) {
            const r = await runTest(depFunc);
            assert(r, `runTest(${id}): failing because dependency function ([${depFunc}]) failed.`);
            assert(test.dependency, `... dependency for test ${id} not met after running dependency function (?)`);
        }
        else {
            throw new Error(`ERROR: test ${id} has no dependency function, but dependency '${test.dependency}' not met (?)`);
        }
    }
    logTest(`==== running test ${id}: ${test.name} ====`);
    const r = await test
        .func()
        .catch((e) => {
        logTest(`******  ERROR: test ${id} failed (${e})  ******`);
        console.warn(e);
        return false;
    });
    if ((r) && r.includes('ERROR')) {
        logTest(`******  ERROR: test ${id} failed: ${r}  ******`);
        return false;
    }
    else {
        logTest(`++++ test ${id} passed ++++`);
        return true;
    }
}
for (const test of arrayOfTests) {
    installTestButton(test.name, test.id, () => runTest(test.id));
}
async function testAll() {
    for (const test of arrayOfTests)
        await runTest(test.id);
}
installTestButton('RUN ALL\nCHANNEL TESTS', 0, testAll);
if (autoRun) {
    testAll();
}
//# sourceMappingURL=test_channels.js.map