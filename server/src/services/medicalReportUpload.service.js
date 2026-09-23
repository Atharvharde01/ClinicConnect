import { randomUUID } from "crypto";
import { Readable } from "stream";

import cloudinary from "../config/cloudinary.js";

const REPORT_FOLDER = "Hospital/Reports";

export const uploadMedicalReport = (file) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: REPORT_FOLDER,
        public_id: `report-${randomUUID()}`,
        resource_type: "auto",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });

export { REPORT_FOLDER };
