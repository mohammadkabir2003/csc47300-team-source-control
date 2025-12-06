import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || ''

async function resetOrders() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Reset ALL orders to waiting_to_meet with fresh confirmation flags
  const result = await mongoose.connection.db!.collection('orders').updateMany(
    {},
    { 
      $set: { status: 'waiting_to_meet', buyerConfirmed: false, sellerConfirmed: false },
      $unset: { meetupStatus: '', paymentMethod: '' }
    }
  )

  console.log('Updated orders:', result.modifiedCount)
  await mongoose.disconnect()
  console.log('Done')
}

resetOrders().catch(console.error)
