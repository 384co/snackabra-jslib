// Copyright (c) 2022 Magnusson Institute, All Rights Reserved.


// enable this to add (console.log) detailed trace output on ALL channels
const TRACE_CHANNELS = false


//#region - various utilities

/*
  Asserts boolean, but doesn't break program flow, instead
  it reports on it and returns the outcome
  */
function assert(expr: any, msg: string = ''): boolean {
  if (expr) {
    return true
  } else {
    let m: string = 'Failed Assertion in test. ' + msg
    console.error(m)
    console.log('stack trace:')
    console.trace()
    return false
  }
}


// import {jest} from '@jest/globals';
import {
  ab2str,
  str2ab,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  getRandomValues,
  // jsonParseWrapper,
  // Channel,
  // Identity,
  MessageBus,
  // SBFile,
  SBMessage,
  Snackabra,
  ChannelMessage,
  SBObjectHandle,
  SBChannelHandle,
  SBServer,
  ChannelSocket,
  compareBuffers
} from './snackabra.js'


let defaultChannelId:string = '';

let test_pass = 0, test_fail = 0;

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

const z = getElement('testResults')
z.innerHTML += 'Not checking library ... starting tests \n ';

// easy tests
const z1 = [
  'Hello Everybody',
  'abcdefgABCDEFG0123456!@#$%^&*()'
];

const z2 = [
  'abcdef123456',
  'ABC*#&@^)!_=`|\\',
  '',
  '        ',
  '=============',
  '\0',
  '\0\0\0\0\0\0'
];



// // TRUE if the same, false otherwise (we assume they're uint8)
// function compare_uint8(a: ArrayBuffer, b: ArrayBuffer) {
//   if (a.length != b.length)
//     return false;
//   for (let i = a.length; -1 < i; i -= 1) {
//     if (a[i] !== b[i]) return false;
//   }
//   return true;
// }

async function test_with_array(test_dom: Element | null,
  test_index: number,
  array: ArrayBuffer | null) {
  if ((test_dom == null) || (array == null)) {
    assert(false, "test_with_array() passed on or more null values")
    return
  }
  const array_b64 = arrayBufferToBase64(array);
  const array_b64_array = base64ToArrayBuffer(array_b64);
  if (compareBuffers(array_b64_array, array)) {
    test_dom.innerHTML += `Test ${test_index} passed, base64 intermediate value was:<br\>${array_b64}<br\><br\>`;
    test_pass++;
  } else {
    test_dom.innerHTML += `Test ${test_index} FAILED (see console log), base64 intermediate value was:<br\>${array_b64}<br\><br\>`;
    test_fail++;
    console.log('Original array:');
    console.log(array);
    console.log('Intermediate b64:');
    console.log(array_b64);
    console.log('Final array:');
    console.log(array_b64_array);
  }
}

function runTests(test_list: Array<string>) {

  if (test_list.includes('test01a')) {
    let i = 0;
    const z: Element | null = getElement('test01a');
    assert(z)
    z.innerHTML += 'starting test ...<br\>';
    for (const e of z1) {
      z.innerHTML += `String is '${e}'<br\>`;
      const buffer = str2ab(e);
      test_with_array(z, i, buffer);
      i += 1;
    }
  }


  if (test_list.includes('test01b')) {
    let i;
    const z = getElement('test01b');
    z.innerHTML += 'starting test ...<br\>';
    for (i = 0; i < 20; i++) {
      const random_length = new Uint8Array(4);
      getRandomValues(random_length);
      const array = new Uint8Array(random_length[0]);
      getRandomValues(array);
      test_with_array(z, i, array);
    }
  }

  if (test_list.includes('test02')) {
    const z = getElement('test02');
    z.innerHTML += 'starting test ...<br\>';
    for (const s0 of z2) {
      const s1 = str2ab(s0);
      const s2 = ab2str(s1);
      if (s0 === s2) {
        z.innerHTML += `Pass for string '${s0}'<br\>`;
        test_pass++;
      } else {
        z.innerHTML += `FAIL for string '${s0}'<br\>`;
        test_fail++;
      }
    }
  }

  if (test_list.includes('test02b')) {
    let i;
    const z = getElement('test02b');
    z.innerHTML += 'starting test ...<br\>';
    for (i = 0; i < 20; i++) {
      const random_length = new Uint8Array(4);
      getRandomValues(random_length);
      const array = new Uint8Array(random_length[0]);
      getRandomValues(array);
      const s1 = ab2str(array);
      const s2 = str2ab(s1);
      if (compareBuffers(array, s2)) {
        z.innerHTML += `Pass for random (binary) string test #${i}<br\>`;
        test_pass++;
      } else {
        z.innerHTML += `FAIL for random (binary) string test #${i} (see console)<br\>`;
        console.log(`test02b string ${i}:`);
        console.log(array);
        test_fail++;
      }
    }
  }

  if (test_list.includes('test03')) {
    const z = getElement('test03');
    const b = new MessageBus();
    let called_1 = false;
    z.innerHTML += 'starting test ...<br\>';
    console.log('inside testing messagebus');

    function hello_1() {
      z.innerHTML += '... first handler<br\>';
      called_1 = true;
    }

    b.subscribe('1', hello_1);
    b.subscribe('1', hello_1);
    z.innerHTML += 'Should call first handler twice:<br\>';
    b.publish('1');
    z.innerHTML += 'And now just once:<br\>';
    b.unsubscribe('1', hello_1);
    b.publish('1');
    z.innerHTML += 'And now not at all:<br\>';
    b.unsubscribe('1', hello_1);
    b.publish('1');

    if (called_1) {
      test_pass++;
    } else {
      test_fail++;
    }
    z.innerHTML += '... MessageBus tests done ...<br\>';
  }


  //#endregion

  let target = "n4vK8r"
  let best = ""


  function LCP(strs: Array<string>) {
    if (strs.length === 0) { return '' }
    return strs.reduce((p, n) => {
      let i = 0
      while (p[i] && n[i] && p[i] === n[i]) i++
      return p.slice(0, i)
    })
  }

  // console.log(LCP(["test LCP", "test LCP this should not be this long"]))


  if (test_list.includes('test07a')) {
    let i = 0
    let j = 2
    let t0 = Date.now()
    while (i < 10000000) {
      crypto.subtle.generateKey({
        name: 'ECDH',
        namedCurve: 'P-384'
      }, true, ['deriveKey']).then((k: CryptoKeyPair) => {
        // let p = await crypto.subtle.exportKey('jwk', k.publicKey)
        i++
        if (i % j == 0) {
          console.log(`${i} keys generated`)
          j *= 2
          // console.log(Date.now() - t0)
          console.log(`keys per second: ${(i) / ((Date.now() - t0) / 1000)}`)
        }
        // let z = LCP([target, p.x!])
        // if (z.length > best.length) {
        //   best = z
        //   console.log(`new best: ${best} in ${(Date.now() - t0)/1000} seconds} (${p.x!})`)
        // }
      })
    }
  }


  /* ******************************** *
      New 0.5.0 'snackabra.ts' tests!
   * ******************************** */

  const someKnownRooms = [
    "W4LAos8qfbWrDXrTPqW55ygyrZ3Nw7LzWppl3SoTqHn-JloV_tcK8vx1klJPII4U",
    "rSM2Zu-T3UF-99o6KxXBZOcfLam7Qdqj6CDVMRwmBH5ASNskgOCr27GgLO8re-gY",
    "2fLf7t3ICjsjSKXzsMTyy514KeoVAGyHTdlGVSaQjgeDYc31bSiZR-dTvWmuHcwf",
    "2Hi26GZ3N5vuYt8Gbvn3eM881s0L3VS3p_tx-gzIwfObUR3redN2ylvba0Y0AgVY",
    "goiGm90DfIJ0B4dgRx_hu6rG7O-aDMASiiwlIOsA55BpBgLGkFxDSjlRX7L_GtU2"
  ]


  const sb_config = {
    channel_server: 'http://localhost:4001',
    channel_ws: 'ws://localhost:4001',
    storage_server: 'http://localhost:4000'
  }

  // snackabra.pages.dev
  const sb_config_matt: SBServer = {
    channel_server: 'https://r.somethingstuff.workers.dev/',
    channel_ws: 'wss://r.somethingstuff.workers.dev/',
    storage_server: 'https://s.somethingstuff.workers.dev/'
  }

  function logTest(msg: string) {
    const z = getElement('test06a')
    z.innerHTML += msg + "<br/><br/>"
  }

  if (test_list.includes('test06a')) {
    console.log("Test 'test06a")
    try {
      // create server object (assumes miniflare test setup):
      const sb_config = {
        channel_server: 'http://localhost:4001',
        channel_ws: 'ws://localhost:4001',
        storage_server: 'http://localhost:4000'
      }
      const SB = new Snackabra(sb_config)
      // create a new channel (room), returns (owner) key and channel name:
      SB.create(sb_config, 'password').then((handle) => {
        defaultChannelId = handle.channelId
        const roomUrl = `http://localhost:3000/rooms/${handle.channelId}`
        console.log(`you can (probably) connect here: ${roomUrl}`)
        logTest(' ... received new channel:')
        logTest(`<a href="${roomUrl}">${roomUrl}</a>`)
        logTest(' channel name itself:')
        logTest(`<tt>${handle.channelId}</tt>`)
        logTest('Above is now default channel.')
        // connect to the websocket with our handle info:
        SB.connect(
          // must have a message handler:
          (m: ChannelMessage) => { console.log('got message:'); console.log(m); },
          handle.key, // if we omit then we're connecting anonymously (and not as owner)
          handle.channelId // since we're owner this is optional
        ).then((c) => c.ready).then((c) => {
          c.enableTrace = TRACE_CHANNELS
          c.userName = "TestBot"; // optional
          // say hello to everybody! upon success it will return "success"
          (new SBMessage(c, "Hello from TestBot!")).send()
            .then((c) => { console.log(`test message sent! (${c})`) })
          // there's a button that sends more messages manually
          let messageCount = 0
          getElement('anotherMessage').onclick = (() => {
            messageCount++
            let sbm = new SBMessage(c, `message number ${messageCount} from test06a!`)
            logTest(`==== sending message number ${messageCount} (on console)`)
            console.log(`==== sending message number ${messageCount}:`)
            console.log(sbm)
            c.send(sbm)
              .then((c) => console.log(`back from sending message ${messageCount} (${c})`))
          })
        })
      })
    } catch (e: any) {
      console.log('Got error in test06a:')
      console.log(e)
      console.trace()
    }
  }

  if (test_list.includes('test06b')) {
    console.log("Test 'test06b")
    Promise.any((someKnownRooms).map((channelId) =>
      (new Snackabra()).connect((m: ChannelMessage) => { console.log(`got message: ${m}`) }, undefined /* anonymous */, channelId)))
      .then((c) => c.ready).then((c) => {
        console.log(`found a channel here: ${c.sbServer.channel_server}/rooms/${c.channelId}`)
        c.userName = "TestBot";
        (new SBMessage(c, "Hello from TestBot!")).send().then((c) => { console.log(`test message sent! (${c})`) })
      })
      .catch((e) => {
        if (e instanceof AggregateError) console.log("Could not find server for room ${channelId}")
        else console.log(`Failed to find a server, unknown problem: ${e}`)
      })
  }

  // helper function, tries to get you a channel (ChannelSocket),
  // 'normal' failure will reject(null)
  function getAnyChannel(channelIdArray: Array<string>, onMessage: (m: ChannelMessage) => void) {
    return new Promise<ChannelSocket | null>((resolve, reject) =>
      Promise.any(channelIdArray.map((channelId) =>
        (new Snackabra()).connect(onMessage, undefined /* anonymous */, channelId)))
        .then((c) => c.ready).then((c) => { resolve(c); })
        .catch((e) => {
          if (e instanceof AggregateError) {
            console.log("Could not find server for room ${channelId}");
            reject(null); // 'normal' failure
          } else {
            console.log(`Failed to find a server, unknown problem: ${e}`)
            throw new Error(`getAnyChannel() fails with unknown error (${e})`)
          }
        })
    )
  }


  if (test_list.includes('test06c')) {
    getAnyChannel([defaultChannelId], (m: ChannelMessage) => { console.log('test06c got message:'); console.log(m); })
      .then((c) => {
        if (c) {
          logTest(`test06c found channel ("${c.channelId}") on server ${c.sbServer.channel_server} (tracing)`)
          c.enableTrace = TRACE_CHANNELS
          c.userName = "TestBot";
          (new SBMessage(c, "Hello from TestBot!")).send().then((c) => { console.log(`[test06c] test message sent! (${c})`) })
          logTest("old messages - on console")
          c.api.getOldMessages(0).then((oldMessages) => {
            console.log("got a reply:")
            console.log(oldMessages)
          })
        } else {
          console.log("Could not find server for room ${channelId}")
        }
      })
  }



  if (false) {
    const sbServer = sb_config_matt
    console.log(`testing against servers: ${sbServer}`)
    const SB = new Snackabra(sbServer)
    // we need a channel name since that's our source of storage 'budget'
    SB.create(sbServer, 'password').then((channelHandle) => {
      // generate a random 1MB block:
      let testBlob = getRandomValues(new Uint8Array(1 * 1024 * 1024))
      // now let's store it:
      SB.storage.storeObject(testBlob, 'p', channelHandle.channelId).then((blobHandle) => {
        // returns a handle containing everything we need for future access, let's test that:
        console.log(blobHandle)
        SB.storage.fetchData(blobHandle).then((d) => {
          if (compareBuffers(testBlob, d)) {
            console.log('Yupp we got same data back! Sweet.')
          } else {
            console.log('... wow can there be a bug in SB?  did not get the same data back')
          }
        })
      })
    })
  }

  // test performance of 4KB blocks
  if (test_list.includes('test05a')) {
    const blockCount: number = 14
    const sbServer = sb_config_matt
    console.log(`testing storing ${blockCount}x64KB blocks against servers:`)
    console.log(sbServer)
    const SB = new Snackabra(sb_config_matt)
    // we need a channel name since that's our source of storage 'budget'
    SB.create(sbServer, 'password').then((c) => {
      let t0 = Date.now()
      console.log('starting timer. SB object ready.')
      // now we generate a bunch of random 4KB blocks
      let blockSet: Array<Uint8Array> = []
      // this in fact equates to 64KB writes in current design ... don't worry about that for now
      for (let i = 0; i < blockCount; i++) blockSet.push(getRandomValues(new Uint8Array(63 * 1024)))
      console.log(`[${Date.now() - t0}] random blocks generated, start writing them to storage:`)
      let handlePromiseSet: Array<Promise<SBObjectHandle>> = []
      for (let i = 0; i < blockCount; i++) handlePromiseSet.push(SB.storage.storeObject(blockSet[i], 'p', c.channelId))
      console.log(`[${Date.now() - t0}] everything has been fired off:`)
      console.log(handlePromiseSet)
      console.log(`[${Date.now() - t0}] now we send them to be stored:`)
      Promise.all(handlePromiseSet).then((handleSet) => {
        console.log(`[${Date.now() - t0}] we got all handles (they're all allocated)`)
        console.log(handleSet)
        console.log(`[${Date.now() - t0}] we'll now 'peek' into the process and first wait for all verifications:`)
        let verificationPromiseSet: Array<Promise<string>> = []
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
            for (let i = 0; i < blockCount; i++) if (!compareBuffers(blockSet[i], returnedBlockSet[i])) console.error(`ugh - buffer ${i} did not come back the same`)
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
            })
          })
        })
      })
    })
  }

  async function testBlockWrites(j: number, SB: Snackabra, c: SBChannelHandle, blockCount: number) {
    let t0 = Date.now()
    console.log(`[${j}] testBlockWrites() starting with ${blockCount} blocks`)
    // now we generate a bunch of random 4KB blocks
    let blockSet: Array<Uint8Array> = []
    // this in fact equates to 4KB writes in current design ... don't worry about that for now
    for (let i = 0; i < blockCount; i++) blockSet.push(getRandomValues(new Uint8Array(63 * 1024)))
    console.log(`[${j}][${Date.now() - t0}] random blocks generated, start writing them to storage:`)
    let handlePromiseSet: Array<Promise<SBObjectHandle>> = []
    for (let i = 0; i < blockCount; i++) {
      let myHandle = new Promise<SBObjectHandle>((resolve) => {
        let t1 = Date.now()
        SB.storage.storeObject(blockSet[i], 'p', c.channelId).then((blobHandle) => {
          console.log(`[${j}][${Date.now() - t0}] got handle for object ${i}`)
          blobHandle.verification.then((ver) => {
            console.log(`[${j}][${Date.now() - t0}] got verification for object ${i} (${ver}) total time to write ${Date.now() - t1}`)
            resolve(blobHandle)
          })
        })
      })
      handlePromiseSet.push(myHandle)
    }
    console.log(`[${j}][${Date.now() - t0}] we got the tasks set up, they should be referenced here:`)
    console.log(handlePromiseSet)
    Promise.all(handlePromiseSet).then((v) => {
      console.log(`[${j}][${Date.now() - t0}] and now they should all be completed:`)
      console.log(v)
    })
  }

  if (test_list.includes('test05b')) {
    const sbServer = sb_config_matt
    const blockCount: number = 14
    const totalTestCount: number = 4
    console.log(`testing storing ${blockCount}x46KB blocks INDIVIDUALLY against servers (${totalTestCount} times):`)
    console.log(sbServer)
    const SB = new Snackabra(sb_config_matt)
    SB.create(sbServer, 'password').then((c) => {
      console.log('starting timer(s). SB object ready.')
      for (let j = 0; j < totalTestCount; j++) testBlockWrites(j, SB, c, blockCount)
    })
  }

  if (false) {
    // create server object (assumes miniflare test setup):
    const sbServer: SBServer = {
      channel_server: 'http://localhost:4001', // asynchronous API
      channel_ws: 'ws://localhost:4001', // synchronous (websocket)
      storage_server: 'http://localhost:4000' // default storage server
    }
    const SB = new Snackabra(sbServer)
    // create a new channel (room), returns (owner) key and channel name:
    SB.create(sbServer, 'password').then((channelHandle) => {
      // we shouldn't need anything else to store stuff

      // .. changing not to fetch an image but send a random blob
      // const img = getElement('original-snackabra-img')
      // console.log("fetching this image:")
      // // @ts-ignore
      // console.log(img.src)
      // // @ts-ignore
      // fetch(img.src)
      //   .then((res) => res.arrayBuffer())
      //   .then((myBuf) => {

      let myBuf = new Uint8Array(3 * 1024 * 1024) // test making it bigger
      getRandomValues(myBuf)

      console.log('will try to send this buffer:')
      console.log(myBuf)
      SB.storage.storeObject(myBuf, 'b', channelHandle.channelId).then((blobHandle) => {
        console.log('got response from storeObject():')
        console.log(blobHandle)
        console.log('________________ here is the nonce i see ... ')
        console.log(blobHandle.iv)
        console.log('will now try to fetch same object')
        SB.storage.fetchData(blobHandle).then((d) => {
          console.log('got this back:')
          console.log(d)
          if (compareBuffers(myBuf, d)) {
            console.log('Got the same data back!')
          } else {
            console.log('============ DID NOT get the same data back ==========')
            console.log(`sent:     ${arrayBufferToBase64(myBuf.slice(0, 48))}...`)
            console.log(`received: ${arrayBufferToBase64(d.slice(0, 48))}...`)
          }
        }).catch((x) => console.log(`*********** Failed to fetch object: ${x}`))

        // r.verification.then((v) => {
        //   console.log('got verification:')
        //   console.log(v)
        //   console.log('will now try to fetch same object')
        //   SB.storage.fetchData(r.id, v, 'b').then((d) => {
        //     console.log('got this back:')
        //     console.log(d)
        //     if (compareBuffers(myBuf, d)) {
        //       console.log('Got the same data back!')
        //     } else {
        //       console.log('============ DID NOT get the same data back ==========')
        //       console.log(`sent:     ${arrayBufferToBase64(myBuf.slice(0,32))}...`)
        //       console.log(`received: ${arrayBufferToBase64(d.slice(0,32))}...`)
        //     }
        //   }).catch((x) => console.log(`*********** Failed to fetch object: ${x}`))
        // })

      })
    })/* .catch((e) => {
    console.error(`got error trying to test storage: ${e}`)
  })*/
  }


  if (test_list.includes('test04d')) {
    const z = getElement('test04d');

    // create orchestration (master) object (synchronous)
    console.log("++++test04d++++ SB object:")
    const sbServer = sb_config
    const SB = new Snackabra(sbServer);
    // console.log("++++test04d++++ new owner keys:")
    SB.create(sbServer, 'password').then((handle) => {
      SB.connect(
        // print out any messages we get
        (m: ChannelMessage) => { console.log('got message:'); console.log(m); },
        handle.key, // if we omit then we're connecting anonymously
        handle.channelId, // optional, will recreate if missing
      ).then((c) => c.ready).then((c) => {
        console.log("++++test04d++++ channel:")
        console.log(c)
        // update test web page (index.html)
        const roomUrl = `localhost:3000/rooms/${handle.channelId}`
        z.innerHTML += ' ... received new channel:<br\>'
        z.innerHTML += `<a href="${roomUrl}">${roomUrl}</a><br\n>`
        console.log("++++test04d++++ reachable at:")
        console.log(roomUrl)
        // optional
        c.userName = "TestBot"
        // everything should be ready
        console.log("++++test04d++++ channel has keys:")
        console.log(c.keys)

        let sbm = new SBMessage(c, "Hello from test04d!")
        console.log("++++test04d++++ will try to send this message:")
        console.log(sbm)
        sbm.send().then((c) => {
          console.log("++++test04d++++ back from send promise - got response:")
          console.log(c)
        })

        // there's a button that sends more messages manually
        let messageCount = 0
        getElement('sayHello').onclick = (() => {
          messageCount++
          let sbm = new SBMessage(c, `message number ${messageCount} from test04d!`)
          console.log(`================ sending message number ${messageCount}:`)
          console.log(sbm)
          c.send(sbm).then((c) => console.log(`back from sending message ${messageCount} (${c})`))
        })
      })
    })
  }

  // if (true) {
  //   // create server object
  //   const SB = new Snackabra({
  //     channel_server: 'http://localhost:4001',
  //     channel_ws: 'ws://localhost:4001',
  //     storage_server: 'http://localhost:4000'})
  //   // create a new channel (room) and connect
  //   const ownerKeys = new Identity()
  //   SB.create('password', ownerKeys).then((channelId) => {
  //     SB.connect(
  //       channelId,
  //       // print out any messages we get
  //       (m: ChannelMessage) => { console.log(`got message: ${m}`) },
  //       ownerKeys // if we omit then we're connecting anonymously
  //     ).then((c) => c.ready).then((c) => {
  //       // say hello to everybody
  //       c.userName = "TestBot";
  //       (new SBMessage(c, "Hello from TestBot!")).send().then((c) => { console.log(`sent! (${c})`) })
  //     })
  //   })
  // }


  // if (test_list.includes('test04d')) {
  //   const z = getElement('test04d');

  //   // create orchestration (master) object (synchronous)
  //   console.log("++++test04d++++ SB object:")
  //   const SB = new Snackabra(sb_config);
  //   console.log("++++test04d++++ new owner keys:")
  //   const channelOwnerKeys = new Identity();
  //   SB.create(
  //     'password',
  //     channelOwnerKeys).then((channelId) => {
  //       SB.connect(
  //         channelId,
  //         (message: ChannelMessage) => {
  //           console.log('++++test04d++++ Message Received:')
  //           console.log(message)
  //         } /* optionally we could add ', identity' override here */
  //       ).then((c) => c.ready).then((c) => {
  //         console.log("++++test04d++++ channel:")
  //         console.log(c)
  //         // update test web page (index.html)
  //         const roomUrl = `localhost:3000/rooms/${channelId}`
  //         z.innerHTML += ' ... received new channel:<br\>'
  //         z.innerHTML += `<a href="${roomUrl}">${roomUrl}</a><br\n>`
  //         console.log("++++test04d++++ reachable at:")
  //         console.log(roomUrl)
  //         // optional
  //         c.userName = "TestBot"
  //         // everything should be ready
  //         console.log("++++test04d++++ channel has keys:")
  //         console.log(c.keys)

  //         let sbm = new SBMessage(c, "Hello from test04d!")
  //         console.log("++++test04d++++ will try to send this message:")
  //         console.log(sbm)
  //         sbm.send().then((c) => {
  //           console.log("++++test04d++++ back from send promise - got response:")
  //           console.log(c)
  //         })

  //         // there's a button that sends more messages manually
  //         let messageCount = 0
  //         getElement('sayHello').onclick = (() => {
  //           messageCount++
  //           let sbm = new SBMessage(c, `message number ${messageCount} from test04d!`)
  //           console.log(`================ sending message number ${messageCount}:`)
  //           console.log(sbm)
  //           c.send(sbm).then((c) => console.log(`back from sending message ${messageCount} (${c})`))
  //         })
  //       })
  //     })
  //   }


  /* so you can also reach this on:
     https://snackabra.pages.dev/rooms/yzeQWYahP87ngAVbhdP7DxU3or0mOrOTLJ3HcQ9UQQzZgKMYq3zWr1Qk5bZTXpHl
  */

  // updating tests - channel ID is created
  // const channel_id = 'yzeQWYahP87ngAVbhdP7DxU3or0mOrOTLJ3HcQ9UQQzZgKMYq3zWr1Qk5bZTXpHl';

  // let channel_id_resolve: (arg0: string) => void = (() => { throw new Error('resolve err'); })
  // let channel_id = new Promise<string>((resolve) => { channel_id_resolve = resolve; });

  /* this is one of Matt's keys */
  // const key = {
  //   key_ops: ['deriveKey'],
  //   ext: true,
  //   kty: 'EC',
  //   x: '62RGlvpBrkrBTgscORtV5MmJqSS0N6aIELTLY1VdOEhrToUbnNPi2XbFucGhWey9',
  //   y: '24kcejeniQMNGuYigc39fcsjzP6P9VqEYWieT6WYgSBlVsCR_DXTjlPRAQ4P8x1K',
  //   crv: 'P-384',
  //   d: '9sYVDOfUJ8YofRh4y_4dItXcXzTiiwYKI6pXU9thJyfMqMtaFhvUbCsHl14Wx37k'
  // };

  // if (test_list.includes('test04c')) {
  //   const z = getElement('test04c');
  //   z.innerHTML = 'starting test ... creating Snackabra object ...<br\>';
  //   const SB = new Snackabra(sb_config);
  //   z.innerHTML += ' ... received Snackabra object (see console log) ...<br\>';
  //   console.log(SB);
  //   SB.setIdentity(key).then(async () => {
  //     z.innerHTML += ' ... set identity ...<br\>';
  //     SB.create('password').then((c) => {
  //       z.innerHTML += ' ... received new channel:<br\>';
  //       z.innerHTML += `<a href="localhost:3000/rooms/${c}">${c}</a><br\n>`;
  //       channel_id_resolve(c);
  //     });
  //   });
  // }

  // previous tiny hello
  // if (test_list.includes('test04a')) {
  //   // "me", note 'key' is set above as a const
  //   const myId = new Identity(key)
  //   // create SB (orchestration) object
  //   const SB = new Snackabra(sb_config)
  //   // create a new room (channel)
  //   SB.create('password', myId).then((channelId) => {
  //     // we have a nice new channel
  //     const roomUrl = `localhost:3000/rooms/${channelId}`
  //     z.innerHTML += ' ... received new channel:<br\>';
  //     z.innerHTML += `<a href="${roomUrl}">${roomUrl}</a><br\n>`;

  //     console.log("++++test04a++++ created ID and created room:")
  //     console.log("++++test04a++++ my identity:")
  //     console.log(myId)
  //     console.log("++++test04a++++ new room URL:")
  //     console.log(roomUrl)

  //     // we now need to connect to it
  //     SB.connect(
  //       channelId,
  //       myId,
  //       (message: any) => {
  //         console.log('Message Received:')
  //         console.log(message)
  //       }
  //       ).then((c) => {

  //       console.log("++++test04a++++ got ourselves a channel:")
  //       console.log(c)

  //       // const messages = [];
  //       // const controlMessages = [];

  //       c.ready.then(() => {
  //         // everything should be ready
  //         c.userName = "TestBot"
  //         const k = c.keys
  //         console.log("++++test04a++++ channel has keys:")
  //         console.log(k)
  //         console.log(c.keys)

  //         console.log("++++test04a++++ trying to send message!")

  //         let sbm = new SBMessage(c, "Hello from test04a!")

  //         console.log("++++test04a++++ will try to send this message:")
  //         console.log(sbm)

  //         sbm.send().then((c) => {
  //           console.log("back from send promise? got response:")
  //           console.log(c)
  //           console.log("++++test04a++++ end of test")
  //         })

  //         // // in parallel, handle incoming messages:
  //         // c.onMessage = async (message: any) => {
  //         //   console.log('Message Received:')
  //         //   console.log(message)
  //         // }

  //         // send more hello
  //         let messageCount = 0
  //         getElement('sayHello').onclick = (() => {
  //           messageCount++
  //           let sbm = new SBMessage(c, `message number ${messageCount} from test04ba!`)
  //           // @ts-ignore
  //           // sbm.sender_pubKey = JSON.stringify(myPubKey)
  //           console.log(`================ sending message number ${messageCount}:`)
  //           console.log(sbm)
  //           c.send(sbm).then((c) => console.log(`back from send promise? (${c})`))
  //         })
  //       })
  //     })
  //   })
  // }


  // if (test_list.includes('test04a')) {
  //   channel_id.then((channel_id: string) => {
  //     // Watch for incoming messages on the socket
  //     const SB = new Snackabra(sb_config);
  //     SB.setIdentity(key).then(async () => {
  //       // console.log("@@@@@@@@@@@@@@@@ Identity set")
  //       const c: Channel = await SB.connect(channel_id);
  //       // console.log("@@@@@@@@@@@@@@@@ got connection:")
  //       console.log(c)
  //       const messages: ChannelMessage[] = []
  //       const controlMessages: ChannelMessage[] = []
  //       c.socket.onMessage = async (message: ChannelMessage) => {
  //         // console.log("@@@@@@@@@@@@@@@@ Message Received:\n ", message);
  //         // const message = jsonParseWrapper(sb_message, 'L248');
  //         if (message?.control) {
  //           controlMessages.push(message);
  //         } else {
  //           if (message?.image !== '') {
  //             messages.push(message);
  //           }
  //         }
  //         if (controlMessages.length === messages.length * 2 && controlMessages.length > 0) {
  // 	  // this stuff won't work yet, but error outputs are useful
  // 	  if (messages[0]._id) {
  // 	    let m: ChannelMessage = messages[0] // as ChannelMessage
  // 	    // @ts-ignore
  //             const imageData = await c.storage!.retrieveData(m!._id, messages, controlMessages);
  //             const img = getElement('new-snackabra-img');
  //             console.log(imageData);
  // 	    // @ts-ignore
  //             img.src = imageData.url;
  // 	  } else {
  // 	    console.log(messages[0])
  // 	    assert(false, 'Cannot parse messages[0] (see above)')
  // 	  }
  //         }
  //       };
  //     });
  //   });
  // }





  // // send "Hello"
  // if (test_list.includes('test04b')) {
  //   channel_id.then((channel_id) => {
  //     console.log("@@@@@@@@@@@@@@@@ Channel id:")
  //     console.log("localhost:3000/rooms/" + channel_id)

  //     const SB = new Snackabra(sb_config);
  //     SB.setIdentity(key).then(async () => {
  //       const c = await SB.connect(channel_id);

  //       const messages = [];
  //       const controlMessages = [];

  //       console.log("@@@@@@@@@@@@@@@@ channel has keys:")
  //       console.log(SB.channel.keys)

  //       console.log("@@@@@@@@@@@@@@@@ trying to send message!")

  //       let sbm = new SBMessage(c, "Hello from test04b!")
  //       let myPubKey: JsonWebKey

  //       SB.identity.exportable_pubKey.then((pubKey) => {
  // 	console.log("Got pubkey: ", pubKey)
  // 	sbm.ready.then(() => {
  // 	  sbm.sender_pubKey = pubKey! // should be per channel?
  // 	  myPubKey = pubKey!

  // 	  console.log("here is sender pubkey:", myPubKey)
  // 	  // console.log("trying to re-import key, i get:")
  // 	  // console.log(await crypto.importKey("jwk", myPubKey, "ECDH", true, []))
  // 	  // myPubKey.key_ops = ['deriveKey', 'sign']
  // 	  // console.log("trying again:")
  // 	  // console.log(await importKey("jwk", myPubKey, "ECDH", true, []))

  // 	  console.log("@@@@@@@@@@@@@@@@ will try to send this message:")
  // 	  console.log(sbm)
  // 	  c.socket.send(sbm).then((c) => console.log("back from send promise?"))
  // 	  console.log("@@@@@@@@@@@@@@@@ end of test")
  // 	})
  //       })
  //       c.socket.onMessage = async (message: ChannelMessage) => {
  //         console.log('Message Received:\n ', message);
  //       }

  //       // send more hello
  //       let messageCount = 0
  //       getElement('sayHello').onclick = (() => {
  // 	messageCount++
  // 	let msg = new SBMessage(c, `message number ${messageCount}!`)
  // 	// @ts-ignore
  // 	sbm.sender_pubKey = JSON.stringify(myPubKey)
  // 	console.log(`================ sending message number ${messageCount}:`)
  // 	console.log(sbm)
  // 	c.socket.send(sbm).then((c) => console.log("back from send promise?"))
  //       })

  //     });
  //   });
  // }

  // // sends an image to the storage server
  // if (test_list.includes('test04')) {
  //   const SB = new Snackabra(sb_config)
  //   SB.create('password').then((handle) => {
  //     SB.connect(
  //       (m: ChannelMessage) => { console.log(`test04 got old message: ${m}`) },
  //       handle.key // connecting as owner
  //       // , handle.channelId // since we're owner this is optional
  //     ).then((c) => {
  //       const z = getElement('test04')
  //       z.innerHTML += 'starting channel tests ... setting up snoop bot ...<br\>';
  //       z.innerHTML += '.. connected ...<br\>';
  //       console.log(c);
  //       // c.api.getOldMessages(10).then... TODO: look at old messages
  //       c.send("Hello from TestBot").then((s) => { console.log(`sent hello! (returned '${s}')`) })
  //       const img = getElement('original-snackabra-img')
  //       console.log("fetching this image:")
  //       // @ts-ignore
  //       console.log(img.src)
  //       console.log(typeof img)
  //       // @ts-ignore
  //       fetch(img.src)
  //         .then((res) => res.blob())
  //         .then((blob) => {
  //           // const file = new File([blob], 'dot.png', blob);
  //           // @ts-ignore
  //           const file = new SBFile([blob], 'dot.svg', blob);
  //           console.log(file);
  //           SB.sendFile(file);
  //         });
  //     });
  //   })
  // }


  // VOPRF testing ...
  // ... uncomment this if you're running test05

  // import {
  //   Oprf, VOPRFClient, VOPRFServer, generatePublicKey, randomPrivateKey
  //   // '@cloudflare/voprf-ts';
  // } from './voprf-src/index.js';

  // if (test_list.includes('test05')) {

  //   // kick-tire test from
  //   // https://github.com/cloudflare/voprf-ts

  //   console.log("inside VOPRF test ...");

  //   // set up client and server with suite P384-SHA384.

  //   // the OPRF server has a private key obviously
  //   const suite = Oprf.Suite.P384_SHA384;
  //   const privateKey = await randomPrivateKey(suite);
  //   const server = new VOPRFServer(suite, privateKey);
  //   console.log("Private key (48 bytes): ", arrayBufferToBase64(privateKey.buffer));

  //   // the client gets the server's public key
  //   const publicKey = generatePublicKey(suite, privateKey);
  //   const client = new VOPRFClient(suite, publicKey);
  //   console.log("Public key (49 bytes so b64 will be padded): ", arrayBufferToBase64(publicKey.buffer));

  //   // client generates input (it's secret)
  //   const input = new TextEncoder().encode("This is the client's input");
  //   console.log("Client input 1: ", arrayBufferToBase64(input));
  //   const [finData, evalReq] = await client.blind([input]);

  //   // server responds with evaluation
  //   const evaluation = await server.evaluate(evalReq);

  //   // client can pull out output and at same time verify (that the server used the correct private key)
  //   const output = await client.finalize(finData, evaluation);
  //   console.log("Test 1, returns: ", arrayBufferToBase64(output[0]));

  //   // try with different client secret
  //   const input2 = getRandomValues(new Uint8Array(48));
  //   console.log("Client input2 : ", arrayBufferToBase64(input2));
  //   const [finData2, evalReq2] = await client.blind([input2]);
  //   const evaluation2 = await server.evaluate(evalReq2);
  //   const output2 = await client.finalize(finData2, evaluation2);
  //   console.log("Test 2, returns: ", arrayBufferToBase64(output2[0]));

  //   console.log("testing again with same client secret");
  //   const [finData3, evalReq3] = await client.blind([input2]);
  //   const evaluation3 = await server.evaluate(evalReq3);
  //   const output3 = await client.finalize(finData3, evaluation3);
  //   console.log("Test 3 (same client secret as test 2) returns: ", arrayBufferToBase64(output3[0]));
  // }

} /* runTests() */


getElement('createChannel').onclick = (() => {
  console.log("RUNNING: test06a")
  runTests(['test06a'])
  console.log("DONE: test06a")
})

getElement('getOldMessages').onclick = (() => {
  console.log("RUNNING: test06c")
  runTests(['test06c'])
  console.log("DONE: test06c")
})

console.log("Test setup ready: click away at buttons!");


if (true) {
  // final results posting
  const z = getElement('results');
  z.innerHTML = `Results: ${test_pass ? test_pass : 'none'} passed, ${test_fail ? test_fail : 'none'} failed`;
}

