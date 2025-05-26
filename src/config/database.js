const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

let dbClient;

const connectDB = async () => {
  try {
    dbClient = new MongoClient(process.env.MONGO_URI);
    await dbClient.connect();
    console.log('Connected to MongoDB');
    return dbClient.db();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); 
  }
};


module.exports = { connectDB };
