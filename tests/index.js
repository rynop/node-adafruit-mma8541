'use strict';

const mma = require('../index');

let MMA8541 = new mma.MMA8541(mma.i2cAddress.DEFAULT_ADDRESS);

async function main() {
  try {
    await MMA8541.init();
    const d = await MMA8541.getAcceleration();
    console.log(d);

    const o = await MMA8541.getOrientation();
    console.log(o);
  } catch (e) {
    console.error(e);
  }
}

main();
