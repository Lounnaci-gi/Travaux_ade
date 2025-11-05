import React, { useEffect, useState } from 'react';
import { alertSuccess, alertError, confirmDialog } from '../ui/alerts';
import { getClients, getClientById, getClientTypes, getAgences, getDemandeTypes, createClient, createDemande } from '../services/api';

const DemandeForm = ({ onCreated }) => {
  const [clients, setClients] = useState([]);
  const [agences, setAgences] = useState([]);
  const [types, setTypes] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

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
    typeBranchement: '',
    numeroPieceIdentite: '',
    pieceDelivrePar: '',
    dateDelivrancePiece: '',
    statutOccupation: '',
    diametreBranchement: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Charger d'abord les types de demande pour remplir la liste déroulante
        const typesData = await getDemandeTypes();
        setTypes(typesData || []);

        // Charger les autres référentiels sans bloquer le formulaire en cas d'erreur
        const [clientsRes, agencesRes, clientTypesRes] = await Promise.allSettled([
          getClients(),
          getAgences(),
          getClientTypes(),
        ]);
        if (clientsRes.status === 'fulfilled') setClients(clientsRes.value);
        if (agencesRes.status === 'fulfilled') setAgences(agencesRes.value);
        if (clientTypesRes.status === 'fulfilled') setClientTypes(clientTypesRes.value);
      } catch (e) {
        setError('Erreur lors du chargement des données');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      // Vérifier que l'agence est sélectionnée
      if (!form.idAgence) {
        setSubmitting(false);
        setError('Veuillez sélectionner une agence.');
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
            typeBranchement: null,
            diametreBranchement: null,
          }),
        } : undefined,
        idAgence: Number(form.idAgence),
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
          typeBranchement: '', numeroPieceIdentite: '', pieceDelivrePar: '', dateDelivrancePiece: '',
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
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Nouvelle Demande
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Enregistrer une nouvelle demande dans le système</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Type de demande</label>
              <select
                name="idDemandeType"
                value={form.idDemandeType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un type</option>
                {types.map((t) => (
                  <option key={t.IdDemandeType} value={t.IdDemandeType} className="text-black">
                    {t.LibelleType}
                  </option>
                ))}
              </select>
            </div>

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
                  <button
                    type="button"
                    className="mt-2 text-sm dark:text-blue-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-700"
                    onClick={() => { setNewClientMode(true); setForm((p)=>({...p, idClient:''})); setSelectedClient(null);} }
                  >
                    + Créer un nouveau client
                  </button>
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
                      <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.codePostalResidence} onChange={(e)=>setClientForm((p)=>({...p, codePostalResidence:e.target.value}))} maxLength={10} />
                    </div>
                    {/* Masquer les champs de branchement si ce n'est pas un type branchement */}
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
                          <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.codePostalBranchement} onChange={(e)=>setClientForm((p)=>({...p, codePostalBranchement:e.target.value}))} maxLength={10} />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Téléphone principal</label>
                      <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.telephonePrincipal} onChange={(e)=>setClientForm((p)=>({...p, telephonePrincipal:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Téléphone secondaire</label>
                      <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.telephoneSecondaire} onChange={(e)=>setClientForm((p)=>({...p, telephoneSecondaire:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Fax</label>
                      <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.fax} onChange={(e)=>setClientForm((p)=>({...p, fax:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Email</label>
                      <input type="email" className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.email} onChange={(e)=>setClientForm((p)=>({...p, email:e.target.value}))} />
                    </div>
                    {isBranchementType() && (
                      <div>
                        <label className="block text-xs dark:text-gray-400 text-gray-600 mb-1">Type de branchement</label>
                        <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.typeBranchement} onChange={(e)=>setClientForm((p)=>({...p, typeBranchement:e.target.value}))} />
                      </div>
                    )}
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
                        <input className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900" value={clientForm.diametreBranchement} onChange={(e)=>setClientForm((p)=>({...p, diametreBranchement:e.target.value}))} />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" className="text-sm dark:text-gray-300 text-gray-700 dark:hover:text-white hover:text-gray-900" onClick={()=>setNewClientMode(false)}>Annuler</button>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm dark:text-gray-300 text-gray-700 mb-2">Agence</label>
              <select
                name="idAgence"
                value={form.idAgence}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg dark:bg-white/10 bg-white/80 border dark:border-white/20 border-gray-300 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une agence</option>
                {agences.map((a) => (
                  <option key={a.IdAgence} value={a.IdAgence} className="text-black">
                    {a.CodeAgence} - {a.NomAgence}
                  </option>
                ))}
              </select>
            </div>
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
                  <p className="dark:text-gray-400 text-gray-600">Type de branchement</p>
                  <p className="dark:text-white text-gray-900 font-medium">{selectedClient.TypeBranchement || '—'}</p>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer la Demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DemandeForm;


