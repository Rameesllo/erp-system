"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Search, Loader2, AlertTriangle, X, Trash2, Eye } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Create order form state
  const [customerId, setCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; price: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [ordersData, custData, prodData] = await Promise.all([
        fetchApi("/api/orders"),
        fetchApi("/api/customers"),
        fetchApi("/api/products"),
      ]);
      setOrders(ordersData.orders || []);
      setCustomers(custData.customers || []);
      setProducts(prodData.products?.filter((p: any) => p.isActive && p.stock > 0) || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setOrderItems([...orderItems, { productId: p.id, quantity: 1, price: p.price, name: p.name }]);
  };

  const removeItem = (idx: number) => setOrderItems(orderItems.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "productId") {
      const p = products.find((p: any) => p.id === value);
      if (p) { updated[idx].price = p.price; updated[idx].name = p.name; }
    }
    setOrderItems(updated);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setFormError("Please select a customer"); return; }
    if (orderItems.length === 0) { setFormError("Add at least one item"); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      await fetchApi("/api/orders", {
        method: "POST",
        body: JSON.stringify({ customerId, items: orderItems.map(i => ({ productId: i.productId, quantity: i.quantity })) }),
      });
      setIsFormOpen(false);
      setOrderItems([]);
      setCustomerId("");
      await load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const filtered = orders.filter(o =>
    o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = orders.filter(o => o.status === "COMPLETED").reduce((s: number, o: any) => s + o.totalAmount, 0);
  const pending = orders.filter(o => o.status === "PENDING").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales & Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage customer sales orders.</p>
        </div>
        <button onClick={() => { setIsFormOpen(true); setFormError(null); setOrderItems([]); setCustomerId(""); }} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 self-start">
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><ShoppingCart size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Orders</p><p className="text-2xl font-bold text-slate-900">{orders.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl"><ShoppingCart size={20} className="text-amber-600" /></div>
          <div><p className="text-sm text-slate-500">Pending</p><p className="text-2xl font-bold text-slate-900">{pending}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><ShoppingCart size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Revenue (Completed)</p><p className="text-2xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by customer or order ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <ShoppingCart size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Order ID</th>
                  <th className="px-6 py-4 font-medium text-left">Customer</th>
                  <th className="px-6 py-4 font-medium text-left">Items</th>
                  <th className="px-6 py-4 font-medium text-left">Total</th>
                  <th className="px-6 py-4 font-medium text-left">Status</th>
                  <th className="px-6 py-4 font-medium text-left">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{o.customer?.name}</td>
                    <td className="px-6 py-4 text-slate-600">{o.items?.length || 0} items</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${o.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setSelectedOrder(o); setIsViewOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">New Sales Order</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{formError}</div>}
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
                  <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Order Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"><Plus size={14} />Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <select value={item.productId} onChange={e => updateItem(idx, "productId", e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:border-indigo-300">
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-indigo-300" />
                        <span className="text-sm font-medium text-slate-700 w-20 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {orderItems.length === 0 && <div className="text-center text-slate-400 text-sm py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">Click "Add Item" to add products to this order</div>}
                  </div>
                </div>
                {orderItems.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="bg-indigo-50 rounded-xl px-5 py-3 border border-indigo-100">
                      <span className="text-sm text-slate-600">Order Total: </span>
                      <span className="text-lg font-bold text-indigo-700">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="orderForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 min-w-[130px] justify-center">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {isViewOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Order #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setIsViewOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center">
                <div><p className="text-xs text-slate-500">Customer</p><p className="font-semibold text-slate-900">{selectedOrder.customer?.name}</p></div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selectedOrder.status] || "bg-slate-100 text-slate-600"}`}>{selectedOrder.status}</span>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Order Items</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div><p className="text-sm font-medium text-slate-900">{item.product?.name}</p><p className="text-xs text-slate-500">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p></div>
                      <span className="font-semibold text-slate-900">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-lg border-t border-slate-100">
                <span>Total</span>
                <span className="text-indigo-700">${selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400">Created: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
