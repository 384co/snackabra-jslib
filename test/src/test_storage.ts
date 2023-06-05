// (c) 2023 384 (tm)

import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js'
import { Snackabra, Interfaces, getRandomValues, compareBuffers } from '../../src/snackabra.js'

function test05a() {
    _test05(false)
}

function test05b() {
    _test05(true)
}

function _test05_landShard(SB: Snackabra, handleSet: Array<Interfaces.SBObjectHandle>, blockSet: Array<Uint8Array>, t0: number) {
    return new Promise<void>((resolve, _reject) => {
        console.log(`[${Date.now() - t0}] now let's try reading the land shards:`)
        let t2 = Date.now()
        let fetchPromiseSet3: Array<Promise<ArrayBuffer>> = []
        let blockCount = handleSet.length
        for (let i = 0; i < blockCount; i++) {
            handleSet[i].shardServer = 'https://shard.3.8.4.land'
            fetchPromiseSet3.push(SB.storage.fetchData(handleSet[i]))
        }
        console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`)
        Promise.all(fetchPromiseSet3).then((returnedBlockSet3) => {
            console.log(`[${Date.now() - t0}] they should all be back (delta time ${Date.now() - t2}), let's check contents:`)
            for (let i = 0; i < blockCount; i++) if (!compareBuffers(blockSet[i], returnedBlockSet3[i])) console.error(`ugh - buffer ${i} did not come back the same`)
            console.log(`[${Date.now() - t0}] if there were no errors, everything worked again!`);
            resolve()
        })
    })
}

// test performance of 4KB blocks
function _test05(testLandShard: boolean) {
    try {
        const blockCount: number = 8
        const sbServer = sb_config
        console.log(`testing storing ${blockCount}x64KB blocks against servers:`)
        console.log(sbServer)
        const SB = new Snackabra(sb_config, jslibVerbose)
        // we need a channel name since that's our source of storage 'budget'
        SB.create(sbServer, serverPassword).then((c) => {
            let t0 = Date.now()
            console.log('starting timer. SB object ready.')
            // now we generate a bunch of random 4KB blocks
            let blockSet: Array<Uint8Array> = []
            // this in fact equates to 64KB writes in current design ... don't worry about that for now
            for (let i = 0; i < blockCount; i++) blockSet.push(getRandomValues(new Uint8Array(63 * 1024)))
            console.log(`[${Date.now() - t0}] random blocks generated, start writing them to storage:`)
            let handlePromiseSet: Array<Promise<Interfaces.SBObjectHandle>> = []
            for (let i = 0; i < blockCount; i++) handlePromiseSet.push(SB.storage.storeObject(blockSet[i], 'p', c.channelId))
            console.log(`[${Date.now() - t0}] everything has been fired off:`)
            console.log(handlePromiseSet)
            console.log(`[${Date.now() - t0}] now we send them to be stored:`)
            Promise.all(handlePromiseSet).then((handleSet) => {
                console.log(`[${Date.now() - t0}] we got all handles (they're all allocated)`)
                console.log(handleSet)
                console.log(`[${Date.now() - t0}] we'll now 'peek' into the process and first wait for all verifications:`)
                let verificationPromiseSet: Array<Promise<string>> = []
                // @ts-ignore
                handleSet.forEach(s => verificationPromiseSet.push(Object.assign({}, s.verification)))
                console.log(verificationPromiseSet)
                Promise.all(verificationPromiseSet).then((verificationSet) => {
                    console.log(`[${Date.now() - t0}] we got all of them so they've all been written:`)
                    console.log(verificationSet)
                    let fetchPromiseSet: Array<Promise<ArrayBuffer>> = []
                    for (let i = 0; i < blockCount; i++) fetchPromiseSet.push(SB.storage.fetchData(handleSet[i]))
                    console.log(`[${Date.now() - t0}] that's started, we got the promises up and running:`)
                    console.log(fetchPromiseSet)
                    console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`)
                    Promise.all(fetchPromiseSet).then((returnedBlockSet) => {
                        console.log(`[${Date.now() - t0}] they should all be back, let's check contents:`)
                        for (let i = 0; i < blockCount; i++) {
                            if (!compareBuffers(blockSet[i], returnedBlockSet[i])) {
                                console.error(`ugh - buffer ${i} did not come back the same (sent, returned):`)
                                console.log(blockSet[i])
                                console.log(returnedBlockSet[i])
                            }
                        }
                        console.log(`[${Date.now() - t0}] if there were no errors, everything worked!`)
                        console.log(`[${Date.now() - t0}] now let's try reading everything a SECOND time:`)
                        let t1 = Date.now()
                        let fetchPromiseSet2: Array<Promise<ArrayBuffer>> = []
                        for (let i = 0; i < blockCount; i++) fetchPromiseSet2.push(SB.storage.fetchData(handleSet[i]))
                        console.log(`[${Date.now() - t0}] that's started, we got the promises up and running:`)
                        console.log(fetchPromiseSet2)
                        console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`)
                        Promise.all(fetchPromiseSet2).then((returnedBlockSet2) => {
                            console.log(`[${Date.now() - t0}] they should all be back (delta time ${Date.now() - t1}), let's check contents:`)
                            for (let i = 0; i < blockCount; i++) if (!compareBuffers(blockSet[i], returnedBlockSet2[i])) console.error(`ugh - buffer ${i} did not come back the same`)
                            console.log(`[${Date.now() - t0}] if there were no errors, everything worked again!`)
                            if (testLandShard) {
                                console.log(`[${Date.now() - t0}] calling land shards FIRST time:`)
                                _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                    console.log(`[${Date.now() - t0}] calling land shards SECOND time:`)
                                    _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                        console.log(`[${Date.now() - t0}] calling land shards THIRD time:`)
                                        _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                            console.log(`[${Date.now() - t0}] COMPLETELY DONE`)
                                        })
                                    })
                                })
                            }
                        })
                    })
                })
            })
        })
    } catch (e) {
        console.trace('test05 failed')
    }
}

// TODO: create a set of public shards to test against
// // tries simply reading all entries in the shards.js file
// import { shardFiles } from './2023.04.03.shards.js'
// function test06() {
//     const SB = new Snackabra(sb_config, jslibVerbose)
//     for (const [fileName, shard] of Object.entries(shardFiles)) {
//         SB.storage.fetchData(shard).then((data) => {
//             console.log("Fetched shard (file): "); console.log(fileName); console.log(shard);
//             console.log(data.slice(0, 200));
//         })
//     }
// }

// test fetching the first 8 video shards
import { videoShards } from './video_shards.js'
function test07() {
    let i = 0
    const SB = new Snackabra(sb_config, jslibVerbose)
    for (const [fileName, shard] of Object.entries(videoShards)) {
        i++
        SB.storage.fetchData(shard).then((data) => {
            console.log("Fetched video shard: "); console.log(fileName);
            console.log(data);
        })
        if (i > 8) {
            break
        }
    }
}

function installTestButton(name: string, func: () => void) {
    const button = document.createElement('button')
    button.innerText = 'CHANNEL:\n' + name
    button.onclick = func
    button.style.margin = "2px 2px"; // This will add 5px margin to left and right side of each button.
    const testButtons = document.getElementById('storageTestButtons')
    if (testButtons) testButtons.appendChild(button)
    else console.log('testButtons not found')
}

// installTestButton('read shards', test06)
installTestButton('read video shards', test07)
installTestButton('multiple 4KB blocks', test05a)
installTestButton('test mirror', test05b)



function testAll() {
    // test06()
    test07()
    test05a()
    test05b()
}

installTestButton('ALL STORAGE TESTS', testAll)

if (autoRun) {
    // console.log('autoRun is set, running tests')
    testAll()
}

