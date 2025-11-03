// The sell page where students can list stuff they want to sell.
// Handles uploading product photos to Supabase storage and creating the listing.
import { supabase, getSession, isSupabaseConfigured } from './supabase-client.js';
import { UserMetadata } from './types.js';

// Where we store product images - this bucket was created in the Supabase dashboard
const BUCKET_NAME = 'Product_Images'; // created via Supabase UI (public)

const sellForm = document.querySelector('.form') as HTMLFormElement;
const errorMsg = document.getElementById('sell-error') as HTMLElement;
const successMsg = document.getElementById('sell-success') as HTMLElement;

// Show error toast below a specific field
function showFieldError(fieldId: string, message: string): void {
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

// Clear all field error toasts
function clearFieldErrors(): void {
  const errorElements = document.querySelectorAll('.field-error');
  errorElements.forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

// Check session immediately when page loads - hide form if not logged in or not a seller
(async () => {
  const session = await getSession();
  if (!session) {
    console.log('[sell] User not logged in, hiding form');
    if (sellForm) {
      sellForm.style.display = 'none';
    }
    if (errorMsg) {
      errorMsg.textContent = 'You must be logged in to list an item. ';
      errorMsg.style.display = 'block';
      // Add a login link using your existing UI pattern
      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.textContent = 'Log in here';
      errorMsg.appendChild(loginLink);
      
      const orText = document.createTextNode(' or ');
      errorMsg.appendChild(orText);
      
      const signupLink = document.createElement('a');
      signupLink.href = 'signup.html';
      signupLink.textContent = 'create an account';
      errorMsg.appendChild(signupLink);
      
      errorMsg.appendChild(document.createTextNode('.'));
    }
    return;
  }
  console.log('[sell] User logged in:', session.user.email);
  
  // Check if user is a seller by querying user_profiles table
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_seller')
    .eq('id', session.user.id)
    .single();
  
  let isSeller = false;
  
  if (profile && !profileError) {
    isSeller = profile.is_seller === true;
  } else {
    // Fallback to user_metadata if profile doesn't exist
    const meta: UserMetadata = session.user.user_metadata || {};
    isSeller = meta.is_seller === true;
  }
  
  if (!isSeller) {
    console.log('[sell] User is not a seller, hiding form');
    if (sellForm) {
      sellForm.style.display = 'none';
    }
    if (errorMsg) {
      errorMsg.textContent = 'You need seller permissions to list items. Please ';
      errorMsg.style.display = 'block';
      
      const signupLink = document.createElement('a');
      signupLink.href = 'signup.html';
      signupLink.textContent = 'create a new account';
      errorMsg.appendChild(signupLink);
      
      errorMsg.appendChild(document.createTextNode(' with seller access.'));
    }
    return;
  }
  
  console.log('[sell] User is a verified seller');
})();

// Check if Supabase is available right when the page loads
if (!isSupabaseConfigured && sellForm) {
  errorMsg.textContent = '⚠️ Database connection unavailable. You cannot list products at this time. Please contact support.';
  errorMsg.style.display = 'block';
  sellForm.style.opacity = '0.5';
  sellForm.style.pointerEvents = 'none';
}

// Show little thumbnails of the photos they're about to upload so they know what it'll look like
const imagesInput = document.getElementById('images') as HTMLInputElement | null;
const previews = document.getElementById('image-previews') as HTMLElement | null;

if (imagesInput && previews) {
  imagesInput.addEventListener('change', (): void => {
    previews.innerHTML = '';
    const files = imagesInput.files;
    if (!files || !files.length) return;
    
    // Validate file types immediately
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        if (errorMsg) {
          errorMsg.textContent = `❌ Invalid file type: "${file.name}". Only image files (JPEG, PNG, GIF, WebP) are allowed.`;
          errorMsg.style.display = 'block';
        }
        imagesInput.value = ''; // Clear the invalid selection
        return;
      }
    }
    
    // Clear any previous error messages
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
    
    const max = Math.min(files.length, 5);
    for (let i = 0; i < max; i++) {
      const f = files[i];
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url;
      img.alt = f.name;
      img.style.cssText = 'width:88px;height:88px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;';
      previews.appendChild(img);
    }
  });
}

// Take the images they selected and upload them to Supabase storage, then return the URLs
async function uploadImages(files: FileList | null, userId: string): Promise<string[]> {
  if (!files || !files.length) return [];
  const urls: string[] = [];
  const max = Math.min(files.length, 5);

  // Clean up the filename so it doesn't have weird characters that might cause problems
  function sanitize(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\.\-]+/g, '-');
  }

  for (let i = 0; i < max; i++) {
    const file = files[i];
    if (!file || !file.type.startsWith('image/')) continue;
    // Keep file sizes reasonable - 5MB max per image
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`Image ${file.name} is larger than 5MB`);
    }

    // Store each image with the user's ID and a timestamp so filenames don't collide
    const path = `${userId}/${Date.now()}-${i}-${sanitize(file.name)}`;
    console.log('Uploading image', { bucket: BUCKET_NAME, path, name: file.name, size: file.size, userId });
    const { error: upErr } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
        // Tag each image with who uploaded it so Supabase security policies know who owns it
        metadata: { user_id: userId }
      });
    if (upErr) {
      console.error('Storage upload error', upErr);
      // Something went wrong with the upload, let the user know
      throw new Error(upErr.message || JSON.stringify(upErr));
    }

    // Get the public URL so we can show the image on product pages
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return urls;
}

// Check if Supabase is configured - if not, disable the form
if (!isSupabaseConfigured && sellForm && errorMsg) {
  errorMsg.textContent = '⚠️ Database connection unavailable. Unable to list products at this time.';
  errorMsg.style.color = '#dc3545';
  sellForm.style.opacity = '0.5';
  sellForm.style.pointerEvents = 'none';
}

if (sellForm) {
  console.log('[sell] Form submit handler attached');
  sellForm.addEventListener('submit', async (e: Event): Promise<void> => {
    e.preventDefault();
    console.log('[sell] Form submitted!');
    
    // Show processing message immediately
    if (successMsg) {
      successMsg.textContent = '⏳ Processing your listing...';
      successMsg.style.display = 'block';
    }
    
    // Wipe out any old error messages from previous attempts
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
    
    // Double-check that database is available
    if (!isSupabaseConfigured) {
      if (errorMsg) {
        errorMsg.textContent = '⚠️ Database connection unavailable. Cannot list products.';
        errorMsg.style.display = 'block';
      }
      return;
    }
    
    // Check if user is logged in
    const session = await getSession();
    console.log('[sell] Session check:', session ? 'Logged in' : 'Not logged in', session?.user?.email);
    if (!session) {
      if (errorMsg) {
        errorMsg.textContent = '⚠️ You must be logged in to sell items. Please log in first.';
        errorMsg.style.display = 'block';
      }
      return;
    }
    
    // Get form data
    const formData = new FormData(sellForm);
    const title = (formData.get('title') as string || '').trim();
    const category = (formData.get('category') as string || '').trim();
    const quantityStr = (formData.get('quantity') as string || '').trim();
    const quantity = parseInt(quantityStr, 10);
    const priceStr = (formData.get('price') as string || '').trim();
    const price = parseFloat(priceStr);
    const location = (formData.get('location') as string || '').trim();
    const description = (formData.get('desc') as string || '').trim();
    const files = (document.getElementById('images') as HTMLInputElement | null)?.files || null;
    
    // ===== Collect ALL validation errors at once =====
    clearFieldErrors();
    
    // Error 1: Title is missing
    if (!title) {
      console.log('[sell] Validation failed: No title');
      showFieldError('title', 'Please enter a product title');
    } else if (title.length < 3) {
      // Error 2: Title is too short
      showFieldError('title', 'Title must be at least 3 characters long');
    }
    
    // Error 3: Category is missing
    if (!category) {
      showFieldError('category', 'Please select a category');
    }

    // Error 4: Quantity validation
    if (isNaN(quantity) || quantityStr === '') {
      showFieldError('quantity', 'Please enter a valid quantity');
    } else if (quantity < 1) {
      showFieldError('quantity', 'Quantity must be at least 1');
    }
    
    // Error 5: Price validation
    if (isNaN(price) || priceStr === '') {
      showFieldError('price', 'Please enter a valid price');
    } else if (price <= 0) {
      showFieldError('price', 'Price must be greater than $0');
    }
    
    // Error 6: Location is missing
    if (!location) {
      showFieldError('location', 'Please enter a pickup location');
    }
    
    // Error 7: Description validation
    if (!description) {
      showFieldError('desc', 'Please enter a product description');
    } else if (description.length < 10) {
      // Error 8: Description is too short
      showFieldError('desc', 'Description must be at least 10 characters long');
    }
    
    // Check if any field errors were shown
    const hasFieldErrors = document.querySelector('.field-error.show') !== null;
    if (hasFieldErrors) {
      return;
    }
    
    // Error 9: Image file type validation
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          showFieldError('images', `Invalid file type: "${file.name}". Only JPEG, PNG, GIF, WebP allowed`);
          return;
        }
      }
    }
    
    try {
      // Upload images first (if any)
      let imageUrls: string[] = [];
      try {
        imageUrls = await uploadImages(files, session.user.id);
      } catch (imgErr) {
        console.error('[sell] Image upload failed:', imgErr);
        const error = imgErr as Error;
        if (error.message?.includes('fetch') || error.message?.includes('Network')) {
          showFieldError('images', 'Network error uploading images. Check your connection');
        } else {
          showFieldError('images', error.message || 'Image upload failed. Check file size/type');
        }
        return;
      }

      // Insert product into Supabase
      const payload = {
        name: title,
        description: description,
        price: price,
        category: category,
        location: location,
        images: imageUrls,
        seller_id: session.user.id,
        is_active: true,
        quantity: quantity,
        quantity_sold: 0
      };
      console.log('[sell] Creating product with payload', payload);

      const { error: insertError } = await supabase
        .from('products')
        .insert([payload])
        .select();

      if (insertError) {
        console.error('[sell] Product insert error', insertError);
        throw insertError;
      }
      
      if (successMsg) {
        successMsg.textContent = '✅ Product listed successfully! Redirecting to marketplace...';
        successMsg.style.display = 'block';
        sellForm.reset();
        setTimeout(() => {
          window.location.href = 'market.html';
        }, 2000);
      }
    } catch (err) {
      console.error('[sell] Error creating product:', err);
      console.error('[sell] Full error details:', JSON.stringify(err, null, 2));
      const error = err as Error;
      if (errorMsg) {
        errorMsg.style.display = 'block';
        // Provide more helpful error messages based on what went wrong
        if (error.message?.includes('fetch') || error.message?.includes('Network')) {
          errorMsg.textContent = '⚠️ Network error. Unable to create listing. Please check your connection.';
        } else if (error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS')) {
          errorMsg.textContent = '⚠️ Permission denied. Your account may not have access to create listings. Please contact support.';
        } else if ('code' in error && (error as { code?: string }).code === 'PGRST116') {
          errorMsg.textContent = '⚠️ Database error. The products table may not be properly configured. Please contact support.';
        } else {
          errorMsg.textContent = `❌ ${error.message || 'Failed to create listing. Please try again.'}`;
        }
      }
    }
  });
}
