import React, { useState, useEffect } from 'react';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import { dDaysState, visibleDDayIdsState, visibleDDaysState, modalActiveState } from '@store/atoms';
import { DDay } from '@types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { MdClose, MdEdit, MdDelete, MdCheck, MdCalendarToday, MdOpenInNew } from 'react-icons/md';
import { openWidget } from '../Widgets/WorkspaceControls';
import CustomDatePicker from './CustomDatePicker';
import styles from './DDayModal.module.scss';

interface DDayModalProps {
  onClose: () => void;
}

const DDayModal: React.FC<DDayModalProps> = ({ onClose }) => {
  const [ddays, setDDays] = useRecoilState(dDaysState);
  const visible = useRecoilValue(visibleDDaysState);
  const setVisible = useSetRecoilState(visibleDDayIdsState);
  const setModalActive = useSetRecoilState(modalActiveState);
  const [showForm, setShowForm] = useState(false);
  const [editingDDay, setEditingDDay] = useState<DDay | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !targetDate) return;

    const newDDay: DDay = {
      id: editingDDay?.id || uuidv4(),
      title: title.trim(),
      description: description.trim(),
      targetDate: targetDate,
      isActive: false,
      createdAt: editingDDay?.createdAt || new Date()
    };

    if (editingDDay) {
      setDDays(prev => prev.map(d => d.id === editingDDay.id ? newDDay : d));
    } else {
      setDDays(prev => [...prev, newDDay]);
      // 첫 번째 D-Day인 경우 자동 활성화
      if (ddays.length === 0) {
        setVisible([newDDay.id]);
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDate(null);
    setShowForm(false);
    setEditingDDay(null);
  };

  const handleEdit = (dday: DDay) => {
    setEditingDDay(dday);
    setTitle(dday.title);
    setDescription(dday.description || '');
    setTargetDate(new Date(dday.targetDate));
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setDDays(prev => prev.filter(d => d.id !== id));
      setVisible(visible.filter(day => day.id !== id).map(day => day.id));
    }
  };

  const handleSetActive = (dday: DDay) => {
    setVisible(visible.some(day => day.id === dday.id) ? visible.filter(day => day.id !== dday.id).map(day => day.id) : [...visible.map(day => day.id), dday.id]);
  };

  // 모달 마운트/언마운트 시 모달 상태 관리
  useEffect(() => {
    setModalActive(true);
    return () => setModalActive(false);
  }, [setModalActive]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>D-DAY 관리</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className={styles.modalBody}>
          {!showForm ? (
            <button
              className={styles.addNewButton}
              onClick={() => setShowForm(true)}
            >
              + 새로운 D-Day 추가
            </button>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="modal-dday-title">제목</label>
                <input
                  id="modal-dday-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="D-Day 제목을 입력하세요"
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label>날짜</label>
                <CustomDatePicker
                  selected={targetDate}
                  onChange={(date) => setTargetDate(date)}
                  placeholderText="D-Day 날짜를 선택하세요"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="modal-dday-desc">설명 (선택)</label>
                <textarea
                  id="modal-dday-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="어떤 날인지 설명해주세요"
                  rows={3}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={resetForm} className={styles.cancelButton}>
                  취소
                </button>
                <button type="submit" className={styles.saveButton}>
                  {editingDDay ? '수정' : '저장'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.ddayList}>
            {ddays.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><MdCalendarToday /></span>
                <p>등록된 D-Day가 없습니다</p>
                <span>중요한 날을 추가해보세요</span>
              </div>
            ) : (
              ddays.map(dday => {
                const isActive = visible.some(day => day.id === dday.id);
                return (
                  <div
                    key={dday.id}
                    className={`${styles.ddayItem} ${isActive ? styles.active : ''}`}
                  >
                    <div className={styles.ddayInfo}>
                      <div className={styles.ddayHeader}>
                        <span className={styles.ddayItemTitle}>{dday.title}</span>
                        {isActive && (
                          <span className={styles.activeBadge}>캘린더 표시</span>
                        )}
                      </div>
                      <div className={styles.ddayItemDate}>
                        {format(new Date(dday.targetDate), 'yyyy년 MM월 dd일')}
                      </div>
                      {dday.description && (
                        <div className={styles.ddayItemDesc}>{dday.description}</div>
                      )}
                    </div>
                    <div className={styles.ddayActions}>
                      <button className={styles.editButton} aria-label={`${dday.title} 위젯 열기`} title="이 디데이를 위젯으로 열기" onClick={() => openWidget('dday', dday.id)}><MdOpenInNew /></button>
                      {(
                        <button
                          className={styles.activateButton}
                          onClick={() => handleSetActive(dday)}
                          title={isActive ? '캘린더에서 숨기기' : '캘린더에 표시'}
                          aria-label={`${dday.title} 캘린더 표시`}
                          aria-pressed={isActive}
                        >
                          <MdCheck />
                        </button>
                      )}
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(dday)}
                        title="수정"
                      >
                        <MdEdit />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(dday.id)}
                        title="삭제"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DDayModal;
