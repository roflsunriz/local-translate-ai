1. 未コミットの変更と前回リリースタグからの差分を確認し、変更の意図が分かるように `CHANGELOG.md` を更新する。
2. `package.json` と `public/manifest.json` のバージョンを上げ、`amo-metadata.json` のリリースノートも更新する。
3. `bun run amo:validate`、`bun run lint`、`bun run type-check`、`bun run build`、`bun run test`、`bun run amo:lint` を実行する。
4. 変更を日本語Conventional Commits形式でコミットし、`main` にプッシュする。
5. `git tag "vX.X.X"` でローカルタグを作成する。
6. `git push origin main "vX.X.X"` でmainとタグをプッシュする。GitHub ActionsがAMOへlisted提出し、成功後にGitHub Releaseを作成する。

AMO掲載ロケールの根拠と今回の対応範囲は [docs/AMO_LOCALES.md](./docs/AMO_LOCALES.md) にまとめる。listed提出では `amo-metadata.json` と `source-code.zip` が自動的に送信される。

---

間違えてタグを作ってプッシュしてしまいリリースを作ったときはgit tag -d vX.X.Xとgit push origin :refs/tags/vX.X.Xでタグを削除し、リリースを削除して、新しいHEADでタグを作り直す。

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗時は `bun.lock` の再生成を試み、修復後の CI を再実行します。変更がない場合や再度失敗した場合は PR を残します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。
