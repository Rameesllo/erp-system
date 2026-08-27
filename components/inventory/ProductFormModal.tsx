"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, AlertTriangle, Upload, Image as ImageIcon, Trash2, CheckCircle2, Zap } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any | null;
  categories: any[];
}

/** Compresses an image File using the browser Canvas API.
 *  - Resizes to max 1200×1200 px (maintains aspect ratio)
 *  - Iteratively reduces JPEG quality until output < targetMaxBytes (default 900KB)
 *  - Returns a compressed Blob and metadata for display
 */
async function compressImage(
  file: File,
  targetMaxBytes = 900 * 1024 // 900 KB target
): Promise<{ blob: Blob; originalKB: number; compressedKB: number; mimeType: string }> {
  const originalKB = Math.round(file.size / 1024);

  // SVG files cannot be canvas-compressed — return as-is
  if (file.type === "image/svg+xml") {
    return { blob: file, originalKB, compressedKB: originalKB, mimeType: file.type };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIMENSION = 1200;
      let { width, height } = img;

      // Scale down if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Output as JPEG (best compression); PNG uses lossless so we still convert to JPEG unless it's tiny
      const outputMime = "image/jpeg";

      // Binary search for optimal quality
      let lo = 0.1;
      let hi = 0.92;
      let bestBlob: Blob | null = null;

      const tryQuality = (q: number): Promise<Blob | null> =>
        new Promise((res) => canvas.toBlob((b) => res(b), outputMime, q));

      (async () => {
        // Quick check at max quality
        const maxQualityBlob = await tryQuality(hi);
        if (maxQualityBlob && maxQualityBlob.size <= targetMaxBytes) {
          // Already small enough at high quality
          resolve({
            blob: maxQualityBlob,
            originalKB,
            compressedKB: Math.round(maxQualityBlob.size / 1024),
            mimeType: outputMime,
          });
          return;
        }

        // Iterate to find the right quality
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          const b = await tryQuality(mid);
          if (!b) break;
          if (b.size <= targetMaxBytes) {
            bestBlob = b;
            lo = mid;
          } else {
            hi = mid;
          }
        }

        // Final attempt at lo
        if (!bestBlob) {
          bestBlob = await tryQuality(lo);
        }

        if (!bestBlob) {
          reject(new Error("Canvas compression failed"));
          return;
        }

        resolve({
          blob: bestBlob,
          originalKB,
          compressedKB: Math.round(bestBlob.size / 1024),
          mimeType: outputMime,
        });
      })();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

function formatKB(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default function ProductFormModal({ isOpen, onClose, onSuccess, product, categories }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    price: "",
    costPrice: "",
    description: "",
    minStock: "0",
    isActive: true,
    imageUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ""),
        price: product.price?.toString() || "",
        costPrice: product.costPrice?.toString() || "",
        description: product.description || "",
        minStock: product.minStock?.toString() || "0",
        isActive: product.isActive ?? true,
        imageUrl: product.imageUrl || "",
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        categoryId: categories.length > 0 ? categories[0].id : "",
        price: "",
        costPrice: "",
        description: "",
        minStock: "0",
        isActive: true,
        imageUrl: "",
      });
    }
    setError(null);
    setImageError(null);
    setCompressionInfo(null);
  }, [product, isOpen, categories]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept up to 20MB for input — we'll compress it down
    if (file.size > 20 * 1024 * 1024) {
      setImageError("Image must be under 20MB");
      return;
    }

    setUploadingImage(true);
    setImageError(null);
    setCompressionInfo(null);

    try {
      // 1. Compress client-side to ≤900KB
      const { blob, originalKB, compressedKB, mimeType } = await compressImage(file, 900 * 1024);

      // 2. Upload compressed blob
      const uploadFormData = new FormData();
      // Use .jpg extension for JPEG output
      const ext = mimeType === "image/jpeg" ? ".jpg" : file.name.split(".").pop() || "img";
      const uploadName = file.name.replace(/\.[^.]+$/, "") + (mimeType === "image/jpeg" ? ".jpg" : `.${ext}`);
      uploadFormData.append("file", blob, uploadName);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload image");
      }

      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setCompressionInfo({ original: originalKB, compressed: compressedKB });
    } catch (err: any) {
      setImageError(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setImageError(null);
    setCompressionInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (product) {
        await fetchApi(`/api/products/${product.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi("/api/products", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">{product ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          <form id="productForm" onSubmit={handleSubmit} className="space-y-5">
            {/* Product Image Section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Image
                <span className="ml-2 text-xs font-normal text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Auto-compressed to ≤900 KB
                </span>
              </label>
              <div className="flex items-start gap-4">
                {/* Thumbnail or dropzone */}
                {formData.imageUrl ? (
                  <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0 group">
                    <img
                      src={formData.imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-24 h-24 rounded-xl border-2 border-dashed flex-shrink-0 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      uploadingImage
                        ? "border-indigo-300 bg-indigo-50/60 text-indigo-500"
                        : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 text-slate-400 hover:text-indigo-500"
                    }`}
                  >
                    {uploadingImage ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <>
                        <ImageIcon size={22} className="mb-1" />
                        <span className="text-[10px] font-semibold">Add Photo</span>
                      </>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-indigo-600" />
                        Compressing &amp; uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        {formData.imageUrl ? "Change Image" : "Choose File from System"}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-400">
                    PNG, JPG, WEBP up to 20MB — auto-compressed before upload.
                  </p>

                  {/* Compression result badge */}
                  {compressionInfo && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                      <Zap size={12} className="flex-shrink-0 text-emerald-500" />
                      <span>
                        Compressed: {formatKB(compressionInfo.original)} → {formatKB(compressionInfo.compressed)}
                        <span className="ml-1 text-emerald-500">
                          ({Math.round((1 - compressionInfo.compressed / compressionInfo.original) * 100)}% smaller)
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Ready badge (when no compression info shown, i.e. image came from editing) */}
                  {formData.imageUrl && !compressionInfo && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Image ready to save
                    </p>
                  )}

                  {imageError && (
                    <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} /> {imageError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="e.g. Ergonomic Office Chair"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                <input
                  required
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="e.g. CHR-ERG-01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none bg-white"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price ($) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="sm:col-span-2 border-t border-slate-100 pt-5 mt-2">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Stock &amp; Settings</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">Alerts when stock drops below this.</p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Product is active and available for sale</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none"
                  rows={3}
                  placeholder="Product description..."
                ></textarea>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || uploadingImage}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="productForm"
            disabled={submitting || uploadingImage}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : (product ? "Update Product" : "Save Product")}
          </button>
        </div>
      </div>
    </div>
  );
}
