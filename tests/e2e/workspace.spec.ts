import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

let app: ElectronApplication;
let calendar: Page;
test.beforeEach(async ({}, info) => {
  const data = path.resolve(info.outputPath('user-data'));
  fs.mkdirSync(data, { recursive: true });
  app = await electron.launch({ args: ['.'], env: { ...process.env, NODE_ENV: 'production', BOK_CALD_TEST_USER_DATA: data } });
  calendar = await app.firstWindow();
  await expect(calendar.getByLabel('심플 모드')).toBeVisible();
});
test.afterEach(async () => { await app?.close(); });

async function openWidget(kind: string, id?: string) {
  const next = app.waitForEvent('window');
  await calendar.evaluate(([kind, id]) => window.electronAPI.openWidget(kind as any, id), [kind, id]);
  const page = await next;
  await expect(page.getByRole('button', { name: '캘린더', exact: true })).toBeVisible();
  return page;
}

test('small calendar retains all dates with maximum banner height', async ({}, info) => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(760, 480));
  // August 2026 has six calendar rows.
  await calendar.getByRole('button', { name: '←', exact: true }).click();
  await calendar.getByRole('button', { name: '←', exact: true }).click();
  const days = calendar.locator('[class*="calendarDay_"]');
  await expect(days).toHaveCount(42);
  await calendar.getByLabel('심플 모드').uncheck();
  await calendar.getByText('배너 설정', { exact: true }).click();
  await calendar.getByLabel('배너 높이', { exact: true }).fill('240');
  await calendar.getByText('배너 설정', { exact: true }).click();
  const lastDay = calendar.locator('[class*="calendarDay_"]').last();
  await lastDay.scrollIntoViewIfNeeded();
  const box = await lastDay.boundingBox();
  const viewport = await calendar.evaluate(() => ({ height: innerHeight, width: innerWidth }));
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  await days.first().scrollIntoViewIfNeeded();
  const firstBox = await days.first().boundingBox();
  expect(firstBox!.y).toBeGreaterThanOrEqual(0);
  await lastDay.scrollIntoViewIfNeeded();
  await calendar.screenshot({ path: info.outputPath('compact-calendar.png') });
  await calendar.getByText('배너 설정', { exact: true }).click();
  await calendar.getByLabel('배너 표시', { exact: true }).uncheck();
  await expect(calendar.locator('[class*="bannerContainer_"]')).toHaveCount(0);
});

test('independent notes synchronize and widgets survive calendar closure', async ({}, info) => {
  const now = new Date().toISOString();
  await calendar.evaluate(async now => {
    await window.electronAPI.store.set('memos', ['a', 'b'].map(id => ({ id, title: id, content: '', date: now, createdAt: now, updatedAt: now })));
  }, now);
  const a = await openWidget('memo', 'a'); const b = await openWidget('memo', 'b');
  await a.getByLabel('메모 내용').fill('첫 번째 메모');
  await b.getByLabel('메모 내용').fill('두 번째 메모');
  await expect.poll(async () => a.evaluate(async () => (await window.electronAPI.store.get('memos')).map((n: any) => n.content))).toEqual(['첫 번째 메모', '두 번째 메모']);
  await a.getByRole('button', { name: '맨 위 고정' }).click();
  expect(await a.evaluate(() => window.electronAPI.getPinned())).toBe(true);
  const timer = await openWidget('pomodoro');
  await timer.getByRole('button', { name: '시작', exact: true }).click();
  const before = await timer.evaluate(() => window.electronAPI.timer.get());
  const calendarClosed = calendar.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => !w.webContents.getURL().includes('widget='))!.close());
  await calendarClosed;
  await expect.poll(() => timer.evaluate(async () => (await window.electronAPI.timer.get()).remainingMs)).toBeLessThan(before.remainingMs - 1000);
  expect(a.isClosed()).toBe(false); expect(b.isClosed()).toBe(false);
  await a.getByLabel('메모 내용').fill('캘린더를 닫은 뒤에도 저장');
  await a.screenshot({ path: info.outputPath('memo-widget.png') });
  const reopened = app.waitForEvent('window');
  await a.getByRole('button', { name: '캘린더', exact: true }).click();
  calendar = await reopened;
  await expect(calendar.getByLabel('심플 모드')).toBeVisible();
  await expect.poll(() => calendar.evaluate(async () => (await window.electronAPI.store.get('memos'))[0].content)).toBe('캘린더를 닫은 뒤에도 저장');
});

test('todo changes propagate between calendar and widget', async () => {
  const todo = await openWidget('todo');
  await todo.getByLabel('새 할 일').fill('양방향 확인');
  await todo.getByRole('button', { name: '추가', exact: true }).click();
  await calendar.getByRole('button', { name: '리스트', exact: true }).click();
  await expect(calendar.getByLabel('할 일 수정')).toHaveValue('양방향 확인');
  await calendar.getByLabel('양방향 확인 완료').check();
  await expect(todo.getByLabel('양방향 확인 완료')).toBeChecked();
  await todo.getByRole('button', { name: '맨 위 고정' }).click();
  await todo.getByRole('button', { name: '고정 해제' }).click();
  expect(await todo.evaluate(() => window.electronAPI.getPinned())).toBe(false);
});

test('calendar view and sidebar survive closing and reopening while a widget remains', async () => {
  const todo = await openWidget('todo');
  await calendar.getByRole('button', { name: '주', exact: true }).click();
  await calendar.getByRole('button', { name: '☰' }).click();
  const closed = calendar.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => !w.webContents.getURL().includes('widget='))!.close());
  await closed;
  const reopened = app.waitForEvent('window');
  await todo.getByRole('button', { name: '캘린더', exact: true }).click();
  calendar = await reopened;
  await expect(calendar.getByRole('button', { name: '주', exact: true })).toHaveClass(/active/);
  await expect(calendar.getByText('D-Day 설정하기')).toHaveCount(0);
});

test('focus gate counts only the selected active window title', async () => {
  test.skip(process.platform !== 'win32', 'Windows foreground detection');
  const timer = await openWidget('pomodoro');
  await app.evaluate(({ BrowserWindow }) => {
    const win = new BrowserWindow({ title: 'BOK focus test target', width: 320, height: 240 });
    win.loadURL('about:blank'); win.show(); win.focus();
  });
  const capture = timer.evaluate(() => window.electronAPI.timer.capture());
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'BOK focus test target')!;
    win.show(); win.focus();
  });
  const target = await capture;
  expect(target.title).toBe('BOK focus test target');
  await timer.evaluate(async target => {
    await window.electronAPI.timer.command('configure', { gated: true, target: { ...target, mode: 'title' } });
    await window.electronAPI.timer.command('start');
  }, target);
  await expect.poll(() => timer.evaluate(async () => (await window.electronAPI.timer.get()).remainingMs)).toBeLessThan(1499000);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.getTitle() === 'BOK focus test target')!.setTitle('BOK other tab'));
  await expect.poll(() => timer.evaluate(async () => (await window.electronAPI.timer.get()).targetActive)).toBe(false);
  const paused = await timer.evaluate(() => window.electronAPI.timer.get());
  await timer.waitForTimeout(1600);
  expect((await timer.evaluate(() => window.electronAPI.timer.get())).remainingMs).toBe(paused.remainingMs);
  await timer.evaluate(async () => {
    await window.electronAPI.timer.command('configure', { gated: false });
    await window.electronAPI.timer.command('start');
  });
  await expect.poll(() => timer.evaluate(async () => (await window.electronAPI.timer.get()).remainingMs)).toBeLessThan(1499000);
});
