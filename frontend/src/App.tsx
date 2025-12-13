import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import Home from './pages/Home'
import Market from './pages/Market'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Sell from './pages/Sell'
import Login from './pages/Login'
import Signup from './pages/Signup'
import User from './pages/User'
import Safety from './pages/Safety'
import ResetPassword from './pages/ResetPassword'
import UpdatePassword from './pages/UpdatePassword'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'
import AdminCreateAdmin from './pages/AdminCreateAdmin'
import AdminPayments from './pages/AdminPayments'
import AdminDisputes from './pages/AdminDisputes'
import UserDetail from './pages/UserDetail'
import ProductDetail from './pages/ProductDetail'
import UserProfile from './pages/UserProfile'
import PaymentDetail from './pages/PaymentDetail'
import DisputeChat from './pages/DisputeChat'
import MyListings from './pages/MyListings'

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/market" element={<Market />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/disputes/:id" element={<DisputeChat />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/user" element={<User />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<UserDetail />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/:id" element={<ProductDetail />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/payments/:id" element={<PaymentDetail />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/create-admin" element={<AdminCreateAdmin />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
