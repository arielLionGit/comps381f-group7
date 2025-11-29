const mongoose = require('mongoose');


const DB_CONFIG = {

  
  // Connection options
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};


const MONGODB_URI = DB_CONFIG.MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://Group7:123@cluster0.lctwnkf.mongodb.net/?appName=Cluster0';

// Database connection function
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, DB_CONFIG.options);
    console.log('✓ MongoDB connection successful');
    console.log(`✓ Database address: ${MONGODB_URI}`);
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    console.error('Please check the following:');
    console.error('1. Is MongoDB service running?');
    console.error('2. Is the connection string correct?');
    console.error('3. Is the network connection normal?');
    process.exit(1);
  }
};

// Listen to database events
mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB error:', err);
});

module.exports = { connectDB, MONGODB_URI };
