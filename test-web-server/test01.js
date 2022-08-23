// Copyright (c) 2022 Magnusson Institute, All Rights Reserved.

// to use this, simply add module script import in html:
//  <script type="module" src="./test01.js"></script>

// import {jest} from '@jest/globals';
import {SB_libraryVersion, ab2str, str2ab, base64ToArrayBuffer, arrayBufferToBase64, getRandomValues, MessageBus} from './browser.mjs';

let z = document.getElementById("testResults");
z.innerHTML += "Checking version of library: " + SB_libraryVersion() + "\n";

let test_pass = 0, test_fail = 0;


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

// true if the same, false otherwise (we assume they're uint8)
function compare_uint8(a, b) {
  if (a.length != b.length)
    return false;
  for (let i = a.length; -1 < i; i -= 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function test_with_array(test_dom, test_index, array) {
  let array_b64 = arrayBufferToBase64(array);
  let array_b64_array = base64ToArrayBuffer(array_b64);
  if (compare_uint8(array_b64_array, array)) {
    test_dom.innerHTML += `Test ${test_index} passed, base64 intermediate value was:<br\>${array_b64}<br\><br\>`;
    test_pass ++;
  } else {
    test_dom.innerHTML += `Test ${test_index} FAILED (see console log), base64 intermediate value was:<br\>${array_b64}<br\><br\>`;
    test_fail ++;
    console.log("Original array:");
    console.log(array);
    console.log("Intermediate b64:");
    console.log(array_b64);
    console.log("Final array:");
    console.log(array_b64_array);
  }
}

if (true)
{
  let i = 0;
  let z = document.getElementById('test01a');
  z.innerHTML += 'starting test ...<br\>';
  for (const e of z1) {
    z.innerHTML += `String is '${e}'<br\>`;
    const buffer = str2ab(e);
    test_with_array(z, i, buffer);
    i += 1;
  }
}

if (true)
{
  let z = document.getElementById('test01b');
  z.innerHTML += 'starting test ...<br\>';
  for (var i = 0; i < 20; i++) {
    let random_length = new Uint8Array(4);
    getRandomValues(random_length);
    let array = new Uint8Array(random_length[0]);
    getRandomValues(array);
    test_with_array(z, i, array);
  }
}

if (true)
{
  let z = document.getElementById('test02');
  z.innerHTML += 'starting test ...<br\>';
  for (const s0 of z2) {
    let s1 = str2ab(s0);
    let s2 = ab2str(s1);
    if (s0 === s2) {
      z.innerHTML += `Pass for string '${s0}'<br\>`;
      test_pass ++;
    } else {
      z.innerHTML += `FAIL for string '${s0}'<br\>`;
      test_fail ++;
    }
  }
}

if (true)
{
  let z = document.getElementById('test02b');
  z.innerHTML += 'starting test ...<br\>';
  for (var i = 0; i < 20; i++) {
    let random_length = new Uint8Array(4);
    getRandomValues(random_length);
    let array = new Uint8Array(random_length[0]);
    getRandomValues(array);
    let s1 = ab2str(array);
    let s2 = str2ab(s1)
    if (compare_uint8(array, s2)) {
      z.innerHTML += `Pass for random (binary) string test #${i}<br\>`;
      test_pass ++;
    } else {
      z.innerHTML += `FAIL for random (binary) string test #${i} (see console)<br\>`;
      console.log(`test02b string ${i}:`);
      console.log(array);
      test_fail ++;
    }
  }
}

if (true)
{
  let z = document.getElementById('test03');
  let b = new MessageBus();
  let called_1 = false; 
  z.innerHTML += 'starting test ...<br\>';
  console.log("inside testing messagebus");
  function hello_1() {
    z.innerHTML += '... first handler<br\>';
    called_1 = true;
  }
  b.subscribe("1", hello_1);
  b.subscribe("1", hello_1);
  z.innerHTML += 'Should call first handler twice:<br\>';
  b.publish("1");
  z.innerHTML += 'And now just once:<br\>';
  b.unsubscribe("1", hello_1);
  b.publish("1");
  z.innerHTML += 'And now not at all:<br\>';
  b.unsubscribe("1", hello_1);
  b.publish("1");

  if (called_1) {
    test_pass ++;
  } else {
    test_fail ++;
  }
  z.innerHTML += '... MessageBus tests done ...<br\>';

}

z = {
  "roomData": {
    "bq9F_c75CtB7eeHl4cFp-PxTfKpOkX7bzOOkr2Cfo43Q1JyYPE-LfKYkWvi6UV7B": {
      "key": "{\"crv\":\"P-384\",\"d\":\"TZ9VQH2Vzc2dI2hrrLosJmWCMiPiyd7Jjor9HdR0tEozXKfyxsVwQhWGeY74gVUW\",\"ext\":true,\"key_ops\":[\"deriveKey\"],\"kty\":\"EC\",\"x\":\"E-FbwOsy2aMGDX-bi_F1dSLRyeSnpZPdOPQ_Lx04OZf-kLsINcq4s-wvcPiRtzJH\",\"y\":\"U79nO8A2ZR-9LBX2_bIVCUprlT5LjC4XA4dJt84t9EPp_bpQQEBtTqGrjJNJv2Co\"}",
      "lastSeenMessage": "011000001011001101000010011111000111101100"
    }
  },
  "contacts": {
    "E-FbwOsy2aMGDX-bi_F1dSLRyeSnpZPdOPQ_Lx04OZf-kLsINcq4s-wvcPiRtzJH U79nO8A2ZR-9LBX2_bIVCUprlT5LjC4XA4dJt84t9EPp_bpQQEBtTqGrjJNJv2Co": "Me"
  },
  "roomMetadata": {
    "bq9F_c75CtB7eeHl4cFp-PxTfKpOkX7bzOOkr2Cfo43Q1JyYPE-LfKYkWvi6UV7B": {
      "name": "Room 1"
    }
  },
  "pem": false
}

window.z = z;

if (true)
{
  // final results posting
  let z = document.getElementById('results');
  z.innerHTML = `Results: ${test_pass ? test_pass : 'none'} passed, ${test_fail ? test_fail : 'none'} failed`;
}
