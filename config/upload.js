const multer = require('multer');
const path = require('path');

// 使用 memoryStorage 將文件存儲在內存中，以便轉換為 Base64
const storage = multer.memoryStorage();

// 檔案過濾器 - 只允許圖片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片檔案 (jpeg, jpg, png, gif, webp)'));
  }
};

// 設定上傳限制
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
