var express = require('express');
var router = express.Router();

// トップページ
router.get('/', function(req, res, next) {
  res.render('index');
});
router.get('/index.html', function(req, res, next) {
  res.redirect('/');
});

// アナウンス
router.get('/announcements', function(req, res, next) {
  res.render('announcements');
});

// ユーザー
router.get('/user', function(req, res, next) {
  res.render('mypage');
});

// 連絡先
router.get('/contact', function(req, res, next) {
  res.render('contact');
});

// ヘルプ
router.get('/help', function(req, res, next) {
  res.render('help');
});

// 利用規約
router.get('/term_of_service', function(req, res, next) {
  res.render('term_of_service');
});

// プライバシーポリシー
router.get('/privacy_policy', function(req, res, next) {
  res.render('privacy_policy');
});

module.exports = router;
