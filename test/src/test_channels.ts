// (c) 2023 384 (tm)

import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js'
import { assert } from './test_utils.js'
import { Snackabra, ChannelMessage, SBMessage, SBChannelHandle, ChannelEndpoint, ChannelSocket } from '../../src/snackabra.js'
// import { SB } from './snackabra'

// enable this to add (console.log) detailed trace output on ALL channels
const TRACE_CHANNELS = jslibVerbose

function logTest(msg: string) {
    const z = getElement('channel_tests')
    z.innerHTML += msg + "<br/><br/>"
    if (msg.includes('ERROR')) {
        console.warn('test_channels: ' + msg)
    } else {
        console.log('test_channels: ' + msg)
    }
}

// guarantees that it's not null
function getElement(s: string): HTMLElement {
    const z: HTMLElement | null = document.getElementById(s)
    if (z == null) {
        assert(false, `failed to find DOM element '${s}'`)
        return {} as HTMLElement
    } else {
        return z
    }
}

console.log("\n\n-- test_channels loaded --\n\n")
logTest("==== creating SB for use in channel tests (see console) ====")
const globalSB = new Snackabra(sb_config, jslibVerbose)
console.log(globalSB)


type GlobalState = {
    channelHandle: SBChannelHandle | null,
    channelEndpoint: ChannelEndpoint | null,
    secondEndpoint: ChannelEndpoint | null,
    channelSocket: ChannelSocket | null,
    test14: boolean,
    noDepency: true,
    // other global dependencies
};

const globalState: GlobalState = {
    channelHandle: null,
    channelEndpoint: null,
    secondEndpoint: null,
    channelSocket: null,
    test14: false,
    noDepency: true,
    // other global dependencies initialized to null or default value
};

// create channel
async function test09() {
    const sbServer = sb_config
    console.log("Using these servers:")
    console.log(sbServer)
    globalState.channelHandle = await globalSB.create(sbServer, serverPassword)
    logTest("New channel created")
    console.log(globalState.channelHandle)
}

// connect to socket
async function test10() {
    // we return a promise, test isn't done until message being sent is confirmed
    return new Promise(async (resolve, reject) => {
        assert(globalState.channelHandle, "global channelHandle is null")
        let c = await globalSB.connect(
            // must have a message handler:
            (m: ChannelMessage) => { console.log('got message:'); console.log(m); },
            globalState.channelHandle!.key, // if we omit then we're connecting anonymously (and not as owner)
            globalState.channelHandle!.channelId // since we're owner this is optional
        )
        c.enableTrace = TRACE_CHANNELS
        c.userName = "TestBot"; // optional
        // we're done, store globally
        globalState.channelSocket = c
        logTest("global channel (socket) is ready, and we are about to send a message; socket:")
        console.log(globalState.channelSocket)

        // we add a button for interactive messages
        let messageCount = 0
        getElement('anotherMessage').onclick = (async () => {
            messageCount++
            let additionalMessageSent = false
            let sbm = new SBMessage(c, `message number ${messageCount} from test10!`)
            logTest(`==== sending message number ${messageCount} (on console)`)
            console.log(sbm)
            c.send(sbm)
                .then((c) => {
                    logTest(`... back from sending message ${messageCount} (${c})`)
                    additionalMessageSent = true
                })
            setTimeout(() => {
                if (!additionalMessageSent) {
                    logTest(`ERROR: message ${messageCount} was not sent`)
                } else {
                    logTest(`SUCCESS: message ${messageCount} was sent`)
                }
            }, 500)
        })

        // say hello to everybody! upon success it will return "success"
        let firstMessageWasSent = false
        ; (new SBMessage(c, "Hello from TestBot!")).send()
            .then((c) => {
                console.log(`test message sent! (${c})`)
                firstMessageWasSent = true
                resolve("first message was directly sent")
            })

        // now we wait for the message to come back, and based on timer, throw an error if it doesn't
        setTimeout(() => {
            if (!firstMessageWasSent) {
                logTest("ERROR: first message was not sent")
                reject("message was not sent")
            } else {
                logTest("SUCCESS: first message was eventually sent")
            }
        }, 500)
    })
}

// test channel api (without socket)
async function test11() {
    const channelEndpoint = new ChannelEndpoint(sb_config, globalState.channelHandle!.key, globalState.channelHandle!.channelId)
    await channelEndpoint.ready
    globalState.channelEndpoint = channelEndpoint
    logTest("global channel (api) is ready")
    console.log(globalState.channelEndpoint)
}

async function test12() {
    const storageLimit = await globalState.channelEndpoint!.getStorageLimit()
    logTest(`storage limit is ${storageLimit}`)
    console.log(`storage limit is:`)
    console.log(storageLimit)
}

// create a new channel, strip current one
async function test13() {
    const newChannel = await globalState.channelEndpoint !.budd()
    logTest(`new channel is ${newChannel.channelId}`)
    console.log('swapping global channel handle to new channel')
    globalState.channelHandle = newChannel
    globalState.channelEndpoint = null
}


// given a channel handle, create a new channel with a 64MB budget
async function test14() {
    // this is a new class, for operating against a channel without having
    // to set up a socket, message handlers, etc.
    const channelEndpoint = new ChannelEndpoint(sb_config, globalState.channelHandle!.key, globalState.channelHandle!.channelId)

    // given a channel endpoint, we can do various things, such as get
    // simple access to the underlying channel's API
    globalState.channelEndpoint = channelEndpoint

    // the above operations are instant, so we can use the api right away
    // obviously all api calls are promises
    let { storageLimit } = await globalState.channelEndpoint.getStorageLimit()
    logTest(`mother budget is ${storageLimit}`)
    assert(storageLimit > 0, "mother budget is zero?")

    // let's create a new channel with a 64MB budget
    const newChannel = await globalState.channelEndpoint.budd({ storage: 64 * 1024 * 1024 })
    // this will take the budget from whatever channel is behind globalChannelAPI
    logTest(`new channel is ${newChannel.channelId}`)

    // and let's get a different API handle to that new guy
    let newChannelApi = new ChannelEndpoint(sb_config, newChannel.key, newChannel.channelId)
    globalState.secondEndpoint = newChannelApi

    // let's confirm that it's tracking Mother
    const { motherChannel } = await newChannelApi.getMother()
    logTest(`new channel is tracking mother ${motherChannel}`);

    // and we confirm that it has the budget we gave it
    ({ storageLimit } = await newChannelApi.getStorageLimit())
    logTest(`new channel budget is ${storageLimit}`)

    globalState.test14 = true

    // // and now we want to move another 64 MB from mother to the new channel
    // // we use mother's api, since that's where the verification (ownership) is needed
    // globalChannelAPI.budd({ storage: 64 * 1024 * 1024, targetChannel: newChannel.channelId });

    // // and we confirm that it has the budget we gave it
    // ({ storageLimit } = await newChannelApi.getStorageLimit())
    // logTest(`new channel budget after a 'bump' is ${storageLimit}`)
}

async function test15() {
    const testAmount = 64 * 1024 * 1024
    logTest(`RUNNING TEST 15: move ${testAmount / (1024 * 1024)} MiB to new budded channel`)

    let { storageLimit } = await globalState.channelEndpoint!.getStorageLimit()
    logTest(`mother budget is ${storageLimit}`);
    ({ storageLimit } = await globalState.secondEndpoint!.getStorageLimit());
    logTest(`child budget is ${storageLimit}`)
    const childBudget1 = storageLimit

    await globalState.channelEndpoint!.budd({ storage: 64 * 1024 * 1024, targetChannel: globalState.secondEndpoint!.channelId });

    ({ storageLimit } = await globalState.channelEndpoint!.getStorageLimit());
    logTest(`after transfer, mother budget is ${storageLimit}`);
    ({ storageLimit } = await globalState.channelEndpoint!.getStorageLimit());
    logTest(`after transfer, child budget is ${storageLimit}`)
    const childBudget2 = storageLimit

    if (childBudget2 - childBudget1 != testAmount) {
        let errMsg = `ERROR: child budget did not increase by ${testAmount} (it increased by ${childBudget2 - childBudget1})`
        logTest(errMsg)
        return errMsg
    } else {
        logTest(`SUCCESS: child budget increased by ${testAmount}`)
        return ''
    }
}

// async function test16() {

// }

function installTestButton(name: string, id: number, func: () => void) {
    const button = document.createElement('button')
    if (id)
        button.innerText = `CHANNEL (T${id}) :\n` + name
    else
        button.innerText = name
    button.onclick = func
    button.style.margin = "2px 2px"; // This will add 5px margin to left and right side of each button.

    const testButtons = document.getElementById('channelTestButtons')
    if (testButtons) testButtons.appendChild(button)
    else console.log('testButtons not found')
}

const arrayOfTests = [
    { id: 9, name: 'create a channel', func: test09, dependency: 'noDependency', depFunc: null },
    { id: 10, name: 'connect to socket', func: test10, dependency: 'channelHandle', depFunc: 9 },
    { id: 11, name: 'test channel api (without socket)', func: test11, dependency: 'channelHandle', depFunc: 9 },
    { id: 12, name: 'get api endpoint and some\nbasic capacity (budding) tests', func: test12, dependency: 'channelEndpoint', depFunc: 11 },
    { id: 13, name: '"budd" a new channel', func: test13, dependency: 'channelEndpoint', depFunc: 11 },
    { id: 14, name: 'create a small\nbudded channel', func: test14, dependency: 'channelHandle', depFunc: 13 },
    { id: 15, name: 'move 64MB to new\nbudded channel', func: test15, dependency: 'test14', depFunc: 14 },
];

async function runTest(id: number) {
    const test = arrayOfTests.find((t) => t.id === id);
    if (!test)
        throw new Error(`ERROR: test ${id} not found`);
    console.log(`starting test ${id}: ${test.name}`)
    const dependencyMet = globalState[test.dependency as keyof typeof globalState] !== null;
    if (!dependencyMet) {
        console.log(`... but first running test ${test.depFunc} (dependency '${test.dependency}' not met)`);
        if (test.depFunc) {
            await runTest(test.depFunc)
            assert(test.dependency, `... dependency for test ${id} not met after running dependency function`)
        } else {
            throw new Error(`ERROR: test ${id} has no dependency function, but dependency '${test.dependency}' not met (?)`)
        }
    }
    // should have what we need now
    logTest(`==== running test ${id}: ${test.name} ====`);
    test.func()
        .then((r) => {
            if ((r) && (r as string).includes('ERROR')) {
                logTest(`******  ERROR: test ${id} failed: ${r}  ******`)
            } else {
                logTest(`++++ test ${id} passed ++++`)
            }
        })
        .catch((e) => {
            logTest(`******  ERROR: test ${id} failed (${e})  ******`)
            console.warn(e)
            return
        })
}

// install buttons for all tests
for (const test of arrayOfTests) {
    installTestButton(test.name, test.id, () => runTest(test.id))
}

// run all tests
async function testAll() {
    for (const test of arrayOfTests)
        await runTest(test.id)
}

installTestButton('RUN ALL\nCHANNEL TESTS', 0, testAll)

if (autoRun) {
    // console.log('autoRun is set, running tests')
    testAll()
}

