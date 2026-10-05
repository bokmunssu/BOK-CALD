import { useEffect, useState } from "react";
import { FiX, FiRefreshCw, FiLogOut, FiCheck, FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import type {
  GoogleTaskList,
  GoogleTasksStatus,
} from "../../types/googleTasks";
import styles from "./Widgets.module.scss";
import GoogleTasksIcon from "../Common/GoogleTasksIcon";

export default function GoogleTasksPanel({ onClose }: { onClose: () => void }) {
  const api = window.electronAPI?.googleTasks;
  const [state, setState] = useState<GoogleTasksStatus>({
    configured: false,
    connected: false,
    syncing: false,
    autoSync: true,
  });
  const [lists, setLists] = useState<GoogleTaskList[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!api) return;
    let alive = true;
    const off = api.subscribe((value) => {
      if (alive) setState(value);
    });
    api
      .status()
      .then(async (value) => {
        if (!alive) return;
        setState(value);
        setSelected(value.listId || "");
        setReady(true);
        if (value.connected) {
          const items = await api.lists();
          if (alive) setLists(items);
        }
      })
      .catch((error) => toast.error(String(error)));
    return () => {
      alive = false;
      off();
      api.cancel().catch(() => {});
    };
  }, []);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={styles.syncPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-tasks-title"
      >
        <header className={styles.sectionHeading}>
          <GoogleTasksIcon size={24} />
          <h2 id="google-tasks-title">Google Tasks</h2>
          <span className={styles.spacer} />
          <button
            className={styles.iconButton}
            aria-label="연동 설정 닫기"
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>
        <p className={styles.message}>
          본인 Google 계정으로 로그인하고 동기화할 목록을 선택하세요. 토큰은 이
          컴퓨터에 암호화해 저장됩니다.
        </p>
        {!state.connected ? (
          <div className={styles.connectionIntro}>
            <div className={styles.connectionIcon}><GoogleTasksIcon size={32} /></div>
            <strong>기기 밖에서도 이어지는 할 일</strong>
            <p>
              로그인하고 목록을 선택하면 제목·기한·완료 상태가 양방향으로
              동기화됩니다.
            </p>
            <button
              className={styles.primaryButton}
              disabled={!ready || busy || !state.configured}
              onClick={() =>
                run(async () => {
                  const value = await api.login();
                  setState(value);
                  setLists(await api.lists());
                  setSelected(value.listId || "");
                })
              }
            >
              {busy ? "브라우저에서 로그인 중…" : "Google 계정으로 로그인"}
            </button>
            {busy && <button onClick={() => api.cancel()}>로그인 취소</button>}
            {ready && !state.configured && (
              <p className={styles.message}>
                이 빌드의 Google 연결 설정이 누락되었습니다. 배포자에게 문의해
                주세요.
              </p>
            )}
            <button
              onClick={() =>
                window.electronAPI.openExternal("https://tasks.google.com/")
              }
            >
              Google Tasks 웹 열기
            </button>
          </div>
        ) : (
          <>
            <div className={styles.accountCard}>
              <FiCheck />
              <div>
                <strong>연결됨</strong>
                <small>{state.email}</small>
              </div>
              <span className={styles.spacer} />
              <button
                className={styles.iconButton}
                title="로그아웃"
                aria-label="Google 연결 해제"
                disabled={busy || state.syncing}
                onClick={() =>
                  run(async () => {
                    setState(await api.disconnect());
                    setLists([]);
                  })
                }
              >
                <FiLogOut />
              </button>
            </div>
            <label className={styles.fieldLabel}>
              동기화할 목록
              <select
                aria-label="Google Tasks 목록"
                value={selected}
                disabled={busy || state.syncing}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">목록 선택</option>
                <option value="__all__">전체 목록 동기화</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                disabled={busy || state.syncing}
                onClick={() =>
                  run(async () => {
                    const list = await api.createList();
                    setLists(await api.lists());
                    setSelected(list.id);
                    setState(await api.status());
                  })
                }
              >
                <FiPlus />
                TOMO 목록 만들기
              </button>
              <button
                className={styles.primaryButton}
                disabled={!selected || busy || state.syncing}
                onClick={() =>
                  run(async () => {
                    if (selected !== state.listId)
                      await api.selectList(selected);
                    setState(await api.sync());
                    toast.success("할 일을 동기화했습니다.");
                  })
                }
              >
                <FiRefreshCw />
                {busy || state.syncing ? "동기화 중…" : "지금 동기화"}
              </button>
            </div>
            <label className={styles.compactToggle}>
              <input
                type="checkbox"
                checked={state.autoSync}
                disabled={busy}
                onChange={(e) =>
                  run(async () =>
                    setState(await api.autoSync(e.target.checked)),
                  )
                }
              />
              자동 동기화 (1분마다)
            </label>
            <p className={styles.message}>
              아직 연결하지 않은 이 앱의 할 일은 선택한 목록에 추가됩니다.
              삭제도 양쪽에 반영됩니다. 같은 항목을 동시에 수정하면 로컬 사본을
              남겨 내용을 보존합니다. 목록 변경도 Google Tasks에 반영됩니다. 중요 표시는 Google API가 지원하지 않아 TOMO에만 저장됩니다.
              Google 캘린더와 로그인은 별도로 관리됩니다.
            </p>
            {state.lastSync && (
              <small className={styles.message}>
                마지막 동기화 {new Date(state.lastSync).toLocaleString("ko-KR")}
              </small>
            )}
          </>
        )}
        {state.needsReview && (
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "Google Tasks 웹에서 중복/누락 항목을 확인했나요? 이동/추가 결과를 확인하세요. 다음 동기화에서 확인되지 않은 항목을 다시 추가할 수 있습니다.",
                )
              )
                run(async () => setState(await api.resolveCreate()));
            }}
          >
            변경 결과 확인 후 재시도
          </button>
        )}
        {state.error && (
          <p className={styles.errorText} role="alert">
            {state.error}
          </p>
        )}
      </section>
    </div>
  );
}
