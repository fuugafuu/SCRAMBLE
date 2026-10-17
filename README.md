# SCRAMBLE / animated multi-face obscuration

背面カメラから複数人の顔をリアルタイム検出し、それぞれをアニメーションするSCRAMBLE風の幾何学的エフェクトで覆うWebサイト。

## 変更点

- スマホでは背面カメラを最優先で要求します (facingMode: exact environment)。右下の小さな切り替えボタンで前面・背面を変更可能。前面だけ鏡像表示。複数WebカメラのあるPCでは別デバイスにも切り替えられます。
- 前作で固定だった白黒エフェクトを **毎フレーム手続き的に描画** します。画像ファイルを貼り付けません。
- 顔を見つけた瞬間のブロック展開、常時移動する走査線と斜線、変化するグリッチ片、脈動するマーカー、顔を追う枠を組み合わせます。
- MediaPipe FaceDetector (BlazeFace short-range) が検出した複数人の顔すべてに、独立したアニメーションとトラッキングを適用。
- UIは起動ボタン、最小限のカメラ切り替えアイコン、および切り替え失敗時の短い通知のみ。余計なHUDや文字は表示しません。

## 使い方

GitHub Pages を有効化済みであれば https://fuugafuu.github.io/SCRAMBLE/ で起動できます。

GitHubの Settings → Pages → Build and deployment → Source を GitHub Actions にしてください。

ローカル起動: python -m http.server 8000 を実行し、http://localhost:8000/ をブラウザで開きます。カメラアクセスは HTTPS または localhost でのみ使えます。

### 技術上の注意

- 顔の **位置を検出** するAIであり、氏名や本人を特定する顔認証ではありません。
- カメラ映像はサーバーへアップロードしません。JavaScriptとモデルの読み込みには初回ネット接続が必要です。
- 顔検出が外れたり、検出開始直後には顔が表示されることがあります。セキュリティ用の匿名化や情報保護の保証はありません。
- 軽量なBlazeFaceは照明・距離・顔向きで失敗します。機種に応じた推論間隔の調整を実装しています。
- SCP Foundation非公式のファンメイド演出です。

テスト: node --test tests/*.test.mjs

モデル: https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js
