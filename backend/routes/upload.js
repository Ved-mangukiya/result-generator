const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { db } = require('../db/database');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  }
});

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}${ext}`);
  }
});

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'imports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import_${Date.now()}${ext}`);
  }
});

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'signatures');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `signature_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files allowed'));
};

const importFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only Excel or CSV files allowed'));
};

const uploadLogo = multer({ storage: logoStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPhoto = multer({ storage: photoStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadImport = multer({ storage: importStorage, fileFilter: importFilter, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadSignature = multer({ storage: signatureStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/upload/logo
router.post('/logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = `uploads/logos/${req.file.filename}`;
  db.prepare('UPDATE coaching_profile SET logo_path = ? WHERE id = 1').run(relativePath);
  res.json({ success: true, path: relativePath, url: `/uploads/logos/${req.file.filename}` });
});

// POST /api/upload/photo/:studentId
router.post('/photo/:studentId', uploadPhoto.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = `uploads/photos/${req.file.filename}`;

  // Generate low-res compressed thumbnail
  try {
    const originalPath = req.file.path;
    const ext = path.extname(originalPath);
    const thumbPath = originalPath.replace(ext, '_thumb.jpg');

    await sharp(originalPath)
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 65 })
      .toFile(thumbPath);
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
  }

  db.prepare('UPDATE students SET photo_path = ? WHERE id = ?').run(relativePath, req.params.studentId);
  res.json({ success: true, path: relativePath, url: `/uploads/photos/${req.file.filename}` });
});

// POST /api/upload/import — upload Excel for import
router.post('/import', uploadImport.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { parseFilePreview } = require('../services/excelService');
  try {
    const result = parseFilePreview(req.file.path);
    res.json({ ...result, file_path: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// POST /api/upload/signature — upload signatory signature image
router.post('/signature', uploadSignature.single('signature'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = `uploads/signatures/${req.file.filename}`;
  db.prepare('UPDATE coaching_profile SET signature_path = ? WHERE id = 1').run(relativePath);
  res.json({ success: true, path: relativePath, url: `/uploads/signatures/${req.file.filename}` });
});

module.exports = { router, uploadLogo, uploadPhoto, uploadImport, uploadSignature };
