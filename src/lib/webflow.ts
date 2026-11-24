/**
 * Helpers for the interaction runtime (public/js/site.js, exposed as `window.Synthora`).
 *
 * Interactions find their targets with `[data-wf-target*='[["component","element"]']`,
 * so elements that are animated keep the `data-wf-target` they had in the template.
 */

/** Builds a `data-wf-target` value: [[[componentId, elementId], instancePath]] */
export function wfTarget(component: string, element: string, path: string[]): string {
  return JSON.stringify([[[component, element], path]]);
}
