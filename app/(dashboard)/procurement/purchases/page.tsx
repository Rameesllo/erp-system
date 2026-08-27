"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus, Search, Loader2, AlertTriangle, X, Trash2, Eye } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<{ productId: string; quantity: number; unitPrice: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [pData, sData, prodData] = await Promise.all([
        fetchApi("/api/purchases"),
        fetchApi("/api/suppliers"),
        fetchApi("/api/products"),
      ]);
      setPurchases(pData.purchases || []);
      setSuppliers(sData.suppliers || []);
      setProducts(prodData.products?.filter((p: any) => p.isActive) || []);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setPurchaseItems([...purchaseItems, { productId: p.id, quantity: 1, unitPrice: p.costPrice || p.price, name: p.name }]);
  };

  const removeItem = (idx: number) => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...purchaseItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "productId") {
      const p = products.find((p: any) => p.id === value);
      if (p) { updated[idx].unitPrice = p.costPrice || p.price; updated[idx].name = p.name; }
    }
    setPurchaseItems(updated);
  };

  const totalAmount = purchaseItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { setFormError("Please select a supplier"); return; }
    if (purchaseItems.length === 0) { setFormError("Add at least one item"); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      await fetchApi("/api/purchases", {
        method: "POST",
        body: JSON.stringify({ supplierId, items: purchaseItems }),
      });
      setIsFormOpen(false);
      setPurchaseItems([]);
      setSupplierId("");
      await load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const filtered = purchases.filter(p =>
    p.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = purchases.reduce((s: number, p: any) => s + p.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage stock purchasing from your suppliers.</p>
        </div>
        <button onClick={() => { setIsFormOpen(true); setFormError(null); setPurchaseItems([]); setSupplierId(""); }} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 self-start">
          <Plus size={16} /> New Purchase Order
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><ClipboardList size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Orders</p><p className="text-2xl font-bold text-slate-900">{purchases.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl"><ClipboardList size={20} className="text-amber-600" /></div>
          <div><p className="text-sm text-slate-500">Pending</p><p className="text-2xl font-bold text-slate-900">{purchases.filter(p => p.status === "PENDING").length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl"><ClipboardList size={20} className="text-rose-600" /></div>
          <div><p className="text-sm text-slate-500">Total Spend</p><p className="text-2xl font-bold text-slate-900">${totalSpend.toFixed(2)}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by supplier or order ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading purchases...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <ClipboardList size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No purchase orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">PO ID</th>
                  <th className="px-6 py-4 font-medium text-left">Supplier</th>
                  <th className="px-6 py-4 font-medium text-left">Items</th>
                  <th className="px-6 py-4 font-medium text-left">Total</th>
                  <th className="px-6 py-4 font-medium text-left">Status</th>
                  <th className="px-6 py-4 font-medium text-left">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">#{p.id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{p.supplier?.name}</td>
                    <td className="px-6 py-4 text-slate-600">{p.items?.length || 0} items</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${p.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setSelectedPurchase(p); setIsViewOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Eye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">New Purchase Order</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{formError}</div>}
              <form id="poForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
                  <select required value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"><Plus size={14} />Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {purchaseItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <select value={item.productId} onChange={e => updateItem(idx, "productId", e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:border-indigo-300">
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-indigo-300" />
                        <input type="number" min="0" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", Number(e.target.value))} className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-indigo-300" />
                        <span className="text-sm font-medium text-slate-700 w-20 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {purchaseItems.length === 0 && <div className="text-center text-slate-400 text-sm py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">Click "Add Item" to add products to this purchase order</div>}
                  </div>
                </div>
                {purchaseItems.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="bg-indigo-50 rounded-xl px-5 py-3 border border-indigo-100">
                      <span className="text-sm text-slate-600">Total: </span>
                      <span className="text-lg font-bold text-indigo-700">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="poForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {isViewOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">PO #{selectedPurchase.id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setIsViewOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center">
                <div><p className="text-xs text-slate-500">Supplier</p><p className="font-semibold text-slate-900">{selectedPurchase.supplier?.name}</p>{selectedPurchase.supplier?.company && <p className="text-xs text-slate-500">{selectedPurchase.supplier.company}</p>}</div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selectedPurchase.status] || "bg-slate-100 text-slate-600"}`}>{selectedPurchase.status}</span>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Items Purchased</p>
                <div className="space-y-2">
                  {selectedPurchase.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div><p className="text-sm font-medium text-slate-900">{item.product?.name}</p><p className="text-xs text-slate-500">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p></div>
                      <span className="font-semibold text-slate-900">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-lg border-t border-slate-100">
                <span>Total</span>
                <span className="text-indigo-700">${selectedPurchase.totalAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400">Created: {new Date(selectedPurchase.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
