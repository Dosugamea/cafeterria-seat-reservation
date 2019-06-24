var express = require('express');
var router = express.Router();

/*
 ログイン不要ページ
*/

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

/*
 ログイン必須ページ
*/

// ユーザーページ
router.get('/user', function(req, res, next) {
  res.render('user');
});
// アカウント設定編集
router.get('/user/edit', function(req, res, next) {
  res.render('user_edit');
});
// ログアウト
router.get('/user/sign_out', function(req, res, next) {
  res.render('index');
});
// 予約
router.get('/user/reserve', function(req, res, next) {
  res.render('reserve');
});
// 予約コード表示
router.get('/user/reserve/code', function(req, res, next) {
  res.render('reserve_code');
});
// 予約状態
router.get('/user/reserve/status', function(req, res, next) {
  res.render('reserve_status');
});

module.exports = router;
