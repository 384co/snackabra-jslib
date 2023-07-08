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

// guarantees that it's not null
export function getElement(s: string): HTMLElement {
  const z: HTMLElement | null = document.getElementById(s)
  if (z == null) {
      assert(false, `failed to find DOM element '${s}'`)
      return {} as HTMLElement
  } else {
      return z
  }
}

