import { useSettingsStore } from '@/stores';

export function ShortcutsTab() {
  const { settings, updateSettings } = useSettingsStore();

  const handleShortcutChange = (
    key: keyof typeof settings.keyboardShortcuts,
    value: string
  ) => {
    updateSettings({
      keyboardShortcuts: {
        ...settings.keyboardShortcuts,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          キーボードショートカット
        </h3>
        <p
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ショートカットキーを設定します。Firefoxの設定でも変更できます。
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              選択テキストを翻訳
            </label>
            <input
              type="text"
              value={settings.keyboardShortcuts.translateSelection}
              onChange={(e) => { handleShortcutChange('translateSelection', e.target.value); }}
              placeholder="Ctrl+Shift+T"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              選択したテキストをサイドバーに送信して翻訳します
            </p>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              サイドバー表示/非表示
            </label>
            <input
              type="text"
              value={settings.keyboardShortcuts.toggleSidebar}
              onChange={(e) => { handleShortcutChange('toggleSidebar', e.target.value); }}
              placeholder="Ctrl+Shift+S"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              翻訳サイドバーの表示/非表示を切り替えます
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-md p-4"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <h4
          className="mb-2 text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          ヒント
        </h4>
        <ul
          className="list-inside list-disc space-y-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <li>
            Firefoxの設定 &gt; 拡張機能とテーマ &gt; ⚙️ &gt; アドオンのショートカットキーを管理
            からも変更できます
          </li>
          <li>一部のキーの組み合わせはシステムや他の拡張機能で使用されている場合があります</li>
          <li>設定を変更した場合、ページの再読み込みが必要な場合があります</li>
        </ul>
      </div>
    </div>
  );
}

