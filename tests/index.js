'use strict';

const mma = require('../index');

let MMA8541 = new mma.MMA8541(mma.i2cAddress.DEFAULT_ADDRESS);

MMA8541.init();
// const d = MMA8541.getAcceleration();
// console.log(d);
