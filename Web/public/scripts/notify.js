var qrTimer = setInterval("readQrResponse()", 2500);
 
// reservesテーブルから 処理結果を取得しモーダル表示する
function readQrResponse(){
	var reserveID = document.getElementById('reserveID').textContent;
	var xhr = new XMLHttpRequest();
	var urlEncodedData = "reserveID=" + reserveID;
	xhr.open('POST', "http://192.168.1.12:3000/user/wait_qr");
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.send(urlEncodedData);
	xhr.onreadystatechange = function() {
	  if(xhr.readyState === 4 && xhr.status === 200) {
		var data = JSON.parse(xhr.responseText);
		if (data.message != "不正な予約番号です" && data.message != "None"){
			var elem = document.getElementById('qrText');
			elem.textContent = data.message;
			$('#qrModal').modal('show');
		}else if (data.message == "不正な予約番号です"){
			clearInterval(qrTimer);
		}
	  }
	}
}