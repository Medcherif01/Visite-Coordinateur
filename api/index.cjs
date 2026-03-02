/**
 * Professional Teacher Evaluation System - Serverless API with MongoDB
 * Vercel Serverless Function for handling evaluation data
 * **Utilisation de l'extension .cjs pour forcer le mode CommonJS sur Vercel.**
 * Version 4.3.0 - Module Stable et Routage corrigé
 */

// Utilisation de require pour CommonJS
const { MongoClient } = require('mongodb');

// Configuration MongoDB - Connexion directe sans intermédiaire
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cherifmed2030:Mmedch86@coordinateur.djbgo2q.mongodb.net/?retryWrites=true&w=majority&appName=Coordinateur';
const DB_NAME = 'coordinateur'; // Nom de la base de données

// Cache pour la connexion MongoDB (optimisé pour les fonctions serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // Retourner la connexion cachée si elle existe
  if (cachedClient && cachedDb) {
    console.log('✅ Utilisation connexion MongoDB cachée');
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI || MONGODB_URI.includes('YOUR_MONGODB_URI_HERE')) {
    throw new Error('MONGODB_URI non configurée.');
  }

  console.log('🔄 Création nouvelle connexion MongoDB...');
  console.log('📍 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe
  console.log('📂 Database:', DB_NAME);

  // Configuration du client MongoClient
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    retryReads: true,
    w: 'majority',
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false
  });
  
  try {
    await client.connect();
    console.log('✅ Connexion MongoDB établie avec succès');
    
    const db = client.db(DB_NAME);
    
    await db.admin().ping();
    console.log('✅ Ping MongoDB réussi');

    const evaluationsCollection = db.collection('evaluations');
    
    try {
      await evaluationsCollection.createIndex({ teacherName: 1, date: -1 });
      await evaluationsCollection.createIndex({ id: 1 }, { unique: true });
      console.log('✅ Index MongoDB créés');
    } catch (indexError) {
      if (!indexError.message.includes('already exists')) {
         console.error('❌ ERREUR création index:', indexError.message);
      } else {
         console.log('ℹ️ Index déjà existants:', indexError.message);
      }
    }

    cachedClient = client;
    cachedDb = db;

    console.log('✅ Base de données prête:', DB_NAME);
    return { client, db };
    
  } catch (error) {
    console.error('❌ ERREUR connexion MongoDB:', error.message);
    throw new Error(`Impossible de se connecter à MongoDB: ${error.message}. Vérifiez votre URI et les paramètres de sécurité (IP Whitelist).`);
  }
}

async function handler(req, res) {
  // Activer CORS pour toutes les origines
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;
  const url = req.url || '';
  // Normaliser le path en retirant le préfixe /api si présent
  let path = url.split('?')[0];
  if (path.startsWith('/api')) {
    path = path.substring(4) || '/';
  }

  try {
    // Endpoint d'information de l'API: '/'
    if (method === 'GET' && path === '/') {
      return res.status(200).json({
        status: 'success',
        message: 'Professional Teacher Evaluation System API with MongoDB',
        version: '4.3.0',
        features: [
          'Automatic MongoDB storage',
          '100-point academic assessment system',
          'Word document generation with detailed tables',
          'Bilingual support (EN/FR)',
          'Enhanced teacher and coordinator dashboards',
          'Real-time data synchronization'
        ],
        endpoints: {
          '/health': 'API health check',
          '/evaluations': 'GET/POST evaluations',
          '/evaluations/:id': 'GET/PUT/DELETE specific evaluation',
          '/users': 'GET user data',
          '/': 'API information'
        }
      });
    }

    // Endpoint de vérification de santé: '/health'
    if (method === 'GET' && path === '/health') {
      const { db } = await connectToDatabase();
      await db.admin().ping();
      
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Teacher Evaluation System is running properly',
        database: 'MongoDB connected and operational'
      });
    }

    // Endpoints pour les évaluations: '/evaluations'
    if (path.startsWith('/evaluations')) {
      const { db } = await connectToDatabase();
      const evaluationsCollection = db.collection('evaluations');

      // GET toutes les évaluations ou par enseignant (optimisé): '/evaluations'
      if (method === 'GET' && path === '/evaluations') {
        const { teacherName, coordinatorName } = req.query;
        
        let query = {};
        if (teacherName) query.teacherName = teacherName;
        if (coordinatorName) query.coordinatorName = coordinatorName;
        
        const evaluations = await evaluationsCollection
          .find(query)
          .sort({ date: -1 })
          .limit(100)
          .toArray();
        
        return res.status(200).json({
          success: true,
          count: evaluations.length,
          data: evaluations,
          timestamp: new Date().toISOString()
        });
      }

      // POST nouvelle évaluation: '/evaluations'
      if (method === 'POST' && path === '/evaluations') {
        const evaluationData = {
          ...req.body,
          id: req.body.id || Date.now().toString(),
          date: req.body.date || new Date().toISOString(),
          createdAt: new Date()
        };

        const result = await evaluationsCollection.insertOne(evaluationData);
        
        return res.status(201).json({
          success: true,
          message: 'Évaluation enregistrée avec succès',
          data: { ...evaluationData, _id: result.insertedId }
        });
      }

      // Gestion d'une évaluation spécifique par ID: '/evaluations/:id'
      const pathParts = path.split('/');
      if (pathParts.length === 3 && pathParts[1] === 'evaluations') {
        const evaluationId = pathParts[2];

        // GET évaluation par ID
        if (method === 'GET') {
          const evaluation = await evaluationsCollection.findOne({ id: evaluationId });
          
          if (!evaluation) {
            return res.status(404).json({
              success: false,
              message: 'Évaluation non trouvée'
            });
          }

          return res.status(200).json({
            success: true,
            data: evaluation
          });
        }

        // PUT mise à jour d'une évaluation
        if (method === 'PUT') {
          const updateData = {
            ...req.body,
            updatedAt: new Date()
          };
          delete updateData.id;

          const result = await evaluationsCollection.updateOne(
            { id: evaluationId },
            { $set: updateData }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({
              success: false,
              message: 'Évaluation non trouvée'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Évaluation mise à jour avec succès'
          });
        }

        // DELETE suppression d'une évaluation
        if (method === 'DELETE') {
          const result = await evaluationsCollection.deleteOne({ id: evaluationId });

          if (result.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              message: 'Évaluation non trouvée'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Évaluation supprimée avec succès'
          });
        }
      }
    }

    // Endpoint pour les utilisateurs: '/users'
    if (method === 'GET' && path === '/users') {
      const users = [
        { username: 'Mohamed', password: 'Mohamed@86', role: 'coordinator', assignedTeachers: ['Morched', 'Kamel', 'Abas', 'Zine', 'Youssef', 'Oumarou', 'Tonga', 'Sylvano', 'Sami', 'Mohamed Ali'] },
        { username: 'Zohra', password: 'Zohra@40', role: 'coordinator', assignedTeachers: ['Aichetou', 'Inas', 'Anwar', 'Souha', 'Amal', 'Shanouja', 'Hiba', 'Samira'] },
        { username: 'Rasha', password: 'Rasha@26', role: 'coordinator', assignedTeachers: ['Amal', 'Rouba', 'Rayan', 'Nesrine', 'Fatima', 'Romana', 'Nour'] },
        { username: 'روعة', password: 'روعة2025', role: 'coordinator', assignedTeachers: ['نداء اللقماني', 'نسيم الرمثي'] },
        { username: 'عماد', password: 'عماد2025', role: 'coordinator', assignedTeachers: ['ماجد', 'سعيد', 'جابر'] },
        ...['Morched', 'Kamel', 'Abas', 'Zine', 'Youssef', 'Oumarou', 'Tonga', 'Sylvano', 'Sami', 'Mohamed Ali', 'Aichetou', 'Inas', 'Anwar', 'Souha', 'Amal', 'Shanouja', 'Jana', 'Samira', 'Rouba', 'Rayan', 'Nesrine', 'Fatima', 'Romana', 'Nour', 'نداء اللقماني', 'نسيم الرمثي', 'ماجد', 'سعيد', 'جابر'].map(name => ({ username: name, role: 'teacher', password: name }))
      ];

      return res.status(200).json({
        success: true,
        data: users
      });
    }

    // Endpoint pour synchroniser les données localStorage vers MongoDB: '/sync-data'
    if (method === 'POST' && path === '/sync-data') {
      const { db } = await connectToDatabase();
      const evaluationsCollection = db.collection('evaluations');
      const { evaluations } = req.body;

      if (evaluations && Array.isArray(evaluations)) {
        const operations = evaluations.map(eval => ({
          updateOne: {
            filter: { id: eval.id },
            update: { 
              $set: { 
                ...eval, 
                syncedAt: new Date() 
              } 
            },
            upsert: true
          }
        }));

        await evaluationsCollection.bulkWrite(operations);

        return res.status(200).json({
          success: true,
          message: `${evaluations.length} évaluations synchronisées avec succès`
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Données de synchronisation invalides'
      });
    }

    // Réponse par défaut pour les routes non définies
    return res.status(404).json({
      error: 'Endpoint not found',
      message: `Endpoint ${method} ${url} not recognized.`,
      availableEndpoints: [
        '/',
        '/health',
        '/evaluations',
        '/evaluations/:id',
        '/users',
        '/sync-data'
      ]
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    console.error('Stack:', error.stack);
    
    const errorMessage = error.message || 'Erreur serveur interne';
    const isMongoError = errorMessage.includes('MongoDB') || errorMessage.includes('connect');
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
      details: isMongoError ? 'Vérifiez la configuration MongoDB (URI, IP Whitelist) et la connexion réseau.' : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// Export CommonJS
module.exports = handler;
