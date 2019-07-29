var express = require('express');
var router = express.Router();
var passport = require('passport');


// アカウント登録
router.post('/sign_up', function(req,res){
	console.log(req.body.account_mail);
	console.log(req.body.account_passwd);
	res.redirect('/sign_in');
});

// ログイン
router.post('/login', passport.authenticate('local', 
    {successRedirect: '/',
    failureRedirect: '/sign_in',
    session: true}));

// ログアウト
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;