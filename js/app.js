// ===== Konstanta & State =====
const STORAGE_KEY = "ebv_transactions";
const LIMIT_KEY = "ebv_limit";
const THEME_KEY = "ebv_theme";

const CATEGORY_COLORS = {
  Food: "#2ecc71",
  Transport: "#3498db",
  Fun: "#e67e22",
};
const CATEGORIES = Object.keys(CATEGORY_COLORS);

let transactions = loadFromStorage(STORAGE_KEY, []);
let spendingLimit = Number(localStorage.getItem(LIMIT_KEY)) || 0;
let sortMode = "newest";
let chart = null;

// ===== Elemen DOM =====
const form = document.getElementById("transaction-form");
const nameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const formError = document.getElementById("form-error");
const listEl = document.getElementById("transaction-list");
const emptyMsg = document.getElementById("empty-message");
const balanceEl = document.getElementById("total-balance");
const limitWarning = document.getElementById("limit-warning");
const limitInput = document.getElementById("limit-input");
const sortSelect = document.getElementById("sort-select");
const themeToggle = document.getElementById("theme-toggle");

// ===== Local Storage helpers =====
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ===== Format =====
function formatMoney(value) {
  return "Rp" + Number(value).toLocaleString("id-ID");
}

// ===== Tambah transaksi =====
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  // Validasi: semua field harus terisi
  if (!name || isNaN(amount) || !category) {
    showError("Semua field harus diisi.");
    return;
  }
  if (amount <= 0) {
    showError("Amount harus lebih dari 0.");
    return;
  }

  hideError();

  transactions.push({
    id: Date.now(),
    name: name,
    amount: amount,
    category: category,
  });

  saveTransactions();
  form.reset();
  render();
});

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function hideError() {
  formError.classList.add("hidden");
}

// ===== Hapus transaksi =====
function deleteTransaction(id) {
  transactions = transactions.filter(function (t) {
    return t.id !== id;
  });
  saveTransactions();
  render();
}

// ===== Sort =====
sortSelect.addEventListener("change", function () {
  sortMode = sortSelect.value;
  renderList();
});

function getSortedTransactions() {
  const copy = transactions.slice();
  switch (sortMode) {
    case "amount-desc":
      return copy.sort(function (a, b) { return b.amount - a.amount; });
    case "amount-asc":
      return copy.sort(function (a, b) { return a.amount - b.amount; });
    case "category":
      return copy.sort(function (a, b) { return a.category.localeCompare(b.category); });
    default:
      return copy.sort(function (a, b) { return b.id - a.id; }); // terbaru dulu
  }
}

// ===== Spending limit =====
limitInput.value = spendingLimit > 0 ? spendingLimit : "";

limitInput.addEventListener("input", function () {
  spendingLimit = parseFloat(limitInput.value) || 0;
  localStorage.setItem(LIMIT_KEY, String(spendingLimit));
  render();
});

// ===== Dark / light mode =====
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ===== Render =====
function renderList() {
  listEl.innerHTML = "";
  const sorted = getSortedTransactions();

  emptyMsg.classList.toggle("hidden", sorted.length > 0);

  sorted.forEach(function (t) {
    const li = document.createElement("li");
    li.className = "transaction-item";
    if (spendingLimit > 0 && t.amount > spendingLimit) {
      li.classList.add("over-limit");
    }

    const info = document.createElement("div");

    const nameEl = document.createElement("div");
    nameEl.className = "item-name";
    nameEl.textContent = t.name;

    const amountEl = document.createElement("div");
    amountEl.className = "item-amount";
    amountEl.textContent = formatMoney(t.amount);

    const catEl = document.createElement("span");
    catEl.className = "item-category";
    catEl.textContent = t.category;

    info.appendChild(nameEl);
    info.appendChild(amountEl);
    info.appendChild(catEl);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
      deleteTransaction(t.id);
    });

    li.appendChild(info);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  });
}

function renderBalance() {
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  balanceEl.textContent = formatMoney(total);

  const over = spendingLimit > 0 && total > spendingLimit;
  balanceEl.classList.toggle("over-limit", over);
  limitWarning.classList.toggle("hidden", !over);
  if (over) {
    limitWarning.textContent =
      "Pengeluaran melebihi batas " + formatMoney(spendingLimit) + "!";
  }
}

function renderChart() {
  const totals = CATEGORIES.map(function (cat) {
    return transactions
      .filter(function (t) { return t.category === cat; })
      .reduce(function (sum, t) { return sum + t.amount; }, 0);
  });

  // Jika Chart.js gagal dimuat (offline), jangan sampai app error
  if (typeof Chart === "undefined") return;

  if (!chart) {
    const ctx = document.getElementById("spending-chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: CATEGORIES,
        datasets: [{
          data: totals,
          backgroundColor: CATEGORIES.map(function (c) { return CATEGORY_COLORS[c]; }),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  } else {
    chart.data.datasets[0].data = totals;
    chart.update();
  }
}

function render() {
  renderBalance();
  renderList();
  renderChart();
}

// ===== Init =====
applyTheme(localStorage.getItem(THEME_KEY) || "light");
render();