const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://cherifmed2030:Mmedch86@coordinateur.djbgo2q.mongodb.net/?retryWrites=true&w=majority&appName=Coordinateur';

async function test() {
    console.log('🔄 Test ANCIEN cluster...');
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000
    });
    
    try {
        await client.connect();
        console.log('✅ CONNECTÉ à l\'ancien cluster!');
        
        const db = client.db('coordinateur');
        const coll = db.collection('evaluations');
        
        const doc = { id: 'test-' + Date.now(), test: true };
        await coll.insertOne(doc);
        console.log('✅ ÉCRITURE OK!');
        
        const found = await coll.findOne({ id: doc.id });
        console.log('✅ LECTURE OK!');
        
        await coll.deleteOne({ id: doc.id });
        console.log('✅ SUPPRESSION OK!');
        
        console.log('\n🎉 L\'ANCIEN CLUSTER FONCTIONNE!\n');
        
    } catch (error) {
        console.error('❌ Ancien cluster ne fonctionne pas non plus:', error.message);
    } finally {
        await client.close();
    }
}

test();
