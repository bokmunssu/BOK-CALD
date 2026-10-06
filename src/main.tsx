import React from 'react';
import ReactDOM from 'react-dom/client';
import { RecoilRoot } from 'recoil';
import ErrorBoundary from './components/Common/ErrorBoundary';
import './styles/index.scss';
import { flushEdits } from './utils/editing';
import toast from 'react-hot-toast';
// Discard obsolete browser-side credentials; encrypted main-process accounts remain intact.
localStorage.removeItem('googleCalendarAuth');
window.electronAPI?.onFlushEdits?.(async () => { try { await flushEdits(); } catch (error) { toast.error('저장하지 못해 창을 닫지 않았습니다. 저장 공간을 확인해 주세요.'); throw error; } });

const App = React.lazy(() => import('./App'));
const WidgetApp = React.lazy(() => import('./components/Widgets/WidgetApp'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RecoilRoot>
        <React.Suspense fallback={<p role="status">불러오는 중…</p>}>
          {new URLSearchParams(location.search).has('widget') ? <WidgetApp /> : <App />}
        </React.Suspense>
      </RecoilRoot>
    </ErrorBoundary>
  </React.StrictMode>,
);
