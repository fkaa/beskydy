import { evaluate } from '../evaluate'
import { watchStack } from '../reactivity/stack'
import { isNil } from '../util'
import { getAttr } from '../util/domUtils'

interface Block {
  expr: string | null
  el: HTMLElement
}

export function processIf(
  scopeStack: object,
  el: HTMLElement,
  expr: string,
) {
  // Holds the reference to the element and its parent node
  // const savedEl = el
  const parent = el.parentElement!

  // This serves as an "anchor" to mount the element back in if the provided expression returns true
  const anchor = new Comment('x-if')
  parent.insertBefore(anchor, el)

  const blocks: Block[] = [{ el, expr }]

  // Look for v-else-if and v-else elements and their expression
  let elseEl: Element | null
  let elseExpr: string | null
  while ((elseEl = el.nextElementSibling) !== null) {
    if (
      getAttr(elseEl, 'x-else') !== null
      || (elseExpr = getAttr(elseEl, 'x-else-if'))
    ) {
      parent.removeChild(elseEl)
      blocks.push({
        el: elseEl as HTMLElement,
        expr: elseExpr!,
      })
    }
    else {
      // If the NEXT sibling does not contain one of these,
      // stop checking. As only adjacent elements to the first
      // x-if can be tied to it. Gaps aren't allowed
      break
    }
  }

  parent.removeChild(el)

  // let currentIndex: number
  let currentResult: boolean

  watchStack(() => {
    // Iterate over each block and execute
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]

      /**
       * Iterate over blocks and evaluate each
       *  - If has expression
       *    - If expression is true, replace elements and break out of loop
       *    - If false, continue loop
       *  - If no expression
       *    - If previous result is true, ignore and break out of loop
       *    - If previous result is false, set to true, replace elements and break out of loop
       */

      console.log(currentResult)

      if (block.expr)
        currentResult = evaluate(scopeStack, block.expr, el) as boolean
      else
        currentResult = isNil(currentResult) ? true : !currentResult

      if (currentResult === true)
        parent.insertBefore(block.el, anchor)
      else if (currentResult === false)
        block.el.remove()
    }
  })
}
