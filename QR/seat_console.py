from pynput.keyboard import Key, Listener
#from bluepy import btle
import requests


class SeatConsole():
    ENDPOINT = "http://localhost:8080/api/admin/verify_reserve"
    qrCode = ""
    
    def __init__(self):
        """ 無限に入力を待つ """
        with Listener(on_press=self.onRecieveQrCode) as listener:
            listener.join()

    def onRecieveQrCode(self,key):
        """ QRコードを読み取られたときに文字が1文字ずつ飛んでくる """
        if str(key) != 'Key.enter':
            try:
                self.qrCode += key.char[0:1]
                return
            except AttributeError:
                return
        print(self.qrCode)
        self.handler()
        
    def handler(self):
        """ メイン処理 """
        userId,reserveId = self.qrCode.split("_")
        resp = self.verifyCode(userId, reserveId)
        if resp:
            self.sendBLE(
                resp["seat_addr"],
                resp["seat_time"],
            )
        self.qrCode = ""

    def verifyCode(self, userId, reserveId):
        """ サーバーにコードを送って確認する """
        resp = requests.post(
            self.ENDPOINT,
            params={
                "userId": userId,
                "reserveId":reserveId
            }
        ).json()
        if resp["status_code"] == 200:
            return resp
        return None
    
    def sendBLE(self, seatAddress, reservedSeconds):
        """ BLEデバイスにデータを送る """
        #指定されたIDのSeatにデータ送信
        conn = btle.Peripheral(deviceAddr=seatAddress)
        #tCharList = conn.getCharacteristics()
        #tChar = next(tChar for tChar in tCharList if tChar.getHandle()==0x001b)
        #tCharList.write(reservedSeconds)
        
if __name__ == "__main__":
    cl = SeatConsole()