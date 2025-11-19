import React, { useEffect, useMemo, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getClients, getClientById, getClientTypes, getAgences, getDemandeTypes, createClient, createDemande } from '../services/api';
import { isAdmin } from '../utils/auth';
import { canUserCreateDemandeType, normalizeRole } from '../utils/roleUtils';

// Add print styles
const printStyles = `
  @media print {
    body {
      background: white !important;
      color: black !important;
    }
    
    .glass-card {
      background: white !important;
      border: 1px solid #ddd !important;
      box-shadow: none !important;
    }
    
    button, .no-print {
      display: none !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: black !important;
    }
    
    input, select, textarea {
      background: white !important;
      border: 1px solid #000 !important;
      color: black !important;
    }
    
    label {
      color: black !important;
    }
    
    /* Ensure all content is visible */
    .max-w-5xl {
      max-width: none !important;
    }
    
    .min-h-screen {
      min-height: auto !important;
    }
    
    /* Add page breaks for better printing */
    .space-y-6 > div {
      page-break-inside: avoid;
    }
  }
`;

const DemandeForm = ({ user, onCreated }) => {
  const [clients, setClients] = useState([]);
  const [agences, setAgences] = useState([]);
  const [types, setTypes] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Inject print styles when component mounts
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = printStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get selected agency and unit information for print header
  const getPrintHeaderInfo = () => {
    if (!form.idAgence) return { agencyName: '', unitName: '' };
    
    const selectedAgency = agences.find(agency => agency.IdAgence === Number(form.idAgence));
    return {
      agencyName: selectedAgency ? selectedAgency.NomAgence : '',
      unitName: selectedAgency && selectedAgency.NomUnite ? selectedAgency.NomUnite : ''
    };
  };
  
  // Get selected client name for print footer
  const getPrintClientName = () => {
    if (selectedClient) {
      return `${selectedClient.Nom || ''} ${selectedClient.Prenom || ''}`.trim();
    }
    return '';
  };
  
  // Get selected client first name for print footer
  const getPrintClientFirstName = () => {
    if (selectedClient && selectedClient.Prenom) {
      return selectedClient.Prenom;
    }
    return '';
  };
  
  // Get selected client address for print footer
  const getPrintClientAddress = () => {
    if (selectedClient && selectedClient.AdresseResidence) {
      return selectedClient.AdresseResidence;
    }
    return '';
  };
  
  // Get selected client commune for print footer
  const getPrintClientCommune = () => {
    if (selectedClient && selectedClient.CommuneResidence) {
      return selectedClient.CommuneResidence;
    }
    return '';
  };
  
  // Get selected client telephone numbers for print footer
  const getPrintClientTelephones = () => {
    if (selectedClient) {
      const primary = selectedClient.TelephonePrincipal || '';
      const secondary = selectedClient.TelephoneSecondaire || '';
      if (primary && secondary) {
        return `${primary} / ${secondary}`;
      } else if (primary) {
        return primary;
      } else if (secondary) {
        return secondary;
      }
    }
    return '';
  };
  
  // Get selected client status for print footer
  const getPrintClientStatus = () => {
    if (selectedClient && selectedClient.StatutOccupation) {
      return selectedClient.StatutOccupation;
    }
    return '';
  };

  // Handle print with custom header only
  const handlePrint = () => {
    const { agencyName, unitName } = getPrintHeaderInfo();
    const clientName = getPrintClientName();
    const clientFirstName = getPrintClientFirstName();
    const clientAddress = getPrintClientAddress();
    const clientCommune = getPrintClientCommune();
    const clientTelephones = getPrintClientTelephones();
    const clientStatus = getPrintClientStatus();
    
    // Get current date for "Fait à" section
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Create a new window for printing only the header
    const printWindow = window.open('', '_blank');
    
    // Write the header content to the new window
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
          .header-left {
            text-align: left;
          }
          .header-right {
            text-align: right;
          }
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
          .form-section {
            margin-bottom: 8px;
          }
          .form-field {
            margin-bottom: 6px;
          }
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
          .checkbox-group {
            margin: 6px 0;
          }
          .checkbox-item {
            display: flex;
            align-items: center;
            margin: 3px 0;
            font-size: 11px;
          }
          input[type="checkbox"] {
            margin-right: 8px;
          }
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
          .signature-box {
            text-align: center;
          }
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
              Unité de : ${unitName || 'Nom unité'}
            </div>
            <div class="logo"><img src="/ade.png" alt="Logo ADE" style="max-width: 100%; max-height: 100%;"></div>
            <div class="header-right">
              <em>Agence de</em> <strong>${agencyName || 'Nom agence'}</strong>
            </div>
          </div>

          <h1>Demande de Branchement d'Eau Potable</h1>
          <div class="subtitle">DOCUMENT À RETOURNER AU SERVICE DES EAUX DÛMENT REMPLI ET SIGNÉ</div>

          <div class="form-section">
            <p><strong>Je soussigné (e)</strong> Madame, Mademoiselle, Monsieur <span class="italic">(rayer les mentions inutiles)</span></p>
            
            <div class="form-field">
              <label>Nom (ou Raison sociale) _____________________${selectedClient?.Nom || 'Nom'}__________________________</label>
            </div>
            
            <div class="form-field">
              <label>Prénom ______________${selectedClient?.Prenom || 'prénom client'}_________________________________</label>
            </div>
            
            <div class="form-field">
              <label style="text-decoration: underline;">Adresse de correspondance:</label>
            </div>
            
            <div class="form-field">
              <label>Rue _____________________${selectedClient?.AdresseResidence || 'AdresseResidence'}_________________________</label>
            </div>
            
            <div class="form-field">
              <label>Commune_____________${selectedClient?.CommuneResidence || 'CommuneResidence'}________________________</label>
            </div>
            
            <div class="form-field">
              <label>Tél ___________________${selectedClient?.TelephonePrincipal || ''} ${selectedClient?.TelephoneSecondaire ? '/ ' + selectedClient.TelephoneSecondaire : ''}____________________________</label>
            </div>
          </div>

          <div class="form-section">
            <p><strong>Et agissant en qualité de</strong> : 
              <span style="text-decoration: ${selectedClient?.StatutOccupation === 'PROPRIETAIRE' ? 'none' : 'line-through'};">Propriétaire</span>, 
              <span style="text-decoration: ${selectedClient?.StatutOccupation === 'LOCATAIRE' ? 'none' : 'line-through'};">Locataire</span>, 
              <span style="text-decoration: ${selectedClient?.StatutOccupation === 'MANDATAIRE' ? 'none' : 'line-through'};">Mandataire</span> 
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
            <label><strong>Adresse de branchement</strong> : _______________________________________________</label>
          </div>

          <div class="info-box">
            <p><strong>Dans le cadre d'un branchement lié à un besoin pour la construction d'un immeuble, à des besoins industriels ou de chantier, veuillez préciser les informations suivantes :</strong></p>
            <p>Diamètre de branchement _____________ mm</p>
            <p>Débit moyen horaire _____________ m³/h</p>
          </div>

          <p class="italic" style="font-size: 11px;">Je m'engage à me conformer aux prescriptions du Règlement Général du Service des Eaux dont un exemplaire m'a été remis sur demande ou consulté au niveau du service « accueil clientèle » de l'Algérienne des Eaux.</p>

          <div class="signature-section">
            <div class="signature-box">
              Fait à <strong>${agencyName || 'Nom agence'}</strong> , le <strong>${formattedDate}</strong>
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
    
    // Print and close the window
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const [form, setForm] = useState({
    idClient: '',
    idAgence: '',
    idDemandeType: '',
    commentaire: '',
    delaiPaiementJours: 30,
  });
  const [newClientMode, setNewClientMode] = useState(false);
  const [clientForm, setClientForm] = useState({
    idClientType: '',
    nom: '',
    prenom: '',
    adresseResidence: '',
    communeResidence: '',
    codePostalResidence: '',
    adresseBranchement: '',
    communeBranchement: '',
    codePostalBranchement: '',
    telephonePrincipal: '',
    telephoneSecondaire: '',
    fax: '',
    email: '',
    numeroPieceIdentite: '',
    pieceDelivrePar: '',
    dateDelivrancePiece: '',
    statutOccupation: '',
    diametreBranchement: '',
  });
  const [diametreSearch, setDiametreSearch] = useState('');
  const [showDiametreDropdown, setShowDiametreDropdown] = useState(false);

  const diametreOptions = useMemo(
    () => [
      '25 mm',
      '32 mm',
      '40 mm',
      '50 mm',
      '63 mm',
      '75 mm',
      '90 mm',
      '110 mm',
      '125 mm',
      '140 mm',
      '160 mm',
      '180 mm',
      '200 mm',
      '225 mm',
      '250 mm',
      '280 mm',
      '315 mm',
    ],
    []
  );

  const filteredDiametreOptions = useMemo(() => {
    const search = (diametreSearch || '').trim().toLowerCase();
    if (!search) return diametreOptions;
    return diametreOptions.filter((value) => value.toLowerCase().includes(search));
  }, [diametreOptions, diametreSearch]);

  const handleDiametreSelect = (value) => {
    setClientForm((prev) => ({ ...prev, diametreBranchement: value }));
    setDiametreSearch('');
    setShowDiametreDropdown(false);
  };

  // Fonction pour parser la Description et extraire les rôles autorisés
  const parseDescription = (desc) => {
    if (!desc) return { description: '', roles: [] };
    try {
      const parsed = JSON.parse(desc);
      return {
        description: parsed.d || parsed.description || '',
        roles: parsed.r || parsed.roles || []
      };
    } catch {
      // Si ce n'est pas du JSON, c'est une description simple (tous les rôles autorisés)
      return { description: desc, roles: [] };
    }
  };

  // Fonction pour vérifier si l'utilisateur peut créer un type de demande
  // Utilise la fonction utilitaire centralisée
  const canUserCreateType = (type) => {
    const canCreate = canUserCreateDemandeType(user, type);
    
    // Logs de débogage uniquement si nécessaire
    if (!canCreate && user) {
      const userRoleRaw = user.role || user.codeRole || user.Role || user.CodeRole;
      const parsed = parseDescription(type.Description);
      const rolesAutorises = parsed.roles || [];
      
      // Debug logging for access denied - can be removed in production
    }
    
    return canCreate;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        // Loading demand types...
        
        // Charger tous les référentiels en parallèle sans bloquer le formulaire en cas d'erreur
        const [typesRes, clientsRes, agencesRes, clientTypesRes] = await Promise.allSettled([
          getDemandeTypes(),
          getClients(),
          getAgences(),
          getClientTypes(),
        ]);
        
        // Traiter les types de demande
        if (typesRes.status === 'fulfilled') {
          const typesData = typesRes.value || [];
          // Process retrieved demand types
          
          // Filtrer les types selon le rôle de l'utilisateur
          const filteredTypes = typesData.filter(type => {
            // Filtrer par Actif (gérer les valeurs BIT de SQL Server: 0/1 ou true/false)
            const isActive = type.Actif === true || type.Actif === 1 || type.Actif === '1' || (typeof type.Actif === 'boolean' && type.Actif);
            if (!isActive) {
              // Filter out inactive types
              return false;
            }
            
            // Vérifier les permissions
            const canCreate = canUserCreateType(type);
            if (!canCreate) {
              // Filter out types based on permissions
            }
            return canCreate;
          });
          
          // Set filtered types for user
          setTypes(filteredTypes);
          
          if (filteredTypes.length === 0) {
            if (typesData.length === 0) {
              console.warn('Aucun type de demande dans la base de données');
              setError('Aucun type de demande trouvé dans la base de données. Veuillez contacter l\'administrateur.');
            } else {
              const activeTypes = typesData.filter(t => {
                const isActive = t.Actif === true || t.Actif === 1 || t.Actif === '1' || (typeof t.Actif === 'boolean' && t.Actif);
                return isActive;
              });
              const activeCount = activeTypes.length;
              const inactiveCount = typesData.length - activeCount;
              const userRoleDisplay = user?.role || user?.codeRole || user?.Role || user?.CodeRole || 'non défini';
              console.warn('Aucun type de demande disponible pour cet utilisateur après filtrage');
              console.warn(`- Types actifs: ${activeCount}, Types inactifs: ${inactiveCount}`);
              console.warn(`- Rôle utilisateur: ${userRoleDisplay}`);
              
              // Utiliser SweetAlert2 pour afficher un message simple et compréhensible
              alertError('Aucun type de demande disponible', `Aucun type de demande n'est disponible pour votre rôle (${userRoleDisplay}). Veuillez contacter l'administrateur ou le chef de centre pour configurer les permissions.`);
              setTypes([]); // Ne pas afficher de types si aucun n'est autorisé
            }
          } else {
            setError(''); // Effacer l'erreur si des types sont disponibles
          }
        } else {
          console.error('Erreur lors du chargement des types de demande:', typesRes.reason);
          const errorMsg = typesRes.reason?.response?.data?.error || typesRes.reason?.message || 'Erreur lors du chargement des types de travaux';
          setError(errorMsg);
          setTypes([]); // S'assurer que la liste est vide en cas d'erreur
        }

        // Traiter les autres référentiels
        if (clientsRes.status === 'fulfilled') {
          setClients(clientsRes.value || []);
        } else {
          console.error('Erreur lors du chargement des clients:', clientsRes.reason);
        }
        
        if (agencesRes.status === 'fulfilled') {
          setAgences(agencesRes.value || []);
        } else {
          console.error('Erreur lors du chargement des agences:', agencesRes.reason);
        }
        
        if (clientTypesRes.status === 'fulfilled') {
          setClientTypes(clientTypesRes.value || []);
        } else {
          console.error('Erreur lors du chargement des types de clients:', clientTypesRes.reason);
        }

        // Pré-remplir automatiquement l'agence de l'utilisateur connecté
        if (user?.idAgence) {
          setForm(prev => ({
            ...prev,
            idAgence: String(user.idAgence)
          }));
        }
      } catch (e) {
        const errorMsg = e.response?.data?.error || e.message || 'Erreur lors du chargement des données';
        setError(errorMsg);
        console.error('Erreur lors du chargement:', e);
        console.error('Détails de l\'erreur:', e.response);
        setTypes([]); // S'assurer que la liste est vide en cas d'erreur
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Vérifier si le type de demande sélectionné contient "Branchement"
  const isBranchementType = () => {
    if (!form.idDemandeType) return false;
    const selectedType = types.find(t => t.IdDemandeType === Number(form.idDemandeType));
    return selectedType?.LibelleType?.toLowerCase().includes('branchement') || false;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
    if (name === 'idClient') {
      setSelectedClient(null);
      // Si un client existant est sélectionné, désactiver le mode création
      if (value) {
        setNewClientMode(false);
        // Charger les détails du client
        getClientById(value)
          .then((data) => setSelectedClient(data))
          .catch(() => setSelectedClient(null));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Demander confirmation avant d'enregistrer
    const confirmed = await confirmDialog(
      'Confirmer l\'enregistrement',
      'Êtes-vous sûr de vouloir enregistrer cette nouvelle demande ?'
    );
    
    if (!confirmed) {
      return; // L'utilisateur a annulé
    }
    
    try {
      setSubmitting(true);
      let clientId = form.idClient;
      if (newClientMode) {
        // Les champs obligatoires correspondent aux champs NOT NULL dans la table Client
        // IdClientType, Nom, AdresseResidence, CommuneResidence, CodePostalResidence, StatutOccupation sont NOT NULL
        const required = ['idClientType','nom','adresseResidence','communeResidence','codePostalResidence','statutOccupation'];
        // Si c'est un branchement, adresseBranchement est obligatoire (logique métier)
        if (isBranchementType()) {
          required.push('adresseBranchement');
        }
        // Vérifier si les champs sont vides (chaîne vide, null, undefined, ou 0 pour idClientType)
        const missing = required.filter((f) => {
          const value = clientForm[f];
          return value === '' || value === null || value === undefined || (f === 'idClientType' && (!value || value === '0'));
        });
        if (missing.length) {
          setSubmitting(false);
          const fieldLabels = {
            'idClientType': 'Type de client',
            'nom': 'Nom',
            'adresseResidence': 'Adresse de résidence',
            'communeResidence': 'Commune de résidence',
            'codePostalResidence': 'Code postal de résidence',
            'statutOccupation': 'Statut d\'occupation',
            'adresseBranchement': 'Adresse de branchement'
          };
          const missingLabels = missing.map(f => fieldLabels[f] || f).join(', ');
          setError(`Veuillez renseigner tous les champs obligatoires du client. Champs manquants : ${missingLabels}`);
          return;
        }
      }
      // Vérifier que soit un client est sélectionné, soit on est en mode création
      if (!clientId && !newClientMode) {
        setSubmitting(false);
        setError('Veuillez sélectionner un client existant ou créer un nouveau client.');
        return;
      }
      // Vérifier que l'agence est définie (soit dans le formulaire, soit via l'utilisateur)
      const agenceId = form.idAgence || user?.idAgence;
      if (!agenceId) {
        setSubmitting(false);
        if (!isAdmin(user)) {
          setError('Vous devez être assigné à une agence pour créer une demande. Veuillez contacter l\'administrateur.');
        } else {
          setError('Veuillez sélectionner une agence.');
        }
        return;
      }
      // Vérifier que le type de demande est sélectionné
      if (!form.idDemandeType) {
        setSubmitting(false);
        setError('Veuillez sélectionner un type de demande.');
        return;
      }
      const payload = {
        idClient: clientId ? Number(clientId) : undefined,
        client: newClientMode ? {
          ...clientForm,
          idClientType: Number(clientForm.idClientType) || null,
          dateDelivrancePiece: clientForm.dateDelivrancePiece || null,
          codePostalResidence: clientForm.codePostalResidence || null,
          // Ne pas inclure les champs de branchement si ce n'est pas un type branchement
          ...(isBranchementType() ? {
            codePostalBranchement: clientForm.codePostalBranchement || null,
          } : {
            adresseBranchement: null,
            communeBranchement: null,
            codePostalBranchement: null,
            diametreBranchement: null,
          }),
        } : undefined,
        idAgence: Number(agenceId),
        idDemandeType: Number(form.idDemandeType),
        commentaire: form.commentaire || null,
        delaiPaiementJours: Number(form.delaiPaiementJours) || 30,
      };
      const created = await createDemande(payload);
      setSuccess(`Demande créée: ${created.NumeroDemande}`);
      alertSuccess('Succès', `Demande créée: ${created.NumeroDemande}`);
      if (onCreated) onCreated(created);
      // Reset partiel
      setForm((prev) => ({ ...prev, commentaire: '' }));
      if (newClientMode) {
        setNewClientMode(false);
        setClientForm({
          idClientType: '', nom: '', prenom: '', adresseResidence: '', communeResidence: '', codePostalResidence: '',
          adresseBranchement: '', communeBranchement: '', codePostalBranchement: '',
          telephonePrincipal: '', telephoneSecondaire: '', fax: '', email: '',
          numeroPieceIdentite: '', pieceDelivrePar: '', dateDelivrancePiece: '',
          statutOccupation: '', diametreBranchement: ''
        });
      }
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || 'Erreur lors de la création de la demande';
      setError(msg);
      alertError('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Nouvelle Demande
              </h1>
              <p className="dark:text-gray-400 text-gray-600">Enregistrer une nouvelle demande dans le système</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
          {success && (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Type de demande *</label>
              <select
                name="idDemandeType"
                value={form.idDemandeType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un type</option>
                {types.map((t) => (
                  <option key={t.IdDemandeType} value={t.IdDemandeType} className="text-black">
                    {t.LibelleType}
                  </option>
                ))}
              </select>
              {types.length === 0 && (
                <p className="mt-2 text-sm text-yellow-400">
                  ⚠️ Aucun type de demande disponible. Veuillez contacter l'administrateur ou le chef de centre pour créer des types de travaux.
                </p>
              )}
            </div>
            {form.idDemandeType && (
              <div>
                <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">
                  Agence *
                  {user?.idAgence && !isAdmin(user) && (
                    <span className="ml-2 text-xs text-gray-400">(définie automatiquement)</span>
                  )}
                </label>
                <select
                  name="idAgence"
                  value={form.idAgence}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={user?.idAgence && !isAdmin(user)}
                >
                  <option value="">Sélectionner une agence</option>
                  {agences.map((a) => (
                    <option key={a.IdAgence} value={a.IdAgence} className="text-black">
                      {a.CodeAgence} - {a.NomAgence}
                    </option>
                  ))}
                </select>
                {user?.idAgence && !isAdmin(user) && (
                  <p className="mt-1 text-xs text-gray-400">
                    L'agence est automatiquement définie selon votre affectation
                  </p>
                )}
              </div>
            )}
          </div>

          {form.idDemandeType && (
            <>
              <div className="space-y-6 border-t border-white/10 dark:border-white/10 border-gray-200/50 pt-6">
                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Client</label>
                  {!newClientMode ? (
                    <>
                      <select
                        name="idClient"
                        value={form.idClient}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((c) => (
                          <option key={c.IdClient} value={c.IdClient} className="text-black">
                            {c.Nom} {c.Prenom ? c.Prenom : ''}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center p-2 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 hover:bg-blue-500/30 hover:text-white transition-colors"
                          title="Créer un nouveau client"
                          aria-label="Créer un nouveau client"
                          onClick={() => { setNewClientMode(true); setForm((p)=>({...p, idClient:''})); setSelectedClient(null);} }
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="sr-only">Créer un nouveau client</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Type de client *</label>
                          <select
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            value={clientForm.idClientType}
                            onChange={(e)=>setClientForm((p)=>({...p, idClientType:e.target.value}))}
                          >
                            <option value="">Sélectionner</option>
                            {clientTypes.map((t)=>(
                              <option key={t.IdClientType} value={t.IdClientType} className="text-black">{t.LibelleType}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Statut d'occupation *</label>
                          <select
                            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900"
                            value={clientForm.statutOccupation}
                            onChange={(e)=>setClientForm((p)=>({...p, statutOccupation:e.target.value}))}
                          >
                            <option value="">Sélectionner</option>
                            <option value="PROPRIETAIRE">Propriétaire</option>
                            <option value="LOCATAIRE">Locataire</option>
                            <option value="MANDATAIRE">Mandataire</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Nom *</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.nom} onChange={(e)=>setClientForm((p)=>({...p, nom:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Prénom</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.prenom} onChange={(e)=>setClientForm((p)=>({...p, prenom:e.target.value}))} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Adresse de résidence *</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.adresseResidence} onChange={(e)=>setClientForm((p)=>({...p, adresseResidence:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Commune de résidence *</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.communeResidence} onChange={(e)=>setClientForm((p)=>({...p, communeResidence:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Code postal de résidence *</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.codePostalResidence} onChange={(e)=>setClientForm((p)=>({...p, codePostalResidence:e.target.value}))} maxLength={5} />
                        </div>
                        {isBranchementType() && (
                          <>
                            <div className="md:col-span-2">
                              <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Adresse de branchement *</label>
                              <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.adresseBranchement} onChange={(e)=>setClientForm((p)=>({...p, adresseBranchement:e.target.value}))} />
                            </div>
                            <div>
                              <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Commune de branchement</label>
                              <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.communeBranchement} onChange={(e)=>setClientForm((p)=>({...p, communeBranchement:e.target.value}))} />
                            </div>
                            <div>
                              <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Code postal de branchement</label>
                              <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.codePostalBranchement} onChange={(e)=>setClientForm((p)=>({...p, codePostalBranchement:e.target.value}))} maxLength={5} />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Téléphone principal</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.telephonePrincipal} onChange={(e)=>setClientForm((p)=>({...p, telephonePrincipal:e.target.value}))} maxLength={10} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Téléphone secondaire</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.telephoneSecondaire} onChange={(e)=>setClientForm((p)=>({...p, telephoneSecondaire:e.target.value}))} maxLength={10} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Fax</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.fax} onChange={(e)=>setClientForm((p)=>({...p, fax:e.target.value}))} maxLength={10} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Email</label>
                          <input type="email" className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.email} onChange={(e)=>setClientForm((p)=>({...p, email:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">N° pièce d'identité</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.numeroPieceIdentite} onChange={(e)=>setClientForm((p)=>({...p, numeroPieceIdentite:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Délivrée par</label>
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.pieceDelivrePar} onChange={(e)=>setClientForm((p)=>({...p, pieceDelivrePar:e.target.value}))} />
                        </div>
                        <div>
                          <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Date de délivrance</label>
                          <input type="date" className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.dateDelivrancePiece} onChange={(e)=>setClientForm((p)=>({...p, dateDelivrancePiece:e.target.value}))} />
                        </div>
                        {isBranchementType() && (
                          <div>
                            <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Diamètre branchement</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={
                                  showDiametreDropdown
                                    ? diametreSearch
                                    : (clientForm.diametreBranchement || '')
                                }
                                onFocus={() => {
                                  setShowDiametreDropdown(true);
                                  setDiametreSearch(clientForm.diametreBranchement || '');
                                }}
                                onChange={(e) => {
                                  setDiametreSearch(e.target.value);
                                  setShowDiametreDropdown(true);
                                }}
                                onBlur={() => {
                                  setTimeout(() => setShowDiametreDropdown(false), 150);
                                }}
                                placeholder="Sélectionner un diamètre..."
                                className="w-full px-3 py-2 pr-8 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                              />
                              <svg
                                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              {showDiametreDropdown && (
                                <>
                                  {filteredDiametreOptions.length > 0 ? (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {filteredDiametreOptions.map((diametre) => (
                                        <button
                                          key={diametre}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => handleDiametreSelect(diametre)}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-500/20 dark:hover:bg-blue-500/20 dark:text-white text-gray-900 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                        >
                                          {diametre}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-white/20 border-gray-300 rounded-lg shadow-lg p-3">
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Aucun diamètre trouvé</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center p-2 rounded-full bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 hover:text-white transition-colors"
                          title="Annuler la création du client"
                          aria-label="Annuler la création du client"
                          onClick={()=>setNewClientMode(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="sr-only">Annuler la création du client</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {selectedClient && (
                  <div className="glass-card p-4">
                    <h3 className="text-lg font-semibold mb-3 dark:text-white text-gray-900">Informations client</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Nom complet</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.Nom} {selectedClient.Prenom || ''}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Téléphone</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.TelephonePrincipal}{selectedClient.TelephoneSecondaire ? ` / ${selectedClient.TelephoneSecondaire}` : ''}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Email</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.Email || '—'}</p>
                      </div>
                      <div className="md:col-span-3">
                        <p className="dark:text-gray-400 text-gray-600">Adresse de branchement</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.AdresseBranchement}</p>
                      </div>
                      <div className="md:col-span-3">
                        <p className="dark:text-gray-400 text-gray-600">Adresse de résidence</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.AdresseResidence}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Commune de résidence</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.CommuneResidence || '—'}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Code postal de résidence</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.CodePostalResidence || '—'}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Statut d'occupation</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.StatutOccupation || '—'}</p>
                      </div>
                      <div>
                        <p className="dark:text-gray-400 text-gray-600">Diamètre</p>
                        <p className="dark:text-white text-gray-900 font-medium">{selectedClient.DiametreBranchement || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Commentaire</label>
                  <textarea
                    name="commentaire"
                    value={form.commentaire}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ajouter des détails ou pièces justificatives (références)"
                  />
                </div>

                <div className="flex justify-end gap-3 items-center">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-gray-200"
                    title="Imprimer la demande"
                    aria-label="Imprimer la demande"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="sr-only">Imprimer la demande</span>
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50"
                    title={submitting ? 'Enregistrement en cours' : 'Enregistrer la demande'}
                    aria-label={submitting ? 'Enregistrement en cours' : 'Enregistrer la demande'}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="sr-only">{submitting ? 'Enregistrement en cours' : 'Enregistrer la demande'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default DemandeForm;
