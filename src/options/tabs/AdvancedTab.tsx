import { useState } from 'react';

import { Button } from '@/components/Button';
import { useSettingsStore, useUIStore } from '@/stores';
import type { ExclusionPattern } from '@/types/settings';

export function AdvancedTab() {
  const {
    settings,
    updateSettings,
    addExclusionPattern,
    deleteExclusionPattern,
    toggleExclusionPattern,
  } = useSettingsStore();
  const { showSuccess } = useUIStore();
  const [newPattern, setNewPattern] = useState({ name: '', pattern: '' });

  const handleAddPattern = () => {
    if (!newPattern.name.trim() || !newPattern.pattern.trim()) {
      return;
    }

    const pattern: ExclusionPattern = {
      id: crypto.randomUUID(),
      name: newPattern.name,
      pattern: newPattern.pattern,
      enabled: true,
    };

    addExclusionPattern(pattern);
    setNewPattern({ name: '', pattern: '' });
    showSuccess('追加完了', '除外パターンを追加しました');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          翻訳設定
        </h3>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="streamingEnabled"
              checked={settings.streamingEnabled}
              onChange={(e) => { updateSettings({ streamingEnabled: e.target.checked }); }}
              className="h-4 w-4 rounded"
            />
            <label
              htmlFor="streamingEnabled"
              className="text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              ストリーミング翻訳を有効にする（逐次表示）
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="historyEnabled"
              checked={settings.historyEnabled}
              onChange={(e) => { updateSettings({ historyEnabled: e.target.checked }); }}
              className="h-4 w-4 rounded"
            />
            <label
              htmlFor="historyEnabled"
              className="text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              翻訳履歴を保存する
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                履歴保存件数
              </label>
              <input
                type="number"
                value={settings.historyMaxItems}
                onChange={(e) => { updateSettings({ historyMaxItems: Number(e.target.value) }); }}
                min={10}
                max={1000}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                リトライ回数
              </label>
              <input
                type="number"
                value={settings.retryCount}
                onChange={(e) => { updateSettings({ retryCount: Number(e.target.value) }); }}
                min={0}
                max={10}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                リトライ間隔（ミリ秒）
              </label>
              <input
                type="number"
                value={settings.retryInterval}
                onChange={(e) => { updateSettings({ retryInterval: Number(e.target.value) }); }}
                min={100}
                max={10000}
                step={100}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3
          className="mb-4 text-lg font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          翻訳除外パターン
        </h3>
        <p
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          正規表現パターンにマッチするテキストは翻訳されません
        </p>

        <div className="space-y-2">
          {settings.exclusionPatterns.map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center justify-between rounded-md border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={pattern.enabled}
                  onChange={() => { toggleExclusionPattern(pattern.id); }}
                  className="h-4 w-4 rounded"
                />
                <div>
                  <div style={{ color: 'var(--color-text-primary)' }}>
                    {pattern.name}
                  </div>
                  <code
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {pattern.pattern}
                  </code>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { deleteExclusionPattern(pattern.id); }}
              >
                削除
              </Button>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-md border p-4"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          <h4
            className="mb-3 text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            新しいパターンを追加
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="パターン名"
              value={newPattern.name}
              onChange={(e) => { setNewPattern({ ...newPattern, name: e.target.value }); }}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <input
              type="text"
              placeholder="正規表現パターン"
              value={newPattern.pattern}
              onChange={(e) => { setNewPattern({ ...newPattern, pattern: e.target.value }); }}
              className="rounded-md border px-3 py-2 font-mono text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddPattern}
            className="mt-3"
            disabled={!newPattern.name.trim() || !newPattern.pattern.trim()}
          >
            追加
          </Button>
        </div>
      </div>
    </div>
  );
}

