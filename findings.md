# 調査知見

- TypeScript 7 CLIは `@typescript/native`、typed ESLint用APIは `@typescript/typescript6` を `typescript` aliasで併用する。型検査とlintの両方を確認する。
- Dependabotの再修復は読取り権限で `bun.lock` だけを変更し、PRコードへ秘密や書込み権限を渡さない。
- `web-ext` 配下の `node-forge@1.4.0` は修正版公開までpatchedDependenciesとRSA構造のNode回帰で限定対応する。監査JSONの当該GHSAだけを条件付き許容し、未知の指摘は失敗させる。
- ページ翻訳の同時数はprofileの `pageTranslationConcurrency`（1～32、既定/旧設定補完は1）。完了数と元indexを分離し、非同期完了順でも元DOMへ戻す。Google翻訳modeは対象外。
- Vite 8/Rolldownでは古いCommonJSの `@mdi/react` default importがmodule objectになり、React #130でUIが白紙化した。`@mdi/js` のpathを共通SVGで描く。依存更新後は一時Firefoxで初期描画例外まで確認する。
