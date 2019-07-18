var createError = require('http-errors');
var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var pageRouter = require('./routes/page');
var apiRouter = require('./routes/api');
var app = express();

// Expressのセットアップ(順番変えると動かなくなるかも...)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// パスポートを申請する
app.use(session({ resave:true,saveUninitialized:true, secret: 'cafe_key' }));
app.use(passport.initialize());
app.use(passport.session());

// 認証方法
passport.use(new LocalStrategy({
  usernameField: 'account_mail',
  passwordField: 'account_passwd',
  passReqToCallback: true,
  session: false,
}, function (req, username, password, done) {
  process.nextTick(function () {
    if (username === "test" && password === "test") {
      return done(null, true)
    } else {
      console.log("login error")
      return done(null, false, { message: 'パスワードが正しくありません。' })
    }
  })
}));

// 認証 シリアライズ/デシリアライズ
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

// ページルータに流す
app.use('/', pageRouter);
app.use('/api', apiRouter);

// 404エラーを捕まえる
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(createError(404));
});
　
// 500エラーを捕まえる
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;