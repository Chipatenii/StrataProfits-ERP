"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoicesView } from "./invoices-view"
import { QuotesView } from "./quotes-view"
import { PaymentsView } from "./payments-view"
import { PipelineView } from "./pipeline-view"

export function SalesView() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
                <p className="text-muted-foreground">Manage invoices, quotes, payments, and deals.</p>
            </div>

            <Tabs defaultValue="pipeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="quotes">Quotes</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-4">
                    <PipelineView />
                </TabsContent>
                <TabsContent value="invoices" className="space-y-4">
                    <InvoicesView />
                </TabsContent>
                <TabsContent value="quotes" className="space-y-4">
                    <QuotesView />
                </TabsContent>
                <TabsContent value="payments" className="space-y-4">
                    <PaymentsView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
