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


Dependabot version update は毎月28日00:00、検証済み PR の自動マージは同日18:00（いずれも `Asia/Tokyo`）にまとめます。28日より前に自動マージせず、現在の head SHA と全 PR チェックを月末処理で再確認します。
詳細は [findings.md](findings.md#update-1) に移しました。
