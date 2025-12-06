import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import dotenv from 'dotenv'

dotenv.config()

async function createAdmin2() {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file')
      console.error('📝 Please update backend/.env with your MongoDB Atlas connection string')
      process.exit(1)
    }
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')
    
    // Check if admin2 already exists
    const existingAdmin2 = await User.findOne({ email: 'admin2@ccny.cuny.edu' })
    
    if (existingAdmin2) {
      console.log('⚠️  Admin2 user already exists!')
      console.log('📧 Email:', existingAdmin2.email)
      console.log('👤 Role:', existingAdmin2.role)
      
      if (existingAdmin2.role !== 'admin2') {
        console.log('🔄 Updating user to admin2 role...')
        existingAdmin2.role = 'admin2'
        existingAdmin2.isEmailVerified = true
        existingAdmin2.isDeleted = false
        await existingAdmin2.save()
        console.log('✅ User updated to admin2!')
      }
      
      await mongoose.disconnect()
      process.exit(0)
    }
    
    // Create new admin2 user
    console.log('👤 Creating new Admin2 user...')
    const admin2 = new User({
      email: 'admin2@ccny.cuny.edu',
      password: 'Admin2@2025',
      firstName: 'Admin',
      lastName: 'Level2',
      role: 'admin2',
      isEmailVerified: true,
      isDeleted: false,
    })
    
    await admin2.save()
    
    console.log('\n✅ Admin2 user created successfully!')
    console.log('━'.repeat(50))
    console.log('📧 Email:    admin2@ccny.cuny.edu')
    console.log('🔑 Password: Admin2@2025')
    console.log('👑 Role:     admin2 (Full CRUD + Create Admins)')
    console.log('━'.repeat(50))
    console.log('\n🎯 Next Steps:')
    console.log('1. Start backend: npm run dev')
    console.log('2. Start frontend: cd ../frontend && npm run dev')
    console.log('3. Login at: http://localhost:3000/login')
    console.log('4. Go to: http://localhost:3000/admin')
    console.log('5. Create admin1 users from Admin Dashboard')
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n')
    
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Error creating admin2 user:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 TIP: Your MongoDB Atlas connection string is incorrect!')
      console.error('📝 Please check backend/.env and update MONGODB_URI')
      console.error('🔗 Get your connection string from MongoDB Atlas Dashboard')
    }
    
    process.exit(1)
  }
}

createAdmin2()
