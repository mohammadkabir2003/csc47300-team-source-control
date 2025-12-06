import mongoose from 'mongoose'

export const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ccny-exchange'
    
    await mongoose.connect(mongoURI)
    
    console.log('🗄️  MongoDB connected successfully')
    console.log(`📍 Database: ${mongoose.connection.name}`)
    console.log(`🌐 Host: ${mongoose.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    console.error('💡 TIP: If using MongoDB Atlas, ensure your IP is whitelisted')
    console.error('💡 To allow all IPs (for development): Add 0.0.0.0/0 to Network Access')
    process.exit(1)
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('📴 MongoDB disconnected')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err)
})
