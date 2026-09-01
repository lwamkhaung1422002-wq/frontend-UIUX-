import { v2 as cloudinary } from "cloudinary";

const folder = process.env.CLOUDINARY_FOLDER?.trim() || "general-pos/shop-logos";

function assertCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(new Error("Logo storage is not configured. Please contact the administrator."), { name: "BadRequestError" });
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export async function uploadShopLogo(shopId: string, file: Buffer) {
  assertCloudinaryConfigured();
  return new Promise<{ secureUrl: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      public_id: `${shopId}-${crypto.randomUUID()}`,
      resource_type: "image",
      transformation: [{ width: 512, height: 512, crop: "limit", quality: "auto", fetch_format: "auto" }],
    }, (error, result) => {
      if (error || !result?.secure_url || !result.public_id) {
        reject(error || new Error("Logo upload did not return an image URL."));
        return;
      }
      resolve({ secureUrl: result.secure_url, publicId: result.public_id });
    });
    stream.end(file);
  });
}

export async function removeShopLogo(publicId: string | null | undefined) {
  if (!publicId) return;
  assertCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
