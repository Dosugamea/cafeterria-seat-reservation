var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// 認証方法
passport.use(new LocalStrategy({
    usernameField: 'account_mail',
    passwordField: 'account_passwd',
	session: false
},function(username, password, done) {
    // テスト用ユーザー
    var user = {id:"test", username:"user",password:"password"};
    // 認証。
    if(username===user.username && password===user.password){
      return done(null, true);
    }else{
      return done(null, false, { message: 'ログインに失敗しました。' });
    }
  }
));

// 認証シリアライズ/デシリアライズ
passport.serializeUser(function (isLogined, done) {
  console.log("serialize");
  done(null, isLogined);
});
passport.deserializeUser(function (isLogined, done) {
  console.log("deserialize");
  console.log(isLogined);
  done(null, isLogined);
});

// API: ログイン
router.post('/login', passport.authenticate('local', 
    {successRedirect: '/',
    failureRedirect: '/sign_in',
    session: true})
);
// API: ログアウト
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;