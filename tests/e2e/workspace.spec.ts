import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

let app: ElectronApplication;
let calendar: Page;
test.beforeEach(async ({}, info) => {
  const data = path.resolve(info.outputPath('user-data'));
  fs.mkdirSync(data, { recursive: true });
  app = await electron.launch({ ...(process.env.TOMO_E2E_EXECUTABLE ? { executablePath: process.env.TOMO_E2E_EXECUTABLE, args: [] } : { args: ['.'] }), env: { ...process.env, NODE_ENV: 'production', TOMO_TEST_USER_DATA: data } });
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
  await calendar.locator('aside').getByRole('button', { name: '할 일', exact: true }).click();
  await expect(calendar.getByLabel('할 일 수정')).toHaveValue('양방향 확인');
  await calendar.getByLabel('양방향 확인 완료').check();
  await expect(todo.getByLabel('양방향 확인 완료')).toBeChecked();
  await todo.getByRole('button', { name: '맨 위 고정' }).click();
  await todo.getByRole('button', { name: '맨 위 고정' }).click();
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
  await expect(calendar.locator('aside')).toHaveCount(0);
});

test('focus gate counts only the selected active window title', async () => {
  test.skip(process.platform !== 'win32', 'Windows foreground detection');
  const timer = await openWidget('pomodoro');
  await app.evaluate(({ BrowserWindow }) => {
    const win = new BrowserWindow({ title: 'TOMO focus test target', width: 320, height: 240 });
    win.loadURL('about:blank'); win.show(); win.focus();
  });
  const capture = timer.evaluate(() => window.electronAPI.timer.capture());
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'TOMO focus test target')!;
    win.show(); win.focus();
  });
  const target = await capture;
  expect(target.title).toBe('TOMO focus test target');
  await timer.evaluate(async target => {
    await window.electronAPI.timer.command('configure', { gated: true, target: { ...target, mode: 'title' } });
    await window.electronAPI.timer.command('start');
  }, target);
  await expect.poll(() => timer.evaluate(async () => (await window.electronAPI.timer.get()).remainingMs)).toBeLessThan(1499000);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.getTitle() === 'TOMO focus test target')!.setTitle('TOMO other tab'));
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

test('simple mode keeps theme colors and Korean holiday highlighting is optional', async () => {
  await calendar.evaluate(() => window.electronAPI.store.set('currentTheme', { id: 'pastel-blue', colors: {} }));
  await calendar.reload();
  await expect.poll(() => calendar.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#B6D7FF');
  await calendar.getByLabel('심플 모드').uncheck();
  await calendar.getByLabel('심플 모드').check();
  await expect.poll(() => calendar.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#B6D7FF');
  const holiday = calendar.locator('[class*="calendarDay_"]').filter({ has: calendar.locator('[title="개천절"]') });
  await expect(holiday).toHaveCount(1);
  await calendar.getByLabel('한국 공휴일 표시').uncheck();
  await expect(calendar.locator('[title="개천절"]')).toHaveCount(0);
});
test('D-DAY management opens each individual countdown window', async ({}, info) => {
  await calendar.evaluate(() => window.electronAPI.store.set('dDays', ['day-a', 'day-b'].map((id, i) => ({ id, title: i ? '여행' : '마감', targetDate: '2026-12-01', createdAt: new Date().toISOString(), isActive: false }))));
  await calendar.reload();
  await calendar.getByRole('button', { name: 'D-DAY 관리', exact: true }).click();
  let next = app.waitForEvent('window');
  await calendar.getByRole('button', { name: '마감 위젯 열기' }).last().click();
  const a = await next;
  next = app.waitForEvent('window');
  await calendar.getByRole('button', { name: '여행 위젯 열기' }).click();
  const b = await next;
  await expect(a.getByRole('heading', { name: '마감' })).toBeVisible();
  await expect(b.getByRole('heading', { name: '여행' })).toBeVisible();
  await a.screenshot({ path: info.outputPath('dday-widget.png') });
});
test('circular timer and login settings use compact controls', async ({}, info) => {
  const timer = await openWidget('pomodoro');
  await expect(timer.locator('svg[viewBox="0 0 256 256"] circle')).toHaveCount(2);
  await timer.screenshot({ path: info.outputPath('pomodoro-widget.png') });
  const todo = await openWidget('todo');
  await todo.getByLabel('새 할 일').fill('디자인 확인');
  await todo.getByRole('button', { name: '추가', exact: true }).click();
  await todo.screenshot({ path: info.outputPath('todo-widget.png') });
  await todo.getByRole('button', { name: 'Microsoft To Do 연동' }).click();
  await expect(todo.getByRole('heading', { name: 'Microsoft To Do' })).toBeVisible();
  await expect(todo.getByLabel('Microsoft 개인 앱 ID')).not.toBeVisible();
});
test('work time records only its selected active window and stops on pause', async ({}, info) => {
  test.skip(process.platform !== 'win32');
  const work = await openWidget('worktime');
  await app.evaluate(({ BrowserWindow }) => {
    const win = new BrowserWindow({ title: 'TOMO work test', width: 320, height: 240 });
    win.loadURL('about:blank'); win.show(); win.focus();
  });
  const capturing = work.evaluate(() => window.electronAPI.timer.capture());
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.getTitle() === 'TOMO work test')!.focus());
  const target = await capturing;
  await work.evaluate(async target => {
    await window.electronAPI.workTime.command('add', { label: '집중 작업', target: { ...target, mode: 'title' } });
    await window.electronAPI.workTime.command('start');
  }, target);
  await expect.poll(() => work.evaluate(async () => (await window.electronAPI.workTime.get()).targets[0].days)).not.toEqual({});
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.getTitle() === 'TOMO work test')!.setTitle('다른 탭'));
  await expect.poll(() => work.evaluate(async () => (await window.electronAPI.workTime.get()).activeId)).toBeNull();
  const before = await work.evaluate(() => window.electronAPI.workTime.get());
  await work.waitForTimeout(1500);
  expect((await work.evaluate(() => window.electronAPI.workTime.get())).targets[0].days).toEqual(before.targets[0].days);
  await work.evaluate(() => window.electronAPI.workTime.command('pause'));
  await work.screenshot({ path: info.outputPath('work-time-widget.png') });
});

test('installed font selection applies to the calendar and open widgets', async () => {
  test.skip(process.platform !== 'win32');
  const todo = await openWidget('todo');
  await calendar.getByRole('button', { name: '폰트 설정', exact: true }).click();
  await calendar.getByLabel('폰트 검색').fill('Arial');
  await calendar.getByRole('button', { name: /Arial 가나다 Aa 123/, exact: false }).first().click();
  await expect.poll(() => todo.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Arial');
  await calendar.getByRole('button', { name: '폰트 설정 닫기' }).click();
  await calendar.reload();
  await expect.poll(() => calendar.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Arial');
});
test('Google modal covers the compact toolbar and explains missing configuration', async ({}, info) => {
  await calendar.getByRole('button', { name: '설정', exact: true }).click();
  await calendar.getByRole('button', { name: '구글 캘린더', exact: true }).click();
  const dialog = calendar.getByRole('dialog', { name: '구글 캘린더 연동' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Google OAuth 정보가 없습니다/)).toBeVisible();
  await expect(dialog.getByRole('button', {name:'구글 계정으로 연동하기'})).toBeDisabled();
  const onTop = await calendar.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')!;
    const box = document.querySelector('[class*="workspaceBar"]')!.getBoundingClientRect();
    return dialog.contains(document.elementFromPoint(box.x + 20, box.y + 10));
  });
  expect(onTop).toBe(true);
  await dialog.getByText('개인 연결 설정', {exact:true}).click();
  await expect(dialog.getByLabel('Google 클라이언트 ID')).toBeVisible();
  await calendar.screenshot({path:info.outputPath('google-settings.png')});
  await dialog.getByRole('button', {name:'구글 연동 닫기'}).click();
});
test('banner positioning preserves the original image and persists independently', async ({}, info) => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#B6D7FF"/><circle cx="400" cy="100" r="80" fill="#ffb6c1"/></svg>';
  const image = 'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
  await calendar.evaluate(async image => {
    await window.electronAPI.store.set('bannerImages',[{id:'position-test',image,order:0}]);
    await window.electronAPI.store.set('workspaceSettings',{simple:false,bannerVisible:true,bannerHeight:140,koreanHolidays:true,fontFamily:''});
  }, image);
  await calendar.reload();
  const banner = calendar.locator('[class*="bannerContainer_"]').first();
  await expect(calendar.locator('[class*="banner_"]')).toHaveCSS('background-image', /data:image/);
  await banner.hover();
  await calendar.getByRole('button',{name:'배너 표시 위치 조정'}).click();
  await calendar.getByLabel('배너 세로 위치').fill('15');
  await calendar.getByRole('button',{name:'위치 저장'}).click();
  await expect.poll(() => calendar.evaluate(async () => (await window.electronAPI.store.get('bannerImages'))[0].positionY)).toBe(15);
  expect(await calendar.evaluate(async () => (await window.electronAPI.store.get('bannerImages'))[0].image)).toBe(image);
  await calendar.screenshot({path:info.outputPath('banner-position.png')});
});
test('window picker chooses an external window for both timers without a countdown', async ({}, info) => {
  test.skip(process.platform !== 'win32');
  const targetData = info.outputPath('external-target-data'); fs.mkdirSync(targetData,{recursive:true});
  const external = await electron.launch({args:['.'],env:{...process.env,NODE_ENV:'production',TOMO_TEST_USER_DATA:targetData}});
  try {
    const targetPage = await external.firstWindow();
    await expect(targetPage.getByLabel('심플 모드')).toBeVisible();
    await external.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setTitle('TOMO picker target'));
    const timer = await openWidget('pomodoro');
    await timer.getByLabel('뽀모도로 설정').click();
    await timer.getByRole('button',{name:'기록할 창 선택'}).click();
    await timer.getByLabel('실행 중인 창 검색').fill('TOMO picker target');
    await expect(timer.getByRole('button',{name:/TOMO picker target/})).toBeVisible();
    await timer.screenshot({path:info.outputPath('window-picker.png')});
    await timer.getByRole('button',{name:/TOMO picker target/}).click();
    const snapshot = await timer.evaluate(()=>window.electronAPI.timer.get());
    expect(snapshot.target?.title).toBe('TOMO picker target'); expect(snapshot.target?.mode).toBe('title');
    const work = await openWidget('worktime');
    await work.getByRole('button',{name:'프로그램 추가'}).click();
    await work.getByLabel('실행 중인 창 검색').fill('TOMO picker target');
    await work.getByRole('button',{name:/TOMO picker target/}).click();
    await work.getByLabel('작업 대상 이름').fill('선택한 창');
    await work.getByRole('button',{name:'추가',exact:true}).click();
    const workState = await work.evaluate(()=>window.electronAPI.workTime.get());
    expect(workState.targets[0].target.title).toBe(snapshot.target?.title);
    expect(workState.targets[0].target.processName).toBe(snapshot.target?.processName);
    expect(workState.targets[0].target.mode).toBe('title');
    await work.screenshot({path:info.outputPath('window-picker-work.png')});
  } finally { await external.close(); }
});
