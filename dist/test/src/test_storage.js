import { sb_config, autoRun, jslibVerbose, serverPassword } from './test_config.js';
import { Snackabra, getRandomValues, compareBuffers } from '../dist/snackabra.js';
function test05a() {
    _test05(false);
}
function test05b() {
    _test05(true);
}
function _test05_landShard(SB, handleSet, blockSet, t0) {
    return new Promise((resolve, _reject) => {
        console.log(`[${Date.now() - t0}] now let's try reading the land shards:`);
        let t2 = Date.now();
        let fetchPromiseSet3 = [];
        let blockCount = handleSet.length;
        for (let i = 0; i < blockCount; i++) {
            handleSet[i].shardServer = 'https://shard.3.8.4.land';
            fetchPromiseSet3.push(SB.storage.fetchData(handleSet[i]));
        }
        console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`);
        Promise.all(fetchPromiseSet3).then((returnedBlockSet3) => {
            console.log(`[${Date.now() - t0}] they should all be back (delta time ${Date.now() - t2}), let's check contents:`);
            for (let i = 0; i < blockCount; i++)
                if (!compareBuffers(blockSet[i], returnedBlockSet3[i]))
                    console.error(`ugh - buffer ${i} did not come back the same`);
            console.log(`[${Date.now() - t0}] if there were no errors, everything worked again!`);
            resolve();
        });
    });
}
function _test05(testLandShard) {
    try {
        const blockCount = 8;
        const sbServer = sb_config;
        console.log(`testing storing ${blockCount}x64KB blocks against servers:`);
        console.log(sbServer);
        const SB = new Snackabra(sb_config, jslibVerbose);
        SB.create(sbServer, serverPassword).then((c) => {
            let t0 = Date.now();
            console.log('starting timer. SB object ready.');
            let blockSet = [];
            for (let i = 0; i < blockCount; i++)
                blockSet.push(getRandomValues(new Uint8Array(63 * 1024)));
            console.log(`[${Date.now() - t0}] random blocks generated, start writing them to storage:`);
            let handlePromiseSet = [];
            for (let i = 0; i < blockCount; i++)
                handlePromiseSet.push(SB.storage.storeObject(blockSet[i], 'p', c.channelId));
            console.log(`[${Date.now() - t0}] everything has been fired off:`);
            console.log(handlePromiseSet);
            console.log(`[${Date.now() - t0}] now we send them to be stored:`);
            Promise.all(handlePromiseSet).then((handleSet) => {
                console.log(`[${Date.now() - t0}] we got all handles (they're all allocated)`);
                console.log(handleSet);
                console.log(`[${Date.now() - t0}] we'll now 'peek' into the process and first wait for all verifications:`);
                let verificationPromiseSet = [];
                handleSet.forEach(s => verificationPromiseSet.push(Object.assign({}, s.verification)));
                console.log(verificationPromiseSet);
                Promise.all(verificationPromiseSet).then((verificationSet) => {
                    console.log(`[${Date.now() - t0}] we got all of them so they've all been written:`);
                    console.log(verificationSet);
                    let fetchPromiseSet = [];
                    for (let i = 0; i < blockCount; i++)
                        fetchPromiseSet.push(SB.storage.fetchData(handleSet[i]));
                    console.log(`[${Date.now() - t0}] that's started, we got the promises up and running:`);
                    console.log(fetchPromiseSet);
                    console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`);
                    Promise.all(fetchPromiseSet).then((returnedBlockSet) => {
                        console.log(`[${Date.now() - t0}] they should all be back, let's check contents:`);
                        for (let i = 0; i < blockCount; i++) {
                            if (!compareBuffers(blockSet[i], returnedBlockSet[i])) {
                                console.error(`ugh - buffer ${i} did not come back the same (sent, returned):`);
                                console.log(blockSet[i]);
                                console.log(returnedBlockSet[i]);
                            }
                        }
                        console.log(`[${Date.now() - t0}] if there were no errors, everything worked!`);
                        console.log(`[${Date.now() - t0}] now let's try reading everything a SECOND time:`);
                        let t1 = Date.now();
                        let fetchPromiseSet2 = [];
                        for (let i = 0; i < blockCount; i++)
                            fetchPromiseSet2.push(SB.storage.fetchData(handleSet[i]));
                        console.log(`[${Date.now() - t0}] that's started, we got the promises up and running:`);
                        console.log(fetchPromiseSet2);
                        console.log(`[${Date.now() - t0}] now we wait for ALL of them to come back:`);
                        Promise.all(fetchPromiseSet2).then((returnedBlockSet2) => {
                            console.log(`[${Date.now() - t0}] they should all be back (delta time ${Date.now() - t1}), let's check contents:`);
                            for (let i = 0; i < blockCount; i++)
                                if (!compareBuffers(blockSet[i], returnedBlockSet2[i]))
                                    console.error(`ugh - buffer ${i} did not come back the same`);
                            console.log(`[${Date.now() - t0}] if there were no errors, everything worked again!`);
                            if (testLandShard) {
                                console.log(`[${Date.now() - t0}] calling land shards FIRST time:`);
                                _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                    console.log(`[${Date.now() - t0}] calling land shards SECOND time:`);
                                    _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                        console.log(`[${Date.now() - t0}] calling land shards THIRD time:`);
                                        _test05_landShard(SB, handleSet, blockSet, t0).then(() => {
                                            console.log(`[${Date.now() - t0}] COMPLETELY DONE`);
                                        });
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    }
    catch (e) {
        console.trace('test05 failed');
    }
}
import { videoShards } from './video_shards.js';
function test07() {
    let i = 0;
    const SB = new Snackabra(sb_config, jslibVerbose);
    for (const [fileName, shard] of Object.entries(videoShards)) {
        i++;
        SB.storage.fetchData(shard).then((data) => {
            console.log("Fetched video shard: ");
            console.log(fileName);
            console.log(data);
        });
        if (i > 8) {
            break;
        }
    }
}
function installTestButton(name, func) {
    const button = document.createElement('button');
    button.innerText = 'STORAGE:\n' + name;
    button.onclick = func;
    document.body.appendChild(button);
    const testButtons = document.getElementById('storageTestButtons');
    const testDiv = document.createElement('div');
    testDiv.id = name;
    testDiv.appendChild(button);
    if (testButtons)
        testButtons.appendChild(testDiv);
    else
        console.log('testButtons not found');
}
installTestButton('read video shards', test07);
installTestButton('multiple 4KB blocks', test05a);
installTestButton('test mirror', test05b);
function testAll() {
    test07();
    test05a();
    test05b();
}
installTestButton('ALL STORAGE TESTS', testAll);
if (autoRun) {
    testAll();
}
//# sourceMappingURL=test_storage.js.map