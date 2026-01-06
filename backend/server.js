const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 3;
const LOGIN_LOCK_DURATION_MS = (parseInt(process.env.LOGIN_LOCK_DURATION_MINUTES, 10) || 15) * 60 * 1000;
const loginAttemptStore = new Map();

const MIN_SUBSTRING_MATCH_LENGTH = 4;

const normalizeName = (value = '') => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const cleanupAttemptRecord = (key) => {
  const record = loginAttemptStore.get(key);
  if (!record) {
    return null;
  }

  if (record.lockUntil && record.lockUntil <= Date.now()) {
    loginAttemptStore.delete(key);
    return null;
  }

  return record;
};

const getRemainingLockMessage = (lockUntil) => {
  const remainingMs = Math.max(0, lockUntil - Date.now());
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  if (remainingMinutes <= 1) {
    return "Veuillez réessayer dans 1 minute.";
  }
  return `Veuillez réessayer dans ${remainingMinutes} minutes.`;
};

// Middleware
app.use(cors());
// Middleware express.json() avec gestion d'erreur pour éviter les 400 sur les requêtes GET
app.use((req, res, next) => {
  // Pour les requêtes GET, on ignore le body parsing
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  express.json()(req, res, next);
});

// Middleware de logging pour les requêtes API (désactivé en production)
// app.use('/api', (req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
//   next();
// });

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
  // Configuration: Authentification SQL Server
}

// Configuration de connexion (logs désactivés)

// Database Connection Pool
let pool;

const connectDB = async () => {
  try {
    if (!useWindowsAuth && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
      console.error('\n❌ Variables DB_USER et DB_PASSWORD requises pour l\'authentification SQL Server');
      console.error('💡 Vérifiez que votre fichier .env contient bien ces variables');
      console.error('💡 Le fichier .env doit être à la racine du projet (pas dans backend/)');
      process.exit(1);
    }

    pool = await sql.connect(dbConfig);
    
    // Tester la connexion avec une requête simple
    const testRequest = pool.request();
    await testRequest.query('SELECT @@VERSION as Version');
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
      INNER JOIN DemandeTravaux d ON o.IdDemande = d.IdDemande
      INNER JOIN Devis dv ON o.IdDevis = dv.IdDevis
      INNER JOIN Client c ON d.IdClient = c.IdClient
      INNER JOIN Utilisateur u ON o.IdUtilisateurEmission = u.IdUtilisateur
      WHERE o.IdOrdre IS NOT NULL
      ORDER BY o.DateEmission DESC
    `);
    
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving travaux
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
      INNER JOIN DemandeTravaux d ON o.IdDemande = d.IdDemande
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
    // Error retrieving travail
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
    // Error retrieving historique
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

    const clientIp = getClientIp(req);
    const attemptKey = clientIp;

    const existingRecord = cleanupAttemptRecord(attemptKey);
    if (existingRecord && existingRecord.lockUntil && existingRecord.lockUntil > Date.now()) {
      const message = `Trop de tentatives de connexion infructueuses. ${getRemainingLockMessage(existingRecord.lockUntil)}`;
      return res.status(429).json({ error: message, lockUntil: existingRecord.lockUntil });
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
        u.Role,
        u.IdUnite,
        u.IdCentre,
        u.IdAgence
      FROM Utilisateur u
      WHERE (u.Email = @email OR u.Matricule = @email) AND u.Actif = 1
    `);

    if (result.recordset.length === 0) {
      const attempts = existingRecord ? existingRecord.count + 1 : 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = Date.now() + LOGIN_LOCK_DURATION_MS;
        loginAttemptStore.set(attemptKey, {
          count: attempts,
          lockUntil,
        });
        return res.status(429).json({
          error: `Trop de tentatives de connexion infructueuses. ${getRemainingLockMessage(lockUntil)}`,
          lockUntil,
        });
      }

      loginAttemptStore.set(attemptKey, {
        count: attempts,
        lockUntil: null,
      });

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      return res.status(401).json({
        error: `Identifiants incorrects. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`,
      });
    }

    const user = result.recordset[0];

    // Comparaison du mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.MotDePasse);
    if (!isPasswordValid) {
      const attempts = existingRecord ? existingRecord.count + 1 : 1;      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = Date.now() + LOGIN_LOCK_DURATION_MS;
        loginAttemptStore.set(attemptKey, {
          count: attempts,
          lockUntil,
        });
        return res.status(429).json({
          error: `Trop de tentatives de connexion infructueuses. ${getRemainingLockMessage(lockUntil)}`,
          lockUntil,
        });
      }

      loginAttemptStore.set(attemptKey, {
        count: attempts,
        lockUntil: null,
      });

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      return res.status(401).json({
        error: `Identifiants incorrects. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`,
      });
    }

    // Successful login resets attempts
    if (loginAttemptStore.has(attemptKey)) {
      loginAttemptStore.delete(attemptKey);
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
        role: user.Role,
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
      codeRole: user.Role,
      idUnite: user.IdUnite,
      idCentre: user.IdCentre,
      idAgence: user.IdAgence,
    };

    res.json({
      token,
      user: userInfo,
    });
  } catch (error) {
    // Error during login
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  // Pour JWT, le logout est côté client (suppression du token)
  // Ici on peut ajouter une blacklist de tokens si nécessaire
  res.json({ message: 'Déconnexion réussie' });
});

// Verify token endpoint
app.get('/api/auth/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ valid: false, error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ valid: false, error: 'Token manquant' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.iat && decoded.iat < SERVER_BOOT_TIME) {
        return res.status(401).json({ valid: false, error: 'Session expirée. Veuillez vous reconnecter.' });
      }
      res.json({ valid: true, user: decoded });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ valid: false, error: 'Token expiré' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ valid: false, error: 'Token invalide' });
      }
      return res.status(401).json({ valid: false, error: 'Erreur de vérification du token' });
    }
  } catch (error) {
    // Error verifying token
    return res.status(500).json({ valid: false, error: 'Erreur serveur' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.iat && decoded.iat < SERVER_BOOT_TIME) {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Route pour vérifier la validité d'un token existant
app.post('/api/auth/verify-token', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Récupérer les informations complètes de l'utilisateur depuis la base de données
    const request = pool.request();
    request.input('id', sql.Int, user.id);
    const result = await request.query(`
      SELECT 
        u.IdUtilisateur,
        u.Matricule,
        u.Nom,
        u.Prenom,
        u.Email,
        u.Telephone,
        u.Role,
        u.IdUnite,
        u.IdCentre,
        u.IdAgence
      FROM Utilisateur u
      WHERE u.IdUtilisateur = @id AND u.Actif = 1
    `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Utilisateur invalide ou désactivé' });
    }
    
    const userInfo = result.recordset[0];
    
    res.json({
      valid: true,
      user: {
        id: userInfo.IdUtilisateur,
        matricule: userInfo.Matricule,
        nom: userInfo.Nom,
        prenom: userInfo.Prenom,
        email: userInfo.Email,
        telephone: userInfo.Telephone,
        role: userInfo.Role,
        codeRole: userInfo.Role,
        idUnite: userInfo.IdUnite,
        idCentre: userInfo.IdCentre,
        idAgence: userInfo.IdAgence,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get statistics
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non identifié' });
    }

    // Récupérer les informations de l'utilisateur (IdAgence, IdCentre, rôle)
    const userInfo = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT u.IdAgence, u.IdCentre, u.Role
        FROM Utilisateur u
        WHERE u.IdUtilisateur = @id
      `);

    if (userInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userData = userInfo.recordset[0];
    const actorRoleLower = (userData.Role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');

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
    
    // Construire la clause WHERE pour filtrer les demandes en attente selon le rôle
    let whereClause = `WHERE s.CodeStatut = 'EN_ATTENTE' AND d.Actif = 1`;
    let demandeRequest = pool.request();

    if (!isAdminRole) {
      if (isChefCentreRole) {
        // Chef de centre : voir toutes les demandes de son centre
        if (userData.IdCentre) {
          whereClause += ' AND a.IdCentre = @centreId';
          demandeRequest.input('centreId', sql.Int, userData.IdCentre);
        } else {
          return res.status(403).json({ error: 'Vous n\'êtes pas affecté à un centre.' });
        }
      } else {
        // Autres utilisateurs : voir seulement les demandes de leur agence
        if (userData.IdAgence) {
          whereClause += ' AND d.IdAgence = @agenceId';
          demandeRequest.input('agenceId', sql.Int, userData.IdAgence);
        } else {
          return res.status(403).json({ error: 'Vous n\'êtes pas affecté à une agence.' });
        }
      }
    }
    // Admin : pas de filtre, voit toutes les demandes

    // Récupérer les demandes en attente groupées par type avec filtrage selon le rôle
    const demandesEnAttente = await demandeRequest.query(`
      SELECT 
        dt.LibelleType as TypeDemande,
        COUNT(*) as Nombre
      FROM DemandeTravaux d
      INNER JOIN DemandeStatut s ON d.IdStatut = s.IdStatut
      INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
      INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
      ${whereClause}
      GROUP BY dt.LibelleType, dt.IdDemandeType
      ORDER BY COUNT(*) DESC, dt.LibelleType
    `);
    
    const result = {
      ...stats.recordset[0],
      DemandesEnAttenteParType: demandesEnAttente.recordset
    };
    
    res.json(result);
  } catch (error) {
    // Error retrieving statistics
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

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
        verify: 'GET /api/auth/verify',
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
    const { search } = req.query;
    
    let query = `
      SELECT TOP 200
        c.IdClient,
        c.Nom,
        c.Prenom,
        c.Email,
        c.TelephonePrincipal,
        c.AdresseResidence,
        c.CommuneResidence,
        c.DateCreation
      FROM Client c
      WHERE c.Actif = 1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (
        c.Nom LIKE @search OR
        c.Prenom LIKE @search OR
        c.Email LIKE @search OR
        c.TelephonePrincipal LIKE @search OR
        c.AdresseResidence LIKE @search OR
        c.CommuneResidence LIKE @search
      )`;
      params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
    }
    
    query += ' ORDER BY c.DateCreation DESC';
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving clients
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
    // Error retrieving client types
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
        c.CommuneResidence,
        c.CodePostalResidence,
        c.AdresseBranchement,
        c.CommuneBranchement,
        c.CodePostalBranchement,
        c.TypeBranchement,
        c.NumeroPieceIdentite,
        c.PieceDelivrePar,
        c.DateDelivrancePiece,
        c.StatutOccupation,
        c.DiametreBranchement,
        c.Actif,
        c.DateCreation,
        c.DateModification,
        ct.LibelleType as TypeClientLibelle
      FROM Client c
      LEFT JOIN ClientType ct ON c.IdClientType = ct.IdClientType
      WHERE c.IdClient = @id
    `);
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Client introuvable' });
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving client
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
    // ClientType health error
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
    r.input('codePostalResidence', sql.NVarChar(5), (codePostalResidence || '').substring(0, 5));
    r.input('adresseBranchement', sql.NVarChar(200), adresseBranchement || null);
    r.input('communeBranchement', sql.NVarChar(100), communeBranchement || null);
    r.input('codePostalBranchement', sql.NVarChar(5), (codePostalBranchement || '').substring(0, 5) || null);
    r.input('telephonePrincipal', sql.NVarChar(10), (telephonePrincipal || '').substring(0, 10) || null);
    r.input('telephoneSecondaire', sql.NVarChar(10), (telephoneSecondaire || '').substring(0, 10) || null);
    r.input('fax', sql.NVarChar(10), (fax || '').substring(0, 10) || null);
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
    // Error creating client
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un type de client (CodeType auto CTC-XXXX)
app.post('/api/clients/types', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin peut créer des types de clients
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent créer des types de clients.' });
    }

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
    // Error creating client type
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modification d'un type de client
app.put('/api/clients/types/:id', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin peut modifier des types de clients
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier des types de clients.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const { LibelleType, Description, Actif } = req.body;
    if (!LibelleType) {
      return res.status(400).json({ error: 'LibelleType est requis' });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('LibelleType', sql.NVarChar(100), LibelleType)
      .input('Description', sql.NVarChar(255), Description || null)
      .input('Actif', sql.Bit, Actif === false ? 0 : 1)
      .query(`
        UPDATE ClientType SET
          LibelleType = @LibelleType,
          Description = @Description,
          Actif = @Actif
        OUTPUT INSERTED.*
        WHERE IdClientType = @id
      `);
    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Type de client introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    // Error updating client type
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
    // Error retrieving unite
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
        u.NumerocompteBancaire,
        u.NumeroComptePostal,
        u.Actif
      FROM Unite u
      WHERE u.Actif = 1
      ORDER BY u.NomUnite
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving unites
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
      NomBanque,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const trimmedNomUnite = NomUnite?.trim();

    if (!trimmedNomUnite) {
      return res.status(400).json({ error: 'NomUnite est requis' });
    }

    const normalizedNomUnite = normalizeName(trimmedNomUnite);

    const existingUnits = await pool.request().query(`
      SELECT IdUnite, NomUnite
      FROM Unite
    `);

    const duplicate = existingUnits.recordset.find((unit) => {
      const normalizedExisting = normalizeName(unit.NomUnite || '');
      if (!normalizedExisting) {
        return false;
      }

      if (normalizedExisting === normalizedNomUnite) {
        return true;
      }

      if (
        normalizedExisting.length >= MIN_SUBSTRING_MATCH_LENGTH &&
        normalizedNomUnite.length >= MIN_SUBSTRING_MATCH_LENGTH &&
        (normalizedExisting.includes(normalizedNomUnite) || normalizedNomUnite.includes(normalizedExisting))
      ) {
        return true;
      }

      return false;
    });

    if (duplicate) {
      return res.status(409).json({ error: 'Une unité avec un nom similaire existe déjà.' });
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
      .input('NomUnite', sql.NVarChar(100), trimmedNomUnite)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(6), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('SiteWeb', sql.NVarChar(100), SiteWeb || null)
      .input('NumeroIdentifiantFiscal', sql.NVarChar(20), NumeroIdentifiantFiscal || null)
      .input('NumeroIdentificationStatistique', sql.NVarChar(20), NumeroIdentificationStatistique || null)
      .input('NumeroRegistreCommerce', sql.NVarChar(20), NumeroRegistreCommerce || null)
      .input('NomBanque', sql.NVarChar(100), NomBanque || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        INSERT INTO Unite (
          CodeUnite, NomUnite, Adresse, Commune, CodePostal, TelephonePrincipal, TelephoneSecondaire,
          Fax, Email, SiteWeb, NumeroIdentifiantFiscal, NumeroIdentificationStatistique,
          NumeroRegistreCommerce, NomBanque, NumerocompteBancaire, NumeroComptePostal, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @CodeUnite, @NomUnite, @Adresse, @Commune, @CodePostal, @TelephonePrincipal, @TelephoneSecondaire,
          @Fax, @Email, @SiteWeb, @NumeroIdentifiantFiscal, @NumeroIdentificationStatistique,
          @NumeroRegistreCommerce, @NomBanque, @NumerocompteBancaire, @NumeroComptePostal, 1, GETDATE()
        )
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating unite
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
      NomBanque,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const trimmedNomUnite = NomUnite?.trim();

    if (!trimmedNomUnite) {
      return res.status(400).json({ error: 'NomUnite est requis' });
    }

    const normalizedNomUnite = normalizeName(trimmedNomUnite);

    const existingUnits = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdUnite, NomUnite
        FROM Unite
        WHERE IdUnite <> @id
      `);

    const duplicate = existingUnits.recordset.find((unit) => {
      const normalizedExisting = normalizeName(unit.NomUnite || '');
      if (!normalizedExisting) {
        return false;
      }

      if (normalizedExisting === normalizedNomUnite) {
        return true;
      }

      if (
        normalizedExisting.length >= MIN_SUBSTRING_MATCH_LENGTH &&
        normalizedNomUnite.length >= MIN_SUBSTRING_MATCH_LENGTH &&
        (normalizedExisting.includes(normalizedNomUnite) || normalizedNomUnite.includes(normalizedExisting))
      ) {
        return true;
      }

      return false;
    });

    if (duplicate) {
      return res.status(409).json({ error: 'Une unité avec un nom similaire existe déjà.' });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('NomUnite', sql.NVarChar(100), trimmedNomUnite)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(6), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('SiteWeb', sql.NVarChar(100), SiteWeb || null)
      .input('NumeroIdentifiantFiscal', sql.NVarChar(20), NumeroIdentifiantFiscal || null)
      .input('NumeroIdentificationStatistique', sql.NVarChar(20), NumeroIdentificationStatistique || null)
      .input('NumeroRegistreCommerce', sql.NVarChar(20), NumeroRegistreCommerce || null)
      .input('NomBanque', sql.NVarChar(100), NomBanque || null)
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
          NomBanque = @NomBanque,
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
    // Error updating unite
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
          u.NomUnite,
          u.Adresse AS AdresseUnite,
          u.Commune AS CommuneUnite,
          u.NumeroIdentifiantFiscal,
          u.NumeroIdentificationStatistique,
          u.NumeroRegistreCommerce,
          c.Adresse, c.Commune, c.CodePostal,
          c.TelephonePrincipal, c.TelephoneSecondaire, c.Fax, c.Email,
          c.NomBanque, c.NumerocompteBancaire, c.NumeroComptePostal,
          c.Actif, c.DateCreation, c.DateModification
        FROM Centre c
        LEFT JOIN Unite u ON c.IdUnite = u.IdUnite
        WHERE c.IdCentre = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Centre introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving centre
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
        c.TelephonePrincipal,
        c.TelephoneSecondaire,
        c.Fax,
        c.Email,
        c.NomBanque,
        c.NumerocompteBancaire,
        c.NumeroComptePostal,
        c.Actif
      FROM Centre c
      INNER JOIN Unite u ON c.IdUnite = u.IdUnite
      WHERE c.Actif = 1
      ORDER BY c.NomCentre
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving centres
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
      NomBanque,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const required = ['IdUnite', 'NomCentre', 'PrefixeCentre', 'Adresse', 'Commune', 'CodePostal', 'TelephonePrincipal'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'NomCentre', value: NomCentre, max: 100, label: 'Nom Centre' },
      { field: 'PrefixeCentre', value: PrefixeCentre, max: 5, label: 'Préfixe Centre' },
      { field: 'Adresse', value: Adresse, max: 200, label: 'Adresse' },
      { field: 'Commune', value: Commune, max: 60, label: 'Commune' },
      { field: 'CodePostal', value: CodePostal, max: 5, label: 'Code Postal' },
      { field: 'TelephonePrincipal', value: TelephonePrincipal, max: 10, label: 'Téléphone Principal' },
      { field: 'TelephoneSecondaire', value: TelephoneSecondaire, max: 10, label: 'Téléphone Secondaire' },
      { field: 'Fax', value: Fax, max: 10, label: 'Fax' },
      { field: 'Email', value: Email, max: 100, label: 'Email' },
      { field: 'NumerocompteBancaire', value: NumerocompteBancaire, max: 20, label: 'N° Compte Bancaire' },
      { field: 'NumeroComptePostal', value: NumeroComptePostal, max: 20, label: 'N° Compte Postal' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
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
      .input('CodePostal', sql.NVarChar(5), CodePostal)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('NomBanque', sql.NVarChar(100), NomBanque || null)
      .input('NumerocompteBancaire', sql.NVarChar(20), NumerocompteBancaire || null)
      .input('NumeroComptePostal', sql.NVarChar(20), NumeroComptePostal || null)
      .query(`
        INSERT INTO Centre (
          IdUnite, CodeCentre, NomCentre, PrefixeCentre, Adresse, Commune, CodePostal,
          TelephonePrincipal, TelephoneSecondaire, Fax, Email,
          NomBanque, NumerocompteBancaire, NumeroComptePostal, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @IdUnite, @CodeCentre, @NomCentre, @PrefixeCentre, @Adresse, @Commune, @CodePostal,
          @TelephonePrincipal, @TelephoneSecondaire, @Fax, @Email,
          @NomBanque, @NumerocompteBancaire, @NumeroComptePostal, 1, GETDATE()
        )
      `);

    return res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating centre
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
      NomBanque,
      NumerocompteBancaire,
      NumeroComptePostal
    } = req.body;

    const required = ['IdUnite', 'NomCentre', 'PrefixeCentre', 'Adresse', 'Commune', 'CodePostal', 'TelephonePrincipal'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'NomCentre', value: NomCentre, max: 100, label: 'Nom Centre' },
      { field: 'PrefixeCentre', value: PrefixeCentre, max: 5, label: 'Préfixe Centre' },
      { field: 'Adresse', value: Adresse, max: 200, label: 'Adresse' },
      { field: 'Commune', value: Commune, max: 60, label: 'Commune' },
      { field: 'CodePostal', value: CodePostal, max: 5, label: 'Code Postal' },
      { field: 'TelephonePrincipal', value: TelephonePrincipal, max: 10, label: 'Téléphone Principal' },
      { field: 'TelephoneSecondaire', value: TelephoneSecondaire, max: 10, label: 'Téléphone Secondaire' },
      { field: 'Fax', value: Fax, max: 10, label: 'Fax' },
      { field: 'Email', value: Email, max: 100, label: 'Email' },
      { field: 'NumerocompteBancaire', value: NumerocompteBancaire, max: 20, label: 'N° Compte Bancaire' },
      { field: 'NumeroComptePostal', value: NumeroComptePostal, max: 20, label: 'N° Compte Postal' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('IdUnite', sql.Int, IdUnite)
      .input('NomCentre', sql.NVarChar(100), NomCentre)
      .input('PrefixeCentre', sql.NVarChar(5), PrefixeCentre)
      .input('Adresse', sql.NVarChar(200), Adresse)
      .input('Commune', sql.NVarChar(60), Commune)
      .input('CodePostal', sql.NVarChar(5), CodePostal)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
      .input('Email', sql.NVarChar(100), Email || null)
      .input('NomBanque', sql.NVarChar(100), NomBanque || null)
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
          NomBanque = @NomBanque,
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
    // Error updating centre
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
    // Error retrieving agence
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des agences
app.get('/api/agences', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT TOP 200
        a.IdAgence,
        a.IdCentre,
        a.CodeAgence,
        a.NomAgence,
        a.Adresse,
        a.Commune,
        a.CodePostal,
        a.TelephonePrincipal,
        a.TelephoneSecondaire,
        a.Fax,
        a.Email,
        c.IdUnite,
        u.NomUnite
      FROM AgenceCommerciale a
      LEFT JOIN Centre c ON a.IdCentre = c.IdCentre
      LEFT JOIN Unite u ON c.IdUnite = u.IdUnite
      WHERE a.Actif = 1
      ORDER BY a.NomAgence
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving agences
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

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'NomAgence', value: NomAgence, max: 100, label: 'Nom Agence' },
      { field: 'Adresse', value: Adresse, max: 200, label: 'Adresse' },
      { field: 'Commune', value: Commune, max: 60, label: 'Commune' },
      { field: 'CodePostal', value: CodePostal, max: 5, label: 'Code Postal' },
      { field: 'TelephonePrincipal', value: TelephonePrincipal, max: 10, label: 'Téléphone Principal' },
      { field: 'TelephoneSecondaire', value: TelephoneSecondaire, max: 10, label: 'Téléphone Secondaire' },
      { field: 'Fax', value: Fax, max: 10, label: 'Fax' },
      { field: 'Email', value: Email, max: 100, label: 'Email' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
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
      .input('CodePostal', sql.NVarChar(5), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
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
    // Error creating agence
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

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'NomAgence', value: NomAgence, max: 100, label: 'Nom Agence' },
      { field: 'Adresse', value: Adresse, max: 200, label: 'Adresse' },
      { field: 'Commune', value: Commune, max: 60, label: 'Commune' },
      { field: 'CodePostal', value: CodePostal, max: 5, label: 'Code Postal' },
      { field: 'TelephonePrincipal', value: TelephonePrincipal, max: 10, label: 'Téléphone Principal' },
      { field: 'TelephoneSecondaire', value: TelephoneSecondaire, max: 10, label: 'Téléphone Secondaire' },
      { field: 'Fax', value: Fax, max: 10, label: 'Fax' },
      { field: 'Email', value: Email, max: 100, label: 'Email' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('IdCentre', sql.Int, IdCentre)
      .input('NomAgence', sql.NVarChar(100), NomAgence)
      .input('Adresse', sql.NVarChar(200), Adresse || null)
      .input('Commune', sql.NVarChar(60), Commune || null)
      .input('CodePostal', sql.NVarChar(5), CodePostal || null)
      .input('TelephonePrincipal', sql.NVarChar(10), TelephonePrincipal || null)
      .input('TelephoneSecondaire', sql.NVarChar(10), TelephoneSecondaire || null)
      .input('Fax', sql.NVarChar(10), Fax || null)
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
    // Error updating configuration
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mise à jour d'un article
app.put('/api/articles/:id', verifyToken, async (req, res) => {
  const transaction = await pool.transaction();
  
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier des articles.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      IdFamille,
      Designation,
      Description,
      Unite,
      Diametre,
      Matiere,
      Classe,
      Pression,
      Longueur,
      Largeur,
      Epaisseur,
      Couleur,
      Caracteristiques,
      // Prix fields for ArticlePrixHistorique
      PrixFournitureHT,
      PrixPoseHT,
      DateDebutApplication,
      DateFinApplication
    } = req.body;

    if (!IdFamille || !Designation || !Unite) {
      return res.status(400).json({ error: 'IdFamille, Designation et Unite sont requis' });
    }

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'Designation', value: Designation, max: 200, label: 'Désignation' },
      { field: 'Description', value: Description, max: 500, label: 'Description' },
      { field: 'Unite', value: Unite, max: 50, label: 'Unité' },
      { field: 'Diametre', value: Diametre, max: 20, label: 'Diamètre' },
      { field: 'Matiere', value: Matiere, max: 50, label: 'Matière' },
      { field: 'Classe', value: Classe, max: 20, label: 'Classe' },
      { field: 'Pression', value: Pression, max: 20, label: 'Pression' },
      { field: 'Couleur', value: Couleur, max: 30, label: 'Couleur' },
      { field: 'Caracteristiques', value: Caracteristiques, max: 500, label: 'Caractéristiques' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
    }

    // Begin transaction
    await transaction.begin();
    const request = transaction.request();

    // Update article
    const update = await request
      .input('id', sql.Int, id)
      .input('IdFamille', sql.Int, IdFamille)
      .input('Designation', sql.NVarChar(200), Designation.trim())
      .input('Description', sql.NVarChar(500), Description?.trim() || null)
      .input('Unite', sql.NVarChar(50), Unite.trim())
      .input('Diametre', sql.NVarChar(20), Diametre?.trim() || null)
      .input('Matiere', sql.NVarChar(50), Matiere?.trim() || null)
      .input('Classe', sql.NVarChar(20), Classe?.trim() || null)
      .input('Pression', sql.NVarChar(20), Pression?.trim() || null)
      .input('Longueur', sql.Decimal(10, 2), Longueur || null)
      .input('Largeur', sql.Decimal(10, 2), Largeur || null)
      .input('Epaisseur', sql.Decimal(10, 2), Epaisseur || null)
      .input('Couleur', sql.NVarChar(30), Couleur?.trim() || null)
      .input('Caracteristiques', sql.NVarChar(500), Caracteristiques?.trim() || null)
      .query(`
        UPDATE Article SET
          IdFamille = @IdFamille,
          Designation = @Designation,
          Description = @Description,
          Unite = @Unite,
          Diametre = @Diametre,
          Matiere = @Matiere,
          Classe = @Classe,
          Pression = @Pression,
          Longueur = @Longueur,
          Largeur = @Largeur,
          Epaisseur = @Epaisseur,
          Couleur = @Couleur,
          Caracteristiques = @Caracteristiques,
          DateModification = GETDATE()
        OUTPUT INSERTED.*
        WHERE IdArticle = @id
      `);

    if (update.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Article introuvable' });
    }

    // Handle Article Prix Historique if price fields are provided
    if (PrixFournitureHT !== undefined || PrixPoseHT !== undefined) {
      try {
        // Get current active prices
        const currentPrices = await transaction.request()
          .input('id', sql.Int, id)
          .query(`
            SELECT IdPrixHistorique, TypePrix, PrixHT, TauxTVA, DateDebutApplication, EstActif
            FROM ArticlePrixHistorique
            WHERE IdArticle = @id AND EstActif = 1
          `);

        const currentDate = new Date();
        const dateDebut = DateDebutApplication ? new Date(DateDebutApplication) : currentDate;
        const dateFin = DateFinApplication ? new Date(DateFinApplication) : null;
        
        // Get default TVA rate from configuration or use 0
        let defaultTVA = 0;
        try {
          const configResult = await transaction.request()
            .query(`SELECT Valeur FROM Configuration WHERE Cle = 'TAUX_TVA_DEFAUT'`);
          if (configResult.recordset.length > 0) {
            defaultTVA = parseFloat(configResult.recordset[0].Valeur) || 0;
          }
        } catch (configError) {
          // Use default TVA of 0 if config not found
        }

        // Process Fourniture price
        if (PrixFournitureHT !== undefined) {
          const fourniturePrice = parseFloat(PrixFournitureHT);
          
          // Check if we have an existing active fourniture price
          const existingFourniture = currentPrices.recordset.find(p => p.TypePrix === 'FOURNITURE');
          
          if (existingFourniture) {
            // If price has changed, deactivate the old one and create a new one
            if (existingFourniture.PrixHT !== fourniturePrice) {
              // Deactivate the old price
              await transaction.request()
                .input('id', sql.Int, existingFourniture.IdPrixHistorique)
                .query(`
                  UPDATE ArticlePrixHistorique 
                  SET EstActif = 0
                  WHERE IdPrixHistorique = @id
                `);
              
              // Create new price if value is not null/empty
              if (!isNaN(fourniturePrice) && fourniturePrice >= 0) {
                await transaction.request()
                  .input('IdArticle', sql.Int, id)
                  .input('TypePrix', sql.NVarChar(20), 'FOURNITURE')
                  .input('PrixHT', sql.Decimal(18, 2), fourniturePrice)
                  .input('TauxTVA', sql.Decimal(5, 2), defaultTVA)
                  .input('DateDebutApplication', sql.Date, dateDebut)
                  .input('DateFinApplication', sql.Date, dateFin)
                  .input('IdUtilisateurCreation', sql.Int, req.user?.id)
                  .query(`
                    INSERT INTO ArticlePrixHistorique (
                      IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, DateFinApplication,
                      EstActif, DateCreation, IdUtilisateurCreation
                    )
                    VALUES (
                      @IdArticle, @TypePrix, @PrixHT, @TauxTVA, @DateDebutApplication, @DateFinApplication,
                      1, GETDATE(), @IdUtilisateurCreation
                    )
                  `);
              }
            }
            // If price hasn't changed, we keep the existing one
          } else {
            // No existing fourniture price, create new one if value is provided
            if (!isNaN(fourniturePrice) && fourniturePrice >= 0) {
              await transaction.request()
                .input('IdArticle', sql.Int, id)
                .input('TypePrix', sql.NVarChar(20), 'FOURNITURE')
                .input('PrixHT', sql.Decimal(18, 2), fourniturePrice)
                .input('TauxTVA', sql.Decimal(5, 2), defaultTVA)
                .input('DateDebutApplication', sql.Date, dateDebut)
                .input('DateFinApplication', sql.Date, dateFin)
                .input('IdUtilisateurCreation', sql.Int, req.user?.id)
                .query(`
                  INSERT INTO ArticlePrixHistorique (
                    IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, DateFinApplication,
                    EstActif, DateCreation, IdUtilisateurCreation
                  )
                  VALUES (
                    @IdArticle, @TypePrix, @PrixHT, @TauxTVA, @DateDebutApplication, @DateFinApplication,
                    1, GETDATE(), @IdUtilisateurCreation
                  )
                `);
            }
          }
        }

        // Process Pose price
        if (PrixPoseHT !== undefined) {
          const posePrice = parseFloat(PrixPoseHT);
          
          // Check if we have an existing active pose price
          const existingPose = currentPrices.recordset.find(p => p.TypePrix === 'POSE');
          
          if (existingPose) {
            // If price has changed, deactivate the old one and create a new one
            if (existingPose.PrixHT !== posePrice) {
              // Deactivate the old price
              await transaction.request()
                .input('id', sql.Int, existingPose.IdPrixHistorique)
                .query(`
                  UPDATE ArticlePrixHistorique 
                  SET EstActif = 0
                  WHERE IdPrixHistorique = @id
                `);
              
              // Create new price if value is not null/empty
              if (!isNaN(posePrice) && posePrice >= 0) {
                await transaction.request()
                  .input('IdArticle', sql.Int, id)
                  .input('TypePrix', sql.NVarChar(20), 'POSE')
                  .input('PrixHT', sql.Decimal(18, 2), posePrice)
                  .input('TauxTVA', sql.Decimal(5, 2), defaultTVA)
                  .input('DateDebutApplication', sql.Date, dateDebut)
                  .input('DateFinApplication', sql.Date, dateFin)
                  .input('IdUtilisateurCreation', sql.Int, req.user?.id)
                  .query(`
                    INSERT INTO ArticlePrixHistorique (
                      IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, DateFinApplication,
                      EstActif, DateCreation, IdUtilisateurCreation
                    )
                    VALUES (
                      @IdArticle, @TypePrix, @PrixHT, @TauxTVA, @DateDebutApplication, @DateFinApplication,
                      1, GETDATE(), @IdUtilisateurCreation
                    )
                  `);
              }
            }
            // If price hasn't changed, we keep the existing one
          } else {
            // No existing pose price, create new one if value is provided
            if (!isNaN(posePrice) && posePrice >= 0) {
              await transaction.request()
                .input('IdArticle', sql.Int, id)
                .input('TypePrix', sql.NVarChar(20), 'POSE')
                .input('PrixHT', sql.Decimal(18, 2), posePrice)
                .input('TauxTVA', sql.Decimal(5, 2), defaultTVA)
                .input('DateDebutApplication', sql.Date, dateDebut)
                .input('DateFinApplication', sql.Date, dateFin)
                .input('IdUtilisateurCreation', sql.Int, req.user?.id)
                .query(`
                  INSERT INTO ArticlePrixHistorique (
                    IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, DateFinApplication,
                    EstActif, DateCreation, IdUtilisateurCreation
                  )
                  VALUES (
                    @IdArticle, @TypePrix, @PrixHT, @TauxTVA, @DateDebutApplication, @DateFinApplication,
                    1, GETDATE(), @IdUtilisateurCreation
                  )
                `);
            }
          }
        }
      } catch (priceError) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Erreur lors de la mise à jour des prix: ' + priceError.message });
      }
    }

    // Commit transaction
    await transaction.commit();
    res.json(update.recordset[0]);
  } catch (error) {
    // Rollback transaction in case of error
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Ignore rollback errors
    }
    
    // Error updating article
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================================
// UTILISATEURS ET RÔLES
// ============================================================================

const normalizeRoleValue = (value) => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

const findSimilarActiveRole = async (role, excludeMatricule = null) => {
  const normalizedRole = normalizeRoleValue(role);
  if (!normalizedRole) {
    return { conflict: false };
  }

  const request = pool.request();
  let query = `
    SELECT Matricule, Role
    FROM Utilisateur
    WHERE Actif = 1
  `;

  if (excludeMatricule) {
    request.input('excludeMatricule', sql.NVarChar(50), excludeMatricule);
    query += ' AND Matricule != @excludeMatricule';
  }

  const result = await request.query(query);

  for (const existing of result.recordset) {
    const normalizedExisting = normalizeRoleValue(existing.Role);
    if (normalizedExisting && normalizedExisting === normalizedRole) {
      return {
        conflict: false, // Pas de conflit car plusieurs utilisateurs peuvent avoir le même rôle
      };
    }
  }

  return { conflict: false };
};

// Liste des rôles disponibles
const AVAILABLE_ROLES = [
  'ADMINISTRATEUR',
  'CHEF_CENTRE',
  'CHEF_AGENCE_COMMERCIALE',
  'CHEF_SERVICE_JURIDIQUE',
  'CHEF_SECTION_RELATIONS_CLIENTELE',
  'CHEF_SERVICE_TECHNICO_COMMERCIAL',
  'UTILISATEUR_STANDARD'
];

// Fonction pour normaliser un rôle (identique à celle du frontend)
const normalizeRole = (role) => {
  if (!role) return '';
  return String(role)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')           // Espaces -> underscores
    .replace(/-/g, '_')             // Tirets -> underscores
    .replace(/_+/g, '_')            // Multiples underscores -> un seul
    .replace(/^_+|_+$/g, '');       // Enlever underscores en début/fin
};

// Fonction pour vérifier si deux rôles correspondent
const rolesMatch = (role1, role2) => {
  if (!role1 || !role2) return false;
  
  const normalized1 = normalizeRole(role1);
  const normalized2 = normalizeRole(role2);
  
  // 1. Comparaison exacte après normalisation
  if (normalized1 === normalized2) {
    return true;
  }
  
  // 2. Comparaison par mots-clés (si au moins 2 mots correspondent)
  const words1 = normalized1.split('_').filter(w => w.length > 2);
  const words2 = normalized2.split('_').filter(w => w.length > 2);
  
  if (words1.length >= 2 && words2.length >= 2) {
    const matchingWords = words1.filter(word => words2.includes(word));
    if (matchingWords.length >= 2) {
      return true;
    }
  }
  
  // 3. Comparaison partielle (pour les chaînes longues)
  if (normalized1.length >= 10 && normalized2.length >= 10) {
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
  }
  
  return false;
};

// Liste des rôles
app.get('/api/roles', async (req, res) => {
  try {
    const roles = AVAILABLE_ROLES.map((role, index) => ({
      IdRole: index + 1,
      CodeRole: role,
      LibelleRole: role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      Description: '',
      Actif: true
    }));
    res.json(roles);
  } catch (error) {
    // Error retrieving roles
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un rôle (désactivée - rôles en dur)
app.post('/api/roles', verifyToken, async (req, res) => {
  try {
    return res.status(400).json({ error: 'La création de rôles n\'est pas autorisée. Les rôles sont prédéfinis.' });
  } catch (error) {
    // Error creating role
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mise à jour d'un rôle (désactivée)
app.put('/api/roles/:id', verifyToken, async (req, res) => {
  try {
    return res.status(400).json({ error: 'La modification de rôles n\'est pas autorisée. Les rôles sont prédéfinis.' });
  } catch (error) {
    // Error updating role
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Suppression (désactivation) d'un rôle (désactivée)
app.delete('/api/roles/:id', verifyToken, async (req, res) => {
  try {
    return res.status(400).json({ error: 'La suppression de rôles n\'est pas autorisée. Les rôles sont prédéfinis.' });
  } catch (error) {
    // Error deleting role
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Fonction de validation des contraintes d'unicité selon le rôle
// Retourne { valid: false, error: 'message' } si une contrainte est violée, sinon { valid: true }
const validateUniquenessConstraints = async (Role, IdCentre, IdAgence, IdUtilisateur = null) => {
  try {
    const codeRole = (Role || '').toUpperCase();
    
    // ADMINISTRATEUR : un seul dans tout le système
    if (codeRole === 'ADMINISTRATEUR') {
      const checkRequest = pool.request();
      let query = `
        SELECT IdUtilisateur 
        FROM Utilisateur u
        WHERE u.Role = 'ADMINISTRATEUR' AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul utilisateur admin dans le système' };
      }
    }
    
    // CHEF_CENTRE : un seul par centre
    if (codeRole === 'CHEF_CENTRE' || (codeRole.includes('CHEF') && codeRole.includes('CENTRE'))) {
      if (!IdCentre) {
        return { valid: false, error: 'Le chef de centre doit être associé à un centre' };
      }
      
      const checkRequest = pool.request();
      checkRequest.input('idCentre', sql.Int, IdCentre);
      let query = `
        SELECT u.IdUtilisateur 
        FROM Utilisateur u
        WHERE (u.Role = 'CHEF_CENTRE' OR (u.Role LIKE '%CHEF%' AND u.Role LIKE '%CENTRE%'))
        AND u.IdCentre = @idCentre 
        AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul chef de centre par centre' };
      }
    }
    
    // CHEF_AGENCE_COMMERCIALE : un seul par agence
    if (codeRole === 'CHEF_AGENCE_COMMERCIALE' || codeRole === 'CHEF_AGENCE' || (codeRole.includes('CHEF') && codeRole.includes('AGENCE'))) {
      if (!IdAgence) {
        return { valid: false, error: 'Le chef d\'agence doit être associé à une agence' };
      }
      
      const checkRequest = pool.request();
      checkRequest.input('idAgence', sql.Int, IdAgence);
      let query = `
        SELECT u.IdUtilisateur 
        FROM Utilisateur u
        WHERE (u.Role = 'CHEF_AGENCE_COMMERCIALE' OR u.Role = 'CHEF_AGENCE' OR (u.Role LIKE '%CHEF%' AND u.Role LIKE '%AGENCE%'))
        AND u.IdAgence = @idAgence 
        AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul chef d\'agence par agence' };
      }
    }
    
    // CHEF_SERVICE_JURIDIQUE ou CONTENTIEUX : un seul par centre
    if (codeRole === 'CHEF_SERVICE_JURIDIQUE' || codeRole === 'JURIDIQUE' || codeRole === 'CONTENTIEUX' || 
        codeRole.includes('JURIDIQUE') || codeRole.includes('CONTENTIEUX')) {
      if (!IdCentre) {
        return { valid: false, error: 'Le juriste doit être associé à un centre' };
      }
      
      const checkRequest = pool.request();
      checkRequest.input('idCentre', sql.Int, IdCentre);
      let query = `
        SELECT u.IdUtilisateur 
        FROM Utilisateur u
        WHERE (u.Role = 'CHEF_SERVICE_JURIDIQUE' OR u.Role = 'JURIDIQUE' OR u.Role = 'CONTENTIEUX' 
               OR u.Role LIKE '%JURIDIQUE%' OR u.Role LIKE '%CONTENTIEUX%')
        AND u.IdCentre = @idCentre 
        AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul juriste (service juridique ou contentieux) par centre' };
      }
    }
    
    // CHEF_SECTION_RELATIONS_CLIENTELE : un seul par agence
    if (codeRole === 'CHEF_SECTION_RELATIONS_CLIENTELE' || codeRole === 'RELATION_CLIENTELE' || (codeRole.includes('RELATION') && codeRole.includes('CLIENTELE'))) {
      if (!IdAgence) {
        return { valid: false, error: 'Le relation clientèle doit être associé à une agence' };
      }
      
      const checkRequest = pool.request();
      checkRequest.input('idAgence', sql.Int, IdAgence);
      let query = `
        SELECT u.IdUtilisateur 
        FROM Utilisateur u
        WHERE (u.Role = 'CHEF_SECTION_RELATIONS_CLIENTELE' OR u.Role = 'RELATION_CLIENTELE' OR (u.Role LIKE '%RELATION%' AND u.Role LIKE '%CLIENTELE%'))
        AND u.IdAgence = @idAgence 
        AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul relation clientèle par agence' };
      }
    }
    
    // CHEF_SERVICE_TECHNICO_COMMERCIAL : un seul par centre
    if (codeRole === 'CHEF_SERVICE_TECHNICO_COMMERCIAL' || codeRole === 'TECHNICO_COMMERCIAL' || (codeRole.includes('TECHNICO') && codeRole.includes('COMMERCIAL'))) {
      if (!IdCentre) {
        return { valid: false, error: 'Le technico-commercial doit être associé à un centre' };
      }
      
      const checkRequest = pool.request();
      checkRequest.input('idCentre', sql.Int, IdCentre);
      let query = `
        SELECT u.IdUtilisateur 
        FROM Utilisateur u
        WHERE (u.Role = 'CHEF_SERVICE_TECHNICO_COMMERCIAL' OR u.Role = 'TECHNICO_COMMERCIAL' OR (u.Role LIKE '%TECHNICO%' AND u.Role LIKE '%COMMERCIAL%'))
        AND u.IdCentre = @idCentre 
        AND u.Actif = 1
      `;
      if (IdUtilisateur) {
        checkRequest.input('idUtilisateur', sql.Int, IdUtilisateur);
        query += ' AND u.IdUtilisateur != @idUtilisateur';
      }
      const checkResult = await checkRequest.query(query);
      
      if (checkResult.recordset.length > 0) {
        return { valid: false, error: 'Il ne peut y avoir qu\'un seul technico-commercial par centre' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    // Error validating uniqueness constraints
    return { valid: false, error: 'Erreur lors de la validation: ' + error.message };
  }
};

// Liste des utilisateurs
app.get('/api/utilisateurs', verifyToken, async (req, res) => {
  try {
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');

    let whereClause = '';
    let request = pool.request();

    if (isChefCentreRole) {
      // Récupérer le centre du créateur
      const resCentre = await pool.request()
        .input('id', sql.Int, req.user?.id)
        .query(`SELECT IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
      const actorCentreId = resCentre.recordset[0]?.IdCentre || null;
      if (!actorCentreId) {
        return res.status(403).json({ error: "Droit insuffisant: centre de l'utilisateur introuvable" });
      }
      whereClause = 'WHERE u.IdCentre = @actorCentreId';
      request.input('actorCentreId', sql.Int, actorCentreId);
    }

    const query = `
      SELECT TOP 200
        u.IdUtilisateur,
        u.Matricule,
        u.Nom,
        u.Prenom,
        u.Email,
        u.Telephone,
        u.Actif,
        u.DateCreation,
        u.DerniereConnexion,
        u.Role,
        u.IdUnite,
        un.NomUnite,
        u.IdCentre,
        c.NomCentre,
        u.IdAgence,
        a.NomAgence
      FROM Utilisateur u
      LEFT JOIN Unite un ON u.IdUnite = un.IdUnite
      LEFT JOIN Centre c ON u.IdCentre = c.IdCentre
      LEFT JOIN AgenceCommerciale a ON u.IdAgence = a.IdAgence
      ${whereClause}
      ORDER BY u.Nom, u.Prenom
    `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error retrieving utilisateurs:', error);
    // Error retrieving utilisateurs
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
});

// Création d'un utilisateur (Matricule auto UTI-XXXX)
app.post('/api/utilisateurs', verifyToken, async (req, res) => {
  try {
    const {
      Role,
      IdUnite,
      IdCentre,
      IdAgence,
      Nom,
      Prenom,
      Email,
      Telephone,
      MotDePasse,
      Actif
    } = req.body;

    const required = ['Role', 'Nom', 'Prenom', 'Email', 'MotDePasse'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    // Vérifier que le rôle est valide
    if (!AVAILABLE_ROLES.includes(Role)) {
      return res.status(400).json({ error: 'Rôle invalide. Les rôles disponibles sont: ' + AVAILABLE_ROLES.join(', ') });
    }

    // Vérifier l'unicité de l'email
    const checkRequest = pool.request();
    checkRequest.input('email', sql.NVarChar(100), Email);
    const checkResult = await checkRequest.query(`
      SELECT Email
      FROM Utilisateur
      WHERE Email = @email
    `);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(MotDePasse, 12);
    
    // Si l'utilisateur authentifié est CHEF DE CENTRE, il ne peut créer
    // des utilisateurs que dans son propre centre. On force IdCentre.
    const actorRoleRaw = (req.user?.role || '');
    const actorRoleLower = actorRoleRaw.toLowerCase();
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    let enforcedIdCentre = IdCentre || null;
    if (isChefCentreRole) {
      try {
        const resCentre = await pool.request()
          .input('id', sql.Int, req.user?.id)
          .query(`SELECT IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
        const actorCentreId = resCentre.recordset[0]?.IdCentre || null;
        if (!actorCentreId) {
          return res.status(403).json({ error: "Droit insuffisant: centre de l'utilisateur introuvable" });
        }
        if (IdCentre && Number(IdCentre) !== Number(actorCentreId)) {
          return res.status(403).json({ error: 'Vous ne pouvez créer des utilisateurs que pour votre centre' });
        }
        enforcedIdCentre = actorCentreId;
      } catch (e) {
        return res.status(500).json({ error: 'Erreur lors de la vérification du centre de l\'utilisateur' });
      }
    }

    // Valider les contraintes d'unicité selon le rôle
    const uniquenessValidation = await validateUniquenessConstraints(Role, enforcedIdCentre, IdAgence);
    if (!uniquenessValidation.valid) {
      return res.status(400).json({ error: uniquenessValidation.error });
    }

    // Générer Matricule format UTI-XXXX
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(Matricule, 5, LEN(Matricule)) AS INT)), 0) as MaxNum
      FROM Utilisateur
      WHERE Matricule LIKE 'UTI-%' AND ISNUMERIC(SUBSTRING(Matricule, 5, LEN(Matricule))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const Matricule = `UTI-${String(nextNumber).padStart(4, '0')}`;

    const insert = await pool.request()
      .input('Role', sql.NVarChar(100), Role)
      .input('IdUnite', sql.Int, IdUnite || null)
      .input('IdCentre', sql.Int, enforcedIdCentre || null)
      .input('IdAgence', sql.Int, IdAgence || null)
      .input('Matricule', sql.NVarChar(20), Matricule)
      .input('Nom', sql.NVarChar(100), Nom)
      .input('Prenom', sql.NVarChar(100), Prenom)
      .input('Email', sql.NVarChar(100), Email)
      .input('Telephone', sql.NVarChar(20), Telephone || null)
      .input('MotDePasse', sql.NVarChar(255), hashedPassword)
      .input('Actif', sql.Bit, Actif !== undefined ? Actif : 1)
      .query(`
        INSERT INTO Utilisateur (
          Role, IdUnite, IdCentre, IdAgence, Matricule, Nom, Prenom,
          Email, Telephone, MotDePasse, Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @Role, @IdUnite, @IdCentre, @IdAgence, @Matricule, @Nom, @Prenom,
          @Email, @Telephone, @MotDePasse, @Actif, GETDATE()
        )
      `);

    // Retourner l'utilisateur créé avec les informations de rôle et affectation
    const newUser = insert.recordset[0];
    const userInfo = await pool.request()
      .input('id', sql.Int, newUser.IdUtilisateur)
      .query(`
        SELECT 
          u.IdUtilisateur,
          u.Matricule,
          u.Nom,
          u.Prenom,
          u.Email,
          u.Telephone,
          u.Actif,
          u.DateCreation,
          u.Role,
          u.IdUnite,
          un.NomUnite,
          u.IdCentre,
          c.NomCentre,
          u.IdAgence,
          a.NomAgence
        FROM Utilisateur u
        LEFT JOIN Unite un ON u.IdUnite = un.IdUnite
        LEFT JOIN Centre c ON u.IdCentre = c.IdCentre
        LEFT JOIN AgenceCommerciale a ON u.IdAgence = a.IdAgence
        WHERE u.IdUtilisateur = @id
      `);

    return res.status(201).json(userInfo.recordset[0]);
  } catch (error) {
    // Error creating utilisateur
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Modification d'un utilisateur
app.put('/api/utilisateurs/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Role,  // Changé de IdRole à Role
      IdUnite,
      IdCentre,
      IdAgence,
      Nom,
      Prenom,
      Email,
      Telephone,
      MotDePasse,
      Actif
    } = req.body;

    const required = ['Role', 'Nom', 'Prenom', 'Email'];  // Changé de IdRole à Role
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    // Vérifier que le rôle est valide
    if (!AVAILABLE_ROLES.includes(Role)) {
      return res.status(400).json({ error: 'Rôle invalide. Les rôles disponibles sont: ' + AVAILABLE_ROLES.join(', ') });
    }

    // Vérifier que l'utilisateur existe
    const userExists = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT IdUtilisateur FROM Utilisateur WHERE IdUtilisateur = @id`);
    
    if (userExists.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Vérifier l'unicité de l'email (en excluant l'utilisateur actuel)
    const checkRequest = pool.request();
    checkRequest.input('email', sql.NVarChar(100), Email);
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query(`
      SELECT Email
      FROM Utilisateur
      WHERE Email = @email AND IdUtilisateur != @id
    `);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Si l'utilisateur authentifié est CHEF DE CENTRE, il ne peut modifier
    // que les utilisateurs de son propre centre
    const actorRoleRaw = (req.user?.role || '');
    const actorRoleLower = actorRoleRaw.toLowerCase();
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    let enforcedIdCentre = IdCentre || null;
    if (isChefCentreRole) {
      try {
        const resCentre = await pool.request()
          .input('id', sql.Int, req.user?.id)
          .query(`SELECT IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
        const actorCentreId = resCentre.recordset[0]?.IdCentre || null;
        if (!actorCentreId) {
          return res.status(403).json({ error: "Droit insuffisant: centre de l'utilisateur introuvable" });
        }
        // Vérifier que l'utilisateur à modifier appartient au même centre
        const userCentre = await pool.request()
          .input('id', sql.Int, id)
          .query(`SELECT IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
        const targetCentreId = userCentre.recordset[0]?.IdCentre || null;
        if (targetCentreId && Number(targetCentreId) !== Number(actorCentreId)) {
          return res.status(403).json({ error: 'Vous ne pouvez modifier que les utilisateurs de votre centre' });
        }
        if (IdCentre && Number(IdCentre) !== Number(actorCentreId)) {
          return res.status(403).json({ error: 'Vous ne pouvez assigner des utilisateurs qu\'à votre centre' });
        }
        enforcedIdCentre = actorCentreId;
      } catch (e) {
        return res.status(500).json({ error: 'Erreur lors de la vérification du centre de l\'utilisateur' });
      }
    }

    // Valider les contraintes d'unicité selon le rôle (en excluant l'utilisateur actuel)
    const uniquenessValidation = await validateUniquenessConstraints(Role, enforcedIdCentre, IdAgence, parseInt(id));  // Changé de IdRole à Role
    if (!uniquenessValidation.valid) {
      return res.status(400).json({ error: uniquenessValidation.error });
    }

    // Construire la requête UPDATE
    const updateFields = [];
    const updateRequest = pool.request();
    updateRequest.input('id', sql.Int, id);
    updateRequest.input('Role', sql.NVarChar(100), Role);  // Changé de IdRole (Int) à Role (NVarChar)
    updateRequest.input('IdUnite', sql.Int, IdUnite || null);
    updateRequest.input('IdCentre', sql.Int, enforcedIdCentre || null);
    updateRequest.input('IdAgence', sql.Int, IdAgence || null);
    updateRequest.input('Nom', sql.NVarChar(100), Nom);
    updateRequest.input('Prenom', sql.NVarChar(100), Prenom);
    updateRequest.input('Email', sql.NVarChar(100), Email);
    updateRequest.input('Telephone', sql.NVarChar(20), Telephone || null);
    
    if (Actif !== undefined) {
      updateRequest.input('Actif', sql.Bit, Actif);
      updateFields.push('Actif = @Actif');
    }
    
    // Mettre à jour le mot de passe seulement s'il est fourni
    if (MotDePasse) {
      const hashedPassword = await bcrypt.hash(MotDePasse, 12);
      updateRequest.input('MotDePasse', sql.NVarChar(255), hashedPassword);
      updateFields.push('MotDePasse = @MotDePasse');
    }
    updateFields.push('Role = @Role');  // Changé de IdRole à Role
    updateFields.push('IdUnite = @IdUnite');
    updateFields.push('IdCentre = @IdCentre');
    updateFields.push('IdAgence = @IdAgence');
    updateFields.push('Nom = @Nom');
    updateFields.push('Prenom = @Prenom');
    updateFields.push('Email = @Email');
    updateFields.push('Telephone = @Telephone');
    updateFields.push('DateModification = GETDATE()');

    const updateQuery = `
      UPDATE Utilisateur
      SET ${updateFields.join(', ')}
      WHERE IdUtilisateur = @id
    `;

    await updateRequest.query(updateQuery);

    // Retourner l'utilisateur modifié avec les informations de rôle et affectation
    const userInfo = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          u.IdUtilisateur,
          u.Matricule,
          u.Nom,
          u.Prenom,
          u.Email,
          u.Telephone,
          u.Actif,
          u.DateCreation,
          u.DateModification,
          u.Role,
          u.IdUnite,
          un.NomUnite,
          u.IdCentre,
          c.NomCentre,
          u.IdAgence,
          a.NomAgence
        FROM Utilisateur u
        LEFT JOIN Unite un ON u.IdUnite = un.IdUnite
        LEFT JOIN Centre c ON u.IdCentre = c.IdCentre
        LEFT JOIN AgenceCommerciale a ON u.IdAgence = a.IdAgence
        WHERE u.IdUtilisateur = @id
      `);

    return res.json(userInfo.recordset[0]);
  } catch (error) {
    // Error updating utilisateur
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Suppression d'un utilisateur
app.delete('/api/utilisateurs/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;

    // Vérifier que l'utilisateur existe
    const userExists = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT IdUtilisateur, IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
    
    if (userExists.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const targetUser = userExists.recordset[0];

    // Vérifier les permissions
    const actorRoleRaw = (req.user?.role || '');
    const actorRoleLower = actorRoleRaw.toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');

    // Seuls l'admin et le chef de centre peuvent supprimer des utilisateurs
    if (!isAdminRole) {
      // Chef de centre peut supprimer seulement les utilisateurs de son centre
      if (isChefCentreRole) {
        const resCentre = await pool.request()
          .input('id', sql.Int, actorId)
          .query(`SELECT IdCentre FROM Utilisateur WHERE IdUtilisateur = @id`);
        const actorCentreId = resCentre.recordset[0]?.IdCentre || null;
        
        if (!actorCentreId) {
          return res.status(403).json({ error: "Droit insuffisant: centre de l'utilisateur introuvable" });
        }

        // Vérifier que l'utilisateur à supprimer appartient au même centre
        if (!targetUser.IdCentre || Number(targetUser.IdCentre) !== Number(actorCentreId)) {
          return res.status(403).json({ error: 'Vous ne pouvez supprimer que les utilisateurs de votre centre' });
        }
      } else {
        // Autres utilisateurs ne peuvent pas supprimer de compte (même le leur)
        return res.status(403).json({ error: 'Seuls les administrateurs et les chefs de centre peuvent supprimer des utilisateurs' });
      }
    }

    // Supprimer l'utilisateur
    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM Utilisateur WHERE IdUtilisateur = @id`);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    // Error deleting utilisateur
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Liste des types de demandes
app.get('/api/demandes/types', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        IdDemandeType, 
        CodeType, 
        LibelleType,
        Description,
        ValidationChefSectionRelationClienteleRequise,
        ValidationJuridiqueRequise,
        ValidationChefAgenceRequise,
        ValidationChefCentreRequise,
        ValidationOE_ChefSectionRelationClienteleRequise,
        ValidationOE_ChefAgenceRequise,
        ValidationOE_ChefCentreRequise,
        Actif
      FROM DemandeType
      ORDER BY DateCreation DESC, LibelleType
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving demande types
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des types de demandes' });
  }
});

// Création d'un type de travaux (DemandeType)
app.post('/api/demandes/types', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin et le chef de centre peuvent créer des types de travaux
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    
    if (!isAdminRole && !isChefCentreRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs et les chefs de centre peuvent créer des types de travaux.' });
    }

    const { 
      LibelleType, 
      Description, 
      ValidationChefSectionRelationClienteleRequise,
      ValidationJuridiqueRequise, 
      ValidationChefAgenceRequise, 
      ValidationChefCentreRequise,
      ValidationOE_ChefSectionRelationClienteleRequise,
      ValidationOE_ChefAgenceRequise,
      ValidationOE_ChefCentreRequise
    } = req.body;

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
      .input('VCSRC', sql.Bit, ValidationChefSectionRelationClienteleRequise === true)
      .input('VJ', sql.Bit, ValidationJuridiqueRequise === true)
      .input('VCA', sql.Bit, ValidationChefAgenceRequise === true)
      .input('VCC', sql.Bit, ValidationChefCentreRequise === true)
      .input('VOE_CSRC', sql.Bit, ValidationOE_ChefSectionRelationClienteleRequise === true)
      .input('VOE_CA', sql.Bit, ValidationOE_ChefAgenceRequise === true)
      .input('VOE_CC', sql.Bit, ValidationOE_ChefCentreRequise === true)
      .query(`
        INSERT INTO DemandeType (
          CodeType, LibelleType, Description, 
          ValidationChefSectionRelationClienteleRequise,
          ValidationJuridiqueRequise, 
          ValidationChefAgenceRequise, 
          ValidationChefCentreRequise,
          ValidationOE_ChefSectionRelationClienteleRequise,
          ValidationOE_ChefAgenceRequise,
          ValidationOE_ChefCentreRequise,
          Actif, DateCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @CodeType, @LibelleType, @Description, 
          @VCSRC, @VJ, @VCA, @VCC,
          @VOE_CSRC, @VOE_CA, @VOE_CC,
          1, GETDATE()
        )
      `);

    res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating demande type
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Modification d'un type de demande
app.put('/api/demandes/types/:id', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin et le chef de centre peuvent modifier des types de travaux
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    
    if (!isAdminRole && !isChefCentreRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs et les chefs de centre peuvent modifier des types de travaux.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const { 
      LibelleType, 
      Description, 
      ValidationChefSectionRelationClienteleRequise,
      ValidationJuridiqueRequise, 
      ValidationChefAgenceRequise, 
      ValidationChefCentreRequise,
      ValidationOE_ChefSectionRelationClienteleRequise,
      ValidationOE_ChefAgenceRequise,
      ValidationOE_ChefCentreRequise,
      Actif
    } = req.body;

    if (!LibelleType) {
      return res.status(400).json({ error: 'LibelleType est requis' });
    }

    const update = await pool.request()
      .input('id', sql.Int, id)
      .input('LibelleType', sql.NVarChar(100), LibelleType)
      .input('Description', sql.NVarChar(255), Description || null)
      .input('VCSRC', sql.Bit, ValidationChefSectionRelationClienteleRequise === true)
      .input('VJ', sql.Bit, ValidationJuridiqueRequise === true)
      .input('VCA', sql.Bit, ValidationChefAgenceRequise === true)
      .input('VCC', sql.Bit, ValidationChefCentreRequise === true)
      .input('VOE_CSRC', sql.Bit, ValidationOE_ChefSectionRelationClienteleRequise === true)
      .input('VOE_CA', sql.Bit, ValidationOE_ChefAgenceRequise === true)
      .input('VOE_CC', sql.Bit, ValidationOE_ChefCentreRequise === true)
      .input('Actif', sql.Bit, Actif !== false)
      .query(`
        UPDATE DemandeType SET
          LibelleType = @LibelleType,
          Description = @Description,
          ValidationChefSectionRelationClienteleRequise = @VCSRC,
          ValidationJuridiqueRequise = @VJ,
          ValidationChefAgenceRequise = @VCA,
          ValidationChefCentreRequise = @VCC,
          ValidationOE_ChefSectionRelationClienteleRequise = @VOE_CSRC,
          ValidationOE_ChefAgenceRequise = @VOE_CA,
          ValidationOE_ChefCentreRequise = @VOE_CC,
          Actif = @Actif
        WHERE IdDemandeType = @id;
        
        SELECT * FROM DemandeType WHERE IdDemandeType = @id;
      `);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Type de demande introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    // Error updating demande type
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================================
// DIAGNOSTIC DES TYPES DE TRAVAUX
// ============================================================================

// Endpoint pour tester les autorisations de tous les utilisateurs
app.get('/api/demandes/types/test-authorizations', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin et le chef de centre peuvent accéder
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    if (!isAdminRole && !isChefCentreRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs et les chefs de centre peuvent accéder à ce test.' });
    }

    // Récupérer tous les utilisateurs actifs
    const usersResult = await pool.request().query(`
      SELECT IdUtilisateur, Role, Nom, Prenom, Email
      FROM Utilisateur
      WHERE Actif = 1
      ORDER BY Role, Nom
    `);

    // Récupérer tous les types de travaux actifs
    const typesResult = await pool.request().query(`
      SELECT 
        IdDemandeType, 
        CodeType, 
        LibelleType,
        Description,
        Actif
      FROM DemandeType
      WHERE Actif = 1
      ORDER BY LibelleType
    `);

    const users = usersResult.recordset;
    const types = typesResult.recordset;

    const testResults = {
      dateTest: new Date().toISOString(),
      totalUsers: users.length,
      totalTypes: types.length,
      results: []
    };

    // Pour chaque utilisateur, tester l'accès à chaque type
    users.forEach(user => {
      const userRole = normalizeRole(user.Role);
      const userResults = {
        userId: user.IdUtilisateur,
        userRole: user.Role,
        userRoleNormalized: userRole,
        userName: `${user.Nom} ${user.Prenom}`,
        userEmail: user.Email,
        accessibleTypes: [],
        inaccessibleTypes: [],
        totalAccessible: 0,
        totalInaccessible: 0
      };

      types.forEach(type => {
        let rolesAutorises = [];
        
        if (type.Description) {
          try {
            const parsed = JSON.parse(type.Description);
            rolesAutorises = parsed.r || parsed.roles || [];
          } catch (e) {
            // Description n'est pas du JSON, donc pas de restrictions
          }
        }

        // Vérifier si l'utilisateur peut créer ce type
        let canCreate = false;
        
        // Si admin, peut tout créer
        if (userRole === 'ADMINISTRATEUR' || userRole.includes('ADMIN')) {
          canCreate = true;
        }
        // Si aucun rôle spécifié, tous peuvent créer
        else if (rolesAutorises.length === 0) {
          canCreate = true;
        }
        // Sinon, vérifier si le rôle de l'utilisateur est dans la liste
        else {
          canCreate = rolesAutorises.some(role => {
            if (typeof role === 'number') return false;
            if (typeof role === 'string') {
              return rolesMatch(userRole, role);
            }
            return false;
          });
        }

        if (canCreate) {
          userResults.accessibleTypes.push({
            id: type.IdDemandeType,
            code: type.CodeType,
            libelle: type.LibelleType
          });
          userResults.totalAccessible++;
        } else {
          userResults.inaccessibleTypes.push({
            id: type.IdDemandeType,
            code: type.CodeType,
            libelle: type.LibelleType,
            rolesAutorises: rolesAutorises
          });
          userResults.totalInaccessible++;
        }
      });

      testResults.results.push(userResults);
    });

    res.json(testResults);
  } catch (error) {
    // Error testing authorizations
    res.status(500).json({ error: 'Erreur serveur lors du test' });
  }
});

// Endpoint pour diagnostiquer les problèmes d'autorisation des types de travaux
app.get('/api/demandes/types/diagnostic', verifyToken, async (req, res) => {
  try {
    // Vérifier que seul l'admin et le chef de centre peuvent accéder
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    if (!isAdminRole && !isChefCentreRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs et les chefs de centre peuvent accéder au diagnostic.' });
    }

    const result = await pool.request().query(`
      SELECT 
        IdDemandeType, 
        CodeType, 
        LibelleType,
        Description,
        Actif
      FROM DemandeType
      ORDER BY LibelleType
    `);

    const types = result.recordset;
    const diagnostic = {
      totalTypes: types.length,
      typesActifs: types.filter(t => t.Actif === true || t.Actif === 1).length,
      typesInactifs: types.filter(t => t.Actif === false || t.Actif === 0).length,
      typesAvecRoles: 0,
      typesSansRoles: 0,
      typesAvecProblemes: [],
      rolesUtilises: new Set(),
      recommandations: []
    };

    types.forEach(type => {
      let rolesAutorises = [];
      let hasDescription = false;
      
      if (type.Description) {
        hasDescription = true;
        try {
          const parsed = JSON.parse(type.Description);
          rolesAutorises = parsed.r || parsed.roles || [];
        } catch (e) {
          // Description n'est pas du JSON, donc pas de restrictions
        }
      }

      if (rolesAutorises.length > 0) {
        diagnostic.typesAvecRoles++;
        rolesAutorises.forEach(role => {
          if (typeof role === 'string') {
            diagnostic.rolesUtilises.add(normalizeRole(role));
          }
        });

        // Vérifier si les rôles sont valides
        const rolesInvalides = rolesAutorises.filter(role => {
          if (typeof role === 'number') return true; // IDs ne sont plus supportés
          if (typeof role === 'string') {
            const normalized = normalizeRole(role);
            return !AVAILABLE_ROLES.some(availableRole => rolesMatch(normalized, availableRole));
          }
          return true;
        });

        if (rolesInvalides.length > 0) {
          diagnostic.typesAvecProblemes.push({
            id: type.IdDemandeType,
            code: type.CodeType,
            libelle: type.LibelleType,
            probleme: 'Rôles invalides ou non reconnus',
            rolesInvalides: rolesInvalides,
            rolesAutorises: rolesAutorises
          });
        }
      } else {
        diagnostic.typesSansRoles++;
      }
    });

    // Générer des recommandations
    if (diagnostic.typesAvecProblemes.length > 0) {
      diagnostic.recommandations.push({
        type: 'error',
        message: `${diagnostic.typesAvecProblemes.length} type(s) ont des rôles invalides ou des IDs au lieu de codes de rôles.`,
        action: 'Corriger les rôles dans la Description de ces types.'
      });
    }

    if (diagnostic.typesSansRoles > 0) {
      diagnostic.recommandations.push({
        type: 'info',
        message: `${diagnostic.typesSansRoles} type(s) n'ont pas de restrictions de rôles (accessibles par tous).`,
        action: 'C\'est normal si vous voulez que tous les utilisateurs puissent créer ces types.'
      });
    }

    diagnostic.rolesUtilises = Array.from(diagnostic.rolesUtilises);

    res.json(diagnostic);
  } catch (error) {
    // Error diagnosing demande types
    res.status(500).json({ error: 'Erreur serveur lors du diagnostic' });
  }
});

// ============================================================================
// DEMANDES - CREATION
// ============================================================================

app.post('/api/demandes', verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // Récupérer les informations de l'utilisateur (rôle)
    const userInfo = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT u.Role
        FROM Utilisateur u
        WHERE u.IdUtilisateur = @id
      `);

    if (userInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userData = userInfo.recordset[0];
    const userRole = userData.Role || '';
    const isAdmin = userRole === 'ADMINISTRATEUR';

    const {
      idAgence,
      idClient,
      idDemandeType,
      commentaire,
      delaiPaiementJours,
      client: clientPayload
    } = req.body;

    if (!idAgence || !idDemandeType) {
      return res.status(400).json({ error: 'idAgence et idDemandeType sont requis' });
    }

    // Vérifier que l'utilisateur peut créer ce type de demande
    // Récupérer le type de demande
    const typeRequest = await pool.request()
      .input('id', sql.Int, idDemandeType)
      .query(`
        SELECT IdDemandeType, Description, Actif
        FROM DemandeType
        WHERE IdDemandeType = @id
      `);

    if (typeRequest.recordset.length === 0) {
      return res.status(404).json({ error: 'Type de demande introuvable' });
    }

    const demandeType = typeRequest.recordset[0];
    
    // Vérifier que le type est actif
    if (!demandeType.Actif) {
      return res.status(400).json({ error: 'Ce type de demande est inactif' });
    }

    // Vérifier les permissions de l'utilisateur
    if (!isAdmin) {
      // Parser la description pour vérifier les rôles autorisés
      let rolesAutorises = [];
      if (demandeType.Description) {
        try {
          const parsed = JSON.parse(demandeType.Description);
          rolesAutorises = parsed.r || parsed.roles || [];
        } catch (e) {
          // Si ce n'est pas du JSON, c'est une description simple
          // Dans ce cas, tous les rôles peuvent créer
        }
      }
      
      // Si des rôles sont spécifiés, vérifier si l'utilisateur en fait partie
      if (rolesAutorises.length > 0) {
        // Vérifier si le rôle de l'utilisateur est dans la liste des rôles autorisés
        const userRoleNormalized = normalizeRole(userRole);
        const isAuthorized = rolesAutorises.some(role => {
          // Si c'est un nombre (ID de rôle), on ne peut pas le comparer directement
          // Pour les anciens types avec IDs, on refuse l'accès par défaut
          if (typeof role === 'number') {
            return false;
          }
          
          // Si c'est une string (code de rôle), utiliser la fonction de comparaison robuste
          if (typeof role === 'string') {
            return rolesMatch(userRoleNormalized, role);
          }
          
          return false;
        });
        
        if (!isAuthorized) {
          return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à créer ce type de demande' });
        }
      }
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
      tr.input('codePostalResidence', sql.NVarChar(5), (clientPayload.codePostalResidence || '').substring(0, 5));
      tr.input('adresseBranchement', sql.NVarChar(200), clientPayload.adresseBranchement || null);
      tr.input('communeBranchement', sql.NVarChar(100), clientPayload.communeBranchement || null);
      tr.input('codePostalBranchement', sql.NVarChar(5), (clientPayload.codePostalBranchement || '').substring(0, 5) || null);
      tr.input('telephonePrincipal', sql.NVarChar(10), (clientPayload.telephonePrincipal || '').substring(0, 10) || null);
      tr.input('telephoneSecondaire', sql.NVarChar(10), (clientPayload.telephoneSecondaire || '').substring(0, 10) || null);
      tr.input('fax', sql.NVarChar(10), (clientPayload.fax || '').substring(0, 10) || null);
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
    
    // IdUtilisateurCreation est NOT NULL, donc on doit avoir un utilisateur
    if (!req.user?.id) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    
    reqInsert.input('idUtilisateur', sql.Int, req.user.id);
    reqInsert.input('commentaire', sql.NVarChar(sql.MAX), commentaire || null);
    reqInsert.input('delai', sql.Int, delaiPaiementJours || 30);

    const insertQuery = `
      -- Récupérer le préfixe du centre depuis l'agence
      DECLARE @prefixeCentre NVARCHAR(5);
      SELECT @prefixeCentre = c.PrefixeCentre
      FROM AgenceCommerciale a
      INNER JOIN Centre c ON a.IdCentre = c.IdCentre
      WHERE a.IdAgence = @idAgence;
      
      -- Si le préfixe n'est pas trouvé, utiliser une valeur par défaut
      IF @prefixeCentre IS NULL OR @prefixeCentre = ''
      BEGIN
        SET @prefixeCentre = 'DEF';
      END
      
      -- Récupérer l'année en cours
      DECLARE @annee NVARCHAR(4) = CAST(YEAR(GETDATE()) AS NVARCHAR(4));
      
      -- Calculer le prochain numéro séquentiel pour cette année et ce préfixe
      DECLARE @nextSeq INT = 1;
      DECLARE @suffixPattern NVARCHAR(50) = CONCAT('/', @prefixeCentre, '/', @annee);
      
      -- Extraire le numéro séquentiel des demandes existantes avec le même préfixe et année
      -- Format attendu: DEM-XXXX/préfix/yyyy où XXXX est le numéro séquentiel
      SELECT @nextSeq = ISNULL(MAX(
        CASE 
          WHEN NumeroDemande LIKE CONCAT('DEM-%', @suffixPattern)
            AND LEN(NumeroDemande) >= 13
            AND SUBSTRING(NumeroDemande, 1, 4) = 'DEM-'
            AND CHARINDEX('/', NumeroDemande, 5) > 5
            AND ISNUMERIC(SUBSTRING(NumeroDemande, 5, CHARINDEX('/', NumeroDemande, 5) - 5)) = 1
          THEN CAST(SUBSTRING(NumeroDemande, 5, CHARINDEX('/', NumeroDemande, 5) - 5) AS INT)
          ELSE 0
        END
      ), 0) + 1
      FROM DemandeTravaux
      WHERE NumeroDemande LIKE CONCAT('DEM-%', @suffixPattern);
      
      -- Formater le numéro séquentiel avec padding de 4 chiffres
      DECLARE @seq NVARCHAR(4) = RIGHT('0000' + CAST(@nextSeq AS NVARCHAR(4)), 4);
      
      -- Générer le numéro au format DEM-XXXX/préfix/yyyy
      DECLARE @numero NVARCHAR(50) = CONCAT('DEM-', @seq, '/', @prefixeCentre, '/', @annee);

      DECLARE @idStatut INT = (
        SELECT TOP 1 IdStatut FROM DemandeStatut WHERE Actif = 1 ORDER BY OrdreStatut ASC
      );

      IF @idStatut IS NULL
      BEGIN
        -- Essayer d'insérer les statuts par défaut automatiquement
        INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
        SELECT 'EN_ATTENTE', 'En attente', 1, 1, GETDATE()
        WHERE NOT EXISTS (SELECT 1 FROM DemandeStatut WHERE CodeStatut = 'EN_ATTENTE');
        
        INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
        SELECT 'EN_COURS', 'En cours', 2, 1, GETDATE()
        WHERE NOT EXISTS (SELECT 1 FROM DemandeStatut WHERE CodeStatut = 'EN_COURS');
        
        INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
        SELECT 'VALIDE', 'Validée', 3, 1, GETDATE()
        WHERE NOT EXISTS (SELECT 1 FROM DemandeStatut WHERE CodeStatut = 'VALIDE');
        
        INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
        SELECT 'REJETE', 'Rejetée', 4, 1, GETDATE()
        WHERE NOT EXISTS (SELECT 1 FROM DemandeStatut WHERE CodeStatut = 'REJETE');
        
        INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
        SELECT 'TERMINE', 'Terminée', 5, 1, GETDATE()
        WHERE NOT EXISTS (SELECT 1 FROM DemandeStatut WHERE CodeStatut = 'TERMINE');
        
        -- Réessayer de récupérer le statut
        SET @idStatut = (
          SELECT TOP 1 IdStatut FROM DemandeStatut WHERE Actif = 1 ORDER BY OrdreStatut ASC
        );
        
        IF @idStatut IS NULL
        BEGIN
          RAISERROR('Aucun statut actif trouvé dans DemandeStatut après initialisation', 16, 1);
          RETURN;
        END
      END

      INSERT INTO DemandeTravaux (
        NumeroDemande,
        IdAgence,
        IdClient,
        IdDemandeType,
        IdStatut,
        IdUtilisateurCreation,
        DateDemande,
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
    try { 
      if (transaction) {
        await transaction.rollback(); 
      }
    } catch (rollbackError) {
      // Error during rollback
    }
    // Error creating demande
    
    // Messages d'erreur plus spécifiques
    let errorMessage = 'Erreur serveur';
    if (error.number === 50000 || error.message?.includes('Aucun statut actif')) {
      errorMessage = 'Aucun statut de demande actif trouvé. Veuillez contacter l\'administrateur.';
    } else if (error.number === 515 || error.message?.includes('cannot insert the value NULL')) {
      errorMessage = 'Une valeur obligatoire est manquante.';
    } else if (error.number === 547 || error.message?.includes('FOREIGN KEY constraint')) {
      errorMessage = 'Référence invalide (clé étrangère). Vérifiez que l\'agence, le client et le type de demande existent.';
    } else if (error.originalError?.message) {
      errorMessage = error.originalError.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        number: error.number,
        state: error.state
      } : undefined
    });
  }
});

// ============================================================================
// DEMANDES - LECTURE
// ============================================================================

// Liste des demandes
app.get('/api/demandes', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non identifié' });
    }

    // Récupérer les informations de l'utilisateur (IdAgence, IdCentre, rôle)
    const userInfo = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT u.IdAgence, u.IdCentre, u.Role
        FROM Utilisateur u
        WHERE u.IdUtilisateur = @id
      `);

    if (userInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userData = userInfo.recordset[0];
    const actorRoleLower = (userData.Role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre');
    const isChefServiceJuridiqueRole = actorRoleLower.includes('chef') && (actorRoleLower.includes('juridique') || actorRoleLower.includes('jurid'));
    const isChefServiceTechnicoCommercialRole = actorRoleLower.includes('chef') && actorRoleLower.includes('technico') && actorRoleLower.includes('commercial');
    const isChefWithCenterAccess = isChefCentreRole || isChefServiceJuridiqueRole || isChefServiceTechnicoCommercialRole;

    // Construire la clause WHERE selon le rôle
    let whereClause = 'WHERE d.Actif = 1';
    let request = pool.request();

    if (!isAdminRole) {
      if (isChefWithCenterAccess) {
        // Chef de centre : voir toutes les demandes de son centre
        if (userData.IdCentre) {
          whereClause += ' AND a.IdCentre = @centreId';
          request.input('centreId', sql.Int, userData.IdCentre);
        } else {
          return res.status(403).json({ error: 'Vous n\'êtes pas affecté à un centre.' });
        }
      } else {
        // Autres utilisateurs : voir seulement les demandes de leur agence
        if (userData.IdAgence) {
          whereClause += ' AND d.IdAgence = @agenceId';
          request.input('agenceId', sql.Int, userData.IdAgence);
        } else {
          return res.status(403).json({ error: 'Vous n\'êtes pas affecté à une agence.' });
        }
      }
    }
    // Admin : pas de filtre, voit toutes les demandes

    const result = await request.query(`
      SELECT 
        d.IdDemande,
        d.NumeroDemande,
        d.DateDemande,
        d.Commentaire,
        d.DelaiPaiementJours,
        d.Actif,
        d.DateCreation,
        d.DateModification,
        d.DateValidationChefSectionRelationClientele,
        d.DateValidationJuridique,
        d.DateValidationChefAgence,
        d.DateValidationChefCentre,
        s.IdStatut,
        s.CodeStatut,
        s.LibelleStatut as Statut,
        dt.IdDemandeType,
        dt.CodeType,
        dt.LibelleType as TypeDemande,
        dt.ValidationChefSectionRelationClienteleRequise,
        dt.ValidationJuridiqueRequise,
        dt.ValidationChefAgenceRequise,
        dt.ValidationChefCentreRequise,
        dt.ValidationOE_ChefSectionRelationClienteleRequise,
        dt.ValidationOE_ChefAgenceRequise,
        dt.ValidationOE_ChefCentreRequise,
        a.IdAgence,
        a.NomAgence,
        c.IdClient,
        c.Nom as ClientNom,
        c.Prenom as ClientPrenom,
        c.TelephonePrincipal as ClientTelephone,
        c.Email as ClientEmail,
        c.AdresseResidence,
        c.CommuneResidence,
        c.AdresseBranchement,
        c.CommuneBranchement,
        ct.LibelleType as TypeClient,
        u.Nom + ' ' + ISNULL(u.Prenom, '') as Createur
      FROM DemandeTravaux d
      INNER JOIN DemandeStatut s ON d.IdStatut = s.IdStatut
      INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
      INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
      INNER JOIN Client c ON d.IdClient = c.IdClient
      LEFT JOIN ClientType ct ON c.IdClientType = ct.IdClientType
      INNER JOIN Utilisateur u ON d.IdUtilisateurCreation = u.IdUtilisateur
      ${whereClause}
      ORDER BY d.DateDemande DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving demandes
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Nombre de demandes non validées pour l'utilisateur connecté
app.get('/api/demandes/pending-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non identifié' });
    }

    // Récupérer les informations de l'utilisateur
    const userInfo = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT u.IdAgence, u.IdCentre, u.Role
        FROM Utilisateur u
        WHERE u.IdUtilisateur = @id
      `);

    if (userInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userData = userInfo.recordset[0];
    const actorRoleLower = (userData.Role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    const isChefAgenceRole = actorRoleLower.includes('chef') && actorRoleLower.includes('agence') && !actorRoleLower.includes('centre');
    const isChefSectionRCRole = actorRoleLower.includes('chef') && actorRoleLower.includes('section') && (actorRoleLower.includes('relation') || actorRoleLower.includes('relat')) && actorRoleLower.includes('client');
    const isChefServiceJuridiqueRole = actorRoleLower.includes('chef') && (actorRoleLower.includes('juridique') || actorRoleLower.includes('jurid'));
    const isChefCentreRole = actorRoleLower.includes('chef') && actorRoleLower.includes('centre') && !actorRoleLower.includes('agence');

    let whereClause = 'WHERE d.Actif = 1';
    let request = pool.request();

    // Construire la condition selon le rôle
    if (isChefAgenceRole) {
      // Chef d'agence : demandes nécessitant validation chef agence, non validées, de son agence
      whereClause += ' AND dt.ValidationChefAgenceRequise = 1';
      whereClause += ' AND d.DateValidationChefAgence IS NULL';
      if (userData.IdAgence) {
        whereClause += ' AND d.IdAgence = @agenceId';
        request.input('agenceId', sql.Int, userData.IdAgence);
      } else {
        return res.json({ count: 0 });
      }
    } else if (isChefSectionRCRole) {
      // Chef section relation clientele : demandes nécessitant validation RC, non validées, de son agence
      whereClause += ' AND dt.ValidationChefSectionRelationClienteleRequise = 1';
      whereClause += ' AND d.DateValidationChefSectionRelationClientele IS NULL';
      if (userData.IdAgence) {
        whereClause += ' AND d.IdAgence = @agenceId';
        request.input('agenceId', sql.Int, userData.IdAgence);
      } else {
        return res.json({ count: 0 });
      }
    } else if (isChefServiceJuridiqueRole) {
      // Chef service juridique : demandes nécessitant validation juridique, non validées (toutes agences)
      whereClause += ' AND dt.ValidationJuridiqueRequise = 1';
      whereClause += ' AND d.DateValidationJuridique IS NULL';
      // Pas de filtre agence/centre pour le service juridique
    } else if (isChefCentreRole) {
      // Chef de centre : demandes nécessitant validation chef centre, non validées, de son centre
      whereClause += ' AND dt.ValidationChefCentreRequise = 1';
      whereClause += ' AND d.DateValidationChefCentre IS NULL';
      if (userData.IdCentre) {
        whereClause += ' AND a.IdCentre = @centreId';
        request.input('centreId', sql.Int, userData.IdCentre);
      } else {
        return res.json({ count: 0 });
      }
    } else if (isAdminRole) {
      // Admin : toutes les demandes non validées (au moins une validation requise et non faite)
      whereClause += ` AND (
        (dt.ValidationChefAgenceRequise = 1 AND d.DateValidationChefAgence IS NULL) OR
        (dt.ValidationChefSectionRelationClienteleRequise = 1 AND d.DateValidationChefSectionRelationClientele IS NULL) OR
        (dt.ValidationJuridiqueRequise = 1 AND d.DateValidationJuridique IS NULL) OR
        (dt.ValidationChefCentreRequise = 1 AND d.DateValidationChefCentre IS NULL)
      )`;
    } else {
      // Autres utilisateurs : pas de notifications
      return res.json({ count: 0 });
    }

    const result = await request.query(`
      SELECT COUNT(*) as count
      FROM DemandeTravaux d
      INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
      INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
      ${whereClause}
    `);

    const count = result.recordset[0]?.count || 0;
    res.json({ count: parseInt(count) });
  } catch (error) {
    // Error retrieving pending demandes count
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Validation d'une demande
app.post('/api/demandes/:id/validate', verifyToken, async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id);
    const userId = req.user?.id;
    const { typeValidation } = req.body; // 'juridique', 'chefAgence' ou 'chefSectionRC'

    if (!demandeId || !userId || !typeValidation) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // Récupérer les informations de l'utilisateur et de la demande
    const userInfo = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT u.IdAgence, u.IdCentre, u.Role
        FROM Utilisateur u
        WHERE u.IdUtilisateur = @id
      `);

    if (userInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userData = userInfo.recordset[0];
    const actorRoleLower = (userData.Role || '').toLowerCase();

    // Récupérer la demande avec son type
    const demandeInfo = await pool.request()
      .input('id', sql.Int, demandeId)
      .query(`
        SELECT 
          d.*,
          dt.ValidationChefSectionRelationClienteleRequise,
          dt.ValidationJuridiqueRequise,
          dt.ValidationChefAgenceRequise,
          dt.ValidationChefCentreRequise,
          dt.ValidationOE_ChefSectionRelationClienteleRequise,
          dt.ValidationOE_ChefAgenceRequise,
          dt.ValidationOE_ChefCentreRequise,
          a.IdAgence as DemandeIdAgence
        FROM DemandeTravaux d
        INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
        INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
        WHERE d.IdDemande = @id
      `);

    if (demandeInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const demande = demandeInfo.recordset[0];

    // Vérifier les permissions selon le type de validation
    if (typeValidation === 'juridique') {
      // Vérifier que l'utilisateur est chef service juridique
      const isChefJuridique = actorRoleLower.includes('chef') && (actorRoleLower.includes('juridique') || actorRoleLower.includes('jurid'));
      if (!isChefJuridique) {
        return res.status(403).json({ error: 'Seul le chef service juridique peut valider juridiquement.' });
      }
      // Vérifier que la validation juridique est requise pour ce type
      if (!demande.ValidationJuridiqueRequise) {
        return res.status(400).json({ error: 'La validation juridique n\'est pas requise pour ce type de demande.' });
      }
      // Vérifier que la validation n'a pas déjà été faite
      if (demande.DateValidationJuridique) {
        return res.status(400).json({ error: 'Cette demande a déjà été validée juridiquement.' });
      }
    } else if (typeValidation === 'chefAgence') {
      // Vérifier que l'utilisateur est chef d'agence
      const isChefAgence = actorRoleLower.includes('chef') && actorRoleLower.includes('agence');
      if (!isChefAgence) {
        return res.status(403).json({ error: 'Seul le chef d\'agence peut valider.' });
      }
      // Vérifier que la validation chef agence est requise pour ce type
      if (!demande.ValidationChefAgenceRequise) {
        return res.status(400).json({ error: 'La validation chef d\'agence n\'est pas requise pour ce type de demande.' });
      }
      // Vérifier que la validation n'a pas déjà été faite
      if (demande.DateValidationChefAgence) {
        return res.status(400).json({ error: 'Cette demande a déjà été validée par le chef d\'agence.' });
      }
      // Vérifier que l'utilisateur est chef de l'agence de la demande
      if (userData.IdAgence && Number(userData.IdAgence) !== Number(demande.DemandeIdAgence)) {
        return res.status(403).json({ error: 'Vous ne pouvez valider que les demandes de votre agence.' });
      }
    } else if (typeValidation === 'chefSectionRC') {
      // Vérifier que l'utilisateur est chef section relation clientele
      const hasSection = actorRoleLower.includes('section') || actorRoleLower.includes('sect');
      const hasRelation = actorRoleLower.includes('relation') || actorRoleLower.includes('relat');
      const hasClientele = actorRoleLower.includes('client');
      const isChefSectionRC = actorRoleLower.includes('chef') && hasSection && hasRelation && hasClientele;
      if (!isChefSectionRC) {
        return res.status(403).json({ error: 'Seul le chef section relation clientele peut valider ce type.' });
      }
      // Vérifier que la validation chef section relation clientele est requise pour ce type
      if (!demande.ValidationChefSectionRelationClienteleRequise) {
        return res.status(400).json({ error: 'La validation section relation clientele n\'est pas requise pour ce type de demande.' });
      }
      // Vérifier que la validation n'a pas déjà été faite
      if (demande.DateValidationChefSectionRelationClientele) {
        return res.status(400).json({ error: 'Cette demande a déjà été validée par la section relation clientele.' });
      }
      // Vérifier que la demande appartient à l'agence de l'utilisateur le cas échéant
      if (userData.IdAgence && Number(userData.IdAgence) !== Number(demande.DemandeIdAgence)) {
        return res.status(403).json({ error: 'Vous ne pouvez valider que les demandes de votre agence.' });
      }
    } else {
      return res.status(400).json({ error: 'Type de validation invalide' });
    }

    // Effectuer la validation
    let updateQuery = '';
    if (typeValidation === 'juridique') {
      updateQuery = `
        UPDATE DemandeTravaux 
        SET DateValidationJuridique = GETDATE(),
            IdUtilisateurValidationJuridique = @userId,
            DateModification = GETDATE()
        WHERE IdDemande = @demandeId;
      `;
    } else if (typeValidation === 'chefAgence') {
      updateQuery = `
        UPDATE DemandeTravaux 
        SET DateValidationChefAgence = GETDATE(),
            IdUtilisateurValidationChefAgence = @userId,
            DateModification = GETDATE()
        WHERE IdDemande = @demandeId;
      `;
    } else if (typeValidation === 'chefSectionRC') {
      updateQuery = `
        UPDATE DemandeTravaux 
        SET DateValidationChefSectionRelationClientele = GETDATE(),
            IdUtilisateurValidationChefSectionRelationClientele = @userId,
            DateModification = GETDATE()
        WHERE IdDemande = @demandeId;
      `;
    }

    await pool.request()
      .input('userId', sql.Int, userId)
      .input('demandeId', sql.Int, demandeId)
      .query(updateQuery);

    // Récupérer la demande mise à jour
    const updatedDemande = await pool.request()
      .input('id', sql.Int, demandeId)
      .query(`
        SELECT 
          d.*,
          s.CodeStatut,
          s.LibelleStatut as Statut,
          dt.LibelleType as TypeDemande,
          a.NomAgence,
          c.Nom as ClientNom,
          c.Prenom as ClientPrenom
        FROM DemandeTravaux d
        INNER JOIN DemandeStatut s ON d.IdStatut = s.IdStatut
        INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
        INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
        INNER JOIN Client c ON d.IdClient = c.IdClient
        WHERE d.IdDemande = @id
      `);

    res.json(updatedDemande.recordset[0]);
  } catch (error) {
    // Error validating demande
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Récupérer une demande par ID
app.get('/api/demandes/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          d.*,
          s.CodeStatut,
          s.LibelleStatut as Statut,
          dt.CodeType,
          dt.LibelleType as TypeDemande,
          a.NomAgence,
          c.Nom as ClientNom,
          c.Prenom as ClientPrenom,
          u.Nom + ' ' + ISNULL(u.Prenom, '') as Createur
        FROM DemandeTravaux d
        INNER JOIN DemandeStatut s ON d.IdStatut = s.IdStatut
        INNER JOIN DemandeType dt ON d.IdDemandeType = dt.IdDemandeType
        INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
        INNER JOIN Client c ON d.IdClient = c.IdClient
        INNER JOIN Utilisateur u ON d.IdUtilisateurCreation = u.IdUtilisateur
        WHERE d.IdDemande = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving demande
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// DEMANDES - STATUTS
// ============================================================================

// Initialiser les statuts par défaut si la table est vide
app.post('/api/demandes/statuts/init', verifyToken, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Seuls les administrateurs peuvent initialiser les statuts.' });
    }

    const checkRequest = pool.request();
    const checkResult = await checkRequest.query(`
      SELECT COUNT(*) as Count FROM DemandeStatut WHERE Actif = 1
    `);

    if (checkResult.recordset[0].Count > 0) {
      return res.json({ 
        message: 'Les statuts existent déjà',
        count: checkResult.recordset[0].Count
      });
    }

    // Insérer les statuts par défaut
    const insertRequest = pool.request();
    await insertRequest.query(`
      INSERT INTO DemandeStatut (CodeStatut, LibelleStatut, OrdreStatut, Actif, DateCreation)
      VALUES 
        ('EN_ATTENTE', 'En attente', 1, 1, GETDATE()),
        ('EN_COURS', 'En cours', 2, 1, GETDATE()),
        ('VALIDE', 'Validée', 3, 1, GETDATE()),
        ('REJETE', 'Rejetée', 4, 1, GETDATE()),
        ('TERMINE', 'Terminée', 5, 1, GETDATE())
    `);

    res.json({ message: 'Statuts initialisés avec succès' });
  } catch (error) {
    // Error initializing statuts
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les statuts
app.get('/api/demandes/statuts', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT IdStatut, CodeStatut, LibelleStatut, OrdreStatut, Actif
      FROM DemandeStatut
      WHERE Actif = 1
      ORDER BY OrdreStatut ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving statuts
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// ARTICLES
// ============================================================================

// Récupérer les familles d'articles
app.get('/api/articles/familles', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT IdFamille, CodeFamille, LibelleFamille
      FROM ArticleFamille
      WHERE Actif = 1
      ORDER BY LibelleFamille
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving article familles
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'une famille d'articles (CodeFamille auto FAM-XXX)
app.post('/api/articles/familles', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent créer des familles d\'articles.' });
    }

    const {
      LibelleFamille,
      Description
    } = req.body;

    if (!LibelleFamille) {
      return res.status(400).json({ error: 'LibelleFamille est requis' });
    }

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'LibelleFamille', value: LibelleFamille, max: 100, label: 'Libellé Famille' },
      { field: 'Description', value: Description, max: 255, label: 'Description' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
    }

    // Vérifier si une famille avec le même libellé existe déjà
    const existingFamille = await pool.request()
      .input('LibelleFamille', sql.NVarChar(100), LibelleFamille.trim())
      .query(`
        SELECT IdFamille, LibelleFamille
        FROM ArticleFamille
        WHERE LOWER(LTRIM(RTRIM(LibelleFamille))) = LOWER(LTRIM(RTRIM(@LibelleFamille)))
          AND Actif = 1
      `);

    if (existingFamille.recordset.length > 0) {
      return res.status(409).json({ error: 'Une famille avec ce libellé existe déjà.' });
    }

    // Générer CodeFamille format FAM-XXX
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeFamille, 5, LEN(CodeFamille)) AS INT)), 0) as MaxNum
      FROM ArticleFamille
      WHERE CodeFamille LIKE 'FAM-%' AND ISNUMERIC(SUBSTRING(CodeFamille, 5, LEN(CodeFamille))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const CodeFamille = `FAM-${String(nextNumber).padStart(3, '0')}`;

    const insert = await pool.request()
      .input('CodeFamille', sql.NVarChar(20), CodeFamille)
      .input('LibelleFamille', sql.NVarChar(100), LibelleFamille.trim())
      .input('Description', sql.NVarChar(255), Description?.trim() || null)
      .query(`
        INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif, DateCreation)
        OUTPUT INSERTED.*
        VALUES (@CodeFamille, @LibelleFamille, @Description, 1, GETDATE())
      `);

    res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating article famille
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: 'Une famille avec ce code existe déjà.' });
    }
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Récupérer un article par ID avec tous les champs
app.get('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          a.IdArticle, a.IdFamille, a.CodeArticle, a.Designation, 
          a.Description, a.Unite, a.Actif, a.DateCreation, a.DateModification,
          a.Diametre, a.Matiere, a.Classe, a.Pression, 
          a.Longueur, a.Largeur, a.Epaisseur, a.Couleur, a.Caracteristiques,
          f.LibelleFamille,
          pf.PrixHT AS PrixFournitureHT,
          pf.TauxTVA AS TauxTVAFourniture,
          pf.DateDebutApplication AS DateDebutFourniture,
          pp.PrixHT AS PrixPoseHT,
          pp.TauxTVA AS TauxTVAPose,
          pp.DateDebutApplication AS DateDebutPose
        FROM Article a
        LEFT JOIN ArticleFamille f ON a.IdFamille = f.IdFamille
        LEFT JOIN (
          SELECT 
            IdArticle, 
            PrixHT, 
            TauxTVA, 
            DateDebutApplication,
            ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
          FROM ArticlePrixHistorique 
          WHERE TypePrix = 'FOURNITURE' 
            AND EstActif = 1
            AND DateDebutApplication <= GETDATE()
            AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
            AND IdArticle = @id
        ) pf ON a.IdArticle = pf.IdArticle AND pf.rn = 1
        LEFT JOIN (
          SELECT 
            IdArticle, 
            PrixHT, 
            TauxTVA, 
            DateDebutApplication,
            ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
          FROM ArticlePrixHistorique 
          WHERE TypePrix = 'POSE' 
            AND EstActif = 1
            AND DateDebutApplication <= GETDATE()
            AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
            AND IdArticle = @id
        ) pp ON a.IdArticle = pp.IdArticle AND pp.rn = 1
        WHERE a.IdArticle = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Article introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving article
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================================
// DEVIS TYPES (DOIT ÊTRE AVANT /api/devis/:id pour éviter les conflits)
// ============================================================================

// Récupérer tous les types de devis - FONCTIONNALITÉ SUPPRIMÉE - Table TypeDevis n'existe plus dans la base de données
app.get('/api/devis/types', async (req, res) => {
  // Retourne un tableau vide pour éviter les erreurs dans le frontend
  res.json([]);
});

// Récupérer un devis par ID
app.get('/api/devis/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          d.IdDevis,
          d.NumeroDevis,
          d.IdDemande,
          d.EstQuantitatifEstimatif,
          d.MontantTotalHT,
          d.MontantTotalTVA,
          d.MontantTotalTTC,
          d.Commentaire,
          d.DateCreation,
          dem.NumeroDemande,
          c.Nom + ' ' + ISNULL(c.Prenom, '') as Client,
          c.AdresseResidence,
          c.CommuneResidence,
          c.CodePostalResidence,
          c.TelephonePrincipal,
          u.Nom + ' ' + ISNULL(u.Prenom, '') as UtilisateurCreation
        FROM Devis d
        INNER JOIN DemandeTravaux dem ON d.IdDemande = dem.IdDemande
        INNER JOIN Client c ON dem.IdClient = c.IdClient
        INNER JOIN Utilisateur u ON d.IdUtilisateurCreation = u.IdUtilisateur
        WHERE d.IdDevis = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Devis introuvable' });
    }
    
    const devis = result.recordset[0];
    
    // Récupérer les articles du devis
    const articlesResult = await pool.request()
      .input('idDevis', sql.Int, id)
      .query(`
        SELECT 
          IdDevisArticle,
          IdArticle,
          Designation,
          Unite,
          Quantite,
          PrixUnitaireHT,
          TauxTVAApplique,
          MontantHT,
          MontantTVA,
          MontantTTC,
          Remarque
        FROM DevisArticle
        WHERE IdDevis = @idDevis
        ORDER BY IdDevisArticle
      `);
    
    devis.articles = articlesResult.recordset;
    
    res.json(devis);
  } catch (error) {
    // Error retrieving devis
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du devis' });
  }
});

// ============================================================================
// DEVIS
// ============================================================================

// Endpoint to get the next devis number for a given demande
app.get('/api/devis/next-number/:idDemande', verifyToken, async (req, res) => {
  try {
    const idDemande = parseInt(req.params.idDemande);
    if (!idDemande) {
      return res.status(400).json({ error: 'IdDemande invalide' });
    }

    const request = pool.request();
    
    // Get demande information including agence
    const demandeResult = await request
      .input('idDemande', sql.Int, idDemande)
      .query(`
        SELECT d.IdAgence, a.CodeAgence
        FROM DemandeTravaux d
        INNER JOIN AgenceCommerciale a ON d.IdAgence = a.IdAgence
        WHERE d.IdDemande = @idDemande AND d.Actif = 1
      `);
    
    if (demandeResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable ou inactive' });
    }
    
    const demande = demandeResult.recordset[0];
    const agencePrefix = demande.CodeAgence;
    const currentYear = new Date().getFullYear();
    
    // Find the next sequential number for this year and agence
    const maxNumberResult = await request
      .input('agencePrefix', sql.NVarChar, agencePrefix)
      .input('currentYear', sql.Int, currentYear)
      .query(`
        SELECT ISNULL(MAX(
          CASE 
            WHEN NumeroDevis LIKE 'Dev-%/' + @agencePrefix + '/' + CAST(@currentYear AS NVARCHAR(4))
              AND LEN(NumeroDevis) >= 5
              AND CHARINDEX('/', NumeroDevis) > 4
              AND SUBSTRING(NumeroDevis, 1, 4) = 'Dev-'
              AND ISNUMERIC(SUBSTRING(NumeroDevis, 5, CHARINDEX('/', NumeroDevis) - 5)) = 1
            THEN CAST(SUBSTRING(NumeroDevis, 5, CHARINDEX('/', NumeroDevis) - 5) AS INT)
            ELSE 0
          END
        ), 0) as MaxNum
        FROM Devis
        WHERE NumeroDevis LIKE 'Dev-%/' + @agencePrefix + '/' + CAST(@currentYear AS NVARCHAR(4))
      `);
    
    const nextNumber = maxNumberResult.recordset[0].MaxNum + 1;
    const formattedNumber = String(nextNumber).padStart(4, '0');
    
    // Format: Dev-XXXX/prefix/yyyy (as requested by the user)
    const nextDevisNumber = `Dev-${formattedNumber}/${agencePrefix}/${currentYear}`;
    
    res.json({ nextDevisNumber });
  } catch (error) {
    // Error generating next devis number
    res.status(500).json({ error: 'Erreur serveur lors de la génération du numéro de devis' });
  }
});

// Créer un nouveau devis
app.post('/api/devis', verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const request = new sql.Request(transaction);
    
    const { idDemande, idTypeDevis, commentaire, articles, newArticles } = req.body;
    
    // Validation
    if (!idDemande) {
      await transaction.rollback();
      return res.status(400).json({ error: 'idDemande est requis' });
    }
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'articles est requis et doit être un tableau non vide' });
    }
    
    // Vérifier que la demande existe et est active
    const demandeResult = await request
      .input('idDemande', sql.Int, idDemande)
      .query(`
        SELECT IdDemande, NumeroDemande, IdAgence
        FROM DemandeTravaux
        WHERE IdDemande = @idDemande AND Actif = 1
      `);
    
    if (demandeResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Demande introuvable ou inactive' });
    }
    
    const demande = demandeResult.recordset[0];
    
    // idTypeDevis n'est plus utilisé car la table TypeDevis n'existe plus
    
    // Générer le numéro de devis
    const currentYear = new Date().getFullYear();
    const agenceCode = await request
      .input('idAgence', sql.Int, demande.IdAgence)
      .query(`
        SELECT CodeAgence
        FROM AgenceCommerciale
        WHERE IdAgence = @idAgence
      `);
    
    if (agenceCode.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Agence commerciale introuvable' });
    }
    
    const agencePrefix = agenceCode.recordset[0].CodeAgence;
    
    // Obtenir le prochain numéro de devis
    const maxNumberResult = await request
      .input('agencePrefix', sql.NVarChar, agencePrefix)
      .input('currentYear', sql.Int, currentYear)
      .query(`
        SELECT ISNULL(MAX(
          CASE 
            WHEN NumeroDevis LIKE 'Dev-%/' + @agencePrefix + '/' + CAST(@currentYear AS NVARCHAR(4))
              AND LEN(NumeroDevis) >= 5
              AND CHARINDEX('/', NumeroDevis) > 4
              AND SUBSTRING(NumeroDevis, 1, 4) = 'Dev-'
              AND ISNUMERIC(SUBSTRING(NumeroDevis, 5, CHARINDEX('/', NumeroDevis) - 5)) = 1
            THEN CAST(SUBSTRING(NumeroDevis, 5, CHARINDEX('/', NumeroDevis) - 5) AS INT)
            ELSE 0
          END
        ), 0) as MaxNum
        FROM Devis
        WHERE NumeroDevis LIKE 'Dev-%/' + @agencePrefix + '/' + CAST(@currentYear AS NVARCHAR(4))
      `);
    
    const nextNumber = maxNumberResult.recordset[0].MaxNum + 1;
    const formattedNumber = String(nextNumber).padStart(4, '0');
    const numeroDevis = `Dev-${formattedNumber}/${agencePrefix}/${currentYear}`;
    
    // Insérer le devis
    const insertDevisResult = await request
      .input('NumeroDevis', sql.NVarChar(50), numeroDevis)
      .input('IdDemande', sql.Int, idDemande)
      .input('IdUtilisateurCreation', sql.Int, req.user?.id)
      .input('Commentaire', sql.NVarChar(sql.MAX), commentaire || null)
      .input('EstQuantitatifEstimatif', sql.Bit, 0) // Valeur par défaut
      .query(`
        INSERT INTO Devis (
          NumeroDevis, IdDemande, EstQuantitatifEstimatif, IdUtilisateurCreation, 
          MontantTotalHT, MontantTotalTVA, MontantTotalTTC, Commentaire
        )
        OUTPUT INSERTED.IdDevis
        VALUES (
          @NumeroDevis, @IdDemande, @EstQuantitatifEstimatif, @IdUtilisateurCreation,
          0, 0, 0, @Commentaire
        )
      `);
    
    const idDevis = insertDevisResult.recordset[0].IdDevis;
    
    // Traiter les nouveaux articles s'ils existent
    const createdArticlesMap = {};
    if (newArticles && Array.isArray(newArticles) && newArticles.length > 0) {
      for (const newArticle of newArticles) {
        // Créer la famille d'article si elle n'existe pas
        let idFamille = null;
        const familleResult = await request
          .input('libelleFamille', sql.NVarChar(100), 'DIVERS')
          .query(`
            SELECT IdFamille
            FROM ArticleFamille
            WHERE LibelleFamille = @libelleFamille AND Actif = 1
          `);
        
        if (familleResult.recordset.length > 0) {
          idFamille = familleResult.recordset[0].IdFamille;
        } else {
          // Créer la famille DIVERS si elle n'existe pas
          const insertFamilleResult = await request
            .input('libelleFamille', sql.NVarChar(100), 'DIVERS')
            .query(`
              INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif, DateCreation)
              OUTPUT INSERTED.IdFamille
              VALUES ('FAM-DIVERS', @libelleFamille, 'Famille par défaut pour les articles créés dans les devis', 1, GETDATE())
            `);
          idFamille = insertFamilleResult.recordset[0].IdFamille;
        }
        
        // Générer un code article unique
        const maxArticleResult = await request.query(`
          SELECT ISNULL(MAX(CAST(SUBSTRING(CodeArticle, 5, LEN(CodeArticle)) AS INT)), 0) as MaxNum
          FROM Article
          WHERE CodeArticle LIKE 'ART-%' AND ISNUMERIC(SUBSTRING(CodeArticle, 5, LEN(CodeArticle))) = 1
        `);
        const nextArticleNumber = (maxArticleResult.recordset[0].MaxNum || 0) + 1;
        const codeArticle = `ART-${String(nextArticleNumber).padStart(7, '0')}`;
        
        // Créer l'article
        const insertArticleResult = await request
          .input('idFamille', sql.Int, idFamille)
          .input('codeArticle', sql.NVarChar(50), codeArticle)
          .input('designation', sql.NVarChar(200), newArticle.designation)
          .input('unite', sql.NVarChar(50), newArticle.unite || 'U')
          .query(`
            INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif, DateCreation)
            OUTPUT INSERTED.IdArticle
            VALUES (@idFamille, @codeArticle, @designation, @unite, 1, GETDATE())
          `);
        
        const newArticleId = insertArticleResult.recordset[0].IdArticle;
        createdArticlesMap[newArticle.designation] = newArticleId;
        
        // Créer l'historique de prix pour l'article
        if (newArticle.prixUnitaireHT !== undefined && newArticle.prixUnitaireHT !== null) {
          const prixHTValue = parseFloat(newArticle.prixUnitaireHT);
          const tauxTVAValue = newArticle.tauxTVAApplique !== undefined ? parseFloat(newArticle.tauxTVAApplique) : 0;
          
          if (!isNaN(prixHTValue) && prixHTValue >= 0) {
            // Déterminer le type de prix à utiliser
            const typePrix = newArticle.typePrix || 'FOURNITURE';
            
            await request
              .input('idArticle', sql.Int, newArticleId)
              .input('typePrix', sql.NVarChar(20), typePrix)
              .input('prixHT', sql.Decimal(18, 2), prixHTValue)
              .input('tauxTVA', sql.Decimal(5, 2), tauxTVAValue)
              .input('idUser', sql.Int, req.user?.id)
              .query(`
                INSERT INTO ArticlePrixHistorique (
                  IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, 
                  EstActif, DateCreation, IdUtilisateurCreation
                )
                VALUES (
                  @idArticle, @typePrix, @prixHT, @tauxTVA, GETDATE(),
                  1, GETDATE(), @idUser
                )
              `);
              
            // Si le type est BOTH, créer aussi l'autre type de prix
            if (typePrix === 'BOTH') {
              // Créer le prix fourniture
              await request
                .input('idArticle', sql.Int, newArticleId)
                .input('typePrix', sql.NVarChar(20), 'FOURNITURE')
                .input('prixHT', sql.Decimal(18, 2), prixHTValue)
                .input('tauxTVA', sql.Decimal(5, 2), tauxTVAValue)
                .input('idUser', sql.Int, req.user?.id)
                .query(`
                  INSERT INTO ArticlePrixHistorique (
                    IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, 
                    EstActif, DateCreation, IdUtilisateurCreation
                  )
                  VALUES (
                    @idArticle, @typePrix, @prixHT, @tauxTVA, GETDATE(),
                    1, GETDATE(), @idUser
                  )
                `);
              
              // Créer le prix pose
              await request
                .input('idArticle', sql.Int, newArticleId)
                .input('typePrix', sql.NVarChar(20), 'POSE')
                .input('prixHT', sql.Decimal(18, 2), prixHTValue)
                .input('tauxTVA', sql.Decimal(5, 2), tauxTVAValue)
                .input('idUser', sql.Int, req.user?.id)
                .query(`
                  INSERT INTO ArticlePrixHistorique (
                    IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, 
                    EstActif, DateCreation, IdUtilisateurCreation
                  )
                  VALUES (
                    @idArticle, @typePrix, @prixHT, @tauxTVA, GETDATE(),
                    1, GETDATE(), @idUser
                  )
                `);
            }
          }
        }
      }
    }
    
    // Insérer les articles du devis
    let montantTotalHT = 0;
    let montantTotalTVA = 0;
    
    // Combiner les articles existants et les nouveaux articles
    const allArticles = [...articles];
    
    for (const article of allArticles) {
      const {
        idArticle,
        quantite,
        prixUnitaireHT,
        tauxTVAApplique,
        typePrix,
        designation // Pour les nouveaux articles
      } = article;
      
      // Pour les nouveaux articles, utiliser l'ID créé
      let articleId = idArticle;
      if (!articleId && designation && createdArticlesMap[designation]) {
        articleId = createdArticlesMap[designation];
      }
      
      // Validation
      if (!articleId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'idArticle est requis pour chaque article' });
      }
      
      if (!quantite || quantite <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'quantite doit être un nombre positif' });
      }
      
      if (prixUnitaireHT === undefined || prixUnitaireHT === null || prixUnitaireHT < 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'prixUnitaireHT doit être un nombre positif' });
      }
      
      if (tauxTVAApplique === undefined || tauxTVAApplique === null || tauxTVAApplique < 0 || tauxTVAApplique > 100) {
        await transaction.rollback();
        return res.status(400).json({ error: 'tauxTVAApplique doit être un nombre entre 0 et 100' });
      }
      
      // Vérifier que l'article existe et est actif
      const articleResult = await request
        .input('idArticle', sql.Int, articleId)
        .query(`
          SELECT IdArticle, CodeArticle, Designation, Unite
          FROM Article
          WHERE IdArticle = @idArticle AND Actif = 1
        `);
      
      if (articleResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: `Article avec id ${articleId} introuvable ou inactif` });
      }
      
      const articleData = articleResult.recordset[0];
      
      // Calculer les montants
      const quantiteValue = parseFloat(quantite);
      const prixUnitaireValue = parseFloat(prixUnitaireHT);
      const tauxTVAValue = parseFloat(tauxTVAApplique);
      
      const montantHT = quantiteValue * prixUnitaireValue;
      const montantTVA = montantHT * (tauxTVAValue / 100);
      const montantTTC = montantHT + montantTVA;
      
      montantTotalHT += montantHT;
      montantTotalTVA += montantTVA;
      
      // Insérer l'article dans DevisArticle
      await request
        .input('IdDevis', sql.Int, idDevis)
        .input('IdArticle', sql.Int, articleId)
        .input('Designation', sql.NVarChar(200), articleData.Designation)
        .input('Unite', sql.NVarChar(50), articleData.Unite)
        .input('Quantite', sql.Decimal(18, 3), quantiteValue)
        .input('PrixUnitaireHT', sql.Decimal(18, 2), prixUnitaireValue)
        .input('TauxTVAApplique', sql.Decimal(5, 2), tauxTVAValue)
        .input('Remarque', sql.NVarChar(500), typePrix || null)
        .query(`
          INSERT INTO DevisArticle (
            IdDevis, IdArticle, Designation, Unite, Quantite, 
            PrixUnitaireHT, TauxTVAApplique, Remarque
          )
          VALUES (
            @IdDevis, @IdArticle, @Designation, @Unite, @Quantite,
            @PrixUnitaireHT, @TauxTVAApplique, @Remarque
          )
        `);
    }
    
    // Mettre à jour les montants totaux du devis
    const montantTotalTTC = montantTotalHT + montantTotalTVA;
    
    await request
      .input('IdDevis', sql.Int, idDevis)
      .input('MontantTotalHT', sql.Decimal(18, 2), montantTotalHT)
      .input('MontantTotalTVA', sql.Decimal(18, 2), montantTotalTVA)
      .input('MontantTotalTTC', sql.Decimal(18, 2), montantTotalTTC)
      .query(`
        UPDATE Devis
        SET 
          MontantTotalHT = @MontantTotalHT,
          MontantTotalTVA = @MontantTotalTVA,
          MontantTotalTTC = @MontantTotalTTC
        WHERE IdDevis = @IdDevis
      `);
    
    await transaction.commit();
    
    // Retourner le devis créé
    const devisResult = await pool.request()
      .input('idDevis', sql.Int, idDevis)
      .query(`
        SELECT 
          d.IdDevis,
          d.NumeroDevis,
          d.IdDemande,
          d.EstQuantitatifEstimatif,
          d.MontantTotalHT,
          d.MontantTotalTVA,
          d.MontantTotalTTC,
          d.Commentaire,
          d.DateCreation,
          dem.NumeroDemande
        FROM Devis d
        INNER JOIN DemandeTravaux dem ON d.IdDemande = dem.IdDemande
        WHERE d.IdDevis = @idDevis
      `);
    
    res.status(201).json(devisResult.recordset[0]);
  } catch (error) {
    // Error creating devis
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Error during rollback
    }
    res.status(500).json({ error: error.message || 'Erreur serveur lors de la création du devis' });
  }
});
// Récupérer tous les devis
app.get('/api/devis', verifyToken, async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        d.IdDevis,
        d.NumeroDevis,
        d.IdDemande,
        d.EstQuantitatifEstimatif,
        d.MontantTotalHT,
        d.MontantTotalTVA,
        d.MontantTotalTTC,
        d.Commentaire,
        d.DateCreation,
        dem.NumeroDemande,
        c.Nom + ' ' + ISNULL(c.Prenom, '') as Client
      FROM Devis d
      INNER JOIN DemandeTravaux dem ON d.IdDemande = dem.IdDemande
      INNER JOIN Client c ON dem.IdClient = c.IdClient
      ORDER BY d.DateCreation DESC
    `);
    
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving devis list
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des devis' });
  }
});

// Liste des articles
app.get('/api/articles', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        a.IdArticle,
        a.CodeArticle,
        a.Designation,
        a.Description,
        a.Unite,
        a.Actif,
        a.DateCreation,
        a.Diametre,
        a.Matiere,
        a.Classe,
        a.Pression,
        a.Longueur,
        a.Largeur,
        a.Epaisseur,
        a.Couleur,
        a.Caracteristiques,
        a.IdFamille,
        f.CodeFamille,
        f.LibelleFamille,
        pf.PrixHT AS PrixFournitureHT,
        pf.TauxTVA AS TauxTVAFourniture,
        pf.DateDebutApplication AS DateDebutFourniture,
        pp.PrixHT AS PrixPoseHT,
        pp.TauxTVA AS TauxTVAPose,
        pp.DateDebutApplication AS DateDebutPose,
        ps.PrixHT AS PrixServiceHT,
        ps.TauxTVA AS TauxTVAService,
        ps.DateDebutApplication AS DateDebutService,
        pr.PrixHT AS PrixPrestationHT,
        pr.TauxTVA AS TauxTVAPrestation,
        pr.DateDebutApplication AS DateDebutPrestation,
        pc.PrixHT AS PrixCautionnementHT,
        pc.TauxTVA AS TauxTVACautionnement,
        pc.DateDebutApplication AS DateDebutCautionnement,
        COALESCE(pf.TauxTVA, pp.TauxTVA, ps.TauxTVA, pr.TauxTVA, pc.TauxTVA) AS TauxTVA
      FROM Article a
      LEFT JOIN ArticleFamille f ON a.IdFamille = f.IdFamille
      LEFT JOIN (
        SELECT 
          IdArticle, 
          PrixHT, 
          TauxTVA, 
          DateDebutApplication,
          ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
        FROM ArticlePrixHistorique 
        WHERE TypePrix = 'FOURNITURE' 
          AND EstActif = 1
          AND DateDebutApplication <= GETDATE()
          AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
      ) pf ON a.IdArticle = pf.IdArticle AND pf.rn = 1
      LEFT JOIN (
        SELECT 
          IdArticle, 
          PrixHT, 
          TauxTVA, 
          DateDebutApplication,
          ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
        FROM ArticlePrixHistorique 
        WHERE TypePrix = 'POSE' 
          AND EstActif = 1
          AND DateDebutApplication <= GETDATE()
          AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
      ) pp ON a.IdArticle = pp.IdArticle AND pp.rn = 1
      LEFT JOIN (
        SELECT 
          IdArticle, 
          PrixHT, 
          TauxTVA, 
          DateDebutApplication,
          ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
        FROM ArticlePrixHistorique 
        WHERE TypePrix = 'SERVICE' 
          AND EstActif = 1
          AND DateDebutApplication <= GETDATE()
          AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
      ) ps ON a.IdArticle = ps.IdArticle AND ps.rn = 1
      LEFT JOIN (
        SELECT 
          IdArticle, 
          PrixHT, 
          TauxTVA, 
          DateDebutApplication,
          ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
        FROM ArticlePrixHistorique 
        WHERE TypePrix = 'PRESTATION' 
          AND EstActif = 1
          AND DateDebutApplication <= GETDATE()
          AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
      ) pr ON a.IdArticle = pr.IdArticle AND pr.rn = 1
      LEFT JOIN (
        SELECT 
          IdArticle, 
          PrixHT, 
          TauxTVA, 
          DateDebutApplication,
          ROW_NUMBER() OVER (PARTITION BY IdArticle ORDER BY DateDebutApplication DESC) as rn
        FROM ArticlePrixHistorique 
        WHERE TypePrix = 'CAUTIONNEMENT' 
          AND EstActif = 1
          AND DateDebutApplication <= GETDATE()
          AND (DateFinApplication IS NULL OR DateFinApplication >= GETDATE())
      ) pc ON a.IdArticle = pc.IdArticle AND pc.rn = 1
      WHERE a.Actif = 1
      ORDER BY f.LibelleFamille, a.Designation
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving articles
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get all article families
app.get('/api/familles', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        IdFamille,
        CodeFamille,
        LibelleFamille,
        Description,
        Actif,
        DateCreation
      FROM ArticleFamille
      WHERE Actif = 1
      ORDER BY LibelleFamille
    `);
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving families
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'un article (CodeArticle auto ART-XXX)
app.post('/api/articles', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent créer des articles.' });
    }

    const {
      IdFamille,
      Designation,
      Description,
      Unite,
      Diametre,
      Matiere,
      Classe,
      Pression,
      Longueur,
      Largeur,
      Epaisseur,
      Couleur,
      Caracteristiques
    } = req.body;

    if (!IdFamille || !Designation || !Unite) {
      return res.status(400).json({ error: 'IdFamille, Designation et Unite sont requis' });
    }

    // Validation des longueurs de champs
    const lengthConstraints = [
      { field: 'Designation', value: Designation, max: 200, label: 'Désignation' },
      { field: 'Description', value: Description, max: 500, label: 'Description' },
      { field: 'Unite', value: Unite, max: 50, label: 'Unité' },
      { field: 'Diametre', value: Diametre, max: 20, label: 'Diamètre' },
      { field: 'Matiere', value: Matiere, max: 50, label: 'Matière' },
      { field: 'Classe', value: Classe, max: 20, label: 'Classe' },
      { field: 'Pression', value: Pression, max: 20, label: 'Pression' },
      { field: 'Couleur', value: Couleur, max: 30, label: 'Couleur' },
      { field: 'Caracteristiques', value: Caracteristiques, max: 500, label: 'Caractéristiques' },
    ];

    for (const { field, value, max, label } of lengthConstraints) {
      if (value && typeof value === 'string' && value.trim().length > max) {
        return res.status(400).json({ error: `Le champ ${label} ne doit pas dépasser ${max} caractères.` });
      }
    }

    // Générer CodeArticle format ART-XXXXXXX (7 chiffres)
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeArticle, 5, LEN(CodeArticle)) AS INT)), 0) as MaxNum
      FROM Article
      WHERE CodeArticle LIKE 'ART-%' AND ISNUMERIC(SUBSTRING(CodeArticle, 5, LEN(CodeArticle))) = 1
    `);
    const nextNumber = (maxResult.recordset[0].MaxNum || 0) + 1;
    const CodeArticle = `ART-${String(nextNumber).padStart(7, '0')}`;

    const insert = await pool.request()
      .input('IdFamille', sql.Int, IdFamille)
      .input('CodeArticle', sql.NVarChar(50), CodeArticle)
      .input('Designation', sql.NVarChar(200), Designation.trim())
      .input('Description', sql.NVarChar(500), Description?.trim() || null)
      .input('Unite', sql.NVarChar(50), Unite.trim())
      .input('Diametre', sql.NVarChar(20), Diametre?.trim() || null)
      .input('Matiere', sql.NVarChar(50), Matiere?.trim() || null)
      .input('Classe', sql.NVarChar(20), Classe?.trim() || null)
      .input('Pression', sql.NVarChar(20), Pression?.trim() || null)
      .input('Longueur', sql.Decimal(10, 2), Longueur || null)
      .input('Largeur', sql.Decimal(10, 2), Largeur || null)
      .input('Epaisseur', sql.Decimal(10, 2), Epaisseur || null)
      .input('Couleur', sql.NVarChar(30), Couleur?.trim() || null)
      .input('Caracteristiques', sql.NVarChar(500), Caracteristiques?.trim() || null)
      .query(`
        INSERT INTO Article (IdFamille, CodeArticle, Designation, Description, Unite, Actif, DateCreation,
          Diametre, Matiere, Classe, Pression, Longueur, Largeur, Epaisseur, Couleur, Caracteristiques)
        OUTPUT INSERTED.*
        VALUES (@IdFamille, @CodeArticle, @Designation, @Description, @Unite, 1, GETDATE(),
          @Diametre, @Matiere, @Classe, @Pression, @Longueur, @Largeur, @Epaisseur, @Couleur, @Caracteristiques)
      `);

    res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating article
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: 'Un article avec ce code existe déjà.' });
    }
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================================
// CONFIGURATION GLOBALE
// ============================================================================

// Get all global configurations

// Create article with price (simplified endpoint for immediate article creation in devis form)
app.post('/api/articles/with-price', verifyToken, async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const request = new sql.Request(transaction);
    
    const {
      designation,
      unite,
      prixUnitaireHT,
      tauxTVAApplique,
      typePrix
    } = req.body;
    
    // Validation
    if (!designation || !unite) {
      await transaction.rollback();
      return res.status(400).json({ error: 'designation et unite sont requis' });
    }
    
    if (prixUnitaireHT === undefined || prixUnitaireHT === null || isNaN(parseFloat(prixUnitaireHT)) || parseFloat(prixUnitaireHT) < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'prixUnitaireHT doit être un nombre positif' });
    }
    
    if (tauxTVAApplique === undefined || tauxTVAApplique === null || isNaN(parseFloat(tauxTVAApplique)) || parseFloat(tauxTVAApplique) < 0 || parseFloat(tauxTVAApplique) > 100) {
      await transaction.rollback();
      return res.status(400).json({ error: 'tauxTVAApplique doit être un nombre entre 0 et 100' });
    }
    
    // Use default family "DIVERS" if it exists, otherwise create it
    let idFamille = null;
    const familleResult = await request
      .input('libelleFamille', sql.NVarChar, 'DIVERS')
      .query(`
        SELECT IdFamille
        FROM ArticleFamille
        WHERE LibelleFamille = @libelleFamille AND Actif = 1
      `);
    
    if (familleResult.recordset.length > 0) {
      idFamille = familleResult.recordset[0].IdFamille;
    } else {
      // Create the DIVERS family if it doesn't exist
      const insertFamilleResult = await request
        .input('libelleFamille', sql.NVarChar, 'DIVERS')
        .query(`
          INSERT INTO ArticleFamille (CodeFamille, LibelleFamille, Description, Actif, DateCreation)
          OUTPUT INSERTED.IdFamille
          VALUES ('FAM-DIVERS', @libelleFamille, 'Famille par défaut pour les articles créés dans les devis', 1, GETDATE())
        `);
      idFamille = insertFamilleResult.recordset[0].IdFamille;
    }
    
    // Generate unique article code
    const maxArticleResult = await request.query(`
      SELECT ISNULL(MAX(CAST(SUBSTRING(CodeArticle, 5, LEN(CodeArticle)) AS INT)), 0) as MaxNum
      FROM Article
      WHERE CodeArticle LIKE 'ART-%' AND ISNUMERIC(SUBSTRING(CodeArticle, 5, LEN(CodeArticle))) = 1
    `);
    const nextArticleNumber = (maxArticleResult.recordset[0].MaxNum || 0) + 1;
    const codeArticle = `ART-${String(nextArticleNumber).padStart(7, '0')}`;
    
    // Create the article
    const insertArticleResult = await request
      .input('idFamille', sql.Int, idFamille)
      .input('codeArticle', sql.NVarChar, codeArticle)
      .input('designation', sql.NVarChar, designation)
      .input('unite', sql.NVarChar, unite)
      .query(`
        INSERT INTO Article (IdFamille, CodeArticle, Designation, Unite, Actif, DateCreation)
        OUTPUT INSERTED.*
        VALUES (@idFamille, @codeArticle, @designation, @unite, 1, GETDATE())
      `);
    
    const createdArticle = insertArticleResult.recordset[0];
    
    // Create price history for the article
    const prixHTValue = parseFloat(prixUnitaireHT);
    const tauxTVAValue = parseFloat(tauxTVAApplique);
    
    await request
      .input('idArticle', sql.Int, createdArticle.IdArticle)
      .input('typePrix', sql.NVarChar, typePrix || 'FOURNITURE')
      .input('prixHT', sql.Decimal(18, 2), prixHTValue)
      .input('tauxTVA', sql.Decimal(5, 2), tauxTVAValue)
      .input('idUser', sql.Int, req.user?.id)
      .query(`
        INSERT INTO ArticlePrixHistorique (
          IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, 
          EstActif, DateCreation, IdUtilisateurCreation
        )
        VALUES (
          @idArticle, @typePrix, @prixHT, @tauxTVA, GETDATE(),
          1, GETDATE(), @idUser
        )
      `);
    
    await transaction.commit();
    
    res.status(201).json(createdArticle);
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Error during rollback
    }
    res.status(500).json({ error: error.message || 'Erreur serveur lors de la création de l\'article' });
  }
});


app.get('/api/configurations', verifyToken, async (req, res) => {
  try {
    // Only admin users can access global configurations
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin') || actorRoleLower.includes('administrateur');
    
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent accéder aux configurations globales.' });
    }

    const result = await pool.request().query(`
      SELECT 
        IdConfig,
        Cle,
        Valeur,
        Description,
        TypeDonnee,
        DateModification,
        IdUtilisateurModification
      FROM ConfigurationGlobale
      ORDER BY Cle
    `);
    
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving configurations
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get a specific global configuration by key
// Get a specific global configuration (Admin only)
app.get('/api/configurations/:key', verifyToken, async (req, res) => {
  try {
    // Only admin users can access global configurations
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin') || actorRoleLower.includes('administrateur');
    
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent accéder aux configurations globales.' });
    }

    const { key } = req.params;
    
    const result = await pool.request()
      .input('key', sql.NVarChar, key)
      .query(`
        SELECT 
          IdConfig,
          Cle,
          Valeur,
          Description,
          TypeDonnee,
          DateModification,
          IdUtilisateurModification
        FROM ConfigurationGlobale
        WHERE Cle = @key
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Configuration introuvable' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving configuration
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get TVA default rate (public for all authenticated users)
app.get('/api/configurations/public/tva', verifyToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('key', sql.NVarChar, 'TAUX_TVA_DEFAUT')
      .query(`
        SELECT 
          Cle,
          Valeur
        FROM ConfigurationGlobale
        WHERE Cle = @key
      `);
    
    if (result.recordset.length === 0) {
      // Return default TVA if not found in database
      return res.json({ Cle: 'TAUX_TVA_DEFAUT', Valeur: '19.00' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    // Error retrieving TVA, return default
    res.json({ Cle: 'TAUX_TVA_DEFAUT', Valeur: '19.00' });
  }
});

// Update a global configuration
app.put('/api/configurations/:key', verifyToken, async (req, res) => {
  try {
    // Only admin users can update global configurations
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin') || actorRoleLower.includes('administrateur');
    
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier les configurations globales.' });
    }

    const { key } = req.params;
    const { Valeur } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (Valeur === undefined) {
      return res.status(400).json({ error: 'La valeur est requise' });
    }

    const update = await pool.request()
      .input('key', sql.NVarChar, key)
      .input('valeur', sql.NVarChar, Valeur)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE ConfigurationGlobale
        SET 
          Valeur = @valeur,
          DateModification = GETDATE(),
          IdUtilisateurModification = @userId
        OUTPUT INSERTED.*
        WHERE Cle = @key
      `);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Configuration introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    // Error updating configuration
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  });
};








// ============================================================================
// ARTICLE PRIX HISTORIQUE
// ============================================================================

// Récupérer l'historique des prix pour un article
app.get('/api/articles/:id/prix-historique', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          IdPrixHistorique,
          IdArticle,
          TypePrix,
          PrixHT,
          TauxTVA,
          DateDebutApplication,
          DateFinApplication,
          EstActif,
          DateCreation,
          IdUtilisateurCreation
        FROM ArticlePrixHistorique
        WHERE IdArticle = @id
        ORDER BY DateDebutApplication DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    // Error retrieving price history
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouvel historique de prix pour un article
app.post('/api/articles/:id/prix-historique', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent gérer les prix des articles.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      TypePrix,
      PrixHT,
      TauxTVA,
      DateDebutApplication,
      DateFinApplication
    } = req.body;

    // Vérifier que TypePrix est fourni et valide
    if (!TypePrix) {
      return res.status(400).json({ error: 'TypePrix est requis (FOURNITURE ou POSE)' });
    }

    if (TypePrix !== 'FOURNITURE' && TypePrix !== 'POSE') {
      return res.status(400).json({ error: 'TypePrix doit être "FOURNITURE" ou "POSE"' });
    }

    if (PrixHT === undefined || PrixHT === null) {
      return res.status(400).json({ error: 'PrixHT est requis' });
    }

    if (!DateDebutApplication) {
      return res.status(400).json({ error: 'DateDebutApplication est requise' });
    }

    // Vérifier que l'article existe
    const articleResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdArticle
        FROM Article
        WHERE IdArticle = @id
      `);

    if (articleResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    // Validation des valeurs
    const prixHTValue = parseFloat(PrixHT);
    const tauxTVAValue = TauxTVA !== undefined && TauxTVA !== null && TauxTVA !== '' 
      ? parseFloat(TauxTVA) 
      : 0;
    
    if (isNaN(prixHTValue) || prixHTValue < 0) {
      return res.status(400).json({ error: 'PrixHT doit être un nombre positif' });
    }
    
    if (isNaN(tauxTVAValue) || tauxTVAValue < 0 || tauxTVAValue > 100) {
      return res.status(400).json({ error: 'TauxTVA doit être un nombre entre 0 et 100' });
    }

    // Vérifier les dates
    const dateDebut = new Date(DateDebutApplication);
    const dateFin = DateFinApplication ? new Date(DateFinApplication) : null;
    
    if (isNaN(dateDebut.getTime())) {
      return res.status(400).json({ error: 'DateDebutApplication invalide' });
    }
    
    if (dateFin && isNaN(dateFin.getTime())) {
      return res.status(400).json({ error: 'DateFinApplication invalide' });
    }
    
    if (dateFin && dateFin <= dateDebut) {
      return res.status(400).json({ error: 'DateFinApplication doit être postérieure à DateDebutApplication' });
    }

    const insert = await pool.request()
      .input('IdArticle', sql.Int, id)
      .input('TypePrix', sql.NVarChar(20), TypePrix)
      .input('PrixHT', sql.Decimal(18, 2), prixHTValue)
      .input('TauxTVA', sql.Decimal(5, 2), tauxTVAValue)
      .input('DateDebutApplication', sql.Date, dateDebut)
      .input('DateFinApplication', sql.Date, dateFin)
      .input('IdUtilisateurCreation', sql.Int, req.user?.id)
      .query(`
        INSERT INTO ArticlePrixHistorique (
          IdArticle, TypePrix, PrixHT, TauxTVA, DateDebutApplication, DateFinApplication,
          EstActif, DateCreation, IdUtilisateurCreation
        )
        OUTPUT INSERTED.*
        VALUES (
          @IdArticle, @TypePrix, @PrixHT, @TauxTVA, @DateDebutApplication, @DateFinApplication,
          1, GETDATE(), @IdUtilisateurCreation
        )
      `);

    res.status(201).json(insert.recordset[0]);
  } catch (error) {
    // Error creating price history
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Mettre à jour un historique de prix
app.put('/api/articles/prix-historique/:id', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent gérer les prix des articles.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    const {
      TypePrix,
      PrixHT,
      TauxTVA,
      DateDebutApplication,
      DateFinApplication,
      EstActif
    } = req.body;

    // Validation des valeurs si fournies
    if (TypePrix !== undefined && TypePrix !== null) {
      if (TypePrix !== 'FOURNITURE' && TypePrix !== 'POSE') {
        return res.status(400).json({ error: 'TypePrix doit être "FOURNITURE" ou "POSE"' });
      }
    }

    if (PrixHT !== undefined) {
      const prixHTValue = parseFloat(PrixHT);
      if (isNaN(prixHTValue) || prixHTValue < 0) {
        return res.status(400).json({ error: 'PrixHT doit être un nombre positif' });
      }
    }
    
    if (TauxTVA !== undefined) {
      const tauxTVAValue = parseFloat(TauxTVA);
      if (isNaN(tauxTVAValue) || tauxTVAValue < 0 || tauxTVAValue > 100) {
        return res.status(400).json({ error: 'TauxTVA doit être un nombre entre 0 et 100' });
      }
    }

    // Vérifier les dates si fournies
    if (DateDebutApplication !== undefined) {
      const dateDebut = new Date(DateDebutApplication);
      if (isNaN(dateDebut.getTime())) {
        return res.status(400).json({ error: 'DateDebutApplication invalide' });
      }
    }
    
    if (DateFinApplication !== undefined) {
      const dateFin = new Date(DateFinApplication);
      if (isNaN(dateFin.getTime())) {
        return res.status(400).json({ error: 'DateFinApplication invalide' });
      }
      
      // Vérifier que dateFin > dateDebut si les deux sont fournies
      if (DateDebutApplication !== undefined) {
        const dateDebut = new Date(DateDebutApplication);
        if (dateFin <= dateDebut) {
          return res.status(400).json({ error: 'DateFinApplication doit être postérieure à DateDebutApplication' });
        }
      }
    }

    // Construire la requête de mise à jour dynamiquement
    let updateFields = [];
    let request = pool.request().input('id', sql.Int, id);

    if (TypePrix !== undefined) {
      updateFields.push('TypePrix = @TypePrix');
      request.input('TypePrix', sql.NVarChar(20), TypePrix);
    }

    if (PrixHT !== undefined) {
      updateFields.push('PrixHT = @PrixHT');
      request.input('PrixHT', sql.Decimal(18, 2), parseFloat(PrixHT));
    }
    
    if (TauxTVA !== undefined) {
      updateFields.push('TauxTVA = @TauxTVA');
      request.input('TauxTVA', sql.Decimal(5, 2), parseFloat(TauxTVA));
    }
    
    if (DateDebutApplication !== undefined) {
      updateFields.push('DateDebutApplication = @DateDebutApplication');
      request.input('DateDebutApplication', sql.Date, new Date(DateDebutApplication));
    }
    
    if (DateFinApplication !== undefined) {
      updateFields.push('DateFinApplication = @DateFinApplication');
      request.input('DateFinApplication', sql.Date, new Date(DateFinApplication));
    }
    
    if (EstActif !== undefined) {
      updateFields.push('EstActif = @EstActif');
      request.input('EstActif', sql.Bit, EstActif ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    updateFields.push('DateModification = GETDATE()');
    
    const updateQuery = `
      UPDATE ArticlePrixHistorique 
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.*
      WHERE IdPrixHistorique = @id
    `;

    const update = await request.query(updateQuery);

    if (update.recordset.length === 0) {
      return res.status(404).json({ error: 'Historique de prix introuvable' });
    }

    res.json(update.recordset[0]);
  } catch (error) {
    // Error updating price history
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Supprimer un historique de prix
app.delete('/api/articles/prix-historique/:id', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const actorRoleLower = (req.user?.role || '').toLowerCase();
    const isAdminRole = actorRoleLower === 'admin' || actorRoleLower.includes('admin');
    if (!isAdminRole) {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent gérer les prix des articles.' });
    }

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id invalide' });

    // Vérifier s'il s'agit du dernier prix actif (ne peut pas être supprimé)
    const activePriceResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT IdPrixHistorique, EstActif
        FROM ArticlePrixHistorique
        WHERE IdPrixHistorique = @id AND EstActif = 1
      `);

    if (activePriceResult.recordset.length > 0) {
      // Vérifier s'il y a d'autres prix pour cet article
      const articleIdResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT IdArticle
          FROM ArticlePrixHistorique
          WHERE IdPrixHistorique = @id
        `);
      
      if (articleIdResult.recordset.length > 0) {
        const articleId = articleIdResult.recordset[0].IdArticle;
        
        const otherPricesResult = await pool.request()
          .input('articleId', sql.Int, articleId)
          .input('currentId', sql.Int, id)
          .query(`
            SELECT COUNT(*) as Count
            FROM ArticlePrixHistorique
            WHERE IdArticle = @articleId AND IdPrixHistorique != @currentId
          `);
        
        if (otherPricesResult.recordset[0].Count === 0) {
          return res.status(400).json({ error: 'Impossible de supprimer le dernier prix d\'un article. Désactivez-le plutôt.' });
        }
      }
    }

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM ArticlePrixHistorique
        WHERE IdPrixHistorique = @id
      `);

    res.json({ message: 'Historique de prix supprimé avec succès' });
  } catch (error) {
    // Error deleting price history
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Error handler middleware (doit être après toutes les routes)
app.use((err, req, res, next) => {
  console.error('[ERROR HANDLER] Erreur non gérée:', err);
  console.error('[ERROR HANDLER] URL:', req.url);
  console.error('[ERROR HANDLER] Method:', req.method);
  console.error('[ERROR HANDLER] Stack:', err.stack);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler (doit être après toutes les routes)
app.use((req, res) => {
  console.error('[404] Route non trouvée:', req.method, req.url);
  res.status(404).json({ error: 'Route non trouvée' });
});

// Start server after all routes are defined
startServer();
