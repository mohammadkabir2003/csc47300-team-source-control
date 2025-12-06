import mongoose from 'mongoose'
import { GridFSBucket, Db } from 'mongodb'

let bucket: GridFSBucket

export function initGridFS() {
  if (mongoose.connection.readyState === 1) {
    bucket = new GridFSBucket(mongoose.connection.db as Db, {
      bucketName: 'uploads'
    })
    console.log('📦 GridFS initialized for file uploads')
  } else {
    mongoose.connection.once('open', () => {
      bucket = new GridFSBucket(mongoose.connection.db as Db, {
        bucketName: 'uploads'
      })
      console.log('📦 GridFS initialized for file uploads')
    })
  }
}

export function getGridFSBucket(): GridFSBucket {
  if (!bucket) {
    throw new Error('GridFS not initialized')
  }
  return bucket
}
