const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

function removeTempFile(filePath) {
  if (!filePath) return Promise.resolve();
  return fs.promises.unlink(filePath).catch(() => {});
}

function withoutExtension(filename = "upload") {
  return path.basename(filename, path.extname(filename));
}

function uploadLarge(filePath, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

function buildStoredMedia(result, originalName, uploadedBy) {
  return {
    mediaUrl: result.secure_url,
    public_id: result.public_id,
    filename: originalName,
    uploadedBy,
    createdAt: new Date(),
  };
}

async function uploadMediaToCloudinary(file, options = {}) {
  if (!file?.path) {
    throw new Error("No upload file found");
  }

  const resourceType = options.resourceType || "auto";
  const uploadedBy = options.uploadedBy || "";
  const originalName = file.originalname || file.filename || "upload";
  const publicIdBase = options.publicId || `${withoutExtension(originalName)}_${Date.now()}`;

  try {
    const uploadOptions = {
      resource_type: resourceType,
      folder: options.folder || "nearserve",
      public_id: publicIdBase.replace(/[^\w/-]/g, "_"),
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      context: uploadedBy ? { uploadedBy } : undefined,
    };

    if (resourceType === "video") {
      uploadOptions.chunk_size = Number(process.env.CLOUDINARY_UPLOAD_CHUNK_SIZE || 20 * 1024 * 1024);
      uploadOptions.eager_async = true;
      uploadOptions.eager = [{ quality: "auto", fetch_format: "mp4" }];
    }

    if (resourceType === "image") {
      uploadOptions.quality = "auto";
      uploadOptions.fetch_format = "auto";
    }

    const result = resourceType === "video"
      ? await uploadLarge(file.path, uploadOptions)
      : await cloudinary.uploader.upload(file.path, uploadOptions);

    return buildStoredMedia(result, originalName, uploadedBy);
  } finally {
    await removeTempFile(file.path);
  }
}

async function uploadPrivateRawToCloudinary(file, options = {}) {
  if (!file?.path) {
    throw new Error("No upload file found");
  }

  const uploadedBy = options.uploadedBy || "";
  const originalName = file.originalname || file.filename || "document.pdf";

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "raw",
      type: "authenticated",
      folder: options.folder || "nearserve/private",
      public_id: (options.publicId || `${withoutExtension(originalName)}_${Date.now()}`).replace(/[^\w/-]/g, "_"),
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      context: uploadedBy ? { uploadedBy } : undefined,
    });

    return buildStoredMedia(result, originalName, uploadedBy);
  } finally {
    await removeTempFile(file.path);
  }
}

function signedAuthenticatedRawUrl(publicId, options = {}) {
  if (!publicId) return "";

  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + Number(options.expiresInSeconds || 5 * 60),
  });
}

function privateDownloadRawUrl(publicId, options = {}) {
  if (!publicId) return "";

  return cloudinary.utils.private_download_url(publicId, options.format || "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + Number(options.expiresInSeconds || 5 * 60),
    attachment: false,
  });
}

async function uploadDataUriToCloudinary(dataUri, options = {}) {
  if (!dataUri || !String(dataUri).startsWith("data:image/")) {
    throw new Error("A valid image data URI is required");
  }

  const uploadedBy = options.uploadedBy || "";
  const uploadOptions = {
    resource_type: "image",
    folder: options.folder || "nearserve/images",
    public_id: (options.publicId || `image_${Date.now()}`).replace(/[^\w/-]/g, "_"),
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    quality: "auto",
    fetch_format: "auto",
    context: uploadedBy ? { uploadedBy } : undefined,
  };

  const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

  return {
    mediaUrl: result.secure_url,
    public_id: result.public_id,
    filename: options.filename || "avatar",
    uploadedBy,
    createdAt: new Date(),
  };
}

module.exports = {
  uploadMediaToCloudinary,
  uploadPrivateRawToCloudinary,
  uploadDataUriToCloudinary,
  privateDownloadRawUrl,
  signedAuthenticatedRawUrl,
};
