# GitHub Search Extension

GitHub の Code / Repositories / Issues / Commits / Security Advisories を、キーワード・除外ワード・拡張子フィルタ・テンプレートを組み合わせて素早く検索できる Chrome 拡張機能です。
Popup から検索条件を組み立てて新規タブで GitHub 検索を開くほか、ページ上の選択テキストから右クリック → コード検索もできます。

## 機能

- **Popup**: Keyword / Exclusion / File + `Code` / `Repositories` のミニマル構成（日常用途）
- **Side Panel**: Popup の全機能 + Scope セレクタ + Templates チップ + `Issues` / `Commits` / `Advisory` ボタン（CVE 調査・横断調査向け）
- **表示モード切替**: Options ページから Popup / Side Panel を選択（Chrome は Side Panel、Firefox は Sidebar に自動マップ）
- **Scope**: Org / User / Repo をコンマ区切りで事前登録 → Side Panel の `All` / `Org` / `User` / `Repo` ボタンで検索範囲を即時切替
- **Templates**: GitHub qualifier をチップ化してトグル。`is:pr`, `npm Package`, `Pushed: last 30 days` などプリセット中心。カスタムテンプレートでは `%s`（ユーザー入力）と `{{Nd}}`（N 日前の日付に展開）が使用可能
- **コンテキストメニュー**: ページ上で選択中のテキストを GitHub Search で開く（右クリック → "GitHub Search"）
- **オムニボックス**: アドレスバーで `gse <キーワード>` → Enter で即検索
- **クイック検索の設定**: コンテキストメニュー / オムニボックスの検索対象（Code/Repo/Issues/Commits/Advisory）を Options から指定。Scope と Templates のアクティブ状態は **Side Panel と共有** されるため、Side Panel で切り替えた条件がそのままクイック検索に反映される
- **Options ページ**: 新規タブで全面表示。3 タブ構成
  - **クイック検索**: 検索対象（クイック検索専用）/ Scope（Side Panel と共有）/ Templates（Side Panel と共有）
  - **検索オプション**: Scope リスト（Org/User/Repo）、組み込み・カスタムテンプレートの ON/OFF
  - **設定**: 表示モード（Popup / Side Panel）
- **ショートカット**:
  - `Alt+G` で UI を開く（モードに応じて popup / sidepanel）
  - `Alt+Shift+G` でページ上の選択テキストを直接クイック検索（コンテキストメニューと同じ挙動をキーボードだけで）
  - パネル内の Keyword / Exclusion / File 入力欄で **Enter キー** を押すと先頭の検索対象（Popup なら Code、Side Panel なら Code）で即時検索
  - キーは `chrome://extensions/shortcuts` から変更可
- **入力値の保存**: 検索条件・テンプレート・Scope 設定・表示モード・クイック検索設定は `chrome.storage.local` に保存され、次回起動時に復元

## 検索クエリの組み立て

クエリは以下の順で連結されます（GitHub の qualifier 文法に合わせ、qualifier → keyword の順）:

```
[scope clause] [template patterns] [keyword AND exclusion AND extensions]
```

| 入力欄 | 例 | 生成されるクエリ |
| --- | --- | --- |
| Keyword | `react hooks` | `react AND hooks` |
| Keyword (OR) | `react OR vue` | `(react OR vue)` |
| Exclusion | `test` | `-test` |
| File or Extension | `tsx,ts` | `(path:*.tsx OR path:*.ts)` |
| File or Extension | `package.json` | `path:package.json` |
| Template (静的) | `Is PR` (toggle) | `is:pr` |
| Template (日付マクロ) | `Pushed: last 30 days` | `pushed:>2026-05-10` |
| Scope (Org, 単一) | `apache` | `org:apache` |
| Scope (Org, 複数) | `apache,google` | `(org:apache OR org:google)` |

## Scope

事前に Options ページで Org / User / Repo を **コンマ区切り** で登録しておき、Panel の `All` / `Org` / `User` / `Repo` ボタンで検索範囲を切替。

例: Options で `Org = apache,google,facebook` を登録 → Panel で `Org` ボタンを選択 → 全検索に `(org:apache OR org:google OR org:facebook)` が付与される。

未設定の Scope を選択すると ⚠ マークが表示され、その分はクエリに含まれません（Keyword だけで検索）。

## Templates

### 組み込みサンプル（全てデフォルト OFF — Options ページで有効化）

| カテゴリ | 名前 | パターン |
| --- | --- | --- |
| 種別 | Is PR / Merged PR / Open Issue | `is:pr` / `is:pr is:merged` / `is:issue is:open` |
| 品質 | Stars 100+ / Stars 1000+ | `stars:>100` / `stars:>1000` |
| 鮮度 | Pushed: last 7 / 30 / 90 days | `pushed:>{{7d}}` / `pushed:>{{30d}}` / `pushed:>{{90d}}` |
| 鮮度 | Created: last 30 days / last year | `created:>{{30d}}` / `created:>{{365d}}` |
| 依存 | npm Package | `(path:package.json OR path:package-lock.json OR path:yarn.lock OR path:pnpm-lock.yaml)` |
| セキュリティ | SECURITY.md | `path:SECURITY.md` |

### カスタムテンプレート

Options ページの「カスタムテンプレート」セクションから追加。以下の特殊記法が使用可能:

- `%s` … Popup / Side Panel でアクティブ化した際にインライン入力欄が現れ、値を差し込み（例: `language:%s` → `python` 入力で `language:python`）
- `{{Nd}}` … N 日前の日付に展開（例: `pushed:>{{14d}}` → `pushed:>2026-05-26`）

### CVE 調査の例

1. Options → 設定タブで Side Panel モードに切替
2. Options → 検索オプションタブで `Org = mycompany` を登録 → Side Panel で Scope を `Org` に
3. テンプレート `npm Package` を有効化、Keyword に `lodash` → `Code` で社内依存を調査
4. Keyword に `CVE-2025-12345` を入力 → `Advisory` ボタンで GitHub Security Advisory DB を検索

### オムニボックス / コンテキストメニューでの即時検索

Options → **クイック検索** タブ:

- **検索対象**（クイック検索専用）: Code / Repositories / Issues / Commits / Advisory から選択
- **Scope**（Side Panel と共有）: All / Org / User / Repo
- **Templates**（Side Panel と共有）: 有効化済みテンプレートをチェックでトグル、`%s` 値も指定

Side Panel でチップをトグルした条件・Scope ボタンで選択した範囲が、そのままコンテキストメニューとオムニボックスの検索にも適用されます。

使い方:
- アドレスバーで `gse react hooks` → Enter
- ページ上のコードを選択 → 右クリック → "GitHub Search"

例: Side Panel で `Org` Scope を選択 + `npm Package` チップを ON にしておけば、選択した依存名やオムニボックスで入力したキーワードが自動で自社 Org の npm 関連ファイル経由で検索される。

## 技術スタック

- [WXT](https://wxt.dev/) (Manifest V3) + `@wxt-dev/module-react` + `@wxt-dev/auto-icons`
- React 19 + TypeScript
- Tailwind CSS v4
- パッケージ管理: **pnpm**
- Lint / Format: **Biome**
- Test: **Vitest** + Testing Library (jsdom)
- Git hooks: **Lefthook** + **commitlint** (Conventional Commits)
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
| `commit-msg` | `commitlint` で Conventional Commits 準拠を検証 |
| `pre-push`   | `pnpm compile` と `pnpm test` |

設定: [lefthook.yml](./lefthook.yml)

## ディレクトリ構成

```
entrypoints/
  popup/          # Popup (action click / Alt+G・displayMode=popup 時)
  sidepanel/      # Side Panel (Chrome) / Sidebar (Firefox)
  options/        # Options ページ（表示モード・テンプレート管理、新規タブで全面表示）
  background.ts   # 右クリックメニュー + 表示モード切替ハンドラ
components/
  layouts/PopupApp.tsx
  layouts/SidepanelApp.tsx
  layouts/OptionsApp.tsx
  SearchPanel.tsx     # Popup / Sidepanel 共有の検索 UI
  ScopeSelector.tsx   # All/Org/User/Repo 切替ボタン
  Layout.tsx
  Title.tsx
  TextBox.tsx         # 入力値を chrome.storage に自動保存
  Buttons.tsx
  TemplateChips.tsx   # SearchPanel 内のテンプレートチップ
hooks/
  useStorage.ts       # WXT storage を React state に同期
lib/
  githubSearch.ts # キーワード+テンプレート+scope から GitHub 検索 URL を組み立て
  templates.ts    # テンプレート型・組み込みサンプル・日付マクロ・storage 定義
  preferences.ts  # 表示モード・Scope 設定とクロース生成
  storage.ts      # storage アイテム定義
  migrate.ts      # 旧 localStorage → chrome.storage の一回限り移行
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

## 表示モード（Popup / Side Panel）

| モード | 挙動 |
| --- | --- |
| Popup（既定） | ツールバーアイコンクリック / `Alt+G` で 370px のポップアップ |
| Side Panel | クリック / `Alt+G` でブラウザ右側のサイドパネルに常駐表示（Chrome）/ サイドバーに表示（Firefox） |

Options ページの「表示モード」セクションでラジオ切替。background script が `browser.action.setPopup` と `browser.sidePanel.setPanelBehavior` を即座に再設定します。

## 旧バージョン (Next.js 版) からの移行

旧版で `localStorage` に保存していた検索条件は、初回起動時に `chrome.storage.local` へ自動移行されます ([lib/migrate.ts](lib/migrate.ts))。

## バージョン更新

`package.json` の `version` を更新してから `pnpm build` してください（WXT が自動で `manifest.json` に反映します）。
