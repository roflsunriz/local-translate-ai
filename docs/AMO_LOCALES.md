# AMO掲載ロケール

2026-08-02時点で確認したAMO本番の言語切替ロケールは、Mozilla Add-ons Serverの `PROD_LANGUAGES` に定義された次の42件です。

`cs`, `de`, `dsb`, `el`, `en-CA`, `en-GB`, `en-US`, `es-AR`, `es-CL`, `es-ES`, `es-MX`, `fi`, `fr`, `fur`, `fy-NL`, `he`, `hr`, `hsb`, `hu`, `ia`, `it`, `ja`, `ka`, `kab`, `ko`, `nb-NO`, `nl`, `nn-NO`, `pl`, `pt-BR`, `pt-PT`, `ro`, `ru`, `sk`, `sl`, `sq`, `sr`, `sv-SE`, `tr`, `uk`, `vi`, `zh-CN`, `zh-TW`

この拡張機能のAMO掲載メタデータは、既存のアプリ翻訳で対応でき、AMO本番の言語切替から選択できる次の14地域ロケールを提供します。

`en-CA`, `en-GB`, `en-US`, `es-AR`, `es-CL`, `es-ES`, `es-MX`, `fr`, `ja`, `ko`, `pt-BR`, `pt-PT`, `ru`, `zh-CN`

アプリ本体には `ar`、`bn`、`hi`、`id` の翻訳もありますが、2026-08-02時点のAMO本番言語切替ロケールには含まれていないため、今回の掲載メタデータには追加していません。`zh-TW` はアプリの既存翻訳が簡体字中国語のため、繁体字の掲載文としては提供していません。

## 一次資料

- [Mozilla Add-ons Serverの対応言語定義](https://github.com/mozilla/addons-server/blob/master/src/olympia/core/languages.py#L1047-L1135)
- [AMO APIの翻訳フィールド仕様](https://mozilla.github.io/addons-server/topics/api/overview.html#translated-fields)
- [web-extのAMOメタデータ仕様](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#amo-metadata)
