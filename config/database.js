const mongoose = require('mongoose');


const DB_CONFIG = {

  
  // 連接選項
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};


const MONGODB_URI = DB_CONFIG.MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://Group7:123@cluster0.lctwnkf.mongodb.net/?appName=Cluster0';

// 連接資料庫函數
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, DB_CONFIG.options);
    console.log('✓ MongoDB 連接成功');
    console.log(`✓ 資料庫位址: ${MONGODB_URI}`);
  } catch (error) {
    console.error('✗ MongoDB 連接失敗:', error.message);
    console.error('請檢查以下項目:');
    console.error('1. MongoDB 服務是否已啟動');
    console.error('2. 連接字串是否正確');
    console.error('3. 網路連接是否正常');
    process.exit(1);
  }
};

// 監聽資料庫事件
mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB 連接已斷開');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB 錯誤:', err);
});

module.exports = { connectDB, MONGODB_URI };
