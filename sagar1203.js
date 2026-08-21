/* ================================
   DATA STORAGE (localStorage based)
================================ */

function getMembers() {
  const data = localStorage.getItem('hisab_members');
  return data ? JSON.parse(data) : [];
}

function saveMembers(members) {
  localStorage.setItem('hisab_members', JSON.stringify(members));
}

function getExpenses() {
  const data = localStorage.getItem('hisab_expenses');
  return data ? JSON.parse(data) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem('hisab_expenses', JSON.stringify(expenses));
}

function getItems() {
  const data = localStorage.getItem('hisab_items');
  return data ? JSON.parse(data) : [];
}

function saveItems(items) {
  localStorage.setItem('hisab_items', JSON.stringify(items));
}

/* ================================
   HELPERS
================================ */

function formatRupee(num) {
  return '₹' + Number(num).toFixed(2);
}

function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

/* ================================
   BALANCE CALCULATION
   Har expense me: paidBy ne total amount diya,
   splitAmong logo ke beech barabar bant jayega.
   Balance = jitna diya - jitna uska share tha
================================ */

function calculateBalances() {
  const members = getMembers();
  const expenses = getExpenses();
  const balances = {};
  members.forEach(m => balances[m] = 0);

  expenses.forEach(exp => {
    const splitCount = exp.splitAmong.length || 1;
    const share = exp.amount / splitCount;

    if (balances.hasOwnProperty(exp.paidBy)) {
      balances[exp.paidBy] += Number(exp.amount);
    }

    exp.splitAmong.forEach(person => {
      if (balances.hasOwnProperty(person)) {
        balances[person] -= share;
      }
    });
  });

  return balances;
}

function getTotalExpense() {
  return getExpenses().reduce((sum, e) => sum + Number(e.amount), 0);
}

/* ================================
   FILL MEMBER DROPDOWN (select tag)
================================ */

function fillMemberSelect(selectElement) {
  const members = getMembers();
  selectElement.innerHTML = '';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    selectElement.appendChild(opt);
  });
}

/* ================================
   FILL MEMBER CHECKBOXES (split section)
================================ */

function fillMemberCheckboxes(containerElement, name) {
  const members = getMembers();
  containerElement.innerHTML = '';
  members.forEach(m => {
    const label = document.createElement('label');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.name = name;
    cb.value = m;
    cb.checked = true;

    label.appendChild(cb);
    label.appendChild(document.createTextNode(m));
    containerElement.appendChild(label);
  });
}

/* ================================
   HOME PAGE LOGIC (index2.html)
   Ye sirf tab chalega jab in IDs wale
   elements page pe maujood honge
================================ */

function renderHomePage() {
  const totalExpenseEl = document.getElementById('totalExpense');
  const totalMemberEl = document.getElementById('totalMember');
  const totalItemsEl = document.getElementById('totalItems');
  const memberListEl = document.getElementById('memberList');
  const balanceListEl = document.getElementById('balanceList');

  // Agar home page ke elements hi nahi hain, to yahi ruk jao
  if (!totalExpenseEl && !memberListEl && !balanceListEl) return;

  const members = getMembers();

  if (totalExpenseEl) totalExpenseEl.textContent = formatRupee(getTotalExpense());
  if (totalMemberEl) totalMemberEl.textContent = members.length;
  if (totalItemsEl) totalItemsEl.textContent = getItems().length;

  if (memberListEl) {
    memberListEl.innerHTML = '';
    members.forEach((m, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${m}</span>`;
      const btn = document.createElement('button');
      btn.textContent = 'Hatao';
      btn.className = 'delete-btn';
      btn.onclick = () => {
        const updated = getMembers().filter((_, idx) => idx !== i);
        saveMembers(updated);
        renderHomePage();
      };
      li.appendChild(btn);
      memberListEl.appendChild(li);
    });
  }

  if (balanceListEl) {
    const balances = calculateBalances();
    balanceListEl.innerHTML = '';
    if (getExpenses().length === 0 || members.length === 0) {
      balanceListEl.innerHTML = '<li class="empty-msg">Abhi koi kharcha add nahi hua hai</li>';
    } else {
      Object.keys(balances).forEach(name => {
        const bal = balances[name];
        let text, cls;
        if (bal > 0.5) { text = `+${formatRupee(bal)} lene hai`; cls = 'positive'; }
        else if (bal < -0.5) { text = `${formatRupee(bal)} dene hai`; cls = 'negative'; }
        else { text = 'Barabar ✔'; cls = ''; }
        const li = document.createElement('li');
        li.innerHTML = `<span>${name}</span><span class="tag ${cls}">${text}</span>`;
        balanceListEl.appendChild(li);
      });
    }
  }

  const memberForm = document.getElementById('memberForm');
  if (memberForm && !memberForm.dataset.bound) {
    memberForm.dataset.bound = 'true';
    memberForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('newMemberInput');
      const name = input.value.trim();
      if (name) {
        const members = getMembers();
        members.push(name);
        saveMembers(members);
        input.value = '';
        renderHomePage();
      }
    });
  }
}

/* ================================
   AUTO RUN ON PAGE LOAD
   Ye home page ke elements dhoondh ke
   apne aap render kar dega. Baaki pages
   (saman/rental/wxpense/history) ka
   apna alag script unhi files ke andar hai.
================================ */

document.addEventListener('DOMContentLoaded', function () {
  renderHomePage();
});