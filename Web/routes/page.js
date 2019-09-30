var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var QRCode = require('qrcode');
var mysql = require('mysql2');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lakito'
});
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
		//予約情報取得
		connection.query("SELECT reserveId from reserves WHERE userId=? AND status=0",　[req.user], function(err,data) {
			//予約されていればQRコードを生成
			if (data.length > 0){
				QRCode.toDataURL(req.user+'_'+data[0].reserveId, function (err, url) {
					var reserve_qr = url;
					var reserve_id = data[0].reserveId;
					res.render('reserve_code', {
						login_ok: req.user,
						reserve_qr: reserve_qr,
						reserve_id : reserve_id,
						user_id: req.user
					});
				});
			//予約されていなければデフォルトを返す
			}else{
				var reserve_qr = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG8AAABvAQMAAADYCwwjAAAABlBMVEX///8AAABVwtN+AAABHUlEQVQ4jdXTva2EMAwAYEcp6LgFImUNd1kJFuBgAVgpHWtEygK8zkWEn8PpTq95OO2lQHxFFP8CfON5MK/oD7TMSWUPdqH6naGBIc9YRrYbNXHFfEArF3YT5iZKPMFyzJ8gb3jlW9/6k/6/lGMk/ve/QuQV0hSciUknlKErD3ZPApUS1Rz8jG4KSaXhNJKDzjPpBPAnplFCCg3EMiAfIfUN7Lt8ohv3fARooJvA/0T/KuY9pZK1mzJa1EI3dfJK5ggqpZsLp1pP0HmlKRfTEHSaKLPqt51fc3XP2lOCQSrZgcqr+6WXoQWdsgsryO5IjxoY8rbXfPmaWJULJUP2QGjhRvbEAph0yv4iy74bBpUSz0LuGXl9r8YNv+/8AkP39n6+Mng6AAAAAElFTkSuQmCC";
				var reserve_id = "予約無し";
				res.render('reserve_code', {
					login_ok: req.user,
					reserve_qr: reserve_qr,
					reserve_id : reserve_id,
					user_id: req.user
				});
			}
		});
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

一般ページ

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
