import { expenseCategories, Transaction } from "./interfaces.js";
import { UIManager } from "./UIManager.js";

export class TransactionManager {
    private globalTransactions: Transaction[];

    constructor() {
        this.globalTransactions = [];

        this.initEventListeners();
    }

    private initEventListeners() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });

        const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
        const pathForm = document.getElementById("path-form") as HTMLInputElement;
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
            this.updateTransactions();
        });

        pathForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const pathInput = document.getElementById("path") as HTMLInputElement;
            const filePath = pathInput.value.trim();
            this.sendPathRequest(filePath);
        });

        searchInput.addEventListener("input", () => {
            this.updateTransactions(true);
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
        const pathInput = document.getElementById("path") as HTMLInputElement;

        let path = "";

        // if cookies are available -> read in filepath from cookies
        if (document.cookie) {
            const cookie = document.cookie.split(";");
            cookie.forEach((element) => {
                const key = element.split("=")[0].trim();
                const value = element.split("=")[1].trim();
                if (key === "path") {
                    path = value;
                    pathInput.value = path;
                    return;
                }
            });
        }

        // if filepath is declared, send path request to server -> set path on server
        if (path !== "") this.sendPathRequest(path);
    }

    private async sendPathRequest(filePath: string) {
        // return if filepath is not specified
        if (filePath.trim() === "") {
            return;
        }

        // set request data
        const fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: filePath }),
        };

        // send post path request and await response
        const response = await fetch("/path", fetchOptions);

        // log error if request was not successful
        if (response.status !== 200) {
            console.error("could not send filepath to server!");
            return;
        }

        // set cookies as request was successful + fetch transactions from server
        document.cookie = `path=${filePath}`;
        this.fetchTransactions();
    }

    private async fetchTransactions() {
        // set request data
        const fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: "fetch" }),
        };

        // send post path request and await response
        const response = await fetch("/api", fetchOptions);

        // log error if request was not successful
        if (response.status !== 200 || response.body === undefined || response.body === null) {
            console.error("could not fetch new transactions from server!");
            return;
        }

        // parse fetched transactions and filter out header row
        let fetchedTransactionsJSON = await response.json();
        fetchedTransactionsJSON = fetchedTransactionsJSON.filter(
            (transaction: Transaction) =>
                transaction.date.toLowerCase() !== "date" &&
                transaction.description.toLowerCase() !== "description" &&
                transaction.category.toLowerCase() !== "category" &&
                transaction.amount.toLowerCase() !== "nan"
        );
        const fetchedTransactions = JSON.stringify(fetchedTransactionsJSON);

        // log error if fetched transactions could not be parsed
        if (fetchedTransactions === undefined) {
            console.error("could not parse fetched transactions!");
            return;
        }

        // update global transactions
        this.globalTransactions = [];
        JSON.parse(fetchedTransactions).forEach((transaction: Transaction) => {
            this.globalTransactions.push(transaction);
        });

        // update transactions
        this.updateTransactions();
    }

    private updateCategoryReport() {
        // initialize category report
        const categoryReport = document.getElementById("category-report") as HTMLElement;
        categoryReport.innerHTML = "";
        const selectedMonth = (
            document.getElementById("month-picker") as HTMLSelectElement
        ).value;

        let filteredTransactions = this.globalTransactions.filter((transaction) =>
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
        const selectedMonth = (
            document.getElementById("month-picker") as HTMLSelectElement
        ).value;

        // reset report amounts
        incomeAmountElement.innerHTML = "0.00";
        expenseAmountElement.innerHTML = "0.00";
        balanceAmountElement.innerHTML = "0.00";
        let filteredTransactions = this.globalTransactions;

        if (selectedMonth !== "00") {
            filteredTransactions = filteredTransactions.filter((transaction) =>
                transaction.date.split("-")[1].includes(selectedMonth)
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

    public updateTransactions(search: boolean = false, transactions?: Transaction[]) {
        const tableBody = document.getElementById("transactions-body") as HTMLElement;
        const searchInput = document.getElementById("search-input") as HTMLInputElement;
        const entryAmount = document.getElementById("entries") as HTMLElement;
        const selectedMonth = (
            document.getElementById("month-picker") as HTMLSelectElement
        ).value;

        tableBody.innerHTML = "";
        let filteredTransactions = transactions ?? this.globalTransactions;
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

        filteredTransactions.forEach((transaction) => {
            const tr = document.createElement("tr");
            const editButton = document.createElement("button");
            editButton.addEventListener("click", () => {
                if (
                    confirm(
                        `delete
                        ${transaction.date},
                        ${transaction.description},
                        ${transaction.category},
                        ${transaction.amount}?`
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

        if (
            !amount.startsWith("-") && expenseCategories.includes(category)
        ) {
            amount = "-" + amount;
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
        this.updateTransactions();
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

        this.updateTransactions();
    }

    public get Transactions(): Transaction[] {
        return this.globalTransactions;
    }
}
