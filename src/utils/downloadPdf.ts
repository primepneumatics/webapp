import html2pdf from 'html2pdf.js'

// html2canvas (bundled in html2pdf.js) predates CSS Color 4 and can't parse
// oklch() — which is how Tailwind v4 defines its entire default palette, as
// CSS custom properties on :root (e.g. --color-gray-900: oklch(...)), inside
// an @layer block. Every utility class resolves through one of these
// variables, and html2canvas trips over the oklch() literal while parsing
// the stylesheet itself, not on any single element. Overriding the variables
// once at :root — with an unlayered <style> tag, which the cascade always
// ranks above any @layer rule regardless of source order — fixes every
// downstream color in one shot instead of chasing individual elements.
let scratchCtx: CanvasRenderingContext2D | null | undefined

function toRgb(value: string): string {
  if (!value.includes('oklch')) return value
  if (scratchCtx === undefined) scratchCtx = document.createElement('canvas').getContext('2d')
  if (!scratchCtx) return value
  try {
    scratchCtx.fillStyle = value
    return scratchCtx.fillStyle
  } catch {
    return value
  }
}

function buildRootColorOverrideCss(): string {
  const style = getComputedStyle(document.documentElement)
  const overrides: string[] = []
  for (let i = 0; i < style.length; i++) {
    const prop = style[i]
    if (!prop.startsWith('--')) continue
    const value = style.getPropertyValue(prop)
    if (!value.includes('oklch')) continue
    overrides.push(`${prop}: ${toRgb(value)};`)
  }
  return overrides.length ? `:root, :host { ${overrides.join(' ')} }` : ''
}

export async function downloadPdf(element: HTMLElement, filename: string) {
  await html2pdf().set({
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      onclone: (clonedDoc: Document) => {
        const css = buildRootColorOverrideCss()
        if (!css) return
        const style = clonedDoc.createElement('style')
        style.textContent = css
        clonedDoc.head.appendChild(style)
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(element).save()
}
