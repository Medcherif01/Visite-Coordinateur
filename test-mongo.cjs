const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://cherifmed2030:Mmedch86@visites.ve4ifcb.mongodb.net/?retryWrites=true&w=majority&appName=Visites';

async function test() {
    console.log('🔄 Test connexion...');
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000
    });
    
    try {
        await client.connect();
        console.log('✅ CONNECTÉ!');
        
        const db = client.db('visites');
        const coll = db.collection('evaluations');
        
        // Test écriture
        const doc = { id: 'test-' + Date.now(), test: true };
        await coll.insertOne(doc);
        console.log('✅ ÉCRITURE OK!');
        
        // Test lecture
        const found = await coll.findOne({ id: doc.id });
        console.log('✅ LECTURE OK!', found ? 'Trouvé' : 'Non trouvé');
        
        // Nettoyage
        await coll.deleteOne({ id: doc.id });
        console.log('✅ SUPPRESSION OK!');
        
        console.log('\n🎉 MONGODB FONCTIONNE!\n');
        
    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        if (error.message.includes('IP')) {
            console.error('\n⚠️  PROBLÈME: MongoDB Atlas bloque votre IP!');
            console.error('👉 Solution: Allez sur MongoDB Atlas et ajoutez 0.0.0.0/0 dans Network Access\n');
        }
    } finally {
        await client.close();
    }
}

test();
