/**
 * admin.js — 관리자 패널 로직
 */

const ADMIN_PASSWORD = 'aidata1234'; 

// ── 인증 ──
(function auth() {
  const overlay = document.getElementById('authOverlay');
  const input = document.getElementById('authInput');
  const btn = document.getElementById('authBtn');
  const main = document.getElementById('adminMain');

  // 세션 기억
  if (sessionStorage.getItem('admin_auth') === '1') {
    overlay.style.display = 'none';
    main.style.display = 'grid';
    renderAdmin();
    return;
  }

  function tryLogin() {
    if (input.value === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      overlay.style.display = 'none';
      main.style.display = 'grid';
      renderAdmin();
    } else {
      input.value = '';
      input.style.borderColor = '#f87171';
      setTimeout(() => input.style.borderColor = '', 1000);
    }
  }

  btn.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
})();

// ── 유틸 ──
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = `toast ${type}`, 3000);
}

function fmtDateKey(date) {
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}
function fmtTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) +
    ' ' + fmtTime(isoStr);
}

// ── 슬롯 추가 ──
document.getElementById('addSlotsBtn').addEventListener('click', () => {
  const dateStr = document.getElementById('slotDate').value;
  const startStr = document.getElementById('slotStart').value;
  const endStr = document.getElementById('slotEnd').value;
  const note = document.getElementById('slotNote').value.trim();

  if (!dateStr || !startStr || !endStr) return showToast('날짜와 시간을 입력해주세요.', 'error');

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);

  const startMs = sh * 60 + sm;
  const endMs = eh * 60 + em;

  if (endMs <= startMs) return showToast('종료 시간이 시작 시간보다 늦어야 합니다.', 'error');
  if ((endMs - startMs) % 30 !== 0) return showToast('시간은 30분 단위로 설정해주세요.', 'error');

  let added = 0;
  for (let t = startMs; t < endMs; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const start = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    DB.addSlot({
      id: `slot_${start.getTime()}`,
      start: start.toISOString(),
      end: end.toISOString(),
      note,
    });
    added++;
  }

  showToast(`✓ ${added}개 슬롯이 추가되었습니다.`);
  renderAdmin();
});

// ── 일괄 생성 ──
document.getElementById('bulkGenBtn').addEventListener('click', () => {
  const weekStartStr = document.getElementById('bulkWeekStart').value;
  const startStr = document.getElementById('bulkStart').value;
  const endStr = document.getElementById('bulkEnd').value;

  if (!weekStartStr || !startStr || !endStr) return showToast('모든 항목을 입력해주세요.', 'error');

  const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(el => parseInt(el.value));
  if (selectedDays.length === 0) return showToast('요일을 하나 이상 선택해주세요.', 'error');

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const startMs = sh * 60 + sm;
  const endMs = eh * 60 + em;
  if (endMs <= startMs) return showToast('종료 시간을 확인해주세요.', 'error');

  const weekStart = new Date(weekStartStr + 'T00:00:00');

  let added = 0;
  selectedDays.forEach(dayOffset => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + dayOffset);
    const dateStr = day.toISOString().slice(0, 10);

    for (let t = startMs; t < endMs; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const start = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);

      DB.addSlot({
        id: `slot_${start.getTime()}`,
        start: start.toISOString(),
        end: end.toISOString(),
        note: '',
      });
      added++;
    }
  });

  showToast(`✓ ${added}개 슬롯이 일괄 생성되었습니다.`);
  renderAdmin();
});

// ── 슬롯 삭제 ──
function deleteSlot(slotId) {
  if (!confirm('이 슬롯을 삭제하시겠습니까?')) return;
  const result = DB.removeSlot(slotId);
  if (result.ok) {
    showToast('슬롯이 삭제되었습니다.');
    renderAdmin();
  } else {
    showToast(result.msg, 'error');
  }
}

// ── 관리자 예약 취소 ──
function adminCancelRes(resId) {
  if (!confirm('이 예약을 취소하시겠습니까?')) return;
  const reservations = DB.getReservations();
  const res = reservations.find(r => r.id === resId);
  if (!res) return showToast('예약을 찾을 수 없습니다.', 'error');

  // 관리자는 직접 삭제
  const newRes = reservations.filter(r => r.id !== resId);
  DB.saveReservations(newRes);
  showToast('예약이 취소되었습니다.');
  renderAdmin();
}

// ── 전체 렌더 ──
function renderAdmin() {
  renderStats();
  renderSlotList();
  renderResList();
}

function renderStats() {
  const slots = DB.getSlots();
  const reservations = DB.getReservations();
  const booked = reservations.length;
  document.getElementById('statTotal').textContent = slots.length;
  document.getElementById('statBooked').textContent = booked;
  document.getElementById('statOpen').textContent = slots.length - booked;
}

function renderSlotList() {
  const slots = DB.getSlots().sort((a, b) => new Date(a.start) - new Date(b.start));
  const reservations = DB.getReservations();
  const el = document.getElementById('adminSlotList');

  if (slots.length === 0) {
    el.innerHTML = '<div class="empty-state">등록된 슬롯이 없습니다.</div>';
    return;
  }

  // 날짜별 그룹핑
  const groups = {};
  slots.forEach(s => {
    const key = new Date(s.start).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  let html = '';
  Object.entries(groups).forEach(([dateKey, daySlots]) => {
    const d = new Date(dateKey);
    html += `<div class="slot-group-header">${fmtDateKey(d)}</div>`;
    daySlots.forEach(slot => {
      const res = reservations.find(r => r.slotId === slot.id);
      const isFull = !!res;
      const statusCls = isFull ? 'full' : 'open';
      const bookerText = isFull
        ? `${res.name} (${res.studentId})`
        : '예약 가능';

      html += `<div class="slot-item">
        <div class="slot-status ${statusCls}"></div>
        <div class="slot-time">${fmtTime(slot.start)} – ${fmtTime(slot.end)}${slot.note ? ' · '+slot.note : ''}</div>
        <div class="slot-booker ${isFull ? 'booked' : ''}">${bookerText}</div>
        <button class="btn-del" onclick="deleteSlot('${slot.id}')" ${isFull ? 'disabled title="예약이 있어 삭제 불가"' : ''}>삭제</button>
      </div>`;
    });
  });

  el.innerHTML = html;
}

function renderResList() {
  const reservations = DB.getReservations().sort((a, b) => {
    const slots = DB.getSlots();
    const sa = slots.find(s => s.id === a.slotId);
    const sb = slots.find(s => s.id === b.slotId);
    if (!sa || !sb) return 0;
    return new Date(sa.start) - new Date(sb.start);
  });

  const slots = DB.getSlots();
  const el = document.getElementById('adminResList');

  if (reservations.length === 0) {
    el.innerHTML = '<div class="empty-state">예약 없음</div>';
    return;
  }

  el.innerHTML = reservations.map(res => {
    const slot = slots.find(s => s.id === res.slotId);
    const dtStr = slot ? `${fmtDateTime(slot.start)} – ${fmtTime(slot.end)}` : '시간 정보 없음';
    return `<div class="res-item-admin">
      <div>
        <div class="res-datetime">${dtStr}</div>
        <div class="res-person">${res.name}</div>
        <div class="res-detail">${res.studentId} · ${res.email}</div>
      </div>
      <button class="btn-admin-cancel" onclick="adminCancelRes('${res.id}')">취소</button>
    </div>`;
  }).join('');
}

// ── 기본 날짜 설정 ──
(function setDefaultDates() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  document.getElementById('slotDate').value = todayStr;

  // 이번 주 월요일 계산
  const mon = new Date(today);
  mon.setDate(today.getDate() - today.getDay() + 1);
  document.getElementById('bulkWeekStart').value = mon.toISOString().slice(0, 10);
})();
