const { sql } = require('../db/pool');
const { PAYMENT_DB } = require('../config/env');
const { execQ } = require('../db/execQ');

async function getLastInvestmentBalance(reqFactory, userId, rowCtx, opTrail) {
  const req = reqFactory();
  const r = await execQ({
    req, label:'txn.lastUser',
    sqlText:`SELECT TOP 1 payment_transaction_balance AS bal
             FROM [${PAYMENT_DB}].[dbo].[PaymentTransactions]
             WHERE user_id=@uid AND payment_transaction_type='investment'
             ORDER BY createdAt DESC`,
    inputs:[{ name:'uid', type: sql.Int, value: userId }],
    rowCtx, opTrail
  });
  return r.recordset[0]?.bal || 0;
}

async function ensureInvestmentTxn(reqFactory, { saleId, userId, totalAmount, tsISO }, rowCtx, opTrail) {
  let req = reqFactory();
  const ex = await execQ({
    req, label:'txn.existsForSale',
    sqlText:`SELECT TOP 1 id FROM [${PAYMENT_DB}].[dbo].[PaymentTransactions]
             WHERE sale_id=@sid AND payment_transaction_type='investment' AND payment_transaction_amount<0`,
    inputs:[{ name:'sid', type: sql.Int, value: saleId }],
    rowCtx, opTrail
  });
  if (ex.recordset.length) return;

  const lastBal = await getLastInvestmentBalance(reqFactory, userId, rowCtx, opTrail);
  const amount = -Math.trunc(totalAmount || 0);

  req = reqFactory();
  await execQ({
    req, label:'txn.insert.initialDebit',
    sqlText:`INSERT INTO [${PAYMENT_DB}].[dbo].[PaymentTransactions]
             (user_id, sale_id, payment_id, payment_transaction_amount,
              payment_transaction_balance, payment_transaction_detail,
              payment_transaction_status, payment_transaction_type, payment_transaction_way,
              createdAt, updatedAt)
             VALUES(@uid,@sid,NULL,@amt,@bal,@det,1,'investment','investment',@ts,@ts)`,
    inputs:[
      { name:'uid', type: sql.Int, value: userId },
      { name:'sid', type: sql.Int, value: saleId },
      { name:'amt', type: sql.BigInt, value: amount },
      { name:'bal', type: sql.BigInt, value: lastBal + amount },
      { name:'det', type: sql.NVarChar, value: 'بدهکار اولیه پرونده' },
      { name:'ts', type: sql.DateTimeOffset, value: new Date(tsISO || new Date().toISOString()) },
    ],
    rowCtx, opTrail
  });
}

async function addReceivedInvestmentTxn(reqFactory, { saleId, userId, paymentId, amount, tsISO }, rowCtx, opTrail) {
  const lastBal = await getLastInvestmentBalance(reqFactory, userId, rowCtx, opTrail);
  const credit = Math.trunc(amount || 0);

  const req = reqFactory();
  await execQ({
    req, label:'txn.insert.receivedCredit',
    sqlText:`INSERT INTO [${PAYMENT_DB}].[dbo].[PaymentTransactions]
             (user_id, sale_id, payment_id, payment_transaction_amount,
              payment_transaction_balance, payment_transaction_detail,
              payment_transaction_status, payment_transaction_type, payment_transaction_way,
              createdAt, updatedAt)
             VALUES(@uid,@sid,@pid,@amt,@bal,@det,1,'investment','receive',@ts,@ts)`,
    inputs:[
      { name:'uid', type: sql.Int, value: userId },
      { name:'sid', type: sql.Int, value: saleId },
      { name:'pid', type: sql.Int, value: paymentId },
      { name:'amt', type: sql.BigInt, value: credit },
      { name:'bal', type: sql.BigInt, value: lastBal + credit },
      { name:'det', type: sql.NVarChar, value: 'وصول پرداخت' },
      { name:'ts', type: sql.DateTimeOffset, value: new Date(tsISO || new Date().toISOString()) },
    ],
    rowCtx, opTrail
  });
}

module.exports = { ensureInvestmentTxn, addReceivedInvestmentTxn };
