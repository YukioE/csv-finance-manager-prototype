// Variables
let selectedMonth = "00";
let selectedFile: File;
let globalTransactions: transaction[];
let sortDirection = 0;
const incomeCategories = ["Income", "Refund", "Sale", "Gift"];
const expenseCategories = ["Important", "Food", "Happy", "Sponsored", "Credit"];
interface transaction {
    date: string;
    description: string;
    category: string;
    amount: string;
}

// Elements
// file and data handling
const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
const csvPicker = document.getElementsByClassName("csv-picker")[0] as HTMLInputElement;
const fileform = document.getElementById("file-form") as HTMLFormElement;

// report elements
const incomeAmountElement = document.getElementById("income-amount") as HTMLInputElement;
const expenseAmountElement = document.getElementById(
    "expense-amount"
) as HTMLInputElement;
const balanceAmountElement = document.getElementById(
    "balance-amount"
) as HTMLInputElement;
const categoryReport = document.getElementById("category-report") as HTMLDivElement;

// transactions table
const tableBody = document.getElementById("transactions-body") as HTMLTableSectionElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const entryAmount = document.getElementById("entries") as HTMLInputElement;

// add transaction
const addTransactionButton = document.getElementById(
    "add-transaction"
) as HTMLButtonElement;
const closeTransactionButton = document.getElementById("cancel") as HTMLButtonElement;
const transactionPanel = document.getElementById("transaction-panel") as HTMLDivElement;
const transactionForm = document.getElementById("transaction-form") as HTMLFormElement;

// EventListeners
monthPicker.addEventListener("change", (event) => {
    selectedMonth = (event.target as HTMLSelectElement).value;
    loadTransactions(globalTransactions);
    updateAmounts();
    updateCategoryReport();
});

csvPicker.addEventListener("change", () => {
    if (csvPicker.files && csvPicker.files[0]) {
        selectedFile = csvPicker.files[0];
        loadCSV(selectedFile);
        sendPathRequest();
    }
});

searchInput.addEventListener("input", () => {
    loadTransactions(globalTransactions);
});

addTransactionButton.addEventListener("click", () => {
    document
        .getElementById("date")
        ?.setAttribute("value", new Date().toISOString().split("T")[0]);
    transactionPanel.classList.add("active");
});

closeTransactionButton.addEventListener("click", () => {
    transactionPanel.classList.remove("active");
});

transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTransaction();

    transactionPanel.classList.remove("active");
    transactionForm.reset();
});

// Functions
init();

function init() {
    if (csvPicker.files) {
        selectedFile = csvPicker.files[0];
    }

    monthPicker.value = selectedMonth;

    //adding categories to category picker
    let valueNumber = 1;
    const categoryElement = transactionForm.elements[2];
    for (let i = 0; i < incomeCategories.length; i++) {
        const category = document.createElement("option");
        category.setAttribute("value", valueNumber.toString());
        category.innerHTML = incomeCategories[i];
        categoryElement.appendChild(category);
        valueNumber++;
    }
    for (let i = 0; i < expenseCategories.length; i++) {
        const category = document.createElement("option");
        category.setAttribute("value", valueNumber.toString());
        category.innerHTML = expenseCategories[i];
        categoryElement.appendChild(category);
        valueNumber++;
    }

    if (selectedFile) {
        loadCSV(selectedFile);
        sendPathRequest();
    }
}

function sendPathRequest() {
    if (!selectedFile) {
        return;
    }

    const fileFolder =
        prompt("Enter the file path to folder where the file is located:") ?? "";
    const fileName = selectedFile.name;

    if (fileFolder === "") {
        return;
    }

    const fetchOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: fileFolder + "/" + fileName }),
    };

    fetch("/path", fetchOptions);
}

function loadCSV(csvFile: File) {
    // reset global transactions array
    globalTransactions = [];

    // select current month
    selectedMonth = (new Date().getMonth() + 1).toString();
    if (selectedMonth.length === 1) {
        selectedMonth = "0" + selectedMonth;
    }
    monthPicker.value = selectedMonth;

    // read in csv file + populate global transactions array
    const reader = new FileReader();
    reader.readAsText(csvFile);
    reader.onload = () => {
        const csv = reader.result as string;
        const [csvHeaders, ...csvData] = csv.split("\n").map((row) => row.split(","));
        const headers = csvHeaders;
        const data = csvData.sort((a, b) => a[0].localeCompare(b[0]));
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const transaction: transaction = {
                date: row[0],
                description: row[1],
                category: row[2],
                amount: row[3].trim(),
            };
            globalTransactions.push(transaction);
        }

        //load transactions + calculate reports
        loadTransactions(globalTransactions);
        updateAmounts();
        updateCategoryReport();
    };
}

async function addTransaction() {
    const formElements = transactionForm.elements;
    const categoryPicker = formElements[2] as HTMLInputElement;

    let category = categoryPicker.value ?? "Other";
    category =
        categoryPicker.getElementsByTagName("option")[parseInt(category)].innerHTML;

    let description = (formElements[1] as HTMLInputElement).value.trim() ?? category;
    if (description === "") {
        description = category;
    }

    let amount = (formElements[3] as HTMLInputElement).value.trim() ?? "0.00";
    amount = parseFloat(amount).toFixed(2);
    if (isNaN(parseFloat(amount)) || amount === "0.00") {
        return;
    }

    const date =
        (formElements[0] as HTMLInputElement).value ??
        new Date().toISOString().split("T")[0];

    let transaction: transaction = {
        date: date,
        category: category,
        description: description,
        amount: amount,
    };

    const fetchOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ method: "add", transaction: transaction }),
    };

    await fetch("/api", fetchOptions);

    globalTransactions.push(transaction);

    loadTransactions(globalTransactions);
}

function updateCategoryReport() {
    // initialize category report
    categoryReport.innerHTML = "";
    let filteredTransactions = globalTransactions.filter((transaction) =>
        transaction.amount.startsWith("-")
    );
    let expenseReport = new Map<string, number>();

    // filter transactions by selected month and expenses
    if (selectedMonth !== "00") {
        filteredTransactions = filteredTransactions.filter((transaction) =>
            transaction.date.split("-")[1].includes(selectedMonth)
        );
    }

    // calculate total expenses per category
    for (let i = 0; i < filteredTransactions.length; i++) {
        const transaction = filteredTransactions[i];
        expenseReport.set(
            transaction.category,
            expenseReport.get(transaction.category) ??
                0 + Math.abs(parseFloat(transaction.amount))
        );
    }

    // calculate flex-grow for each category card
    let flexMap = new Map([...expenseReport.entries()].sort((a, b) => a[1] - b[1]));
    let currentFlex = 1;
    flexMap.forEach((value, key) => {
        flexMap.set(key, currentFlex);
        currentFlex += 2;
    });

    // add category cards to report
    expenseReport.forEach((value, key) => {
        const categoryElement = document.createElement("div");
        categoryElement.classList.add("category-card");
        categoryElement.classList.add("card");
        categoryElement.style.flexGrow = `${flexMap.get(key)}`;
        categoryElement.style.order = `${flexMap.get(key)}`;
        categoryElement.innerHTML = `
            <div class="category-name">${key}</div>
            <div class="category-amount">${value.toFixed(2)}</div>
        `;
        categoryReport.appendChild(categoryElement);
    });
}

function updateAmounts() {
    // reset report amounts
    incomeAmountElement.innerHTML = "0.00";
    expenseAmountElement.innerHTML = "0.00";
    balanceAmountElement.innerHTML = "0.00";
    let filteredTransactions = globalTransactions;

    if (selectedMonth !== "00") {
        filteredTransactions = filteredTransactions.filter((transaction) =>
            transaction.date.split("-")[1].includes(selectedMonth)
        );
    }

    for (let i = 0; i < filteredTransactions.length; i++) {
        const transaction: transaction = filteredTransactions[i];
        if (transaction.amount.startsWith("-")) {
            if (expenseAmountElement.innerHTML === "") {
                expenseAmountElement.innerHTML = transaction.amount;
            } else {
                expenseAmountElement.innerHTML = (
                    parseFloat(expenseAmountElement.innerHTML) +
                    parseFloat(transaction.amount)
                ).toFixed(2);
            }
        } else {
            if (incomeAmountElement.innerHTML === "") {
                incomeAmountElement.innerHTML = transaction.amount;
            } else {
                incomeAmountElement.innerHTML = (
                    parseFloat(incomeAmountElement.innerHTML) +
                    parseFloat(transaction.amount)
                ).toFixed(2);
            }
        }
        balanceAmountElement.innerHTML = (
            parseFloat(incomeAmountElement.innerHTML) +
            parseFloat(expenseAmountElement.innerHTML)
        ).toFixed(2);
    }
}

function loadTransactions(transactions: transaction[]) {
    tableBody.innerHTML = "";
    let filteredTransactions = transactions;
    const query = searchInput.value.toLowerCase().trim();

    if (selectedMonth !== "00") {
        filteredTransactions = filteredTransactions.filter((transaction) =>
            transaction.date.split("-")[1].includes(selectedMonth)
        );
    }

    if (query !== "") {
        filteredTransactions = filteredTransactions.filter(
            (transaction) =>
                transaction.description.toLowerCase().includes(query) ||
                transaction.category.toLowerCase().includes(query) ||
                transaction.date.toLowerCase().includes(query) ||
                transaction.amount.toLowerCase().includes(query)
        );
    }

    for (let i = 0; i < filteredTransactions.length; i++) {
        const tr = document.createElement("tr");
        const currentTransaction = filteredTransactions[i];
        const editButton = document.createElement("button");
        editButton.addEventListener("click", () => {
            if (
                confirm(
                    `delete ${currentTransaction.date}, ${currentTransaction.description}, ${currentTransaction.category}, ${currentTransaction.amount}?`
                ) === true
            ) {
                deleteTransaction(currentTransaction);
            }
        });
        editButton.innerHTML = "delete";
        tr.innerHTML = `
            <td>icon</td>
            <td>${currentTransaction.date}</td>
            <td>${currentTransaction.description}</td>
            <td>${currentTransaction.category}</td>
            <td>${currentTransaction.amount}</td>
        `;
        tr.appendChild(editButton);
        tableBody.appendChild(tr);
    }

    entryAmount.innerHTML = `${filteredTransactions.length} Transactions`;
}

async function deleteTransaction(transaction: transaction) {
    const fetchOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ method: "delete", transaction: transaction }),
    };

    await fetch("/api", fetchOptions);

    globalTransactions = globalTransactions.filter((t) => t !== transaction);

    loadTransactions(globalTransactions);
    alert("deleted " + transaction.description);
}

function sortTransactions(column: number) {
    let sortedTransactions = globalTransactions;

    // cycle sort direction, 0 -> 1 -> 2 -> 0 ...
    sortDirection = (sortDirection + 1) % 3;

    // no sorting (reuse original sort by date)
    if (sortDirection === 0) {
        sortedTransactions.sort((a, b) => a.date.localeCompare(b.date));
        loadTransactions(sortedTransactions);
        return;
    }

    sortedTransactions.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 0:
                comparison = a.date.localeCompare(b.date);
                break;
            case 1:
                comparison = a.description.localeCompare(b.description);
                break;
            case 2:
                comparison = a.category.localeCompare(b.category);
                break;
            case 3:
                comparison = parseFloat(a.amount) - parseFloat(b.amount);
                break;
            default:
                comparison = 0;
                break;
        }
        return sortDirection === 1 ? -comparison : comparison;
    });
    loadTransactions(sortedTransactions);
}
