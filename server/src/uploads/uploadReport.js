import multer from "multer";
import path from "path";

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const extension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF, JPG, JPEG and PNG files are allowed."
      ),
      false
    );
  }
};

const uploadReport = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default uploadReport;
