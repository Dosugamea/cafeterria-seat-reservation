var express = require('express');
var router = express.Router();
var passport = require('passport');


// API: ログイン
router.post('/login', passport.authenticate('local', 
    {successRedirect: '/',
    failureRedirect: '/sign_in',
    session: true}));

// API: ログアウト
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;