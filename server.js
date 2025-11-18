require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override');
const path = require('path');
const { connectDB } = require('./config/database');


const SERVER_CONFIG = {
  PORT: 3000,  // 伺服器端口
  SESSION_SECRET: 'your-secret-key-change-in-production'  // Session 密鑰
};

const PORT = SERVER_CONFIG.PORT || process.env.PORT || 3000;
const SESSION_SECRET = SERVER_CONFIG.SESSION_SECRET || process.env.SESSION_SECRET || 'your-secret-key';

// 初始化 Express 應用
const app = express();

// 連接資料庫
connectDB();

// 設定視圖引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Method override (支援 PUT 和 DELETE)
app.use(methodOverride('_method'));

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// Session 設定
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000 // 24 小時
}));

// 全域變數中間件
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.username : null;
  res.locals.userId = req.session ? req.session.userId : null;
  res.locals.isAdmin = req.session ? req.session.isAdmin : false;
  next();
});

// 檢查用戶禁止狀態
const { checkBanned } = require('./middleware/auth');
app.use(checkBanned);

// 認證路由
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// 文章路由
const postRoutes = require('./routes/posts');
app.use('/', postRoutes);

// 留言路由
const commentRoutes = require('./routes/comments');
app.use('/', commentRoutes);

// 搜尋路由
const searchRoutes = require('./routes/search');
app.use('/', searchRoutes);

// 管理員路由
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// API 路由
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// 404 處理
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: { status: 404, stack: 'The page you are looking for does not exist.' },
    user: req.session ? req.session.username : null,
    isAdmin: req.session ? req.session.isAdmin : false
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).render('error', {
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.session ? req.session.username : null,
    isAdmin: req.session ? req.session.isAdmin : false
  });
});


app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Blog Platform server started');
  console.log('========================================');
  console.log(`✓ Listening on: http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('Admin credentials:');
  console.log('  Username: admin');
  console.log('  Password: 123456');
  console.log('========================================');
});

module.exports = app;
