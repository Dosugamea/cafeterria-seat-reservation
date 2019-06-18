var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
router.get('/index.html', function(req, res, next) {
  res.render('index');
});

router.get('/user', function(req, res, next) {
  res.render('mypage');
});

router.get('/contact', function(req, res, next) {
  res.render('contact');
});

router.get('/help', function(req, res, next) {
  res.render('help');
});

module.exports = router;
