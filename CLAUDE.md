# プロジェクトガイドライン

## 編集方針

### 変更前のプランニング

コードやドキュメント、ブログエントリーを変更する際は必ずプランモードで計画を立ててユーザーの承認を得る。

### 情報収集の優先順位

1. 公式ドキュメント
2. GitHub Issues/Discussions
3. Web検索

## ツール

### Git

参照系コマンド（`git status`, `git log`, `git diff` 等）のみ使用可。`git add`, `git commit`, `git rebase`, `git switch` 等の変更系コマンドは実行しない。作業者がコードに責任を持つため。

### ファイル削除

`rm -f` / `rm -rf` を使用。alias で `-i` が設定されているため必須。
