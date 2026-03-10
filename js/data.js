/**
 * data.js — 공유 데이터 레이어
 * GitHub Pages 환경에서는 localStorage를 사용합니다.
 * 실제 배포 시에는 GitHub Issues API로 교체 가능합니다.
 */

const DB = {
  // ── 슬롯(가능 시간) 관리 ──
  getSlots() {
    try {
      return JSON.parse(localStorage.getItem('interview_slots') || '[]');
    } catch { return []; }
  },

  saveSlots(slots) {
    localStorage.setItem('interview_slots', JSON.stringify(slots));
  },

  addSlot(slot) {
    const slots = this.getSlots();
    // 중복 방지
    const exists = slots.some(s => s.id === slot.id);
    if (!exists) slots.push(slot);
    this.saveSlots(slots);
    return slots;
  },

  removeSlot(slotId) {
    // 예약이 있으면 삭제 불가
    const reservations = this.getReservations();
    const hasBooking = reservations.some(r => r.slotId === slotId);
    if (hasBooking) return { ok: false, msg: '예약이 있어 삭제할 수 없습니다.' };

    const slots = this.getSlots().filter(s => s.id !== slotId);
    this.saveSlots(slots);
    return { ok: true };
  },

  // ── 예약 관리 ──
  getReservations() {
    try {
      return JSON.parse(localStorage.getItem('interview_reservations') || '[]');
    } catch { return []; }
  },

  saveReservations(reservations) {
    localStorage.setItem('interview_reservations', JSON.stringify(reservations));
  },

  bookSlot({ slotId, name, studentId, email }) {
    const slots = this.getSlots();
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return { ok: false, msg: '슬롯을 찾을 수 없습니다.' };

    const reservations = this.getReservations();
    const alreadyBooked = reservations.some(r => r.slotId === slotId);
    if (alreadyBooked) return { ok: false, msg: '이미 예약된 시간입니다.' };

    const reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      slotId,
      name,
      studentId,
      email,
      bookedAt: new Date().toISOString(),
    };

    reservations.push(reservation);
    this.saveReservations(reservations);
    return { ok: true, reservation };
  },

  cancelReservation(reservationId, studentId) {
    const reservations = this.getReservations();
    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx === -1) return { ok: false, msg: '예약을 찾을 수 없습니다.' };
    if (reservations[idx].studentId !== studentId) return { ok: false, msg: '본인 예약만 취소할 수 있습니다.' };

    reservations.splice(idx, 1);
    this.saveReservations(reservations);
    return { ok: true };
  },

  // ── 슬롯 상태 조회 ──
  getSlotStatus(slotId) {
    const reservations = this.getReservations();
    const res = reservations.find(r => r.slotId === slotId);
    if (res) return { status: 'full', reservation: res };
    return { status: 'open' };
  },

  // ── 학번으로 내 예약 목록 ──
  getMyReservations(studentId) {
    return this.getReservations().filter(r => r.studentId === studentId);
  },

  // ── 내 학번 기억 ──
  getMyStudentId() {
    return localStorage.getItem('my_student_id') || '';
  },
  setMyStudentId(id) {
    localStorage.setItem('my_student_id', id);
  },
};

// 초기 더미 데이터 (처음 방문 시)
(function initDemoData() {
  if (localStorage.getItem('interview_initialized')) return;

  const now = new Date();
  const slots = [];

  // 이번 주 월~금, 09:00~17:00, 30분 단위 일부 슬롯 생성
  const days = [];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // 월요일
  startOfWeek.setHours(0, 0, 0, 0);

  for (let d = 0; d < 5; d++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + d);
    days.push(day);
  }

  const demoTimes = [
    '09:00', '09:30', '10:00', '10:30',
    '13:00', '13:30', '14:00',
    '15:30', '16:00',
  ];

  // 월, 수, 금만 슬롯 생성
  [0, 2, 4].forEach(di => {
    demoTimes.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      const slotDate = new Date(days[di]);
      slotDate.setHours(h, m, 0, 0);
      const endDate = new Date(slotDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      slots.push({
        id: `slot_${slotDate.getTime()}`,
        start: slotDate.toISOString(),
        end: endDate.toISOString(),
        note: '',
      });
    });
  });

  DB.saveSlots(slots);
  localStorage.setItem('interview_initialized', '1');
})();
