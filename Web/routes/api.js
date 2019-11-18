let express = require('express');
let router = express.Router();
let passport = require('passport');
let mysql = require('mysql2');
let connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lakito'
});

/*
1 使用時間を決めて予約をとる(直前でも可)(席取りはさせない)
2 行く
3 かざす その時空いてる席、もしくは終了が一番近い席に案内される
4 一応基準としてタイマーが動くが先に食べ終わったら離れてQRコードを再度かざすことで
　　空き時間はなくせる(そのあとの予約では時間を短くしてもらう)
5 みんなハッピー!!

次に席が空く予定時刻を予約画面に表示するとわかりやすい！
対応席数を利用時間毎に指定できると良い?

*/


// 予約の受付
router.post('/user/reserve', function(req,res){
	let userId = req.body.userId;
	let requestHour = req.body.requestHour;
});

// 予約のQR読み込み待ち(一定秒数毎に1回たたく)
router.post('/user/wait_qr', function(req,res){
	let userId = req.body.userId;
	let reserveId = req.body.reserveId;
	connection.query("SELECT 'T' FROM reserves WHERE userId=? AND reserveId=?",[userId,reserveId], function(err,data){
		if (err){
			res.json({
				status:"ng",
				reason:"database error"
			});
		}
		if (data.length > 0){
			switch(data[0].status){
				case 0:
					res.json({
						status:"ng",
						code: "0",
						reason:"not yet loaded"
					});
					break;
				case 1:
					res.json({
						status:"ok",
						code: "1",
						reason:"start using seat ok"
					});
					break;
				case 2:
					res.json({
						status:"ok",
						code: "2",
						reason:"end using seat ok"
					});
					break;
				default:
					res.json({
						status:"ng",
						code: "9",
						reason:"unknown response"
					});
			}
		}
	});
});

// 予約の検証(QRコード読み取り端末から受付)
router.post('/admin/verify_reserve', function(req,res){
	let userId = req.body.userId;
	let reserveId = req.body.reserveId;
	console.log(userId);
	console.log(reserveId);
	// 予約データ取得
	connection.query("SELECT status,DATE_FORMAT(fromTime, '%Y-%m-%dT%TZ') AS fTime ,TIME_FORMAT(toTime, '%Y-%m-%dT%TZ') AS tTime FROM reserves WHERE userId=? AND reserveId=?",[userId,reserveId], function(err,data){
		// 取得できたら
		if (data.length > 0){
			//今の時間
			let nowTime = new Date();
			let fTime = new Date(data[0].fTime);
			let diffTime = Math.abs(nowTime-fTime);
			let diffMins = Math.round(((diffTime % 86400000) % 3600000) / 60000);
			console.log(diffMins);
			let status_value = "";
			let reason_value = "";
			//時間を過ぎている
			if (diffMins < -60){
				status_value = "ng";
				reason_value = "the reserve is time out.";
			//まだ時間じゃない
			}else if (diffMins > 3){
				status_value = "ng";
				reason_value = "the reserve is not in time.";
			// 状態問題なし
			}else if (data[0].status == 0){
				status_value = "ok";
				reason_value = "no problem";
				connection.query("UPDATE `reserves` SET `status`=1 WHERE `userId`=? AND `reserveId`=?;",[userId,reserveId], function(err, data) {});
			//予約が使用済みならエラー
			}else if (data[0].status == 1){
				status_value = "ng";
				reason_value = "the reserve is already used";
			//管理者による強制無効化
			}else if (data[0].status == -1){
				status_value = "ng";
				reason_value = "the reserve is disabled by admin";
			}
			//返事を返す
			res.json({
				status:　status_value,
				reason: reason_value
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