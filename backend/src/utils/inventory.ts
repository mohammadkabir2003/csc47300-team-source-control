import mongoose from 'mongoose'
import { Order } from '../models/Order.js'

export async function getAvailableQuantity(productId: string | mongoose.Types.ObjectId, listedQuantity: number): Promise<number> {
  const result = await Order.aggregate([
    {
      $match: {
        'items.productId': new mongoose.Types.ObjectId(productId.toString()),
        status: { $ne: 'cancelled' },
        isDeleted: { $ne: true },
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.productId': new mongoose.Types.ObjectId(productId.toString()),
      },
    },
    {
      $group: {
        _id: null,
        totalOrdered: { $sum: '$items.quantity' },
      },
    },
  ])

  const totalOrdered = result.length > 0 ? result[0].totalOrdered : 0
  console.log(`[Inventory] Product ${productId}: listed=${listedQuantity}, ordered=${totalOrdered}, available=${Math.max(0, listedQuantity - totalOrdered)}`)

  return Math.max(0, listedQuantity - totalOrdered)
}

export async function getSoldQuantity(productId: string | mongoose.Types.ObjectId): Promise<number> {
  const result = await Order.aggregate([
    {
      $match: {
        'items.productId': new mongoose.Types.ObjectId(productId.toString()),
        buyerConfirmed: true,
        sellerConfirmed: true,
        isDeleted: false,
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.productId': new mongoose.Types.ObjectId(productId.toString()),
      },
    },
    {
      $group: {
        _id: null,
        totalSold: { $sum: '$items.quantity' },
      },
    },
  ])

  return result.length > 0 ? result[0].totalSold : 0
}

export async function getProductInventoryStats(productId: string | mongoose.Types.ObjectId, listedQuantity: number) {
  const [available, sold] = await Promise.all([
    getAvailableQuantity(productId, listedQuantity),
    getSoldQuantity(productId),
  ])

  return {
    listed: listedQuantity,
    available,
    sold,
    reserved: listedQuantity - available - sold,
  }
}
