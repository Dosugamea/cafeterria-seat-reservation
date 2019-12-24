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
require('date-utils');

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
	//ログイン要求
	if(req.user){
		let userId = req.user;
		let seatHour = req.body.seatHour;
		let seatMinute = req.body.seatMinute;
		// 既に予約が存在するか確認
		connection.query("SELECT * FROM reserves WHERE userId=? AND qrStatus=0",
			[userId],
			function(err,data){
				if (err){
					res.json({
						status:"ng",
						reason:"database error"
					});
					return;
				}
				if (data.length > 0){
					res.redirect('/user/reserve/code');
					return;
				}
				//無ければ追加
				connection.query("INSERT INTO reserves (userId, reserveHour, reserveMinute) VALUES (?,?,?)",
					[userId, seatHour, seatMinute],
					function(err,data){
						if (err){
							res.json({
								status:"ng",
								reason:"database error"
							});
							return;
						}
						res.redirect('/user/reserve/code');
						return;
					}
				);
			}
		);
	}else{
		res.redirect('/sign_in');
	}
});

// 予約のキャンセル
router.post('/user/reserve_cancel', function(req,res){
	//ログイン要求
	if(req.user){
		let userId = req.user;
		let reserveId = req.body.reserveId;
		// 既に予約が存在するか確認
		connection.query("SELECT * FROM reserves WHERE userId=? AND reserveId=?",
			[userId,reserveId],
			function(err,data){
				if (err){
					res.json({
						status:"ng",
						reason:"database error"
					});
					return;
				}
				if (data.length == 0){
					res.json({
						status:"ng",
						reason:"not exist"
					});
					return;
				}
				//あれば削除
				connection.query("DELETE FROM reserves WHERE userId=? AND reserveId=?",
					[userId, reserveId],
					function(err,data){
						if (err){
							res.json({
								status:"ng",
								reason:"database error"
							});
						}
						res.redirect('/user');
					}
				);
			}
		);
	}else{
		res.redirect('/sign_in');
	}
});

// 予約のQR読み込み待ち(一定秒数毎に1回たたく)
router.post('/user/wait_qr', function(req,res){
	let userId = req.body.userId;
	let reserveId = req.body.reserveId;
	connection.query("SELECT 'T' FROM reserves WHERE userId=? AND reserveId=? AND qrStatus=3",[userId,reserveId], function(err,data){
		if (err){
			res.json({
				status:"ng",
				reason:"データベースエラー"
			});
		}
		if (data.length == 0){
			connection.query("SELECT 'T' FROM seats WHERE userId=? AND reserveId=? AND qrStatus=3",[userId,reserveId], function(err,data){
			
			});
		}else{
			res.json({
				status: "ng",
				reason: "座席がご用意できませんでした..."
			});
		}
	});
});

// 予約の検証(QRコード読み取り端末から受付)
router.post('/admin/verify_reserve', function(req,res){
	let userId = req.body.userId;
	let reserveId = req.body.reserveId;
	let seatId = null;
	console.log(userId);
	console.log(reserveId);
	
	// 利用時間を過ぎている席は空席にする
	connection.query("UPDATE seats SET reserveStat = '0' WHERE reservedMinute*60 - ( ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt))) < 0 AND reserveStat=1;",[], function(upderr,updresp){
		// 利用時間を過ぎていて次の人が居る場合は開始時刻を弄る
		connection.query("UPDATE seats SET reserveStat = '1' WHERE reservedMinute*60 - ( ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt))) < 0 AND reserveStat=2;",[], function(upderr2,updresp2){
			// 予約データ取得
			connection.query("SELECT * FROM reserves WHERE reserveId=? AND userId=?",[userId,reserveId], function(err,data){
				// 取得できたら
				if (data.length > 0){
					// 利用を開始するときの場合
					if (data[0].qrStatus == 0 || data[0].qrStatus == 3){
						// 空いてる席があるならまずそれを取得
						connection.query("SELECT seatID,reservedMinute FROM seats WHERE reserveStat=0 AND accept"+data[0].reserveMinute+"Minutes=1 ORDER BY RAND() LIMIT 1",[],function(getEmptySeatErr,getEmptySeatResp){
							if (resp3.length < 1){
								// 空いてる席がないなら次に座れる席を取得
								connection.query("SELECT seatID, reservedMinute, (reservedMinute*60 -(ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt)))) as diffSeconds FROM (SELECT seatID, reservedMinute, startedAt FROM seats WHERE accept"+data[0].reserveMinute+"Minutes=1 AND reserveStat=1) AS acceptableSeats ORDER BY diffSeconds DESC LIMIT 1",[], function(getNextEmptySeatErr, getNextEmptySeatResp){
									if (getNextEmptySeatResp.length < 1){
										// どうあがいても席はない(次予約を含め席が埋まっている)
										res.json({
											status:"ng"
										});
										return;
									}else{
										// 次に空く席を確保(既に処理してあるからreservedMinuteを書き換えても無問題)
										let target = getNextEmptySeatResp[0].seatID;
										connection.query("UPDATE seats SET reserveStat='2', reserveID=?, reservedMinute=? WHERE seatID=?;",[reserveId, data[0].reserveMinute, target], function(updateReserveStatErr,updateReserveStatResp){
											connection.query("UPDATE reserves SET qrStatus='3' WHERE reserveID=?;",[reserveId], function(updateReserveStatErr,updateReserveStatResp){
												res.json({
													status:"wait",
													seatID: target,
													timeMinutes: data[0].reserveMinute
												});
											});
										});
										return;
									}
								});
							}else{
								//空いてる席があったならそこを確保
								let target = getEmptySeatResp[0].seatID
								connection.query("UPDATE seats SET reserveStat='1', reserveID=?, oldReserveID=?, reservedMinute=? WHERE seatID=?;",[reserveId, reserveId, data[0].reserveMinute, target], function(err5,resp4){
									res.json({
										status:"ok",
										seatID: target,
										timeMinutes: data[0].reserveMinute
									});
									return;
								});
							}
						});
					// 席の利用を終わるとき
					}else if (data[0].qrStatus == 1){
						connection.query("UPDATE seats SET reserveStat=reserveStat-1 WHERE oldReserveID=?", [reserveId], function(upderr2, upderr2){
							res.json({
								status:"end"
							});
							return;
						});
					// 異常パラメータ
					}else{
						res.json({
							status:"ng",
							reason:"the reserve is invalid"
						});
						return;
					}
				// 取得できなければ
				}else{
					res.json({
						status:"ng",
						reason:"the reserve is invalid"
					});
					return;
				}
			});
		});
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
	if(req.user){
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
	}else{
		res.redirect('/sign_in');
	}
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