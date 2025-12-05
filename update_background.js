const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', 'utf8');

// Remplacer le dégradé de couleurs
content = content.replace(
  /rgba\(200, 230, 200, 0\.3\) 0%, rgba\(150, 200, 220, 0\.2\) 50%, rgba\(180, 220, 180, 0\.3\) 100%/g,
  'rgba(173, 216, 230, 0.3) 0%, rgba(135, 206, 250, 0.2) 50%, rgba(176, 224, 230, 0.3) 100%'
);

// Écrire le fichier modifié
fs.writeFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', content, 'utf8');

console.log('Couleur de fond mise à jour avec succès !');