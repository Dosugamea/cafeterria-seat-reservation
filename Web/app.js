var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var pageRouter = require('./routes/page');
var apiRouter = require('./routes/api');
var passport = require('passport');
var app = express();

// Expressのセットアップ(順番変えると動かなくなるかも...)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// セッションを使用
app.use(session({ resave:false,saveUninitialized:false, secret: 'passport test' }));
// パスポートを申請する
app.use(passport.initialize());
app.use(passport.session());

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