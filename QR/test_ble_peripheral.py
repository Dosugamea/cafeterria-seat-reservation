'''

 PyBleno を使った ペリフェラル(サーバ) サンプルプログラム
 
 
 bleno で Raspberry Pi を BLE Peripheral として動かしてみる
 https://qiita.com/comachi/items/c494e0d6c6d1775a3748#%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0-1

 bleとは
 http://jellyware.jp/kurage/bluejelly/ble_guide.html
'''

from pybleno import *
import time

#　メインで判別に使わせるUUID(好きなのを)
APPROACH_SERVICE_UUID = '13A28130-8883-49A8-8BDB-42BC1A7107F4'
# サービスの判別に使わせるUUID(好きなのを)
APPROACH_CHARACTERISTIC_UUID = 'A2935077-201F-44EB-82E8-10CC02AD8CE1'

# データ送信サービス
class ApproachCharacteristic(Characteristic):
    def __init__(self):
        Characteristic.__init__(self, {
            'uuid': APPROACH_CHARACTERISTIC_UUID,
            'properties': ['read', 'notify'],
            'value': None
        })
        self._value = 0
        self._updateValueCallback = None

    # 読み取り要求
    def onReadRequest(self, offset, callback):
        print('ApproachCharacteristic - onReadRequest')
        #自分自身の値を渡す
        callback(Characteristic.RESULT_SUCCESS, self._value)

    # 接続要求
    def onSubscribe(self, maxValueSize, updateValueCallback):
        print('ApproachCharacteristic - onSubscribe')
        self._updateValueCallback = updateValueCallback
    
    # 接続要求
    def onUnsubscribe(self):
        print('ApproachCharacteristic - onUnsubscribe')
        self._updateValueCallback = None
#ここで作っておかないとあとで参照できない()
approachCharacteristic = ApproachCharacteristic()

# 送信開始時の処理
def onAdvertisingStart(error):
    print('on -> advertisingStart: ' + ('error ' + error if error else 'success'))
    if not error:
        bleno.setServices([
            BlenoPrimaryService({
                'uuid': APPROACH_SERVICE_UUID,
                'characteristics': [
                    approachCharacteristic
                ]
            })
        ])
# サービス作成時の処理
def onStateChange(state):
    if (state == 'poweredOn'):
        bleno.startAdvertising('Approach', [APPROACH_SERVICE_UUID])
    else:
        bleno.stopAdvertising()


# Blenoのセットアップ
bleno = Bleno()
bleno.on('stateChange', onStateChange)
bleno.on('advertisingStart', onAdvertisingStart)
bleno.start()

# 番号を変えていく (blenoはスレッド化しなくていいらしい)
counter = 0
while True:
    counter += 1
    approachCharacteristic._value = counter
    if approachCharacteristic._updateValueCallback:
        print('Sending notification with value : ' + str(approachCharacteristic._value))
        notificationBytes = str(approachCharacteristic._value).encode()
        approachCharacteristic._updateValueCallback(notificationBytes)
    time.sleep(1)