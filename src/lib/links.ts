/**
 * Link helpers. Like Webflow, a link that points to the current page gets the
 * `w--current` class and `aria-current="page"` (the template styles active links with it).
 */

/** Normalises a path for comparisons ("/blogs/" -> "/blogs") */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
}

export function isCurrent(href: string, pathname: string): boolean {
  return href.startsWith('/') && !href.includes('#') && normalizePath(href) === normalizePath(pathname);
}

/**
 * Returns a `link(href, className)` function bound to the current page, whose result is spread
 * on an <a> element: `<a {...link('/pricing', 'navbar-link')}>`.
 */
export function linkFor(pathname: string) {
  return (href: string, className?: string) => {
    const current = isCurrent(href, pathname);
    const cls = [className, current ? 'w--current' : ''].filter(Boolean).join(' ');
    return {
      href,
      class: cls || undefined,
      'aria-current': current ? ('page' as const) : undefined,
    };
  };
}
