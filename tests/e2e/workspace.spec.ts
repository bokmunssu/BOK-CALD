import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';

let app: ElectronApplication;
let calendar: Page;

test('connected multi-day bars span the date columns and the choice survives reload', async ({},info)=>{
  await calendar.evaluate(async()=>{
    const date=new Date();date.setDate(5);const end=new Date(date);end.setDate(9);
    await window.electronAPI.store.set('events',[{id:'range',title:'연속 일정 시험',date,endDate:end,color:'#7a99d6',isAllDay:true},{id:'overlap',title:'겹침 시험',date:new Date(date.getFullYear(),date.getMonth(),6),endDate:new Date(date.getFullYear(),date.getMonth(),8),color:'#d699a7',isAllDay:true}]);
  });
  await calendar.reload();
  await calendar.getByLabel('기간 일정 표시').selectOption('connected');
  const bar=calendar.locator('[data-span-id="range"]');await expect(bar).toHaveCount(1);
  const overlap=calendar.locator('[data-span-id="overlap"]');await expect(overlap).toHaveCount(1);
  const box=await bar.boundingBox(),other=await overlap.boundingBox();
  expect(box!.width).toBeGreaterThan(200);expect(other!.y).toBeGreaterThanOrEqual(box!.y+box!.height);
  await calendar.reload();await expect(calendar.getByLabel('기간 일정 표시')).toHaveValue('connected');
  await expect.poll(()=>calendar.getByRole('complementary').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  await calendar.screenshot({path:info.outputPath('connected-calendar.png')});
  await bar.click();await calendar.getByRole('button',{name:'수정',exact:true}).first().click();await expect(calendar.getByLabel('일정 제목')).toHaveValue('연속 일정 시험');
  await calendar.getByRole('button',{name:'취소',exact:true}).click();
  await calendar.getByRole('button',{name:'주',exact:true}).click();
  await expect(bar).toHaveCount(1);await expect(overlap).toHaveCount(1);
  await calendar.screenshot({path:info.outputPath('connected-week.png')});
  await calendar.getByRole('button',{name:'월',exact:true}).click();
  await calendar.getByLabel('기간 일정 표시').selectOption('daily');
  await expect(bar).toHaveCount(0);
  await expect(calendar.locator('[class*="calendarGrid_"]').getByText('연속 일정 시험',{exact:true})).toHaveCount(5);
});

test('todo list pickers replace tags and the sync dialog offers all lists with a Google icon', async ({},info)=>{
  await app.evaluate(({ipcMain})=>{
    let state={configured:true,connected:true,accountId:'test-account',email:'test@example.com',syncing:false,autoSync:true,listId:'personal',defaultListId:'personal',lists:[{id:'personal',title:'내 할 일 목록'},{id:'study',title:'공부'},{id:'school',title:'학업'}]};
    for(const name of ['status','lists','select','sync'])ipcMain.removeHandler('googleTasks-'+name);
    ipcMain.handle('googleTasks-status',()=>state);
    ipcMain.handle('googleTasks-lists',()=>state.lists);
    ipcMain.handle('googleTasks-select',(_,id)=>{state={...state,listId:id};return state;});
    ipcMain.handle('googleTasks-sync',()=>state);
  });
  const todo=await openWidget('todo');
  await todo.getByLabel('새 할 일 목록').selectOption('study');
  await todo.getByLabel('새 할 일',{exact:true}).fill('목록 선택 시험');await todo.getByRole('button',{name:'추가',exact:true}).click();
  await expect(todo.getByLabel('목록 선택 시험 목록',{exact:true})).toHaveValue('study');
  await todo.getByLabel('목록 선택 시험 목록',{exact:true}).selectOption('school');
  await expect.poll(()=>todo.evaluate(async()=>{return (await window.electronAPI.store.get('todos'))[0]?.taskListId;})).toBe('school');
  await expect(todo.getByLabel(/태그/)).toHaveCount(0);
  await todo.screenshot({path:info.outputPath('tasks-list-row.png')});
  await todo.getByLabel('Google Tasks 연동').click();
  const dialog=todo.getByRole('dialog');await dialog.getByLabel('Google Tasks 목록').selectOption('__all__');
  await dialog.getByRole('button',{name:'지금 동기화'}).click();
  await expect(dialog.getByLabel('Google Tasks 목록')).toHaveValue('__all__');
  await expect(dialog.locator('svg path[stroke="#4285f4"]')).toHaveCount(1);
  await todo.screenshot({path:info.outputPath('tasks-list-selection.png')});
});

test('lunar display is optional and a lunar schedule stores its converted solar date', async ({}, info) => {
  await calendar.getByLabel('음력 표시', {exact:true}).check();
  await expect(calendar.locator('[class*="calendarDay_"]').first().getByText(/음력/)).toBeVisible();
  await calendar.reload();await expect(calendar.getByLabel('음력 표시', {exact:true})).toBeChecked();
  await calendar.getByRole('button',{name:'+ 일정 추가',exact:true}).click();
  await calendar.getByLabel('일정 제목').fill('음력 설날 시험');
  await calendar.getByLabel('음력 날짜 선택',{exact:true}).click();
  await calendar.getByLabel('음력 연도').fill('2026');await calendar.getByLabel('음력 월').selectOption('1');await calendar.getByLabel('음력 일').selectOption('1');
  await expect(calendar.getByText(/양력 2026.2.17/)).toBeVisible();
  await calendar.screenshot({path:info.outputPath('lunar-date-input.png')});
  await calendar.getByRole('button',{name:'저장',exact:true}).click();
  await expect.poll(async()=>calendar.evaluate(async()=>{const items=await window.electronAPI.store.get('events');return items.find((e:any)=>e.title==='음력 설날 시험')?.lunarDate;})).toMatchObject({year:2026,month:1,day:1});
  const saved=await calendar.evaluate(async()=>{const e=(await window.electronAPI.store.get('events')).find((e:any)=>e.title==='음력 설날 시험');const d=new Date(e.date);return [d.getFullYear(),d.getMonth()+1,d.getDate()];});expect(saved).toEqual([2026,2,17]);
  await calendar.getByLabel('음력 표시',{exact:true}).uncheck();await expect(calendar.locator('[class*="calendarDay_"]').getByText(/음력/)).toHaveCount(0);
});

test('stored holiday subscriptions are hidden while similarly named user schedules remain', async () => {
  await calendar.evaluate(async()=>{const date=new Date();await window.electronAPI.store.set('events',[{id:'holiday',title:'가져온 공휴일 시험',date,color:'#ff0000',googleCalendarId:'ko.south_korea#holiday@group.v.calendar.google.com'},{id:'user',title:'내 공휴일 약속',date,color:'#888888'}]);});
  await calendar.reload();await expect(calendar.getByText('가져온 공휴일 시험',{exact:true})).toHaveCount(0);await expect(calendar.getByText('내 공휴일 약속',{exact:true}).first()).toBeVisible();
});
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
  await calendar.getByTitle('스타일링 매니저').click();
  await calendar.getByRole('button', { name: '배너', exact: true }).click();
  await calendar.getByLabel('배너 높이', { exact: true }).fill('240');
  await calendar.locator('[class*="overlay_"]').filter({ has: calendar.getByText('스타일 관리', {exact:true}) }).locator('[class*="closeButton_"]').click();
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
  await calendar.getByTitle('스타일링 매니저').click();
  await calendar.getByRole('button', { name: '배너', exact: true }).click();
  await calendar.getByLabel('배너 표시', { exact: true }).uncheck();
  await calendar.locator('[class*="overlay_"]').filter({ has: calendar.getByText('스타일 관리', {exact:true}) }).locator('[class*="closeButton_"]').click();
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
  await app.evaluate(async ({ BrowserWindow }) => {
    const win = new BrowserWindow({ title: 'TOMO focus test target', width: 320, height: 240 });
    await win.loadURL('about:blank'); win.setAlwaysOnTop(true); win.show(); win.focus();
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
  await todo.getByRole('button', { name: 'Google Tasks 연동' }).click();
  await expect(todo.getByRole('heading', { name: 'Google Tasks' })).toBeVisible();
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
  await calendar.getByTitle('스타일링 매니저').click();
  await calendar.getByRole('button', { name: 'Aa 폰트', exact: true }).click();
  await calendar.getByLabel('폰트 검색').fill('Arial');
  await calendar.getByRole('button', { name: 'Arial', exact: true }).click();
  await expect.poll(() => todo.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('TomoInstalled');
  await calendar.locator('[class*="overlay_"]').filter({ has: calendar.getByText('스타일 관리', {exact:true}) }).locator('[class*="closeButton_"]').click();
  await calendar.reload();
  await expect.poll(() => calendar.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('TomoInstalled');
});
test('Google modal covers the compact toolbar and explains missing configuration', async ({}, info) => {
  await calendar.getByRole('button', { name: '설정', exact: true }).click();
  await calendar.getByRole('button', { name: '구글 캘린더', exact: true }).click();
  const dialog = calendar.getByRole('dialog', { name: '구글 캘린더 연동' });
  await expect(dialog).toBeVisible();
  const configured = await calendar.evaluate(async () => (await window.electronAPI.googleAccount.info()).configured);
  if (configured) await expect(dialog.getByRole('button', {name:'구글 계정으로 연동하기'})).toBeEnabled();
  else await expect(dialog.getByRole('button', {name:'구글 계정으로 연동하기'})).toBeDisabled();
  const onTop = await calendar.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')!;
    const box = document.querySelector('[class*="workspaceBar"]')!.getBoundingClientRect();
    return dialog.contains(document.elementFromPoint(box.x + 20, box.y + 10));
  });
  expect(onTop).toBe(true);
  await expect(dialog.getByText('고급 연결 설정', {exact:true})).toHaveCount(0);
  await expect(dialog.getByLabel('Google 클라이언트 ID')).toHaveCount(0);
  await calendar.screenshot({path:info.outputPath('google-settings.png')});
  await dialog.getByRole('button', {name:'구글 연동 닫기'}).click();
});

test('a fresh external profile has common login configuration and no advanced fields', async () => {
  const config = await calendar.evaluate(async () => ({ google: await window.electronAPI.googleAccount.info(), tasks: await window.electronAPI.googleTasks.status() }));
  expect(config.google.personal).toBe(false);
  expect(config.google.configured).toBe(true);
  expect(config.tasks.configured).toBe(true);
  const todo = await openWidget('todo'); await todo.getByLabel('Google Tasks 연동').click();
  await expect(todo.getByRole('button',{name:'Google 계정으로 로그인'})).toBeEnabled();
  await expect(todo.getByText('고급 연결 설정')).toHaveCount(0);
  await expect(todo.getByLabel('Microsoft 개인 앱 ID')).toHaveCount(0);
});

test('multiple calendar D-days can be shown, hidden and restored independently', async () => {
  await calendar.evaluate(async () => {
    const now = new Date();
    await window.electronAPI.store.set('dDays', ['first', 'second'].map(id => ({ id, title:id, targetDate:now, createdAt:now, isActive:false })));
    await window.electronAPI.store.set('activeDDay', { id:'first', title:'first', targetDate:now, createdAt:now });
  });
  await calendar.reload();
  await calendar.getByLabel('D-DAY 관리').click();
  await calendar.getByLabel('second 캘린더 표시').click();
  await expect(calendar.getByLabel('first 캘린더 표시')).toHaveAttribute('aria-pressed', 'true');
  await expect(calendar.getByLabel('second 캘린더 표시')).toHaveAttribute('aria-pressed', 'true');
  await calendar.locator('[class*="modalHeader_"] [class*="closeButton_"]').click();
  const strip = calendar.locator('[class*="ddayWidget_"]');
  await expect(strip.getByText('first',{exact:true})).toBeVisible(); await expect(strip.getByText('second',{exact:true})).toBeVisible();
  await calendar.getByLabel('D-DAY 관리').click(); await calendar.getByLabel('first 캘린더 표시').click(); await calendar.locator('[class*="modalHeader_"] [class*="closeButton_"]').click();
  await calendar.reload(); await expect(strip.getByText('first',{exact:true})).toHaveCount(0); await expect(strip.getByText('second',{exact:true})).toBeVisible();
});

test('image-heavy typing batches small patches and closing flushes the latest memo and font size', async ({}, info) => {
  const png = await sharp(randomBytes(1024*1024*3), { raw: { width:1024, height:1024, channels:3 } }).png().toBuffer();
  const image = 'data:image/png;base64,' + png.toString('base64');
  await calendar.evaluate(async image => { const now=new Date(); await window.electronAPI.store.set('memos',Array.from({length:25},(_,i)=>({id:`heavy-${i}`,title:`메모 ${i}`,image,content:'',date:now,createdAt:now,updatedAt:now}))); },image);
  const stats = await calendar.evaluate(async () => { const notes = await window.electronAPI.store.get('memos'); return { bytes:JSON.stringify(notes).length, image:notes[0].image }; });
  expect(stats.bytes).toBeLessThan(15000); expect(stats.image).toMatch(/^tomo-image:/);
  const memo = await openWidget('memo','heavy-0');
  await expect.poll(() => memo.getByAltText('메모 이미지').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
  await memo.getByLabel('메모 글자 크기').selectOption('24');
  await calendar.evaluate(() => { (window as any).patchStats=[]; window.electronAPI.onStorePatched((key,patch)=>{ if(key==='memos') (window as any).patchStats.push(JSON.stringify(patch).length); }); });
  const editor=memo.getByLabel('메모 내용'); await editor.click();
  const text='빠르게 입력해도 마지막 글자가 저장됩니다. '.repeat(8);
  await editor.pressSequentially(text,{delay:1});
  await expect(editor).toContainText(text.trim());
  const closed = memo.waitForEvent('close');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('memoId=heavy-0'))!.close()); await closed;
  const reopened=await openWidget('memo','heavy-0');
  await expect(reopened.getByLabel('메모 내용')).toContainText(text.trim());
  await expect(reopened.getByLabel('메모 글자 크기')).toHaveValue('24');
  await expect(reopened.getByLabel('메모 내용')).toHaveCSS('font-size','24px');
  const patches = await calendar.evaluate(()=>(window as any).patchStats);
  expect(patches.length).toBeGreaterThan(0); expect(patches.length).toBeLessThan(10); expect(patches.every((size:number)=>size<10000)).toBe(true);
  await info.attach('typing-patch-sizes',{body:JSON.stringify({ compactStoreBytes:stats.bytes, patchSizes:patches }),contentType:'application/json'});
  fs.writeFileSync(info.outputPath('typing-performance.json'), JSON.stringify({ originalImageBytes:png.length, originalInlineBytes:25*image.length, compactStoreBytes:stats.bytes, patchSizes:patches },null,2));
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
  await expect(banner.getByAltText('캘린더 배너')).toHaveAttribute('src', /data:image/);
  await banner.hover();
  await calendar.getByRole('button',{name:'배너 표시 위치 조정'}).click();
  await calendar.getByLabel('배너 세로 위치').fill('15');
  await calendar.getByLabel('배너 확대/축소').fill('1.8');
  await calendar.getByRole('button',{name:'위치 저장'}).click();
  await expect.poll(() => calendar.evaluate(async () => (await window.electronAPI.store.get('bannerImages'))[0].positionY)).toBe(15);
  expect(await calendar.evaluate(async () => (await window.electronAPI.store.get('bannerImages'))[0].image)).toBe(image);
  expect(await calendar.evaluate(async () => (await window.electronAPI.store.get('bannerImages'))[0].zoom)).toBe(1.8);
  await calendar.screenshot({path:info.outputPath('banner-position.png')});
});

test('note and todo image placement survives resizing and reopening', async ({}, info) => {
  const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#b6d7ff"/><circle cx="200" cy="100" r="80" fill="#ffb6c1"/></svg>').toString('base64');
  const now = new Date().toISOString();
  await calendar.evaluate(async ({image,now}) => {
    await window.electronAPI.store.set('memos',[{id:'header-note',title:'이미지 메모',content:'본문',image,date:now,createdAt:now,updatedAt:now}]);
    await window.electronAPI.store.set('todoAppearance',{image});
  },{image,now});
  const memo = await openWidget('memo','header-note'); const todo = await openWidget('todo');
  for (const [page,label] of [[memo,'메모'],[todo,'할 일']] as const) {
    await page.getByLabel(`${label} 이미지 표시 조정`).click();
    await page.getByLabel('배너 가로 위치').fill('25');
    await page.getByLabel('배너 세로 위치').fill('75');
    await page.getByLabel('배너 확대/축소').fill('2');
    await page.getByRole('button',{name:'위치 저장'}).click();
    await expect(page.getByAltText(`${label} 이미지`)).toHaveCSS('transform', 'matrix(2, 0, 0, 2, 0, 0)');
    await page.reload();
    await expect(page.getByAltText(`${label} 이미지`)).toHaveCSS('object-position', '25% 75%');
  }
  await app.evaluate(({BrowserWindow}) => { for (const win of BrowserWindow.getAllWindows()) if (win.webContents.getURL().includes('widget=')) win.setSize(260,240); });
  await expect.poll(() => memo.locator('main').evaluate(el => Number(getComputedStyle(el).zoom))).toBeLessThan(1);
  const body = memo.getByLabel('메모 내용'); await body.fill('작은 창에서도 입력');
  await expect.poll(() => memo.evaluate(async () => (await window.electronAPI.store.get('memos'))[0].content)).toBe('작은 창에서도 입력');
  expect(await todo.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth)).toBe('none');
  await memo.screenshot({path:info.outputPath('compact-image-note.png')});
});

test('palette suggestions preserve the chosen color and preview without looping', async ({}, info) => {
  const errors: string[] = []; calendar.on('pageerror', error => errors.push(error.message));
  await calendar.getByTitle('스타일링 매니저').click();
  await calendar.getByRole('button',{name:'테마',exact:true}).click();
  await calendar.getByRole('button',{name:'+ 커스텀 테마 만들기'}).click();
  await calendar.getByLabel('테마 추천 기준 색').fill('#6374aa');
  await calendar.getByRole('button',{name:'차분한 다크'}).click();
  await calendar.getByLabel('실시간 미리보기').check();
  await expect.poll(() => calendar.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim())).toBe('#6374aa');
  await calendar.getByPlaceholder('테마 이름을 입력하세요').fill('추천 테스트');
  await calendar.getByRole('button',{name:'테마 생성',exact:true}).click();
  await expect.poll(() => calendar.evaluate(async () => (await window.electronAPI.store.get('currentTheme')).name)).toBe('추천 테스트');
  expect(errors).toEqual([]);
  await calendar.screenshot({path:info.outputPath('recommended-theme.png')});
});

test('installed font families load and window inventory measures cold and cached requests', async ({}, info) => {
  test.skip(process.platform !== 'win32');
  const result = await calendar.evaluate(async () => {
    const start = performance.now(); const fonts = await (window as any).queryLocalFonts();
    const fontMs = performance.now()-start;
    const regular = new Map<string, any>(); for (const f of fonts) if (!regular.has(f.family) || /regular|normal/i.test(f.style)) regular.set(f.family,f);
    const failures: string[] = [];
    for (const [family,font] of regular) {
      try {
        try { await new FontFace('TomoFontAudit', `local(${JSON.stringify(font.fullName)}), local(${JSON.stringify(font.postscriptName)})`).load(); }
        catch { await new FontFace('TomoFontAudit', await (await font.blob()).arrayBuffer()).load(); }
      }
      catch { failures.push(family); }
    }
    const first = performance.now(); const windows = await window.electronAPI.system.windows(); const windowMs = performance.now()-first;
    const repeated = performance.now(); await window.electronAPI.system.windows(); const cachedWindowMs = performance.now()-repeated;
    return {familyCount:regular.size,fontMs,failures,windowCount:windows.length,windowMs,cachedWindowMs};
  });
  expect(result.familyCount).toBeGreaterThan(0);
  fs.writeFileSync(info.outputPath('performance.json'), JSON.stringify(result,null,2));
  await info.attach('local-fonts-and-window-performance',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  expect(result.failures).toEqual([]);
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
