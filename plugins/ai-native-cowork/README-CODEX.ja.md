# Codex向け ai-native-cowork

[English](./README-CODEX.md) · [한국어](./README-CODEX.ko.md) · [日本語](./README-CODEX.ja.md) · [简体中文](./README-CODEX.zh-CN.md)

> Codexを、速いコーディング支援から継続的なデリバリーパートナーへ。

Codexは機能をすばやく実装できます。本当に難しいのは、その後です。計画を守り、結果を検証し、判断理由を残し、次のセッションが推測なしで作業を再開できる状態が必要です。

**ai-native-coworkは、そのための作業オペレーティングシステムです。** スプリント実行、単一機能PDCA、セッション復元、AI協働コミット、ドキュメント同期の6スキルを提供します。同じ製品がClaude Codeでも動作し、両ホストで同一の方法とDone基準を使います。

## 6つのスキル

| スキル | 用途 |
|---|---|
| `cowork-sprint` | 複数機能を順次・並列・混合スプリントで計画、実行する |
| `pdca-wf` | 1機能をResearch→Plan→Design→Do→Check/Act→Reportで完成させる |
| `cowork-insights` | 過去のCodex・Claude Codeセッションを作業レポートにする |
| `cowork-commit` | AIとの意思決定履歴をコードと同じコミットに残す |
| `cowork-doc-init` | 既存プロジェクトのドキュメント構造を初期化する |
| `cowork-doc-sync` | 実装後のドキュメントを実際のコードと同期する |

## Codexに適している理由

- 両ホストで同じlifecycle、gate、artifact、Done規則を共有します。
- Codexネイティブのworker、plan、tool、approval境界を使います。
- スプリント状態をschema検証し、安全な遷移だけを許可します。
- 依存関係とfile ownershipから安全な並列実行を決定します。
- Goal制御envelopeはraw auditに残し、ユーザー指示・レポート・コミットログから除外します。
- 2つのホストが同じ6つのcanonical skillを読み込みます。

## ww-w-ai Marketplaceからインストール

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ai-native-cowork@ww-w-ai
```

インストール後は新しいCodexスレッドを開始してください。

## 更新

```bash
codex plugin marketplace upgrade ww-w-ai
codex plugin add ai-native-cowork@ww-w-ai
```

更新後も新しいスレッドを開始します。

## 確認

```bash
codex plugin list
```

`ai-native-cowork@ww-w-ai`が`installed, enabled`であることを確認します。

## 使用例

```text
cowork-sprintでこのロードマップを計画して実行して。
この機能をPDCAで実装して。
過去7日間のCodex作業を要約して。
AI協働履歴を付けてコミットして。
実装が完了したのでドキュメントを同期して。
```

## Codex固有の動作

### Goalと継続

通常の機能作業ではGoalを暗黙に作成しません。Goalは、ユーザーがオプトインの合図となる語 **`goal`** を口にしたときにだけ作成されます — ターンやコンパクションをまたいで生き残る、構造化・大量・バリア型の実行を解錠する語です。（Claude Codeでの対応語は `ultracode` で、Goalではなく `Workflow` を解錠します。二つの語は互換ではありません。）既存Goalを再開する場合はthread IDで正確なセッションを復元し、単に最新transcriptを選びません。

### 並列作業

`cowork-sprint`は依存関係とowned pathからdeterministic clusterを作ります。最初の未完了clusterだけが実行でき、並列sprintのownershipは重複できません。

### 承認境界

プラグインのインストール、push、release、migration、外部システム変更など、外部的または不可逆な操作には明示的な承認が必要です。

### セッションのプライバシー

レポートエンジンはローカルtranscriptを読みます。必要なメッセージだけを正規化し、`cowork-commit`はgitへ保存する前に関連性とsecretを厳格に検査します。

## 必要環境

- プラグイン対応Codex
- Git
- TypeScriptレポートエンジン用Bun
- state・scheduler・parity検証用Python 3

## ローカル開発

通常は公開Marketplaceを使用します。開発時はローカル`plugins/ai-native-cowork` checkoutを参照するCodex Marketplaceを用意し、manifest versionまたはcachebusterを更新して`codex plugin add`で再インストールします。

Canonical source: [ww-w-ai/ai-native-cowork](https://github.com/ww-w-ai/ai-native-cowork)

Claude Codeについては[README.md](./README.md)を参照してください。

## ライセンス

MIT
