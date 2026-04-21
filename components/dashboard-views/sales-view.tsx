"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoicesView } from "./invoices-view"
import { QuotesView } from "./quotes-view"
import { PaymentsView } from "./payments-view"
import { PipelineView } from "./pipeline-view"

export function SalesView() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Sales</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage invoices, quotes, payments, and deals.</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pipeline" className="space-y-5">
                <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 h-auto inline-flex flex-wrap gap-0.5">
                    <TabsTrigger
                        value="pipeline"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Pipeline
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger
                        value="quotes"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Quotes
                    </TabsTrigger>
                    <TabsTrigger
                        value="payments"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Payments
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-5 mt-5">
                    <PipelineView />
                </TabsContent>
                <TabsContent value="invoices" className="space-y-5 mt-5">
                    <InvoicesView />
                </TabsContent>
                <TabsContent value="quotes" className="space-y-5 mt-5">
                    <QuotesView />
                </TabsContent>
                <TabsContent value="payments" className="space-y-5 mt-5">
                    <PaymentsView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
