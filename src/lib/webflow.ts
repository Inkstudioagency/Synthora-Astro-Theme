/**
 * Helpers for the interaction runtime (public/js/webflow.js).
 *
 * Webflow Interactions (IX3) find their targets with `[data-wf-target*='[["component","element"]']`,
 * so elements inside a Webflow component keep the `data-wf-target` they had in the template.
 */

/** Webflow site id the bundled interactions were published with (the `data-wf-site` attribute) */
export const WF_SITE = '6b03d9375de33e5d414c26b5';

/** Builds a `data-wf-target` value: [[[componentId, elementId], instancePath]] */
export function wfTarget(component: string, element: string, path: string[]): string {
  return JSON.stringify([[[component, element], path]]);
}
