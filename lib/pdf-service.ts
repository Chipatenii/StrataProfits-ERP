import { jsPDF } from "jspdf"
import { Invoice, Quote, Payment } from "./types"

export class PDFService {
    /**
     * Generate PDF for a Quote
     */
    static async generateQuotePDF(quote: Quote) {
        const doc = new jsPDF()
        const primaryColor = "#2563eb" // blue-600

        // Header
        doc.setFontSize(22)
        doc.setTextColor(primaryColor)
        doc.text("QUOTE / PROPOSAL", 20, 30)

        doc.setFontSize(10)
        doc.setTextColor("#64748b")
        doc.text(`No: ${quote.quote_number || 'DRAFT'}`, 20, 38)
        doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, 20, 43)

        // Client Info
        doc.setFontSize(12)
        doc.setTextColor("#1e293b")
        doc.text("CLIENT", 20, 60)
        doc.setFontSize(10)
        doc.text(quote.client?.name || "Client Name", 20, 67)
        doc.text(quote.client?.email || "", 20, 72)
        doc.text(quote.client?.location || "", 20, 77)

        // Items Table Header
        let y = 95
        doc.setFillColor("#f1f5f9")
        doc.rect(20, y, 170, 10, "F")
        doc.setFontSize(9)
        doc.setTextColor("#475569")
        doc.text("Description", 25, y + 7)
        doc.text("Qty", 120, y + 7)
        doc.text("Price", 140, y + 7)
        doc.text("Total", 170, y + 7)

        // Items
        y += 15
        doc.setTextColor("#1e293b")
        quote.items?.forEach((item) => {
            doc.text(item.description, 25, y)
            doc.text(item.quantity.toString(), 120, y)
            doc.text(item.unit_price.toLocaleString(), 140, y)
            doc.text(item.total.toLocaleString(), 170, y)
            y += 8
        })

        // Totals
        y += 10
        const totalX = 140
        const valueX = 170
        doc.text("Subtotal:", totalX, y)
        doc.text(`${quote.currency} ${quote.amount?.toLocaleString() || '0'}`, valueX, y)

        if (quote.discount_amount) {
            y += 8
            doc.text(`Discount (${quote.discount_rate}%):`, totalX, y)
            doc.text(`- ${quote.discount_amount.toLocaleString()}`, valueX, y)
        }

        if (quote.adjustment) {
            y += 8
            doc.text("Adjustment:", totalX, y)
            doc.text(quote.adjustment.toLocaleString(), valueX, y)
        }

        y += 10
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Grand Total:", totalX, y)
        doc.text(`${quote.currency} ${quote.amount?.toLocaleString() || '0'}`, valueX, y)

        // Notes
        if (quote.notes) {
            y += 20
            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            doc.setTextColor("#64748b")
            doc.text("Notes:", 20, y)
            doc.setFontSize(9)
            doc.text(quote.notes, 20, y + 7, { maxWidth: 170 })
        }

        doc.save(`Quote_${quote.quote_number || 'Draft'}.pdf`)
    }

    /**
     * Generate PDF for an Invoice
     */
    static async generateInvoicePDF(invoice: Invoice) {
        const doc = new jsPDF()
        const primaryColor = "#2563eb"

        doc.setFontSize(22)
        doc.setTextColor(primaryColor)
        doc.text("INVOICE", 20, 30)

        doc.setFontSize(10)
        doc.setTextColor("#64748b")
        doc.text(`No: ${invoice.invoice_number || 'DRAFT'}`, 20, 38)
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 43)
        if (invoice.due_date) doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 48)

        doc.setFontSize(12)
        doc.setTextColor("#1e293b")
        doc.text("BILL TO", 20, 65)
        doc.setFontSize(10)
        doc.text(invoice.client?.name || "Client Name", 20, 72)
        doc.text(invoice.client?.email || "", 20, 77)

        let y = 95
        doc.setFillColor("#f1f5f9")
        doc.rect(20, y, 170, 10, "F")
        doc.setFontSize(9)
        doc.text("Description", 25, y + 7)
        doc.text("Qty", 120, y + 7)
        doc.text("Price", 140, y + 7)
        doc.text("Total", 170, y + 7)

        y += 15
        invoice.items?.forEach((item) => {
            doc.text(item.description, 25, y)
            doc.text(item.quantity.toString(), 120, y)
            doc.text(item.unit_price.toLocaleString(), 140, y)
            doc.text(item.total.toLocaleString(), 170, y)
            y += 8
        })

        y += 10
        doc.text("Total Amount:", 140, y)
        doc.text(`${invoice.currency} ${invoice.amount.toLocaleString()}`, 170, y)

        doc.save(`Invoice_${invoice.invoice_number || 'Draft'}.pdf`)
    }

    /**
     * Generate PDF for a Payment/Receipt
     */
    static async generatePaymentPDF(payment: Payment, invoiceNumber: string, clientName: string) {
        const doc = new jsPDF()

        doc.setFontSize(22)
        doc.setTextColor("#059669") // emerald-600
        doc.text("PAYMENT RECEIPT", 20, 30)

        doc.setFontSize(10)
        doc.setTextColor("#64748b")
        doc.text(`Receipt No: ${payment.receipt_number || 'N/A'}`, 20, 38)
        doc.text(`Date: ${new Date(payment.paid_at).toLocaleDateString()}`, 20, 43)

        doc.setFontSize(12)
        doc.setTextColor("#1e293b")
        doc.text("RECEIVED FROM", 20, 60)
        doc.setFontSize(10)
        doc.text(clientName, 20, 67)

        doc.rect(20, 80, 170, 40)
        doc.text("Payment Details", 25, 87)
        doc.setFontSize(14)
        doc.text(`Amount: ${payment.currency} ${payment.amount.toLocaleString()}`, 25, 97)
        doc.setFontSize(10)
        doc.text(`Payment Method: ${payment.method || 'N/A'}`, 25, 107)
        doc.text(`Invoice Reference: ${invoiceNumber}`, 25, 114)

        doc.save(`Receipt_${payment.receipt_number || 'Payment'}.pdf`)
    }
}
