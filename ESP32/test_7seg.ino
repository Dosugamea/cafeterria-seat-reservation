#include <TM1637Display.h>


// 関数外に置くとグローバル変数
int timeCounts[] = {300, 900, 0, 0, 0};

/*
 * TM1637のディスプレイ配列
 * 
 * CLKは CLK    14からしか出ない
 * DIOは OUTPUT とりあえず 27 26 25 33 32 の最大5つに
 * VCCは 5V/3V3 その辺から引っ張り出す
 * GNDは GND    その辺から引っ張り出す
*/
TM1637Display displays[] = {
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

void setup(){
  // 輝度は最大
  for(int d=0; d < (sizeof displays / sizeof displays[0]); d++){
    displays[d].setBrightness(0x0a);
  }
}

void loop(){
  for(int d=0; d < (sizeof displays / sizeof displays[0]); d++){
    displays[d].showNumberDecEx(getDisplayNumber(d), 0x40, true);
    if (timeCounts[d] > 0){
      timeCounts[d] -= 1;
    }
  }
  delay(1000);
}
