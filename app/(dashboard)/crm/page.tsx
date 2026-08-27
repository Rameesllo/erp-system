"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Edit, Trash2, Loader2, AlertTriangle, Mail, Phone, MapPin, ShoppingCart, X } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

export default function CRMPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/customers");
      setCustomers(data.customers || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: "", email: "", phone: "", address: "" });
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "" });
    setError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingCustomer) {
        await fetchApi(`/api/customers/${editingCustomer.id}`, { method: "PUT", body: JSON.stringify(formData) });
      } else {
        await fetchApi("/api/customers", { method: "POST", body: JSON.stringify(formData) });
      }
      setIsFormOpen(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? This will fail if they have orders.")) return;
    try {
      await fetchApi(`/api/customers/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) { alert(e.message); }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your customer relationships and contact information.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><Users size={20} className="text-indigo-600" /></div>
          <div><p className="text-sm text-slate-500">Total Customers</p><p className="text-2xl font-bold text-slate-900">{customers.length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl"><ShoppingCart size={20} className="text-emerald-600" /></div>
          <div><p className="text-sm text-slate-500">With Orders</p><p className="text-2xl font-bold text-slate-900">{customers.filter(c => c.orders?.length > 0).length}</p></div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl"><Users size={20} className="text-amber-600" /></div>
          <div><p className="text-sm text-slate-500">No Orders Yet</p><p className="text-2xl font-bold text-slate-900">{customers.filter(c => !c.orders?.length).length}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400"><Loader2 className="animate-spin mr-2" size={24} /> Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500">
            <Users size={48} className="text-slate-300 mb-4" />
            <p className="font-medium">No customers found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first customer to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Customer</th>
                  <th className="px-6 py-4 font-medium text-left">Contact</th>
                  <th className="px-6 py-4 font-medium text-left">Address</th>
                  <th className="px-6 py-4 font-medium text-left">Orders</th>
                  <th className="px-6 py-4 font-medium text-left">Joined</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {c.email && <div className="flex items-center gap-1.5 text-slate-600"><Mail size={13} className="text-slate-400" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone size={13} className="text-slate-400" />{c.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.address ? <div className="flex items-center gap-1.5 text-slate-600"><MapPin size={13} className="text-slate-400" /><span className="truncate max-w-[160px]">{c.address}</span></div> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{c.orders?.length || 0} orders</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editingCustomer ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{error}</div>}
              <form id="custForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" placeholder="e.g. John Smith" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" placeholder="+1 555 0000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none" placeholder="Street, City, Country" />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" form="custForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center transition-colors">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : (editingCustomer ? "Update" : "Save Customer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
