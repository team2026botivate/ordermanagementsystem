"use client"

import { Card } from "@/components/ui/card"
import { WorkflowStageShell } from "@/components/workflow/workflow-stage-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { saveWorkflowHistory } from "@/lib/storage-utils"
import { SKU_MASTER } from "@/lib/master-data"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"



export default function PreApprovalPage() {
  const { toast } = useToast()
  const router = useRouter()
  const PAGE_COLUMNS = [
    { id: "soNo", label: "DO No." },
    { id: "deliveryPurpose", label: "Order Type (Delivery Purpose)" },
    { id: "startDate", label: "Start Date" },
    { id: "endDate", label: "End Date" },
    { id: "deliveryDate", label: "Delivery Date" },
    { id: "orderType", label: "Order Type" },
    { id: "customerType", label: "Customer Type" },
    { id: "partySoDate", label: "Party DO Date" },
    { id: "customerName", label: "Customer Name" },
    { id: "oilType", label: "Oil Type" },
    { id: "ratePer15Kg", label: "Rate Per 15 kg" },
    { id: "ratePerLtr", label: "Rate Per Ltr." }, // Aggregated
    { id: "productName", label: "Product Name" },
    { id: "totalWithGst", label: "Total Amount with GST" },
    { id: "transportType", label: "Type of Transporting" },
    { id: "contactPerson", label: "Customer Contact Person Name" },
    { id: "whatsapp", label: "Customer Contact Person Whatsapp No." },
    { id: "address", label: "Customer Address" },
    { id: "paymentTerms", label: "Payment Terms" },
    { id: "advanceTaken", label: "Advance Payment to be Taken" },
    { id: "advanceAmount", label: "Advance Amount" },
    { id: "isBroker", label: "Is this order Through Broker" },
    { id: "brokerName", label: "Broker Name (If Order Through Broker)" },
    { id: "uploadSo", label: "Upload DO." },
  ]

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "soNo",
    "customerName",
    "deliveryPurpose",
    "deliveryDate",
    "oilType",
    "ratePer15Kg"
  ])
  const [isApproving, setIsApproving] = useState(false)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [preApprovalData, setPreApprovalData] = useState<any>(null)
  const [productRates, setProductRates] = useState<{ [key: string]: { skuName: string; approvalQty: string; rate: string; remark: string } }>({})
  const [overallRemark, setOverallRemark] = useState("")

  const [history, setHistory] = useState<any[]>([])
  const [skuMaster] = useState<string[]>(() => 
    SKU_MASTER
      .filter(sku => sku.status === "Active")
      .map(sku => sku.skuName)
  )
  const [skuSearch, setSkuSearch] = useState("")


  useEffect(() => {
    // 1. Load History
    const savedHistory = localStorage.getItem("workflowHistory")
    let historyData = []
    if (savedHistory) {
      historyData = JSON.parse(savedHistory)
      const stageHistory = historyData
        .filter((item: any) => item.stage === "Pre-Approval")
        .map((item: any) => ({
          ...item,
          date: item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-GB") : "-"),
          remarks: item.remarks || item.data?.overallRemark || "-"
        }))
      setHistory(stageHistory)
    }

    // 2. Load Persisted Pending Items
    const savedPending = localStorage.getItem("preApprovalPendingItems")
    let persistedPending = savedPending ? JSON.parse(savedPending) : []

    // 3. Load New Incoming Data
    const savedData = localStorage.getItem("orderData")
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        // Strict check: Only load into this page if it's explicitly for Pre-Approval
        if (data.stage === "Pre-Approval" || data.orderType === "pre-approval") {
             // Check if order is already processed in history
            const isProcessed = historyData.some(
                (item: any) => item.stage === "Pre-Approval" && (item.orderNo === (data.doNumber || "DO-XXXA"))
            )

            if (!isProcessed) {
                // Check if already in persisted list
                const exists = persistedPending.some((o: any) => 
                     (o.doNumber || o.orderNo) === (data.doNumber || data.orderNo)
                )
                
                if (!exists) {
                     persistedPending = [data, ...persistedPending]
                     localStorage.setItem("preApprovalPendingItems", JSON.stringify(persistedPending))
                     console.log("[Pre-Approval] Added new order to pending list:", data)
                }
            }
        }
      } catch (e) {
        console.error("Failed to parse orderData", e)
      }
    }

    // 4. Update State
    setPendingOrders(persistedPending)

    // 5. Load Pre-Approval Draft Data (if any)
    const savedPreApprovalData = localStorage.getItem("preApprovalData")
    if (savedPreApprovalData) {
      setPreApprovalData(JSON.parse(savedPreApprovalData))
    }
  }, [])

  const handleApprove = async (targetOrder: any) => {
    setIsApproving(true)
    try {
      const preApprovalSubmit = {
        ...preApprovalData,
        orderData: targetOrder,
        productRates,
        overallRemark,
        approvedAt: new Date().toISOString(),
        status: "approved",
      }
      
      // Centralized Storage Update
      const historyEntry = {
        orderNo: targetOrder?.doNumber || "DO-XXXA",
        customerName: targetOrder?.customerName || "Unknown",
        stage: "Pre-Approval",
        status: "Completed" as const,
        processedBy: "Current User",
        timestamp: new Date().toISOString(),
        remarks: overallRemark || "-",
        data: preApprovalSubmit,
        orderType: targetOrder.orderType || "pre-approval"
      }
      
      saveWorkflowHistory(historyEntry)

      localStorage.setItem("preApprovalData", JSON.stringify(preApprovalSubmit))
      localStorage.setItem(
        "commitmentReviewData",
        JSON.stringify({
          orderData: targetOrder,
          preApprovalData: preApprovalSubmit,
        }),
      )
      
      // Update local state immediately
      setHistory([...history.filter((h: any) => h.stage === "Pre-Approval"), historyEntry].map((item: any) => ({
          ...item,
          date: item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-GB") : "-"),
          remarks: item.remarks || item.data?.overallRemark || "-"
      })))
      
      const newPending = pendingOrders.filter(o => o.doNumber !== targetOrder.doNumber)
      setPendingOrders(newPending)
      localStorage.setItem("preApprovalPendingItems", JSON.stringify(newPending))

      toast({
        title: "Stage Completed",
        description: "Order moved to Before Entry in Commitment.",
      })
      setTimeout(() => {
        router.push("/approval-of-order")
      }, 1500)
    } finally {
      setIsApproving(false)
    }
  }



  const destinationColumnsCount = visibleColumns.length + 1
  
  /* Extract unique customer names */
  const customerNames = Array.from(new Set(pendingOrders.map(order => order.customerName || "Unknown")))

  const [filterValues, setFilterValues] = useState({
      status: "",
      startDate: "",
      endDate: "",
      partyName: ""
  })
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  const filteredPendingOrders = pendingOrders.filter(order => {
      let matches = true
      
      // Filter by Party Name
      if (filterValues.partyName && filterValues.partyName !== "all" && order.customerName !== filterValues.partyName) {
          matches = false
      }

      // Filter by Date Range (using deliveryDate or soDate as fallback)
      const orderDateStr = order.deliveryDate || order.soDate
      if (orderDateStr) {
          const orderDate = new Date(orderDateStr)
          if (filterValues.startDate) {
              const start = new Date(filterValues.startDate)
              if (orderDate < start) matches = false
          }
          if (filterValues.endDate) {
              const end = new Date(filterValues.endDate)
              if (orderDate > end) matches = false
          }
      }

      // Filter by Status (On Time / Expire)
      // "Expire" = deliveryDate is in the past
      // "On Time" = deliveryDate is today or future
      if (filterValues.status) {
          const today = new Date()
          today.setHours(0, 0, 0, 0) // normalized today
          
          if (orderDateStr) {
             const deliveryDate = new Date(orderDateStr)
             if (filterValues.status === "expire") {
                 if (deliveryDate >= today) matches = false
             } else if (filterValues.status === "on-time") {
                 if (deliveryDate < today) matches = false
             }
          }
      }

      return matches
  })

  return (
    <WorkflowStageShell
      title="Stage 2: Pre-Approval"
      description="Review and set rates for item requirements."
      pendingCount={filteredPendingOrders.length}
      historyData={history}
        partyNames={customerNames}
        onFilterChange={setFilterValues}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto bg-transparent">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px] max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PAGE_COLUMNS.map((col) => (
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
                {PAGE_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                  <TableHead key={col.id} className="whitespace-nowrap text-center">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                    No Data pending for Pre Approval
                  </TableCell>
                </TableRow>
              ) : filteredPendingOrders.map((rawOrder, i) => {
                  const CUSTOMER_MAP: Record<string, string> = {
                    cust1: "Acme Corp",
                    cust2: "Global Industries",
                    cust3: "Zenith Supply",
                  }
                  
                  const row = {
                   orderNo: rawOrder.doNumber || rawOrder.orderNo || "DO-XXXA",
                   deliveryPurpose: rawOrder.orderPurpose || "Week On Week",
                   customerType: rawOrder.customerType || "Existing",
                   orderType: rawOrder.orderType || "Regular",
                   soNo: rawOrder.soNumber || "DO-882",
                   partySoDate: rawOrder.soDate || "2024-03-21",
                   customerName: CUSTOMER_MAP[rawOrder.customerName] || rawOrder.customerName || "Acme Corp",
                   // Handle new date fields
                   startDate: rawOrder.startDate || "—",
                   endDate: rawOrder.endDate || "—",
                   deliveryDate: rawOrder.deliveryDate || "—",
                   // Handle Rates Aggregation
                   oilType: rawOrder.preApprovalProducts?.map((p: any) => p.oilType).join(", ") || rawOrder.oilType || "—",
                   ratePerLtr: rawOrder.preApprovalProducts?.map((p: any) => p.ratePerLtr).join(", ") || rawOrder.ratePerLtr || "—",
                   ratePer15Kg: rawOrder.preApprovalProducts?.map((p: any) => p.rateLtr).join(", ") || rawOrder.rateLtr || "—",
                   
                   itemConfirm: rawOrder.itemConfirm?.toUpperCase() || "YES",
                   productName: rawOrder.products?.map((p: any) => p.productName).join(", ") || "",
                   uom: rawOrder.products?.map((p: any) => p.uom).join(", ") || "",
                   orderQty: rawOrder.products?.map((p: any) => p.orderQty).join(", ") || "",
                   altUom: rawOrder.products?.map((p: any) => p.altUom).join(", ") || "",
                   altQty: rawOrder.products?.map((p: any) => p.altQty).join(", ") || "",
                   
                   // Extended Columns
                   totalWithGst: rawOrder.totalWithGst || "—",
                   transportType: rawOrder.transportType || "—",
                   contactPerson: rawOrder.contactPerson || "—",
                   whatsapp: rawOrder.whatsappNo || "—",
                   address: rawOrder.customerAddress || "—",
                   paymentTerms: rawOrder.paymentTerms || "—",
                   advanceTaken: rawOrder.advancePaymentTaken || "—",
                   advanceAmount: rawOrder.advanceAmount || "—",
                   isBroker: rawOrder.isBrokerOrder || "—",
                   brokerName: rawOrder.brokerName || "—",
                   uploadSo: "so_document.pdf",
                   
                   products: (rawOrder.preApprovalProducts && rawOrder.preApprovalProducts.length > 0) 
                             ? rawOrder.preApprovalProducts 
                             : (rawOrder.products || []),
                 }

                return (
                <TableRow key={i}>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                          Process
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="sm:max-w-6xl !max-w-6xl max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <DialogHeader className="border-b pb-4">
                          <DialogTitle className="text-xl font-bold text-slate-900 leading-none">Pre-Approval Form: {row.orderNo}</DialogTitle>
                          <DialogDescription className="text-slate-500 mt-1.5">Review product details, set required rates, and provide final remarks.</DialogDescription>
                        </DialogHeader>
                        
                        {/* Order Summary Section */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-8">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Party Name</Label>
                                    <p className="text-sm font-bold text-slate-900 leading-tight">{row.customerName}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Date</Label>
                                    <p className="text-sm font-medium text-slate-700">{row.partySoDate}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Type</Label>
                                    <p className="text-sm font-medium text-slate-700">{row.orderType}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Date</Label>
                                    <p className="text-sm font-medium text-slate-700">{row.deliveryDate}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">WhatsApp No.</Label>
                                    <p className="text-sm font-medium text-green-600 font-mono">{row.whatsapp || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Broker Name</Label>
                                    <p className="text-sm font-medium text-slate-700">{row.brokerName || "Direct"}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Type</Label>
                                    <p className="text-sm font-medium text-slate-700 capitalize">{row.customerType}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transport Type</Label>
                                    <p className="text-sm font-medium text-slate-700 capitalize">{row.transportType}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Terms</Label>
                                    <p className="text-sm font-medium text-slate-700">{row.paymentTerms}</p>
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Products</Label>
                                    <p className="text-sm font-medium text-slate-700 leading-tight">{row.oilType}</p>
                                </div>
                                
                            </div>
                        </div>

                        <div className="py-6 space-y-8">
                          {/* Products List */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1 uppercase tracking-tight">
                              <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                              Product List
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {row.products && row.products.length > 0 ? (
                                row.products.map((product: any, prodIdx: number) => {
                                    const pId = product.id ? String(product.id) : `idx-${prodIdx}`;
                                    return (
                                    <div key={pId} className="border border-slate-200 p-5 rounded-xl bg-white shadow-sm hover:border-blue-200 transition-colors flex flex-col gap-4">
                                      {/* Oil Type */}
                                      <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500">Oil Type</Label>
                                        <div className="h-10 flex items-center border rounded-lg px-3 bg-slate-50/50">
                                          <p className="text-sm font-bold text-blue-700 truncate">
                                            {product.oilType || product.productName || "—"}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* SKU Name */}
                                      <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500">SKU Name</Label>
                                        <Popover open={openPopoverId === pId} onOpenChange={(open) => setOpenPopoverId(open ? pId : null)}>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              className={cn(
                                                "h-10 w-full justify-between bg-white px-3 font-normal border-slate-200 hover:bg-slate-50 transition-colors text-sm",
                                                !productRates[pId]?.skuName && "text-muted-foreground"
                                              )}
                                            >
                                              <span className="truncate">{productRates[pId]?.skuName || "Select SKU.."}</span>
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-[300px] p-0 shadow-xl border-slate-200" align="start">
                                            <Command shouldFilter={false}>
                                              <CommandInput 
                                                  placeholder="Search SKU..." 
                                                  value={skuSearch}
                                                  onValueChange={setSkuSearch}
                                                  className="h-11 border-none focus:ring-0"
                                              />
                                              <CommandList 
                                                className="max-h-[300px] overflow-y-auto"
                                                onWheel={(e) => e.stopPropagation()}
                                              >
                                                {skuMaster.filter(s => s.toLowerCase().includes(skuSearch.toLowerCase())).length === 0 && (
                                                  <CommandEmpty className="py-8 text-sm text-slate-500 text-center font-medium">No SKU found matching "{skuSearch}"</CommandEmpty>
                                                )}
                                                <CommandGroup>
                                                  {skuMaster
                                                    .filter(sku => sku.toLowerCase().includes(skuSearch.toLowerCase()))
                                                    .map((sku) => (
                                                    <CommandItem
                                                      key={sku}
                                                      value={sku}
                                                      className="cursor-pointer py-2.5 px-4"
                                                      onSelect={() => {
                                                        setProductRates({
                                                          ...productRates,
                                                          [pId]: {
                                                            ...productRates[pId],
                                                            skuName: sku,
                                                          },
                                                        })
                                                        setSkuSearch("")
                                                        setOpenPopoverId(null)
                                                      }}
                                                    >
                                                      <Check
                                                        className={cn(
                                                          "mr-2 h-4 w-4 text-blue-600",
                                                          productRates[pId]?.skuName === sku
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                        )}
                                                      />
                                                      {sku}
                                                    </CommandItem>
                                                  ))}
                                                </CommandGroup>
                                              </CommandList>
                                            </Command>
                                          </PopoverContent>
                                        </Popover>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        {/* Approval Qty */}
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] uppercase font-bold text-slate-500">Approval Qty</Label>
                                          <Input
                                            className="h-10 bg-white border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all text-sm"
                                            type="number"
                                            placeholder="Enter Qty"
                                            value={productRates[pId]?.approvalQty || ""}
                                            onChange={(e) =>
                                              setProductRates({
                                                ...productRates,
                                                [pId]: {
                                                  ...productRates[pId],
                                                  approvalQty: e.target.value,
                                                },
                                              })
                                            }
                                          />
                                        </div>

                                        {/* Required Rate */}
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] uppercase font-bold text-slate-500">Required Rate</Label>
                                          <Input
                                            className={cn(
                                              "h-10 bg-white border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all text-sm font-semibold",
                                              (parseFloat(productRates[pId]?.rate || "0") < parseFloat(productRates[pId]?.approvalQty || "0")) && productRates[pId]?.rate
                                                ? "text-red-600 font-bold border-red-200 bg-red-50 focus:bg-red-50" 
                                                : "text-slate-900"
                                            )}
                                            type="number"
                                            placeholder="Enter Rate"
                                            value={productRates[pId]?.rate || ""}
                                            onChange={(e) =>
                                              setProductRates({
                                                ...productRates,
                                                [pId]: {
                                                  ...productRates[pId],
                                                  rate: e.target.value,
                                                },
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                    </div>
                                )})
                              ) : (
                                <div className="col-span-full text-muted-foreground text-sm py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No products added for this order</div>
                              )}
                            </div>
                          </div>

                          {/* Remarks Section */}
                          <div className="space-y-2 px-1">
                            <Label className="text-sm font-bold text-slate-700 uppercase tracking-tight">Remarks</Label>
                            <Textarea
                              placeholder="Enter internal remarks..."
                              className="min-h-[80px] bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100"
                              value={overallRemark}
                              onChange={(e) => setOverallRemark(e.target.value)}
                            />
                          </div>
                        </div>
                          <DialogFooter className="sm:justify-center gap-3 border-t pt-4">
                            <Button variant="ghost" className="min-w-[150px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                              Reject Order
                            </Button>
                            {(() => {
                               const isValid = row.products?.every((p: any) => {
                                   const rate = parseFloat(productRates[p.id]?.rate || "0")
                                   const approval = parseFloat(productRates[p.id]?.approvalQty || "0")
                                   return rate >= approval && rate > 0
                               })
                               
                               return (
                                <Button 
                                  onClick={() => handleApprove(rawOrder)} 
                                  disabled={isApproving || !isValid}
                                  className="min-w-[250px] h-11 text-base font-bold shadow-lg shadow-blue-100 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isApproving ? "Processing..." : "Submit Pre-Approval"}
                                </Button>
                               )
                            })()}
                          </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  {PAGE_COLUMNS.filter((col) => visibleColumns.includes(col.id)).map((col) => (
                    <TableCell key={col.id} className="whitespace-nowrap text-center">
                      {row[col.id as keyof typeof row]}
                    </TableCell>
                  ))}
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </Card>
      </div>
    </WorkflowStageShell>
  )
}