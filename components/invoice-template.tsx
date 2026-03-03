import { Invoice, OrganizationSettings } from "@/lib/types"

interface InvoiceTemplateProps {
    invoice: Invoice
    organization?: OrganizationSettings | null
}

export function InvoiceTemplate({ invoice, organization }: InvoiceTemplateProps) {
    if (!invoice) return null

    const companyName = organization?.name || "StrataForge Business Suite"
    const companyAddress = organization?.address || "Lusaka, Zambia"
    const companyEmail = organization?.email || "contact@strataforge.com"
    const companyPhone = organization?.phone || ""
    const bankName = organization?.bank_name || "FNB Zambia"
    const bankAccount = organization?.bank_account || "6655443322"
    const bankBranch = organization?.bank_branch || "Lusaka Main"
    const taxId = organization?.tax_id || ""

    return (
        <div id="printable-invoice" className="hidden print:block print:fixed print:top-0 print:left-0 print:w-full print:h-full print:bg-white print:z-[9999] print:p-8 text-black">
            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { visibility: hidden; }
                    #printable-invoice { visibility: visible; }
                    #printable-invoice * { visibility: visible; }
                }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b pb-8 border-gray-200">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
                    <p className="text-gray-500">#{invoice.invoice_number || "DRAFT"}</p>
                </div>
                <div className="text-right">
                    {organization?.logo_url && (
                        <img src={organization.logo_url} alt="Logo" className="w-16 h-16 object-contain ml-auto mb-2" />
                    )}
                    <h2 className="text-2xl font-bold text-blue-600 mb-1">{companyName}</h2>
                    <p className="text-sm text-gray-600">{companyAddress}</p>
                    <p className="text-sm text-gray-600">{companyEmail}</p>
                    {companyPhone && <p className="text-sm text-gray-600">{companyPhone}</p>}
                    {taxId && <p className="text-sm text-gray-600 mt-1">TPIN: {taxId}</p>}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Bill To</h3>
                    <div className="text-gray-900 space-y-1">
                        <p className="font-bold text-lg">{invoice.client?.name}</p>
                        {invoice.client?.contact_person && <p>Attn: {invoice.client.contact_person}</p>}
                        {invoice.client?.address && <p className="whitespace-pre-line">{invoice.client.address}</p>}
                        {invoice.client?.phone && <p>{invoice.client.phone}</p>}
                        {invoice.client?.email && <p>{invoice.client.email}</p>}
                        {invoice.client?.tpin && (
                            <p className="mt-2 font-medium text-sm text-gray-600">TPIN: {invoice.client.tpin}</p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Invoice Details</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Date Issued:</span>
                            <span className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Due Date:</span>
                            <span className="font-medium">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon Receipt'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="py-3 font-bold text-gray-600">Description</th>
                            <th className="py-3 font-bold text-gray-600 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-50">
                            <td className="py-4">
                                {invoice.project?.name ? `Project: ${invoice.project.name}` : 'Professional Services'}
                            </td>
                            <td className="py-4 text-right font-medium">
                                {invoice.currency} {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Total */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 border-t-2 border-gray-100 pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-blue-600">
                            {invoice.currency} {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
                <p>Thank you for doing business with us.</p>
                <div className="mt-4 flex justify-center gap-8">
                    <span>Bank: {bankName}</span>
                    <span>Account: {bankAccount}</span>
                    <span>Branch: {bankBranch}</span>
                </div>
            </div>
        </div>
    )
}
