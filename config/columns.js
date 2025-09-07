// src/config/columns.js
const { readJsonEnv } = require('../utils/envJson');

const USERS_COLS       = readJsonEnv('USERS_COLS_JSON');
const ORDER_COLS       = readJsonEnv('ORDER_COLS_JSON');
const INST_BLOCKS      = readJsonEnv('INST_BLOCKS_JSON', []);
const LEFTOVER_COLS    = readJsonEnv('LEFTOVER_JSON', null);
const REGISTER_COLS    = readJsonEnv('REGISTER_COLS_JSON', null);
const GUARD_COLS       = readJsonEnv('GUARD_COLS_JSON', { mustHave: 'C' });
const WAREHOUSE_MAP    = readJsonEnv('WAREHOUSE_MAP_JSON');           // ← مهم
const BRANCH_COL       = readJsonEnv('BRANCH_COL_JSON', { branchName: 'G' });

module.exports = {
  USERS_COLS,
  ORDER_COLS,
  INST_BLOCKS,
  LEFTOVER_COLS,
  REGISTER_COLS,
  GUARD_COLS,
  WAREHOUSE_MAP,
  BRANCH_COL,
};
