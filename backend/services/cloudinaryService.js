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

    return {
      mediaUrl: result.secure_url,
      public_id: result.public_id,
      filename: originalName,
      uploadedBy,
      createdAt: new Date(),
    };
  } finally {
    await removeTempFile(file.path);
  }
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
  uploadDataUriToCloudinary,
};
