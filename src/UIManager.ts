import { TransactionManager } from "./TransactionManager.js";
import { incomeCategories, expenseCategories } from "./interfaces.js";

export class UIManager {
    private sortDirection: number;
    private transactionManager: TransactionManager;

    constructor() {
        this.sortDirection = 0;
        this.transactionManager = new TransactionManager();

        this.initEventListeners();
    }

    private initEventListeners() {
        document.addEventListener("DOMContentLoaded", () => {
            this.init();
        });
    }

    private init() {
        // update selected month to current month
        const monthPicker = document.getElementById("month-picker") as HTMLSelectElement;
        let selectedMonth = (new Date().getMonth() + 1).toString();
        if (selectedMonth.length === 1) {
            selectedMonth = "0" + selectedMonth;
        }
        monthPicker.value = selectedMonth;

        let valueNumber = 1;
        const transactionForm = document.getElementById("transaction-form") as HTMLFormElement;
        const categoryPickerElement = transactionForm.elements[2];
        incomeCategories.forEach((category) => {
            const categoryElement = document.createElement("option");
            categoryElement.setAttribute("value", valueNumber.toString());
            categoryElement.innerHTML = category;
            categoryPickerElement.appendChild(categoryElement);
            valueNumber++;
        });
        expenseCategories.forEach((category) => {
            const categoryElement = document.createElement("option");
            categoryElement.setAttribute("value", valueNumber.toString());
            categoryElement.innerHTML = category;
            categoryPickerElement.appendChild(categoryElement);
            valueNumber++;
        });

        const headers = document.querySelectorAll("#transactions-head th");
        headers.forEach((header, index) => {
            if (header.textContent?.trim() !== "") {
                header.addEventListener("click", () => {
                    this.sortTransactions(index-1);
                });
            }
        });
    }

    private sortTransactions(column: number) {
        let sortedTransactions = this.transactionManager.Transactions;
        console.log(sortedTransactions);

        // cycle sort direction, 0 -> 1 -> 2 -> 0 ...
        this.sortDirection = (this.sortDirection + 1) % 3;

        // no sorting (reuse original sort by date)
        if (this.sortDirection === 0) {
            sortedTransactions.sort((a, b) => a.date.localeCompare(b.date));
            this.transactionManager.updateTransactions(false, sortedTransactions);
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
        this.transactionManager.updateTransactions(false, sortedTransactions);
    }
}
