## Setup

You will need to create a `test_config.ts` file in this directory with the following contents:

```typescript
import { SBServer } from '../dist/snackabra.js';

// runs tests automatically (as opposed to by button-clicks)
export const autoRun = false;

// decides if jslib should be verbose
export const jslibVerbose = false;

// for whatever channel server you're testing
export const serverPassword = ".... local server password ...";

// some tests require "some known rooms", working on making this
// self-bootstrapping
export const someKnownRooms = [
    "W4LAos8qfbWr......................................cK8vx1klJPII4U",
    "rSM2Zu-T3UF-......................................Cr27GgLO8re-gY",
    "2fLf7t3ICjsj......................................iZR-dTvWmuHcwf",
    "2Hi26GZ3N5vu......................................N2ylvba0Y0AgVY",
    "goiGm90DfIJ0......................................xDSjlRX7L_GtU2"
]

// point it to what you're testing
export const sb_config: SBServer = {
    channel_server: 'http://localhost:8787',
    channel_ws: 'ws://localhost:8787',
    storage_server: 'http://localhost:4001',
    shard_server: 'http://localhost:3841',
}
```

## Build

The test scripts are pre-built, but if you're making changes to jslib 
you'll need to be running ''yarn start'' in the top-level directory.


## Running tests

The ''index.html'' file needs to be served for tests to work:

```bash
./serve.py
```

It will run on port 3846 (default JSLib local test server port).

Open in a browser, click on stuff.


(c) 2023 384 (tm)
