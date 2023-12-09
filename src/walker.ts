import { getAttr } from './helpers'
import type { ContextAny } from './context'
import { processRef } from './directives/x-ref'
import { processText } from './directives/x-text'
import { processStyle } from './directives/x-style'
import { processShow } from './directives/x-show'
import { processHTML } from './directives/x-html'
import { processBind } from './directives/x-bind'
import { processClass } from './directives/x-class'
import { processOn } from './directives/x-on'
import { processIf } from './directives/x-if'
import { processModel } from './directives/x-model'
import { processFor } from './directives/x-for'
import { processPortal } from './directives/x-portal'
import { processTextNode } from './text-node'
import { processData } from './directives/x-data'
import { processSwitch } from './directives/x-switch'
import { processSpy } from './directives/x-spy'
import { processInit } from './directives/x-init'

export enum NodeTypes {
  ELEMENT = 1,
  TEXT = 3,
}

export function walk(ctx: ContextAny, forcedRoot?: Element) {
  const rootEl = forcedRoot ?? ctx.root
  const walker = document.createTreeWalker(rootEl)
  let node: Node | null = walker.root

  // Before we process directives, we first iterate over any data
  // defining elements This will make sure that all the data objects are
  // available to all elements within a scope/ That means we can
  // reference a variable before it is defined. 

  // This approach might be against javascript conventions, but it is
  // important to remember that the nesting of elements should not
  // matter when usiny Beskydy. Each x-scope and all its descendants
  // should be treated as a single "scope".

  const rootDatasets = (rootEl).querySelectorAll('[x-data]')
  const rootScopeAttr = (rootEl).getAttributeNode('x-scope')

  if (rootScopeAttr) {
    processData(ctx, rootEl, rootScopeAttr)
  }

  for (const rootDataset of rootDatasets) {
    // We can ignore the fact that getAttributeNode can return null, as
    // all the iterated elements have explicitly been queried by the
    // `x-data` attribute
    processData(ctx, rootDataset, rootDataset.getAttributeNode('x-data')!)
  }

  ////////////////////////

  while (node) {
    switch (node.nodeType) {
      case NodeTypes.ELEMENT: {
        // Element
        const _node = node as HTMLElement

        // SECTION x-skip
        // Elements with x-skip will be skipped during evaluation. The
        // skip includes all elements children. Selects the next sibling.
        if (getAttr(_node, 'x-skip') !== null) {
          node = walker.nextSibling()
          continue
        }

        // SECTION x-portal
        // A section of DOM disconnected from the context
        // tree but still within the reactive scope. We essentially need
        // to create another walker within this walker to temporarily
        // traverse the detached dom tree
        let portalAttr
        if (portalAttr = Array.from(_node.attributes).find(a => a.name.startsWith('x-portal')))
          processPortal(ctx, _node, portalAttr)

        applyDirectives(ctx, _node)
        break;
      }

      case NodeTypes.TEXT: {
        // SECTION Text Node
        // 1. Save string
        // 2. Extract expression
        // 3. Replace entire content between delimiters with the result of the expression
        processTextNode(ctx, node)
        break;
      }
    }
    node = walker.nextNode()
  }
}

// Can be re-run on sub-sequent dom changes
export function applyDirectives(ctx: ContextAny, node: HTMLElement) {
  for (const attr of Array.from(node.attributes)) {
    // REVIEW 
    // Unsure if the order of attribute processing is correct,
    // but so far it hasn't posed any issues. Just adding this here so
    // later we do a real review

    // When scope has had its data registered, we can execute the mounted hook
    if (attr.name === 'x-init')
      processInit(ctx, node, attr)

    // In case if and for are on the same element, the if is removed.
    if (attr.name === 'x-for')
      processFor(ctx, node, attr)

    else if (attr.name === 'x-if')
      processIf(ctx, node, attr)

    if (attr.name === 'x-switch')
      processSwitch(ctx, node, attr)

    if (attr.name === 'x-ref')
      processRef(ctx, node, attr)

    if (attr.name.startsWith('x-model'))
      processModel(ctx, node, attr)

    if (attr.name.startsWith('x-bind') || attr.name.startsWith(':'))
      processBind(ctx, node, attr)

    if (attr.name.startsWith('@') || attr.name.startsWith('x-on'))
      processOn(ctx, node, attr)

    if (attr.name.startsWith('x-spy'))
      processSpy(ctx, node, attr)

    if (attr.name === 'x-text')
      processText(ctx, node, attr)

    if (attr.name === 'x-class')
      processClass(ctx, node, attr)

    if (attr.name === 'x-html')
      processHTML(ctx, node, attr)

    if (attr.name === 'x-style')
      processStyle(ctx, node, attr)

    if (attr.name === 'x-show')
      processShow(ctx, node, attr)

    // Custom directive implementation
    const keys = Object.keys(ctx.app.customDirectives)

    if (keys.length > 0) {
      for (const key of keys) {
        const directive = ctx.app.customDirectives[key]
        if (attr.name.startsWith(key))
          directive(ctx, node, attr)
      }
    }
  }
}
