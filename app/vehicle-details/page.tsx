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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function VehicleDetailsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    checkStatus: "",
    remarks: "",
  })

  useEffect(() => {
    const savedHistory = localStorage.getItem("workflowHistory")
    if (savedHistory) {
      const history = JSON.parse(savedHistory)
      const pending = history.filter(
        (item: any) => item.stage === "Actual Dispatch" && item.status === "Completed"
      )
      setPendingOrders(pending)
    }
  }, [])

  const handleAssignVehicle = async (order: any) => {
    setIsProcessing(true)
    try {
      const updatedOrder = {
        ...order,
        stage: "Vehicle Details",
        status: "Completed",
        vehicleData: {
          ...vehicleData,
          assignedAt: new Date().toISOString(),
        },
      }

      const savedHistory = localStorage.getItem("workflowHistory")
      const history = savedHistory ? JSON.parse(savedHistory) : []
      history.push(updatedOrder)
      localStorage.setItem("workflowHistory", JSON.stringify(history))
      localStorage.setItem("currentOrderData", JSON.stringify(updatedOrder))

      toast({
        title: "Vehicle Assigned",
        description: "Order moved to Material Load stage.",
      })

      setTimeout(() => {
        router.push("/material-load")
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
      const orderDateStr = order.actualDispatchData?.confirmedAt || order.timestamp
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
      title="Stage 6: Vehicle Details"
      description="Assign vehicle and driver for delivery."
      pendingCount={filteredPendingOrders.length}
      historyData={[]}
      partyNames={customerNames}
      onFilterChange={setFilterValues}
    >
      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>DO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPendingOrders.length > 0 ? (
              filteredPendingOrders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">Assign Vehicle</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Vehicle Details: {order.orderNo || "DO-005A"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="">
                            <h4 className="text-sm font-medium mb-4 text-muted-foreground">Vehicle Documents</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Fitness Certificate</Label>
                                <Input type="file" />
                              </div>
                              <div className="space-y-2">
                                <Label>Insurance</Label>
                                <Input type="file" />
                              </div>
                              <div className="space-y-2">
                                <Label>Tax Copy</Label>
                                <Input type="file" />
                              </div>
                              <div className="space-y-2">
                                <Label>Pollution Check</Label>
                                <Input type="file" />
                              </div>
                              <div className="space-y-2">
                                <Label>Permit 1</Label>
                                <Input type="file" />
                              </div>
                              <div className="space-y-2">
                                <Label>Permit 2 (Out State)</Label>
                                <Input type="file" />
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4 mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Check Status</Label>
                                <Select
                                  value={vehicleData.checkStatus}
                                  onValueChange={(value) =>
                                    setVehicleData({ ...vehicleData, checkStatus: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Accept">Accept</SelectItem>
                                    <SelectItem value="Reject">Reject</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Remarks</Label>
                                <Input
                                  value={vehicleData.remarks}
                                  onChange={(e) =>
                                    setVehicleData({ ...vehicleData, remarks: e.target.value })
                                  }
                                  placeholder="Enter remarks"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => handleAssignVehicle(order)}
                            disabled={!vehicleData.checkStatus || isProcessing}
                          >
                            {isProcessing ? "Processing..." : "Assign Vehicle"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-700">Awaiting Vehicle</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No orders pending for vehicle assignment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </WorkflowStageShell>
  )
}
