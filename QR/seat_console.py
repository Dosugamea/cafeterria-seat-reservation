from pynput.keyboard import Key, Listener
from bluetooth.ble import BeaconService
from time import sleep
import requests

with open("sequenceData.txt","r") as f:
    seqID = int(f.read())
ENDPOINT = "http://192.168.1.12:3000/admin/verify_reserve"
qrCode = ""
service = BeaconService()

def generateDataUUID(mode, seatId, sequenceId, timeMinutes):
    '''データを含むUUIDを作成する'''
    modeStr = str(hex(mode)).replace("0x","").zfill(1)
    seatStr = str(hex(seatId)).replace("0x","").zfill(4)
    seqIdStr = str(hex(sequenceId)).replace("0x","").zfill(8)
    timeStr = str(hex(timeMinutes * 60)).replace("0x","").zfill(4)
    verifyStr = str(hex((seatId+sequenceId+timeMinutes)*100)).replace("0x","").zfill(12)
    # print("VerifyNum is %s"%((seatId+sequenceId+timeMinutes)*100))
    return "124" + modeStr + seatStr + "-" + seqIdStr[:4] + "-" + seqIdStr[4:]+ "-" + timeStr + "-" + verifyStr

def verifyReserve(userID, reserveID):
    try:
        resp = requests.post(ENDPOINT,data={"userID":userID,"reserveID":reserveID})
        print(resp.text)
        return resp.json()
    except:
        return {"status":"ng"}

def recieveQrCode(key):
    global qrCode
    global seqID
    """ QRコードを読み取られたときに文字が1文字ずつ飛んでくる """
    if str(key) != 'Key.enter':
        # 1文字追加して脱出
        try:
            qrCode += key.char[0:1]
            return
        except AttributeError:
            return
    # QRコード読み取り完了
    print(qrCode)
    # 変なコードは拒否
    if "=" not in qrCode:
        return
    # コードを分解して　サーバに問い合わせ
    userID,reserveID = qrCode.split("=")
    resp = verifyReserve(userID, reserveID)
    qrCode = ""
    # 存在しない予約
    if resp["status"] == "ng":
        return
    # 座席利用開始 / 座席利用開始(次を取る) / 利用終了
    modeDict = {
        "ok": 0,
        "wait": 1,
        "end": 2
    }
    mode = modeDict[resp["status"]]
    uuid = generateDataUUID(mode, resp["seatID"], seqID, resp["reserveMinute"])
    print(uuid)
    seqID += 1
    with open("sequenceData.txt","w") as f:
        f.write(str(seqID))
    service.start_advertising(uuid, 1, 1, 1, 100)
    sleep(2)
    service.stop_advertising()
        
with Listener(on_press=recieveQrCode) as listener:
    listener.join()


'''
UUIDは 8桁-4桁-4桁-4桁-12桁
124(mode)(seatId)-seqId(上4)-seqId(下4)-time(4)-検証用のデータ合計*100
それぞれのデータはHex(16進)
'''

# <Parametors>
#  str uuid="11111111-2222-3333-4444-555555555555",
#  int major=1 // 2Byte Big region Id
#  int minor=1, // 2Byte  Mini region Id
#  int txpower=1 // 2Byte How far
#   https://qiita.com/shu223/items/7c4e87c47eca65724305
#  int interval=200 // Notify interval
#   https://qiita.com/ksksue@github/items/0811fd62bd970fa93337
#
#  From
#   https://bitbucket.org/OscarAcena/pygattlib/src/default/src/beacon.h