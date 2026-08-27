"use client";

import { useState, useEffect } from "react";
import { Folder, Plus, Search, Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/categories");
      setCategories(data.categories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await fetchApi(`/api/categories/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi("/api/categories", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setFormData({ name: "", description: "", isActive: true });
      setEditingId(null);
      await loadCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
    });
    setError(null);
  };

  const handleDelete = async (id: string, productCount: number) => {
    if (productCount > 0) {
      alert("Cannot delete category with existing products. Please deactivate it or reassign products first.");
      return;
    }
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    try {
      await fetchApi(`/api/categories/${id}`, { method: "DELETE" });
      await loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">Organize your products into logical groups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto relative">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400">
                  <Loader2 className="animate-spin mr-2" size={24} /> Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <Folder size={48} className="text-slate-300 mb-4" />
                  <p>No categories found.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-white">
                    <tr>
                      <th className="px-6 py-4 font-medium">Category Name</th>
                      <th className="px-6 py-4 font-medium">Products</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.isActive ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                              <Folder size={16} className={cat.isActive ? 'text-indigo-600' : 'text-slate-400'} />
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 block">{cat.name}</span>
                              {cat.description && <span className="text-xs text-slate-500 block truncate max-w-[200px]">{cat.description}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{cat._count?.products || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {cat.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(cat.id, cat._count?.products || 0)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div>
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "Edit Category" : "Quick Add"}</h2>
              {editingId && (
                <button 
                  onClick={() => { setEditingId(null); setFormData({ name: "", description: "", isActive: true }); setError(null); }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="e.g. Electronics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none"
                  rows={3}
                  placeholder="Optional description..."
                ></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Category is active</label>
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingId ? "Update Category" : "Save Category"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
