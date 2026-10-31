# 調査知見

- TypeScript 7 CLIは `@typescript/native`、typed ESLint用APIは `@typescript/typescript6` を `typescript` aliasで併用する。型検査とlintの両方を確認する。
- Dependabotの再修復は読取り権限で `bun.lock` だけを変更し、PRコードへ秘密や書込み権限を渡さない。
- `node-forge` 1.4.2 は DigestInfo を正規DERとして照合する。旧1.4.0向けパッチと監査例外を撤去し、正常な署名構造と余分な要素の拒否をNode回帰で確認する。
- `deepmerge` 4.3.1 は GHSA-gcqx-w48m-w2h4 の修正版が未公開。上流PR #274 に基づき `__proto__` の書込みを両ループで防ぐ限定パッチを適用し、パッチと全配布入口のハッシュ・攻撃回帰を毎回確認する。
- GHSA-g3hv-75wg-m249 のDBは `<11.0.1` を対象とする一方、[作者の原文](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)は10.2.6の `optimizationLevel >= 2` にある二段の展開処理を対象とする。3.1.5は `make()` でbrace展開後にパス分割と変換を各1回行い、この反復展開処理を持たない。`**/../a/b/` の反復では10.2.5が1〜5回で2・4・8・16・32候補に増え、3.1.5は128回でも1候補、部分数513と線形だった。旧APIを必要とする3.1.5はソース全体のSHA-256と再現回帰を検証し、10系だけ11.0.1へ更新する。他の版・勧告は監査失敗とする。
- ページ翻訳の同時数はprofileの `pageTranslationConcurrency`（1～32、既定/旧設定補完は1）。完了数と元indexを分離し、非同期完了順でも元DOMへ戻す。Google翻訳modeは対象外。
- Vite 8/Rolldownでは古いCommonJSの `@mdi/react` default importがmodule objectになり、React #130でUIが白紙化した。`@mdi/js` のpathを共通SVGで描く。依存更新後は一時Firefoxで初期描画例外まで確認する。
