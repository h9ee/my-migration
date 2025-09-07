const { sql } = require('../db/pool');
const { execQ } = require('../db/execQ');
const { addReceivedInvestmentTxn } = require('../repos/paymentsRepo');
const { PAY_TYPE_MAP } = require('../consts/maps');
const { toISO } = require('../utils/dates');

const mapPay = fa => PAY_TYPE_MAP[(fa || '').trim()] ?? null;

async function addPayment(reqFactory, p, rowCtx, opTrail) {
  const { PAYMENT_DB } = require('../config/env');
  const { saleId, userId, fa, amount, dueJ, rcvJ, install } = p;
  if (!amount) return;

  const typeEn = mapPay(fa);
  const dueISO = toISO(dueJ) || new Date().toISOString();
  const rcvISO = toISO(rcvJ);
  const paymentStatus = rcvISO ? 31 : 30;

  // Payments
  let req = reqFactory();
  const payRes = await execQ({
    req, label:'payment.insert',
    sqlText:`INSERT INTO [${PAYMENT_DB}].[dbo].[Payments]
             (payment_name,payment_date,payment_receive_date,payment_confirm,
              payment_installment,payment_installment_loan,payment_type,
              payment_late_days,payment_status,sale_id,user_id,
              sale_offer_model_id,payment_user_id,payment_full_name,
              createdAt,updatedAt)
             OUTPUT INSERTED.id
             VALUES(@n,@d,@r,NULL,@inst,0,@ptype,NULL,@pstat,@sid,@uid,NULL,NULL,NULL,@ts,@ts)`,
    inputs:[
      { name:'n', type: sql.NVarChar, value: fa || null },
      { name:'d', type: sql.DateTimeOffset, value: new Date(dueISO) },
      { name:'r', type: sql.DateTimeOffset, value: rcvISO ? new Date(rcvISO) : null },
      { name:'ptype', type: sql.NVarChar, value: typeEn },
      { name:'pstat', type: sql.Int, value: paymentStatus },
      { name:'inst', type: sql.Bit, value: install ? 1 : 0 },
      { name:'sid', type: sql.Int, value: saleId },
      { name:'uid', type: sql.Int, value: userId },
      { name:'ts', type: sql.DateTimeOffset, value: new Date(dueISO) },
    ],
    rowCtx, opTrail
  });
  const paymentId = payRes.recordset[0].id;

  // PaymentPayeds
  const req2 = reqFactory();
  await execQ({
    req: req2, label:'paymentpayed.insert',
    sqlText:`INSERT INTO [${PAYMENT_DB}].[dbo].[PaymentPayeds]
             (payment_payed_price, sale_id, payment_id, payment_payed_status, createdAt, updatedAt)
             VALUES(@price,@sid,@pid,2,@ts,@ts)`,
    inputs:[
      { name:'price', type: sql.BigInt, value: amount },
      { name:'sid',   type: sql.Int, value: saleId },
      { name:'pid',   type: sql.Int, value: paymentId },
      { name:'ts',    type: sql.DateTimeOffset, value: new Date(dueISO) },
    ],
    rowCtx, opTrail
  });

  if (rcvISO) {
    await addReceivedInvestmentTxn(
      reqFactory, { saleId, userId, paymentId, amount, tsISO: rcvISO }, rowCtx, opTrail
    );
  }
}

module.exports = { addPayment };
