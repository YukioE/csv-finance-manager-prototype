import { Request, Response } from "express";
import { Transaction } from "./interfaces.js";
import fs from "fs";
import path from "path";
import os from "os";

let filePath: string;

function addTransaction(
    transaction: Transaction,
    callback: (err: NodeJS.ErrnoException | null) => void
) {
    fs.appendFile(
        filePath,
        `\n${transaction.date},${transaction.description},${transaction.category},${transaction.amount}`,
        callback
    );
}

function deleteTransaction(
    transaction: Transaction,
    callback: (err: NodeJS.ErrnoException | null) => void
) {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            return callback(err);
        }

        let transactions: Array<Transaction> = [];
        data.split("\n").forEach((element) => {
            const splitElement = element.split(",");
            const currentTransaction: Transaction = {
                date: splitElement[0],
                description: splitElement[1],
                category: splitElement[2],
                amount: parseFloat(splitElement[3]).toFixed(2).toString(),
            };
            transactions.push(currentTransaction);
        });

        if (transactions === undefined) {
            return callback(new Error("No transactions found"));
        }

        const transactionIndex = transactions.findIndex(
            (t) =>
                t.date === transaction.date &&
                t.description === transaction.description &&
                t.category === transaction.category &&
                t.amount === transaction.amount
        );

        if (transactionIndex === -1) {
            return callback(new Error("Transaction not found"));
        }

        transactions.splice(transactionIndex, 1);
        let stringTransactions = [`date,description,category,amount`];
        stringTransactions = transactions.map(
            (t) => `${t.date},${t.description},${t.category},${t.amount}`
        );

        fs.writeFile(filePath, transactions.join("\n"), callback);
    });
}

export const handleApiRequest = (req: Request, res: Response) => {
    if (!req.body || req.body === "" || req.body === null) {
        return res.status(400).send("no data received");
    }

    const method = req.body.method;
    const transaction: Transaction = req.body.transaction;

    switch (method) {
        case "add":
            addTransaction(transaction, (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.send(JSON.stringify(req.body.transaction) + "appended to file");
            });
            break;
        case "delete":
            deleteTransaction(transaction, (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.send(JSON.stringify(req.body.transaction) + "deleted from file");
            });
            break;
        case "fetch":
            if (filePath.trim() === "" || filePath === null) {
                res.status(400).send("no filepath set on server!")
                return;
            }
            fs.readFile(filePath, "utf8", (err, data) => {
                if (err) {
                    res.status(500).send("error reading file!");
                    return;
                }
        
                let transactions: Array<Transaction> = [];
                data.split("\n").forEach((element) => {
                    const splitElement = element.split(",");
                    const currentTransaction: Transaction = {
                        date: splitElement[0],
                        description: splitElement[1],
                        category: splitElement[2],
                        amount: parseFloat(splitElement[3]).toFixed(2).toString(),
                    };
                    transactions.push(currentTransaction);
                });
        
                if (transactions === undefined) {
                    res.status(400).send("no transactions found in file!");
                    return;
                }

                res.send(transactions)
            });
            break;
        default:
            res.send(JSON.stringify(req.body) + " received");
            break;
    }
};

export const setFilePath = (req: Request, res: Response) => {
    if (!req.body || req.body === "" || req.body === null) {
        return res.status(400).send("no path received");
    }

    let inputPath = req.body.path;

    if (inputPath.startsWith("~")) {
        inputPath = path.join(os.homedir(), inputPath.slice(1));
    }

    const tempFilePath = path.resolve(path.normalize(inputPath));

    if (fs.existsSync(tempFilePath) && tempFilePath.endsWith(".csv")) {
        filePath = tempFilePath;
        res.send(JSON.stringify(filePath) + " set as file path");
        return;
    }

    res.status(400).send(`${tempFilePath} is not a valid filepath!`);
};
