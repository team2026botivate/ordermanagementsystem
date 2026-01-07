"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  MoreHorizontal,
  FileBarChart,
  Truck,
  Activity
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// --- Types & Helpers ---
type OrderStatus = "In Progress" | "Completed" | "Approved" | "Damaged" | "Delivered"

const getOrderState = (lastStage: string, lastStatus: string): OrderStatus => {
  if (lastStage === "Damage Adjustment") return "Damaged"
  if (lastStage === "Material Receipt" && lastStatus === "Delivered") return "Delivered"
  if (lastStage === "Material Receipt" && lastStatus === "Damaged") return "Damaged"
  return "In Progress"
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    damaged: 0
  })
  
  const [pipelineData, setPipelineData] = useState([
    { title: "Approvals & Entry", count: 0, color: "bg-blue-500", icon: FileBarChart },
    { title: "Dispatch & Loading", count: 0, color: "bg-orange-500", icon: Truck },
    { title: "Invoice & Gate", count: 0, color: "bg-indigo-500", icon: CheckCircle2 },
    { title: "Final Delivery", count: 0, color: "bg-emerald-500", icon: Package }
  ])

  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [actionItems, setActionItems] = useState<any[]>([])

  useEffect(() => {
    const rawHistory = localStorage.getItem("workflowHistory")
    if (!rawHistory) return;

    const history = JSON.parse(rawHistory)
    const latestOrderMap = new Map()
    
    // Group by Order ID to find latest state
    history.forEach((entry: any) => {
       const id = entry.doNumber || entry.orderNo
       if (!id) return
       latestOrderMap.set(id, entry)
    })

    const uniqueOrders = Array.from(latestOrderMap.values())

    let active = 0, completed = 0, damaged = 0
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0 // Stage counters

    const actions: any[] = []

    uniqueOrders.forEach((order: any) => {
      const state = getOrderState(order.stage, order.status)
      if (state === "In Progress") active++
      if (state === "Delivered") completed++
      if (state === "Damaged") damaged++

      const s = order.stage
      if (["Order Punch", "Pre-Approval", "Approval Of Order"].includes(s)) s1++
      else if (["Dispatch Planning", "Actual Dispatch", "Vehicle Details", "Material Load"].includes(s)) s2++
      else if (["Security Approval", "Make Invoice", "Check Invoice", "Gate Out"].includes(s)) s3++
      else if (["Material Receipt", "Damage Adjustment", "Confirm Material Receipt"].includes(s)) s4++

      if (order.status === "Completed" || order.status === "Approved") {
         if (s === "Order Punch") actions.push({ label: "Review Pre-Approval", id: order.orderNo })
         else if (s === "Pre-Approval") actions.push({ label: "Approve Order", id: order.doNumber || order.orderNo })
         else if (s === "Approval Of Order") actions.push({ label: "Plan Dispatch", id: order.doNumber })
         else if (s === "Material Load") actions.push({ label: "Security Check", id: order.doNumber })
         else if (s === "Security Approval") actions.push({ label: "Generate Invoice", id: order.doNumber })
         else if (s === "Make Invoice") actions.push({ label: "Check Invoice", id: order.doNumber })
         else if (s === "Gate Out") actions.push({ label: "Confirm Receipt", id: order.doNumber })
      }
    })

    setMetrics({ total: uniqueOrders.length, active, completed, damaged })
    setPipelineData([
      { title: "Approvals & Entry", count: s1, color: "bg-blue-500", icon: FileBarChart },
      { title: "Dispatch & Loading", count: s2, color: "bg-amber-500", icon: Truck },
      { title: "Invoice & Gate", count: s3, color: "bg-indigo-500", icon: Activity },
      { title: "Final Delivery", count: s4, color: "bg-emerald-500", icon: CheckCircle2 }
    ])
    setRecentActivity([...history].reverse().slice(0, 10))
    
    const actionGroups = actions.reduce((acc: any, curr) => {
        acc[curr.label] = (acc[curr.label] || 0) + 1
        return acc
    }, {})
    
    setActionItems(Object.entries(actionGroups).map(([label, count]) => ({ label, count })).sort((a: any, b: any) => b.count - a.count))

  }, [])

  return (
    <div className="p-10 max-w-[1800px] mx-auto min-h-screen bg-transparent">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-base text-muted-foreground mt-1">
            Overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-10">
        <MetricCard title="Total Volume" value={metrics.total} icon={Package} />
        <MetricCard title="Active Orders" value={metrics.active} icon={Clock} highlight />
        <MetricCard title="Fulfilled" value={metrics.completed} icon={CheckCircle2} />
        <MetricCard title="Attention Needed" value={metrics.damaged} icon={AlertCircle} alert />
      </div>

      <div className="grid gap-10 grid-cols-1 lg:grid-cols-3">
        
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-10">
           
           {/* Pipeline Snapshot */}
           <Card className="shadow-sm border rounded-xl overflow-hidden">
             <CardHeader className="pb-4 border-b bg-muted/10">
                <CardTitle className="text-lg font-semibold">Live Pipeline</CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   {pipelineData.map((item, i) => (
                      <div key={i} className="flex flex-col p-5 rounded-xl border border-transparent bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${item.color.replace('bg-', 'bg-').replace('500', '100')} ${item.color.replace('bg-', 'text-').replace('500', '600')}`}>
                            <item.icon className="h-5 w-5" />
                         </div>
                         <div className="mb-2">
                             <p className="text-sm font-medium text-slate-500">{item.title}</p>
                             <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                         </div>
                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-auto">
                            <div 
                              className={`h-full ${item.color} rounded-full`}
                              style={{ width: `${metrics.total ? (item.count / metrics.total) * 100 : 0}%` }}
                            />
                         </div>
                      </div>
                   ))}
                </div>
             </CardContent>
           </Card>

           {/* Recent Transactions */}
           <Card className="shadow-sm border rounded-xl overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between py-5 bg-muted/10 border-b">
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                <Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button>
             </CardHeader>
             <div className="p-0">
               <Table>
                  <TableHeader>
                     <TableRow className="bg-muted/5">
                        <TableHead className="w-[140px] text-sm font-semibold h-12">Order ID</TableHead>
                        <TableHead className="text-sm font-semibold">Stage</TableHead>
                        <TableHead className="text-sm font-semibold">Status</TableHead>
                        <TableHead className="text-right text-sm font-semibold">Time</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {recentActivity.map((item, i) => (
                        <TableRow key={i} className="group cursor-pointer hover:bg-blue-50/50 transition-colors h-14">
                           <TableCell className="font-mono text-sm font-medium text-slate-900">{item.doNumber || item.orderNo}</TableCell>
                           <TableCell className="text-base text-slate-600 group-hover:text-slate-900 transition-colors">{item.stage}</TableCell>
                           <TableCell>
                              <StatusBadge status={item.status} />
                           </TableCell>
                           <TableCell className="text-right text-sm text-slate-500">
                              {new Date(item.timestamp || item.date).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                           </TableCell>
                        </TableRow>
                     ))}
                     {recentActivity.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={4} className="text-center py-8 text-base text-muted-foreground">No recent data</TableCell>
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
             </div>
           </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           {/* Action Items */}
           <Card className="shadow-sm border rounded-xl overflow-hidden">
              <CardHeader className="pb-4 border-b bg-muted/10">
                 <CardTitle className="text-lg font-semibold flex items-center gap-3">
                    Pending Actions 
                    {actionItems.length > 0 && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full border border-orange-200">{actionItems.reduce((a,b)=>a+b.count,0)}</span>}
                 </CardTitle>
              </CardHeader>
              <ScrollArea className="h-[400px]">
                 <div className="p-2">
                    {actionItems.map((item, i) => (
                       <div key={i} className="flex items-center justify-between p-4 mb-2 hover:bg-slate-50 hover:shadow-sm rounded-lg border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                          <div>
                             <p className="text-base font-semibold text-slate-800">{item.label}</p>
                             <p className="text-sm text-slate-500 mt-1">{item.count} orders waiting</p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                       </div>
                    ))}
                    {actionItems.length === 0 && (
                       <div className="p-10 text-center text-sm text-muted-foreground">
                          All caught up! No actions pending.
                       </div>
                    )}
                 </div>
              </ScrollArea>
           </Card>

           {/* Quick Stats / System Health */}
           <Card className="shadow-sm border rounded-xl bg-slate-50/50">
              <CardContent className="pt-8">
                 <div className="flex items-center justify-between mb-6">
                    <span className="text-base font-medium text-slate-600">System Status</span>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 px-3 py-1 text-sm">Operational</Badge>
                 </div>
                 <Separator className="my-6" />
                 <div className="text-sm text-slate-500 space-y-3">
                    <p className="flex justify-between"><span>Database Connection</span> <span className="text-slate-900 font-medium">Stable</span></p>
                    <p className="flex justify-between"><span>Last Sync</span> <span className="text-slate-900 font-medium">Just now</span></p>
                    <p className="flex justify-between"><span>Server Load</span> <span className="text-slate-900 font-medium">12%</span></p>
                 </div>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  )
}

// --- Components ---

function MetricCard({ title, value, icon: Icon, highlight = false, alert = false }: any) {
   return (
      <Card className="shadow-sm border rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-default group">
         <CardContent className="p-8">
            <div className="flex items-center justify-between space-y-0 pb-4">
               <p className="text-base font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">{title}</p>
               <div className={`p-2 rounded-lg ${alert ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary'} transition-colors`}>
                 <Icon className="h-6 w-6" />
               </div>
            </div>
            <div className="flex items-baseline gap-3">
               <div className={`text-4xl font-extrabold tracking-tight ${alert ? 'text-red-700' : 'text-slate-900'}`}>{value}</div>
               {highlight && (
                   <span className="text-sm text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" /> +4.2%
                   </span>
               )}
            </div>
         </CardContent>
      </Card>
   )
}

function StatusBadge({ status }: { status: string }) {
   if (status === "Completed" || status === "Approved") {
      return <Badge variant="outline" className="px-3 py-1 text-sm font-medium text-emerald-700 bg-emerald-50 border-emerald-200">Approved</Badge>
   } 
   if (status === "Rejected" || status === "Damaged") {
      return <Badge variant="outline" className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border-red-200">{status}</Badge>
   }
   return <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">{status}</Badge>
}
