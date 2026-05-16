import jsPDF from 'jspdf'

interface InvoiceData {
  invoiceNumber: string
  date: string
  clientName: string
  projectName: string
  totalPrice: number
  depositPaid: number
  ownerName: string
  ownerEmail: string
  ownerPhone: string
}

export function generateInvoice(data: InvoiceData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const TEAL = [10, 182, 139] as [number, number, number]
  const DARK = [17, 24, 39] as [number, number, number]
  const GRAY = [107, 114, 128] as [number, number, number]
  const LIGHT = [249, 250, 251] as [number, number, number]
  const remaining = Math.max(0, data.totalPrice - data.depositPaid)
  const isPaid = remaining === 0

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, W, 42, 'F')

  // Brand name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('Hisabi', 14, 20)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 240, 230)
  doc.text('Business Management System', 14, 28)

  // Invoice label (right side)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('INVOICE', W - 14, 20, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 240, 230)
  doc.text(`#${data.invoiceNumber}`, W - 14, 28, { align: 'right' })
  doc.text(`Date: ${data.date}`, W - 14, 34, { align: 'right' })

  // ── Owner info ───────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, 42, W, 30, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('FROM', 14, 54)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(data.ownerName, 14, 60)
  doc.text(data.ownerEmail, 14, 66)
  doc.text(data.ownerPhone, 14, 72)

  // ── Client info ──────────────────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('BILL TO', W / 2, 54)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(data.clientName, W / 2, 60)
  if (data.projectName) doc.text(data.projectName, W / 2, 66)

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.5)
  doc.line(14, 78, W - 14, 78)

  // ── Table header ─────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.roundedRect(14, 82, W - 28, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', 20, 88.5)
  doc.text('Amount', W - 20, 88.5, { align: 'right' })

  // ── Table rows ───────────────────────────────────────────────────────────────
  const rows = [
    { label: `Project: ${data.projectName || data.clientName}`, amount: data.totalPrice, color: DARK as [number,number,number] },
    { label: 'Deposit paid', amount: -data.depositPaid, color: [5, 150, 105] as [number,number,number] },
  ]

  let y = 100
  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 248, 255)
      doc.rect(14, y - 5, W - 28, 11, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...row.color)
    doc.text(row.label, 20, y + 1)
    const amtStr = row.amount < 0 ? `- ${Math.abs(row.amount).toLocaleString()} DH` : `${row.amount.toLocaleString()} DH`
    doc.text(amtStr, W - 20, y + 1, { align: 'right' })
    y += 12
  })

  // ── Total box ─────────────────────────────────────────────────────────────────
  y += 6
  doc.setFillColor(...TEAL)
  doc.roundedRect(W - 90, y, 76, 22, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('REMAINING BALANCE', W - 52, y + 8, { align: 'center' })
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${remaining.toLocaleString()} DH`, W - 52, y + 18, { align: 'center' })

  // Status badge
  const badgeColor: [number, number, number] = isPaid ? [5, 150, 105] : remaining === data.totalPrice ? [239, 68, 68] : [245, 158, 11]
  const badgeLabel = isPaid ? 'PAID' : remaining === data.totalPrice ? 'UNPAID' : 'PARTIAL'
  doc.setFillColor(...badgeColor)
  doc.roundedRect(14, y + 4, 30, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeLabel, 29, y + 12, { align: 'center' })

  // ── Summary line ─────────────────────────────────────────────────────────────
  y += 38
  doc.setDrawColor(230, 234, 245)
  doc.setLineWidth(0.3)
  doc.line(14, y, W - 14, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Total: ${data.totalPrice.toLocaleString()} DH  |  Paid: ${data.depositPaid.toLocaleString()} DH  |  Due: ${remaining.toLocaleString()} DH`, W / 2, y + 8, { align: 'center' })

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.rect(0, 272, W, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Hisabi Pro', W / 2, 281, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 240, 230)
  doc.setFontSize(8)
  doc.text('Thank you for your business!', W / 2, 288, { align: 'center' })

  // Save
  doc.save(`Invoice-${data.clientName.replace(/\s+/g, '-')}-${data.invoiceNumber}.pdf`)
}
