const fs = require('fs');

// Lire le fichier
let content = fs.readFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', 'utf8');

// Remplacer la section des coordonnées bancaires
const oldBankInfo = `<p style={{ marginBottom: '3px' }}><strong>Coordonnées bancaires:</strong></p>
                  <p style={{ marginBottom: '3px' }}>IBAN: {centreInfo?.NumerocompteBancaire || ''}</p>
                  <p style={{ marginBottom: '3px' }}>BIC: {centreInfo?.CodeBIC || ''}</p>
                  <p style={{ marginTop: '10px', marginBottom: '3px' }}>SIRET: {centreInfo?.SIRET || ''}</p>
                  <p style={{ marginBottom: '3px' }}>TVA: {centreInfo?.NumeroTVA || ''}</p>`;

const newBankInfo = `<p style={{ marginBottom: '3px' }}><strong>Coordonnées bancaires:</strong></p>
                  <p style={{ marginBottom: '3px' }}>Nom de la banque: {centreInfo?.NomBanque || ''}</p>
                  <p style={{ marginBottom: '3px' }}>IBAN: {centreInfo?.NumerocompteBancaire || ''}</p>
                  <p style={{ marginBottom: '3px' }}>BIC: {centreInfo?.CodeBIC || ''}</p>
                  <p style={{ marginBottom: '3px' }}>Code postal: {centreInfo?.CodePostal || ''}</p>
                  <p style={{ marginTop: '10px', marginBottom: '3px' }}>Numéro Identifiant Fiscal: {centreInfo?.NumeroIdentifiantFiscal || ''}</p>
                  <p style={{ marginBottom: '3px' }}>Numéro Identification Statistique: {centreInfo?.NumeroIdentificationStatistique || ''}</p>
                  <p style={{ marginBottom: '3px' }}>Numéro Registre Commerce: {centreInfo?.NumeroRegistreCommerce || ''}</p>
                  <p style={{ marginTop: '10px', marginBottom: '3px' }}>SIRET: {centreInfo?.SIRET || ''}</p>
                  <p style={{ marginBottom: '3px' }}>TVA: {centreInfo?.NumeroTVA || ''}</p>`;

content = content.replace(oldBankInfo, newBankInfo);

// Écrire le fichier modifié
fs.writeFileSync('f:\\Travaux_ade\\frontend\\src\\components\\DevisForm.js', content, 'utf8');

console.log('Coordonnées bancaires mises à jour avec succès !');