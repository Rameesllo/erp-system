import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { uploadProductImage } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file type. Allowed formats: PNG, JPG, JPEG, WEBP, GIF, SVG.",
        },
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size exceeds maximum allowed limit of 5MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadProductImage(buffer, file.name, file.type);

    if (!result.success || !result.url) {
      return NextResponse.json(
        { success: false, message: result.error || "Image upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      url: result.url,
    });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
