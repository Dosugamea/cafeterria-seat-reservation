from random import randint
from time import sleep
from bluetooth.ble import BeaconService

'''
UUIDは 8桁-4桁-4桁-4桁-12桁
1204(seatId)-seqId(上4)-seqId(下4)-time(4)-検証用のデータ合計*100
それぞれのデータはHex(16進)
'''
def generateDataUUID(seatId, sequenceId, timeMinutes):
    '''データを含むUUIDを作成する'''
    seatStr = str(hex(seatId)).replace("0x","").zfill(4)
    seqIdStr = str(hex(sequenceId)).replace("0x","").zfill(8)
    timeStr = str(hex(timeMinutes * 60)).replace("0x","").zfill(4)
    verifyStr = str(hex((seatId+sequenceId+timeMinutes)*100)).zfill(12)
    return f"1204{seatStr}-{seqIdStr[:4]}-{seqIdStr[4:]}-{timeStr}-{verifyStr}" 
 
seatId = 1
seqId = 1
timeMinutes = 15

service = BeaconService()
print("Start advertising...")
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
service.start_advertising("11111111-2222-3333-4444-555555555555", 1, 1, 1, 100)
try:    
    while True:
        sleep(1)
except:
    print("Stop")