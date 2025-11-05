import Swal from 'sweetalert2';

export const alertSuccess = (title = 'Succès', text = '') =>
  Swal.fire({ icon: 'success', title, text, timer: 2000, showConfirmButton: false });

export const alertError = (title = 'Erreur', text = 'Une erreur est survenue') =>
  Swal.fire({ icon: 'error', title, text });

export const alertInfo = (title = 'Info', text = '') =>
  Swal.fire({ icon: 'info', title, text });

export const confirmDialog = async (title = 'Êtes-vous sûr ?', text = 'Cette action est irréversible') => {
  const res = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Oui',
    cancelButtonText: 'Annuler',
  });
  return res.isConfirmed;
};


