
chromium (edge/chrome) debugging comment: it will not follow symbolic
links for source level debugging against TS, so locally i (psm) have
a hard link, which i think git will treat as a local copy ... so
beware of in-browser debugging, it might show the wrong snackabra.ts
file when single stepping yada yada

... ergo i add snackabra.ts to .gitignore at this level rather (as a
hard link that is ignore by git) than risk seriously confusing what TS
file you're working on

note also that "test_config.ts" is needed in this directory,
and is not version controlled either at this time
