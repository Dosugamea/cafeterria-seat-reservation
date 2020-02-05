const express = require('express');
const router = require('express-promise-router')();
const passport = require('passport');
const mysql = require('mysql2');
const connection = mysql.createConnection({
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
		let userID = req.user;
		let seatHour = req.body.seatHour;
		let seatMinute = req.body.seatMinute;
		// 既に予約が存在するか確認
		connection.query("SELECT * FROM reserves WHERE userID=? AND qrStatus=0",
			[userID],
			function(err,data){
				if (err){
					res.json({
						status:"ng",
						reason:"database select error"
					});
					return;
				}
				if (data.length > 0){
					res.redirect('/user/reserve/code');
					return;
				}
				//無ければ追加
				connection.query("INSERT INTO reserves (userID, reserveHour, reserveMinute) VALUES (?,?,?)",
					[userID, seatHour, seatMinute],
					function(err,data){
						if (err){
							res.json({
								status:"ng",
								code: err,
								reason:"database insert error"
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
		let userID = req.user;
		let reserveID = req.body.reserveID;
		// 既に予約が存在するか確認
		connection.query("SELECT * FROM reserves WHERE userID=? AND reserveID=?",
			[userID,reserveID],
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
				connection.query("DELETE FROM reserves WHERE userID=? AND reserveID=?",
					[userID, reserveID],
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
	let reserveID = req.body.reserveID;
	console.log(reserveID);
	connection.query("SELECT message FROM reserves WHERE reserveID=?",[reserveID], function(err,data){
		if (err){
			res.json({
				message:"データベースエラーです"
			});
			return;
		}else{
			if (data.length > 0){
				connection.query("UPDATE reserves SET message = 'None' WHERE reserveID=?",[reserveID], function(err2,data2){
					if(err2){
						console.log(err2);
						return;
					}else{
						res.json({
							message: data[0].message
						});
						return;
					}
				});
			}else{
				res.json({
					message:"不正な予約番号です"
				});
				return;
			}
		}
	});
});


// 時間切れの席のreserveStatを変更する
function updateReserveStatOnTimeOverSeat() {
    return new Promise((resolve) => {
		connection.query(
			"SELECT * FROM seats WHERE reserveMinute*60 - ( ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt))) < 0 AND reserveStat > 0;",
			[],
			function(err1,resp1){
				if (err1){
					console.log(err1);
					resolve(null);
				}else{
					for (let forceLeave of resp1){
						console.log("forceLeaveing");
						let reserveID = forceLeave.oldReserveID;
						connection.query(
							"UPDATE reserves SET qrStatus=2 WHERE reserveID=?",
							[reserveID],
							function(err2,resp2){
								if (err2){
									console.log(err);
									resolve(null);
								}
							}
						);
					}
					console.log("UPDATE");
					connection.query(
						"UPDATE seats SET reserveStat = reserveStat-1, oldReserveID=reserveID WHERE reserveMinute*60 - ( ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt))) < 0 AND reserveStat > 0;",
						[],
						function(err3,resp3){
							if (err3){
								console.log(err3);
								resolve(null);
							}else{
								resolve(true);
							}
						}
					);
				}
			}
		);
    });
}

// 予約データ取得
function getReservedData(userID,reserveID){
    return new Promise((resolve) => {
		connection.query("SELECT * FROM reserves WHERE userID=? AND reserveID=?",[userID,reserveID], function(err,resp){
			if (err){
				resolve(null);
			}else{
				if (resp.length > 0){
					resolve(resp[0]);
				}else{
					resolve(null);
				}
			}
		});
    });
}

// 空席データ取得
function getEmptySeatData(reserveMinute){
	return new Promise((resolve) => {
		connection.query(
			"SELECT seatID,reserveMinute FROM seats WHERE reserveStat=0 AND accept"+reserveMinute+"Minutes=1 ORDER BY RAND() LIMIT 1",
			[],
			function(err,resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					if (resp.length > 0){
						resolve(resp[0]);
					}else{
						resolve(null);
					}
				}
			}
		);
    });
}

// 空席にデータを配置
function setSeatData(reserveID,reserveMinute,targetSeatID){
	return new Promise((resolve) => {
		connection.query(
			"UPDATE seats SET reserveStat=1, reserveID=?, oldReserveID=?, reserveMinute=?, startedAt=CURRENT_TIMESTAMP() WHERE seatID=?",
			[reserveID, reserveID, reserveMinute, targetSeatID],
			function(err,resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					resolve(true);
				}
			}
		);
    });
}

// 次に空席になる場所を取得
function getNextEmptySeatData(reserveMinute){
	return new Promise((resolve) => {
		connection.query(
			"SELECT seatID, reserveMinute, (reserveMinute*60 -(ABS(TIMESTAMPDIFF(MINUTE,CURRENT_TIMESTAMP(),startedAt)) * 60 + ABS(TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP(),startedAt)))) as diffSeconds FROM (SELECT seatID, reserveMinute, startedAt FROM seats WHERE accept"+reserveMinute+"Minutes=1 AND reserveStat=1) AS acceptableSeats ORDER BY diffSeconds DESC LIMIT 1",
			[],
			function(err, resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					if (resp.length > 0){
						resolve(resp[0]);
					}else{
						resolve(null);
					}
				}
			}
		);
    });
}

// 次に空席になる場所にデータを配置
function setNextSeatData(reserveID, reserveMinute, seatID){
	return new Promise((resolve) => {
		connection.query(
			"UPDATE seats SET reserveStat=2, reserveID=?, reserveMinute=? WHERE seatID=?",
			[reserveID, reserveMinute, seatID],
			function(err, resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					resolve(true);
				}
			}
		);
    });
}

// スマホに通知するメッセージを指定する(同時にqrStatusも更新する)
function setReserveMessage(reserveID, message, qrStatus){
	return new Promise((resolve) => {
		connection.query(
			"UPDATE reserves SET message=?,qrStatus=? WHERE reserveID=?",
			[message, qrStatus, reserveID],
			function (err,resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					resolve(true);
				}
			}
		);
	});
}

// 使用中の座席を取得
function getUsingSeat(reserveID){
	return new Promise((resolve) => {
		connection.query(
			"SELECT * FROM seats WHERE oldReserveID=?",
			[reserveID],
			function (err,resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					resolve(resp[0]);
				}
			}
		);
	});
}

// 座席を離れる
function leaveSeat(seatID){
	return new Promise((resolve) => {
		connection.query(
			"UPDATE seats SET reserveStat = reserveStat-1, oldReserveID=reserveID WHERE seatID=?",
			[seatID],
			function (err,resp){
				if (err){
					console.log(err);
					resolve(null);
				}else{
					resolve(true);
				}
			}
		);
	});
}

// 予約の検証(QRコード読み取り端末から受付)
router.post('/admin/verify_reserve', async function(req,res){
	let userID = req.body.userID;
	let reserveID = req.body.reserveID;
	let seatID = null;
	console.log(userID);
	console.log(reserveID);
	//時間切れの席の情報を更新
	const updateReserveStatOnTimeOverSeatResponse = await updateReserveStatOnTimeOverSeat();
	// 予約データ取得
	const reservedDataResponse = await getReservedData(userID,reserveID);
	// 存在しなければエラー
	if (reservedDataResponse == null){
		res.json({
			status:"ng",
			reason:"the reserve is invalid"
		});
		return;
	}
	// 予約していた分数を指定
	let reserveMinute = reservedDataResponse.reserveMinute;
	// 席の利用を始めるとき
	if (reservedDataResponse.qrStatus == 0){
		// 空いてる席があるか確認
		let emptySeatResponse = await getEmptySeatData(reserveMinute);
		if (emptySeatResponse != null){
			// 空いている席を確保
			let seatID = emptySeatResponse.seatID;
			let setSeatDataResponse = await setSeatData(
				reserveID,
				reserveMinute,
				seatID
			);
			let setReserveMessageResponse = await setReserveMessage(
				reserveID,
				seatID + "番の席へお進みください",
				1
			)
			res.json({
				status:"ok",
				reserveMinute: reserveMinute,
				seatID: seatID
			});
			return;
		}else{
			// 次に空く席があるか
			let nextEmptySeatResponse = await getNextEmptySeatData(reserveMinute);
			if (nextEmptySeatResponse != null){
				// 次に空く席を確保(既に処理してあるからreserveMinuteを書き換えても無問題)
				let seatID = nextEmptySeatResponse.seatID;
				let setNextSeatDataResponse = await setNextSeatData(
					reserveID,
					reserveMinute,
					seatID
				);
				let setReserveMessageResponse = await setReserveMessage(
					reserveID,
					seatID + "番の席へお進みください。 (約" + nextEmptySeatResponse.diffSeconds + "秒お待ち下さい)",
					1
				)
				res.json({
					status:"wait",
					reserveMinute: reserveMinute,
					seatID: seatID
				});
				return;
			}else{
				// どうあがいても席はない(次予約を含め席が埋まっている)
				let setReserveMessageResponse = await setReserveMessage(
					reserveID,
					"申し訳ありませんが空いている席がありません、少し待ってから再度かざしてください。",
					0
				)
				res.json({
					status:"ng",
					reason: "empty seat was not found"
				});
				return;
			}
		}
	// 席の利用を終えるとき
	}else{
		let getUsingSeatResponse = await getUsingSeat(reserveID);
		if (getUsingSeatResponse.reserveStat > 0){
			let leaveSeatResponse = await leaveSeat(getUsingSeatResponse.seatID);
		}
		let setReserveMessageResponse = await setReserveMessage(
			reserveID,
			"ご利用ありがとうございました。",
			2
		)
		res.json({
			status:"end",
			reserveMinute: 0,
			seatID: getUsingSeatResponse.seatID
		});
		return;
	}
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
		connection.query("SELECT passwd FROM `users` WHERE passwd=? AND userID=?",[ac_opass,req.user], function(err, data) {
			if(data.length > 0){
				connection.query("UPDATE `users` SET `passwd`=? WHERE `userID`=?;",[ac_npass,req.user], function(err, data) {
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