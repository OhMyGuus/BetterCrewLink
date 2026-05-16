# BetterCrewLink 日本語フォーク

BetterCrewLink 日本語フォークは、Among Us 向け近接ボイスチャットアプリ [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink) をベースに、日本語環境で使いやすいよう調整している非公式フォークです。

元プロジェクトは [CrewLink](https://github.com/ottomated/CrewLink) のフォークで、このリポジトリもその流れを引き継いでいます。Among Us、Innersloth、CrewLink、BetterCrewLink の公式プロジェクトとは別の非公式版です。

## このフォークについて

- 日本語 UI / 日本語説明を中心に調整しています。
- BetterCrewLink の機能をベースに、国内プレイヤー向けの使いやすさを優先しています。
- キノコカオスやカモフラージュ系の状態に合わせたボイスエフェクト調整を追加しています。
- Windows での利用とビルドを主な対象にしています。

## 主な機能

- Among Us の位置情報に連動した近接ボイスチャット
- 死亡者、インポスター、会議中などの状態に応じた音声制御
- オーバーレイ表示
- マイク / スピーカー選択
- マイク音量、感度、ノイズ抑制、エコーキャンセル設定
- プレイヤーごとの音量調整
- ロビー設定の同期
- キノコカオス / カモフラージュ時のボイスエフェクト
- ボイスエフェクト強度の調整とテスト再生

## ダウンロード

配布版を使う場合は、このフォークの Releases から最新版をダウンロードしてください。

[Releases](https://github.com/kuretoshi/BetterCrewLink/releases)

Windows では `BetterCrewLink-Setup-x.x.x.exe` を実行してインストールします。Among Us の状態を読むためにプロセスへアクセスするため、環境によってはセキュリティソフトの警告が出る場合があります。

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
