'use strict';

const i2c = require('i2c-bus'),
  util = require('util');

const i2cAddress = {
  DEFAULT_ADDRESS: 0x1D,
  GNT_ADDRESS: 0x1C
};

const registers = {
  OUT_X_MSB: 0x01,
  OUT_X_LSB: 0x02,
  OUT_Y_MSB: 0x03,
  OUT_Y_LSB: 0x04,
  OUT_Z_MSB: 0x05,
  OUT_Z_LSB: 0x06,
  F_SETUP: 0x09,
  SYSMOD: 0x0B,
  WHOAMI: 0x0D,
  XYZ_DATA_CFG: 0x0E,
  PL_STATUS: 0x10,
  PL_CFG: 0x11,
  FF_MT_CFG: 0x15,
  FF_MT_SRC: 0x16,
  FF_MT_THS: 0x17,
  FF_MT_COUNT: 0x18,
  CTRL_REG1: 0x2A,
  CTRL_REG2: 0x2B,
  CTRL_REG4: 0x2D,
  CTRL_REG5: 0x2E
};

const ctrlReg2Cmds = {
  RST: 0x40,
  HIGH_RES: 0x02
};

const RANGE_4G = 0b01; // +/- 4g.  Must be this if using low noise
const DEVICE_ID = 0x1A;

function uint14(msb, lsb) {
  return (msb << 6) | (lsb >> 2);
}

function int14(msb, lsb) {
  const val = uint14(msb, lsb);
  return val > 8191 ? (val - 16384) : val;
}

module.exports.registers = registers;
module.exports.i2cAddress = i2cAddress;
module.exports.ctrlReg2Cmds = ctrlReg2Cmds;

module.exports.MMA8541 = class MMA8541 {
  constructor(i2cAddress) {
    this.i2cAddress = i2cAddress || i2cAddress.DEFAULT_ADDRESS;
    this.i2cBus = i2c.openSync(1);
  }

  _readRegister(reg) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, reg, (err, byte) => {
        (err) ? reject(err): resolve(byte);
      })
    });
  }

  _writeRegister(reg, byte) {
    return new Promise((resolve, reject) => {
      this.i2cBus.writeByte(this.i2cAddress, reg, byte, (err) => {
        (err) ? reject(err): resolve(true);
      })
    });
  }

  _readBlock(reg) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readI2cBlock(this.i2cAddress, reg, 6, new Buffer(6), (err, bytesRead, buf) => {
        (err) ? reject(err): resolve(buf);
      })
    });
  }

  async init() {
    const id = await this._readRegister(registers.WHOAMI);
    if (DEVICE_ID !== id) {
      throw new Error('Could not detect MMA8451');
    }

    //reset the sensor and wait til its ready
    await this._writeRegister(registers.CTRL_REG2, ctrlReg2Cmds.RST);
    while (await this._readRegister(registers.CTRL_REG2) & ctrlReg2Cmds.RST);

    await this._writeRegister(registers.F_SETUP, 0x00); // Disable FIFO & FIFO Watermark

    await this._writeRegister(registers.CTRL_REG2, ctrlReg2Cmds.HIGH_RES); //high resoultion

    // Data ready inturrupt enabled on INT1 (Interrupt is routed to INT1 pin)
    await this._writeRegister(registers.CTRL_REG4, 0x01);
    await this._writeRegister(registers.CTRL_REG5, 0x01);

    // Enable orientation config
    await this._writeRegister(registers.PL_CFG, 0x40);

    // Activate at max rate, low noise mode. Requires 4G mode
    await this._writeRegister(registers.XYZ_DATA_CFG, RANGE_4G);
    await this._writeRegister(registers.CTRL_REG1, 0x01 | 0x04);
  }

  async getAcceleration(gForce) { //Default is m/s²
    await this._writeRegister(registers.OUT_X_MSB, 0);
    const buffer = await this._readBlock(registers.OUT_X_MSB);

    const x = int14(buffer[0], buffer[1]),
      y = int14(buffer[2], buffer[3]),
      z = int14(buffer[4], buffer[5]);

    return {
      x: gForce ? x / 2048 : x * 9.80655 / 2048,
      y: gForce ? y / 2048 : y * 9.80655 / 2048,
      z: gForce ? z / 2048 : z * 9.80655 / 2048,
      units: gForce ? 'g' : 'm/s²'
    };
  }

  async getOrientation() {
    const o = await this._readRegister(registers.PL_STATUS) & 0x07;
    return o;
  }
};
