1. 未コミットの変更と、前回リリースタグからのコミットメッセージと、各コミットの変更をファイル単位で観察し、（コミットメッセージが適当な場合があるため）、CHAGELOG.mdにConventional Commmit Rulesに従い記述する。
2. package-lock.json, package.json, manifest.jsonのバージョンを上げる。
3. 変更をコミットしてリモートリポジトリにプッシュする。
4. git tag "vX.X.X"でローカルにタグ作成。
5. git push origin main "vX.X.X"でリモートリポジトリにタグをプッシュし、Github Actionsが自動でAMO署名&リリース作成
  
---  
  
間違えてタグを作ってプッシュしてしまいリリースを作ったときはgit tag -d vX.X.Xとgit push origin :refs/tags/vX.X.Xでタグを削除し、リリースを削除して、新しいHEADでタグを作り直す。  