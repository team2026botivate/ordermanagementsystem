"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { WorkflowStageShell } from "@/components/workflow/workflow-stage-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

export default function DispatchMaterialPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [dispatchData, setDispatchData] = useState({
    dispatchDate: "",
    dispatchTime: "",
    warehouseLocation: "",
    materialReady: false,
    packagingComplete: false,
    labelsAttached: false,
  })
  const [dispatchDetails, setDispatchDetails] = useState<Record<string, { qty: string, transportType: string }>>({})

  useEffect(() => {
    const savedHistory = localStorage.getItem("workflowHistory")
    if (savedHistory) {
      const history = JSON.parse(savedHistory)

      
      const completed = history.filter(
        (item: any) => (item.stage === "Dispatch Material" || item.stage === "Dispatch Planning") && item.status === "Completed"
      )
      setHistoryOrders(completed)
      
      const pending = history.filter(
        (item: any) => item.stage === "Approval Of Order" && item.status === "Approved"
      ).filter(
        (item: any) => 
          !completed.some((completedItem: any) => completedItem.doNumber === item.doNumber)
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

  const handleBulkDispatch = async () => {
    setIsProcessing(true)
    try {
      const savedHistory = localStorage.getItem("workflowHistory")
      const history = savedHistory ? JSON.parse(savedHistory) : []

      const ordersToDispatch = pendingOrders.filter((order) =>
        selectedOrders.includes(order.doNumber || order.orderNo)
      )

      const updatedOrders = ordersToDispatch.map((order) => {
        // Ensure we have a DO Number. If not, generate one or use OrderNo with prefix if needed
        const existingDoNumber = order.doNumber;
        // If orderNo matches DO format (DO-...), use it. Else generate or prefix.
        // For simplicity/robustness, if doNumber is missing, we can assign one.
        // If "hsfjk" is the orderNo, maybe make DO-hsfjk or just generate DO-{Random}
        // User requested distinct format "DO-001". Since we don't have a counter, we'll try to use orderNo if it looks like an ID, else "DO-" + orderNo
        
        const finalDoNumber = existingDoNumber || (order.orderNo?.startsWith("DO-") ? order.orderNo : `DO-${order.orderNo}`);

        return {
          ...order,
          doNumber: finalDoNumber, // Ensure this property is set for future stages
          stage: "Dispatch Planning",
          status: "Completed",
          dispatchData: {
            ...dispatchData,
            dispatchedAt: new Date().toISOString(),
            qtyToDispatch: dispatchDetails[order.doNumber || order.orderNo]?.qty || "",
            transportType: dispatchDetails[order.doNumber || order.orderNo]?.transportType || "",
          },
        }
      })

      // Update history
      updatedOrders.forEach((order) => history.push(order))
      localStorage.setItem("workflowHistory", JSON.stringify(history))
      
      // Update local state immediately
      setPendingOrders((prev) => prev.filter(order => !ordersToDispatch.some(d => (d.doNumber || d.orderNo) === (order.doNumber || order.orderNo))))
      setHistoryOrders((prev) => [...prev, ...updatedOrders])
      setSelectedOrders([])
      setDispatchDetails({})

      // Update current order data (just taking the last one as current context if needed, or arguably this might be less relevant for bulk)
      if (updatedOrders.length > 0) {
        localStorage.setItem("currentOrderData", JSON.stringify(updatedOrders[updatedOrders.length - 1]))
      }

      toast({
        title: "Materials Dispatched",
        description: `${updatedOrders.length} orders moved to Vehicle Details stage.`,
      })

      setTimeout(() => {
        router.push("/actual-dispatch")
      }, 1500)
    } finally {
      setIsProcessing(false)
    }
  }

  const allChecked = dispatchData.materialReady && dispatchData.packagingComplete && dispatchData.labelsAttached


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
      title="Stage 4: Dispatch Planning"
      description="Prepare and Dispatch Plannings for delivery."
      pendingCount={filteredPendingOrders.length}
      historyData={historyOrders.map((order) => ({
        date: new Date(order.dispatchData?.dispatchedAt || order.timestamp || new Date()).toLocaleDateString("en-GB"),
        stage: "Dispatch Planning",
        status: "Completed",
        remarks: order.dispatchData?.dispatchDate ? `Dispatched: ${order.dispatchData.dispatchDate}` : "Dispatched",
      }))}
      partyNames={customerNames}
      onFilterChange={setFilterValues}
    >
      <div className="flex justify-end">
        <Button
          onClick={handleBulkDispatch}
          disabled={selectedOrders.length === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : `Dispatch Selected (${selectedOrders.length})`}
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
              <TableHead>Products</TableHead>
              <TableHead className="w-[150px]">Qty to be Dispatch</TableHead>
              <TableHead className="w-[200px]">Type of Transporting</TableHead>
              <TableHead>Delivery From</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPendingOrders.length > 0 ? (
              filteredPendingOrders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.doNumber || order.orderNo)}
                      onCheckedChange={() => toggleSelectOrder(order.doNumber || order.orderNo)}
                      aria-label={`Select order ${order.doNumber || order.orderNo}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.doNumber || order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.productCount} Products</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="h-8"
                      value={dispatchDetails[order.doNumber || order.orderNo]?.qty || ""}
                      onChange={(e) =>
                        setDispatchDetails((prev) => ({
                          ...prev,
                          [order.doNumber || order.orderNo]: {
                             ...prev[order.doNumber || order.orderNo],
                             qty: e.target.value
                          }
                        }))
                      }
                      disabled={!selectedOrders.includes(order.doNumber || order.orderNo)}
                    />
                  </TableCell>
                   <TableCell>
                    <Select
                      value={dispatchDetails[order.doNumber || order.orderNo]?.transportType || ""}
                      onValueChange={(val) =>
                        setDispatchDetails((prev) => ({
                          ...prev,
                          [order.doNumber || order.orderNo]: {
                             ...prev[order.doNumber || order.orderNo],
                             transportType: val
                          }
                        }))
                      }
                      disabled={!selectedOrders.includes(order.doNumber || order.orderNo)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Stocl">In Stock</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {order.deliveryData?.deliveryFrom === "in-stock"
                      ? "In Stock"
                      : order.deliveryData?.deliveryFrom === "production"
                        ? "From Production"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-orange-100 text-orange-700">Pending Dispatch</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No orders pending for dispatch
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </WorkflowStageShell>
  )
}
