"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, TrendingDown, TrendingUp, RefreshCcw, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

export default function InventoryDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, movementsData] = await Promise.all([
        fetchApi("/api/inventory/stats"),
        fetchApi("/api/stock-movements")
      ]);
      setStats(statsData.stats);
      setMovements(movementsData.movements || []);
    } catch (err: any) {
      alert("Failed to load dashboard data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor your stock levels, movements, and product categories.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDashboardData} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 disabled:opacity-50">
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Sync Stock
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={32} /> Loading dashboard...
        </div>
      ) : (
        <>
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InventoryStat 
              title="Total Items in Stock" 
              value={stats?.totalItems?.toLocaleString() || "0"} 
              icon={<Package size={20} className="text-indigo-600" />} 
              color="indigo"
            />
            <InventoryStat 
              title="Low Stock Alerts" 
              value={(stats?.lowStockCount + stats?.outOfStockCount)?.toLocaleString() || "0"} 
              icon={<AlertTriangle size={20} className="text-rose-600" />} 
              color="rose"
            />
            <InventoryStat 
              title="Stock In (This Week)" 
              value={`+${stats?.stockIn?.toLocaleString() || "0"}`} 
              icon={<TrendingUp size={20} className="text-emerald-600" />} 
              color="emerald"
            />
            <InventoryStat 
              title="Stock Out (This Week)" 
              value={`-${stats?.stockOut?.toLocaleString() || "0"}`} 
              icon={<TrendingDown size={20} className="text-amber-600" />} 
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Recent Movements */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Recent Stock Movements</h2>
              </div>
              
              <div className="overflow-x-auto flex-1">
                {movements.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">No recent stock movements.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-l-lg">Product</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Qty</th>
                        <th className="px-4 py-3 font-medium rounded-r-lg">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.slice(0, 10).map((movement) => (
                        <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-medium text-slate-900">{movement.product?.name}</td>
                          <td className="px-4 py-4 text-slate-500">{movement.product?.sku}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              movement.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 
                              movement.type === 'OUT' ? 'bg-amber-100 text-amber-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {movement.type}
                            </span>
                          </td>
                          <td className={`px-4 py-4 font-medium ${
                            movement.type === 'IN' ? 'text-emerald-600' : 
                            movement.type === 'OUT' ? 'text-amber-600' : 'text-indigo-600'
                          }`}>
                            {movement.type === 'OUT' ? '-' : '+'}{movement.quantity}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {new Date(movement.createdAt).toLocaleDateString()} {new Date(movement.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Needs Attention</h2>
              <div className="space-y-4">
                {(!stats?.needsAttention || stats.needsAttention.length === 0) ? (
                  <div className="text-center text-slate-500 py-6">All stock levels look good!</div>
                ) : (
                  stats.needsAttention.map((item: any) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 border rounded-xl ${
                      item.stock <= 0 ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.stock <= 0 ? 'bg-rose-100' : 'bg-amber-100'
                        }`}>
                          <AlertTriangle size={18} className={item.stock <= 0 ? "text-rose-600" : "text-amber-600"} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${item.stock <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {item.stock} left
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase">Min: {item.minStock}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InventoryStat({ title, value, icon, color }: any) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-50',
    rose: 'bg-rose-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50'
  };
  
  const borderColors: Record<string, string> = {
    indigo: 'border-indigo-100',
    rose: 'border-rose-100',
    emerald: 'border-emerald-100',
    amber: 'border-amber-100'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
      <div className={`p-3 rounded-xl ${bgColors[color]} border ${borderColors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
