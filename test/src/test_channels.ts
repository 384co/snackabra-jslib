import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js'
import { assert } from './test_utils.js'
import { Snackabra, ChannelMessage, SBMessage, SBChannelHandle, ChannelSocket, ChannelEndpoint, ChannelApi } from '../dist/snackabra.js'

// enable this to add (console.log) detailed trace output on ALL channels
const TRACE_CHANNELS = jslibVerbose

function logTest(msg: string) {
    const z = getElement('channel_tests')
    z.innerHTML += msg + "<br/><br/>"
    console.log('==== LogTest: ' + msg)
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

const globalSB = new Snackabra(sb_config, jslibVerbose)
logTest("SB for channel tests created")
console.log("SB server (for channel tests) created:")
console.log(globalSB)

let globalChannelHandle: SBChannelHandle;
let globalChannelAPI: ChannelApi | undefined;

let secondaryGlobalChannelAPI: ChannelApi | undefined;
let globalChannelSocket: ChannelSocket | undefined;

// let globalChannelEndpoint: ChannelEndpoint;

// create channel
async function test09() {
    logTest("RUNNING TEST 09: create channel")
    try {
        const sbServer = sb_config
        console.log("Using these servers:")
        console.log(sbServer)
        globalChannelHandle = await globalSB.create(sbServer, serverPassword)
        logTest("New channel created")
        console.log(globalChannelHandle)
    } catch (e) {
        logTest("ERROR: test09 failed")
        console.log(e)
    }
}

// connect to socket
async function test10() {
    if (!globalChannelHandle) await test09()
    assert(globalChannelHandle, "globalChannelHandle is null (after test09)")

    logTest("RUNNING TEST 10: connect to socket")
    let c = await globalSB.connect(
        // must have a message handler:
        (m: ChannelMessage) => { console.log('got message:'); console.log(m); },
        globalChannelHandle.key, // if we omit then we're connecting anonymously (and not as owner)
        globalChannelHandle.channelId // since we're owner this is optional
    )
    c.enableTrace = TRACE_CHANNELS
    c.userName = "TestBot"; // optional
    // say hello to everybody! upon success it will return "success"
    (new SBMessage(c, "Hello from TestBot!")).send()
        .then((c) => { console.log(`test message sent! (${c})`) })
    // there's a button to send more messages manually
    let messageCount = 0
    getElement('anotherMessage').onclick = (async () => {
        messageCount++
        let sbm = new SBMessage(c, `message number ${messageCount} from test10!`)
        logTest(`==== sending message number ${messageCount} (on console)`)
        console.log(`==== sending message number ${messageCount}:`)
        console.log(sbm)
        await c.send(sbm)
            .then((c) => console.log(`back from sending message ${messageCount} (${c})`))
    })
    // we're done, store globally
    globalChannelSocket = c
    logTest("global channel (socket) is ready")
    console.log(globalChannelSocket)
}

async function test11() {
    if (!globalChannelHandle) await test09()
    assert(globalChannelHandle, "globalChannelHandle is null (after test09)")

    logTest("RUNNING TEST 11: test channel api (without socket)")

    const channelEndpoint = new ChannelEndpoint(sb_config, globalChannelHandle.key, globalChannelHandle.channelId)
    await channelEndpoint.ready

    logTest("channel (endpoint) is ready")
    console.log(channelEndpoint)

    globalChannelAPI = new ChannelApi(channelEndpoint)
    logTest("global channel (api) is ready")
    console.log(globalChannelAPI)
}

async function test12() {
    if (!globalChannelAPI) {
        logTest("No channel api - will run test11 automatically")
        await test11()
    }
    logTest("RUNNING TEST 12: get api endpoint and some basic capacity (budding) tests")
    assert(globalChannelAPI, "globalChannelAPI is null")
    const storageLimit = await globalChannelAPI!.getStorageLimit()
    logTest(`storage limit is ${storageLimit}`)
    console.log(`storage limit is:`)
    console.log(storageLimit)
}

// create a new channel, strip current one
async function test13() {
    if (!globalChannelAPI) await test11()
    assert(globalChannelAPI, "globalChannelAPI is null")
    logTest("RUNNING TEST 13: 'budd' a new channel (take full budget)")
    assert(globalChannelAPI, "globalChannelAPI is null")
    const newChannel = await globalChannelAPI!.budd()
    logTest(`new channel is ${newChannel.channelId}`)
    console.log('swapping global channel handle to new channel')
    globalChannelHandle = newChannel
    globalChannelAPI = undefined
}

// given a channel handle, create a new channel with a 64MB budget
async function test14() {
    if (!globalChannelHandle) await test09() // test09 will create a fresh channel handle

    logTest("RUNNING TEST 14: create a small budded channel")

    // this is a new class, for operating against a channel without having
    // to set up a socket, message handlers, etc.
    const channelEndpoint = new ChannelEndpoint(sb_config, globalChannelHandle.key, globalChannelHandle.channelId)

    // given a channel endpoint, we can do various things, such as get
    // simple access to the underlying channel's API
    globalChannelAPI = new ChannelApi(channelEndpoint)

    // the above operations are instant, so we can use the api right away
    // obviously all api calls are promises
    let { storageLimit } = await globalChannelAPI.getStorageLimit()
    logTest(`mother budget is ${storageLimit}`)
    assert(storageLimit > 0, "mother budget is zero?")

    // let's create a new channel with a 64MB budget
    const newChannel = await globalChannelAPI.budd({ storage: 64 * 1024 * 1024 })
    // this will take the budget from whatever channel is behind globalChannelAPI
    logTest(`new channel is ${newChannel.channelId}`)

    // and let's get a different API handle to that new guy
    const newChannelApi = new ChannelApi(new ChannelEndpoint(sb_config, newChannel.key, newChannel.channelId))
    secondaryGlobalChannelAPI = newChannelApi

    // let's confirm that it's tracking Mother
    const { motherChannel } = await newChannelApi.getMother()
    logTest(`new channel is tracking mother ${motherChannel}`);

    // and we confirm that it has the budget we gave it
    ({ storageLimit } = await newChannelApi.getStorageLimit())
    logTest(`new channel budget is ${storageLimit}`)

    // // and now we want to move another 64 MB from mother to the new channel
    // // we use mother's api, since that's where the verification (ownership) is needed
    // globalChannelAPI.budd({ storage: 64 * 1024 * 1024, targetChannel: newChannel.channelId });

    // // and we confirm that it has the budget we gave it
    // ({ storageLimit } = await newChannelApi.getStorageLimit())
    // logTest(`new channel budget after a 'bump' is ${storageLimit}`)
}

async function test15() {
    if (!secondaryGlobalChannelAPI) await test14()

    const testAmount = 64 * 1024 * 1024
    logTest(`RUNNING TEST 15: move ${testAmount / (1024 * 1024)} MiB to new budded channel`)

    let { storageLimit } = await globalChannelAPI!.getStorageLimit()
    logTest(`mother budget is ${storageLimit}`);
    ({ storageLimit } = await secondaryGlobalChannelAPI!.getStorageLimit());
    logTest(`child budget is ${storageLimit}`)
    const childBudget1 = storageLimit

    await globalChannelAPI!.budd({ storage: 64 * 1024 * 1024, targetChannel: secondaryGlobalChannelAPI!.channelId });

    ({ storageLimit } = await globalChannelAPI!.getStorageLimit());
    logTest(`after transfer, mother budget is ${storageLimit}`);
    ({ storageLimit } = await secondaryGlobalChannelAPI!.getStorageLimit());
    logTest(`after transfer, child budget is ${storageLimit}`)
    const childBudget2 = storageLimit

    if (childBudget2 - childBudget1 != testAmount)
        logTest(`ERROR: child budget did not increase by ${testAmount} (it increased by ${childBudget2 - childBudget1})`)
    else
        logTest(`SUCCESS: child budget increased by ${testAmount}`)

}


function installTestButton(name: string, func: () => void) {
    const button = document.createElement('button')
    button.innerText = 'CHANNEL:\n' + name
    button.onclick = func
    document.body.appendChild(button)

    const testButtons = document.getElementById('testButtons')
    const testDiv = document.createElement('div')
    testDiv.id = name
    testDiv.appendChild(button)
    if (testButtons) testButtons.appendChild(testDiv)
    else console.log('testButtons not found')

}

installTestButton('create a channel', test09)
installTestButton('connect to socket', test10)
installTestButton('test channel api (without socket)', test11)
installTestButton('get api endpoint and some basic capacity (budding) tests', test12)
installTestButton('"budd" a new channel', test13)
installTestButton('create a small budded channel', test14)
installTestButton('move 64MB to new budded channel', test15)

async function testAll() {
    await test09()
    await test10()
    await test11()
    await test12()
    await test13()
    await test14()
    await test15()
}

installTestButton('ALL CHANNEL TESTS', testAll)

if (autoRun) {
    // console.log('autoRun is set, running tests')
    testAll()
}

