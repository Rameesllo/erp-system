"use client";

import { useState, useEffect } from "react";
import { Truck, Plus, Search, Edit, Trash2, Loader2, AlertTriangle, Mail, Phone, Building2, X } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingSupplier(null);
    setFormData({ name: "", email: "", phone: "", address: "", company: "" });
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingSupplier(s);
    setFormData({ name: s.name, email: s.email || "", phone: s.phone || "", address: s.address || "", company: s.company || "" });
    setError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingSupplier) {
        await fetchApi(`/api/suppliers/${editingSupplier.id}`, { method: "PUT", body: JSON.stringify(formData) });
      } else {
        await fetchApi("/api/suppliers", { method: "POST", body: JSON.stringify(formData) });
      }
      setIsFormOpen(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier? This will fail if they have purchases.")) return;
    try {
      await fetchApi(`/api/suppliers/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) { alert(e.message); }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.company && s.company.toLowerCase().includes(search.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your supplier directory and contact information.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 self-start">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><Truck size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Suppliers</p><p className="text-2xl font-bold text-slate-900">{suppliers.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><Building2 size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">Active Purchases</p><p className="text-2xl font-bold text-slate-900">{suppliers.filter(s => s.purchases?.length > 0).length}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by name, company or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading suppliers...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <Truck size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Supplier</th>
                  <th className="px-6 py-4 font-medium text-left">Company</th>
                  <th className="px-6 py-4 font-medium text-left">Contact</th>
                  <th className="px-6 py-4 font-medium text-left">Purchases</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.company ? <div className="flex items-center gap-1.5 text-slate-600"><Building2 size={13} className="text-slate-400" />{s.company}</div> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {s.email && <div className="flex items-center gap-1.5 text-slate-600"><Mail size={13} className="text-slate-400" />{s.email}</div>}
                        {s.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone size={13} className="text-slate-400" />{s.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{s.purchases?.length || 0} orders</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{error}</div>}
              <form id="supplierForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Acme Corp" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="supplier@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="+1 555 0000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none" placeholder="Street, City, Country" />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="supplierForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : (editingSupplier ? "Update" : "Save Supplier")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
