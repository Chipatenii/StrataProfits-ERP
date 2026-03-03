"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoicesView } from "./invoices-view"
import { QuotesView } from "./quotes-view"
import { PaymentsView } from "./payments-view"
import { PipelineView } from "./pipeline-view"
import { TrendingUp } from "lucide-react"

export function SalesView() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-accent p-8 md:p-10 text-white shadow-2xl shadow-pink-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-rose-200" />
                        <span className="text-sm font-medium text-rose-100 uppercase tracking-wider">Revenue</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Sales</h1>
                    <p className="text-rose-100/80 text-lg">Manage invoices, quotes, payments, and deals</p>
                </div>
            </div>

            {/* Premium Tabs */}
            <Tabs defaultValue="pipeline" className="space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 h-auto flex-wrap">
                    <TabsTrigger
                        value="pipeline"
                        className="px-5 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/25"
                    >
                        Pipeline
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="px-5 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/25"
                    >
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger
                        value="quotes"
                        className="px-5 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/25"
                    >
                        Quotes
                    </TabsTrigger>
                    <TabsTrigger
                        value="payments"
                        className="px-5 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/25"
                    >
                        Payments
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-6">
                    <PipelineView />
                </TabsContent>
                <TabsContent value="invoices" className="space-y-6">
                    <InvoicesView />
                </TabsContent>
                <TabsContent value="quotes" className="space-y-6">
                    <QuotesView />
                </TabsContent>
                <TabsContent value="payments" className="space-y-6">
                    <PaymentsView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
