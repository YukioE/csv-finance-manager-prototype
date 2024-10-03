export interface Transaction {
    date: string;
    description: string;
    category: string;
    amount: string;
}

export const incomeCategories = ["Income", "Refund", "Sale", "Gift"];
export const expenseCategories = ["Important", "Food", "Happy", "Sponsored", "Credit"];