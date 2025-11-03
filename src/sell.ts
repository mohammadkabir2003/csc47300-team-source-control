// grab the sell form
const sellForm = document.querySelector('.form') as HTMLFormElement;

// when they try to submit, just show an alert
// there's no backend to actually save listings yet (this is just a demo)
if (sellForm) {
  sellForm.addEventListener('submit', (e: Event): void => {
    e.preventDefault(); // don't actually submit
    alert('Demo only — no backend connected.');
  });
}
