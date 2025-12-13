import express from 'express'
import { Category } from '../models/Category.js'
import { AppError } from '../middleware/errorHandler.js'

export const categoriesRouter = express.Router()
categoriesRouter.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({ isDeleted: { $ne: true } }).sort('name')

    res.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    next(error)
  }
})

categoriesRouter.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params

    const category = await Category.findOne({ slug, isDeleted: { $ne: true } })

    if (!category) {
      throw new AppError('Category not found', 404)
    }

    res.json({
      success: true,
      data: category,
    })
  } catch (error) {
    next(error)
  }
})
