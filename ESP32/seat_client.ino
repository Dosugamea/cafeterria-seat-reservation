#include "BLEDevice.h"
#include "BLEScan.h"
#include "BLEAdvertisedDevice.h"
#include "TM1637Display.h"

/*
 *  座席クライアント設定
 */

// 席IDの開始値(この場合 1-5までを受け付ける)
static int SEAT_NO = 1;
static int SEAT_COUNT = 5;


/*
 *  7セグLED関連
 *  　参考
 *   　https://www.denshi.club/cookbook/output/led/7seg/7led74-tm1637.html
 */
int timeCounts[] = {300, 900, 300, 0, 0};
TM1637Display displays[5] = {
  TM1637Display(A16,A17),
  TM1637Display(A16,A19),
  TM1637Display(A16,A18),
  TM1637Display(A16,A5),
  TM1637Display(A16,A4)
};

int getDisplayNumber(int displayId){
  int seconds = timeCounts[displayId] % 60;
  int minutes = (int)timeCounts[displayId] / 60;
  return minutes*100 + seconds;
}


/*
 * BLE関連
 * 
 * 参考
 *  http://blog.livedoor.jp/sce_info3-craft/archives/9717154.html
 *  https://ukuleledev.exblog.jp/22592036/
 *  http://www.musashinodenpa.com/arduino/ref/index.php?f=0&pos=1462
 *  https://randomnerdtutorials.com/esp32-bluetooth-low-energy-ble-arduino-ide/
 *  http://marchan.e5.valueserver.jp/cabin/comp/jbox/arc212/doc21202.html
 * 
 *  UUIDは 8桁-4桁-4桁-4桁-12桁
 *  1204(seatId)-seqId(上4)-seqId(下4)-time(4)-検証用のデータ合計*100
 */
BLEScan* pBLEScan;
int scanTime = 1;
unsigned long internalSeqId = -1;

class SeatBeacon{
  private:
    bool validBeacon = false;
    int seatId = -1;
    unsigned long seqId = -1;
    int timeSeconds = -1;
    unsigned long verifyData = -1;
  public:
    SeatBeacon(BLEAdvertisedDevice advertisedDevice){
        int manuLen = advertisedDevice.getManufacturerData().length();
        if (manuLen == 25){
          String hexString = (String) BLEUtils::buildHexData(
              nullptr,
              (uint8_t*)advertisedDevice.getManufacturerData().data(),
              manuLen
          );
          if (hexString.substring(0, 12).equals("4c0002151204")){
            seatId = this-> StrToInt(hexString.substring(13, 16));
            seqId = this-> StrToLong(hexString.substring(17, 24));
            timeSeconds = this-> StrToInt(hexString.substring(25, 28));
            verifyData = this-> StrToLong(hexString.substring(29, 40));
            unsigned long totalData = 100*(seatId+seqId+(timeSeconds/60));
            if (totalData == verifyData){
              validBeacon = true;
            }else{
              validBeacon = false;  
            }
          }
        }
      }
    bool isBeacon() { return validBeacon; }
    int getSeatId() { return seatId; }
    unsigned long getSeqId() { return seqId; }
    int getTimeSeconds() { return timeSeconds; }
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
};
 
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
      SeatBeacon bacon(advertisedDevice);
      if (bacon.isBeacon()){
        int seatId = bacon.getSeatId();
        unsigned long seqId = bacon.getSeqId();
        int timeSeconds = bacon.getTimeSeconds();
        int targetSeatId = seatId - SEAT_NO;
        if ( seqId > internalSeqId){
          internalSeqId = seqId;
        }
        if ( (targetSeatId >= (SEAT_NO-1)) && (targetSeatId < (SEAT_COUNT+SEAT_NO)) ){
          timeCounts[targetSeatId] = timeSeconds;
          Serial.printf("[TIME CHANGE REQUEST]\n");
          Serial.printf("SeatId: %d\n", seatId);
          Serial.printf("targetSeatId: %d\n", targetSeatId);
          Serial.printf("Time: %d\n", timeSeconds); 
        }
      }
    }
};


/*
 * セットアップ
 * 
 * デュアルコアの参考
 * 　https://www.mgo-tec.com/blog-entry-arduino-esp32-multi-task-dual-core-01.html
 * タイマー割込みの参考
 *  https://brown.ap.teacup.com/nekosan0/3625.html
 */
TaskHandle_t task_handler[2];
volatile int interruptCounter;
hw_timer_t * timer = NULL;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;
void IRAM_ATTR onTimer() {
  portENTER_CRITICAL_ISR(&timerMux);
  interruptCounter++;
  portEXIT_CRITICAL_ISR(&timerMux);
}

void setup() {
  Serial.begin(115200);
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);
  for(int d=0; d < SEAT_COUNT; d++){
    displays[d].setBrightness(0x0a);
  }
  timer = timerBegin(0, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 100000, true);
  timerAlarmEnable(timer);
  xTaskCreatePinnedToCore(
     bleFinder,
     "bleFinder",
     4096,
     NULL,
     5,
     &task_handler[1],
     0
  );
  xTaskCreatePinnedToCore(
     countdownTimer,
     "countdownTimer",
     4096,
     NULL,
     2,
     &task_handler[0],
     1
  );
}


/*
 *  コア1 ループ: カウントダウン処理
 *  　0.99997秒毎に1ループする
 */
void countdownTimer(void *pvParameters){
  while(1){
    if (interruptCounter > 0) {
      portENTER_CRITICAL(&timerMux);
      interruptCounter--;
      portEXIT_CRITICAL(&timerMux);
      for(int d=0; d < SEAT_COUNT; d++){
        displays[d].showNumberDecEx(getDisplayNumber(d), 0x40, true);
        if (timeCounts[d] > 0){
          timeCounts[d] -= 1;
        }
      }
    } 
  }
}

/*
 *  コア0 ループ: BLEスキャン
 *  　処理の中身はコールバックに
 */
void bleFinder(void *pvParameters){
  while(1){
      BLEScanResults foundDevices = pBLEScan->start(scanTime);
  }
}

void loop(){
  delay(1000);  
}
