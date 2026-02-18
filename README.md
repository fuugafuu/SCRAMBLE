# SCRAMBLEゴーグル（原作寄せ Web版）

原作の“視界ジャック感”に寄せた、無料で動くブラウザ版です。

- スライダー無し
- モードは `SCRAMBLE` / `NORMAL` の2状態のみ
- カメラ映像に、固定チューニングしたブロック崩し・色ズレ・ノイズ帯を重畳

## 使い方

1. ローカルで配信
   - `python3 -m http.server 4173`
2. `http://localhost:4173` を開く
3. カメラ権限を許可
4. `SCRAMBLE ON/OFF` ボタンで切替

## 注意

- カメラ利用は `localhost` または HTTPS で実行してください。
