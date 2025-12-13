import express from 'express'
import multer from 'multer'
import { getGridFSBucket } from '../config/gridfs.js'
import { Readable } from 'stream'
import { AppError } from '../middleware/errorHandler.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

export const uploadsRouter = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})
uploadsRouter.post('/image', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400)
    }

    const bucket = getGridFSBucket()
    
    const readableStream = Readable.from(req.file.buffer)
    
    const filename = `${Date.now()}-${req.file.originalname}`
    
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        contentType: req.file.mimetype,
        originalName: req.file.originalname,
        uploadedAt: new Date(),
      },
    })

    readableStream.pipe(uploadStream)

    uploadStream.on('finish', () => {
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: uploadStream.id.toString(),
          filename: filename,
          url: `/api/uploads/image/${uploadStream.id}`,
        },
      })
    })

    uploadStream.on('error', (error) => {
      next(error)
    })
  } catch (error) {
    next(error)
  }
})
uploadsRouter.post('/images', authMiddleware, upload.array('images', 5), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[]
    
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400)
    }

    const bucket = getGridFSBucket()
    const uploadedFiles: Array<{ fileId: string; filename: string; url: string }> = []

    for (const file of files) {
      const readableStream = Readable.from(file.buffer)
      const filename = `${Date.now()}-${file.originalname}`
      
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          contentType: file.mimetype,
          originalName: file.originalname,
          uploadedAt: new Date(),
        },
      })

      await new Promise((resolve, reject) => {
        readableStream.pipe(uploadStream)
        uploadStream.on('finish', () => {
          uploadedFiles.push({
            fileId: uploadStream.id.toString(),
            filename: filename,
            url: `/api/uploads/image/${uploadStream.id}`,
          })
          resolve(null)
        })
        uploadStream.on('error', reject)
      })
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles,
    })
  } catch (error) {
    next(error)
  }
})
uploadsRouter.get('/image/:id', async (req, res, next) => {
  try {
    const bucket = getGridFSBucket()
    const { id } = req.params

    const mongoose = await import('mongoose')
    const fileId = new mongoose.Types.ObjectId(id)

    const files = await bucket.find({ _id: fileId }).toArray()
    
    if (files.length === 0) {
      throw new AppError('File not found', 404)
    }

    const file = files[0]

    const contentType = (file.metadata as any)?.contentType || 'image/jpeg'
    res.set('Content-Type', contentType)
    res.set('Content-Length', file.length.toString())

    const downloadStream = bucket.openDownloadStream(fileId)
    downloadStream.pipe(res)

    downloadStream.on('error', (error) => {
      next(error)
    })
  } catch (error) {
    next(error)
  }
})
uploadsRouter.delete('/image/:id', authMiddleware, async (req, res, next) => {
  try {
    const bucket = getGridFSBucket()
    const { id } = req.params

    const mongoose = await import('mongoose')
    const fileId = new mongoose.Types.ObjectId(id)

    await bucket.delete(fileId)

    res.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})
