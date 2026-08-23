/* ================================
   FIREBASE SETUP
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgU-FJ4d8ZvYQd2mwu3ZIMTwkdFSL2mp4",
  authDomain: "hisab-sagar.firebaseapp.com",
  projectId: "hisab-sagar",
  storageBucket: "hisab-sagar.firebasestorage.app",
  messagingSenderId: "579173761322",
  appId: "1:579173761322:web:923f7181731bcd454a9e53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const membersRef = doc(db, "hisab", "members");
const expensesRef = doc(db, "hisab", "expenses");
const itemsRef = doc(db, "hisab", "items");

/* ================================
   LOCAL CACHE (Firestore se sync hoga)
================================ */
let membersCache = [];
let expensesCache = [];
let itemsCache = [];

/* ================================
   GET / SAVE FUNCTIONS
   (Ab ye Firebase se kaam karenge)
================================ */
function getMembers() { return membersCache; }
function saveMembers(members) {
  membersCache = members;
  setDoc(membersRef, { list: members });
}

function getExpenses() { return expensesCache; }
function saveExpenses(expenses) {
  expensesCache = expenses;
  setDoc(expensesRef, { list: expenses });
}

function getItems() { return itemsCache; }
function saveItems(items) {
  itemsCache = items;
  setDoc(itemsRef, { list: items });
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
   HOME PAGE LOGIC (index.html)
================================ */
function renderHomePage() {
  const totalExpenseEl = document.getElementById('totalExpense');
  const totalMemberEl = document.getElementById('totalMember');
  const totalItemsEl = document.getElementById('totalItems');
  const memberListEl = document.getElementById('memberList');
  const balanceListEl = document.getElementById('balanceList');

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
      }
    });
  }
}

/* ================================
   REAL-TIME SYNC (Firebase se live updates)
   Jaise hi kisi ke phone pe data change hoga,
   sabke phone pe turant update ho jayega
================================ */
onSnapshot(membersRef, (snap) => {
  membersCache = snap.exists() ? (snap.data().list || []) : [];
  afterDataUpdate();
});

onSnapshot(expensesRef, (snap) => {
  expensesCache = snap.exists() ? (snap.data().list || []) : [];
  afterDataUpdate();
});

onSnapshot(itemsRef, (snap) => {
  itemsCache = snap.exists() ? (snap.data().list || []) : [];
  afterDataUpdate();
});

function afterDataUpdate() {
  renderHomePage();
  // Baaki pages (saman/rental/wxpense/history) ko batao ki data update hua
  window.dispatchEvent(new Event('hisabDataUpdated'));
}

/* ================================
   Sab functions ko window pe expose karo
   taaki baaki HTML pages ke scripts inhe use kar sakein
================================ */
window.getMembers = getMembers;
window.saveMembers = saveMembers;
window.getExpenses = getExpenses;
window.saveExpenses = saveExpenses;
window.getItems = getItems;
window.saveItems = saveItems;
window.formatRupee = formatRupee;
window.generateId = generateId;
window.calculateBalances = calculateBalances;
window.getTotalExpense = getTotalExpense;
window.fillMemberSelect = fillMemberSelect;
window.fillMemberCheckboxes = fillMemberCheckboxes;