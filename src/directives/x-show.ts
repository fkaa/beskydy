import { type Directive, preProcessDirective } from '.'

/**
 * Takes in and evaluates an expression. Based on the result the element
 * is either shown or hidden in the DOM.
 */
export const processShow: Directive = function (ctx, node, { value, name }) {
  preProcessDirective(ctx, node, name, value)

  const expr = value

  if (!Reflect.has(node, 'style'))
    return

  ctx.effect(() => {
    const result = evaluate(ctx.$data, expr, node)
    if (result)
      (node as HTMLElement).style.removeProperty('display')
    else
      (node as HTMLElement).style.setProperty('display', 'none')
  })
}
