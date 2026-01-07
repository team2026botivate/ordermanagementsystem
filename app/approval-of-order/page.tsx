"use client"

import { Card } from "@/components/ui/card"
import { WorkflowStageShell } from "@/components/workflow/workflow-stage-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CommitmentReviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isConfirming, setIsConfirming] = useState(false)
  
  // State for list of orders
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null) // For the dialog interaction
  const [sourceOfMaterial, setSourceOfMaterial] = useState<string>("in-stock")

  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({
    rate: "approve",
    sku: "approve",
    credit: "approve",
    dispatch: "approve",
    overall: "approve",
    confirm: "approve",
  })

  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const savedHistory = localStorage.getItem("workflowHistory")
    let historyData = []
    if (savedHistory) {
      historyData = JSON.parse(savedHistory)
      // Filter for both old and new stage names to keep history visible
      const stageHistory = historyData.filter((item: any) => 
          item.stage === "Commitment Review" || item.stage === "Approval Of Order"
      )
      
      // Map history to match Shell expectations (date, remarks)
      // Create a map of Pre-Approval remarks for fallback
      const preApprovalMap = new Map();
      historyData.forEach((h: any) => {
          if (h.stage === "Pre-Approval" && h.orderNo) {
             // If multiple, later ones overwrite, which is usually fine or we want the one that led to this
             preApprovalMap.set(h.orderNo, h.data?.overallRemark || h.data?.preApprovalData?.overallRemark);
          }
      });

      const formattedHistory = stageHistory.map((item: any) => {
          let remark = item.remarks;
          if (!remark || remark === "-") {
              // Try to fetch from Pre-Approval
              remark = preApprovalMap.get(item.orderNo) || "Verified"; 
          }
          return {
            ...item,
            stage: "Approval Of Order", // Force display name update
            date: item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-GB") : "-"),
            remarks: remark
          }
      })
      setHistory(formattedHistory)
      
      // LOGIC: Use a "Latest Stage" approach to determine pending items.
      // Group history by Order No to find the most recent stage for each order.
      const latestStatusByOrder = new Map();
      
      historyData.forEach((entry: any) => {
          if (entry.orderNo) {
            latestStatusByOrder.set(entry.orderNo, entry);
          }
      });

      const pendingFromHistory: any[] = [];
      latestStatusByOrder.forEach((entry, orderNo) => {
          if (entry.stage === "Pre-Approval" && entry.status === "Completed") {
               // Extract the order data
               const orderData = entry.data?.orderData || entry.data || entry;
               // Attach the remark to the object for reference
               if (entry.data?.overallRemark) {
                   orderData.preApprovalRemark = entry.data.overallRemark;
               }
               pendingFromHistory.push(orderData);
          }
      });
      
      // Also merge in any single-item data from legacy/manual flow if needed.
      const savedCommitmentData = localStorage.getItem("commitmentReviewData")
      let directPending: any = null
      if (savedCommitmentData) {
         try {
             const parsed = JSON.parse(savedCommitmentData)
             if (parsed?.orderData) {
                 directPending = parsed.orderData
             }
         } catch (e) {
             console.error("Failed to parse commitmentReviewData", e)
         }
      }
      
      // Merge history pending and direct pending
      const mergedPending = [...pendingFromHistory]
      if (directPending) {
          const existsInPending = mergedPending.some(o => (o.doNumber || o.orderNo) === (directPending.doNumber || directPending.orderNo))
          if (!existsInPending) {
              mergedPending.unshift(directPending)
          }
      }

      setPendingOrders(mergedPending)
    }
  }, [])

  const checkItems = [
    { id: "rate", label: "Rate Right?" },
    { id: "sku", label: "We Deal in SKU?" },
    { id: "credit", label: "Credit OK?" },
    { id: "dispatch", label: "Dispatch Confirmed?" },
    { id: "overall", label: "Overall Status?" },
    { id: "confirm", label: "Customer Confirmation?" },
  ]

  const handleChecklistChange = (itemId: string, value: string) => {
    setChecklistValues((prev) => ({
      ...prev,
      [itemId]: value,
    }))
  }

  const handleConfirmCommitment = async () => {
    if (!selectedOrder) return;
    
    setIsConfirming(true)
    try {
      const hasRejection = Object.values(checklistValues).includes("reject")

      // Identify Order Number consistently
      const orderIdentifier = selectedOrder.doNumber || selectedOrder.soNumber || selectedOrder.orderNo || "ORD-XXX";

      // Cleanup local storage if this matches the single-item buffer
      const savedCommitmentData = localStorage.getItem("commitmentReviewData")
      if (savedCommitmentData) {
          try {
              const parsed = JSON.parse(savedCommitmentData)
              const directOrderNo = parsed?.orderData?.doNumber || parsed?.orderData?.orderNo
              if (directOrderNo === orderIdentifier) {
                  localStorage.removeItem("commitmentReviewData")
              }
          } catch (e) {}
      }

      if (hasRejection) {
        const historyEntry = {
          orderNo: orderIdentifier,
          customerName: selectedOrder.customerName || "Unknown",
          stage: "Approval Of Order", // Renamed from Commitment Review
          status: "Rejected",
          processedBy: "Current User",
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString("en-GB"),
          remarks: "Rejected by User",
          data: {
            orderData: selectedOrder,
            checklistResults: checklistValues,
            rejectedAt: new Date().toISOString(),
          },
          productCount: selectedOrder.products?.length || 0,
        }

        const existingHistory = localStorage.getItem("workflowHistory")
        const history = existingHistory ? JSON.parse(existingHistory) : []
        history.push(historyEntry)
        localStorage.setItem("workflowHistory", JSON.stringify(history))

        toast({
          title: "Order Rejected",
          description: "Order has been rejected and saved to history.",
          variant: "destructive",
        })

         // Update local state immediately
        setHistory((prev) => [...prev, historyEntry])
        setPendingOrders((prev) => prev.filter(o => (o.doNumber || o.orderNo) !== orderIdentifier))
        setSelectedOrder(null)

      } else {
        const finalData = {
          orderData: {
            ...selectedOrder,
            deliveryData: {
                deliveryFrom: sourceOfMaterial
            }
          },
          checklistResults: checklistValues,
          confirmedAt: new Date().toISOString(),
          status: "Approved",
        }

        const existingHistory = localStorage.getItem("workflowHistory")
        const currentHistory = existingHistory ? JSON.parse(existingHistory) : []
        
        const historyEntry = {
          orderNo: orderIdentifier,
          customerName: selectedOrder.customerName || "Unknown",
          stage: "Approval Of Order",
          status: "Approved",
          processedBy: "Current User",
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString("en-GB"),
          remarks: "Verified & Approved",
          data: finalData,
          productCount: selectedOrder.products?.length || 0,
        }

        currentHistory.push(historyEntry)
        localStorage.setItem("workflowHistory", JSON.stringify(currentHistory))
        
        // Update local state immediately
        setHistory((prev) => [...prev, historyEntry])
        setPendingOrders((prev) => prev.filter(o => (o.doNumber || o.orderNo) !== orderIdentifier))
        setSelectedOrder(null)

        toast({
          title: "Commitment Verified",
          description: "Order has been approved and moved to Dispatch Material.",
        })
        
        // Don't auto-redirect if there are more items, unless user wants to follow the flow. 
        // For now, staying on page is better for bulk processing, or we can redirect if list is empty.
        if (pendingOrders.length <= 1) {
             setTimeout(() => {
               router.push("/dispatch-material")
             }, 1000)
        }
      }
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <WorkflowStageShell
      title="Stage 3: Approval Of Order"
      description="Six-point verification check before commitment entry."
      pendingCount={pendingOrders.length}
      historyData={history}
    >
      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>DO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Credit Score</TableHead>
              <TableHead>Days Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order: any, index: number) => (
              <TableRow key={index}>
                <TableCell>
                  <Dialog open={selectedOrder?.doNumber === order.doNumber} onOpenChange={(open) => {
                      if (open) setSelectedOrder(order)
                      else setSelectedOrder(null)
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedOrder(order)}>Verify Order</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Verification Checklist: {selectedOrder?.soNumber || selectedOrder?.doNumber}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2 p-3 rounded-lg bg-muted/20">
                            <Label className="text-base font-semibold">Source of Material</Label>
                            <Select value={sourceOfMaterial} onValueChange={setSourceOfMaterial}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in-stock">In Stock</SelectItem>
                                    <SelectItem value="production">From Production</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {checkItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                            <Label className="text-base">{item.label}</Label>
                            <RadioGroup
                              value={checklistValues[item.id]}
                              onValueChange={(value) => handleChecklistChange(item.id, value)}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="approve" id={`${item.id}-ok`} />
                                <Label htmlFor={`${item.id}-ok`} className="text-green-600 cursor-pointer">
                                  Approve
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="reject" id={`${item.id}-no`} />
                                <Label htmlFor={`${item.id}-no`} className="text-red-600 cursor-pointer">
                                  Reject
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleConfirmCommitment}
                          disabled={isConfirming}
                          className="w-full"
                          variant={Object.values(checklistValues).includes("reject") ? "destructive" : "default"}
                        >
                          {isConfirming
                            ? "Processing..."
                            : Object.values(checklistValues).includes("reject")
                              ? "Reject & Save to History"
                              : "Approve All & Go to Dispatch Material"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell className="font-medium">{order.doNumber || order.orderNo || "DO-XXX"}</TableCell>
                <TableCell>{order.customerName || "Unknown"}</TableCell>
                <TableCell>
                  <span className="text-sm">
                    {order.products?.length || 0} {order.products?.length === 1 ? "Product" : "Products"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">Excellent</Badge>
                </TableCell>
                <TableCell>2 Days</TableCell>
              </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No orders pending for commitment review
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </WorkflowStageShell>
  )
}
