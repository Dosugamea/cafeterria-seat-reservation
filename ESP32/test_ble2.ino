#include "BLEDevice.h"
#include "BLEUtils.h"
#include "BLEScan.h"
#include "BLEAdvertisedDevice.h"
 
int scanTime = 1; //In seconds
 
class iBeacon{
  private:
    String uuid;
    bool beacon_stat = false;
  public:
    iBeacon(BLEAdvertisedDevice advertisedDevice){
        int manuLen = advertisedDevice.getManufacturerData().length();
        // iBeaconは長さ25 (10以下に対応するとたまにクラッシュするみたい)
        if (manuLen == 25){
          String hexString = (String) BLEUtils::buildHexData(
              nullptr,
              (uint8_t*)advertisedDevice.getManufacturerData().data(),
              manuLen
          );
          if (hexString.substring(8, 12).equals("1204")){
            uuid =  hexString.substring(8, 16) + "-" + 
                    hexString.substring(16, 20) + "-" + 
                    hexString.substring(20, 24) + "-" + 
                    hexString.substring(24, 28) + "-" + 
                    hexString.substring(28, 40);
            beacon_stat = true;
          }
        }
      }
    String getUUID() { return uuid; }
    bool isBeacon() { return beacon_stat; }
};
 
BLEScan* pBLEScan;
 
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
      // アドバタイジングデータを受け取ったとき
      iBeacon ibcn = iBeacon(advertisedDevice);  
    }
};


// 75 クラッシュ
int counter = 0;
 
void setup() {
  Serial.begin(115200);
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan(); //create new scan
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true); //active scan uses more power, but get results faster
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
}
 
void loop() {
  BLEScanResults foundDevices = pBLEScan->start(scanTime, false);
  Serial.printf("Counter: %d\n", counter);
  pBLEScan->clearResults();
  counter += 1;
}
