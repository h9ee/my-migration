// consts/maps.js
module.exports = {
  WAREHOUSE_MAP: { '880000000': 6, '940000000': 7, '960000000': 8, '120000000': 9 },
  PAY_TYPE_MAP: {
    'چک': 'CHECK', 'درگاه پرداخت': 'GATEINFO', 'پوز': 'POS', 'پایا': 'SHABA', 'شبا': 'SHABA', 'ساتنا': 'SHABA',
    'پایا یا ساتنا': 'SHABA', 'کارت به کارت': 'CARD_TO_CARD', 'سفته': 'SEFTE', 'حساب به حساب': 'DEPOSIT'
  },

  PROJECT_DEFAULTS: {
    ID: 1,
    REGISTER_ID: 3,
    NAME: 'هتل ۵ ستاره مرکوری کیش',
    CREATOR_ID: 1,
    TYPE: 'سهم',
    COOPERATIVE_ID: 1,
    COOPERATIVE_NAME: 'شرکت تعاونی ستایش ماندگار آفرینش',
    ESTATE_ID: 1,
    CATEGORY_ID: 1,
    BANK_ID: 1,
    STATUS: 1,
  },

  SALE_DEFAULTS: {
    TYPE_ORDER: 'order',
    TYPE_REGISTER: 'register',
    STATUS_REGISTER: 16,
  },

  PRODUCT_DEFAULTS: {
    ID: 1,
    STATUS: 1,
  },

  COL_EM: 'EM', COL_EN: 'EN', COL_EO: 'EO', COL_EP: 'EP', COL_EQ: 'EQ', COL_ER: 'ER',

};