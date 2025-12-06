import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Cart, CartItem } from '../types'
import { cartService } from '../services/cartService'
import { useAuth } from './AuthContext'

interface CartContextType {
  cart: Cart
  cartItems: CartItem[]
  addToCart: (productId: string, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getTotalItems: () => number
  getTotalPrice: () => string
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const { user } = useAuth()

  // Reload cart when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadCart()
    } else {
      // Clear cart when logged out
      setCart({})
      setCartItems([])
    }
  }, [user])

  const loadCart = async () => {
    try {
      const loadedCart = await cartService.getCart()
      setCart(loadedCart)
      
      // Also load full cart items with product details
      const items = await cartService.getCartItems()
      setCartItems(items)
    } catch (error) {
      console.error('Failed to load cart:', error)
    }
  }

  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      const updatedCart = await cartService.addToCart(productId, quantity)
      setCart(updatedCart)
      await loadCart() // Reload to get updated items
    } catch (error) {
      console.error('Failed to add to cart:', error)
      throw error
    }
  }

  const removeFromCart = async (productId: string) => {
    try {
      const updatedCart = await cartService.removeFromCart(productId)
      setCart(updatedCart)
      await loadCart()
    } catch (error) {
      console.error('Failed to remove from cart:', error)
      throw error
    }
  }

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      const updatedCart = await cartService.updateQuantity(productId, quantity)
      setCart(updatedCart)
      await loadCart()
    } catch (error) {
      console.error('Failed to update quantity:', error)
      throw error
    }
  }

  const clearCart = async () => {
    try {
      await cartService.clearCart()
      setCart({})
      setCartItems([])
    } catch (error) {
      console.error('Failed to clear cart:', error)
      throw error
    }
  }

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  }

  const getTotalPrice = (): string => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product?.price || '0')
      return sum + (price * item.quantity)
    }, 0).toFixed(2)
  }

  return (
    <CartContext.Provider value={{ 
      cart, 
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      getTotalItems, 
      getTotalPrice 
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
