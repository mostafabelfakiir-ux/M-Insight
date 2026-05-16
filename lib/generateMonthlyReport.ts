import jsPDF from 'jspdf'

export function generateMonthlyReport({
  lang,
  finances,
  losses,
  products,
  income,
  totalExp,
  totalCogs,
  netProfit
}: {
  lang: string
  finances: any[]
  losses: any[]
  products: any[]
  income: number
  totalExp: number
  totalCogs: number
  netProfit: number
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const TEAL = [10, 182, 139] as [number, number, number]
  const DARK = [17, 24, 39] as [number, number, number]
  const GRAY = [107, 114, 128] as [number, number, number]

  const now = new Date()
  const monthStr = now.toLocaleDateString(lang === 'ar' ? 'fr-FR' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })
  
  // Header
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, W, 42, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Hisabi', 14, 22)
  
  doc.setFontSize(14)
  doc.text(lang === 'en' ? 'Monthly Report' : 'Rapport Mensuel', W - 14, 22, { align: 'right' })
  doc.setFontSize(10)
  doc.text(monthStr, W - 14, 30, { align: 'right' })

  let y = 60
  
  // Title
  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(lang === 'en' ? 'Financial Summary' : 'Resume Financier', 14, y)
  
  y += 15
  
  const drawRow = (label: string, value: string, isTotal = false) => {
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
    doc.setTextColor(...(isTotal ? DARK : GRAY))
    doc.setFontSize(11)
    doc.text(label, 14, y)
    doc.text(value, W - 14, y, { align: 'right' })
    y += 10
  }

  drawRow(lang === 'en' ? 'Total Revenue' : 'Revenu Total', `${income.toLocaleString()} DH`)
  drawRow(lang === 'en' ? 'Total Expenses' : 'Depenses Totales', `${totalExp.toLocaleString()} DH`)
  drawRow(lang === 'en' ? 'Cost of Goods Sold (COGS)' : 'Cout des ventes (COGS)', `${totalCogs.toLocaleString()} DH`)
  
  doc.setDrawColor(230, 230, 230)
  doc.line(14, y - 5, W - 14, y - 5)
  
  drawRow(lang === 'en' ? 'Net Profit' : 'Benefice Net', `${netProfit.toLocaleString()} DH`, true)

  y += 15

  // Stock Summary
  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(lang === 'en' ? 'Inventory Summary' : 'Resume de l\'Inventaire', 14, y)

  y += 15

  const stockValue = products.reduce((s, p) => s + p.quantity * p.buyPrice, 0)
  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.quantity < 5).length

  drawRow(lang === 'en' ? 'Total Products' : 'Total des Produits', `${totalProducts}`)
  drawRow(lang === 'en' ? 'Total Inventory Value' : 'Valeur Totale du Stock', `${stockValue.toLocaleString()} DH`)
  drawRow(lang === 'en' ? 'Low Stock Items (< 5)' : 'Articles en Rupture (< 5)', `${lowStockProducts}`, lowStockProducts > 0)

  // Footer
  doc.setFillColor(...TEAL)
  doc.rect(0, 272, W, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Hisabi Pro - ' + monthStr, W / 2, 285, { align: 'center' })

  // Save
  doc.save(`Monthly-Report-${monthStr.replace(/\s+/g, '-')}.pdf`)
}
