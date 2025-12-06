import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function createAdmin1() {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file')
      process.exit(1)
    }
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')
    
    // Check if admin1 already exists
    const existingAdmin = await User.findOne({ email: 'admin1@ccny.cuny.edu' })
    
    if (existingAdmin) {
      console.log('\n⚠️  Admin1 user already exists!')
      console.log('Email:', existingAdmin.email)
      console.log('Role:', existingAdmin.role)
      
      if (existingAdmin.role !== 'admin1') {
        console.log('🔄 Updating user to admin1 role...')
        existingAdmin.role = 'admin1'
        existingAdmin.isEmailVerified = true
        await existingAdmin.save()
        console.log('✅ User updated to admin1!')
      }
      
      await mongoose.disconnect()
      process.exit(0)
    }
    
    // Create new admin1 user
    console.log('\n👤 Creating new admin1 user...')
    const admin = new User({
      email: 'admin1@ccny.cuny.edu',
      password: 'Admin1@2025',
      firstName: 'Admin',
      lastName: 'One',
      role: 'admin1',
      isEmailVerified: true,
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'red',
    })
    
    await admin.save()
    
    console.log('\n✅ Admin1 user created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('   Email: admin1@ccny.cuny.edu')
    console.log('   Password: Admin1@2025')
    console.log('   Role: admin1 (CRU privileges)')
    console.log('\n🌐 Login at: http://localhost:3000/login\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

createAdmin1()
