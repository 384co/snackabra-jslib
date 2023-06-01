// (c) 2023 384 (tm)
 
/*
  Asserts boolean
  */
export function assert(expr: any, msg: string = ''): boolean {
  if (expr) {
    return true
  } else {
    let m: string = 'Failed Assertion in test. ' + msg
    console.error(m)
    console.log('stack trace:')
    console.trace()
    throw new Error(m)
  }
}

