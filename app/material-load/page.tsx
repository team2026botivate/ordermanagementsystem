"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { WorkflowStageShell } from "@/components/workflow/workflow-stage-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings2 } from "lucide-react"
import { ALL_WORKFLOW_COLUMNS as ALL_COLUMNS } from "@/lib/workflow-columns"

export default function MaterialLoadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "orderNo",
    "customerName",
    "status",
  ])
  const [loadData, setLoadData] = useState({
    actualQty: "",
    weightmentSlip: "",
    rstNo: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
    totalWeight: "",
    grossWeightPacking: "",
    netWeightPacking: "",
    otherItemWeight: "",
    dharamkataWeight: "",
    differanceWeight: "",
    transporterName: "",
    reason: "",
    truckNo: "",
    vehicleNoPlateImage: "",
  })

  useEffect(() => {
    const savedHistory = localStorage.getItem("workflowHistory")
    if (savedHistory) {
      const history = JSON.parse(savedHistory)
      
      const completed = history.filter(
        (item: any) => item.stage === "Material Load" && item.status === "Completed"
      )
      setHistoryOrders(completed)

      const pending = history.filter(
        (item: any) => item.stage === "Vehicle Details" && item.status === "Completed"
      ).filter(
        (item: any) => 
          !completed.some((completedItem: any) => (completedItem.doNumber || completedItem.orderNo) === (item.doNumber || item.orderNo))
      )
      setPendingOrders(pending)
    }
  }, [])



  useEffect(() => {
    const netPacking = parseFloat(loadData.netWeightPacking) || 0
    const otherPacking = parseFloat(loadData.otherItemWeight) || 0
    const grossPacking = netPacking + otherPacking
    
    setLoadData(prev => ({
      ...prev,
      grossWeightPacking: (loadData.netWeightPacking || loadData.otherItemWeight) ? grossPacking.toFixed(2) : ""
    }))
  }, [loadData.netWeightPacking, loadData.otherItemWeight])

  useEffect(() => {
    const dharamWeight = parseFloat(loadData.dharamkataWeight) || 0
    const grossPacking = parseFloat(loadData.grossWeightPacking) || 0
    const diff = dharamWeight - grossPacking
    
    setLoadData(prev => ({
      ...prev,
      differanceWeight: (loadData.dharamkataWeight || loadData.grossWeightPacking) ? diff.toFixed(2) : ""
    }))
  }, [loadData.dharamkataWeight, loadData.grossWeightPacking])

  const handleSubmit = async (order: any) => {
    setIsProcessing(true)
    try {
      const updatedOrder = {
        ...order,
        stage: "Material Load",
        status: "Completed",
        loadData: {
          ...loadData,
          completedAt: new Date().toISOString(),
        },
      }

      const savedHistory = localStorage.getItem("workflowHistory")
      const history = savedHistory ? JSON.parse(savedHistory) : []
      history.push(updatedOrder)
      localStorage.setItem("workflowHistory", JSON.stringify(history))
      localStorage.setItem("currentOrderData", JSON.stringify(updatedOrder))

      // Update local state immediately
      const newPending = pendingOrders.filter(o => o.doNumber !== order.doNumber)
      setPendingOrders(newPending)
      setHistoryOrders((prev) => [...prev, updatedOrder])

      toast({
        title: "Material Loaded",
        description: "Order moved to Security Approval stage.",
      })

      setTimeout(() => {
        router.push("/security-approval")
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
      const orderDateStr = order.loadData?.completedAt || order.vehicleData?.assignedAt || order.timestamp
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
      title="Stage 7: Material Load"
      description="Record material loading details and weights."
      pendingCount={filteredPendingOrders.length}
      historyData={historyOrders.map((order) => ({
        date: new Date(order.loadData?.completedAt || new Date()).toLocaleDateString("en-GB"),
        stage: "Material Load",
        status: "Completed",
        remarks: `NET: ${order.loadData?.netWeight}kg`,
      }))}
      partyNames={customerNames}
      onFilterChange={setFilterValues}
      remarksColName="Weight Details"
    >
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-transparent">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px] max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={visibleColumns.includes(col.id)}
                  onCheckedChange={(checked) => {
                    setVisibleColumns((prev) => (checked ? [...prev, col.id] : prev.filter((id) => id !== col.id)))
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="border-none shadow-sm overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
              <TableRow>
                <TableHead className="w-[80px]">Action</TableHead>
                {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                  <TableHead key={col.id} className="whitespace-nowrap text-center">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendingOrders.length > 0 ? (
                filteredPendingOrders.map((order, index) => {
                   const prodNames = order.products?.map((p: any) => p.productName).join(", ") || "";
                   const uoms = order.products?.map((p: any) => p.uom).join(", ") || "";
                   const qtys = order.products?.map((p: any) => p.orderQty).join(", ") || "";
                   const altUoms = order.products?.map((p: any) => p.altUom).join(", ") || "";
                   const altQtys = order.products?.map((p: any) => p.altQty).join(", ") || "";
                   
                   const ratesLtr = order.preApprovalProducts?.map((p: any) => p.ratePerLtr).join(", ") || order.ratePerLtr || "—";
                   const rates15Kg = order.preApprovalProducts?.map((p: any) => p.rateLtr).join(", ") || order.rateLtr || "—";
                   const oilTypes = order.preApprovalProducts?.map((p: any) => p.oilType).join(", ") || order.oilType || "—";

                   const row = {
                     orderNo: order.doNumber || order.orderNo || "DO-XXX",
                     deliveryPurpose: order.orderPurpose || "—",
                     customerType: order.customerType || "—",
                     orderType: order.orderType || "—",
                     soNo: order.soNumber || "—",
                     partySoDate: order.soDate || order.partySoDate || "—",
                     customerName: order.customerName || "—",
                     itemConfirm: order.itemConfirm || "—",
                     productName: prodNames,
                     uom: uoms,
                     orderQty: qtys,
                     altUom: altUoms,
                     altQty: altQtys,
                     oilType: oilTypes,
                     ratePerLtr: ratesLtr,
                     ratePer15Kg: rates15Kg,
                     rateOfMaterial: order.rateMaterial || "—",
                     totalWithGst: order.totalWithGst || "—",
                     transportType: order.dispatchData?.transportType || "—",
                     uploadSo: "so_document.pdf",
                     contactPerson: order.contactPerson || "—",
                     whatsapp: order.whatsappNo || "—",
                     address: order.customerAddress || "—",
                     paymentTerms: order.paymentTerms || "—",
                     advanceTaken: order.advancePaymentTaken || "—",
                     advanceAmount: order.advanceAmount || "—",
                     isBroker: order.isBrokerOrder || "—",
                     brokerName: order.brokerName || "—",
                     deliveryDate: order.deliveryDate || "—",
                     qtyToDispatch: order.dispatchData?.qtyToDispatch || "—",
                     deliveryFrom: order.deliveryData?.deliveryFrom || "—",
                     status: "Ready to Load", // Special handling for badge
                   }

                   return (
                   <TableRow key={index}>
                     <TableCell>
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm"
                             onClick={() => {
                               setLoadData(prev => ({
                                 ...prev,
                                 actualQty: order.dispatchData?.qtyToDispatch || order.orderQty || ""
                               }))
                             }}
                           >
                             Load Material
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="sm:max-w-6xl !max-w-6xl max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-slate-900 leading-none">Material Load: {order.orderNo}</DialogTitle>
                              <DialogDescription className="text-slate-500 mt-1.5">Enter actual weights and verification details for dispatch.</DialogDescription>
                            </DialogHeader>

                            {/* Order Summary Section */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-8">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Party Name</Label>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">{order.customerName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Date</Label>
                                        <p className="text-sm font-medium text-slate-700">{order.soDate || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Type</Label>
                                        <p className="text-sm font-medium text-slate-700">{order.orderType}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Date</Label>
                                        <p className="text-sm font-medium text-slate-700">{order.deliveryDate}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">WhatsApp No.</Label>
                                        <p className="text-sm font-medium text-green-600 font-mono">{order.whatsappNo || "—"}</p>
                                    </div>
                                    
                                    {/* New Fetched Details */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actual Qty</Label>
                                        <p className="text-sm font-medium text-slate-700">{order.dispatchData?.qtyToDispatch || order.qtyToDispatch || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transport Type</Label>
                                        <p className="text-sm font-medium text-slate-700 capitalize">{order.dispatchData?.transportType || order.transportType || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery From</Label>
                                        <p className="text-sm font-medium text-slate-700">{order.dispatchData?.deliveryFrom || order.deliveryData?.deliveryFrom || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dispatch Date</Label>
                                        <p className="text-sm font-medium text-slate-700">
                                            {order.actualDispatchData?.confirmedAt 
                                                ? new Date(order.actualDispatchData.confirmedAt).toLocaleDateString("en-GB") 
                                                : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="py-6 space-y-8">
                              {/* Primary Logistics Section */}
                              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 px-1 flex items-center gap-2 uppercase tracking-tight">
                                  <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                  General Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Actual Qty</Label>
                                    <Input
                                      type="number"
                                      value={loadData.actualQty || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, actualQty: e.target.value }))}
                                      placeholder="Qty"
                                      className="bg-white border-slate-200 h-10"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">RST No</Label>
                                    <Input
                                      value={loadData.rstNo || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, rstNo: e.target.value }))}
                                      placeholder="RST No"
                                      className="bg-white border-slate-200 h-10"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Truck No.</Label>
                                    <Input
                                      value={loadData.truckNo || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, truckNo: e.target.value }))}
                                      placeholder="Truck No"
                                      className="bg-white border-slate-200 uppercase font-mono h-10"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Transporter Name</Label>
                                    <Input
                                      value={loadData.transporterName || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, transporterName: e.target.value }))}
                                      placeholder="Transporter"
                                      className="bg-white border-slate-200 h-10"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tare Weight</Label>
                                    <Input
                                      type="number"
                                      value={loadData.tareWeight || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, tareWeight: e.target.value }))}
                                      placeholder="Tare"
                                      className="bg-white border-slate-200 h-10 focus-visible:ring-blue-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Weight</Label>
                                    <Input
                                      type="number"
                                      value={loadData.totalWeight || ""}
                                      onChange={(e) => setLoadData(prev => ({ ...prev, totalWeight: e.target.value }))}
                                      placeholder="Total"
                                      className="bg-white border-slate-200 h-10 focus-visible:ring-blue-300"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Packing Weight Details */}
                                <div className="bg-indigo-50/30 p-4 rounded-lg border border-indigo-100 shadow-sm">
                                  <h3 className="text-sm font-bold text-indigo-800 mb-4 px-1 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    Packing As Per Weights
                                  </h3>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Net Weight As Per Packing</Label>
                                        <Input
                                          type="number"
                                          value={loadData.netWeightPacking || ""}
                                          onChange={(e) => setLoadData(prev => ({ ...prev, netWeightPacking: e.target.value }))}
                                          placeholder="Net"
                                          className="bg-white border-indigo-200"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Other Items As Per Packing</Label>
                                        <Input
                                          type="number"
                                          value={loadData.otherItemWeight || ""}
                                          onChange={(e) => setLoadData(prev => ({ ...prev, otherItemWeight: e.target.value }))}
                                          placeholder="Other"
                                          className="bg-white border-indigo-200"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Gross Weight As Per Packing</Label>
                                      <Input
                                        type="number"
                                        value={loadData.grossWeightPacking || ""}
                                        readOnly
                                        className="bg-indigo-100 border-indigo-200 font-bold text-indigo-700 pointer-events-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Dharamkata Verification */}
                                <div className="bg-amber-50/30 p-4 rounded-lg border border-amber-100 shadow-sm">
                                  <h3 className="text-sm font-bold text-amber-800 mb-4 px-1 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    Dharamkata Verification
                                  </h3>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Dharamkata Weight</Label>
                                        <Input
                                          type="number"
                                          value={loadData.dharamkataWeight || ""}
                                          onChange={(e) => setLoadData(prev => ({ ...prev, dharamkataWeight: e.target.value }))}
                                          placeholder="Weight"
                                          className="bg-white border-amber-200 focus-visible:ring-amber-500"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Difference</Label>
                                        <Input
                                          type="number"
                                          value={loadData.differanceWeight || ""}
                                          readOnly
                                          className="bg-amber-100 border-amber-200 font-bold text-amber-700 pointer-events-none"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Reason of Difference</Label>
                                      <Input
                                        value={loadData.reason || ""}
                                        onChange={(e) => setLoadData(prev => ({ ...prev, reason: e.target.value }))}
                                        placeholder="Reason if any"
                                        className="bg-white border-amber-200 focus-visible:ring-amber-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Uploads */}
                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                                  <div className="w-1 h-4 bg-slate-600 rounded-full" />
                                  Verification Artifacts
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Weightment Slip Copy</Label>
                                    <Input type="file" className="bg-white cursor-pointer" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vehicle No. Plate Image</Label>
                                    <Input type="file" className="bg-white cursor-pointer" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="border-t pt-4">
                              <Button variant="outline" className="mr-auto" onClick={() => (document.querySelector('[data-state="open"] button[aria-label="Close"]') as HTMLElement)?.click()}>
                                Cancel
                              </Button>
                              <Button onClick={() => handleSubmit(order)} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                                {isProcessing ? "Processing..." : "Submit & Continue"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      {ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                        <TableCell key={col.id} className="whitespace-nowrap text-center">
                          {col.id === "status" ? (
                             <div className="flex justify-center">
                                <Badge className="bg-indigo-100 text-indigo-700">Ready to Load</Badge>
                             </div>
                          ) : row[col.id as keyof typeof row]}
                        </TableCell>
                      ))}
                    </TableRow>
                    )
                 })
               ) : (
                 <TableRow>
                   <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                     No orders pending for material loading
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </Card>
       </div>
     </WorkflowStageShell>
   )
 }
