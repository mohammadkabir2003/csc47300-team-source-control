import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function createAdmin2() {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file')
      process.exit(1)
    }
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')
    
    // Check if admin2 already exists
    const existingAdmin = await User.findOne({ email: 'admin2@ccny.cuny.edu' })
    
    if (existingAdmin) {
      console.log('\n⚠️  Admin2 user already exists!')
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
    
    // Create new admin2 user
    console.log('\n👤 Creating new admin2 user...')
    const admin = new User({
      email: 'admin2@ccny.cuny.edu',
      password: 'Admin2@2025',
      firstName: 'Admin',
      lastName: 'Two',
      role: 'admin2',
      isEmailVerified: true,
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'blue',
    })
    
    await admin.save()
    
    console.log('\n✅ Admin2 user created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('   Email: admin2@ccny.cuny.edu')
    console.log('   Password: Admin2@2025')
    console.log('   Role: admin2 (Full CRUD + Create Admins)')
    console.log('\n🌐 Login at: http://localhost:3000/login\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

createAdmin2()
