from pynput.keyboard import Key, Listener

qr_data = ''

def on_press(key):
    global qr_data
    # 1文字ずつqr_dataに
    if str(key) != 'Key.enter':
        try:
            qr_data += key.char[0:1]
            return
        except AttributeError:
            return
    # 最後はenter入力になる
    else:
        print(qr_data)


if __name__ == '__main__':
    with Listener(on_press=on_press,) as listener:
        listener.join()