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

// 予約の受付
router.post('/user/reserve', function(req,res){
	res.redirect('/user');
});

// 予約のQR読み込み待ち(一定秒数毎に1回たたく)
router.post('/user/wait_qr', function(req,res){
	
});

// 予約の検証(QRコード読み取り端末から受付)
router.post('/admin/verify_reserve', function(req,res){
	var userId = req.body.userId;
	var reserveId = req.body.reserveId;
	// 何分ずれてるか
	var minuteDistance = function (src, dst) {
		var deltaMillsecond = dst.getTime() - src.getTime();
		return deltaMillsecond / 1000 / 60;
	}
	console.log(userId);
	console.log(reserveId);
	// 予約データ取得
	connection.query("SELECT status,DATE_FORMAT(fromTime, '%H:%i') AS fTime ,TIME_FORMAT(toTime, '%H:%i') AS tTime FROM reserves WHERE userId=? AND reserveId=?",[userId,reserveId], function(err,data){
		// 取得できたら
		if (data.length > 0){
			//今の時間
			var nowTime = new Date();
			//時間を過ぎている
			if (fTime > nowTime+3){
				res.json({
					status:"ng",
					reason:"the reserve is time out."
				});
			//まだ時間じゃない
			}else if (fTime < nowTime-5){
				res.json({
					status:"ng",
					reason:"the reserve is not in time."
				});
			// 状態問題なし
			}else if (data[0].status == 0){
				connection.query("UPDATE `reserves` SET `status`=1 WHERE `userId`=? AND `reserveId`=?;",[userId,reserveId], function(err, data) {
					res.json({
							status:"ok",
							reason: "no problem"
					});
				});
			//予約が使用済みならエラー
			}else if (data[0].status == 1){
				res.json({
					status:"ng",
					reason:"the reserve is already used"
				});
			//管理者による強制無効化
			}else if (data[0].status == -1){
				res.json({
					status:"ng",
					reason:"the reserve is disabled by admin"
				});
			//DBを更新する
			connection.query("UPDATE `reserves` SET `qr_response`=? WHERE `reserveId`=?;",[reason,reserveId], function(err, data) {
				res.json({
						status:　status_value,
						reason: reason_value
				});
			});
		// 取得できなければ
		}else{
			res.json({
				status:"ng",
				reason:"the reserve is invalid"
			});
		}
	});
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
		if (err){
			if (err.code == "ER_DUP_ENTRY"){ 
				res.redirect('../sign_up');
			}
			return;
		}else{
			res.redirect('../sign_in');
		}
	});
});

// アカウント編集
router.post('/user', function(req,res){
	ac_npass = req.body.new_passwd
	ac_npass_re = req.body.new_passwd_re
	ac_opass = req.body.old_passwd
	console.log(ac_npass);
	console.log(ac_npass_re);
	console.log(ac_opass);
	if (ac_npass != ac_npass_re){
		res.redirect('/user/edit?error=1');
		return;
	}
	connection.query("SELECT passwd FROM `users` WHERE passwd=? AND userId=?",[ac_opass,req.user], function(err, data) {
		if(data.length > 0){
			connection.query("UPDATE `users` SET `passwd`=? WHERE `userId`=?;",[ac_npass,req.user], function(err, data) {
				res.redirect('/user?status=2');
			});
		}else{
			res.redirect('/user/edit?error=2');
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