# BetterCrewLink

BetterCrewLinkは、Among Us 向け近接ボイスチャットアプリ [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) をベースに、日本語環境で使いやすいよう調整している非公式フォークです。

元プロジェクトは [CrewLink](https://github.com/ottomated/CrewLink) のフォークで、このリポジトリもその流れを引き継いでいます。Among Us、Innersloth、CrewLink、BetterCrewLink の公式プロジェクトとは別の非公式版です。

## このフォークについて

- 日本語 UI / 日本語説明を中心に調整しています。
- BetterCrewLink の機能をベースに、国内プレイヤー向けの使いやすさを優先しています。
- キノコカオスやカモフラージュ系の状態に合わせたボイスエフェクト調整を追加しています。
- Windows を主な対象にしつつ、Linux 版 AppImage 対応も進めています。

## 主な機能

- Among Us の位置情報に連動した近接ボイスチャット
- 死亡者、インポスター、会議中などの状態に応じた音声制御
- オーバーレイ表示
- マイク / スピーカー選択
- マイク音量、感度、ノイズ抑制、エコーキャンセル設定
- プレイヤーごとの音量調整
- ロビー設定の同期
- カスタムボイスサーバーの複数登録と切り替え
- キノコカオス / カモフラージュ時のボイスエフェクト(未テストのため、動作確認お願いします！バグがあれば報告をお願いします！)
- ボイスエフェクト強度の調整とテスト再生

## ダウンロード

配布版を使う場合は、このフォークの Releases から最新版をダウンロードしてください。

[Releases](https://github.com/kuretoshi/BetterCrewLink/releases)

Windows では `BetterCrewLink-Setup-x.x.x.exe` を実行してインストールします。Among Us の状態を読むためにプロセスへアクセスするため、環境によってはセキュリティソフトの警告が出る場合があります。

### Linux 版について

Linux 版は AppImage での配布を目標に対応中です。Among Us を Proton / Wine 経由で起動している環境を想定しています。

現時点では以下の点に注意してください。

- X11 環境を前提にしています。Wayland 環境ではオーバーレイやグローバルキー入力が正常に動かない可能性があります。
- Among Us のメモリを読むため、環境によっては `ptrace` 権限の調整が必要です。
- ネイティブモジュールのビルドに `build-essential`、`python3`、`libx11-dev`、`libxcb1-dev` などが必要になる場合があります。

Ubuntu / Debian 系で開発ビルドする場合の例:

```bash
sudo apt update
sudo apt install -y build-essential python3 pkg-config libx11-dev libxcb1-dev libcap2-bin
npm install
npm run dist:linux
```

実行時に Among Us を検出できない場合は、開発中の暫定対応として以下のどちらかを試してください。

```bash
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
```

または、Wine 側へ ptrace 権限を付与します。

```bash
sudo setcap cap_sys_ptrace=eip "$(command -v wineserver)"
```

## 使い方

1. BetterCrewLink を起動します。
2. Among Us を起動します。
3. 同じロビーにいる参加者も BetterCrewLink を起動します。
4. 必要に応じてマイク、スピーカー、音量、ボイスエフェクトを設定します。

全員が同じボイスサーバーを使っている必要があります。接続できない場合は、設定のサーバー URL やネットワーク状態を確認してください。

## ボイスエフェクト

このフォークでは、キノコカオスやカモフラージュ系の状態に合わせて声にエフェクトをかけられます。

設定画面の `ボイスエフェクトの強さ` で効果量を調整できます。`ボイスエフェクトテスト` を使うと、実際にどのように聞こえるか確認できます。

## 開発

### 必要なもの

- Node.js 22.12.0 以上
- npm
- Git
- Windows でビルドする場合は Windows 環境

### セットアップ

```powershell
git clone https://github.com/kuretoshi/BetterCrewLink.git
cd BetterCrewLink
npm install
```

### 開発起動

```powershell
npm.cmd run dev
```

### コンパイル

```powershell
npm.cmd run compile
```

### Windows 64bit ビルド

```powershell
npm.cmd run dist:64
```

### Windows 32bit / 64bit ビルド

```powershell
npm.cmd run dist
```

PowerShell で `npm` が実行ポリシーにより止まる場合は、`npm.cmd` を使ってください。

### Linux AppImage ビルド

Linux 上で実行してください。

```bash
npm run dist:linux
```

生成物は `dist` に出力されます。

## 貢献

不具合修正、翻訳改善、日本語表現の調整、機能改善の Pull Request を歓迎します。

大きな変更を入れる場合は、先に Issue などで方針を相談してもらえると助かります。

## 元プロジェクト

このリポジトリは以下のプロジェクトをベースにしています。

- [OhMyGuus/BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink)
- [ottomated/CrewLink](https://github.com/ottomated/CrewLink)

元プロジェクトの開発者、コントリビューター、翻訳者の皆さまに感謝します。

## ライセンス

このプロジェクトは GNU General Public License v3.0 のもとで配布されています。詳細は [LICENSE](LICENSE) を確認してください。

## 免責

この mod は Among Us または Innersloth LLC とは関係ありません。内容は Innersloth LLC によって承認、支援、提供されたものではありません。Among Us に関する権利は Innersloth LLC に帰属します。
