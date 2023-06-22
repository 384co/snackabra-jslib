import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js';
import { assert } from './test_utils.js';
import { Snackabra, SBMessage, ChannelEndpoint, SB384 } from './snackabra.js';
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
console.log("\n\n-- test_channels loaded --\n\n");
logTest("#### creating SB for use in channel tests (see console) ####");
const globalSB = new Snackabra(sb_config, jslibVerbose);
console.log(globalSB);
const globalState = {
    channelHandle: null,
    visitorHandle: null,
    channelEndpoint: null,
    secondEndpoint: null,
    channelSocket: null,
    visitorSocket: null,
    visitorKeys: (new SB384()).ready.then((x) => x.exportable_privateKey),
    test14: false,
    noDependency: true,
};
console.log("#### you can track all 'window.globalState' variables in the console: ####");
window.globalState = globalState;
console.log(globalState);
async function _test09() {
    console.log("... creating channels using these servers:");
    console.log(sb_config);
    const newChannel = await globalSB.create(sb_config, serverPassword);
    logTest("... a new channel created:");
    console.log(newChannel);
    return newChannel;
}
async function test09() {
    globalState.channelHandle = await _test09();
    console.log('... global channel handle is:');
    console.log(globalState.channelHandle);
}
function ownerMessageHandler(m) {
    console.log('++++ test 10 OWNER got message (on globalState.channelhandle):');
    console.log(m);
}
function visitorMessageHandler(m) {
    console.log('++++ test 10 VISITOR got message (on globalState.channelhandle):');
    console.log(m);
}
async function _test10(owner) {
    const userName = owner ? "TestBot OWNER" : "TestBot VISITOR";
    const buttonName = owner ? "anotherOwnerMessage" : "anotherVisitorMessage";
    return new Promise(async (resolve, reject) => {
        assert(globalState.channelHandle, "global channelHandle is null");
        let c = owner
            ? await globalSB.connect(ownerMessageHandler, globalState.channelHandle.key, globalState.channelHandle.channelId)
            : await globalSB.connect(visitorMessageHandler, await globalState.visitorKeys, globalState.channelHandle.channelId);
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
            let sbm = new SBMessage(c, `---- test10 message number ${messageCount} from ${userName} ----}`);
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
async function test10() {
    await _test10(true);
}
async function test11() {
    const channelEndpoint = new ChannelEndpoint(sb_config, globalState.channelHandle.key, globalState.channelHandle.channelId);
    await channelEndpoint.ready;
    globalState.channelEndpoint = channelEndpoint;
    logTest("global channel (api) is ready");
    console.log(globalState.channelEndpoint);
}
async function test12() {
    const storageLimit = await globalState.channelEndpoint.getStorageLimit();
    logTest(`storage limit is ${storageLimit.storageLimit}`);
    console.log(`storage limit is:`);
    console.log(storageLimit);
}
async function test13() {
    const newChannel = await globalState.channelEndpoint.budd();
    logTest(`new channel is ${newChannel.channelId}`);
    console.log('swapping global channel handle to new channel');
    globalState.channelHandle = newChannel;
    globalState.channelEndpoint = null;
}
async function test14() {
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
    globalState.test14 = true;
}
async function test15() {
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
async function test16() {
    console.log("We will use visitor keys:");
    console.log(await globalState.visitorKeys);
    await _test10(false);
}
async function test17() {
    await globalState.channelSocket.lock();
}
async function test18() {
    const lockStatus = await globalState.channelSocket.isLocked();
    console.log(`channel is locked: ${lockStatus}`);
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
const arrayOfTests = [
    { id: 9, name: 'create a channel', func: test09, dependency: 'noDependency', depFunc: null },
    { id: 10, name: 'connect to socket\nas OWNER', func: test10, dependency: 'channelHandle', depFunc: 9 },
    { id: 11, name: 'test channel api (without socket)', func: test11, dependency: 'channelHandle', depFunc: 9 },
    { id: 12, name: 'get api endpoint and some\nbasic capacity (budding) tests', func: test12, dependency: 'channelEndpoint', depFunc: 11 },
    { id: 13, name: '"budd" a new channel', func: test13, dependency: 'channelEndpoint', depFunc: 11 },
    { id: 14, name: 'create a small\nbudded channel', func: test14, dependency: 'channelHandle', depFunc: 13 },
    { id: 15, name: 'move 64MB to new\nbudded channel', func: test15, dependency: 'test14', depFunc: 14 },
    { id: 16, name: 'connect to socket\nas VISITOR', func: test16, dependency: 'channelHandle', depFunc: 9 },
    { id: 17, name: 'lock channel', func: test17, dependency: 'channelSocket', depFunc: 10 },
    { id: 18, name: 'check lock status', func: test18, dependency: 'channelSocket', depFunc: 10 },
];
async function runTest(id) {
    const test = arrayOfTests.find((t) => t.id === id);
    if (!test)
        throw new Error(`ERROR: test ${id} not found`);
    console.log(`starting test ${id}: ${test.name}`);
    const dependencyMet = globalState[test.dependency] !== null;
    if (!dependencyMet) {
        console.log(`... but first running test ${test.depFunc} (dependency '${test.dependency}' not met)`);
        if (test.depFunc) {
            await runTest(test.depFunc);
            assert(test.dependency, `... dependency for test ${id} not met after running dependency function`);
        }
        else {
            throw new Error(`ERROR: test ${id} has no dependency function, but dependency '${test.dependency}' not met (?)`);
        }
    }
    logTest(`==== running test ${id}: ${test.name} ====`);
    test.func()
        .then((r) => {
        if ((r) && r.includes('ERROR')) {
            logTest(`******  ERROR: test ${id} failed: ${r}  ******`);
        }
        else {
            logTest(`++++ test ${id} passed ++++`);
        }
    })
        .catch((e) => {
        logTest(`******  ERROR: test ${id} failed (${e})  ******`);
        console.warn(e);
        return;
    });
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