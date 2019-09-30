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

// データベースのセットアップ
var mysql = require('mysql2');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lakito'
});

// Expressのセットアップ(順番変えると動かなくなるかも...)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// パスポートを申請する
app.use(session({
	resave:true,
	saveUninitialized:true,
	secret:'cafe_key',
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 31
	}
}));
app.use(passport.initialize());
app.use(passport.session());

// 認証方法
passport.use(new LocalStrategy(
	{
	  usernameField: 'account_mail',
	  passwordField: 'account_passwd'
	},
	function (username, password, done) {
		connection.query("SELECT * from `users` WHERE `mail` = ? AND `passwd` = ?;",[username,password], function(err, datas) {
			// 結果に含まれていたらログイン成功
			for (i = 0; i < datas.length; i++) {
				if (datas[i].mail == username || datas[i].passwd == password){
					return done(null, datas[i].userId);
				}
			}
			// 含まれていなければログイン失敗
			return done(null, false, {message: "ログインに失敗しました"});
		});
	}
));

// 認証 シリアライズ/デシリアライズ
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

// ページルータに流す
app.use('/', pageRouter);
app.use('/', apiRouter);

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