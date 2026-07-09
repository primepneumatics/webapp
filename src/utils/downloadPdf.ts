import html2pdf from 'html2pdf.js'

export async function downloadPdf(element: HTMLElement, filename: string) {
  await html2pdf().set({
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(element).save()
}
