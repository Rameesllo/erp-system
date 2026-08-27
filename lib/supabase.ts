import { createClient } from "@supabase/supabase-js";

// Extract project ref from DATABASE_URL if available as fallback
function getDefaultSupabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  const match = dbUrl.match(/postgres\.([a-z0-9]+):/i);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }
  return "https://wneacvnfdlxqrtmhmywl.supabase.co";
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  getDefaultSupabaseUrl();

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const SUPABASE_BUCKET = "products";

/**
 * Uploads a product image buffer to the Supabase storage bucket 'products'.
 * Returns the public URL of the uploaded image.
 */
export async function uploadProductImage(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!supabase) {
      // If no Supabase key is configured, convert buffer to base64 data URL
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;
      return { success: true, url: dataUrl };
    }

    // Ensure products bucket exists (public)
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === SUPABASE_BUCKET);
      if (!bucketExists) {
        await supabase.storage.createBucket(SUPABASE_BUCKET, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
      }
    } catch {
      // Ignore bucket list/create error if already created or insufficient permissions
    }

    // Generate clean unique path
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `prod_${timestamp}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      // Fallback to base64 data URL
      const base64 = buffer.toString("base64");
      return { success: true, url: `data:${contentType};base64,${base64}` };
    }

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);

    return {
      success: true,
      url: data.publicUrl,
    };
  } catch (error: any) {
    console.error("Error in uploadProductImage:", error);
    return {
      success: false,
      error: error?.message || "Failed to upload image",
    };
  }
}
