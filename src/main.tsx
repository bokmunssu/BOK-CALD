import React from 'react';
import ReactDOM from 'react-dom/client';
import { RecoilRoot } from 'recoil';
import ErrorBoundary from './components/Common/ErrorBoundary';
import './styles/index.scss';

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
