import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function createAdmin() {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file')
      process.exit(1)
    }
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@ccny.cuny.edu' })
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!')
      console.log('Email:', existingAdmin.email)
      console.log('Role:', existingAdmin.role)
      
      if (existingAdmin.role !== 'admin2') {
        console.log('🔄 Updating user to admin2 role...')
        existingAdmin.role = 'admin2'
        existingAdmin.isEmailVerified = true
        await existingAdmin.save()
        console.log('✅ User updated to admin2!')
      }
      
      await mongoose.disconnect()
      process.exit(0)
    }
    
    // Create new admin user
    console.log('👤 Creating new admin user...')
    const admin = new User({
      email: 'admin@ccny.cuny.edu',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin2',
      isEmailVerified: true,
    })
    
    await admin.save()
    
    console.log('✅ Admin user created successfully!')
    console.log('📧 Email: admin@ccny.cuny.edu')
    console.log('🔑 Password: Admin123!')
    console.log('⚠️  IMPORTANT: Change this password after first login!')
    
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  }
}

createAdmin()
