# GitHub Search Extension

GitHub の Code / Repositories 検索を、キーワード・除外ワード・拡張子フィルタを組み合わせて素早く実行できる Chrome 拡張機能です。
Popup から検索条件を組み立てて新規タブで GitHub 検索を開くほか、ページ上の選択テキストから右クリック → コード検索もできます。

## 機能

- **Popup**: キーワード / 除外ワード / 拡張子フィルタを入力し、`Code` または `Repositories` で検索
- **Context Menu**: ページ上で選択中のテキストを GitHub Code Search で開く（右クリック → "GitHub Code Search"）
- **ショートカット**: `Alt+G` で Popup を開く（`chrome://extensions/shortcuts` から変更可）
- **入力値の保存**: 検索条件は `chrome.storage.local` に保存され、次回起動時に復元

## 検索クエリの組み立て

| 入力欄 | 例 | 生成されるクエリ |
| --- | --- | --- |
| Keyword | `react hooks` | `react AND hooks` |
| Keyword (OR) | `react OR vue` | `(react OR vue)` |
| Exclusion | `test` | `-test` |
| File or Extension | `tsx,ts` | `(path:*.tsx OR path:*.ts)` |
| File or Extension | `package.json` | `path:package.json` |

## 技術スタック

- [WXT](https://wxt.dev/) (Manifest V3) + `@wxt-dev/module-react` + `@wxt-dev/auto-icons`
- React 19 + TypeScript
- Tailwind CSS v4
- パッケージ管理: **pnpm**
- Lint / Format: **Biome**
- Test: **Vitest** + Testing Library (jsdom)
- Git hooks: **Lefthook**
- CI: GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml))
- 依存関係更新: Dependabot ([.github/dependabot.yml](.github/dependabot.yml))

## セットアップ

```bash
pnpm install
```

`postinstall` で `wxt prepare` が、`prepare` で `lefthook install` が自動実行されます。

## 開発

```bash
pnpm dev          # Chrome を自動起動してホットリロード
pnpm dev:firefox  # Firefox
```

## ビルド・配布

```bash
pnpm build          # .output/chrome-mv3/ に成果物を生成
pnpm build:firefox  # Firefox 向け
pnpm zip            # ストア提出用 zip
```

`pnpm build` で生成された `.output/chrome-mv3/` を `chrome://extensions/` の
「パッケージ化されていない拡張機能を読み込む」で読み込むと動作確認できます。

## 品質チェック

```bash
pnpm compile     # tsc --noEmit
pnpm lint        # Biome check
pnpm lint:fix    # Biome auto-fix
pnpm format      # Biome format only
pnpm test        # Vitest (run once)
pnpm test:watch  # Vitest watch mode
```

## Git Hooks (Lefthook)

| Hook | 実行内容 |
| --- | --- |
| `pre-commit` | staged ファイルに対して `biome check --write`（自動修正を再ステージ） |
| `pre-push`   | `pnpm compile` と `pnpm test` |

設定: [lefthook.yml](./lefthook.yml)

## ディレクトリ構成

```
entrypoints/
  popup/          # Popup (action click / Alt+G)
  background.ts   # 右クリックメニューハンドラ
components/
  layouts/PopupApp.tsx
  Layout.tsx
  Title.tsx
  TextBox.tsx    # 入力値を chrome.storage に自動保存
  Buttons.tsx
hooks/
  useGitHubSearch.ts  # キーワードから GitHub 検索 URL を組み立て
  useStorage.ts       # WXT storage を React state に同期
lib/
  storage.ts    # storage アイテム定義
  migrate.ts    # 旧 localStorage → chrome.storage の一回限り移行
assets/
  global.css    # Tailwind v4 エントリ
  icon.png      # @wxt-dev/auto-icons の源画像
tests/
.github/
  workflows/ci.yml
  dependabot.yml
wxt.config.ts
biome.json
vitest.config.ts
lefthook.yml
```

## 旧バージョン (Next.js 版) からの移行

旧版で `localStorage` に保存していた検索条件は、初回起動時に `chrome.storage.local` へ自動移行されます ([lib/migrate.ts](lib/migrate.ts))。

## バージョン更新

`package.json` の `version` を更新してから `pnpm build` してください（WXT が自動で `manifest.json` に反映します）。
