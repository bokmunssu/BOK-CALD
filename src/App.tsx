import { useEffect, useRef, useCallback, useState } from "react";
import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import {
  sidebarOpenState,
  viewModeState,
  stickerEditModeState,
  stickersState,
  eventsState,
} from "@store/atoms";
import { Toaster } from "react-hot-toast";
import { notificationService } from "@/services/notificationService";
import TitleBar from "@components/Layout/TitleBar";
import WindowTitleBar from "@components/Common/WindowTitleBar";
import Header from "@components/Common/Header";
import Calendar from "@components/Calendar/Calendar";
import DayView from "@components/Calendar/DayView";
import WeekView from "@components/Calendar/WeekView";
import Sidebar from "@components/Sidebar/Sidebar";
import ResizableLayout from "@components/Common/ResizableLayout";
import CarouselBanner from "@components/Common/CarouselBanner";
import StickerCanvas from "@components/Styling/StickerCanvas";
import FloatingToolbar from "@components/Styling/FloatingToolbar";
import LoadingOverlay from "@components/Common/LoadingOverlay";
import { useTheme } from "@hooks/useTheme";
import styles from "./App.module.scss";

import WorkspaceControls from './components/Widgets/WorkspaceControls';
import { workspaceSettingsState } from './store/workspace';

function App() {
  const settings = useRecoilValue(workspaceSettingsState);
  const [sidebarOpen, setSidebarOpen] = useRecoilState(sidebarOpenState);
  const [viewMode, setViewMode] = useRecoilState(viewModeState);
  const stickerEditMode = useRecoilValue(stickerEditModeState);
  const setStickerEditMode = useSetRecoilState(stickerEditModeState);
  const [stickers, setStickers] = useRecoilState(stickersState);
  const events = useRecoilValue(eventsState);
  useTheme(); // Apply theme automatically
  const previousStickersRef = useRef(stickers);
  const isEditModeStartingRef = useRef(false);
  const [isWindows, setIsWindows] = useState(false);
  const [restored, setRestored] = useState(false);

  // 플랫폼 확인 함수
  const checkPlatform = async () => {
    try {
      if (window.electronAPI?.getPlatform) {
        const platform = await window.electronAPI.getPlatform();
        setIsWindows(platform === "win32");
      }
    } catch (error) {
      console.error("Failed to get platform:", error);
      setIsWindows(false);
    }
  };
  // 앱 시작 시 이전 상태 복원
  useEffect(() => {
    const restoreAppState = async () => {
      try {
        if (window.electronAPI?.store) {
          // UI 상태 복원 (테마 제외 - atoms.ts의 effect에서 처리)
          const savedUIState = await window.electronAPI.store.get("appUIState");
          if (savedUIState) {
            if (typeof savedUIState.sidebarOpen === "boolean") {
              setSidebarOpen(savedUIState.sidebarOpen);
            }
            if (["month", "week", "day"].includes(savedUIState.viewMode)) {
              setViewMode(savedUIState.viewMode);
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore app state:", error);
      } finally {
        setRestored(true);
      }
    };

    restoreAppState();
    checkPlatform();

    // Start notification service
    notificationService.start();

    // Cleanup on unmount
    return () => {
      notificationService.stop();
    };
  }, []);

  // Save after hydration, rather than relying on an IPC message during close.
  useEffect(() => {
    if (!restored) return;
    window.electronAPI?.store?.set("appUIState", { sidebarOpen, viewMode })
      .catch(error => console.error("Failed to save app state:", error));
  }, [restored, sidebarOpen, viewMode]);

  // Update notifications when events change
  useEffect(() => {
    notificationService.updateNotifications(events);
  }, [events]);

  // 편집 모드 상태 변화 감지
  useEffect(() => {
    if (stickerEditMode && !isEditModeStartingRef.current) {
      // 편집 모드 시작 시에만 현재 상태 저장
      previousStickersRef.current = [...stickers];
      isEditModeStartingRef.current = true;
    } else if (!stickerEditMode) {
      // 편집 모드 종료 시 플래그 리셋
      isEditModeStartingRef.current = false;
    }
  }, [stickerEditMode, stickers]);

  const handleEditComplete = useCallback(() => {
    setStickerEditMode(false);
  }, [setStickerEditMode]);

  const handleEditCancel = useCallback(() => {
    setStickers(previousStickersRef.current);
    setStickerEditMode(false);
  }, [setStickers, setStickerEditMode]);

  const renderView = () => {
    switch (viewMode) {
      case "day":
        return <DayView />;
      case "week":
        return <WeekView />;
      case "month":
        return <Calendar />;
      default:
        return <Calendar />;
    }
  };

  return (
    <div
      className={`${styles.app} ${
        isWindows ? styles.winSystemTitleBar : ""
      }`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          },
          error: {
            style: {
              background: "var(--color-danger-light)",
              color: "var(--color-danger)",
              border: "1px solid var(--color-danger)",
            },
          },
        }}
      />

      <LoadingOverlay />

      <TitleBar />
      <Header />
      <WorkspaceControls />
      <div className={styles.mainContent}>
        {sidebarOpen ? (
          <ResizableLayout sidebar={<Sidebar />} minWidth={240} maxWidth={480}>
            <div className={styles.calendarContainer}>
              {!settings.simple && settings.bannerVisible && <CarouselBanner height={settings.bannerHeight} />}
              {renderView()}
            </div>
          </ResizableLayout>
        ) : (
          <div className={styles.calendarContainer}>
            {!settings.simple && settings.bannerVisible && <CarouselBanner height={settings.bannerHeight} />}
            {renderView()}
          </div>
        )}
      </div>
      {!settings.simple && <StickerCanvas />}
      {stickerEditMode && (
        <FloatingToolbar
          onClose={handleEditComplete}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
}

export default App;
