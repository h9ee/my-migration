const sql = require('mssql');
const { dbSales } = require('../config/env');

async function getPool() {
  return sql.connect(dbSales);
}
function getRequest(tx) {
  return new sql.Request(tx);
}
module.exports = { sql, getPool, getRequest };
