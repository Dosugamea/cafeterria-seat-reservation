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
 */

// iBeaconを扱うクラス
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

int scanTime = 2; //In seconds
BLEScan* pBLEScan;
 
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    // アドバタイジングデータを受け取ったとき
    void onResult(BLEAdvertisedDevice advertisedDevice) {
      iBeacon bacon(advertisedDevice);
      if (bacon.isBeacon()){
        char uuid[37];
        bacon.getUUID().toCharArray(uuid, 37);
        Serial.printf("UUID: %s, Major: %d, Minor: %d, RSSI: %d \n", uuid, bacon.getMajor(), bacon.getMinor(), bacon.getRSSI());
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
