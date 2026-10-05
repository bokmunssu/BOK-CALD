import React, { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  currentMonthState,
  selectedDateState,
  selectedEventState,
  sidebarOpenState,
  viewModeState,
  stickerVisibilityState,
  googleCalendarSyncState,
} from "@store/atoms";
import { getNextMonth, getPreviousMonth, monthNames } from "@utils/calendar";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { IoSettings } from "react-icons/io5";
import { MdBrush, MdDeleteForever } from "react-icons/md";
import { FiInfo } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { BiRefresh } from "react-icons/bi";
import toast from "react-hot-toast";
import { electronStore } from "@utils/electronStore";
import { getCurrentVersion, checkForUpdates } from "@utils/version";
import { useGoogleCalendarSync } from "@hooks/useGoogleCalendarSync";
import styles from "./Header.module.scss";
import GoogleTasksPanel from '../Widgets/GoogleTasksPanel';

// Lazy load Google Calendar component
const GoogleCalendarSyncPanel = React.lazy(() =>
  import("@components/GoogleCalendar/GoogleCalendarSyncPanel").then((m) => ({
    default: m.GoogleCalendarSyncPanel,
  }))
);
const CategoryManager = React.lazy(() =>
  import("@components/Category/CategoryManager").then((m) => ({
    default: m.CategoryManager,
  }))
);
const StylingManager = React.lazy(() =>
  import("@components/Styling/StylingManager").then((m) => ({
    default: m.default,
  }))
);

const Header: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useRecoilState(currentMonthState);
  const [selectedDate, setSelectedDate] = useRecoilState(selectedDateState);
  const [sidebarOpen, setSidebarOpen] = useRecoilState(sidebarOpenState);
  const [viewMode, setViewMode] = useRecoilState(viewModeState);
  const setSelectedEvent = useSetRecoilState(selectedEventState);
  const [stickerVisibility, setStickerVisibility] = useRecoilState(
    stickerVisibilityState
  );
  const syncState = useRecoilValue(googleCalendarSyncState);
  const { importFromGoogle, isSyncing } = useGoogleCalendarSync();
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
  const [showGoogleTasks, setShowGoogleTasks] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showStylingManager, setShowStylingManager] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [updateLabel, setUpdateLabel] = useState('');

  // 앱 버전 로드 및 업데이트 확인
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await getCurrentVersion();
        setAppVersion(version);

        // 업데이트 확인 (백그라운드에서)
        if (!window.electronAPI?.updater || (await window.electronAPI.updater.status()).status === 'unsupported') {
          void checkForUpdates().then(info => setHasUpdate(info.hasUpdate)).catch(() => {});
        }
      } catch (error) {
        console.error("Failed to load version:", error);
      }
    };

    loadVersion();
  }, []);

  useEffect(() => window.electronAPI?.updater?.subscribe(update => {
    setHasUpdate(update.status === 'downloading' || update.status === 'ready');
    setUpdateLabel(update.status === 'ready' ? '업데이트 설치' : update.status === 'downloading' ? `${update.percent ?? 0}%` : '');
    if (update.status === 'ready') toast.success('새 버전 다운로드 완료. 상단 버전을 눌러 재시작·설치하세요.', { duration: 2500 });
  }), []);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handlePrevious = () => {
    if (viewMode === "day") {
      const newDate = dayjs(selectedDate).subtract(1, "day").toDate();
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else if (viewMode === "week") {
      const newDate = dayjs(selectedDate).subtract(1, "week").toDate();
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(getPreviousMonth(currentMonth));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      const newDate = dayjs(selectedDate).add(1, "day").toDate();
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else if (viewMode === "week") {
      const newDate = dayjs(selectedDate).add(1, "week").toDate();
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(getNextMonth(currentMonth));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const getDateDisplay = () => {
    if (viewMode === "day") {
      return dayjs(selectedDate).locale("ko").format("YYYY년 M월 D일 dddd");
    } else if (viewMode === "week") {
      return dayjs(selectedDate).format("YYYY년 M월");
    } else {
      return `${currentMonth.getFullYear()}년 ${
        monthNames[currentMonth.getMonth()]
      }`;
    }
  };

  const handleResetStore = async () => {
    const confirmed = window.confirm(
      "모든 일정을 삭제하시겠습니까?\n모든 일정이 삭제됩니다. 메모, 할 일, 테마와 연동 설정은 유지됩니다.\n\n이 작업은 되돌릴 수 없습니다."
    );

    if (!confirmed) return;

    try {
      // 모든 store 데이터 삭제
      await electronStore.set("events", []);

      toast.success("모든 일정이 삭제되었습니다. 페이지를 새로고침합니다.");

      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to reset store:", error);
      toast.error("데이터 초기화 실패");
    }
  };

  // 버전 확인
  const handleCheckVersion = async () => {
    setShowMenu(false);

    toast.loading("버전 확인 중...");

    try {
      if (window.electronAPI?.updater) {
        const update = await window.electronAPI.updater.check();
        toast.dismiss();
        if (update.status === 'ready') {
          if (confirm(`v${update.version} 다운로드가 완료됐습니다. 모든 TOMO 창을 닫고 업데이트 후 다시 시작할까요?`)) await window.electronAPI.updater.install();
          return;
        }
        if (update.status === 'downloading') { toast.success(`v${update.version} 다운로드 중 · ${update.percent ?? 0}%`); return; }
        if (update.status === 'current') { toast.success('최신 버전을 사용 중입니다.', { duration: 1400 }); return; }
        if (update.status === 'error') { toast.error(update.message || '업데이트 확인 실패'); return; }
      }
      const updateInfo = await checkForUpdates();

      toast.dismiss();

      if (updateInfo.status === 'unavailable') {
        toast.error('업데이트를 확인하지 못했습니다. 네트워크 또는 릴리즈 게시 여부를 확인해 주세요.');
        return;
      }
      if (updateInfo.hasUpdate) {
        const confirmed = window.confirm(
          `새로운 버전이 있습니다!\n\n` +
            `현재 버전: ${updateInfo.currentVersion}\n` +
            `최신 버전: ${updateInfo.latestVersion}\n\n` +
            `다운로드 페이지로 이동하시겠습니까?`
        );

        if (confirmed && updateInfo.url) {
          if (window.electronAPI?.openExternal) await window.electronAPI.openExternal(updateInfo.url);
          else window.open(updateInfo.url, '_blank', 'noopener');
        }
      } else {
        toast.success(
          `최신 버전을 사용 중입니다.\n현재 버전: ${updateInfo.currentVersion}`,
          { duration: 1400 }
        );
      }
    } catch (error) {
      toast.dismiss();
      toast.error("버전 확인 중 오류가 발생했습니다.");
      console.error("Version check failed:", error);
    }
  };

  // 구글 캘린더 동기화
  const handleGoogleSync = async () => {
    if (!syncState.isConnected) {
      toast.error("구글 캘린더와 먼저 연동해주세요");
      return;
    }

    try {
      await importFromGoogle();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button
          className={styles.menuButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className={styles.menuIcon}>☰</span>
        </button>
        <h1 className={styles.title}>TOMO</h1>
      </div>

      <div className={styles.centerSection}>
        <button className={styles.navButton} onClick={handlePrevious}>
          ←
        </button>
        <div className={styles.currentMonth}>
          <h2>{getDateDisplay()}</h2>
        </div>
        <button className={styles.navButton} onClick={handleNext}>
          →
        </button>
        <button className={styles.todayButton} onClick={handleToday}>
          오늘
        </button>
      </div>

      <div className={styles.rightSection}>
        <button
          className={`${styles.stickerToggle} ${
            stickerVisibility ? styles.active : ""
          }`}
          onClick={() => setStickerVisibility(!stickerVisibility)}
          title={stickerVisibility ? "스티커 숨기기" : "스티커 보이기"}
        >
          {stickerVisibility ? "ON" : "OFF"}
        </button>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${
              viewMode === "day" ? styles.active : ""
            }`}
            onClick={() => {
              setViewMode("day");
              setSelectedEvent(null);
            }}
          >
            일
          </button>
          <button
            className={`${styles.viewButton} ${
              viewMode === "week" ? styles.active : ""
            }`}
            onClick={() => {
              setViewMode("week");
              setSelectedEvent(null);
            }}
          >
            주
          </button>
          <button
            className={`${styles.viewButton} ${
              viewMode === "month" ? styles.active : ""
            }`}
            onClick={() => {
              setViewMode("month");
              setSelectedEvent(null);
            }}
          >
            월
          </button>
        </div>
        {appVersion && (
          <div
            className={styles.versionBadge}
            onClick={handleCheckVersion}
            title={
              hasUpdate
                ? "새로운 버전이 있습니다! 클릭하여 확인하세요."
                : "버전 정보"
            }
          >
            <span className={styles.versionText}>v{appVersion}</span>
            {updateLabel && <span className={styles.versionText}>{updateLabel}</span>}
            {hasUpdate && <span className={styles.updateDot}>●</span>}
          </div>
        )}
        <button
          className={styles.stylingButton}
          onClick={() => setShowStylingManager(true)}
          title="스타일링 매니저"
        >
          <MdBrush size={24} />
        </button>
        {syncState.isConnected && (
          <button
            className={`${styles.syncButton} ${isSyncing ? styles.syncing : ""}`}
            onClick={handleGoogleSync}
            disabled={isSyncing}
            title="구글 캘린더 동기화"
          >
            <BiRefresh size={24} className={isSyncing ? styles.rotating : ""} />
          </button>
        )}
        <div className={styles.googleMenu} ref={menuRef}>
          <button
            className={styles.googleButton}
            onClick={() => setShowMenu(!showMenu)}
            title="설정"
          >
            <IoSettings size={24} />
          </button>
          {showMenu && (
            <div className={styles.dropdown}>
              <button
                onClick={() => {
                  setShowCategoryManager(true);
                  setShowMenu(false);
                }}
              >
                카테고리 관리
              </button>
              <button
                onClick={() => {
                  setShowGoogleCalendar(true);
                  setShowMenu(false);
                }}
              >
                <FcGoogle size={18} />
                구글 캘린더
              </button>
              <button onClick={() => { setShowGoogleTasks(true); setShowMenu(false); }}>✓ Google Tasks</button>


              <button
                onClick={() => {
                  setShowMenu(false);
                  handleResetStore();
                }}
                className={styles.dangerButton}
              >
                데이터 초기화
              </button>
            </div>
          )}
        </div>
      </div>
{showGoogleTasks && <GoogleTasksPanel onClose={() => setShowGoogleTasks(false)} />}
      {showCategoryManager && (
        <React.Suspense fallback={<div>로딩 중...</div>}>
          <CategoryManager
            onClose={() => setShowCategoryManager(false)}
          />
        </React.Suspense>
      )}
      {showGoogleCalendar && (
        <React.Suspense fallback={<div>로딩 중...</div>}>
          <GoogleCalendarSyncPanel
            onClose={() => setShowGoogleCalendar(false)}
          />
        </React.Suspense>
      )}
      {showStylingManager && (
        <React.Suspense fallback={<div>로딩 중...</div>}>
          <StylingManager
            onClose={() => setShowStylingManager(false)}
          />
        </React.Suspense>
      )}
    </header>
  );
};

export default Header;
