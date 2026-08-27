"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, MoreHorizontal, Download, Loader2, Edit, Trash2, ArrowRightLeft } from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import ProductFormModal from "@/components/inventory/ProductFormModal";
import StockMovementModal from "@/components/inventory/StockMovementModal";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData] = await Promise.all([
        fetchApi(search ? `/api/products?search=${encodeURIComponent(search)}` : "/api/products"),
        fetchApi("/api/categories")
      ]);
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleStockMovement = (product: any) => {
    setSelectedProduct(product);
    setIsStockOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete or deactivate this product?")) return;
    try {
      await fetchApi(`/api/products/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your product catalog, pricing, and stock levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button onClick={handleAddProduct} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2">
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full p-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={24} /> Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <p>No products found.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-white">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className={`transition-colors group ${product.isActive ? 'hover:bg-slate-50/50' : 'bg-slate-50/30 opacity-75 hover:opacity-100'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg border border-slate-200 flex-shrink-0 overflow-hidden bg-slate-50">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Graceful fallback if image fails to load
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-lg border flex-shrink-0 flex items-center justify-center font-bold text-xs ${product.isActive ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-rose-50 border-rose-100 text-rose-400'}`}>
                            {product.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{product.name} {!product.isActive && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded ml-2 uppercase">Inactive</span>}</div>
                          <div className="text-xs text-slate-500">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{product.category?.name || '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">${Number(product.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-600">{product.stock}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.stock > product.minStock ? 'bg-emerald-100 text-emerald-700' : 
                        product.stock > 0 ? 'bg-amber-100 text-amber-700' : 
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {product.stock > product.minStock ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleStockMovement(product)} title="Update Stock" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                          <ArrowRightLeft size={16} />
                        </button>
                        <button onClick={() => handleEditProduct(product)} title="Edit Product" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} title="Delete / Deactivate" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
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

      <ProductFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => { setIsFormOpen(false); loadData(); }}
        product={selectedProduct}
        categories={categories}
      />

      <StockMovementModal
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        onSuccess={() => { setIsStockOpen(false); loadData(); }}
        product={selectedProduct}
      />
    </div>
  );
}
