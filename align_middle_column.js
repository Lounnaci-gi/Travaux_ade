const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', 'utf8');

// Remplacer l'alignement du texte de la colonne du milieu
content = content.replace(
  /<div style={{ width: '33%', textAlign: 'center' }}/g,
  '<div style={{ width: \'33%\', textAlign: \'left\' }}'
);

// Écrire le fichier modifié
fs.writeFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', content, 'utf8');

console.log('Alignement de la colonne du milieu mis à jour avec succès !');