const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File upload service for handling image uploads (avatars, carpet images)
 */
class FileUploadService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Configure multer for file uploads
   * @param {string} subDirectory - Subdirectory for specific file types
   * @returns {Object} Multer configuration
   */
  configureMulter(subDirectory = 'general') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(this.uploadDir, subDirectory);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    });

    // File filter for images only
    const fileFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      }
    });
  }

  /**
   * Get full file path for serving static files
   * @param {string} filename - Filename
   * @param {string} subDirectory - Subdirectory
   * @returns {string} Full file path
   */
  getFilePath(filename, subDirectory = 'general') {
    return path.join(this.uploadDir, subDirectory, filename);
  }

  /**
   * Get relative URL for file access
   * @param {string} filename - Filename
   * @param {string} subDirectory - Subdirectory
   * @returns {string} Relative URL
   */
  getFileUrl(filename, subDirectory = 'general') {
    return `/uploads/${subDirectory}/${filename}`;
  }

  /**
   * Delete file from uploads directory
   * @param {string} filename - Filename to delete
   * @param {string} subDirectory - Subdirectory
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filename, subDirectory = 'general') {
    return new Promise((resolve, reject) => {
      const filePath = this.getFilePath(filename, subDirectory);
      
      fs.unlink(filePath, (err) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // File doesn't exist, consider it deleted
            resolve(true);
          } else {
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Handle single file upload
   * @param {Object} req - Express request object
   * @param {string} fieldName - Field name for upload
   * @param {string} subDirectory - Subdirectory for file
   * @returns {Promise<Object>} Upload result
   */
  async handleSingleUpload(req, fieldName, subDirectory = 'general') {
    return new Promise((resolve, reject) => {
      const upload = this.configureMulter(subDirectory).single(fieldName);
      
      upload(req, (err) => {
        if (err) {
          reject(err);
        } else {
          if (req.file) {
            resolve({
              success: true,
              filename: req.file.filename,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              path: req.file.path,
              url: this.getFileUrl(req.file.filename, subDirectory)
            });
          } else {
            reject(new Error('No file uploaded'));
          }
        }
      });
    });
  }

  /**
   * Handle multiple file uploads
   * @param {Object} req - Express request object
   * @param {string} fieldName - Field name for upload
   * @param {number} maxCount - Maximum number of files
   * @param {string} subDirectory - Subdirectory for files
   * @returns {Promise<Array>} Upload results
   */
  async handleMultipleUpload(req, fieldName, maxCount = 5, subDirectory = 'general') {
    return new Promise((resolve, reject) => {
      const upload = this.configureMulter(subDirectory).array(fieldName, maxCount);
      
      upload(req, (err) => {
        if (err) {
          reject(err);
        } else {
          if (req.files && req.files.length > 0) {
            const results = req.files.map(file => ({
              success: true,
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              url: this.getFileUrl(file.filename, subDirectory)
            }));
            resolve(results);
          } else {
            reject(new Error('No files uploaded'));
          }
        }
      });
    });
  }
}

module.exports = new FileUploadService();