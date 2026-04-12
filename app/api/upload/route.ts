import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UTApi } from "uploadthing/server";

// Explicitly pass the token so UTApi doesn't accidentally read the
// legacy UPLOADTHING_SECRET env var (raw API key — wrong format for v7).
const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

/**
 * Simple file upload endpoint that bypasses the UploadThing client SDK.
 * Accepts a multipart/form-data POST with a single "file" field,
 * uploads it to UploadThing server-side, and returns the URL.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF" }, { status: 400 });
    }

    // Validate file size (8 MB max)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 8 MB." }, { status: 400 });
    }

    console.log(`[Upload] Uploading file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)} KB) for user ${session.user.id}`);

    // Upload via UploadThing server SDK
    const response = await utapi.uploadFiles(file);

    console.log("[Upload] UTApi response:", JSON.stringify(response));

    if (response.error) {
      console.error("[Upload] UTApi error:", response.error);
      return NextResponse.json({ error: `Upload failed: ${response.error.message}` }, { status: 500 });
    }

    const url = response.data?.ufsUrl || response.data?.url || response.data?.appUrl;

    if (!url) {
      console.error("[Upload] No URL in response:", JSON.stringify(response.data));
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    console.log(`[Upload] Success: ${url}`);
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Upload] Unexpected error:", message);
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
