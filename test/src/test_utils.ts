// (c) 2023 384 (tm)
 
/*
  Asserts boolean, but doesn't break program flow, instead
  it reports on it and returns the outcome
  */
export function assert(expr: any, msg: string = ''): boolean {
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

