var express = require('express');
var router = express.Router();
var createError = require('http-errors');
const pages = ['contact', 'help', 'index', 'privacy_policy', 'sign_in', 'sign_up', 'term_of_service'];

/*
 ログイン不要ページ
*/

// トップページ
router.get('/', function(req, res, next) {
  console.log(req.user);
  res.render('index', {isLogined: req.user});
});
router.get('/index.html', function(req, res, next) {
  res.redirect('/');
});

//通常ページ
router.get('/:name', function(req, res, next) {
	if (pages.indexOf(req.params.name) >= 0) {
        res.render(req.params.name, {isLogined: req.user});
    }else{
	  var err = new Error('Not Found');
	  err.status = 404;
	  next(createError(404));
	}
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
