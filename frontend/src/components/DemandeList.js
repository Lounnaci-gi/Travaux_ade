import React, { useState, useEffect } from 'react';
import { getDemandes, validateDemande, getDemande, getClientById, getAgences } from '../services/api';
import { alertError, alertSuccess, confirmDialog } from '../ui/alerts';
import { isChefServiceJuridique, isChefAgence, isChefSectionRelationClientele } from '../utils/auth';

const DemandeList = ({ user }) => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    // Tous les utilisateurs peuvent consulter les demandes (filtrées par agence/centre côté backend)
    if (user) {
      loadDemandes();
    }
  }, [user]);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const data = await getDemandes();
      setDemandes(data);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      console.error('Détails de l\'erreur:', error.response);
      const errorMsg = error.response?.data?.error || error.message || 'Impossible de charger les demandes';
      alertError('Erreur', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les statuts uniques pour le filtre
  const statutsUniques = [...new Set(demandes.map(d => d.CodeStatut))].filter(Boolean);
  // Obtenir les types uniques pour le filtre
  const typesUniques = [...new Set(demandes.map(d => d.TypeDemande))].filter(Boolean);

  const filteredDemandes = demandes.filter((demande) => {
    const matchesSearch =
      demande.NumeroDemande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.ClientNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.ClientPrenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.NomAgence?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demande.TypeDemande?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatut = filterStatut === 'all' || demande.CodeStatut === filterStatut;
    const matchesType = filterType === 'all' || demande.TypeDemande === filterType;

    return matchesSearch && matchesStatut && matchesType;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Vérifier si l'utilisateur peut valider une demande
  const canValidateDemande = (demande, typeValidation) => {
    if (!user) return false;

    const userAgenceId = user.idAgence ?? user.IdAgence ?? user.agenceId ?? null;

    if (typeValidation === 'juridique') {
      // Chef service juridique peut valider si la validation est requise et pas encore faite
      if (!isChefServiceJuridique(user)) return false;
      if (!demande.ValidationJuridiqueRequise) return false;
      if (demande.DateValidationJuridique) return false;
      return true;
    } else if (typeValidation === 'chefAgence') {
      // Chef d'agence peut valider si la validation est requise et pas encore faite
      if (!isChefAgence(user)) return false;
      if (!demande.ValidationChefAgenceRequise) return false;
      if (demande.DateValidationChefAgence) return false;
      // Vérifier que c'est l'agence de l'utilisateur
      if (userAgenceId && Number(userAgenceId) !== Number(demande.IdAgence)) return false;
      return true;
    } else if (typeValidation === 'chefSectionRC') {
      // Chef section relation clientele peut valider si requis et non encore validé
      if (!isChefSectionRelationClientele(user)) return false;
      if (!demande.ValidationChefSectionRelationClienteleRequise) return false;
      if (demande.DateValidationChefSectionRelationClientele) return false;
      if (userAgenceId && Number(userAgenceId) !== Number(demande.IdAgence)) return false;
      return true;
    }
    return false;
  };

  const handleValidate = async (demande, typeValidation) => {
    const validationLabels = {
      juridique: 'chef service juridique',
      chefAgence: "chef d'agence",
      chefSectionRC: 'chef section relation clientele',
    };
    const typeLabel = validationLabels[typeValidation] || 'profil autorisé';
    const confirmed = await confirmDialog(
      'Confirmer la validation',
      `Êtes-vous sûr de vouloir valider cette demande en tant que ${typeLabel} ?`
    );

    if (!confirmed) return;

    try {
      await validateDemande(demande.IdDemande, typeValidation);
      alertSuccess('Succès', 'Demande validée avec succès');
      loadDemandes(); // Recharger la liste
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la validation';
      alertError('Erreur', errorMsg);
    }
  };

  const getStatutBadgeClass = (codeStatut) => {
    const classes = {
      'EN_ATTENTE': 'bg-yellow-500/20 text-yellow-400',
      'EN_COURS': 'bg-blue-500/20 text-blue-400',
      'VALIDE': 'bg-green-500/20 text-green-400',
      'REJETE': 'bg-red-500/20 text-red-400',
      'TERMINE': 'bg-purple-500/20 text-purple-400',
    };
    return classes[codeStatut] || 'bg-gray-500/20 text-gray-400';
  };

  // Fonction pour obtenir l'état d'une validation
  const getValidationStatus = (demande, validationType) => {
    const required = demande[`Validation${validationType}Requise`];
    const date = demande[`DateValidation${validationType}`];
    
    if (!required) {
      return { status: 'not_required', label: 'Non requise', class: 'bg-gray-500/20 text-gray-400' };
    }
    if (date) {
      return { status: 'validated', label: 'Validée', class: 'bg-green-500/20 text-green-400', date };
    }
    return { status: 'pending', label: 'En attente', class: 'bg-yellow-500/20 text-yellow-400' };
  };

  // Fonction pour imprimer une demande
  const handlePrintDemande = async (demandeId) => {
    try {
      // Récupérer les données complètes de la demande
      const demandeData = await getDemande(demandeId);
      const clientData = await getClientById(demandeData.IdClient);
      const agencesData = await getAgences();
      const agence = agencesData.find(a => a.IdAgence === demandeData.IdAgence);
      
      // Formater la date de création
      const dateCreation = new Date(demandeData.DateCreation);
      const formattedDate = dateCreation.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const agencyName = agence?.NomAgence || 'Nom agence';
      const unitName = agence?.NomUnite || 'Nom unité';
      
      // Créer la fenêtre d'impression
      const printWindow = window.open('', '_blank');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Demande de Branchement d'Eau Potable</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 10px auto;
              padding: 15px;
              background-color: white;
            }
            .container {
              background-color: white;
              padding: 20px;
              border: none;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            .header-left { text-align: left; }
            .header-right { text-align: right; }
            .logo {
              width: 60px;
              height: 60px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 10px;
            }
            h1 {
              text-align: center;
              font-size: 18px;
              margin: 10px 0 2px 0;
              text-transform: uppercase;
            }
            .subtitle {
              text-align: center;
              background-color: #000;
              color: white;
              padding: 4px;
              font-size: 10px;
              margin-bottom: 10px;
              margin-top: 2px;
            }
            .form-section { margin-bottom: 8px; }
            .form-field { margin-bottom: 6px; }
            label {
              display: block;
              font-size: 11px;
              margin-bottom: 2px;
            }
            input[type="text"], input[type="tel"] {
              width: 100%;
              border: none;
              border-bottom: 1px solid #333;
              background-color: transparent;
              padding: 3px 0;
              font-size: 11px;
            }
            .checkbox-group { margin: 6px 0; }
            .checkbox-item {
              display: flex;
              align-items: center;
              margin: 3px 0;
              font-size: 11px;
            }
            input[type="checkbox"] { margin-right: 8px; }
            .info-box {
              background-color: #fff;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #999;
              font-size: 10px;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
            }
            .signature-box { text-align: center; }
            .footer {
              margin-top: 20px;
              font-size: 9px;
              border-top: 1px solid #333;
              padding-top: 8px;
            }
            .italic {
              font-style: italic;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-left">
                <strong>ALGÉRIENNE DES EAUX</strong><br>
                Zone d'Alger<br>
                Unité de : ${unitName}
              </div>
              <div class="logo"><img src="/ade.png" alt="Logo ADE" style="max-width: 100%; max-height: 100%;"></div>
              <div class="header-right">
                <em>Agence de</em> <strong>${agencyName}</strong>
              </div>
            </div>

            <h1>Demande de Branchement d'Eau Potable</h1>
            <div class="subtitle">DOCUMENT À RETOURNER AU SERVICE DES EAUX DÛMENT REMPLI ET SIGNÉ</div>

            <div class="form-section">
              <p><strong>Je soussigné (e)</strong> Madame, Mademoiselle, Monsieur <span class="italic">(rayer les mentions inutiles)</span></p>
              
              <div class="form-field">
                <label>Nom (ou Raison sociale) _____________________${clientData?.Nom || 'Nom'}__________________________</label>
              </div>
              
              <div class="form-field">
                <label>Prénom ______________${clientData?.Prenom || 'prénom client'}_________________________________</label>
              </div>
              
              <div class="form-field">
                <label style="text-decoration: underline;">Adresse de correspondance:</label>
              </div>
              
              <div class="form-field">
                <label>Rue _____________________${clientData?.AdresseResidence || 'AdresseResidence'}_________________________</label>
              </div>
              
              <div class="form-field">
                <label>Commune_____________${clientData?.CommuneResidence || 'CommuneResidence'}________________________</label>
              </div>
              
              <div class="form-field">
                <label>Tél ___________________${clientData?.TelephonePrincipal || ''} ${clientData?.TelephoneSecondaire ? '/ ' + clientData.TelephoneSecondaire : ''}____________________________</label>
              </div>
            </div>

            <div class="form-section">
              <p><strong>Et agissant en qualité de</strong> : 
                <span style="text-decoration: ${clientData?.StatutOccupation === 'PROPRIETAIRE' ? 'none' : 'line-through'};">Propriétaire</span>, 
                <span style="text-decoration: ${clientData?.StatutOccupation === 'LOCATAIRE' ? 'none' : 'line-through'};">Locataire</span>, 
                <span style="text-decoration: ${clientData?.StatutOccupation === 'MANDATAIRE' ? 'none' : 'line-through'};">Mandataire</span> 
                <span class="italic">(rayer les mentions inutiles)</span>
              </p>
            </div>

            <div class="form-section">
              <p><strong>Et après avoir pris connaissance du règlement général du service public d'alimentation en eau potable en vigueur, demande à l'Algérienne des Eaux qu'il me soit consenti, un raccordement au réseau d'alimentation en eau potable de type</strong> : Ordinaire, Temporaire, Spécial <span class="italic">(rayer les mentions inutiles)</span></p>
            </div>

            <div class="form-section">
              <p><strong>Pour des besoins</strong> : <span class="italic">(cocher la case correspondante)</span></p>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" id="domestique">
                  <label for="domestique" style="display: inline;">Domestiques: Maison individuelle _______________________________________________</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="collectif">
                  <label for="collectif">Lettre à usage collectif nombre de logements / locaux commerciaux : _______</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="activite">
                  <label for="activite">L'exercice d'une activité (à préciser) _______________________________________________</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="tourisme">
                  <label for="tourisme">Industrie ou tourisme</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="chantier">
                  <label for="chantier">Les besoins de chantier</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="incendie">
                  <label for="incendie">Borne d'incendie</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="autres">
                  <label for="autres">Autres (à préciser) : _______________________________________________</label>
                </div>
              </div>
            </div>

            <div class="form-field">
              <label><strong>Adresse de branchement</strong> : _________${clientData?.AdresseBranchement || ''} ${clientData?.CommuneBranchement ? ', ' + clientData.CommuneBranchement : ''}_________</label>
            </div>

            <div class="info-box">
              <p><strong>Dans le cadre d'un branchement lié à un besoin pour la construction d'un immeuble, à des besoins industriels ou de chantier, veuillez préciser les informations suivantes :</strong></p>
              <p>Diamètre de branchement _____________ mm</p>
              <p>Débit moyen horaire _____________ m³/h</p>
            </div>

            <p class="italic" style="font-size: 11px;">Je m'engage à me conformer aux prescriptions du Règlement Général du Service des Eaux dont un exemplaire m'a été remis sur demande ou consulté au niveau du service « accueil clientèle » de l'Algérienne des Eaux.</p>

            <div class="signature-section">
              <div class="signature-box">
                Fait à <strong>${agencyName}</strong> , le <strong>${formattedDate}</strong>
              </div>
              <div class="signature-box">
                <strong>Signature</strong><br>
                Lu et Approuvé
              </div>
            </div>

            <div class="footer">
              <p><em>Partie réservée à l'Algérienne des Eaux – A.D.E</em></p>
              <p><em>Date de réception</em> : _______________________________________________</p>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error('Erreur lors de l\'impression de la demande:', error);
      alertError('Erreur', 'Impossible d\'imprimer la demande');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Liste des Demandes
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Gestion des demandes de travaux AquaConnect</p>
        </div>

        {/* Filtres et recherche */}
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Numéro, client, agence..."
                className="w-full px-4 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
              />
            </div>

            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Statut
              </label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="select-field w-full px-4 py-2"
              >
                <option value="all">Tous les statuts</option>
                {statutsUniques.map((statut) => (
                  <option key={statut} value={statut}>
                    {demandes.find(d => d.CodeStatut === statut)?.Statut || statut}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par type */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300 text-gray-700">
                Type de demande
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select-field w-full px-4 py-2"
              >
                <option value="all">Tous les types</option>
                {typesUniques.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des demandes */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 dark:border-white/10 border-gray-200/50">
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Numéro
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Date
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Client
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Agence
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Type
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Statut
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Créateur
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Délai
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Validations
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-semibold dark:text-gray-300 text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDemandes.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-gray-400">
                      {demandes.length === 0
                        ? 'Aucune demande enregistrée'
                        : 'Aucune demande ne correspond aux critères de recherche'}
                    </td>
                  </tr>
                ) : (
                  filteredDemandes.map((demande) => {
                    const canValidateChefSection = canValidateDemande(demande, 'chefSectionRC');
                    const canValidateJuridique = canValidateDemande(demande, 'juridique');
                    const canValidateChefAgence = canValidateDemande(demande, 'chefAgence');

                    return (
                      <tr
                        key={demande.IdDemande}
                        className="border-b border-white/5 dark:border-white/5 border-gray-100/50 hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <span className="font-mono font-semibold text-xs dark:text-blue-400 text-blue-600">
                            {demande.NumeroDemande}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs dark:text-gray-300 text-gray-700">
                          {formatDate(demande.DateDemande)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-xs dark:text-gray-300 text-gray-700">
                            <div className="font-semibold whitespace-nowrap">
                              {demande.ClientNom} {demande.ClientPrenom}
                            </div>
                            {demande.ClientTelephone && (
                              <div className="text-[10px] text-gray-400">
                                {demande.ClientTelephone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-xs dark:text-gray-300 text-gray-700 whitespace-nowrap">
                          {demande.NomAgence}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs dark:text-gray-300 text-gray-700 whitespace-nowrap">
                            {demande.TypeDemande}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatutBadgeClass(
                              demande.CodeStatut
                            )}`}
                          >
                            {demande.Statut}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs dark:text-gray-300 text-gray-700 whitespace-nowrap">
                          {demande.Createur}
                        </td>
                        <td className="py-2 px-3 text-xs dark:text-gray-300 text-gray-700">
                          {demande.DelaiPaiementJours || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 items-center">
                            {/* Validation Chef Section RC */}
                            {demande.ValidationChefSectionRelationClienteleRequise && (
                              (() => {
                                const status = getValidationStatus(demande, 'ChefSectionRelationClientele');
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.class}`} title="Chef Section RC">
                                    RC: {status.label}
                                  </span>
                                );
                              })()
                            )}
                            {/* Validation Juridique */}
                            {demande.ValidationJuridiqueRequise && (
                              (() => {
                                const status = getValidationStatus(demande, 'Juridique');
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.class}`} title="Juridique">
                                    JUR: {status.label}
                                  </span>
                                );
                              })()
                            )}
                            {/* Validation Chef Agence */}
                            {demande.ValidationChefAgenceRequise && (
                              (() => {
                                const status = getValidationStatus(demande, 'ChefAgence');
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.class}`} title="Chef Agence">
                                    AG: {status.label}
                                  </span>
                                );
                              })()
                            )}
                            {/* Validation Chef Centre */}
                            {demande.ValidationChefCentreRequise && (
                              (() => {
                                const status = getValidationStatus(demande, 'ChefCentre');
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.class}`} title="Chef Centre">
                                    CTR: {status.label}
                                  </span>
                                );
                              })()
                            )}
                            {/* Si aucune validation requise */}
                            {!demande.ValidationChefSectionRelationClienteleRequise &&
                             !demande.ValidationJuridiqueRequise &&
                             !demande.ValidationChefAgenceRequise &&
                             !demande.ValidationChefCentreRequise && (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1 items-center">
                            <button
                              onClick={() => handlePrintDemande(demande.IdDemande)}
                              className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[10px] font-semibold transition-colors"
                              title="Imprimer la demande"
                            >
                              🖨️
                            </button>
                            {canValidateChefSection && (
                              <button
                                onClick={() => handleValidate(demande, 'chefSectionRC')}
                                className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-[10px] font-semibold transition-colors"
                                title="Valider en tant que chef section relation clientele"
                              >
                                ✓ RC
                              </button>
                            )}
                            {canValidateJuridique && (
                              <button
                                onClick={() => handleValidate(demande, 'juridique')}
                                className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] font-semibold transition-colors"
                                title="Valider juridiquement"
                              >
                                ✓ JUR
                              </button>
                            )}
                            {canValidateChefAgence && (
                              <button
                                onClick={() => handleValidate(demande, 'chefAgence')}
                                className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-semibold transition-colors"
                                title="Valider en tant que chef d'agence"
                              >
                                ✓ AG
                              </button>
                            )}
                            {!canValidateChefSection && !canValidateJuridique && !canValidateChefAgence && (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Résumé */}
          <div className="px-6 py-4 border-t border-white/10 dark:border-white/10 border-gray-200/50 bg-white/5 dark:bg-white/5">
            <div className="flex justify-between items-center text-sm">
              <span className="dark:text-gray-400 text-gray-600">
                Total: <strong className="dark:text-white text-gray-900">{filteredDemandes.length}</strong> demande(s)
                {filteredDemandes.length !== demandes.length && (
                  <span className="ml-2">
                    (sur {demandes.length} au total)
                  </span>
                )}
              </span>
              <button
                onClick={loadDemandes}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandeList;

