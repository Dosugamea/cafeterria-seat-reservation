#include "BLEDevice.h"
#include "BLEUtils.h"
#include "BLEScan.h"
#include "BLEAdvertisedDevice.h"

/*
 * iBeaconを扱うクラスはこちらで貼られていたものを加工しありがたく使用させて頂きました。
 * http://blog.livedoor.jp/sce_info3-craft/archives/9717154.html
 * 
 * 参考
 * https://ukuleledev.exblog.jp/22592036/
 * http://www.musashinodenpa.com/arduino/ref/index.php?f=0&pos=1462
 * https://randomnerdtutorials.com/esp32-bluetooth-low-energy-ble-arduino-ide/
 * http://marchan.e5.valueserver.jp/cabin/comp/jbox/arc212/doc21202.html
 * 
 * UUIDは 8桁-4桁-4桁-4桁-12桁
 * 1204(seatId)-seqId(上4)-seqId(下4)-time(4)-検証用のデータ合計*100
 * それぞれのデータはHex(16進)
 * 
 */

/* 
 *  iBeaconを扱うクラス
 */
class iBeacon{
  private:
    String uuid;
    uint16_t major;
    uint16_t minor;
    int rssi;
    bool beacon_stat;
  public:
    iBeacon(BLEAdvertisedDevice advertisedDevice){
      char work[7];
      String hexString = (String) BLEUtils::buildHexData(
          nullptr,
          (uint8_t*)advertisedDevice.getManufacturerData().data(),
          advertisedDevice.getManufacturerData().length()
      );
      if (hexString.substring(0, 8).equals("4c000215")) {
        uuid =  hexString.substring(8, 16) + "-" + 
                hexString.substring(16, 20) + "-" + 
                hexString.substring(20, 24) + "-" + 
                hexString.substring(24, 28) + "-" + 
                hexString.substring(28, 40);  
        ("0x" + hexString.substring(40, 44)).toCharArray(work, 7);
        major = (uint16_t) atof(work);
        ("0x" + hexString.substring(44, 48)).toCharArray(work, 7);
        minor = (uint16_t) atof(work);
        rssi = advertisedDevice.getRSSI();
        beacon_stat = true;
      } else {
        beacon_stat = false;
      }
    }
    bool isBeacon(){
      return beacon_stat;  
    }
    String getUUID() {
      return uuid;
    }
    uint16_t getMajor() {
      return major;
    }
    uint16_t getMinor() {
      return minor;
    }
    int getRSSI() {
      return rssi;
    }
};

/*
 * UUIDからデータを取り出す関数
 */
int StrToInt(String dataHex){
  int len = dataHex.length();
  char buf[30];
  dataHex.toCharArray(buf, len+1);
  return (int) strtol(buf, 0, 16);
}

unsigned long StrToLong(String dataHex){
  int len = dataHex.length();
  char buf[30];
  dataHex.toCharArray(buf, len+1);
  return (unsigned long) strtol(buf, 0, 16);
}

int getSeatId(String uuid){
  String seatData = uuid.substring(4,8);
  int seatId = StrToInt(seatData);
  return seatId;
}

unsigned long getSequenceId(String uuid){
  String upperData = uuid.substring(9,13);
  String lowerData = uuid.substring(14,18);
  String seqData = upperData + lowerData;
  unsigned long seqId = StrToLong(seqData);
  return seqId;
}

int getTimeSeconds(String uuid){
  String timeData = uuid.substring(19,23);
  int timeSeconds = StrToInt(timeData);
  return timeSeconds;
}

unsigned long getVerifyData(String uuid){
  String verifyData = uuid.substring(24,36);
  unsigned long verifyLong = StrToLong(verifyData);
  return verifyLong;
}

bool isCorrectData(int seatId, unsigned long seqId, int timeSeconds, unsigned long verifyData){
  Serial.printf("SeatId: %d\n", seatId);
  Serial.printf("SeqId: %d\n", seqId);
  Serial.printf("TimeSeconds: %d\n", timeSeconds);
  //Serial.printf("VerifyData: %d\n", verifyData);
  unsigned long totalData = 100*(seatId+seqId+(timeSeconds/60));
  if (totalData == verifyData){
    return true;  
  }else{
    return false;  
  }
}


/*
 * グローバル変数
 */

BLEScan* pBLEScan;
// スキャン時間: 2秒でほぼ確実に捕まる
int scanTime = 2;
int sequenceId = -1;
int seatId = -1;
 
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    // アドバタイジングデータを受け取ったとき
    void onResult(BLEAdvertisedDevice advertisedDevice) {
      iBeacon bacon(advertisedDevice);
      if (bacon.isBeacon()){
        String uuidStr = bacon.getUUID();
        if (uuidStr.startsWith("1204")){
          Serial.printf("UUID: ??, Major: %d, Minor: %d, RSSI: %d \n", bacon.getMajor(), bacon.getMinor(), bacon.getRSSI());
          int seatId = getSeatId(uuidStr);
          unsigned long seqId = getSequenceId(uuidStr);
          int timeSeconds = getTimeSeconds(uuidStr);
          unsigned long verifyData = getVerifyData(uuidStr);
          if (isCorrectData(seatId,seqId,timeSeconds,verifyData)){
            Serial.printf("This bacon looks nice bacon!\n");  
          }else{
            Serial.printf("This bacon is over cooked!\n");
          }
        }
      }
    }
};
 
void setup() {
  Serial.begin(115200);
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan(); //create new scan
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true); //active scan uses more power, but get results faster
}
 
void loop() {
  BLEScanResults foundDevices = pBLEScan->start(scanTime);
}
