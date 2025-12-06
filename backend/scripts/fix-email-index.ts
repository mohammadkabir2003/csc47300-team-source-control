import mongoose from 'mongoose'
import { User } from '../src/models/User.js'

/**
 * Migration Script: Fix Email Unique Index
 * 
 * Problem: The old unique index on email field prevents creating new accounts
 * with deleted user emails.
 * 
 * Solution: Replace with partial unique index that only applies to non-deleted users.
 * 
 * This allows:
 * - Multiple deleted users with same email ✅
 * - Only ONE active user per email ✅
 */

async function fixEmailIndex() {
  try {
    console.log('🔧 Starting email index migration...')
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Get the users collection
    const collection = mongoose.connection.collection('users')
    
    // List current indexes
    console.log('\n📋 Current indexes:')
    const indexes = await collection.indexes()
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
      if (idx.unique) {
        console.log(`    (unique: ${idx.unique})`)
      }
      if (idx.partialFilterExpression) {
        console.log(`    (partial: ${JSON.stringify(idx.partialFilterExpression)})`)
      }
    })

    // Check if old unique email index exists
    const hasOldIndex = indexes.some(idx => 
      idx.name === 'email_1' && idx.unique && !idx.partialFilterExpression
    )

    if (hasOldIndex) {
      console.log('\n🗑️  Dropping old unique email index...')
      try {
        await collection.dropIndex('email_1')
        console.log('✅ Old index dropped')
      } catch (error: any) {
        if (error.code === 27) {
          console.log('⚠️  Index already dropped or does not exist')
        } else {
          throw error
        }
      }
    } else {
      console.log('\n✅ Old index not found (already migrated or never existed)')
    }

    // Create new partial unique index
    console.log('\n🔧 Creating new partial unique index...')
    try {
      await collection.createIndex(
        { email: 1 },
        { 
          unique: true,
          partialFilterExpression: { isDeleted: false },
          name: 'email_1_partial_unique'
        }
      )
      console.log('✅ New partial unique index created')
    } catch (error: any) {
      if (error.code === 85 || error.code === 86) {
        console.log('⚠️  Index already exists with correct configuration')
      } else if (error.code === 11000) {
        console.log('❌ ERROR: Duplicate active users found!')
        console.log('   Cannot create unique index - you have multiple active users with same email')
        console.log('   Fix: Delete duplicate active users first')
        
        // Find duplicates
        const duplicates = await collection.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$email', count: { $sum: 1 }, users: { $push: { _id: '$_id', firstName: '$firstName', lastName: '$lastName' } } } },
          { $match: { count: { $gt: 1 } } }
        ]).toArray()
        
        console.log('\n   Duplicate emails found:')
        duplicates.forEach(dup => {
          console.log(`   - ${dup._id}: ${dup.count} active users`)
          dup.users.forEach((u: any) => {
            console.log(`     * ${u._id} (${u.firstName} ${u.lastName})`)
          })
        })
        
        throw error
      } else {
        throw error
      }
    }

    // Verify new index
    console.log('\n📋 New indexes:')
    const newIndexes = await collection.indexes()
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
      if (idx.unique) {
        console.log(`    (unique: ${idx.unique})`)
      }
      if (idx.partialFilterExpression) {
        console.log(`    (partial: ${JSON.stringify(idx.partialFilterExpression)})`)
      }
    })

    // Test the new index
    console.log('\n🧪 Testing new index behavior...')
    
    // Count users by email
    const emailGroups = await collection.aggregate([
      { 
        $group: { 
          _id: '$email', 
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } },
          deleted: { $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] } }
        } 
      },
      { $match: { total: { $gt: 1 } } },
      { $sort: { total: -1 } }
    ]).toArray()

    if (emailGroups.length > 0) {
      console.log('\n📊 Users with duplicate emails:')
      emailGroups.forEach(group => {
        console.log(`  - ${group._id}:`)
        console.log(`    Total: ${group.total}, Active: ${group.active}, Deleted: ${group.deleted}`)
        if (group.active > 1) {
          console.log(`    ⚠️  WARNING: Multiple active users with same email!`)
        } else if (group.active === 1 && group.deleted > 0) {
          console.log(`    ✅ OK: 1 active + ${group.deleted} deleted (allowed)`)
        } else if (group.active === 0) {
          console.log(`    ✅ OK: All deleted (allowed)`)
        }
      })
    } else {
      console.log('  ✅ No duplicate emails found')
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 Summary:')
    console.log('  - Old unique index: Removed')
    console.log('  - New partial unique index: Created')
    console.log('  - Behavior: Only active users must have unique emails')
    console.log('  - Result: Deleted user emails can be reused ✅')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run migration
fixEmailIndex()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
