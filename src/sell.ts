// The sell page where students can list stuff they want to sell.
// Handles uploading product photos to Supabase storage and creating the listing.
import { supabase, getSession, isSupabaseConfigured } from './supabase-client.js';

// Where we store product images - this bucket was created in the Supabase dashboard
const BUCKET_NAME = 'Product_Images'; // created via Supabase UI (public)

const sellForm = document.querySelector('.form') as HTMLFormElement;
const errorMsg = document.getElementById('sell-error') as HTMLElement;
const successMsg = document.getElementById('sell-success') as HTMLElement;

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
  sellForm.addEventListener('submit', async (e: Event): Promise<void> => {
    e.preventDefault();
    
    // Wipe out any old error or success messages from previous attempts
    if (errorMsg) errorMsg.textContent = '';
    if (successMsg) successMsg.textContent = '';
    
    // Double-check that database is available
    if (!isSupabaseConfigured) {
      if (errorMsg) errorMsg.textContent = '⚠️ Database connection unavailable. Cannot list products.';
      return;
    }
    
    // Check if user is logged in
    const session = await getSession();
    if (!session) {
      if (errorMsg) errorMsg.textContent = 'You must be logged in to sell items.';
      return;
    }
    
    // Get form data
    const formData = new FormData(sellForm);
    const title = (formData.get('title') as string || '').trim();
    const category = (formData.get('category') as string || '').trim();
    const priceStr = (formData.get('price') as string || '').trim();
    const price = parseFloat(priceStr);
    const location = (formData.get('location') as string || '').trim();
    const description = (formData.get('desc') as string || '').trim();
    const files = (document.getElementById('images') as HTMLInputElement | null)?.files || null;
    
    // ===== Detailed Frontend Validation =====
    
    // Error 1: Title is missing
    if (!title) {
      if (errorMsg) errorMsg.textContent = '❌ Please enter a product title.';
      return;
    }
    
    // Error 2: Title is too short
    if (title.length < 3) {
      if (errorMsg) errorMsg.textContent = '❌ Product title must be at least 3 characters long.';
      return;
    }
    
    // Error 3: Category is missing
    if (!category) {
      if (errorMsg) errorMsg.textContent = '❌ Please select a category.';
      return;
    }
    
    // Error 4: Price is missing or invalid
    if (!priceStr || isNaN(price)) {
      if (errorMsg) errorMsg.textContent = '❌ Please enter a valid price.';
      return;
    }
    
    // Error 5: Price is negative or zero
    if (price <= 0) {
      if (errorMsg) errorMsg.textContent = '❌ Price must be greater than $0.';
      return;
    }
    
    // Error 6: Location is missing
    if (!location) {
      if (errorMsg) errorMsg.textContent = '❌ Please enter a pickup location.';
      return;
    }
    
    // Error 7: Description is missing
    if (!description) {
      if (errorMsg) errorMsg.textContent = '❌ Please enter a product description.';
      return;
    }
    
    // Error 8: Description is too short
    if (description.length < 10) {
      if (errorMsg) errorMsg.textContent = '❌ Description must be at least 10 characters long.';
      return;
    }
    
    // Error 9: Image file type validation
    if (files && files.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          if (errorMsg) errorMsg.textContent = `❌ Invalid file type: "${file.name}". Only image files (JPEG, PNG, GIF, WebP) are allowed.`;
          return;
        }
      }
    }
    
    try {
      // Upload images first (if any)
      let imageUrls: string[] = [];
      try {
        imageUrls = await uploadImages(files, session.user.id);
      } catch (imgErr: any) {
        console.error('[sell] Image upload failed:', imgErr);
        if (errorMsg) {
          if (imgErr.message?.includes('fetch') || imgErr.message?.includes('Network')) {
            errorMsg.textContent = '⚠️ Network error uploading images. Please check your connection.';
          } else {
            errorMsg.textContent = imgErr.message || 'Image upload failed. Check file size/type and try again.';
          }
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
        is_active: true
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
        successMsg.textContent = 'Product listed successfully! Redirecting to marketplace...';
        sellForm.reset();
        setTimeout(() => {
          window.location.href = 'market.html';
        }, 2000);
      }
    } catch (err: any) {
      console.error('[sell] Error creating product:', err);
      if (errorMsg) {
        // Provide more helpful error messages based on what went wrong
        if (err.message?.includes('fetch') || err.message?.includes('Network')) {
          errorMsg.textContent = '⚠️ Network error. Unable to create listing. Please check your connection.';
        } else if (err.message?.includes('permission') || err.message?.includes('policy')) {
          errorMsg.textContent = '⚠️ Permission denied. Please make sure you are logged in.';
        } else {
          errorMsg.textContent = err.message || 'Failed to create listing. Please try again.';
        }
      }
    }
  });
}
