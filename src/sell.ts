// The sell page where students can list stuff they want to sell.
// Handles uploading product photos to Supabase storage and creating the listing.
import { supabase, getSession } from './supabase-client.js';

// Where we store product images - this bucket was created in the Supabase dashboard
const BUCKET_NAME = 'Product_Images'; // created via Supabase UI (public)

const sellForm = document.querySelector('.form') as HTMLFormElement;
const errorMsg = document.getElementById('sell-error') as HTMLElement;
const successMsg = document.getElementById('sell-success') as HTMLElement;

// Show little thumbnails of the photos they're about to upload so they know what it'll look like
const imagesInput = document.getElementById('images') as HTMLInputElement | null;
const previews = document.getElementById('image-previews') as HTMLElement | null;

if (imagesInput && previews) {
  imagesInput.addEventListener('change', (): void => {
    previews.innerHTML = '';
    const files = imagesInput.files;
    if (!files || !files.length) return;
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

if (sellForm) {
  sellForm.addEventListener('submit', async (e: Event): Promise<void> => {
    e.preventDefault();
    
    // Wipe out any old error or success messages from previous attempts
    if (errorMsg) errorMsg.textContent = '';
    if (successMsg) successMsg.textContent = '';
    
    // Check if user is logged in
    const session = await getSession();
    if (!session) {
      if (errorMsg) errorMsg.textContent = 'You must be logged in to sell items.';
      return;
    }
    
    // Get form data
    const formData = new FormData(sellForm);
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const price = parseFloat(formData.get('price') as string);
    const location = formData.get('location') as string;
    const description = formData.get('desc') as string;
    const files = (document.getElementById('images') as HTMLInputElement | null)?.files || null;
    
    try {
      // Upload images first (if any)
      let imageUrls: string[] = [];
      try {
        imageUrls = await uploadImages(files, session.user.id);
      } catch (imgErr: any) {
        console.error('Image upload failed:', imgErr);
        if (errorMsg) errorMsg.textContent = imgErr.message || 'Image upload failed. Check file size/type and try again.';
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
      console.log('Creating product with payload', payload);

      const { error: insertError } = await supabase
        .from('products')
        .insert([payload])
        .select();

      if (insertError) {
        console.error('Product insert error', insertError);
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
      console.error('Error creating product:', err);
      if (errorMsg) {
        errorMsg.textContent = err.message || 'Failed to create listing. Please try again.';
      }
    }
  });
}
