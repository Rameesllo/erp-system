"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2, Search, Plus, X, AlertTriangle, DollarSign } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700",
  CARD: "bg-blue-100 text-blue-700",
  BANK_TRANSFER: "bg-purple-100 text-purple-700",
  CHEQUE: "bg-amber-100 text-amber-700",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ orderId: "", amount: "", method: "CASH", transactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [payData, ordersData] = await Promise.all([
        fetchApi("/api/payments"),
        fetchApi("/api/orders"),
      ]);
      setPayments(payData.payments || []);
      // Only show orders that are PENDING (need payment)
      setOrders(ordersData.orders?.filter((o: any) => o.status !== "CANCELLED" && o.status !== "COMPLETED") || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await fetchApi("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          orderId: formData.orderId,
          amount: Number(formData.amount),
          method: formData.method,
          transactionId: formData.transactionId || undefined,
        }),
      });
      setIsFormOpen(false);
      setFormData({ orderId: "", amount: "", method: "CASH", transactionId: "" });
      await load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const filtered = payments.filter(p =>
    p.order?.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.transactionId && p.transactionId.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCollected = payments.filter(p => p.status === "COMPLETED").reduce((s: number, p: any) => s + p.amount, 0);
  const selectedOrder = orders.find(o => o.id === formData.orderId);
  const alreadyPaid = selectedOrder?.payments?.filter((p: any) => p.status === "COMPLETED").reduce((s: number, p: any) => s + p.amount, 0) || 0;
  const remaining = selectedOrder ? selectedOrder.totalAmount - alreadyPaid : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Record and track customer payment transactions.</p>
        </div>
        <button onClick={() => { setIsFormOpen(true); setFormError(null); }} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 self-start">
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><CreditCard size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Transactions</p><p className="text-2xl font-bold text-slate-900">{payments.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><DollarSign size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Total Collected</p><p className="text-2xl font-bold text-slate-900">${totalCollected.toFixed(2)}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl"><CreditCard size={20} className="text-amber-600" /></div>
          <div><p className="text-sm text-slate-500">Pending Orders</p><p className="text-2xl font-bold text-slate-900">{orders.length}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by customer or transaction ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <CreditCard size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Customer</th>
                  <th className="px-6 py-4 font-medium text-left">Order</th>
                  <th className="px-6 py-4 font-medium text-left">Amount</th>
                  <th className="px-6 py-4 font-medium text-left">Method</th>
                  <th className="px-6 py-4 font-medium text-left">Transaction ID</th>
                  <th className="px-6 py-4 font-medium text-left">Status</th>
                  <th className="px-6 py-4 font-medium text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.order?.customer?.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{p.orderId.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${p.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${METHOD_COLORS[p.method] || "bg-slate-100 text-slate-600"}`}>{p.method.replace("_", " ")}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.transactionId || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Record Payment</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6">
              {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{formError}</div>}
              <form id="payForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order *</label>
                  <select required value={formData.orderId} onChange={e => setFormData({...formData, orderId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select order...</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.customer?.name} — ${o.totalAmount.toFixed(2)} ({o.status})</option>)}
                  </select>
                </div>
                {selectedOrder && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Order Total</span><span className="font-medium">${selectedOrder.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><span className="font-medium text-emerald-600">${alreadyPaid.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 mt-2 pt-2 font-semibold"><span>Remaining</span><span className="text-indigo-700">${remaining.toFixed(2)}</span></div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input required type="number" step="0.01" min="0.01" max={remaining || undefined} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                  <select required value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID (Optional)</label>
                  <input type="text" value={formData.transactionId} onChange={e => setFormData({...formData, transactionId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="TXN-12345" />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="payForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 min-w-[130px] justify-center">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
