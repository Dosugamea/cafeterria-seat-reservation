var createError = require('http-errors');
var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var pageRouter = require('./routes/page');
var apiRouter = require('./routes/api');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ログインできたか確認する
app.use(passport.initialize());
var LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
  usernameField: 'account-mail',
  passwordField: 'account-passwd',
  passReqToCallback: true,
  session: false,
}, function (req, username, password, done) {
  process.nextTick(function () {
    if (username === "test" && password === "test") {
      return done(null, username)
    } else {
      console.log("login error")
      return done(null, false, { message: 'パスワードが正しくありません。' })
    }
  })
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//仮置き( https://github.com/expressjs/session/issues/515 参考)
app.post('/sign_in',
    passport.authenticate('local', {
        failureRedirect: '/',  // 失敗したときの遷移先
        successRedirect: 'http://gochiusa.com',  // 成功したときの遷移先
}));

app.use('/', pageRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
　
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
