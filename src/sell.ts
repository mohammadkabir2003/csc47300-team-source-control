const sellForm = document.querySelector('.form') as HTMLFormElement;

if (sellForm) {
  sellForm.addEventListener('submit', (e: Event): void => {
    e.preventDefault();
    alert('Demo only — no backend connected.');
  });
}
