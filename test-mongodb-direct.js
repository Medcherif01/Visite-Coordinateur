const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://cherifmed2030:Mmedch86@visites.ve4ifcb.mongodb.net/?retryWrites=true&w=majority&appName=Visites';

async function testConnection() {
    console.log('🔄 Test de connexion MongoDB...');
    console.log('📍 URI:', uri.replace(/:[^:@]+@/, ':****@'));
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ CONNEXION RÉUSSIE!');
        
        const db = client.db('visites');
        await db.admin().ping();
        console.log('✅ PING RÉUSSI!');
        
        // Test d'écriture
        const collection = db.collection('evaluations');
        const testDoc = {
            id: 'test-' + Date.now(),
            test: true,
            date: new Date().toISOString()
        };
        
        const result = await collection.insertOne(testDoc);
        console.log('✅ ÉCRITURE RÉUSSIE! ID:', result.insertedId);
        
        // Test de lecture
        const docs = await collection.find({ test: true }).limit(5).toArray();
        console.log('✅ LECTURE RÉUSSIE! Documents:', docs.length);
        
        // Nettoyage
        await collection.deleteOne({ id: testDoc.id });
        console.log('✅ SUPPRESSION RÉUSSIE!');
        
        console.log('\n🎉 MONGODB FONCTIONNE PARFAITEMENT!\n');
        
    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testConnection();
