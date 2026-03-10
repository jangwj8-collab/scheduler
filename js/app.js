/**
 * app.js — 학생용 예약 화면 로직
 */

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

let currentWeekStart = getWeekStart(new Date());
let selectedSlot = null;

// ── 유틸 ──
function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1); // 월요일 기준
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(date, opts) {
  return date.toLocaleDateString('ko-KR', opts);
}

function fmtTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(isoStr) {
  const d = new Date(isoStr);
  return fmt(d, { month: 'long', day: 'numeric', weekday: 'short' });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = `toast ${type}`; }, 3000);
}

// ── 주간 헤더 렌더 ──
function renderCalHeader() {
  const el = document.getElementById('calHeader');
  const today = new Date(); today.setHours(0,0,0,0);

  let html = '<div class="cal-header-cell"></div>';
  for (let d = 0; d < 7; d++) {
    const day = addDays(currentWeekStart, d);
    const isToday = day.getTime() === today.getTime();
    const dateNum = day.getDate();
    html += `<div class="cal-header-cell ${isToday ? 'today' : ''}">
      ${DAYS_KO[day.getDay()]}
      <span class="date-num">${dateNum}</span>
    </div>`;
  }
  el.innerHTML = html;

  // 주간 범위 표시
  const weekEnd = addDays(currentWeekStart, 6);
  document.getElementById('weekRange').textContent =
    `${fmt(currentWeekStart, {month:'long',day:'numeric'})} – ${fmt(weekEnd, {month:'long',day:'numeric'})}`;
}

// ── 시간대 목록 생성 (슬롯에 있는 시간만) ──
function getTimeSlots() {
  const slots = DB.getSlots();
  const times = new Set();

  slots.forEach(s => {
    const d = new Date(s.start);
    const weekStart = new Date(currentWeekStart);
    const weekEnd = addDays(currentWeekStart, 7);
    if (d >= weekStart && d < weekEnd) {
      times.add(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    }
  });

  return Array.from(times).sort();
}

// ── 캘린더 바디 렌더 ──
function renderCalBody() {
  const el = document.getElementById('calBody');
  const slots = DB.getSlots();
  const reservations = DB.getReservations();
  const myStudentId = DB.getMyStudentId();
  const times = getTimeSlots();

  if (times.length === 0) {
    el.innerHTML = '<div style="padding:2rem;text-align:center;color:#8a8070;font-size:.88rem;">이번 주 등록된 면담 가능 시간이 없습니다.</div>';
    return;
  }

  let html = '';
  times.forEach(timeStr => {
    html += `<div class="cal-row">
      <div class="time-label">${timeStr}</div>`;

    for (let d = 0; d < 7; d++) {
      const day = addDays(currentWeekStart, d);
      day.setHours(parseInt(timeStr), parseInt(timeStr.split(':')[1]), 0, 0);

      // 해당 날짜+시간의 슬롯 찾기
      const slot = slots.find(s => {
        const sd = new Date(s.start);
        return sd.getFullYear() === day.getFullYear() &&
               sd.getMonth() === day.getMonth() &&
               sd.getDate() === day.getDate() &&
               sd.getHours() === day.getHours() &&
               sd.getMinutes() === day.getMinutes();
      });

      if (!slot) {
        html += `<div class="slot closed"></div>`;
        continue;
      }

      const res = reservations.find(r => r.slotId === slot.id);
      const isMine = res && res.studentId === myStudentId;
      const isFull = !!res;

      let cls = 'open';
      let inner = '예약 가능';
      if (isMine) { cls = 'mine'; inner = '내 예약'; }
      else if (isFull) { cls = 'full'; inner = '예약 완료'; }

      html += `<div class="slot ${cls}" data-slot-id="${slot.id}" 
                 title="${cls === 'open' ? '클릭하여 예약' : ''}">
        <div class="slot-inner">${inner}</div>
      </div>`;
    }

    html += '</div>';
  });

  el.innerHTML = html;

  // 클릭 이벤트
  el.querySelectorAll('.slot.open').forEach(el => {
    el.addEventListener('click', () => {
      const slotId = el.dataset.slotId;
      const slot = slots.find(s => s.id === slotId);
      openBookModal(slot);
    });
  });
}

// ── 내 예약 목록 렌더 ──
function renderMyReservations() {
  const myStudentId = DB.getMyStudentId();
  const myRes = myStudentId ? DB.getMyReservations(myStudentId) : [];
  const slots = DB.getSlots();

  document.getElementById('myCount').textContent = myRes.length;
  const el = document.getElementById('myResList');

  if (myRes.length === 0) {
    el.innerHTML = '<div class="empty-state">예약 내역이 없습니다.</div>';
    return;
  }

  // 날짜순 정렬
  myRes.sort((a, b) => {
    const sa = slots.find(s => s.id === a.slotId);
    const sb = slots.find(s => s.id === b.slotId);
    if (!sa || !sb) return 0;
    return new Date(sa.start) - new Date(sb.start);
  });

  el.innerHTML = myRes.map(res => {
    const slot = slots.find(s => s.id === res.slotId);
    const dateStr = slot ? fmtDate(slot.start) : '시간 정보 없음';
    const timeStr = slot ? `${fmtTime(slot.start)} – ${fmtTime(slot.end)}` : '';

    return `<div class="res-item">
      <div class="res-info">
        <div class="res-date">${dateStr} ${timeStr}</div>
        <div class="res-name">${res.name}</div>
        <div class="res-meta">${res.studentId} · ${res.email}</div>
      </div>
      <button class="btn-cancel" data-res-id="${res.id}">취소</button>
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => cancelRes(btn.dataset.resId));
  });
}

// ── 예약 취소 ──
function cancelRes(resId) {
  const myStudentId = DB.getMyStudentId();
  if (!myStudentId) return showToast('학번을 확인할 수 없습니다.', 'error');
  if (!confirm('예약을 취소하시겠습니까?')) return;
  const result = DB.cancelReservation(resId, myStudentId);
  if (result.ok) {
    showToast('예약이 취소되었습니다.');
    renderAll();
  } else {
    showToast(result.msg, 'error');
  }
}

// ── 예약 모달 ──
function openBookModal(slot) {
  selectedSlot = slot;
  const timeStr = `${fmtDate(slot.start)}  ${fmtTime(slot.start)} – ${fmtTime(slot.end)}`;
  document.getElementById('modalTime').textContent = timeStr;

  // 기억된 학번 자동 채우기
  const savedId = DB.getMyStudentId();
  if (savedId) document.getElementById('inputStudentId').value = savedId;

  document.getElementById('bookModal').classList.add('open');
}

function closeBookModal() {
  document.getElementById('bookModal').classList.remove('open');
  document.getElementById('inputName').value = '';
  document.getElementById('inputEmail').value = '';
  selectedSlot = null;
}

document.getElementById('cancelBtn').addEventListener('click', closeBookModal);
document.getElementById('bookModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeBookModal();
});

document.getElementById('confirmBtn').addEventListener('click', () => {
  const name = document.getElementById('inputName').value.trim();
  const studentId = document.getElementById('inputStudentId').value.trim();
  const email = document.getElementById('inputEmail').value.trim();

  if (!name) return showToast('이름을 입력해주세요.', 'error');
  if (!studentId) return showToast('학번을 입력해주세요.', 'error');
  if (!email || !email.includes('@')) return showToast('올바른 이메일을 입력해주세요.', 'error');
  if (!selectedSlot) return;

  const result = DB.bookSlot({ slotId: selectedSlot.id, name, studentId, email });
  if (result.ok) {
    DB.setMyStudentId(studentId);
    closeBookModal();
    showToast('✓ 면담이 예약되었습니다!');
    renderAll();
  } else {
    showToast(result.msg, 'error');
  }
});

// ── 주간 네비 ──
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  renderAll();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  renderAll();
});

// ── 전체 렌더 ──
function renderAll() {
  renderCalHeader();
  renderCalBody();
  renderMyReservations();
}

renderAll();
