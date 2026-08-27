"use client";

import { useState, useEffect } from "react";
import { ArrowUpDown, Loader2, Search, TrendingDown, TrendingUp, SlidersHorizontal } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const TYPE_CONFIG: Record<string, { label: string; color: string; sign: string; bg: string }> = {
  IN: { label: "Stock In", color: "text-emerald-600", sign: "+", bg: "bg-emerald-100 text-emerald-700" },
  OUT: { label: "Stock Out", color: "text-amber-600", sign: "-", bg: "bg-amber-100 text-amber-700" },
  ADJUSTMENT: { label: "Adjustment", color: "text-indigo-600", sign: "±", bg: "bg-indigo-100 text-indigo-700" },
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/stock-movements");
      setMovements(data.movements || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = movements.filter(m => {
    const matchSearch = m.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.product?.sku?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIn = movements.filter(m => m.type === "IN").reduce((s, m) => s + m.quantity, 0);
  const totalOut = movements.filter(m => m.type === "OUT").reduce((s, m) => s + Math.abs(m.quantity), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movements</h1>
          <p className="text-slate-500 text-sm mt-1">Complete audit trail of all inventory stock changes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl"><ArrowUpDown size={20} className="text-slate-600" /></div>
          <div><p className="text-sm text-slate-500">Total Movements</p><p className="text-2xl font-bold text-slate-900">{movements.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><TrendingUp size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Total Stock In</p><p className="text-2xl font-bold text-slate-900">+{totalIn.toLocaleString()}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl"><TrendingDown size={20} className="text-amber-600" /></div>
          <div><p className="text-sm text-slate-500">Total Stock Out</p><p className="text-2xl font-bold text-slate-900">-{totalOut.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by product name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />
            {["ALL", "IN", "OUT", "ADJUSTMENT"].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${typeFilter === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading movements...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <ArrowUpDown size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No stock movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Product</th>
                  <th className="px-6 py-4 font-medium text-left">Type</th>
                  <th className="px-6 py-4 font-medium text-left">Quantity</th>
                  <th className="px-6 py-4 font-medium text-left">Before</th>
                  <th className="px-6 py-4 font-medium text-left">After</th>
                  <th className="px-6 py-4 font-medium text-left">Reason / Reference</th>
                  <th className="px-6 py-4 font-medium text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => {
                  const cfg = TYPE_CONFIG[m.type] || { label: m.type, color: "text-slate-600", sign: "", bg: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{m.product?.name}</div>
                        <div className="text-xs text-slate-500">SKU: {m.product?.sku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>{cfg.label}</span>
                      </td>
                      <td className={`px-6 py-4 font-semibold text-lg ${cfg.color}`}>
                        {cfg.sign}{Math.abs(m.quantity)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{m.previousStock}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{m.newStock}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[200px]">
                        <p className="truncate">{m.reason || m.reference || m.notes || "—"}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
