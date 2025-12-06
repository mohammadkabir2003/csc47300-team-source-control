import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import dotenv from 'dotenv'
import * as readline from 'readline'

dotenv.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function createAdminUser() {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file')
      rl.close()
      process.exit(1)
    }
    
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB\n')
    
    console.log('╔════════════════════════════════════╗')
    console.log('║   CREATE ADMIN USER - CCNY EXCHANGE   ║')
    console.log('╚════════════════════════════════════╝\n')
    
    const email = await question('📧 Email address: ')
    
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address')
      rl.close()
      await mongoose.disconnect()
      process.exit(1)
    }
    
    const password = await question('🔒 Password (min 6 characters): ')
    
    if (!password || password.length < 6) {
      console.log('❌ Password must be at least 6 characters')
      rl.close()
      await mongoose.disconnect()
      process.exit(1)
    }
    
    const firstName = await question('👤 First Name: ')
    const lastName = await question('👤 Last Name: ')
    
    console.log('\n🔐 Security Question (for password reset):')
    console.log('   1. What is your favorite color?')
    console.log('   2. What city were you born in?')
    console.log('   3. What is your mother\'s maiden name?')
    console.log('   4. What was your first pet\'s name?')
    console.log('   5. What is your favorite food?')
    const questionChoice = await question('\nSelect question (1-5): ')
    
    const securityQuestions = [
      'What is your favorite color?',
      'What city were you born in?',
      'What is your mother\'s maiden name?',
      'What was your first pet\'s name?',
      'What is your favorite food?'
    ]
    const securityQuestion = securityQuestions[parseInt(questionChoice) - 1] || securityQuestions[0]
    const securityAnswer = await question(`🔑 Answer to "${securityQuestion}": `)
    
    if (!securityAnswer || securityAnswer.trim().length < 2) {
      console.log('❌ Security answer must be at least 2 characters')
      rl.close()
      await mongoose.disconnect()
      process.exit(1)
    }
    
    console.log('\n┌─────────────────────────────────┐')
    console.log('│   CREATING ADMIN2 USER          │')
    console.log('├─────────────────────────────────┤')
    console.log('│ Admin2 Privileges:              │')
    console.log('│ • Full CRUD operations          │')
    console.log('│ • Delete privileges             │')
    console.log('│ • Create other admin2 users     │')
    console.log('│ • Promote users to admin1       │')
    console.log('│ • View deleted records          │')
    console.log('└─────────────────────────────────┘\n')
    
    const role = 'admin2'
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      console.log('\n⚠️  User with this email already exists!')
      console.log('   Email:', existingUser.email)
      console.log('   Current Role:', existingUser.role)
      console.log('   Name:', existingUser.firstName, existingUser.lastName)
      
      const update = await question('\nDo you want to update this user to ' + role + '? (yes/no): ')
      
      if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
        existingUser.role = role
        existingUser.isEmailVerified = true
        existingUser.firstName = firstName || existingUser.firstName
        existingUser.lastName = lastName || existingUser.lastName
        existingUser.securityQuestion = securityQuestion
        existingUser.securityAnswer = securityAnswer
        // Only update password if provided
        if (password && password.length >= 6) {
          existingUser.password = password
        }
        await existingUser.save()
        
        console.log('\n✅ User successfully updated to ' + role + '!')
        console.log('\n╔════════════════════════════════════╗')
        console.log('║       LOGIN CREDENTIALS            ║')
        console.log('╠════════════════════════════════════╣')
        console.log('║ Email:   ', email.padEnd(25), '║')
        console.log('║ Role:    ', role.padEnd(25), '║')
        console.log('╚════════════════════════════════════╝')
        console.log('\n🌐 Login at: http://localhost:3000/login\n')
      } else {
        console.log('\n❌ Operation cancelled')
      }
      
      rl.close()
      await mongoose.disconnect()
      process.exit(0)
    }
    
    // Create new admin user
    console.log('\n👤 Creating new ' + role + ' user...')
    const admin = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      isEmailVerified: true,
      securityQuestion,
      securityAnswer,
    })
    
    await admin.save()
    
    console.log('\n✅ Admin user created successfully!\n')
    console.log('╔════════════════════════════════════╗')
    console.log('║       LOGIN CREDENTIALS            ║')
    console.log('╠════════════════════════════════════╣')
    console.log('║ Email:   ', email.padEnd(25), '║')
    console.log('║ Password:', password.padEnd(25), '║')
    console.log('║ Role:    ', role.padEnd(25), '║')
    console.log('╚════════════════════════════════════╝')
    console.log('\n🌐 Login at: http://localhost:3000/login')
    console.log('📊 Admin Dashboard: http://localhost:3000/admin\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    rl.close()
    await mongoose.disconnect()
    process.exit(0)
  }
}

createAdminUser()
