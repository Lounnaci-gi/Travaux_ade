const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// SQL Server Configuration
const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';

let dbConfig;

if (useWindowsAuth) {
  console.error('❌ Authentification Windows n\'est pas encore supportée avec le driver actuel.');
  console.error('💡 Veuillez utiliser l\'authentification SQL Server (DB_USE_WINDOWS_AUTH=false)');
  console.error('💡 Ou installez le package msnodesqlv8 pour l\'authentification Windows');
  process.exit(1);
} else {
  // Authentification SQL Server
  dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || 'AquaConnect_DB',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
  };
  console.log('🔐 Configuration: Authentification SQL Server');
}

// Afficher la configuration (sans mot de passe)
console.log('📋 Configuration de connexion:');
console.log(`   - Serveur: ${dbConfig.server}:${dbConfig.port}`);
console.log(`   - Base de données: ${dbConfig.database}`);
if (!useWindowsAuth) {
  console.log(`   - Utilisateur: ${dbConfig.user}`);
  console.log(`   - Chiffrement: ${dbConfig.options.encrypt}`);
  console.log(`   - Trust Certificate: ${dbConfig.options.trustServerCertificate}`);
}

// Database Connection Pool
let pool;

const connectDB = async () => {
  try {
    // Vérifier que les variables d'environnement sont chargées
    console.log('🔍 Vérification des variables d\'environnement...');
    
    // Afficher quelles variables sont présentes (sans valeurs sensibles)
    const envVars = {
      DB_SERVER: process.env.DB_SERVER ? '✓' : '✗',
      DB_PORT: process.env.DB_PORT ? '✓' : '✗',
      DB_DATABASE: process.env.DB_DATABASE ? '✓' : '✗',
      DB_USER: process.env.DB_USER ? '✓' : '✗',
      DB_PASSWORD: process.env.DB_PASSWORD ? (process.env.DB_PASSWORD.length > 0 ? '✓' : '✗ vide') : '✗',
    };
    
    console.log('Variables d\'environnement détectées:');
    console.log(`  DB_SERVER: ${envVars.DB_SERVER}`);
    console.log(`  DB_PORT: ${envVars.DB_PORT}`);
    console.log(`  DB_DATABASE: ${envVars.DB_DATABASE}`);
    console.log(`  DB_USER: ${envVars.DB_USER}`);
    console.log(`  DB_PASSWORD: ${envVars.DB_PASSWORD}`);
    
    if (!useWindowsAuth && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
      console.error('\n❌ Variables DB_USER et DB_PASSWORD requises pour l\'authentification SQL Server');
      console.error('💡 Vérifiez que votre fichier .env contient bien ces variables');
      console.error('💡 Le fichier .env doit être à la racine du projet (pas dans backend/)');
      process.exit(1);
    }

    console.log('🔄 Tentative de connexion à la base de données...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connexion à la base de données réussie');
    
    // Tester la connexion avec une requête simple
    const testRequest = pool.request();
    const testResult = await testRequest.query('SELECT @@VERSION as Version');
    console.log('✅ Test de connexion réussi');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code === 'ELOGIN') {
      console.error('\n💡 Solutions possibles:');
      console.error('   1. Vérifiez que le mot de passe SQL Server est correct');
      console.error('   2. Vérifiez que l\'authentification SQL Server est activée dans SQL Server');
      console.error('   3. Vérifiez que l\'utilisateur "sa" n\'est pas désactivé');
      console.error('   4. Essayez d\'utiliser l\'authentification Windows: DB_USE_WINDOWS_AUTH=true');
      console.error('   5. Vérifiez que le serveur SQL Server est démarré');
      console.error('   6. Vérifiez que le port 1433 est accessible');
    } else if (error.code === 'ETIMEOUT') {
      console.error('\n💡 Le serveur SQL Server ne répond pas. Vérifiez:');
      console.error('   1. Que SQL Server est démarré');
      console.error('   2. Que le nom du serveur (DB_SERVER) est correct');
      console.error('   3. Que le port (DB_PORT) est correct');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Le serveur SQL Server est introuvable. Vérifiez:');
      console.error('   1. Que le nom du serveur (DB_SERVER) est correct');
      console.error('   2. Que vous pouvez accéder au serveur depuis votre machine');
    }
    
    process.exit(1);
  }
};

// API Routes

// Get all work orders (OrdreExecution)
app.get('/api/travaux', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        o.IdOrdre,
        o.NumeroOrdre,
        o.DateEmission,
        o.DateDebutExecution,
        o.DateFinExecution,
        o.Instructions,
        o.Commentaire,
        s.LibelleStatut as Statut,
        s.CodeStatut as CodeStatut,
        d.NumeroDemande,
        dv.NumeroDevis,
        dv.MontantTotalTTC,
        c.Nom + ' ' + ISNULL(c.Prenom, '') as Client,
        c.TelephonePrincipal as TelephoneClient,
        u.Nom + ' ' + ISNULL(u.Prenom, '') as UtilisateurEmission
      FROM OrdreExecution o
      INNER JOIN OrdreExecutionStatut s ON o.IdOrdreStatut = s.IdOrdreStatut
      INNER JOIN DemandeBranchement d ON o.IdDemande = d.IdDemande
      INNER JOIN Devis dv ON o.IdDevis = dv.IdDevis
      INNER JOIN Client c ON d.IdClient = c.IdClient
      INNER JOIN Utilisateur u ON o.IdUtilisateurEmission = u.IdUtilisateur
      WHERE o.IdOrdre IS NOT NULL
      ORDER BY o.DateEmission DESC
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des travaux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get work order by ID
app.get('/api/travaux/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    const result = await request.query(`
      SELECT 
        o.*,
        s.LibelleStatut as Statut,
        d.NumeroDemande,
        dv.NumeroDevis,
        c.Nom + ' ' + ISNULL(c.Prenom, '') as Client,
        u.Nom + ' ' + ISNULL(u.Prenom, '') as UtilisateurEmission
      FROM OrdreExecution o
      INNER JOIN OrdreExecutionStatut s ON o.IdOrdreStatut = s.IdOrdreStatut
      INNER JOIN DemandeBranchement d ON o.IdDemande = d.IdDemande
      INNER JOIN Devis dv ON o.IdDevis = dv.IdDevis
      INNER JOIN Client c ON d.IdClient = c.IdClient
      INNER JOIN Utilisateur u ON o.IdUtilisateurEmission = u.IdUtilisateur
      WHERE o.IdOrdre = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Travaux non trouvé' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du travail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get work order history
app.get('/api/travaux/:id/historique', async (req, res) => {
  try {
    const { id } = req.params;
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    const result = await request.query(`
      SELECT 
        h.*,
        s1.LibelleStatut as StatutPrecedent,
        s2.LibelleStatut as StatutNouveau,
        u.Nom + ' ' + ISNULL(u.Prenom, '') as Utilisateur
      FROM OrdreExecutionHistorique h
      INNER JOIN OrdreExecutionStatut s1 ON h.IdStatutPrecedent = s1.IdOrdreStatut
      INNER JOIN OrdreExecutionStatut s2 ON h.IdStatutNouveau = s2.IdOrdreStatut
      INNER JOIN Utilisateur u ON h.IdUtilisateur = u.IdUtilisateur
      WHERE h.IdOrdre = @id
      ORDER BY h.DateAction DESC
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const request = pool.request();
    
    const stats = await request.query(`
      SELECT 
        (SELECT COUNT(*) FROM OrdreExecution) as TotalTravaux,
        (SELECT COUNT(*) FROM OrdreExecution WHERE IdOrdreStatut = 
          (SELECT IdOrdreStatut FROM OrdreExecutionStatut WHERE CodeStatut = 'EN_COURS')
        ) as TravauxEnCours,
        (SELECT COUNT(*) FROM OrdreExecution WHERE IdOrdreStatut = 
          (SELECT IdOrdreStatut FROM OrdreExecutionStatut WHERE CodeStatut = 'TERMINE')
        ) as TravauxTermines,
        (SELECT COUNT(*) FROM OrdreExecution WHERE DateDebutExecution IS NULL) as TravauxEnAttente
    `);
    
    res.json(stats.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Authentication Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const request = pool.request();
    request.input('email', sql.NVarChar, email);
    
    // Recherche par email ou matricule
    const result = await request.query(`
      SELECT 
        u.IdUtilisateur,
        u.Matricule,
        u.Nom,
        u.Prenom,
        u.Email,
        u.Telephone,
        u.MotDePasse,
        u.Actif,
        u.IdRole,
        u.IdUnite,
        u.IdCentre,
        u.IdAgence,
        r.LibelleRole as Role,
        r.CodeRole as CodeRole
      FROM Utilisateur u
      INNER JOIN Role r ON u.IdRole = r.IdRole
      WHERE (u.Email = @email OR u.Matricule = @email) AND u.Actif = 1
    `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = result.recordset[0];

    // Note: Dans un vrai système, vous devriez comparer avec bcrypt
    // Pour l'instant, comparaison simple (à changer en production)
    if (user.MotDePasse !== password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour la dernière connexion
    const updateRequest = pool.request();
    updateRequest.input('id', sql.Int, user.IdUtilisateur);
    await updateRequest.query(`
      UPDATE Utilisateur 
      SET DerniereConnexion = GETDATE() 
      WHERE IdUtilisateur = @id
    `);

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: user.IdUtilisateur,
        email: user.Email,
        role: user.CodeRole,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner les informations utilisateur (sans le mot de passe)
    const userInfo = {
      id: user.IdUtilisateur,
      matricule: user.Matricule,
      nom: user.Nom,
      prenom: user.Prenom,
      email: user.Email,
      telephone: user.Telephone,
      role: user.Role,
      codeRole: user.CodeRole,
      idRole: user.IdRole,
      idUnite: user.IdUnite,
      idCentre: user.IdCentre,
      idAgence: user.IdAgence,
    };

    res.json({
      token,
      user: userInfo,
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  // Pour JWT, le logout est côté client (suppression du token)
  // Ici on peut ajouter une blacklist de tokens si nécessaire
  res.json({ message: 'Déconnexion réussie' });
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'API AquaConnect - Serveur backend opérationnel',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
      },
      travaux: {
        list: 'GET /api/travaux',
        detail: 'GET /api/travaux/:id',
        historique: 'GET /api/travaux/:id/historique',
      },
      stats: 'GET /api/stats',
    },
    documentation: 'Consultez le README.md pour plus d\'informations',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur opérationnel' });
});

// Handle Chrome DevTools requests (optional - reduces console warnings)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================================================
// DEMANDES - LECTURE (listes pour le formulaire)
// ============================================================================

// Liste des clients (actifs)
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 200
        c.IdClient,
        c.Nom,
        c.Prenom,
        c.Email,
        c.TelephonePrincipal
      FROM Client c
      WHERE c.Actif = 1
      ORDER BY c.DateCreation DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Types de clients (placer AVANT la route :id pour éviter les collisions)
app.get('/api/clients/types', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 500 IdClientType, CodeType, LibelleType, Description, Actif
      FROM dbo.ClientType WITH (NOLOCK)
      ORDER BY IdClientType DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des types de clients:', error);
    try {
      return res.status(200).json([]);
    } catch (_) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
});

// Détails d'un client
app.get('/api/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id client invalide' });

    const request = pool.request();
    request.input('id', sql.Int, id);
    const result = await request.query(`
      SELECT 
        c.IdClient,
        c.Nom,
        c.Prenom,
        c.Email,
        c.TelephonePrincipal,
        c.TelephoneSecondaire,
        c.AdresseResidence,
        c.AdresseBranchement,
        c.TypeBranchement,
        c.NumeroPieceIdentite,
        c.PieceDelivrePar,
        c.DateDelivrancePiece,
        c.StatutOccupation,
        c.DiametreBranchement,
        c.Actif,
        c.DateCreation,
        c.DateModification
      FROM Client c
      WHERE c.IdClient = @id
    `);
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Client introuvable' });
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// (supprimé: doublon déplacé au-dessus de la route :id)

// Debug/health endpoint for client types
app.get('/api/clients/types/health', async (req, res) => {
  try {
    const countRes = await pool.request().query(`SELECT COUNT(*) as Total FROM dbo.ClientType`);
    return res.json({ total: countRes.recordset[0].Total });
  } catch (error) {
    console.error('ClientType health error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un client
app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    const {
      idClientType,
      nom,
      prenom,
      adresseResidence,
      communeResidence,
      codePostalResidence,
      adresseBranchement,
      communeBranchement,
      codePostalBranchement,
      telephonePrincipal,
      telephoneSecondaire,
      fax,
      email,
      typeBranchement,
      numeroPieceIdentite,
      pieceDelivrePar,
      dateDelivrancePiece,
      statutOccupation,
      diametreBranchement
    } = req.body;

    const required = ['idClientType', 'nom', 'adresseResidence', 'communeResidence', 'codePostalResidence', 'statutOccupation'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    const r = pool.request();
    r.input('idClientType', sql.Int, idClientType);
    r.input('nom', sql.NVarChar(100), nom);
    r.input('prenom', sql.NVarChar(100), prenom || null);
    r.input('adresseResidence', sql.NVarChar(200), adresseResidence);
    r.input('communeResidence', sql.NVarChar(100), communeResidence);
    r.input('codePostalResidence', sql.NVarChar(10), codePostalResidence);
    r.input('adresseBranchement', sql.NVarChar(200), adresseBranchement || null);
    r.input('communeBranchement', sql.NVarChar(100), communeBranchement || null);
    r.input('codePostalBranchement', sql.NVarChar(10), codePostalBranchement || null);
    r.input('telephonePrincipal', sql.NVarChar(20), telephonePrincipal || null);
    r.input('telephoneSecondaire', sql.NVarChar(20), telephoneSecondaire || null);
    r.input('fax', sql.NVarChar(20), fax || null);
    r.input('email', sql.NVarChar(100), email || null);
    r.input('typeBranchement', sql.NVarChar(50), typeBranchement || null);
    r.input('numeroPieceIdentite', sql.NVarChar(50), numeroPieceIdentite || null);
    r.input('pieceDelivrePar', sql.NVarChar(100), pieceDelivrePar || null);
    r.input('dateDelivrancePiece', sql.Date, dateDelivrancePiece || null);
    r.input('statutOccupation', sql.NVarChar(20), statutOccupation);
    r.input('diametreBranchement', sql.NVarChar(20), diametreBranchement || null);

    const insert = await r.query(`
      INSERT INTO Client (
        IdClientType, Nom, Prenom, AdresseResidence, CommuneResidence, CodePostalResidence,
        AdresseBranchement, CommuneBranchement, CodePostalBranchement,
        TelephonePrincipal, TelephoneSecondaire, Fax, Email, TypeBranchement,
        NumeroPieceIdentite, PieceDelivrePar, DateDelivrancePiece, StatutOccupation,
        DiametreBranchement, Actif, DateCreation
      )
      OUTPUT INSERTED.*
      VALUES (
        @idClientType, @nom, @prenom, @adresseResidence, @communeResidence, @codePostalResidence,
        @adresseBranchement, @communeBranchement, @codePostalBranchement,
        @telephonePrincipal, @telephoneSecondaire, @fax, @email, @typeBranchement,
        @numeroPieceIdentite, @pieceDelivrePar, @dateDelivrancePiece, @statutOccupation,
        @diametreBranchement, 1, GETDATE()
      )
    `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un type de client (CodeType auto CTC-XXXX)
app.post('/api/clients/types', verifyToken, async (req, res) => {
  try {
    const { LibelleType, Description, Actif } = req.body;
    if (!LibelleType) {
      return res.status(400).json({ error: 'LibelleType est requis' });
    }

    // Générer CodeType format CTC-XXXX
    const maxResult = await pool.request().query(`
      SELECT MAX(CAST(SUBSTRING(CodeType, 5, LEN(CodeType)) AS INT)) as MaxNum
      FROM ClientType
      WHERE CodeType LIKE 'CTC-%' AND ISNUMERIC(SUBSTRING(CodeType, 5, LEN(CodeType))) = 1
    `);
    let nextNumber = 1;
    if (maxResult.recordset[0].MaxNum !== null) nextNumber = maxResult.recordset[0].MaxNum + 1;
    const CodeType = `CTC-${nextNumber.toString().padStart(4, '0')}`;

    const insert = await pool.request()
      .input('CodeType', sql.NVarChar(20), CodeType)
      .input('LibelleType', sql.NVarChar(100), LibelleType)
      .input('Description', sql.NVarChar(255), Description || null)
      .input('Actif', sql.Bit, Actif === false ? 0 : 1)
      .query(`
        INSERT INTO ClientType (CodeType, LibelleType, Description, Actif, DateCreation)
        OUTPUT INSERTED.*
        VALUES (@CodeType, @LibelleType, @Description, @Actif, GETDATE())
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création du type client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// HIERARCHIE GEOGRAPHIQUE - UNITES
// ============================================================================

// Récupérer une unité par ID avec tous les champs (doit être défini avant la route générique)
app.get('/api/unites/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          IdUnite, CodeUnite, NomUnite, Adresse, Commune, CodePostal,
          TelephonePrincipal, TelephoneSecondaire, Fax, Email, SiteWeb,
          NumeroIdentifiantFiscal, NumeroIdentificationStatistique,
          NumeroRegistreCommerce, NumerocompteBancaire, NumeroComptePostal,
          Actif, DateCreation, DateModification
        FROM Unite
        WHERE IdUnite = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Unité introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'unité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des unités
app.get('/api/unites', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 200
        u.IdUnite,
        u.CodeUnite,
        u.NomUnite,
        u.Adresse,
        u.Commune,
        u.CodePostal,
        u.TelephonePrincipal,
        u.TelephoneSecondaire,
        u.Fax,
        u.Email,
        u.SiteWeb,
        u.Actif
      FROM Unite u
      WHERE u.Actif = 1
      ORDER BY u.NomUnite
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des unités:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'une unité (CodeUnite auto UNITE-XXX)
app.post('/api/unites', verifyToken, async (req, res) => {
  try {
    const {
      NomUnite,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email,
      SiteWeb,
      NumeroIdentifiantFiscal,
      NumeroIdentificationStatistique,
      NumeroRegistreCommerce,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    if (!NomUnite) {
      return res.status(400).json({ error: 'NomUnite est requis' });
    }

    // Générer CodeUnite format UNITE-XXX
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeUnite, 7, LEN(CodeUnite)) AS INT)), 0) as MaxNum
      FROM Unite
      WHERE CodeUnite LIKE 'UNITE-%' AND ISNUMERIC(SUBSTRING(CodeUnite, 7, LEN(CodeUnite))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const CodeUnite = `UNITE-${String(nextNumber).padStart(3, '0')}`;

    const insert = await pool.request()
      .input('CodeUnite', sql.NVarChar(20), CodeUnite)
      .input('NomUnite', sql.NVarChar(100), NomUnite)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(10), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('SiteWeb', sql.NVarChar(100), SiteWeb || null)
      .input('NumeroIdentifiantFiscal', sql.NVarChar(20), NumeroIdentifiantFiscal || null)
      .input('NumeroIdentificationStatistique', sql.NVarChar(20), NumeroIdentificationStatistique || null)
      .input('NumeroRegistreCommerce', sql.NVarChar(20), NumeroRegistreCommerce || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        INSERT INTO Unite (
          CodeUnite, NomUnite, Adresse, Commune, CodePostal, TelephonePrincipal, TelephoneSecondaire,
          Fax, Email, SiteWeb, NumeroIdentifiantFiscal, NumeroIdentificationStatistique,
          NumeroRegistreCommerce, NumerocompteBancaire, NumeroComptePostal, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @CodeUnite, @NomUnite, @Adresse, @Commune, @CodePostal, @TelephonePrincipal, @TelephoneSecondaire,
          @Fax, @Email, @SiteWeb, @NumeroIdentifiantFiscal, @NumeroIdentificationStatistique,
          @NumeroRegistreCommerce, @NumerocompteBancaire, @NumeroComptePostal, 1, GETDATE()
        )
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création de l\'unité:', error);
    console.error('Détails:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mise à jour d'une unité
app.put('/api/unites/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      NomUnite,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email,
      SiteWeb,
      NumeroIdentifiantFiscal,
      NumeroIdentificationStatistique,
      NumeroRegistreCommerce,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    if (!NomUnite) {
      return res.status(400).json({ error: 'NomUnite est requis' });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('NomUnite', sql.NVarChar(100), NomUnite)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(10), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('SiteWeb', sql.NVarChar(100), SiteWeb || null)
      .input('NumeroIdentifiantFiscal', sql.NVarChar(20), NumeroIdentifiantFiscal || null)
      .input('NumeroIdentificationStatistique', sql.NVarChar(20), NumeroIdentificationStatistique || null)
      .input('NumeroRegistreCommerce', sql.NVarChar(20), NumeroRegistreCommerce || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        UPDATE Unite SET
          NomUnite = @NomUnite,
          Adresse = @Adresse,
          Commune = @Commune,
          CodePostal = @CodePostal,
          TelephonePrincipal = @TelephonePrincipal,
          TelephoneSecondaire = @TelephoneSecondaire,
          Fax = @Fax,
          Email = @Email,
          SiteWeb = @SiteWeb,
          NumeroIdentifiantFiscal = @NumeroIdentifiantFiscal,
          NumeroIdentificationStatistique = @NumeroIdentificationStatistique,
          NumeroRegistreCommerce = @NumeroRegistreCommerce,
          NumerocompteBancaire = @NumerocompteBancaire,
          NumeroComptePostal = @NumeroComptePostal,
          DateModification = GETDATE()
        OUTPUT INSERTED.*
        WHERE IdUnite = @id
      `);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Unité introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'unité:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================================
// HIERARCHIE GEOGRAPHIQUE - CENTRES
// ============================================================================

// Récupérer un centre par ID avec tous les champs (doit être défini avant la route générique)
app.get('/api/centres/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          c.IdCentre, c.CodeCentre, c.NomCentre, c.PrefixeCentre, c.IdUnite,
          c.Adresse, c.Commune, c.CodePostal,
          c.TelephonePrincipal, c.TelephoneSecondaire, c.Fax, c.Email,
          c.NumerocompteBancaire, c.NumeroComptePostal,
          c.Actif, c.DateCreation, c.DateModification
        FROM Centre c
        WHERE c.IdCentre = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Centre introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du centre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des centres
app.get('/api/centres', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 200
        c.IdCentre,
        c.CodeCentre,
        c.NomCentre,
        c.PrefixeCentre,
        c.IdUnite,
        u.NomUnite,
        c.Adresse,
        c.Commune,
        c.CodePostal,
        c.Actif
      FROM Centre c
      INNER JOIN Unite u ON c.IdUnite = u.IdUnite
      WHERE c.Actif = 1
      ORDER BY c.NomCentre
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des centres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un centre (CodeCentre auto CEN-XXXX)
app.post('/api/centres', verifyToken, async (req, res) => {
  try {
    const {
      IdUnite,
      NomCentre,
      PrefixeCentre,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const required = ['IdUnite', 'NomCentre', 'PrefixeCentre', 'Adresse', 'Commune', 'CodePostal', 'TelephonePrincipal'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    // Générer CodeCentre format CEN-XXXX
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeCentre, 5, LEN(CodeCentre)) AS INT)), 0) as MaxNum
      FROM Centre
      WHERE CodeCentre LIKE 'CEN-%' AND ISNUMERIC(SUBSTRING(CodeCentre, 5, LEN(CodeCentre))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const CodeCentre = `CEN-${String(nextNumber).padStart(4, '0')}`;

    const insert = await pool.request()
      .input('IdUnite', sql.Int, IdUnite)
      .input('CodeCentre', sql.NVarChar(20), CodeCentre)
      .input('NomCentre', sql.NVarChar(100), NomCentre)
      .input('PrefixeCentre', sql.NVarChar(5), PrefixeCentre)
      .input('Adresse', sql.NVarChar(200), Adresse)
      .input('Commune', sql.NVarChar(60), Commune)
      .input('CodePostal', sql.NVarChar(10), CodePostal)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        INSERT INTO Centre (
          IdUnite, CodeCentre, NomCentre, PrefixeCentre, Adresse, Commune, CodePostal,
          TelephonePrincipal, TelephoneSecondaire, Fax, Email,
          NumerocompteBancaire, NumeroComptePostal, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @IdUnite, @CodeCentre, @NomCentre, @PrefixeCentre, @Adresse, @Commune, @CodePostal,
          @TelephonePrincipal, @TelephoneSecondaire, @Fax, @Email,
          @NumerocompteBancaire, @NumeroComptePostal, 1, GETDATE()
        )
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création du centre:', error);
    console.error('Détails:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mise à jour d'un centre
app.put('/api/centres/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      IdUnite,
      NomCentre,
      PrefixeCentre,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const required = ['IdUnite', 'NomCentre', 'PrefixeCentre', 'Adresse', 'Commune', 'CodePostal', 'TelephonePrincipal'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('IdUnite', sql.Int, IdUnite)
      .input('NomCentre', sql.NVarChar(100), NomCentre)
      .input('PrefixeCentre', sql.NVarChar(5), PrefixeCentre)
      .input('Adresse', sql.NVarChar(200), Adresse)
      .input('Commune', sql.NVarChar(60), Commune)
      .input('CodePostal', sql.NVarChar(10), CodePostal)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        UPDATE Centre SET
          IdUnite = @IdUnite,
          NomCentre = @NomCentre,
          PrefixeCentre = @PrefixeCentre,
          Adresse = @Adresse,
          Commune = @Commune,
          CodePostal = @CodePostal,
          TelephonePrincipal = @TelephonePrincipal,
          TelephoneSecondaire = @TelephoneSecondaire,
          Fax = @Fax,
          Email = @Email,
          NumerocompteBancaire = @NumerocompteBancaire,
          NumeroComptePostal = @NumeroComptePostal,
          DateModification = GETDATE()
        OUTPUT INSERTED.*
        WHERE IdCentre = @id
      `);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Centre introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du centre:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================================
// HIERARCHIE GEOGRAPHIQUE - AGENCES
// ============================================================================

// Récupérer une agence par ID avec tous les champs (doit être défini avant la route générique)
app.get('/api/agences/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          a.IdAgence, a.CodeAgence, a.NomAgence, a.IdCentre,
          a.Adresse, a.Commune, a.CodePostal,
          a.TelephonePrincipal, a.TelephoneSecondaire, a.Fax, a.Email,
          a.Actif, a.DateCreation, a.DateModification
        FROM AgenceCommerciale a
        WHERE a.IdAgence = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des agences
app.get('/api/agences', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 200
        a.IdAgence,
        a.CodeAgence,
        a.NomAgence
      FROM AgenceCommerciale a
      WHERE a.Actif = 1
      ORDER BY a.NomAgence
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des agences:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'une agence (CodeAgence auto AG-XXX)
app.post('/api/agences', verifyToken, async (req, res) => {
  try {
    const {
      IdCentre,
      NomAgence,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email
    } = req.body;

    if (!IdCentre || !NomAgence) {
      return res.status(400).json({ error: 'IdCentre et NomAgence sont requis' });
    }

    // Générer CodeAgence format AG-XXX
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeAgence, 4, LEN(CodeAgence)) AS INT)), 0) as MaxNum
      FROM AgenceCommerciale
      WHERE CodeAgence LIKE 'AG-%' AND ISNUMERIC(SUBSTRING(CodeAgence, 4, LEN(CodeAgence))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const CodeAgence = `AG-${String(nextNumber).padStart(3, '0')}`;

    const insert = await pool.request()
      .input('IdCentre', sql.Int, IdCentre)
      .input('CodeAgence', sql.NVarChar(20), CodeAgence)
      .input('NomAgence', sql.NVarChar(100), NomAgence)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(10), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .query(`
        INSERT INTO AgenceCommerciale (
          IdCentre, CodeAgence, NomAgence, Adresse, Commune, CodePostal,
          TelephonePrincipal, TelephoneSecondaire, Fax, Email, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @IdCentre, @CodeAgence, @NomAgence, @Adresse, @Commune, @CodePostal,
          @TelephonePrincipal, @TelephoneSecondaire, @Fax, @Email, 1, GETDATE()
        )
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création de l\'agence:', error);
    console.error('Détails:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mise à jour d'une agence
app.put('/api/agences/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      IdCentre,
      NomAgence,
      Adresse,
      Commune,
      CodePostal,
      TelephonePrincipal,
      TelephoneSecondaire,
      Fax,
      Email
    } = req.body;

    if (!IdCentre || !NomAgence) {
      return res.status(400).json({ error: 'IdCentre et NomAgence sont requis' });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('IdCentre', sql.Int, IdCentre)
      .input('NomAgence', sql.NVarChar(100), NomAgence)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(10), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(20), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .query(`
        UPDATE AgenceCommerciale SET
          IdCentre = @IdCentre,
          NomAgence = @NomAgence,
          Adresse = @Adresse,
          Commune = @Commune,
          CodePostal = @CodePostal,
          TelephonePrincipal = @TelephonePrincipal,
          TelephoneSecondaire = @TelephoneSecondaire,
          Fax = @Fax,
          Email = @Email,
          DateModification = GETDATE()
        OUTPUT INSERTED.*
        WHERE IdAgence = @id
      `);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'agence:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Liste des types de demandes
app.get('/api/demandes/types', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT IdDemandeType, CodeType, LibelleType
      FROM DemandeType
      ORDER BY DateCreation DESC, LibelleType
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erreur lors de la récupération des types de demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un type de travaux (DemandeType)
app.post('/api/demandes/types', verifyToken, async (req, res) => {
  try {
    const { LibelleType, Description, ValidationJuridiqueRequise, ValidationChefAgenceRequise } = req.body;

    if (!LibelleType) {
      return res.status(400).json({ error: 'LibelleType est requis' });
    }

    // Générer automatiquement le CodeType au format CTY-XXXX
    // Chercher le dernier numéro utilisé
    const maxResult = await pool.request().query(`
      SELECT MAX(CAST(SUBSTRING(CodeType, 5, LEN(CodeType)) AS INT)) as MaxNum
      FROM DemandeType
      WHERE CodeType LIKE 'CTY-%' AND ISNUMERIC(SUBSTRING(CodeType, 5, LEN(CodeType))) = 1
    `);
    
    let nextNumber = 1;
    if (maxResult.recordset[0].MaxNum !== null) {
      nextNumber = maxResult.recordset[0].MaxNum + 1;
    }
    
    // Formater avec padding de 4 chiffres (CTY-0001, CTY-0002, etc.)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    const CodeType = `CTY-${formattedNumber}`;

    const insert = await pool.request()
      .input('CodeType', sql.NVarChar(50), CodeType)
      .input('LibelleType', sql.NVarChar(100), LibelleType)
      .input('Description', sql.NVarChar(255), Description || null)
      .input('VJ', sql.Bit, ValidationJuridiqueRequise === true)
      .input('VCA', sql.Bit, ValidationChefAgenceRequise === true)
      .query(`
        INSERT INTO DemandeType (CodeType, LibelleType, Description, ValidationJuridiqueRequise, ValidationChefAgenceRequise, Actif, DateCreation)
        OUTPUT INSERTED.*
        VALUES (@CodeType, @LibelleType, @Description, @VJ, @VCA, 1, GETDATE())
      `);

    res.status(201).json(insert.recordset[0]);
  } catch (error) {
    console.error('Erreur lors de la création du type de travaux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// DEMANDES - CREATION
// ============================================================================

app.post('/api/demandes', verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const {
      idAgence,
      idClient,
      idDemandeType,
      objetDemande,
      commentaire,
      delaiPaiementJours,
      client: clientPayload
    } = req.body;

    if (!idAgence || !idDemandeType) {
      return res.status(400).json({ error: 'idAgence et idDemandeType sont requis' });
    }

    await transaction.begin();
    const tr = new sql.Request(transaction);

    let clientId = idClient || null;

    // Si un payload client est fourni, créer le client d'abord
    if (!clientId && clientPayload) {
      const required = ['idClientType','nom','adresseResidence','communeResidence','codePostalResidence','statutOccupation'];
      const missing = required.filter((f)=>!clientPayload[f]);
      if (missing.length) {
        await transaction.rollback();
        return res.status(400).json({ error: `Champs client obligatoires manquants: ${missing.join(', ')}` });
      }

      tr.input('idClientType', sql.Int, clientPayload.idClientType);
      tr.input('nom', sql.NVarChar(100), clientPayload.nom);
      tr.input('prenom', sql.NVarChar(100), clientPayload.prenom || null);
      tr.input('adresseResidence', sql.NVarChar(200), clientPayload.adresseResidence);
      tr.input('communeResidence', sql.NVarChar(100), clientPayload.communeResidence);
      tr.input('codePostalResidence', sql.NVarChar(10), clientPayload.codePostalResidence);
      tr.input('adresseBranchement', sql.NVarChar(200), clientPayload.adresseBranchement || null);
      tr.input('communeBranchement', sql.NVarChar(100), clientPayload.communeBranchement || null);
      tr.input('codePostalBranchement', sql.NVarChar(10), clientPayload.codePostalBranchement || null);
      tr.input('telephonePrincipal', sql.NVarChar(20), clientPayload.telephonePrincipal || null);
      tr.input('telephoneSecondaire', sql.NVarChar(20), clientPayload.telephoneSecondaire || null);
      tr.input('fax', sql.NVarChar(20), clientPayload.fax || null);
      tr.input('email', sql.NVarChar(100), clientPayload.email || null);
      tr.input('typeBranchement', sql.NVarChar(50), clientPayload.typeBranchement || null);
      tr.input('numeroPieceIdentite', sql.NVarChar(50), clientPayload.numeroPieceIdentite || null);
      tr.input('pieceDelivrePar', sql.NVarChar(100), clientPayload.pieceDelivrePar || null);
      tr.input('dateDelivrancePiece', sql.Date, clientPayload.dateDelivrancePiece || null);
      tr.input('statutOccupation', sql.NVarChar(20), clientPayload.statutOccupation);
      tr.input('diametreBranchement', sql.NVarChar(20), clientPayload.diametreBranchement || null);

      const clientInsert = await tr.query(`
        INSERT INTO Client (
          IdClientType, Nom, Prenom, AdresseResidence, CommuneResidence, CodePostalResidence,
          AdresseBranchement, CommuneBranchement, CodePostalBranchement,
          TelephonePrincipal, TelephoneSecondaire, Fax, Email, TypeBranchement,
          NumeroPieceIdentite, PieceDelivrePar, DateDelivrancePiece, StatutOccupation,
          DiametreBranchement, Actif, DateCreation
        )
        OUTPUT INSERTED.IdClient
        VALUES (
          @idClientType, @nom, @prenom, @adresseResidence, @communeResidence, @codePostalResidence,
          @adresseBranchement, @communeBranchement, @codePostalBranchement,
          @telephonePrincipal, @telephoneSecondaire, @fax, @email, @typeBranchement,
          @numeroPieceIdentite, @pieceDelivrePar, @dateDelivrancePiece, @statutOccupation,
          @diametreBranchement, 1, GETDATE()
        )
      `);
      clientId = clientInsert.recordset[0].IdClient;
    }

    if (!clientId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Client manquant: fournir idClient ou un objet client complet' });
    }

    // Insertion de la demande
    const reqInsert = new sql.Request(transaction);
    reqInsert.input('idAgence', sql.Int, idAgence);
    reqInsert.input('idClient', sql.Int, clientId);
    reqInsert.input('idDemandeType', sql.Int, idDemandeType);
    reqInsert.input('idUtilisateur', sql.Int, req.user?.id || null);
    reqInsert.input('objetDemande', sql.NVarChar(sql.MAX), objetDemande || null);
    reqInsert.input('commentaire', sql.NVarChar(sql.MAX), commentaire || null);
    reqInsert.input('delai', sql.Int, delaiPaiementJours || 30);

    const insertQuery = `
      DECLARE @today NVARCHAR(8) = CONVERT(NVARCHAR(8), GETDATE(), 112);
      DECLARE @countToday INT = (
        SELECT COUNT(*) FROM DemandeBranchement WHERE CONVERT(NVARCHAR(8), DateCreation, 112) = @today
      );
      DECLARE @seq NVARCHAR(4) = RIGHT('0000' + CAST(@countToday + 1 AS NVARCHAR(4)), 4);
      DECLARE @numero NVARCHAR(50) = CONCAT('DEM-', @today, '-', @seq);

      DECLARE @idStatut INT = (
        SELECT TOP 1 IdStatut FROM DemandeStatut WHERE Actif = 1 ORDER BY OrdreStatut ASC
      );

      INSERT INTO DemandeBranchement (
        NumeroDemande,
        IdAgence,
        IdClient,
        IdDemandeType,
        IdStatut,
        IdUtilisateurCreation,
        DateDemande,
        ObjetDemande,
        Commentaire,
        DelaiPaiementJours,
        Actif,
        DateCreation
      )
      OUTPUT INSERTED.*
      VALUES (
        @numero,
        @idAgence,
        @idClient,
        @idDemandeType,
        @idStatut,
        @idUtilisateur,
        GETDATE(),
        @objetDemande,
        @commentaire,
        @delai,
        1,
        GETDATE()
      );
    `;

    const result = await reqInsert.query(insertQuery);
    await transaction.commit();
    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error('Erreur lors de la création de la demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  });
};

startServer();

