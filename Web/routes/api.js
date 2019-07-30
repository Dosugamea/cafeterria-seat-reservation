var express = require('express');
var router = express.Router();
var passport = require('passport');
var mysql = require('mysql2');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lakito'
});

// 予約API
router.post('/user/reserve', function(req,res){
	res.redirect('/');
});

// アカウント登録
router.post('/sign_up', function(req,res){
	ac_mail = req.body.account_mail
	ac_pass = req.body.account_passwd
	ac_passr = req.body.account_passwd_re
	if (ac_pass != ac_passr){
		res.redirect('../sign_up');
		return;
	}
	connection.query("INSERT INTO `users` (`mail`,`passwd`) VALUES (?,?);",[ac_mail,ac_pass], function(err, data) {
		console.log(err);
		if (err){
			if (err.code == "ER_DUP_ENTRY"){ 
				res.redirect('../sign_up');
			}
			return;
		}else{
			res.redirect('/sign_in');
		}
	});
});

// ログイン
router.post('/sign_in', passport.authenticate('local', 
    {successRedirect: '/',
    failureRedirect: '/sign_in',
    session: true}));

// ログアウト
router.get('/user/sign_out', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;