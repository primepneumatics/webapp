import html2pdf from 'html2pdf.js'

// html2canvas (bundled in html2pdf.js) predates CSS Color 4 and can't parse
// oklch() — which is what Tailwind v4's default palette resolves to via
// getComputedStyle in modern browsers. Work around it by resolving every
// color to rgb ourselves (a canvas 2D context normalizes any valid CSS color
// string to rgb) and inlining it onto html2canvas's cloned DOM before it renders.
const COLOR_PROPS = [
  'color', 'backgroundColor',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
] as const satisfies readonly (keyof CSSStyleDeclaration)[]

let scratchCtx: CanvasRenderingContext2D | null | undefined

function toRgb(value: string): string {
  if (!value || !value.includes('oklch')) return value
  if (scratchCtx === undefined) scratchCtx = document.createElement('canvas').getContext('2d')
  if (!scratchCtx) return value
  try {
    scratchCtx.fillStyle = value
    return scratchCtx.fillStyle
  } catch {
    return value
  }
}

function inlineResolvedColors(original: Element, clone: HTMLElement) {
  const computed = getComputedStyle(original)
  for (const prop of COLOR_PROPS) {
    clone.style[prop] = toRgb(computed[prop] as string)
  }
}

export async function downloadPdf(element: HTMLElement, filename: string) {
  await html2pdf().set({
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      onclone: (_doc: Document, clonedEl: HTMLElement) => {
        inlineResolvedColors(element, clonedEl)
        const originals = element.querySelectorAll('*')
        const clones = clonedEl.querySelectorAll('*')
        originals.forEach((orig, i) => {
          const clone = clones[i]
          if (clone instanceof HTMLElement) inlineResolvedColors(orig, clone)
        })
      },
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(element).save()
}
