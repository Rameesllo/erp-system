"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package, Users, ShoppingCart, Truck, FileText } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

interface SearchResults {
  products: any[];
  customers: any[];
  orders: any[];
  suppliers: any[];
  invoices: any[];
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/api/search?q=${encodeURIComponent(query)}`);
        if (data.success) {
          setResults(data.results);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Palette */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative border border-slate-200">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search size={20} className="text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-lg outline-none"
            placeholder="Search products, customers, orders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          <div className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded ml-4 border border-slate-200 hidden sm:block">
            ESC
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!results && query.length >= 2 && !loading && (
            <div className="p-4 text-center text-slate-500 text-sm">No results found</div>
          )}

          {results?.products && results.products.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Package size={14} /> Products
              </div>
              {results.products.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group transition-colors"
                  onClick={() => {
                    router.push("/inventory/products");
                    onClose();
                  }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{p.name}</div>
                    <div className="text-xs text-slate-400">SKU: {p.sku} • Stock: {p.stock}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">${p.price}</div>
                </button>
              ))}
            </div>
          )}

          {results?.customers && results.customers.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> Customers
              </div>
              {results.customers.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group transition-colors"
                  onClick={() => {
                    router.push("/crm");
                    onClose();
                  }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.email || c.phone}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results?.orders && results.orders.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart size={14} /> Orders
              </div>
              {results.orders.map((o) => (
                <button
                  key={o.id}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group transition-colors"
                  onClick={() => {
                    router.push("/sales");
                    onClose();
                  }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">#{o.id.substring(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-slate-400">{o.customer.name} • {new Date(o.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">${o.totalAmount}</div>
                </button>
              ))}
            </div>
          )}

          {results?.suppliers && results.suppliers.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Truck size={14} /> Suppliers
              </div>
              {results.suppliers.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group transition-colors"
                  onClick={() => {
                    router.push("/procurement/suppliers");
                    onClose();
                  }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.company || s.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results?.invoices && results.invoices.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} /> Invoices
              </div>
              {results.invoices.map((i) => (
                <button
                  key={i.id}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex justify-between items-center group transition-colors"
                  onClick={() => {
                    router.push("/finance/invoices");
                    onClose();
                  }}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{i.invoiceNo}</div>
                    <div className="text-xs text-slate-400">{i.order.customer.name} • {i.status}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">${i.total}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
