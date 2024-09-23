import { Request, Response } from "express";
import { Transaction } from "./interfaces";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
        data.split("\n").forEach(element => {
            const splitElement = element.split(",");
            const currentTransaction: Transaction = {
                date: splitElement[0],
                description: splitElement[1],
                category: splitElement[2],
                amount: parseFloat(splitElement[3]).toFixed(2).toString()
            };
            transactions.push(currentTransaction);
        });

        if (transactions === undefined) {
            return callback(new Error("No transactions found"));
        }

        const transactionIndex = transactions.findIndex(
            (t) => (
                t.date === transaction.date &&
                t.description === transaction.description &&
                t.category === transaction.category &&
                t.amount === transaction.amount
            )
        );

        if (transactionIndex === -1) {
            return callback(new Error("Transaction not found"));
        }

        transactions.splice(transactionIndex, 1);

        fs.writeFile(filePath, transactions.join("\n"), callback);
    });
}

export const handleApiRequest = (req: Request, res: Response) => {
    if (!req.body || req.body === "" || req.body === null) {
        return res.status(400).send("no data received");
    }

    const method = req.body.method;
    const transaction: Transaction = req.body.transaction;

    if (method === "add") {
        addTransaction(transaction, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send(JSON.stringify(req.body.transaction) + "appended to file");
        });
    } else if (method === "delete") {
        deleteTransaction(transaction, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send(JSON.stringify(req.body.transaction) + "deleted from file");
        });
    } else {
        res.send(JSON.stringify(req.body) + " received");
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

    filePath = path.resolve(path.normalize(inputPath));

    res.send(JSON.stringify(filePath) + " set as file path");
};
