import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000, // Increased from 5000ms
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000, // Added explicit connect timeout
  family: 4, // Force IPv4 (helps with some DNS issues)
  retryWrites: true,
  w: 'majority',
  // Connection pool options
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  // Monitoring options
  heartbeatFrequencyMS: 10000,
  // TLS options
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDatabase(): Promise<Db> {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await clientPromise;
      const db = client.db('zafra');
      
      // Test the connection with a ping
      await db.admin().ping();
      return db;
    } catch (error) {
      console.error(`MongoDB connection attempt failed (${4 - retries}/3):`, error);
      retries--;
      
      if (retries === 0) {
        throw new Error(`Failed to connect to MongoDB after 3 attempts: ${error}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Unexpected error in getDatabase');
}

export async function connectToDatabase(): Promise<{ db: Db }> {
  try {
    const db = await getDatabase();
    console.log('✅ MongoDB connected successfully');
    return { db };
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Server selection timed out')) {
        console.error('💡 Suggestion: Check your MongoDB Atlas cluster status and network access settings');
      } else if (error.message.includes('Authentication failed')) {
        console.error('💡 Suggestion: Verify your MongoDB credentials in .env.local');
      } else if (error.message.includes('hostname')) {
        console.error('💡 Suggestion: Check your MongoDB connection string format');
      }
    }
    
    throw error;
  }
}