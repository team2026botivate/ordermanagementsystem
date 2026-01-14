/**
 * Centralized Storage Utility for Order Management System
 * This helps maintain a single source of truth for orders and prevents data desync.
 */

export type OrderStatus = "Pending" | "Completed" | "Approved" | "Rejected" | "Cancelled" | "Damaged";

export interface OrderEntry {
  doNumber: string;
  soNumber?: string;
  orderNo?: string;
  stage: string;
  status: OrderStatus;
  timestamp: string;
  customerName: string;
  orderType: "regular" | "pre-approval";
  [key: string]: any; // Allow for extra metadata
}

/**
 * Adds an entry to the workflow history and ensures it's consistent.
 */
export const saveWorkflowHistory = (entry: Partial<OrderEntry>) => {
  if (typeof window === "undefined") return;

  try {
    const rawHistory = localStorage.getItem("workflowHistory");
    const history = rawHistory ? JSON.parse(rawHistory) : [];
    
    const newEntry: OrderEntry = {
      doNumber: entry.doNumber || entry.orderNo || entry.soNumber || "ORD-UNKNOWN",
      customerName: entry.customerName || "Unknown",
      stage: entry.stage || "Unknown",
      status: entry.status || "Pending",
      timestamp: entry.timestamp || new Date().toISOString(),
      orderType: entry.orderType || "regular",
      ...entry
    };

    history.push(newEntry);
    localStorage.setItem("workflowHistory", JSON.stringify(history));
    
    // Also update a 'masterOrders' map for quick lookup and reliability
    const rawMaster = localStorage.getItem("masterOrders");
    const master = rawMaster ? JSON.parse(rawMaster) : {};
    
    // Merge with existing master record to preserve fields (like orderType)
    const id = newEntry.doNumber;
    master[id] = {
      ...(master[id] || {}),
      ...newEntry
    };
    
    localStorage.setItem("masterOrders", JSON.stringify(master));
    
    return newEntry;
  } catch (error) {
    console.error("Failed to save workflow history:", error);
  }
};

/**
 * Gets the latest state of all orders.
 */
export const getMasterOrders = (): OrderEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const rawMaster = localStorage.getItem("masterOrders");
    if (rawMaster) {
      return Object.values(JSON.parse(rawMaster));
    }
    
    // Fallback: Reconstruct from history if master doesn't exist
    const rawHistory = localStorage.getItem("workflowHistory");
    if (!rawHistory) return [];
    
    const history = JSON.parse(rawHistory);
    const master: Record<string, any> = {};
    
    history.forEach((h: any) => {
       const id = h.doNumber || h.orderNo || h.soNumber;
       if (!id) return;
       master[id] = { ...(master[id] || {}), ...h };
    });
    
    return Object.values(master);
  } catch (e) {
    return [];
  }
};
