import { Transaction } from "./interfaces.js";

export class TransactionManager {
    private globalTransactions: Transaction[];
    private selectedMonth: string;
    private sortDirection: number;
    private selectedFile: File | null = null;
    private incomeCategories: string[];
    private expenseCategories: string[];

    constructor() {
        this.globalTransactions = [];
        this.selectedMonth = "00";
        this.sortDirection = 0;
        this.incomeCategories = ["Income", "Refund", "Sale", "Gift"];
        this.expenseCategories = ["Important", "Food", "Happy", "Sponsored", "Credit"];

        this.initEventListeners();
    }

    private initEventListeners() {
        document.addEventListener("DOMContentLoaded", (event) => {
            this.init();
        });

        const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
        const csvPicker = document.getElementById("csv-picker") as HTMLInputElement;
        const searchInput = document.getElementById("search-input") as HTMLInputElement;
        const transactionForm = document.getElementById(
            "transaction-form"
        ) as HTMLFormElement;
        const addTransactionButton = document.getElementById(
            "add-transaction"
        ) as HTMLButtonElement;
        const closeTransactionButton = document.getElementById(
            "cancel"
        ) as HTMLButtonElement;
        const transactionPanel = document.getElementById(
            "transaction-panel"
        ) as HTMLElement;

        monthPicker.addEventListener("change", (event) => {
            this.selectedMonth = (event.target as HTMLSelectElement).value;
            this.loadTransactions();
        });

        csvPicker.addEventListener("change", () => {
            if (csvPicker.files && csvPicker.files[0]) {
                this.selectedFile = csvPicker.files[0];
                this.loadCSV();
                this.sendPathRequest();
            }
        });

        searchInput.addEventListener("input", () => {
            this.loadTransactions(true);
        });

        addTransactionButton.addEventListener("click", () => {
            document
                .getElementById("date")
                ?.setAttribute("value", new Date().toISOString().split("T")[0]);
            transactionPanel.classList.add("active");
        });

        closeTransactionButton.addEventListener("click", () => {
            transactionPanel.classList.remove("active");
            transactionForm.reset();
        });

        transactionForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.addTransaction();

            transactionPanel.classList.remove("active");
            transactionForm.reset();
        });
    }

    private init() {
        const csvPicker = document.getElementById("csv-picker") as HTMLInputElement;
        const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
        const transactionForm = document.getElementById(
            "transaction-form"
        ) as HTMLFormElement;

        if (csvPicker.files) {
            this.selectedFile = csvPicker.files[0];
        } else {
            csvPicker.click();
        }

        monthPicker.value = this.selectedMonth;

        let valueNumber = 1;
        const categoryPickerElement = transactionForm.elements[2];
        this.incomeCategories.forEach((category) => {
            const categoryElement = document.createElement("option");
            categoryElement.setAttribute("value", valueNumber.toString());
            categoryElement.innerHTML = category;
            categoryPickerElement.appendChild(categoryElement);
            valueNumber++;
        });
        this.expenseCategories.forEach((category) => {
            const categoryElement = document.createElement("option");
            categoryElement.setAttribute("value", valueNumber.toString());
            categoryElement.innerHTML = category;
            categoryPickerElement.appendChild(categoryElement);
            valueNumber++;
        });

        if (this.selectedFile) {
            this.loadCSV();
            this.sendPathRequest();
        }

        const headers = document.querySelectorAll("th");
        headers.forEach((header, index) => {
            header.addEventListener("click", () => {
                this.sortTransactions(index);
            });
        });
    }

    private sendPathRequest() {
        if (!this.selectedFile) {
            return;
        }

        const fileFolder =
            prompt("Enter the file path to folder where the file is located:") ?? "";
        const fileName = this.selectedFile.name;

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

    private loadCSV() {
        // reset global transactions array, TODO is this nessessary?
        // globalTransactions = [];

        // select current month
        this.selectedMonth = (new Date().getMonth() + 1).toString();
        if (this.selectedMonth.length === 1) {
            this.selectedMonth = "0" + this.selectedMonth;
        }
        const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
        monthPicker.value = this.selectedMonth;

        // read in csv file + populate global transactions array
        const reader = new FileReader();
        if (this.selectedFile) {
            reader.readAsText(this.selectedFile);
        } else {
            console.error("No file selected.");
        }
        reader.onload = () => {
            const csv = reader.result as string;
            const [csvHeaders, ...csvData] = csv.split("\n").map((row) => row.split(","));
            const headers = csvHeaders;
            const data = csvData.sort((a, b) => a[0].localeCompare(b[0]));
            data.forEach((row) => {
                const transaction: Transaction = {
                    date: row[0],
                    description: row[1],
                    category: row[2],
                    amount: row[3].trim(),
                };
                this.globalTransactions.push(transaction);
            });

            //load transactions + calculate reports
            this.loadTransactions();
        };
    }

    private updateCategoryReport() {
        // initialize category report
        const categoryReport = document.getElementById("category-report") as HTMLElement;
        categoryReport.innerHTML = "";
        let filteredTransactions = this.globalTransactions.filter((transaction) =>
            transaction.amount.startsWith("-")
        );
        let expenseReport = new Map<string, number>();

        // filter transactions by selected month and expenses
        if (this.selectedMonth !== "00") {
            filteredTransactions = filteredTransactions.filter((transaction) =>
                transaction.date.split("-")[1].includes(this.selectedMonth)
            );
        }

        // calculate total expenses per category
        filteredTransactions.forEach((transaction) => {
            expenseReport.set(
                transaction.category,
                expenseReport.get(transaction.category) ??
                    0 + Math.abs(parseFloat(transaction.amount))
            );
        });

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

    private updateAmounts() {
        const incomeAmountElement = document.getElementById(
            "income-amount"
        ) as HTMLElement;
        const expenseAmountElement = document.getElementById(
            "expense-amount"
        ) as HTMLElement;
        const balanceAmountElement = document.getElementById(
            "balance-amount"
        ) as HTMLElement;

        // reset report amounts
        incomeAmountElement.innerHTML = "0.00";
        expenseAmountElement.innerHTML = "0.00";
        balanceAmountElement.innerHTML = "0.00";
        let filteredTransactions = this.globalTransactions;

        if (this.selectedMonth !== "00") {
            filteredTransactions = filteredTransactions.filter((transaction) =>
                transaction.date.split("-")[1].includes(this.selectedMonth)
            );
        }

        filteredTransactions.forEach((transaction) => {
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
        });
    }

    private loadTransactions(search: boolean = false, transactions?: Transaction[]) {
        const tableBody = document.getElementById("transactions-body") as HTMLElement;
        const searchInput = document.getElementById("search-input") as HTMLInputElement;
        const entryAmount = document.getElementById("entries") as HTMLElement;

        tableBody.innerHTML = "";
        let filteredTransactions = transactions ?? this.globalTransactions;
        const query = searchInput.value.toLowerCase().trim();

        if (this.selectedMonth !== "00") {
            filteredTransactions = filteredTransactions.filter((transaction) =>
                transaction.date.split("-")[1].includes(this.selectedMonth)
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

        filteredTransactions.forEach((transaction) => {
            const tr = document.createElement("tr");
            const editButton = document.createElement("button");
            editButton.addEventListener("click", () => {
                if (
                    confirm(
                        `delete ${transaction.date}, ${transaction.description}, ${transaction.category}, ${transaction.amount}?`
                    ) === true
                ) {
                    this.deleteTransaction(transaction);
                }
            });
            editButton.innerHTML = "delete";
            tr.innerHTML = `
            <td>icon</td>
            <td>${transaction.date}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td>${transaction.amount}</td>
            `;
            tr.appendChild(editButton);
            tableBody.appendChild(tr);
        });

        entryAmount.innerHTML = `${filteredTransactions.length} Transactions`;

        if (!search) {
            this.updateAmounts();
            this.updateCategoryReport();
        }
    }

    private sortTransactions(column: number) {
        let sortedTransactions = this.globalTransactions;

        // cycle sort direction, 0 -> 1 -> 2 -> 0 ...
        this.sortDirection = (this.sortDirection + 1) % 3;

        // no sorting (reuse original sort by date)
        if (this.sortDirection === 0) {
            sortedTransactions.sort((a, b) => a.date.localeCompare(b.date));
            this.loadTransactions(false, sortedTransactions);
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
            return this.sortDirection === 1 ? -comparison : comparison;
        });
        this.loadTransactions(false, sortedTransactions);
    }

    private async addTransaction() {
        const transactionForm = document.getElementById(
            "transaction-form"
        ) as HTMLFormElement;
        const formElements = transactionForm.elements;
        const categoryPicker = formElements[2] as HTMLInputElement;

        const categoryValue = categoryPicker.value;
        const category =
            categoryPicker.getElementsByTagName("option")[parseInt(categoryValue)]
                .innerHTML;

        let description = (formElements[1] as HTMLInputElement).value.trim();
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

        let transaction: Transaction = {
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

        const response = await fetch("/api", fetchOptions);

        if (response.status !== 200) {
            console.error(response.statusText);
            return;
        }

        this.globalTransactions.push(transaction);
        this.loadTransactions();
    }

    private async deleteTransaction(transaction: Transaction) {
        const fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: "delete", transaction: transaction }),
        };

        const response = await fetch("/api", fetchOptions);

        if (response.status !== 200) {
            console.error(response.statusText);
            return;
        }

        this.globalTransactions = this.globalTransactions.filter(
            (t) => t !== transaction
        );

        this.loadTransactions();
    }
}
