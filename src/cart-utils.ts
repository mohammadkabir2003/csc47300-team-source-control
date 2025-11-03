// This file handles the little cart badge you see in the navbar showing how many items are in your cart.
// We import it on every page so the badge stays in sync no matter where you are on the site.
import { supabase } from './supabase-client.js';

// Refresh the cart count badge - counts up all the items in your cart and updates that little number
export async function updateNavCart(): Promise<void> {
  const el = document.getElementById('nav-cart-count');
  if (!el) return;
  
  const session = await supabase.auth.getSession();
  // If you're not logged in, we hide the badge since there's no cart to show
  if (!session.data.session) {
    el.style.display = 'none';
    return;
  }
  
  // Look up your cart in the database so we can count what's in it
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', session.data.session.user.id)
    .maybeSingle();
  
  if (!cart) {
    el.style.display = 'none';
    return;
  }
  
  const { data: items } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('cart_id', cart.id);
  
  const count = (items || []).reduce((sum, item) => sum + item.quantity, 0);
  
  if (count > 0) {
    el.style.display = 'inline-block';
    el.textContent = String(count);
    
    // Give it a little bounce animation so you notice when something gets added
    el.classList.remove('animate');
    void el.offsetWidth;
    el.classList.add('animate');
  } else {
    el.style.display = 'none';
  }
}

// Run this right away when the page loads so the badge shows the correct count immediately
updateNavCart();
