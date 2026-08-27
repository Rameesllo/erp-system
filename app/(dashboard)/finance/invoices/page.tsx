"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, Search, Eye, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  UNPAID: { label: "Unpaid", color: "bg-rose-100 text-rose-700", icon: AlertCircle },
  PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  PARTIAL: { label: "Partial", color: "bg-amber-100 text-amber-700", icon: Clock },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/invoices");
      setInvoices(data.invoices || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv =>
    inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    inv.order?.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s: number, i: any) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status === "UNPAID").reduce((s: number, i: any) => s + i.total, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage customer invoices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><FileText size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Invoices</p><p className="text-2xl font-bold text-slate-900">{invoices.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><CheckCircle size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Collected</p><p className="text-2xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl"><AlertCircle size={20} className="text-rose-600" /></div>
          <div><p className="text-sm text-slate-500">Outstanding</p><p className="text-2xl font-bold text-slate-900">${outstanding.toFixed(2)}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm text-slate-400 mt-1">Invoices are generated automatically when orders are created</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Invoice #</th>
                  <th className="px-6 py-4 font-medium text-left">Customer</th>
                  <th className="px-6 py-4 font-medium text-left">Subtotal</th>
                  <th className="px-6 py-4 font-medium text-left">Tax</th>
                  <th className="px-6 py-4 font-medium text-left">Discount</th>
                  <th className="px-6 py-4 font-medium text-left">Total</th>
                  <th className="px-6 py-4 font-medium text-left">Status</th>
                  <th className="px-6 py-4 font-medium text-left">Date</th>
                  <th className="px-6 py-4 font-medium text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] || { label: inv.status, color: "bg-slate-100 text-slate-600", icon: Clock };
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-indigo-700">{inv.invoiceNo}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.order?.customer?.name || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">${inv.subtotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-600">${inv.tax.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-600">-${inv.discount.toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">${inv.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Eye size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Invoice</p>
                <h2 className="text-lg font-bold text-slate-800">{selectedInvoice.invoiceNo}</h2>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-900">{selectedInvoice.order?.customer?.name}</p>
                  <p className="text-sm text-slate-500">{selectedInvoice.order?.customer?.email}</p>
                </div>
                <span className={`px-3 py-1.5 h-fit rounded-full text-sm font-medium ${(STATUS_CONFIG[selectedInvoice.status] || {}).color || "bg-slate-100 text-slate-600"}`}>{selectedInvoice.status}</span>
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-2">
                {selectedInvoice.order?.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.product?.name} <span className="text-slate-400">×{item.quantity}</span></span>
                    <span className="font-medium text-slate-900">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>${selectedInvoice.subtotal.toFixed(2)}</span></div>
                {selectedInvoice.tax > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Tax</span><span>+${selectedInvoice.tax.toFixed(2)}</span></div>}
                {selectedInvoice.discount > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Discount</span><span>-${selectedInvoice.discount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-100"><span>Total</span><span className="text-indigo-700">${selectedInvoice.total.toFixed(2)}</span></div>
              </div>
              <p className="text-xs text-slate-400">Issued: {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
