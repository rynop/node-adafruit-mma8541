'use strict';

const mma = require('../index');

let MMA8541 = new mma.MMA8541(mma.i2cAddress.DEFAULT_ADDRESS);

async function main() {
  try {
    await MMA8541.init();
    const o = await MMA8541.getOrientation();
    console.log('orientation', o);

    for (let i in Array(10).fill(0)) {
      const d = await MMA8541.getAcceleration();
      console.log(d);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (e) {
    console.error(e);
  }
}

main();
