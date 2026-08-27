"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: any; // The product being updated
}

export default function StockMovementModal({ isOpen, onClose, onSuccess, product }: StockMovementModalProps) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType("IN");
      setQuantity("");
      setReason("");
      setReference("");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      await fetchApi("/api/stock-movements", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity: Number(quantity),
          reason,
          reference,
          notes
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Update Stock</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{product.name}</p>
              <p className="text-xs text-slate-500 mt-1">SKU: {product.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Current Stock</p>
              <p className="text-xl font-bold text-slate-900">{product.stock}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <button 
              onClick={() => setType("IN")}
              className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${type === 'IN' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <ArrowDownToLine size={20} />
              <span className="text-xs font-semibold">Stock In</span>
            </button>
            <button 
              onClick={() => setType("OUT")}
              className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${type === 'OUT' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <ArrowUpFromLine size={20} />
              <span className="text-xs font-semibold">Stock Out</span>
            </button>
            <button 
              onClick={() => setType("ADJUSTMENT")}
              className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${type === 'ADJUSTMENT' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <SlidersHorizontal size={20} />
              <span className="text-xs font-semibold">Adjust</span>
            </button>
          </div>

          <form id="stockForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {type === "ADJUSTMENT" ? "New Physical Stock Count *" : "Quantity *"}
              </label>
              <input 
                required 
                type="number" 
                min={type === "ADJUSTMENT" ? "0" : "1"} 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                placeholder={type === "ADJUSTMENT" ? "Enter exact count" : "Enter quantity to add/remove"} 
              />
            </div>

            {type === "ADJUSTMENT" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <select required value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none bg-white">
                  <option value="" disabled>Select reason</option>
                  <option value="Damaged Goods">Damaged Goods</option>
                  <option value="Theft/Loss">Theft/Loss</option>
                  <option value="Inventory Count">Inventory Count</option>
                  <option value="Expired">Expired</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference (Optional)</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none" placeholder="e.g. PO-1042" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none" rows={2}></textarea>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button type="submit" form="stockForm" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 flex items-center justify-center min-w-[120px]">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : "Confirm Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
