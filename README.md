# SCRAMBLE — Multi-face Camera Effect

スマホ/PCのカメラから、複数人の顔へ画像参照に近い白黒の幾何学的エフェクトをリアルタイム表示するWebサイト。

## 実装内容
- Google MediaPipe Tasks Vision / BlazeFace short-range (実際の学習済み顔検出モデル)
- 複数顔の同時検出、位置・速度と重なり率による追跡、平滑化、検出ロスト時のフェード
- カメラと認識フレームは両方同じ座標で自撮り反転
- フルスクリーン。初回の「カメラを起動」以外の余計なUIはなし
- カメラ映像・顔データはサーバーへアップロードせず、ブラウザ上で処理
- 名前などの個人識別・顔照合は実装していません（顔の位置検出のみ）

## 公開
Settings → Pages → Build and deployment → Source → GitHub Actions を最初に一度設定。
GitHub Actions ワークフローにより main 更新でサイトを公開。

Pages有効化後のアドレス: https://fuugafuu.github.io/SCRAMBLE/

## ローカルで動かす
1. Pythonで `python -m http.server 8000`
2. http://localhost:8000/ を開く
3. 「カメラを起動」→ブラウザから許可

カメラ利用には HTTPS または localhost が必要です。ライブラリとモデルは初回にインターネットから取得します。顔が小さい場合、暗所、遮蔽物、端末の処理能力によって精度・FPSは変わります。

モデル資料: https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js

※SCP財団の公式製品ではありません。ファンメイドの演出です。
