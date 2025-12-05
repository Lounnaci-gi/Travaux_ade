const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', 'utf8');

// Remplacer les couleurs de fond existantes par des couleurs bleues OBAT
// Section TITLE (DESCRIPTION)
content = content.replace(
  /backgroundColor: '#d4e8d4'/g,
  'backgroundColor: \'#d0e8f2\''
);

// En-têtes de tableau
content = content.replace(
  /backgroundColor: '#f0f0f0'/g,
  'backgroundColor: \'#e6f3fa\''
);

// Famille d'articles (headers)
content = content.replace(
  /backgroundColor: '#d4e8d4'/g,
  'backgroundColor: \'#d0e8f2\''
);

// Écrire le fichier modifié
fs.writeFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', content, 'utf8');

console.log('Toutes les couleurs de fond ont été mises à jour avec succès !');