import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { firebaseApp } from "./firebase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const STALL_TIMEOUT_MS = 45_000;
const START_TIMEOUT_MS = 8_000;
const INLINE_MAX_BYTES = 180 * 1024;

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
};

function resolveContentType(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "storage/unauthorized") return "Upload was denied. Sign in with an enabled admin account and make sure the latest storage rules are deployed (firebase deploy --only storage).";
  if (code === "storage/bucket-not-found" || code === "storage/project-not-found") return "Firebase Storage is not set up for this project. Open Firebase Console → Storage → Get started, then deploy storage.rules.";
  if (code === "storage/retry-limit-exceeded") return "Upload failed after several retries. Check your connection and try again.";
  if (code === "storage/canceled") return "Upload was cancelled.";
  return error instanceof Error ? error.message : "Unable to upload image.";
}

export type UploadOptions = {
  /** Called with 0-100 as bytes are transferred. */
  onProgress?: (percent: number) => void;
  /** Receives a function that cancels the in-flight upload. */
  onCancelReady?: (cancel: () => void) => void;
  /** Called when Storage is unavailable and the image is stored inline instead. */
  onFallback?: () => void;
};

/**
 * Uploads an image to Firebase Storage under `folder` and resolves with its download URL.
 * Validates type/size to mirror storage.rules, always sends a contentType, and aborts
 * if no progress is made for STALL_TIMEOUT_MS so the admin UI never hangs on "Uploading…".
 */
export async function uploadImageFile(file: File, folder: string, options: UploadOptions = {}): Promise<string> {
  const contentType = resolveContentType(file);
  if (!contentType) throw new Error("Choose an image file (JPG, PNG, WebP, GIF, AVIF, SVG or HEIC).");
  if (file.size >= MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 10 MB.");
  let cancelled = false;
  try {
    return await uploadToStorage(file, contentType, folder, {
      ...options,
      onCancelReady: (cancel) => options.onCancelReady?.(() => { cancelled = true; cancel(); }),
    });
  } catch (error) {
    if (cancelled) throw error;
    // Storage unavailable (not enabled, rules, offline): keep the image inline so saving still works.
    console.warn("Firebase Storage upload failed, saving image inline instead.", error);
    options.onFallback?.();
    options.onProgress?.(100);
    return compressToDataUrl(file);
  }
}

async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("This image format can't be processed by the browser. Try a JPG or PNG.");
  let dimension = 1000;
  let quality = 0.82;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length * 0.75 <= INLINE_MAX_BYTES) { bitmap.close(); return dataUrl; }
    dimension = Math.round(dimension * 0.8);
    quality = Math.max(0.55, quality - 0.05);
  }
  bitmap.close();
  throw new Error("Image is too large to store without Firebase Storage. Use a smaller image.");
}

function uploadToStorage(file: File, contentType: string, folder: string, options: UploadOptions): Promise<string> {

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const imageRef = ref(getStorage(firebaseApp), `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`);
  const task = uploadBytesResumable(imageRef, file, { contentType });
  options.onCancelReady?.(() => task.cancel());

  let timedOut = false;
  let timer = 0;
  let started = false;
  const armTimer = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { timedOut = true; task.cancel(); }, started ? STALL_TIMEOUT_MS : START_TIMEOUT_MS);
  };

  return (async () => {
  try {
    armTimer();
    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.bytesTransferred > 0) started = true;
          armTimer();
          options.onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        },
        reject,
        resolve,
      );
    });
    return await getDownloadURL(imageRef);
  } catch (error) {
    throw new Error(timedOut ? "Upload timed out. Check your connection and try again." : friendlyError(error));
  } finally {
    window.clearTimeout(timer);
  }
  })();
}
