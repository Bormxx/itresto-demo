import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const restaurantId = formData.get("restaurantId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const filename = `${randomUUID()}.webp`;

    // Create restaurant-specific directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "images", "menu", restaurantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);

    // Process image: resize to 400px width and convert to WebP
    await sharp(buffer)
      .resize(400, null, { // 400px width, auto height
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filePath);

    // Return relative URL for the database
    const imageUrl = `/images/menu/${restaurantId}/${filename}`;

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
