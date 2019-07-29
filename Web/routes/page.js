var express = require('express');
var router = express.Router();
var createError = require('http-errors');
const pages = [
	'contact',
	'help',
	'index',
	'privacy_policy',
	'sign_in',
	'sign_up',
	'term_of_service'
];

/*
 ログイン不要ページ
*/

// トップページ
router.get('/', function(req, res, next) {
  console.log(req.user);
  res.render('index', {login_ok: req.user});
});
router.get('/index.html', function(req, res, next) {
  res.redirect('/');
});

/*
 ログイン必須ページ
*/

// ユーザーページ
router.get('/user', function(req, res, next) {
	if(req.user){
		res.render('user', {login_ok: req.user});
	}else{
		res.redirect('/sign_in');
	}
});
// アカウント設定編集
router.get('/user/edit', function(req, res, next) {
	if(req.user){
		res.render('user_edit', {login_ok: req.user});
	}else{
		res.redirect('/sign_in');
	}
});
// 予約
router.get('/user/reserve', function(req, res, next) {
	if(req.user){
		res.render('reserve', {login_ok: req.user});
	}else{
		res.redirect('/sign_in');
	}
});
// 予約コード表示
router.get('/user/reserve/code', function(req, res, next) {
	if(req.user){
		res.render('reserve_code', {login_ok: req.user});
	}else{
		res.redirect('/sign_in');
	}
});
// 予約状態
router.get('/user/reserve/status', function(req, res, next) {
	if(req.user){
		res.render('reserve_status', {login_ok: req.user});
	}else{
		res.redirect('/sign_in');
	}
});

/*

ユーザページ

*/
router.get('/:name', function(req, res, next) {
	if (pages.indexOf(req.params.name) >= 0) {
        res.render(req.params.name, {login_ok: req.user});
    }else{
	  var err = new Error('Not Found');
	  err.status = 404;
	  next(createError(404));
	}
});

module.exports = router;
