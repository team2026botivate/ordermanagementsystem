"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { WorkflowStageShell } from "@/components/workflow/workflow-stage-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

export default function ActualDispatchPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  useEffect(() => {
    const savedHistory = localStorage.getItem("workflowHistory")
    if (savedHistory) {
      const history = JSON.parse(savedHistory)
      
      const completed = history.filter(
        (item: any) => item.stage === "Actual Dispatch" && item.status === "Completed"
      )
      setHistoryOrders(completed)
      
      const pending = history.filter(
        (item: any) => (item.stage === "Dispatch Planning" || item.stage === "Dispatch Material") && item.status === "Completed"
      ).filter(
        (item: any) => 
          !completed.some((completedItem: any) => (completedItem.doNumber || completedItem.orderNo) === (item.doNumber || item.orderNo))
      )
      setPendingOrders(pending)
    }
  }, [])

  const toggleSelectAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(pendingOrders.map((order) => order.doNumber || order.orderNo))
    }
  }

  const toggleSelectOrder = (orderNo: string) => {
    if (!orderNo) return
    if (selectedOrders.includes(orderNo)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderNo))
    } else {
      setSelectedOrders([...selectedOrders, orderNo])
    }
  }

  const handleBulkConfirm = async () => {
    setIsProcessing(true)
    try {
      const savedHistory = localStorage.getItem("workflowHistory")
      const history = savedHistory ? JSON.parse(savedHistory) : []

      const ordersToDispatch = pendingOrders.filter((order) =>
        selectedOrders.includes(order.doNumber || order.orderNo)
      )

      const updatedOrders = ordersToDispatch.map((order) => ({
        ...order,
        stage: "Actual Dispatch",
        status: "Completed",
        actualDispatchData: {
          confirmedAt: new Date().toISOString(),
          dispatchedQty: order.dispatchData?.qtyToDispatch,
          transportMode: order.dispatchData?.transportType
        },
      }))

      // Update history
      updatedOrders.forEach((order) => history.push(order))
      localStorage.setItem("workflowHistory", JSON.stringify(history))
      
      // Update local state immediately
      setPendingOrders((prev) => prev.filter(order => !ordersToDispatch.some(d => (d.doNumber || d.orderNo) === (order.doNumber || order.orderNo))))
      setHistoryOrders((prev) => [...prev, ...updatedOrders])
      setSelectedOrders([])

      // Update current order data
      if (updatedOrders.length > 0) {
        localStorage.setItem("currentOrderData", JSON.stringify(updatedOrders[updatedOrders.length - 1]))
      }

      toast({
        title: "Dispatch Confirmed",
        description: `${updatedOrders.length} orders moved to Vehicle Details stage.`,
      })

      setTimeout(() => {
        router.push("/vehicle-details")
      }, 1500)
    } finally {
      setIsProcessing(false)
    }
  }

  /* Extract unique customer names */
  const customerNames = Array.from(new Set(pendingOrders.map(order => order.customerName || "Unknown")))

  const [filterValues, setFilterValues] = useState({
      status: "",
      startDate: "",
      endDate: "",
      partyName: ""
  })

  const filteredPendingOrders = pendingOrders.filter(order => {
      let matches = true
      
      // Filter by Party Name
      if (filterValues.partyName && filterValues.partyName !== "all" && order.customerName !== filterValues.partyName) {
          matches = false
      }

      // Filter by Date Range
      const orderDateStr = order.dispatchData?.dispatchDate || order.timestamp
      if (orderDateStr) {
          const orderDate = new Date(orderDateStr)
          if (filterValues.startDate) {
              const start = new Date(filterValues.startDate)
              start.setHours(0,0,0,0)
              if (orderDate < start) matches = false
          }
          if (filterValues.endDate) {
              const end = new Date(filterValues.endDate)
              end.setHours(23,59,59,999)
              if (orderDate > end) matches = false
          }
      }

      // Filter by Status (On Time / Expire)
      if (filterValues.status) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const targetDateStr = order.deliveryDate || order.timestamp
          if (targetDateStr) {
             const targetDate = new Date(targetDateStr)
             
             if (filterValues.status === "expire") {
                 if (targetDate < today) matches = true
                 else matches = false
             } else if (filterValues.status === "on-time") {
                 if (targetDate >= today) matches = true
                 else matches = false
             }
          }
      }

      return matches
  })

  return (
    <WorkflowStageShell
      title="Stage 5: Actual Dispatch"
      description="Confirm actual dispatch details before vehicle assignment."
      pendingCount={filteredPendingOrders.length}
      historyData={historyOrders.map((order) => ({
        date: new Date(order.actualDispatchData?.confirmedAt || order.timestamp || new Date()).toLocaleDateString("en-GB"),
        stage: "Actual Dispatch",
        status: "Completed",
        remarks: "Dispatch Confirmed",
      }))}
      partyNames={customerNames}
      onFilterChange={setFilterValues}
    >
      <div className="flex justify-end">
        <Button
          onClick={handleBulkConfirm}
          disabled={selectedOrders.length === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : `Confirm Dispatch (${selectedOrders.length})`}
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredPendingOrders.length > 0 && selectedOrders.length === filteredPendingOrders.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>DO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Qty to Dispatch</TableHead>
              <TableHead>Transport Type</TableHead>
              <TableHead>Delivery From</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPendingOrders.length > 0 ? (
              filteredPendingOrders.map((order, index) => { 
                const deliveryFrom = order.data?.orderData?.deliveryData?.deliveryFrom || order.deliveryData?.deliveryFrom;
                return (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.doNumber)}
                      onCheckedChange={() => toggleSelectOrder(order.doNumber)}
                      aria-label={`Select order ${order.doNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.doNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.dispatchData?.qtyToDispatch || "—"}</TableCell>
                  <TableCell className="capitalize">{order.dispatchData?.transportType?.replace("_", " ") || "—"}</TableCell>
                  <TableCell>
                    {deliveryFrom === "in-stock"
                      ? "In Stock"
                      : deliveryFrom === "production"
                        ? "From Production"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready to Confirm</Badge>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders pending for actual dispatch
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </WorkflowStageShell>
  )
}
